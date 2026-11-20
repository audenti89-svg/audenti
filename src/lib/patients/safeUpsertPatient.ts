import { SupabaseClient } from '@supabase/supabase-js';
import { findDuplicatePatient, mergeAndConsolidatePatient, resolveBestLegalName } from './patientDeduplicator';

export interface SafePatientData {
  id?: string;
  user_id?: string | null;
  auth_user_id?: string | null; // Aceptado por retrocompatibilidad pero mapeado a user_id
  full_name?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  tenant_id?: string | null;
  branch?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  notes?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_phone?: string | null;
  allergies?: string[] | null;
  allergies_medication?: string[] | null;
  has_no_allergies?: boolean;
  allergies_list?: string[] | null;
  allergy_notes?: string | null;
  medical_conditions?: string[] | null;
  referral_source?: string | null;
  acquisition_channel?: string | null;
  referral_type?: string | null;
  referred_by_id?: string | null;
  referred_by_name?: string | null;
  last_visit_date?: string | null;
  last_visit_at?: string | null;
  qr_code_id?: string | null;
  referred_by?: string | null;
  referrer_name?: string | null;
  referrer_id?: string | null;
  attribution_status?: string | null;
  onboarding_completed?: boolean;
  [key: string]: any;
}

export interface SafeUpsertResult {
  data: any;
  isNew: boolean;
  id: string;
}

// Columnas reales y vigentes verificadas en la tabla `patients` de Supabase
const VALID_PATIENT_COLUMNS = new Set([
  'id',
  'tenant_id',
  'branch',
  'branch_id',
  'primary_branch_id',
  'branch_name',
  'user_id',
  'referral_code',
  'referral_type',
  'referred_by',
  'referred_by_id',
  'referred_by_name',
  'full_name',
  'first_name',
  'last_name',
  'birth_date',
  'age',
  'gender',
  'phone',
  'email',
  'status',
  'role',
  'total_spent',
  'loyalty_points',
  'referral_ltv',
  'last_visit_at',
  'last_visit_date',
  'acquisition_channel',
  'referrer_id',
  'referrer_name',
  'qr_code_id',
  'qr_code_source',
  'family_nucleus_id',
  'emergency_contact_name',
  'emergency_contact_phone',
  'has_no_allergies',
  'allergies_list',
  'allergy_notes',
  'allergies_medication',
  'allergies_food',
  'medical_conditions',
  'onboarding_completed',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'total_referrals',
  'attribution_status',
  'created_at',
  'updated_at',
  'notes'
]);

/**
 * LÓGICA DE REGISTRO INTELIGENTE CON MAPEO EXACTO DE COLUMNAS (Audenti 2027)
 * 
 * 1. Mapea exactamente la FK `user_id` vinculada a auth.users.
 * 2. Valida contra Supabase si el correo o `user_id` ya existe en la tabla `patients`.
 * 3. Si ya existe, ejecuta un UPDATE seguro combinando únicamente las columnas reales.
 * 4. Si no existe, ejecuta un INSERT limpio con los datos vigentes.
 */
