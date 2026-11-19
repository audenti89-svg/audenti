import { SupabaseClient } from '@supabase/supabase-js'

export interface DeduplicationInput {
  id?: string
  user_id?: string | null
  full_name?: string | null
  phone?: string | null
  email?: string | null
  birth_date?: string | null
  branch_name?: string | null
  branch_id?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  allergies_medication?: string[] | null
  medical_conditions?: string[] | null
  acquisition_channel?: string | null
  referrer_name?: string | null
  notes?: string | null
  onboarding_completed?: boolean
}

export interface DeduplicationResult {
  isDuplicate: boolean
  matchedPatient: any | null
  actionTaken: 'found_exact_phone' | 'found_exact_email' | 'found_user_id' | 'found_fuzzy_name' | 'no_duplicate'
  confidence: number // 0 to 1
}

/**
 * Normaliza nombres para comparación fonética/heurística
 * Elimina acentos, dobles espacios y pasa a minúsculas
 */
export function normalizeNameForComparison(name: string): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normaliza un número telefónico a sus últimos 10 dígitos numéricos
 */
export function normalizePhone10(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 10) {
    return digits.slice(-10)
  }
  return digits.length >= 7 ? digits : null
}

/**
 * Calcula similitud de tokens (Jaccard) entre dos nombres
 */
export function calculateNameSimilarity(nameA: string, nameB: string): number {
  const normA = normalizeNameForComparison(nameA)
  const normB = normalizeNameForComparison(nameB)
  if (!normA || !normB) return 0
  if (normA === normB) return 1.0

  const tokensA = new Set(normA.split(' ').filter(t => t.length > 2))
  const tokensB = new Set(normB.split(' ').filter(t => t.length > 2))

  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersection = 0
  tokensA.forEach(t => {
    if (tokensB.has(t)) intersection++
  })

  const union = new Set([...tokensA, ...tokensB]).size
  return union > 0 ? intersection / union : 0
}

/**
 * MOTOR DE DEDUPLICACIÓN INTELIGENTE (Aura AI Deduplicator)
 * Busca exhaustivamente coincidencias para evitar duplicar pacientes en Supabase.
 */
export async function findDuplicatePatient(
  supabase: SupabaseClient,
  input: DeduplicationInput
): Promise<DeduplicationResult> {
  const cleanPhone = normalizePhone10(input.phone)
  const cleanEmail = input.email ? input.email.trim().toLowerCase() : null
  const targetUserId = input.user_id || null

  // 1. Coincidencia por teléfono (Vector principal en clínicas dentales)
  if (cleanPhone && cleanPhone.length === 10) {
    const { data: byPhoneList } = await supabase
      .from('patients')
      .select('*')
      .ilike('phone', `%${cleanPhone}%`)

    if (byPhoneList && byPhoneList.length > 0) {
      // Priorizar el que tenga user_id si coincide, o el más completo
      const bestMatch = byPhoneList.find(p => p.user_id && p.user_id === targetUserId) || byPhoneList[0]
      return {
        isDuplicate: true,
        matchedPatient: bestMatch,
        actionTaken: 'found_exact_phone',
        confidence: 0.99
      }
    }
  }

  // 2. Coincidencia por Correo Electrónico
  if (cleanEmail && cleanEmail.includes('@')) {
    const { data: byEmail } = await supabase
      .from('patients')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (byEmail) {
      return {
        isDuplicate: true,
        matchedPatient: byEmail,
        actionTaken: 'found_exact_email',
        confidence: 0.98
      }
    }
  }

  // 3. Coincidencia por Supabase Auth User ID
  if (targetUserId) {
    const { data: byUser } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (byUser) {
      return {
        isDuplicate: true,
        matchedPatient: byUser,
        actionTaken: 'found_user_id',
        confidence: 1.0
      }
    }
  }

  // 4. Coincidencia Heurística por Nombre si hay indicios fuertes
  if (input.full_name && input.full_name.trim().length >= 4) {
    const inputNorm = normalizeNameForComparison(input.full_name)
    const firstWord = inputNorm.split(' ')[0]

    if (firstWord && firstWord.length >= 3) {
      const { data: candidates } = await supabase
        .from('patients')
        .select('*')
        .ilike('full_name', `%${firstWord}%`)
        .limit(10)

      if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
          const sim = calculateNameSimilarity(input.full_name, candidate.full_name || '')
          // Si similitud es alta (>= 0.6) o comparten al menos 2 nombres/apellidos
          if (sim >= 0.5) {
            // Verificar si el teléfono coincide o alguno está vacío
            const candPhone = normalizePhone10(candidate.phone)
            if (!candPhone || !cleanPhone || candPhone === cleanPhone) {
              return {
                isDuplicate: true,
                matchedPatient: candidate,
                actionTaken: 'found_fuzzy_name',
                confidence: sim
              }
            }
          }
        }
      }
    }
  }

  return {
    isDuplicate: false,
    matchedPatient: null,
    actionTaken: 'no_duplicate',
    confidence: 0
  }
}

