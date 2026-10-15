import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

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
  const isAuthRoute = redirectUrl.pathname.startsWith('/auth');
  const isOnboardingRoute = redirectUrl.pathname.startsWith('/onboarding');
  const isDashboardRoute = redirectUrl.pathname.startsWith('/dashboard');

  // 1. Si no hay usuario autenticado e intenta acceder a dashboard o onboarding -> redirigir a login
  if (!user && (isDashboardRoute || isOnboardingRoute)) {
    redirectUrl.pathname = '/auth/login';
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Si hay usuario autenticado, verificar su registro médico en la tabla `patients`
  if (user) {
    const { data: patient } = await supabase
      .from('patients')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    const hasCompletedOnboarding = patient?.onboarding_completed === true;

    // Si no ha completado el onboarding e intenta entrar al dashboard -> redirigir a /onboarding
    if (!hasCompletedOnboarding && isDashboardRoute) {
      redirectUrl.pathname = '/onboarding';
      return NextResponse.redirect(redirectUrl);
    }

    // Si ya completó el onboarding e intenta entrar a login u onboarding -> redirigir a /dashboard
    if (hasCompletedOnboarding && (isAuthRoute || isOnboardingRoute)) {
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
