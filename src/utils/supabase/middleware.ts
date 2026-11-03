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
    const userEmail = (user.email || '').toLowerCase().trim();
    // Lista de correos administradores / dueños del sistema (Ricardo Sánchez y Dra. Aura Estudillo)
    const isSuperAdmin = isSystemAdminEmail(userEmail);

    // 1. Leer rol prioritariamente desde los Claims del JWT
    const jwtRole = user.app_metadata?.user_role || user.app_metadata?.role || user.user_metadata?.role;

    let isStaffOrOwner = isSuperAdmin || isInternalUser(userEmail, jwtRole);
    let userRole = jwtRole;
    let doctorType: string | undefined = undefined;
    let studentExpiresAt: string | undefined = undefined;

    // 2. Consultar perfil en tabla users para permisos granulares (con tolerancia si la tabla falla)
    try {
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
          isInternalUser(userEmail, userProfile.role) ||
          isInternalUser(userEmail, userProfile.doctor_type);
      }
    } catch {}

    // REGLA CLAVE: Validación estricta de personal clínico vs pacientes
    const isAdmin = isSuperAdmin || isStaffOrOwner;

    // Si NO es personal clínico (es paciente):
    if (!isAdmin) {
      // 1. Si intenta acceder al dashboard interno, redirigir a su portal
      if (isDashboardRoute || isAdminRoute || isPatientsRoute) {
        redirectUrl.pathname = '/portal';
        return NextResponse.redirect(redirectUrl);
      }

      // 2. Si ya está autenticado e intenta entrar a login, activación u onboarding, enviarlo directo a su portal
      if (isAuthRoute || isOnboardingRoute) {
        redirectUrl.pathname = '/portal';
        return NextResponse.redirect(redirectUrl);
      }

      // 3. Permitir acceso directo y fluido a /portal sin bucles
      return supabaseResponse;
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

      // Si el personal interno está en login u onboarding, enviar a su panel operativo
      if (isAuthRoute || isOnboardingRoute) {
        redirectUrl.pathname = '/dashboard';
        return NextResponse.redirect(redirectUrl);
      }
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}
