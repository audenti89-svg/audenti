import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
            response.cookies.set(name, value, options);
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

  // ────────────────────────────────────────────────────────
  // Si es registro o viene atribución: guardar en Supabase
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
  const hasAttribution = Object.keys(attr).length > 0;

  if (isRegistration || hasAttribution) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Preparar objeto de atribución
        const rawChannel = attr.channel || attr.canal || attr.utm_source || '';
        const channel = normalizeChannel(rawChannel);
        const updatePayload: Record<string, unknown> = {
          email: user.email ?? null,
        };

        if (attr.full_name)     updatePayload.full_name     = attr.full_name;
        if (attr.phone)         updatePayload.phone         = attr.phone;
        if (channel)            updatePayload.acquisition_channel = channel;
        if (attr.qr_code_id || attr.qr) updatePayload.qr_code_id = attr.qr_code_id || attr.qr;
        if (attr.utm_source)    updatePayload.utm_source     = attr.utm_source;
        if (attr.utm_medium)    updatePayload.utm_medium     = attr.utm_medium;
        if (attr.utm_campaign)  updatePayload.utm_campaign   = attr.utm_campaign;
        if (attr.utm_content)   updatePayload.utm_content    = attr.utm_content;

        // Resolver referidor por código AUD-XXXXX o ref param
        const refCandidate = attr.referrer_code || attr.ref;
        if (refCandidate) {
          const { data: referrer } = await supabase
            .from('patients')
            .select('id')
            .eq('referral_code', refCandidate.toUpperCase())
            .maybeSingle();

          if (referrer?.id) {
            updatePayload.referrer_id = referrer.id;
            // Incrementar contador del referidor
            await supabase.rpc('increment_referral_count', { referrer: referrer.id });
          }
        }
        if (attr.referrer_name && !updatePayload.referrer_id) {
          updatePayload.referrer_name = attr.referrer_name;
        }

        // Upsert en patients (usando auth user id como referencia de email)
        const { error: upsertError } = await supabase
          .from('patients')
          .upsert(
            { ...updatePayload, auth_user_id: user.id },
            { onConflict: 'auth_user_id', ignoreDuplicates: false }
          );

        if (upsertError) {
          console.warn('[auth/callback] No se pudo guardar atribución en patients:', upsertError.message);
        }

        // Sincronizar también con tabla users (perfiles)
        try {
          await supabase.from('users').update({
            full_name: updatePayload.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
            phone: updatePayload.phone,
            acquisition_channel: channel,
            referrer_name: updatePayload.referrer_name,
            qr_code_id: updatePayload.qr_code_id,
          }).eq('id', user.id);
        } catch {
          // Soporte opcional si tabla users no tiene todas las columnas
        }
      }
    } catch (err) {
      console.warn('[auth/callback] Error procesando atribución (no crítico):', err);
    }
  }

  return response;
}
