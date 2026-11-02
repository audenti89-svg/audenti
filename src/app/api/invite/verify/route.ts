import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Falta el token de invitación' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: invitation, error } = await supabase
      .from('doctor_invitations')
      .select('id, email, full_name, role, branch_id, branch_name, status, expires_at, invited_by_name')
      .eq('token', token)
      .maybeSingle()

    if (error || !invitation) {
      return NextResponse.json({
        valid: false,
        error: 'El enlace de invitación no es válido o no existe.'
      }, { status: 404 })
    }

    if (invitation.status === 'accepted') {
      return NextResponse.json({
        valid: false,
        error: 'Esta invitación ya fue aceptada previamente.'
      }, { status: 400 })
    }

    if (invitation.status === 'revoked') {
      return NextResponse.json({
        valid: false,
        error: 'Esta invitación fue revocada por la administración médica.'
      }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'Esta invitación ha expirado. Solicita un nuevo enlace a la Dra. Aura Estudillo.'
      }, { status: 410 })
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
        branch_name: invitation.branch_name,
        invited_by_name: invitation.invited_by_name || 'Dra. Aura Estudillo',
        expires_at: invitation.expires_at
      }
    })
  } catch (err: any) {
    console.error('[api/invite/verify GET]', err)
    return NextResponse.json({ valid: false, error: 'Error al verificar la invitación' }, { status: 500 })
  }
}
