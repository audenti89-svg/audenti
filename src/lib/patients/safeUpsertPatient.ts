import { SupabaseClient } from '@supabase/supabase-js';

export interface SafePatientData {
  id?: string;
  user_id?: string | null;
  auth_user_id?: string | null;
  full_name?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  tenant_id?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_phone?: string | null;
  allergies?: string[] | null;
  allergies_medication?: string[] | null;
  medical_conditions?: string[] | null;
  referral_source?: string | null;
  acquisition_channel?: string | null;
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

/**
 * LÓGICA DE REGISTRO INTELIGENTE (UPSERT SIN DUPLICADOS - Audenti 2027)
 * 
 * 1. Valida en Supabase si el correo (o user_id/teléfono) ya está registrado en la tabla `patients`.
 * 2. Si ya existe, NO duplica el registro: ejecuta un UPDATE seguro combinando únicamente los datos
 *    nuevos, modificados o faltantes sin borrar información preexistente.
 * 3. Si no existe, realiza un INSERT limpio.
 */
export async function safeUpsertPatient(
  supabase: SupabaseClient,
  patientData: SafePatientData
): Promise<SafeUpsertResult> {
  const cleanEmail = patientData.email ? patientData.email.trim().toLowerCase() : null;
  const cleanPhone = patientData.phone ? patientData.phone.replace(/\D/g, '').slice(-10) : null;
  const targetUserId = patientData.user_id || patientData.auth_user_id || null;

  let existingPatient: any = null;

  // 1. Prioridad 1: Validar si el correo electrónico ya está registrado en Supabase
  if (cleanEmail) {
    const { data: byEmail } = await supabase
      .from('patients')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (byEmail) {
      existingPatient = byEmail;
    }
  }

  // 2. Prioridad 2: Si no coincidió por email, buscar por user_id / auth_user_id
  if (!existingPatient && targetUserId) {
    const { data: byUser } = await supabase
      .from('patients')
      .select('*')
      .or(`user_id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`)
      .maybeSingle();

    if (byUser) {
      existingPatient = byUser;
    }
  }

  // 3. Prioridad 3: Si no coincidió por email ni user, buscar por teléfono
  if (!existingPatient && cleanPhone && cleanPhone.length >= 7) {
    const { data: byPhone } = await supabase
      .from('patients')
      .select('*')
      .ilike('phone', `%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (byPhone) {
      existingPatient = byPhone;
    }
  }

  // ── CASO A: REGISTRO EXISTE -> UPDATE SEGURO (SIN DUPLICADOS) ──
  if (existingPatient) {
    const updatePayload: Record<string, any> = {};

    // Combinar campos respetando datos previos válidos y actualizando lo modificado o faltante
    for (const [key, value] of Object.entries(patientData)) {
      if (key === 'id') continue; // No cambiar la clave primaria existente

      if (value !== undefined && value !== null && value !== '') {
        // Para arrays (alergias, antecedentes): unificar sin duplicar elementos
        if (Array.isArray(value)) {
          const currentArr: string[] = Array.isArray(existingPatient[key]) ? existingPatient[key] : [];
          const merged = Array.from(new Set([...currentArr, ...value]));
          updatePayload[key] = merged;
        } else {
          // Asignar valor nuevo o actualizado
          updatePayload[key] = value;
        }
      }
    }

    // Asegurar que si el registro previo no tenía user_id y ahora se dispone, se enlace
    if (!existingPatient.user_id && targetUserId) {
      updatePayload.user_id = targetUserId;
    }
    if (!existingPatient.auth_user_id && targetUserId) {
      updatePayload.auth_user_id = targetUserId;
    }
    if (!existingPatient.email && cleanEmail) {
      updatePayload.email = cleanEmail;
    }

    const { data: updated, error: updateError } = await supabase
      .from('patients')
      .update(updatePayload)
      .eq('id', existingPatient.id)
      .select()
      .single();

    if (updateError) {
      console.warn('Error en UPDATE seguro de paciente existente:', updateError);
      throw updateError;
    }

    return {
      data: updated || existingPatient,
      isNew: false,
      id: existingPatient.id
    };
  }

  // ── CASO B: REGISTRO NUEVO -> INSERT LIMPIO ──
  const insertPayload: Record<string, any> = { ...patientData };

  if (cleanEmail) insertPayload.email = cleanEmail;
  if (!insertPayload.id && targetUserId) {
    insertPayload.id = targetUserId;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('patients')
    .insert([insertPayload])
    .select()
    .single();

  if (insertError) {
    // Si falla por foreign key en tenant_id, intentar con tenant por defecto
    if (insertError.code === '23503' || insertError.message?.includes('foreign key')) {
      const { data: realTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      if (realTenant?.id) {
        insertPayload.tenant_id = realTenant.id;
        const retry = await supabase
          .from('patients')
          .insert([insertPayload])
          .select()
          .single();
        if (retry.error) throw retry.error;
        return {
          data: retry.data,
          isNew: true,
          id: retry.data.id
        };
      }
    }
    console.warn('Error en INSERT de nuevo paciente:', insertError);
    throw insertError;
  }

  return {
    data: inserted,
    isNew: true,
    id: inserted?.id || insertPayload.id
  };
}
