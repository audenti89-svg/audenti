import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * API DE VINCULACIÓN EXACTA AUTH-SUPABASE (Audenti 2027)
 * Arquitecto: Ricardo Sánchez
 * 
 * Sincroniza y vincula el UUID exacto de `auth.users` con las tablas `users` y `patients`,
 * garantizando que los usuarios con registro completado ingresen inmediatamente
 * sin bloqueos por RLS, sin desincronización de llaves foráneas y sin bucles de activación.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false, error: 'Correo inválido' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Buscar en patients por email de forma administrativa (sin bloqueo por RLS)
    const { data: patient, error: patientErr } = await admin
      .from('patients')
      .select('id, user_id, full_name, phone, branch_name, tenant_id, status')
      .ilike('email', email)
      .maybeSingle();

    if (patientErr) {
      console.warn('[sync-profile GET] Nota buscando paciente:', patientErr.message);
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
    let targetUserId = userId;

    // Si no se proporcionó userId directamente, resolverlo desde auth.users
    if (!targetUserId) {
      try {
        const { data: userList } = await admin.auth.admin.listUsers();
        const matched = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (matched) {
          targetUserId = matched.id;
        }
      } catch (findErr) {
        console.warn('[sync-profile POST] Error localizando usuario auth:', findErr);
      }
    }

    // Si se requiere auto-confirmación (desbloqueo de cuentas pendientes)
    if (targetUserId && autoConfirm) {
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

    // 1. Sincronizar tabla `users` con el UUID canónico de auth.users
    if (targetUserId) {
      try {
        await admin
          .from('users')
          .upsert({
            id: targetUserId,
            email: cleanEmail,
            full_name: fullName || 'Paciente Audenti',
            role: 'patient',
            is_active: true,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      } catch (userUpsertErr) {
        console.warn('[sync-profile POST] Nota en tabla users:', userUpsertErr);
      }
    }

    // 2. Sincronizar tabla `patients` vinculando el UUID exacto
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : null;
    let existingPatient: any = null;

    if (targetUserId) {
      const { data: byUid } = await admin
        .from('patients')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      if (byUid) existingPatient = byUid;
    }

    if (!existingPatient) {
      const { data: byEmail } = await admin
        .from('patients')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (byEmail) existingPatient = byEmail;
    }

    if (!existingPatient && cleanPhone && cleanPhone.length >= 7) {
      const { data: byPhone } = await admin
        .from('patients')
        .select('*')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();
      if (byPhone) existingPatient = byPhone;
    }

    const defaultBranchId = branchId || '00000000-0000-0000-0000-000000000001';
    const defaultBranchName = branchName || (defaultBranchId.includes('0002') ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)');

    let patientRecord: any = null;

    if (existingPatient) {
      const updateData: Record<string, any> = {
        status: 'active',
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

      const { data: updated, error: updErr } = await admin
        .from('patients')
        .update(updateData)
        .eq('id', existingPatient.id)
        .select()
        .maybeSingle();

      if (updErr) {
        console.error('[sync-profile POST] Error en UPDATE de paciente:', updErr);
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

      const { data: inserted, error: insErr } = await admin
        .from('patients')
        .insert([insertData])
        .select()
        .maybeSingle();

      if (insErr) {
        console.error('[sync-profile POST] Error en INSERT de paciente:', insErr);
      }
      patientRecord = inserted || insertData;
    }

    return NextResponse.json({
      success: true,
      linkedUserId: targetUserId,
      patient: patientRecord,
      targetRoute: '/portal'
    });
  } catch (err: any) {
    console.error('[sync-profile POST] Error crítico:', err);
    return NextResponse.json({ error: err.message || 'Error en sincronización' }, { status: 500 });
  }
}
