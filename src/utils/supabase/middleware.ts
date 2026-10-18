import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
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
            supabaseResponse.cookies.set(name, value, options)
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
  const isAuthRoute = redirectUrl.pathname.startsWith('/auth') || redirectUrl.pathname === '/login';
  const isOnboardingRoute = redirectUrl.pathname.startsWith('/onboarding');
  const isDashboardRoute = redirectUrl.pathname.startsWith('/dashboard');
  const isAdminRoute = redirectUrl.pathname.startsWith('/admin');
  const isPatientsRoute = redirectUrl.pathname.startsWith('/patients');

  // Comprobar token directo de sesión (sb-access-token o auth de Supabase)
  const sessionToken = request.cookies.get('sb-access-token')?.value ||
                       request.cookies.get('sb-token')?.value ||
                       user;

  // 1. Si no hay sesión e intenta acceder a /admin, /patients, /dashboard o /onboarding -> redirigir a login
  if (!user && (isDashboardRoute || isOnboardingRoute || isAdminRoute || isPatientsRoute)) {
    redirectUrl.pathname = '/auth/login';
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Si hay usuario autenticado, verificar su rol y registro
  if (user) {
    // Lista de correos administradores / dueños del sistema (Dra. Aura Estudillo)
    const isSuperAdmin = user.email === 'audenti89@gmail.com';

    // 1. Leer rol prioritariamente desde los Claims del JWT (Custom Access Token Hook de Supabase)
    const jwtRole = user.app_metadata?.user_role || user.app_metadata?.role || user.user_metadata?.role;

    let isStaffOrOwner =
      isSuperAdmin ||
      jwtRole === 'owner' ||
      jwtRole === 'admin' ||
      jwtRole === 'doctor';

    // 2. Si no viene en los claims del token, consultar la tabla `users` como fallback
    if (!isStaffOrOwner) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      isStaffOrOwner =
        userProfile?.role === 'owner' ||
        userProfile?.role === 'admin' ||
        userProfile?.role === 'doctor';
    }

    // REGLA CLAVE: Validación estricta de acceso por correo de la Dra. Aura Estudillo
    const ADMIN_EMAILS = ['audenti89@gmail.com'];
    const userEmail = user.email || '';
    const isAdmin = ADMIN_EMAILS.includes(userEmail) || isStaffOrOwner;

    // REGLA CLAVE: Si NO es la doctora/administrador y está intentando ver el dashboard administrativo:
    if (!isAdmin) {
      if (isDashboardRoute || isAdminRoute || isPatientsRoute) {
        redirectUrl.pathname = '/portal';
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (isAdmin) {
      // Dueña / Doctora / Administrador tiene acceso total directo al dashboard
      if (isAuthRoute || isOnboardingRoute) {
        redirectUrl.pathname = '/dashboard';
        return NextResponse.redirect(redirectUrl);
      }
      return supabaseResponse;
    }

    // Para pacientes: verificar registro médico en la tabla `patients`
    const { data: patient } = await supabase
      .from('patients')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    const hasCompletedOnboarding = patient?.onboarding_completed === true;

    // Si es paciente y no ha completado el onboarding e intenta entrar a rutas protegidas -> redirigir a /onboarding
    if (!hasCompletedOnboarding && (isDashboardRoute || redirectUrl.pathname.startsWith('/portal') || redirectUrl.pathname.startsWith('/mi-expediente'))) {
      redirectUrl.pathname = '/onboarding';
      return NextResponse.redirect(redirectUrl);
    }

    // Si ya completó el onboarding e intenta entrar a login u onboarding -> redirigir a /mi-expediente
    if (hasCompletedOnboarding && (isAuthRoute || isOnboardingRoute)) {
      redirectUrl.pathname = '/mi-expediente';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