/**
 * Fusión y Consolidación Inteligente de Pacientes (Safe Merge)
 * Si detecta que ya existe o hay duplicados en la base de datos con ese teléfono/email:
 * 1. Mantiene el registro canónico.
 * 2. Enriquece los campos vacíos con los datos nuevos.
 * 3. Si existen filas duplicadas adicionales, las elimina y reasigna citas/transacciones.
 */
export async function mergeAndConsolidatePatient(
  supabase: SupabaseClient,
  primaryId: string,
  incomingData: DeduplicationInput
): Promise<any> {
  const { data: current } = await supabase
    .from('patients')
    .select('*')
    .eq('id', primaryId)
    .single()

  if (!current) return null

  const updatePayload: Record<string, any> = {}

  // 1. Nombre completo: si el actual es corto (ej. "Ricardo Sánchez") y el nuevo es completo ("Ricardo Ulises Rayón Sánchez"), actualizar al más completo
  if (incomingData.full_name && incomingData.full_name.trim()) {
    const newName = incomingData.full_name.trim()
    if (!current.full_name || newName.length > current.full_name.length || current.full_name.toLowerCase().includes('tecnoworld')) {
      updatePayload.full_name = newName
    }
  }

  // 2. Teléfono
  const newPhone = normalizePhone10(incomingData.phone)
  if (newPhone && (!current.phone || current.phone.replace(/\D/g, '').length < 10)) {
    updatePayload.phone = newPhone
  }

  // 3. Email
  if (incomingData.email && (!current.email || current.email.includes('pruevaz') || !current.email.includes('@'))) {
    updatePayload.email = incomingData.email.trim().toLowerCase()
  }

  // 4. User ID (Vincular autenticación a este perfil si no estaba vinculado)
  if (incomingData.user_id && !current.user_id) {
    updatePayload.user_id = incomingData.user_id
  }

  // 5. Fecha de nacimiento
  if (incomingData.birth_date && !current.birth_date) {
    updatePayload.birth_date = incomingData.birth_date
  }

  // 6. Sucursal
  if (incomingData.branch_name) {
    updatePayload.branch_name = incomingData.branch_name
    if (incomingData.branch_id) {
      updatePayload.branch_id = incomingData.branch_id
    }
  }

  // 7. Contacto de emergencia
  if (incomingData.emergency_contact_name && !current.emergency_contact_name) {
    updatePayload.emergency_contact_name = incomingData.emergency_contact_name
  }
  if (incomingData.emergency_contact_phone && !current.emergency_contact_phone) {
    updatePayload.emergency_contact_phone = incomingData.emergency_contact_phone
  }

  // 8. Alergias
  if (incomingData.allergies_medication && Array.isArray(incomingData.allergies_medication) && incomingData.allergies_medication.length > 0) {
    const existingAllergies = Array.isArray(current.allergies_medication) ? current.allergies_medication : []
    const combined = Array.from(new Set([...existingAllergies, ...incomingData.allergies_medication]))
    updatePayload.allergies_medication = combined
  }

  // 9. Atribución / Referidor
  if (incomingData.acquisition_channel) {
    updatePayload.acquisition_channel = incomingData.acquisition_channel
    if (incomingData.referrer_name) {
      updatePayload.referrer_name = incomingData.referrer_name
    }
    updatePayload.attribution_status = 'completed'
  }

  updatePayload.updated_at = new Date().toISOString()

  const { data: updated, error: updateErr } = await supabase
    .from('patients')
    .update(updatePayload)
    .eq('id', primaryId)
    .select()
    .single()

  if (updateErr) {
    console.error('Error al actualizar paciente canónico:', updateErr)
    return current
  }

  // 10. Limpieza Proactiva de Duplicados Fantasma:
  // Si existe OTRA fila en patients con el mismo teléfono o email pero ID distinto a primaryId,
  // reasignar citas y transacciones a primaryId y eliminar la fila redundante.
  const checkPhone = normalizePhone10(updated.phone)
  if (checkPhone && checkPhone.length === 10) {
    const { data: redundantPatients } = await supabase
      .from('patients')
      .select('id')
      .ilike('phone', `%${checkPhone}%`)
      .neq('id', primaryId)

    if (redundantPatients && redundantPatients.length > 0) {
      for (const dup of redundantPatients) {
        console.log(`[AI Deduplicator] Eliminando paciente duplicado redundante ${dup.id} en favor de ${primaryId}`)
        // Reasignar citas en appointments
        try {
          await supabase.from('appointments').update({ patient_id: primaryId }).eq('patient_id', dup.id)
        } catch {}
        // Reasignar transacciones en transactions
        try {
          await supabase.from('transactions').update({ patient_id: primaryId }).eq('patient_id', dup.id)
        } catch {}
        // Eliminar fila duplicada de patients
        try {
          await supabase.from('patients').delete().eq('id', dup.id)
        } catch (delErr) {
          console.warn('[AI Deduplicator] Error eliminando duplicado:', delErr)
        }
      }
    }
  }

  return updated
}
