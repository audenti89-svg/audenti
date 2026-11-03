import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { safeUpsertPatient } from '@/lib/patients/safeUpsertPatient';

// ────────────────────────────────────────────────────────────
// Helper: decodificar estado de atribución del parámetro state
// ────────────────────────────────────────────────────────────
function parseAttributionState(state: string | null): Record<string, string> {
  if (!state) return {};
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  } catch {
    return {};
  }
}

// ────────────────────────────────────────────────────────────
// Detectar canal desde utm_source / canal param
// ────────────────────────────────────────────────────────────
const VALID_CHANNELS = ['tiktok','instagram','youtube','facebook','referral','qr','directo','otro'];
function normalizeChannel(raw: string): string | null {
  const lower = raw?.toLowerCase()?.trim();
  return VALID_CHANNELS.includes(lower) ? lower : null;
}

const ADMIN_EMAILS = ['audenti89@gmail.com'];
const INTERNAL_ROLES = ['owner', 'admin', 'director', 'doctor', 'socio', 'trabajador', 'pasante', 'estudiante'];

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code       = requestUrl.searchParams.get('code');
  const stateParam = requestUrl.searchParams.get('state');
  const origin     = requestUrl.origin;
  const next       = requestUrl.searchParams.get('next') ?? '/dashboard';
  const isRegistration = requestUrl.searchParams.get('registration') === 'true';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code_provided`);
  }

  let response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysxcjrxuakfqzzseiaiy.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Wdm8x6QfGCWQNKqwLRejXA__r5Cg13m',
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get('cookie') ?? '';
          return cookieHeader.split(';').map((c) => {
            const [name, ...rest] = c.trim().split('=');
            return { name, value: rest.join('=') };
          }).filter((c) => c.name);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              maxAge: 43200, // 12 horas de jornada laboral activa
            });
          });
        },
      },
    }
  );

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) {
    console.error('[auth/callback] Error al intercambiar código PKCE:', sessionError);
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(sessionError.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  // ────────────────────────────────────────────────────────
  // Si viene atribución o invitación médica:
  // ────────────────────────────────────────────────────────
  const cookieHeader = request.headers.get('cookie') ?? '';
  let cookieAttr: Record<string, string> = {};
  const cookieMatch = cookieHeader.match(/audenti_attr=([^;]+)/);
  if (cookieMatch) {
    try {
      cookieAttr = JSON.parse(decodeURIComponent(cookieMatch[1]));
    } catch {}
  }

  const stateAttr = parseAttributionState(stateParam);
  const attr = { ...cookieAttr, ...stateAttr };

  if (user) {
    // 1. Si viene con token de invitación médica
    if (attr.invite_token) {
      try {
        const { data: inv } = await supabase
          .from('doctor_invitations')
          .select('*')
          .eq('token', attr.invite_token)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (inv) {
          const docRole = inv.role === 'socio' ? 'socio' : 'trabajador';
          const docName = user.user_metadata?.full_name || user.user_metadata?.name || inv.full_name || 'Odontólogo Especialista';

          await supabase.from('doctor_invitations').update({
            status: 'accepted',
            accepted_by: user.id,
            accepted_at: new Date().toISOString()
          }).eq('id', inv.id);

          await supabase.from('users').upsert({
            id: user.id,
            email: user.email,
            full_name: docName,
            role: docRole,
            doctor_type: docRole,
            branch_id: inv.branch_id,
            branch_name: inv.branch_name,
            invited_by: inv.created_by,
            onboarding_completed: true,
            is_active: true
          }, { onConflict: 'id' });

          return NextResponse.redirect(`${origin}/dashboard`);
        }
      } catch (invErr) {
        console.warn('[auth/callback] Error procesando invitación de odontólogo:', invErr);
      }
    }

    // 2. Validación de acceso exclusivo a personal interno
    const userEmail = user.email || '';
    const userMetaRole = (user.user_metadata?.role || user.app_metadata?.role || user.user_metadata?.doctor_type || '').toLowerCase();
    let isInternal = ADMIN_EMAILS.includes(userEmail) || INTERNAL_ROLES.includes(userMetaRole);

    if (!isInternal) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, doctor_type')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const dbRole = (profile.role || profile.doctor_type || '').toLowerCase();
        if (INTERNAL_ROLES.includes(dbRole)) {
          isInternal = true;
        }
      }
    }

    // Si el destino es el Portal del Paciente, permitir el acceso seguro
    const isPortalTarget = next.startsWith('/portal') || next.startsWith('/mi-expediente') || requestUrl.searchParams.get('portal') === 'true';

    if (isPortalTarget) {
      try {
        await safeUpsertPatient(supabase as any, {
          auth_user_id: user.id,
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Paciente Audenti',
          branch_name: 'Sucursal Balbuena (Matriz)',
          onboarding_completed: true
        });
      } catch (upsertErr) {
        console.warn('[auth/callback] Error en safeUpsertPatient portal:', upsertErr);
      }

      return NextResponse.redirect(`${origin}/portal`);
    }

    // Si intenta acceder al dashboard administrativo/médico sin rol interno autorizado, cerrar sesión y rechazar
    if (!isInternal) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/auth/login?error=acceso_denegado_personal_interno`);
    }
  }

  return response;
}
