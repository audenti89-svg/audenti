import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isSystemAdminEmail } from '@/lib/auth/admin-emails'
import crypto from 'crypto'

// Solo la Dirección Médica gestiona pases de estudiantes

// ── GET: Listar pases de estudiantes / servicio social ─────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isSuperAdmin = isSystemAdminEmail(user.email, user.user_metadata?.role)
    const { data: profile } = await supabase
      .from('users')
      .select('role, doctor_type')
      .eq('id', user.id)
      .maybeSingle()

    const hasPermission =
      isSuperAdmin ||
      profile?.role === 'superadmin' ||
      profile?.role === 'owner' ||
      profile?.role === 'director' ||
      profile?.role === 'socio' ||
      profile?.doctor_type === 'socio'

    if (!hasPermission) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const { data: passes, error } = await supabase
      .from('student_passes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[admin/student-passes GET]', error.message)
      return NextResponse.json({ passes: [] })
    }

    return NextResponse.json({
      passes: passes || [],
      total: passes?.length || 0,
      active_count: passes?.filter(p => p.status === 'active' && new Date(p.expires_at) > new Date()).length || 0
    })
  } catch (err: any) {
    console.error('[admin/student-passes GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── POST: Generar pase temporal rápido de estudiante ───────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isSuperAdmin = isSystemAdminEmail(user.email, user.user_metadata?.role)
    const { data: profile } = await supabase
      .from('users')
      .select('role, doctor_type, full_name')
      .eq('id', user.id)
      .maybeSingle()

    const hasPermission =
      isSuperAdmin ||
      profile?.role === 'superadmin' ||
      profile?.role === 'owner' ||
      profile?.role === 'director' ||
      profile?.role === 'socio' ||
      profile?.doctor_type === 'socio'

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Solo la dirección médica o socios pueden autorizar pases de servicio social.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      student_name,
      student_email,
      university,
      branch_id,
      branch_name,
      duration_months
    } = body

    if (!student_email || !student_email.includes('@')) {
      return NextResponse.json({ error: 'Correo del estudiante requerido y válido.' }, { status: 400 })
    }

    const months = Number(duration_months) || 6 // Por defecto 6 meses de servicio social
    const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString()

    const token = `std_${crypto.randomBytes(16).toString('hex')}`
    const creatorName = isSuperAdmin ? 'Dra. Aura Estudillo (Dirección)' : (profile?.full_name || 'Dra. Aura Estudillo')

    const { data: newPass, error: insertError } = await supabase
      .from('student_passes')
      .insert({
        student_name: student_name?.trim() || 'Estudiante Pasante',
        student_email: student_email.trim().toLowerCase(),
        university: university?.trim() || 'UNAM / UAM / IPN',
        branch_id: branch_id || 'balbuena',
        branch_name: branch_name || 'Sucursal Balbuena (Matriz)',
        pass_token: token,
        duration_months: months,
        status: 'active',
        created_by: user.id,
        created_by_name: creatorName,
        expires_at: expiresAt
      })
      .select()
      .single()

    if (insertError) {
      console.error('[admin/student-passes POST]', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    const origin = req.nextUrl.origin
    const accessUrl = `${origin}/invite/student?token=${token}`

    return NextResponse.json({
      success: true,
      pass: newPass,
      access_url: accessUrl,
      expires_at: expiresAt,
      message: `Pase de estudiante generado con éxito por ${months} meses.`
    })
  } catch (err: any) {
    console.error('[admin/student-passes POST]', err)
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 })
  }
}

// ── DELETE: Revocar pase temporal anticipadamente ──────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de pase no especificado' }, { status: 400 })
    }

    const { error } = await supabase
      .from('student_passes')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Pase temporal revocado con éxito' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error al revocar pase' }, { status: 500 })
  }
}
