import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, full_name, password } = body

    if (!token) {
      return NextResponse.json({ error: 'Token de pase requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Validar el pase
    const { data: pass, error: passError } = await supabase
      .from('student_passes')
      .select('*')
      .eq('pass_token', token)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (passError || !pass) {
      return NextResponse.json({
        error: 'Pase temporal inválido, revocado o expirado.'
      }, { status: 400 })
    }

    // 2. Obtener usuario o crear cuenta
    let { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      if (!password || password.length < 8) {
        return NextResponse.json({
          error: 'La contraseña debe tener al menos 8 caracteres.'
        }, { status: 400 })
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pass.student_email,
        password,
        options: {
          data: {
            full_name: full_name || pass.student_name,
            role: 'doctor',
            doctor_type: 'estudiante',
            branch_name: pass.branch_name,
            branch_id: pass.branch_id,
            is_temporary_student: true
          }
        }
      })

      if (signUpError) {
        return NextResponse.json({ error: signUpError.message }, { status: 400 })
      }

      user = signUpData.user
    }

    if (!user) {
      return NextResponse.json({ error: 'No se pudo crear la cuenta de estudiante.' }, { status: 500 })
    }

    // 3. Ejecutar función atómica activate_student_pass o fallback directo
    const targetName = full_name || pass.student_name || 'Estudiante Pasante'

    try {
      await supabase.rpc('activate_student_pass', {
        p_pass_token: token,
        p_user_id: user.id,
        p_full_name: targetName
      })
    } catch {
      await supabase
        .from('student_passes')
        .update({
          assigned_user_id: user.id,
          activated_at: new Date().toISOString()
        })
        .eq('id', pass.id)

      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: pass.student_email,
          full_name: targetName,
          role: 'doctor',
          doctor_type: 'estudiante',
          branch_id: pass.branch_id,
          branch_name: pass.branch_name,
          student_expires_at: pass.expires_at,
          is_temporary_student: true,
          supervisor_id: pass.created_by,
          university_origin: pass.university,
          onboarding_completed: true,
          is_active: true
        }, { onConflict: 'id' })
    }

    return NextResponse.json({
      success: true,
      message: `¡Pase de Servicio Social activado con éxito! Vigente hasta: ${new Date(pass.expires_at).toLocaleDateString('es-MX')}`,
      role: 'estudiante',
      branch_name: pass.branch_name,
      redirect: '/dashboard'
    })
  } catch (err: any) {
    console.error('[api/invite/student/accept POST]', err)
    return NextResponse.json({ error: err?.message || 'Error al activar pase' }, { status: 500 })
  }
}
