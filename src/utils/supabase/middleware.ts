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
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 1. Si no hay usuario y entra a rutas protegidas -> mandar al login
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/portal-paciente') || pathname.startsWith('/admin') || pathname.startsWith('/patients'))) {
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // 2. Si hay usuario autenticado (ej. audenti89@gmail.com o roles internos)
  if (user) {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = (user.user_metadata?.role || user.app_metadata?.role || user.user_metadata?.user_role || '').toLowerCase().trim();
    
    // Lista maestra de correos y roles con acceso total administrativo / gerencial
    const isInternalAdmin = 
      userEmail === 'audenti89@gmail.com' || 
      ['superadmin', 'owner', 'admin', 'director', 'doctor', 'reception', 'receptionist'].includes(userRole);

    // ACCESO DIRECTO ADMINISTRATIVO:
    // Si es administrador (audenti89@gmail.com o rol admin/owner/superadmin):
    // - Si intenta entrar al login, onboarding o a la raíz '/', mandarlo directo a /dashboard sin bucles
    // - Permitir acceso inmediato y sin fricciones a todo el panel operativo
    if (isInternalAdmin) {
      if (pathname.startsWith('/auth') || pathname === '/' || pathname === '/login' || pathname.startsWith('/onboarding')) {
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Si es paciente y entra a rutas administrativas -> mandar a su portal
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/patients')) {
      url.pathname = '/portal-paciente';
      return NextResponse.redirect(url);
    }

    // Si es paciente e intenta entrar a login o auth ya estando autenticado -> mandar a su portal
    if (pathname.startsWith('/auth') || pathname === '/login') {
      url.pathname = '/portal-paciente';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
