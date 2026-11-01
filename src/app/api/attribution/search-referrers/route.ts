import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()

    const supabase = createAdminClient()

    let query = supabase
      .from('patients')
      .select('id, full_name, referral_code, branch_name, total_referrals')

    if (q.length >= 2) {
      if (q.toUpperCase().startsWith('AUD-')) {
        query = query.ilike('referral_code', `%${q.toUpperCase()}%`)
      } else {
        query = query.or(`full_name.ilike.%${q}%,referral_code.ilike.%${q}%`)
      }
      query = query.limit(8)
    } else {
      // Si la consulta está vacía o es muy corta, retornar embajadores activos principales
      query = query
        .not('referral_code', 'is', null)
        .order('total_referrals', { ascending: false, nullsFirst: false })
        .limit(6)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[search-referrers] Nota Supabase query:', error.message)
      return NextResponse.json({ success: true, referrers: [] })
    }

    // Mapear sanitizando para proteger privacidad de pacientes
    const sanitized = (data || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name || 'Paciente Audenti',
      referral_code: p.referral_code || 'AUD-REG',
      branch_name: p.branch_name || 'Sucursal Balbuena (Matriz)',
      total_referrals: p.total_referrals || 0,
    }))

    return NextResponse.json({ success: true, referrers: sanitized })
  } catch (err: any) {
    console.error('[search-referrers error]:', err)
    return NextResponse.json({ success: false, referrers: [] }, { status: 500 })
  }
}
