import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ImmuneSystem } from '@/lib/security/immune-system';
import { isSystemAdminEmail, isInternalUser } from '@/lib/auth/admin-emails';

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
  const isAuthRoute =
    redirectUrl.pathname.startsWith('/auth') ||
    redirectUrl.pathname === '/login' ||
    redirectUrl.pathname.startsWith('/portal/login') ||
    redirectUrl.pathname.startsWith('/portal/register');
  const isOnboardingRoute = redirectUrl.pathname.startsWith('/onboarding');
  const isDashboardRoute = redirectUrl.pathname.startsWith('/dashboard');
  const isAdminRoute = redirectUrl.pathname.startsWith('/admin');
  const isPatientsRoute = redirectUrl.pathname.startsWith('/patients');
  const isPortalRoute =
    redirectUrl.pathname.startsWith('/portal-paciente') ||
    (redirectUrl.pathname.startsWith('/portal') && redirectUrl.pathname !== '/portal/login' && redirectUrl.pathname !== '/portal/register') ||
    redirectUrl.pathname.startsWith('/mi-expediente');

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
    const userEmail = (user.email || '').toLowerCase().trim();
    // Lista de correos administradores / dueños del sistema (Ricardo Sánchez y Dra. Aura Estudillo)
    const isSuperAdmin = isSystemAdminEmail(userEmail);

    // 1. Detección unívoca de rol: JWT / Metadata
    const jwtRole = (user.app_metadata?.user_role || user.app_metadata?.role || user.user_metadata?.role || '').toLowerCase().trim();
    let userRole = jwtRole;
    let isPatientRole = jwtRole === 'patient';
    let doctorType: string | undefined = undefined;
    let studentExpiresAt: string | undefined = undefined;

    // 2. Consultar perfil en tabla users
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, doctor_type, student_expires_at, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (userProfile) {
        const dbRole = (userProfile.role || '').toLowerCase().trim();
        if (dbRole === 'patient') {
          isPatientRole = true;
          userRole = 'patient';
        } else if (!isPatientRole && dbRole) {
          userRole = dbRole;
        }
      }
    } catch {}

    // 3. Consultar tabla patients si aún no confirmamos que es paciente
    if (!isPatientRole && !isSuperAdmin) {
      try {
        const { data: pRec } = await supabase
          .from('patients')
          .select('role')
          .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
          .maybeSingle();
        if (pRec?.role?.toLowerCase().trim() === 'patient' || pRec) {
          isPatientRole = true;
          userRole = 'patient';
        }
      } catch {}
    }

    // Regla de oro: si es paciente y NO es superadmin (Dra. Aura), NUNCA es admin ni staff
    const isAdmin = !isPatientRole && (isSuperAdmin || isInternalUser(userEmail, userRole));

    // ─────────────────────────────────────────────────────────────
    // SEPARACIÓN ESTRICTA: SI ES PACIENTE
    // ─────────────────────────────────────────────────────────────
    if (!isAdmin) {
      // 1. Si intenta acceder al dashboard interno, agenda general, finanzas o /portal antiguo:
      // Redirigir ÚNICAMENTE a /portal-paciente
      if (isDashboardRoute || isAdminRoute || isPatientsRoute || redirectUrl.pathname === '/portal') {
        redirectUrl.pathname = '/portal-paciente';
        return NextResponse.redirect(redirectUrl);
      }

      // 2. Si ya está autenticado e intenta entrar a login, activación u onboarding:
      // Redirigir directo a /portal-paciente
      if (isAuthRoute || isOnboardingRoute) {
        redirectUrl.pathname = '/portal-paciente';
        return NextResponse.redirect(redirectUrl);
      }

      // 3. Permitir acceso fluido y exclusivo a /portal-paciente
      return supabaseResponse;
    }

    // ─────────────────────────────────────────────────────────────
    // SEPARACIÓN ESTRICTA: SI ES PERSONAL INTERNO (ADMIN, DOCTOR, PARTNER/SOCIO, INTERN/PASANTE)
    // ─────────────────────────────────────────────────────────────
    if (isAdmin) {
      const isFinancialOrAdminRestricted =
        redirectUrl.pathname.startsWith('/admin') ||
        redirectUrl.pathname.startsWith('/dashboard/finanzas') ||
        redirectUrl.pathname.startsWith('/dashboard/reportes') ||
        redirectUrl.pathname.startsWith('/dashboard/configuracion');

      // A) Estudiantes / Pasantes (Servicio Social / Interns):
      const isEstudiante = userRole === 'intern' || userRole === 'pasante' || userRole === 'estudiante' || doctorType === 'estudiante';
      if (isEstudiante) {
        if (studentExpiresAt && new Date(studentExpiresAt).getTime() < Date.now()) {
          redirectUrl.pathname = '/auth/login';
          redirectUrl.searchParams.set('error', 'Tu pase temporal de servicio social ha concluido. Consulta a la Dirección Médica.');
          return NextResponse.redirect(redirectUrl);
        }

        // Estudiante tiene permisos de solo lectura clínica en su sucursal; finanzas y administración bloqueados
        if (isFinancialOrAdminRestricted || redirectUrl.pathname.startsWith('/dashboard/crm')) {
          redirectUrl.pathname = '/dashboard/pacientes';
          redirectUrl.searchParams.set('notice', 'student_read_only');
          return NextResponse.redirect(redirectUrl);
        }
      }

      // B) Odontólogos Trabajadores:
      const isTrabajador =
        !isSuperAdmin &&
        (userRole === 'trabajador' || doctorType === 'trabajador');

      if (isTrabajador && isFinancialOrAdminRestricted) {
        redirectUrl.pathname = '/dashboard/calendar';
        redirectUrl.searchParams.set('restricted', 'financial_views_locked');
        return NextResponse.redirect(redirectUrl);
      }

      // Si el personal interno está en login u onboarding, enviar a su panel operativo (/dashboard)
      if (isAuthRoute || isOnboardingRoute) {
        redirectUrl.pathname = '/dashboard';
        return NextResponse.redirect(redirectUrl);
      }

      return supabaseResponse;
    }
  }

  return supabaseResponse;
}
