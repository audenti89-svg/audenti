import { SupabaseClient } from '@supabase/supabase-js';

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
  branch_id?: string | null;
  branch_name?: string | null;
  notes?: string | null;
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

// Columnas reales y vigentes en la tabla `patients` de Supabase
const VALID_PATIENT_COLUMNS = new Set([
  'id',
  'tenant_id',
  'branch_id',
  'user_id',
  'referral_code',
  'referred_by',
  'full_name',
  'date_of_birth',
  'gender',
  'phone',
  'email',
  'address',
  'status',
  'photo_url',
  'last_appointment_at',
  'total_spent',
  'notes',
  'acquisition_channel',
  'referrer_id',
  'referrer_name',
  'qr_code_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'total_referrals',
  'branch_name',
  'attribution_status',
  'created_at',
  'updated_at'
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

  let existingPatient: any = null;

  // 1. Prioridad 1: Validar si el correo electrónico ya está registrado en Supabase
  if (cleanEmail) {
    const { data: byEmail, error: emailErr } = await supabase
      .from('patients')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!emailErr && byEmail) {
      existingPatient = byEmail;
    }
  }

  // 2. Prioridad 2: Si no coincidió por email, buscar por columna FK real `user_id`
  if (!existingPatient && targetUserId) {
    const { data: byUser, error: userErr } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (!userErr && byUser) {
      existingPatient = byUser;
    }
  }

  // 3. Prioridad 3: Si no coincidió por email ni user_id, buscar por teléfono
  if (!existingPatient && cleanPhone && cleanPhone.length >= 7) {
    const { data: byPhone, error: phoneErr } = await supabase
      .from('patients')
      .select('*')
      .ilike('phone', `%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (!phoneErr && byPhone) {
      existingPatient = byPhone;
    }
  }

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
    if (patientData.full_name || patientData.name) {
      updatePayload.full_name = patientData.full_name || patientData.name;
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
    if (patientData.branch_name) {
      updatePayload.branch_name = patientData.branch_name;
    }
    if (patientData.tenant_id) {
      updatePayload.tenant_id = patientData.tenant_id;
    }
    if (patientData.gender) {
      updatePayload.gender = patientData.gender;
    }
    if (patientData.date_of_birth) {
      updatePayload.date_of_birth = patientData.date_of_birth;
    }
    if (patientData.address) {
      updatePayload.address = patientData.address;
    }
    if (patientData.acquisition_channel) {
      updatePayload.acquisition_channel = patientData.acquisition_channel;
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

    if (extraNotes || patientData.notes) {
      const currentNotes = existingPatient.notes || '';
      const newNotes = patientData.notes || '';
      updatePayload.notes = `${currentNotes} ${newNotes} ${extraNotes}`.trim();
    }

    // Filtrar estrictamente solo columnas válidas
    const sanitizedUpdate: Record<string, any> = {};
    for (const [k, v] of Object.entries(updatePayload)) {
      if (VALID_PATIENT_COLUMNS.has(k) && v !== undefined && v !== null) {
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

  const insertPayload: Record<string, any> = {
    tenant_id: patientData.tenant_id || defaultTenantId,
    branch_id: defaultBranchId,
    branch_name: patientData.branch_name || (defaultBranchId.includes('0002') ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)'),
    full_name: patientData.full_name || patientData.name || 'Paciente Audenti',
    email: cleanEmail,
    phone: cleanPhone,
    user_id: targetUserId,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (patientData.date_of_birth) insertPayload.date_of_birth = patientData.date_of_birth;
  if (patientData.gender) insertPayload.gender = patientData.gender;
  if (patientData.address) insertPayload.address = patientData.address;
  if (patientData.acquisition_channel) insertPayload.acquisition_channel = patientData.acquisition_channel;
  if (patientData.referrer_id) insertPayload.referrer_id = patientData.referrer_id;
  if (patientData.referrer_name) insertPayload.referrer_name = patientData.referrer_name;
  if (patientData.qr_code_id) insertPayload.qr_code_id = patientData.qr_code_id;
  if (patientData.attribution_status) insertPayload.attribution_status = patientData.attribution_status;

  if (extraNotes || patientData.notes) {
    insertPayload.notes = `${patientData.notes || ''} ${extraNotes}`.trim();
  }

  // Filtrar estrictamente a columnas vigentes en el esquema de Supabase
  const sanitizedInsert: Record<string, any> = {};
  for (const [k, v] of Object.entries(insertPayload)) {
    if (VALID_PATIENT_COLUMNS.has(k) && v !== undefined && v !== null) {
      sanitizedInsert[k] = v;
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('patients')
    .insert([sanitizedInsert])
    .select()
    .maybeSingle();

  if (insertError) {
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
