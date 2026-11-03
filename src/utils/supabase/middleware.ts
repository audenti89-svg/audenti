import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ImmuneSystem } from '@/lib/security/immune-system';

export async function updateSession(request: NextRequest) {
  // ── ESCUDO INMUNOLÓGICO Y ANTI-HACKEO (CIBERSEGURIDAD IA) ──
  const threatOrLimitResponse = ImmuneSystem.inspect(request);
  if (threatOrLimitResponse) {
    return threatOrLimitResponse;
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysxcjrxuakfqzzseiaiy.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Wdm8x6QfGCWQNKqwLRejXA__r5Cg13m';

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: 43200, // 12 horas de jornada laboral activa (Audenti 2027)
            })
          );
        },
      },
    }
  );

  // Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectUrl = request.nextUrl.clone();
  const isAuthRoute = redirectUrl.pathname.startsWith('/auth') || redirectUrl.pathname === '/login' || redirectUrl.pathname === '/portal/login';
  const isOnboardingRoute = redirectUrl.pathname.startsWith('/onboarding');
  const isDashboardRoute = redirectUrl.pathname.startsWith('/dashboard');
  const isAdminRoute = redirectUrl.pathname.startsWith('/admin');
  const isPatientsRoute = redirectUrl.pathname.startsWith('/patients');
  const isPortalRoute = (redirectUrl.pathname.startsWith('/portal') && redirectUrl.pathname !== '/portal/login') || redirectUrl.pathname.startsWith('/mi-expediente');

  // Comprobar token directo de sesión (sb-access-token o auth de Supabase)
  const sessionToken = request.cookies.get('sb-access-token')?.value ||
                       request.cookies.get('sb-token')?.value ||
                       user;

  // 1. Si no hay sesión e intenta acceder a rutas protegidas:
  if (!user) {
    if (isDashboardRoute || isOnboardingRoute || isAdminRoute || isPatientsRoute) {
      redirectUrl.pathname = '/auth/login';
      return NextResponse.redirect(redirectUrl);
    }
    if (isPortalRoute) {
      redirectUrl.pathname = '/portal/login';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Si hay usuario autenticado, verificar su rol y registro
  if (user) {
    // Lista de correos administradores / dueños del sistema (Dra. Aura Estudillo)
    const isSuperAdmin = user.email === 'audenti89@gmail.com';

    // 1. Leer rol prioritariamente desde los Claims del JWT
    const jwtRole = user.app_metadata?.user_role || user.app_metadata?.role || user.user_metadata?.role;

    let isStaffOrOwner =
      isSuperAdmin ||
      jwtRole === 'owner' ||
      jwtRole === 'admin' ||
      jwtRole === 'director' ||
      jwtRole === 'doctor' ||
      jwtRole === 'socio' ||
      jwtRole === 'trabajador';

    let userRole = jwtRole;
    let doctorType: string | undefined = undefined;
    let studentExpiresAt: string | undefined = undefined;

    // 2. Consultar perfil en tabla users para permisos granulares y expiración
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, doctor_type, student_expires_at, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfile) {
      userRole = userProfile.role || userRole;
      doctorType = userProfile.doctor_type;
      studentExpiresAt = userProfile.student_expires_at;

      isStaffOrOwner =
        isSuperAdmin ||
        userProfile.role === 'owner' ||
        userProfile.role === 'admin' ||
        userProfile.role === 'director' ||
        userProfile.role === 'doctor' ||
        userProfile.role === 'socio' ||
        userProfile.role === 'trabajador' ||
        userProfile.doctor_type === 'socio' ||
        userProfile.doctor_type === 'trabajador' ||
        userProfile.doctor_type === 'estudiante';
    }

    // REGLA CLAVE: Validación estricta de personal clínico vs pacientes
    const ADMIN_EMAILS = ['audenti89@gmail.com'];
    const userEmail = user.email || '';
    const isAdmin = ADMIN_EMAILS.includes(userEmail) || isStaffOrOwner;

    // Si NO es personal clínico (es paciente) y está intentando entrar al dashboard o admin:
    if (!isAdmin) {
      if (isDashboardRoute || isAdminRoute || isPatientsRoute) {
        redirectUrl.pathname = '/portal';
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (isAdmin) {
      const isFinancialOrAdminRestricted =
        redirectUrl.pathname.startsWith('/admin') ||
        redirectUrl.pathname.startsWith('/dashboard/finanzas') ||
        redirectUrl.pathname.startsWith('/dashboard/reportes') ||
        redirectUrl.pathname.startsWith('/dashboard/configuracion');

      // ─────────────────────────────────────────────────────────────
      // REGLA 1: GESTIÓN DE ACCESOS TEMPORALES PARA ESTUDIANTES (Servicio Social)
      // ─────────────────────────────────────────────────────────────
      const isEstudiante = doctorType === 'estudiante';
      if (isEstudiante) {
        // Verificar caducidad/expiración automática programable
        if (studentExpiresAt && new Date(studentExpiresAt).getTime() < Date.now()) {
          redirectUrl.pathname = '/auth/login';
          redirectUrl.searchParams.set('error', 'Tu pase temporal de servicio social ha concluido. Consulta a la Dra. Aura Estudillo.');
          return NextResponse.redirect(redirectUrl);
        }

        // Estudiante tiene permisos de solo lectura clínica en su sucursal; finanzas y administración bloqueados
        if (isFinancialOrAdminRestricted || redirectUrl.pathname.startsWith('/dashboard/crm')) {
          redirectUrl.pathname = '/dashboard/pacientes';
          redirectUrl.searchParams.set('notice', 'student_read_only');
          return NextResponse.redirect(redirectUrl);
        }
      }

      // ─────────────────────────────────────────────────────────────
      // REGLA 2: JERARQUÍA MÉDICA (Socios vs. Trabajadores)
      // Los "Socios" tienen control total de sucursales, finanzas y BI;
      // los "Trabajadores" operan exclusivamente su agenda clínica asignada.
      // ─────────────────────────────────────────────────────────────
      const isTrabajador =
        !isSuperAdmin &&
        (userRole === 'trabajador' || doctorType === 'trabajador');

      if (isTrabajador && isFinancialOrAdminRestricted) {
        redirectUrl.pathname = '/dashboard/calendar';
        redirectUrl.searchParams.set('restricted', 'financial_views_locked');
        return NextResponse.redirect(redirectUrl);
      }

      // Si está en auth o onboarding, enviar al dashboard
      if (isAuthRoute || isOnboardingRoute) {
        redirectUrl.pathname = '/dashboard';
        return NextResponse.redirect(redirectUrl);
      }
      return supabaseResponse;
    }

    // Para pacientes: verificar registro médico en la tabla `patients`
    const { data: patient } = await supabase
      .from('patients')
      .select('id, onboarding_completed')
      .or(`id.eq.${user.id},user_id.eq.${user.id},auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    const hasPatientRecord = !!patient;
    const hasCompletedOnboarding = hasPatientRecord && patient.onboarding_completed !== false;

    // Si es paciente nuevo sin expediente y va a rutas protegidas -> redirigir a /onboarding
    if (!hasPatientRecord && (isDashboardRoute || redirectUrl.pathname.startsWith('/portal') || redirectUrl.pathname.startsWith('/mi-expediente'))) {
      redirectUrl.pathname = '/onboarding';
      return NextResponse.redirect(redirectUrl);
    }

    // Si ya tiene perfil o completó el onboarding e intenta entrar a login u onboarding -> redirigir a /portal
    if (hasPatientRecord && (isAuthRoute || isOnboardingRoute)) {
      redirectUrl.pathname = '/portal';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
