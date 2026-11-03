import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { isSystemAdminEmail } from '@/lib/auth/admin-emails'

// Lista de correos administradores
// Solo la Dirección Médica tiene acceso a invitar odontólogos

// ── GET: Listar invitaciones a odontólogos ──────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si es superadmin, owner, director o socio
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
      return NextResponse.json(
        { error: 'Permisos insuficientes. Solo la dirección médica o socios pueden gestionar invitaciones.' },
        { status: 403 }
      )
    }

    const { data: invitations, error } = await supabase
      .from('doctor_invitations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[admin/invitations GET] Error al leer tabla:', error.message)
      return NextResponse.json({ invitations: [] })
    }

    return NextResponse.json({
      invitations: invitations || [],
      total: invitations?.length || 0,
      active_count: invitations?.filter(i => i.status === 'pending').length || 0
    })
  } catch (err: any) {
    console.error('[admin/invitations GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── POST: Crear nueva invitación a odontólogo (Socio vs Trabajador) ─
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
        { error: 'Solo la dirección médica o socios pueden generar enlaces de invitación.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { email, full_name, role, branch_id, branch_name } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'El correo electrónico es requerido y debe ser válido.' }, { status: 400 })
    }

    const cleanRole = role === 'socio' ? 'socio' : 'trabajador'
    const targetBranchId = branch_id || 'balbuena'
    const targetBranchName = branch_name || 'Sucursal Balbuena (Matriz)'

    // Generar token criptográfico único
    const token = `inv_${cleanRole}_${crypto.randomBytes(16).toString('hex')}`

    const invitedByName = isSuperAdmin
      ? 'Dra. Aura Estudillo (Dirección Médica)'
      : (profile?.full_name || 'Dra. Aura Estudillo')

    const { data: newInvitation, error: insertError } = await supabase
      .from('doctor_invitations')
      .insert({
        email: email.trim().toLowerCase(),
        full_name: full_name?.trim() || null,
        role: cleanRole,
        branch_id: targetBranchId,
        branch_name: targetBranchName,
        token,
        status: 'pending',
        created_by: user.id,
        invited_by_name: invitedByName,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
      })
      .select()
      .single()

    if (insertError) {
      console.error('[admin/invitations POST] Error insertando:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    const origin = req.nextUrl.origin
    const invitationUrl = `${origin}/invite/doctor?token=${token}`

    return NextResponse.json({
      success: true,
      invitation: newInvitation,
      invitation_url: invitationUrl,
      message: `Enlace de invitación generado con éxito para ${email}`
    })
  } catch (err: any) {
    console.error('[admin/invitations POST]', err)
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 })
  }
}

// ── DELETE: Revocar invitación ──────────────────────────────────
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
      return NextResponse.json({ error: 'ID de invitación no proporcionado' }, { status: 400 })
    }

    const { error } = await supabase
      .from('doctor_invitations')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Invitación revocada con éxito' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error al revocar' }, { status: 500 })
  }
}
