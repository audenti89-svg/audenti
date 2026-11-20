import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * API DE ACCESO RÁPIDO PARA PACIENTES CLÍNICOS (Audenti 2027)
 * Permite a cualquier paciente registrado en la clínica ingresar a su expediente,
 * odontograma y citas únicamente con su número de celular (10 dígitos) o correo,
 * sin barreras de contraseñas complejas ni bloqueos de autenticación.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneOrEmail, redirectUrl } = body;

    if (!phoneOrEmail || typeof phoneOrEmail !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Por favor ingresa tu número de celular (10 dígitos) o correo registrado.' },
        { status: 400 }
      );
    }

    const input = phoneOrEmail.trim();
    const admin = createAdminClient();

    let patient: any = null;

    if (input.includes('@')) {
      // Búsqueda por correo
      const cleanEmail = input.toLowerCase();
      const { data, error } = await admin
        .from('patients')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error) console.warn('[patient-login] Error buscando por correo:', error.message);
      patient = data;
    } else {
      // Búsqueda por teléfono (últimos 10 dígitos)
      const cleanPhone = input.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length < 10) {
        return NextResponse.json(
          { ok: false, error: 'Por favor ingresa tu número de teléfono completo a 10 dígitos.' },
          { status: 400 }
        );
      }

      const { data, error } = await admin
        .from('patients')
        .select('*')
        .ilike('phone', `%${cleanPhone}%`)
        .maybeSingle();

      if (error) console.warn('[patient-login] Error buscando por teléfono:', error.message);
      patient = data;
    }

    if (!patient) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No encontramos un expediente con ese número o correo. Si es tu primera visita a la clínica, por favor usa "Registrarme / Activar Mi Cuenta".'
        },
        { status: 404 }
      );
    }

    // Asegurar correo canónico para Supabase Auth
    let patientEmail = (patient.email || '').trim().toLowerCase();
    const cleanPhone = (patient.phone || '').replace(/\D/g, '').slice(-10) || '0000000000';

    if (!patientEmail || !patientEmail.includes('@')) {
      patientEmail = `paciente.${cleanPhone}@pacientes.audenti.mx`;
      await admin
        .from('patients')
        .update({ email: patientEmail })
        .eq('id', patient.id);
    }

    // Verificar si existe usuario en auth.users
    let authUserId = patient.user_id;
    let authUserExists = false;

    try {
      const { data: userList } = await admin.auth.admin.listUsers();
      const matched = userList?.users?.find(u => u.email?.toLowerCase() === patientEmail);
      if (matched) {
        authUserId = matched.id;
        authUserExists = true;
      }
    } catch (listErr) {
      console.warn('[patient-login] Error buscando en auth.users:', listErr);
    }

    // Si no existe usuario en Auth, crearlo automáticamente
    if (!authUserExists) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: patientEmail,
        email_confirm: true,
        user_metadata: {
          full_name: patient.full_name || 'Paciente Audenti',
          phone: cleanPhone,
          role: 'patient',
          branch_name: patient.branch_name || 'Sucursal Balbuena'
        }
      });

      if (createErr) {
        console.error('[patient-login] Error creando auth user:', createErr);
        throw new Error('No se pudo inicializar la sesión del paciente: ' + createErr.message);
      }

      if (created?.user) {
        authUserId = created.user.id;
      }
    }

    // Vincular user_id en patients si aún no estaba vinculado
    if (authUserId && patient.user_id !== authUserId) {
      await admin
        .from('patients')
        .update({ user_id: authUserId, status: 'active' })
        .eq('id', patient.id);
    }

    // Sincronizar en tabla users
    if (authUserId) {
      try {
        await admin.from('users').upsert({
          id: authUserId,
          email: patientEmail,
          full_name: patient.full_name || 'Paciente Audenti',
          role: 'patient',
          is_active: true,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (uErr) {
        console.warn('[patient-login] Nota tabla users:', uErr);
      }
    }

    // Generar enlace de autenticación instantáneo (Magic Link)
    const targetRedirect = redirectUrl || 'https://audenti.vercel.app/portal-paciente';

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: patientEmail,
      options: {
        redirectTo: targetRedirect
      }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('[patient-login] Error generando enlace de acceso:', linkErr);
      throw new Error('No se pudo generar el enlace de acceso seguro.');
    }

    return NextResponse.json({
      ok: true,
      actionLink: linkData.properties.action_link,
      hashedToken: linkData.properties.hashed_token,
      emailOtp: linkData.properties.email_otp,
      patientEmail,
      patient: {
        id: patient.id,
        fullName: patient.full_name,
        branch: patient.branch_name || 'Sucursal Balbuena'
      }
    });
  } catch (err: any) {
    console.error('[patient-login] Error crítico:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Error en el servidor al autenticar al paciente.' },
      { status: 500 }
    );
  }
}
