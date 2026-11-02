import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, full_name, password } = body

    if (!token) {
      return NextResponse.json({ error: 'Token de invitación requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Validar la invitación
    const { data: invitation, error: invError } = await supabase
      .from('doctor_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (invError || !invitation) {
      return NextResponse.json({
        error: 'Invitación no válida, expirada o previamente aceptada.'
      }, { status: 400 })
    }

    // 2. Si el usuario ya está autenticado (ej. inició con Google tras abrir el enlace)
    let { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Registro con contraseña para el odontólogo invitado
      if (!password || password.length < 8) {
        return NextResponse.json({
          error: 'La contraseña debe tener al menos 8 caracteres.'
        }, { status: 400 })
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: full_name || invitation.full_name || 'Odontólogo Especialista',
            role: invitation.role,
            doctor_type: invitation.role,
            branch_name: invitation.branch_name,
            branch_id: invitation.branch_id,
          }
        }
      })

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 })
      }

      user = signUpData.user
    }

    if (!user) {
      return NextResponse.json({ error: 'No se pudo crear la cuenta del odontólogo' }, { status: 500 })
    }

    // 3. Ejecutar función atómica accept_doctor_invitation o actualizar tablas directamente
    const targetFullName = full_name || invitation.full_name || user.user_metadata?.full_name || 'Odontólogo Especialista'

    try {
      await supabase.rpc('accept_doctor_invitation', {
        p_token: token,
        p_user_id: user.id,
        p_full_name: targetFullName
      })
    } catch {
      // Fallback manual directo
      await supabase
        .from('doctor_invitations')
        .update({
          status: 'accepted',
          accepted_by: user.id,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: invitation.email,
          full_name: targetFullName,
          role: invitation.role,
          doctor_type: invitation.role,
          branch_id: invitation.branch_id,
          branch_name: invitation.branch_name,
          invited_by: invitation.created_by,
          onboarding_completed: true,
          is_active: true
        }, { onConflict: 'id' })
    }

    return NextResponse.json({
      success: true,
      message: `¡Bienvenido al equipo de Audenti Cloud Pro como Odontólogo ${invitation.role === 'socio' ? 'Socio' : 'Colaborador'}!`,
      role: invitation.role,
      branch_name: invitation.branch_name,
      redirect: '/dashboard'
    })
  } catch (err: any) {
    console.error('[api/invite/accept POST]', err)
    return NextResponse.json({ error: err?.message || 'Error al aceptar invitación' }, { status: 500 })
  }
}
