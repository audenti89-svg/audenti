import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSystemAdminEmail } from '@/lib/auth/admin-emails';

/**
 * API DE VINCULACIÓN EXACTA Y ACTIVACIÓN UNIVERSAL AUTH-SUPABASE (Audenti 2027)
 * Arquitecto: Ricardo Sánchez
 * 
 * Utiliza arquitectura dual:
 * 1. Admin Service Role para operaciones Auth (admin.auth.admin): actualizar y crear contraseñas.
 * 2. DB Client para tablas de datos (patients, etc.), garantizando que nunca se produzca error 42501.
 */

function getDbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysxcjrxuakfqzzseiaiy.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Wdm8x6QfGCWQNKqwLRejXA__r5Cg13m';
  return createClient(url, key);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false, error: 'Correo inválido' }, { status: 400 });
    }

    const db = getDbClient();
    const admin = createAdminClient();

    // 1. Buscar en patients por email
    const { data: patient, error: patientErr } = await db
      .from('patients')
      .select('id, user_id, full_name, phone, branch_name, tenant_id, status')
      .ilike('email', email)
      .maybeSingle();

    if (patientErr) {
      console.warn('[sync-profile GET] Nota buscando paciente en DB:', patientErr.message);
    }

    // 2. Comprobar si ya existe usuario registrado en Supabase Auth
    let authUserExists = false;
    let authUserId: string | null = null;
    try {
      const { data: userList } = await admin.auth.admin.listUsers();
      const matched = userList?.users?.find(u => u.email?.toLowerCase() === email);
      if (matched) {
        authUserExists = true;
        authUserId = matched.id;
      }
    } catch (authErr) {
      console.warn('[sync-profile GET] Nota verificando auth.users:', authErr);
    }

    return NextResponse.json({
      exists: !!patient || authUserExists,
      patient: patient || null,
      hasAuthUser: authUserExists,
      authUserId: authUserId,
      isLinked: !!(patient?.user_id && patient.user_id === authUserId)
    });
  } catch (err: any) {
    return NextResponse.json({ exists: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      email,
      password,
      fullName,
      phone,
      branchId,
      branchName,
      autoConfirm
    } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Correo electrónico requerido' }, { status: 400 });
    }

    const admin = createAdminClient();
    const db = getDbClient();

    let targetUserId = userId;
    let existingAuthUser: any = null;

    // 1. Localizar usuario existente en Supabase Auth
    try {
      const { data: userList } = await admin.auth.admin.listUsers();
      existingAuthUser = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail) || null;
      if (existingAuthUser) {
        targetUserId = existingAuthUser.id;
      }
    } catch (findErr) {
      console.warn('[sync-profile POST] Error localizando usuario auth:', findErr);
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : null;
    const defaultBranchId = branchId || '00000000-0000-0000-0000-000000000001';
    const defaultBranchName = branchName || (defaultBranchId.includes('0002') ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)');

    // 2. Si se proporcionó contraseña, CONFIGURAR/ACTUALIZAR EN SUPABASE AUTH DE FORMA INMEDIATA
    if (password && password.trim().length >= 6) {
      if (existingAuthUser && targetUserId) {
        // Usuario ya existe: actualizar su contraseña y auto-confirmar su email
        const updatePayload: any = {
          password: password.trim(),
          email_confirm: true,
          user_metadata: {
            ...(existingAuthUser.user_metadata || {}),
            full_name: fullName || existingAuthUser.user_metadata?.full_name || 'Paciente Audenti',
            phone: cleanPhone || existingAuthUser.user_metadata?.phone,
            role: isSystemAdminEmail(cleanEmail) ? 'superadmin' : 'patient',
            doctor_type: isSystemAdminEmail(cleanEmail) ? 'superadmin' : null,
            branch_id: defaultBranchId,
            branch_name: defaultBranchName,
            email_verified: true,
          }
        };

        const { error: updPassErr } = await admin.auth.admin.updateUserById(targetUserId, updatePayload);
        if (updPassErr) {
          console.error('[sync-profile POST] Error actualizando contraseña de usuario existente:', updPassErr);
          throw new Error('No se pudo actualizar la contraseña: ' + updPassErr.message);
        }
      } else {
        // Usuario no existe en Auth: crearlo administrativamente con email auto-confirmado
        const { data: createdData, error: createAuthErr } = await admin.auth.admin.createUser({
          email: cleanEmail,
          password: password.trim(),
          email_confirm: true,
          user_metadata: {
            full_name: fullName || 'Paciente Audenti',
            phone: cleanPhone || '5500000000',
            role: isSystemAdminEmail(cleanEmail) ? 'superadmin' : 'patient',
            branch_id: defaultBranchId,
            branch_name: defaultBranchName,
          }
        });

        if (createAuthErr) {
          console.error('[sync-profile POST] Error creando usuario en Supabase Auth:', createAuthErr);
          throw new Error('No se pudo registrar la cuenta en autenticación: ' + createAuthErr.message);
        }

        if (createdData?.user) {
          targetUserId = createdData.user.id;
        }
      }
    } else if (targetUserId && autoConfirm) {
      // Auto-confirmación sin cambio de contraseña
      try {
        await admin.auth.admin.updateUserById(targetUserId, {
          email_confirm: true,
          user_metadata: {
            full_name: fullName || 'Paciente Audenti',
            role: 'patient'
          }
        });
      } catch (confErr) {
        console.warn('[sync-profile POST] Error en confirmación administrativa:', confErr);
      }
    }

    // 3. Sincronizar tabla `patients` usando el cliente DB seguro
    let existingPatient: any = null;

    if (targetUserId) {
      const { data: byUid } = await db
        .from('patients')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (byUid) existingPatient = byUid;
    }

    if (!existingPatient) {
      const { data: byEmail } = await db
        .from('patients')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (byEmail) existingPatient = byEmail;
    }

    if (!existingPatient && cleanPhone && cleanPhone.length >= 7) {
      const { data: byPhone } = await db
        .from('patients')
        .select('*')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();
      if (byPhone) existingPatient = byPhone;
    }

    let patientRecord: any = null;

    if (existingPatient) {
      const updateData: Record<string, any> = {
        status: 'active',
        role: isSystemAdminEmail(cleanEmail) ? 'superadmin' : 'patient',
        updated_at: new Date().toISOString()
      };
      if (targetUserId) updateData.user_id = targetUserId;
      if (cleanEmail) updateData.email = cleanEmail;
      if (fullName && (!existingPatient.full_name || existingPatient.full_name === 'Paciente Audenti')) {
        updateData.full_name = fullName;
      }
      if (cleanPhone && !existingPatient.phone) updateData.phone = cleanPhone;
      if (branchId && !existingPatient.branch_id) updateData.branch_id = branchId;
      if (branchName && !existingPatient.branch_name) updateData.branch_name = branchName;

      let { data: updated, error: updErr } = await db
        .from('patients')
        .update(updateData)
        .eq('id', existingPatient.id)
        .select()
        .maybeSingle();

      if (updErr) {
        console.warn('[sync-profile POST] Reintentando update sin FK user_id:', updErr.message);
        if (updErr.code === '23503' && updateData.user_id) {
          const fallbackData = { ...updateData };
          delete fallbackData.user_id;
          const { data: fallbackUpdated } = await db
            .from('patients')
            .update(fallbackData)
            .eq('id', existingPatient.id)
            .select()
            .maybeSingle();
          if (fallbackUpdated) updated = fallbackUpdated;
        }
      }
      patientRecord = updated || existingPatient;
    } else {
      const insertData: Record<string, any> = {
        tenant_id: defaultBranchId,
        branch_id: defaultBranchId,
        branch_name: defaultBranchName,
        user_id: targetUserId || null,
        full_name: fullName || 'Paciente Audenti',
        email: cleanEmail,
        phone: cleanPhone,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let { data: inserted, error: insErr } = await db
        .from('patients')
        .insert([insertData])
        .select()
        .maybeSingle();

      if (insErr) {
        console.warn('[sync-profile POST] Reintentando insert sin FK user_id:', insErr.message);
        if (insErr.code === '23503' && insertData.user_id) {
          const fallbackInsert = { ...insertData };
          delete fallbackInsert.user_id;
          const { data: fallbackInserted } = await db
            .from('patients')
            .insert([fallbackInsert])
            .select()
            .maybeSingle();
          if (fallbackInserted) inserted = fallbackInserted;
        }
      }
      patientRecord = inserted || insertData;
    }

    // 4. Sincronizar tabla `users` (con tolerancia defensiva si la tabla tiene RLS estricto)
    if (targetUserId) {
      try {
        await db
          .from('users')
          .upsert({
            id: targetUserId,
            email: cleanEmail,
            full_name: fullName || 'Paciente Audenti',
            role: isSystemAdminEmail(cleanEmail) ? 'superadmin' : 'patient',
            is_active: true,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      } catch (userUpsertErr) {
        console.warn('[sync-profile POST] Nota en tabla users:', userUpsertErr);
      }
    }

    const targetRoute = isSystemAdminEmail(cleanEmail) ? '/dashboard' : '/portal-paciente';

    return NextResponse.json({
      success: true,
      linkedUserId: targetUserId,
      patient: patientRecord,
      targetRoute: targetRoute
    });
  } catch (err: any) {
    console.error('[sync-profile POST] Error crítico:', err);
    return NextResponse.json({ error: err.message || 'Error en sincronización' }, { status: 500 });
  }
}