export async function safeUpsertPatient(
  supabase: SupabaseClient,
  patientData: SafePatientData
): Promise<SafeUpsertResult> {
  const cleanEmail = patientData.email ? patientData.email.trim().toLowerCase() : null;
  const cleanPhone = patientData.phone ? patientData.phone.replace(/\D/g, '').slice(-10) : null;
  // Mapear exactamente a la columna FK `user_id` de la base de datos
  const targetUserId = patientData.user_id || patientData.auth_user_id || null;

  // ── MOTOR DE DEDUPLICACIÓN INTELIGENTE (Aura AI) ──
  // Verifica exhaustivamente por teléfono, email, user_id y similitud heurística de nombre
  const dupCheck = await findDuplicatePatient(supabase, {
    user_id: targetUserId,
    phone: cleanPhone,
    email: cleanEmail,
    full_name: patientData.full_name || patientData.name
  });

  let existingPatient: any = dupCheck.isDuplicate ? dupCheck.matchedPatient : null;

  // Si se envió estado de onboarding o se tiene user_id, sincronizar en la tabla `users` con is_active: true
  if (targetUserId) {
    try {
      await supabase
        .from('users')
        .update({
          is_active: true,
          onboarding_completed: patientData.onboarding_completed ?? true
        })
        .eq('id', targetUserId);
    } catch {}
  }

  // Construir notas complementarias con información clínica si vino en el payload
  let extraNotes = '';
  if (patientData.allergies && Array.isArray(patientData.allergies) && patientData.allergies.length > 0) {
    extraNotes += ` [Alergias: ${patientData.allergies.join(', ')}]`;
  }
  if (patientData.emergency_contact_name || patientData.emergency_contact_phone) {
    extraNotes += ` [Contacto Emergencia: ${patientData.emergency_contact_name || ''} - ${patientData.emergency_contact_phone || ''}]`;
  }

  // ── CASO A: REGISTRO EXISTE -> UPDATE SEGURO (SIN DUPLICADOS) ──
  if (existingPatient) {
    const updatePayload: Record<string, any> = {};

    // Mapear campos canónicos compatibles con la tabla `patients`
    // Protección absoluta de nombres y apellidos legales: nunca sobrescribir con alias como "TecnoWorld"
    if (patientData.full_name || patientData.name) {
      const bestName = resolveBestLegalName(existingPatient.full_name, patientData.full_name || patientData.name);
      if (bestName) {
        updatePayload.full_name = bestName;
      }
    }
    if (cleanEmail) {
      updatePayload.email = cleanEmail;
    }
    if (cleanPhone) {
      updatePayload.phone = cleanPhone;
    }
    if (targetUserId) {
      updatePayload.user_id = targetUserId;
    }
    if (patientData.branch_id) {
      updatePayload.branch_id = patientData.branch_id;
    }
    if (patientData.branch_name || patientData.branch) {
      const bName = patientData.branch_name || patientData.branch;
      updatePayload.branch_name = bName;
      updatePayload.branch = bName;
    }
    if (patientData.referral_type) updatePayload.referral_type = patientData.referral_type;
    if (patientData.referred_by_id) updatePayload.referred_by_id = patientData.referred_by_id;
    if (patientData.referred_by_name) updatePayload.referred_by_name = patientData.referred_by_name;
    if (patientData.last_visit_date || patientData.last_visit_at) {
      updatePayload.last_visit_date = patientData.last_visit_date || patientData.last_visit_at;
      updatePayload.last_visit_at = patientData.last_visit_at || patientData.last_visit_date;
    }
    if (patientData.has_no_allergies !== undefined) updatePayload.has_no_allergies = patientData.has_no_allergies;
    if (patientData.allergies_list || patientData.allergies_medication) {
      updatePayload.allergies_medication = patientData.allergies_list || patientData.allergies_medication;
      updatePayload.allergies_list = patientData.allergies_list || patientData.allergies_medication;
    }
    if (patientData.allergy_notes) updatePayload.allergy_notes = patientData.allergy_notes;
    if (patientData.tenant_id) {
      updatePayload.tenant_id = patientData.tenant_id;
    }
    if (patientData.gender) {
      updatePayload.gender = patientData.gender;
    }
    if (patientData.birth_date || patientData.date_of_birth) {
      updatePayload.birth_date = patientData.birth_date || patientData.date_of_birth;
    }
    if (patientData.acquisition_channel) {
      const ch = patientData.acquisition_channel.toLowerCase().trim();
      updatePayload.acquisition_channel = ch.includes('ref') ? 'referral' : (ch.includes('qr') ? 'qr' : 'directo');
    }
    if (patientData.referrer_name) {
      updatePayload.referrer_name = patientData.referrer_name;
    }
    if (patientData.qr_code_source || patientData.qr_code_id) {
      updatePayload.qr_code_source = patientData.qr_code_source || patientData.qr_code_id;
    }
    if (patientData.referrer_id) {
      updatePayload.referrer_id = patientData.referrer_id;
    }
    if (patientData.referrer_name) {
      updatePayload.referrer_name = patientData.referrer_name;
    }
    if (patientData.qr_code_id) {
      updatePayload.qr_code_id = patientData.qr_code_id;
    }
    if (patientData.attribution_status) {
      updatePayload.attribution_status = patientData.attribution_status;
    }
    // Asegurar estado activo en base de datos para evitar bloqueos
    updatePayload.status = patientData.status || existingPatient.status || 'active';

    // Filtrar estrictamente solo columnas válidas
    const sanitizedUpdate: Record<string, any> = {};
    for (const [k, v] of Object.entries(updatePayload)) {
      if (VALID_PATIENT_COLUMNS.has(k) && v !== undefined && v !== null && k !== 'notes') {
        sanitizedUpdate[k] = v;
      }
    }

    sanitizedUpdate.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('patients')
      .update(sanitizedUpdate)
      .eq('id', existingPatient.id)
      .select()
      .maybeSingle();

    if (updateError) {
      // Auto-recuperación si Supabase rechaza alguna columna no presente
      if (updateError.message?.includes('notes') || updateError.code === '42703') {
        delete (sanitizedUpdate as any).notes;
        const retryUpdate = await supabase
          .from('patients')
          .update(sanitizedUpdate)
          .eq('id', existingPatient.id)
          .select()
          .maybeSingle();
        if (!retryUpdate.error && retryUpdate.data) {
          return {
            data: retryUpdate.data,
            isNew: false,
            id: existingPatient.id
          };
        }
      }
      console.warn('Nota en UPDATE seguro de paciente existente:', updateError.message);
    }

    return {
      data: updated || existingPatient,
      isNew: false,
      id: existingPatient.id
    };
  }

  // ── CASO B: REGISTRO NUEVO -> INSERT LIMPIO CON COLUMNAS VÁLIDAS ──
  const defaultTenantId = '00000000-0000-0000-0000-000000000001';
  const defaultBranchId = patientData.branch_id || '00000000-0000-0000-0000-000000000001';

  const defaultBranchName = patientData.branch_name || (defaultBranchId.includes('0002') ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)');

  const insertPayload: Record<string, any> = {
    tenant_id: patientData.tenant_id || defaultTenantId,
    branch_id: defaultBranchId,
    branch_name: defaultBranchName,
    branch: defaultBranchName,
    full_name: patientData.full_name || patientData.name || 'Paciente Audenti',
    email: cleanEmail,
    phone: cleanPhone,
    user_id: targetUserId,
    status: 'active',
    has_no_allergies: patientData.has_no_allergies ?? true,
    allergies_medication: patientData.allergies_list || patientData.allergies_medication || null,
    allergies_list: patientData.allergies_list || patientData.allergies_medication || null,
    allergy_notes: patientData.allergy_notes || null,
    referral_type: patientData.referral_type || 'directo',
    referred_by_id: patientData.referred_by_id || null,
    referred_by_name: patientData.referred_by_name || patientData.referrer_name || null,
    last_visit_date: patientData.last_visit_date || patientData.last_visit_at || new Date().toISOString(),
    last_visit_at: patientData.last_visit_at || patientData.last_visit_date || new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (patientData.birth_date || patientData.date_of_birth) {
    insertPayload.birth_date = patientData.birth_date || patientData.date_of_birth;
  }
  if (patientData.acquisition_channel) {
    const ch = patientData.acquisition_channel.toLowerCase().trim();
    insertPayload.acquisition_channel = ch.includes('ref') ? 'referral' : (ch.includes('qr') ? 'qr' : 'directo');
  }
  if (patientData.referrer_name) {
    insertPayload.referrer_name = patientData.referrer_name;
  }
  if (patientData.qr_code_source || patientData.qr_code_id) {
    insertPayload.qr_code_source = patientData.qr_code_source || patientData.qr_code_id;
  }
  if (patientData.gender) insertPayload.gender = patientData.gender;
  if (patientData.address) insertPayload.address = patientData.address;
  if (patientData.acquisition_channel) insertPayload.acquisition_channel = patientData.acquisition_channel;
  if (patientData.referrer_id) insertPayload.referrer_id = patientData.referrer_id;
  if (patientData.referrer_name) insertPayload.referrer_name = patientData.referrer_name;
  if (patientData.qr_code_id) insertPayload.qr_code_id = patientData.qr_code_id;
  if (patientData.attribution_status) insertPayload.attribution_status = patientData.attribution_status;

  // Filtrar estrictamente a columnas vigentes en el esquema de Supabase
  const sanitizedInsert: Record<string, any> = {};
  for (const [k, v] of Object.entries(insertPayload)) {
    if (VALID_PATIENT_COLUMNS.has(k) && v !== undefined && v !== null && k !== 'notes') {
      sanitizedInsert[k] = v;
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('patients')
    .insert([sanitizedInsert])
    .select()
    .maybeSingle();

  if (insertError) {
    // Si falla por columna inexistente (código 42703 o mención de notes), reintentar sin esa columna
    if (insertError.message?.includes('notes') || insertError.code === '42703') {
      delete (sanitizedInsert as any).notes;
      const retryCol = await supabase
        .from('patients')
        .insert([sanitizedInsert])
        .select()
        .maybeSingle();
      if (!retryCol.error && retryCol.data) {
        return {
          data: retryCol.data,
          isNew: true,
          id: retryCol.data.id
        };
      }
    }

    // Si falla por foreign key de tenant_id, recuperar tenant real
    if (insertError.code === '23503' || insertError.message?.includes('foreign key')) {
      const { data: realTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      if (realTenant?.id) {
        sanitizedInsert.tenant_id = realTenant.id;
        const retry = await supabase
          .from('patients')
          .insert([sanitizedInsert])
          .select()
          .maybeSingle();
        if (retry.error) throw retry.error;
        return {
          data: retry.data,
          isNew: true,
          id: retry.data.id
        };
      }
    }
    console.warn('Error en INSERT de nuevo paciente:', insertError.message);
    throw insertError;
  }

  return {
    data: inserted,
    isNew: true,
    id: inserted?.id || targetUserId || 'new-patient'
  };
}
