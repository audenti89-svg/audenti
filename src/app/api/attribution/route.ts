import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ────────────────────────────────────────────────────────────
// GET /api/attribution  — estadísticas de atribución (Dirección)
// POST /api/attribution — upsert atribución de un paciente
// ────────────────────────────────────────────────────────────

const DIRECTOR_ROLES = ['superadmin', 'owner', 'director']

// ── GET: Resumen de atribución por canal ──────────────────
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar rol de dirección
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !DIRECTOR_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Acceso restringido a dirección' }, { status: 403 })
  }

  try {
    // Vista SQL de atribución por canal
    const { data: channelStats, error: statsError } = await supabase
      .from('attribution_by_channel')
      .select('*')
    if (statsError) throw statsError

    // Top referidores
    const { data: topReferrers, error: referrerError } = await supabase
      .from('patients')
      .select('id, full_name, total_referrals, acquisition_channel, referral_code')
      .gt('total_referrals', 0)
      .order('total_referrals', { ascending: false })
      .limit(10)
    if (referrerError) throw referrerError

    // Relaciones familiares (count)
    const { count: familyCount } = await supabase
      .from('family_relationships')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      channel_stats: channelStats ?? [],
      top_referrers: topReferrers ?? [],
      family_relationships_count: familyCount ?? 0,
      generated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[api/attribution GET]', err)
    return NextResponse.json({ error: 'Error al obtener datos de atribución' }, { status: 500 })
  }
}

// ── POST: Guardar / actualizar atribución de un paciente ─
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
  }

  const {
    patient_id,
    acquisition_channel,
    referrer_code,
    referrer_name,
    qr_code_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
  } = body

  if (!patient_id || typeof patient_id !== 'string') {
    return NextResponse.json({ error: 'patient_id requerido' }, { status: 400 })
  }

  const VALID_CHANNELS = ['tiktok','instagram','youtube','facebook','referral','qr','directo','otro']
  const channel = typeof acquisition_channel === 'string' && VALID_CHANNELS.includes(acquisition_channel)
    ? acquisition_channel : null

  const updatePayload: Record<string, unknown> = {}
  if (channel)        updatePayload.acquisition_channel = channel
  if (qr_code_id)     updatePayload.qr_code_id          = String(qr_code_id)
  if (utm_source)     updatePayload.utm_source           = String(utm_source)
  if (utm_medium)     updatePayload.utm_medium           = String(utm_medium)
  if (utm_campaign)   updatePayload.utm_campaign         = String(utm_campaign)
  if (utm_content)    updatePayload.utm_content          = String(utm_content)

  // Resolver referidor por código
  if (referrer_code && typeof referrer_code === 'string') {
    const { data: referrer } = await supabase
      .from('patients')
      .select('id')
      .eq('referral_code', String(referrer_code).toUpperCase())
      .maybeSingle()
    if (referrer?.id) {
      updatePayload.referrer_id = referrer.id
      await supabase.rpc('increment_referral_count', { referrer: referrer.id })
    }
  } else if (referrer_name && typeof referrer_name === 'string') {
    updatePayload.referrer_name = String(referrer_name)
  }

  const { error: updateError } = await supabase
    .from('patients')
    .update(updatePayload)
    .eq('id', patient_id)

  if (updateError) {
    console.error('[api/attribution POST]', updateError)
    return NextResponse.json({ error: 'Error al guardar atribución' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
