import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysxcjrxuakfqzzseiaiy.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Wdm8x6QfGCWQNKqwLRejXA__r5Cg13m';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        maxAge: 31536000, // 1 año permanente (permanece abierta hasta cerrar sesión manual)
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: 31536000, // 1 año permanente
              sameSite: 'lax',
              path: '/',
              secure: process.env.NODE_ENV === 'production',
            })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 1. Rutas administrativas protegidas (exclusivas del personal médico y clínica)
  // NOTA CRÍTICA: /portal-paciente y /portal NO deben redirigirse en servidor a /auth/login
  // para evitar bucles de redirección 307 en navegadores móviles/in-app y permitir que
  // el cliente resuelva la sesión persistida en localStorage.
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/patients'))) {
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // 2. Si hay usuario autenticado (ej. personal clínico o pacientes)
  if (user) {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = (user.user_metadata?.role || user.app_metadata?.role || user.user_metadata?.user_role || '').toLowerCase().trim();
    
    // Lista maestra de correos y roles con acceso administrativo / gerencial
    const isInternalAdmin = 
      userEmail === 'audenti89@gmail.com' || 
      ['superadmin', 'owner', 'admin', 'director', 'doctor', 'reception', 'receptionist', 'socio', 'trabajador', 'pasante'].includes(userRole);

    // ACCESO DIRECTO ADMINISTRATIVO:
    // Si es personal clínico: mandarlo directo a /dashboard sin bucles
    if (isInternalAdmin) {
      if (pathname.startsWith('/auth') || pathname === '/' || pathname === '/login' || pathname.startsWith('/onboarding')) {
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // ACCESO PACIENTE:
    // Si es paciente e intenta entrar a rutas de doctores (/dashboard, /admin, /patients) -> mandar a su portal
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/patients')) {
      url.pathname = '/portal-paciente';
      return NextResponse.redirect(url);
    }

    // Si es paciente y entra al login de doctores (/auth/login) -> mandar a su portal
    if (pathname.startsWith('/auth/login') || pathname === '/login') {
      url.pathname = '/portal-paciente';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
