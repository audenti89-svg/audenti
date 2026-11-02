import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Falta el token del pase de estudiante' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: pass, error } = await supabase
      .from('student_passes')
      .select('id, student_name, student_email, university, branch_name, duration_months, status, expires_at, created_by_name')
      .eq('pass_token', token)
      .maybeSingle()

    if (error || !pass) {
      return NextResponse.json({
        valid: false,
        error: 'El pase de estudiante no es válido o no existe.'
      }, { status: 404 })
    }

    if (pass.status === 'revoked') {
      return NextResponse.json({
        valid: false,
        error: 'Este pase fue revocado por la dirección médica.'
      }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(pass.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: 'Este pase temporal de servicio social ha expirado.'
      }, { status: 410 })
    }

    return NextResponse.json({
      valid: true,
      pass: {
        id: pass.id,
        student_name: pass.student_name,
        student_email: pass.student_email,
        university: pass.university,
        branch_name: pass.branch_name,
        duration_months: pass.duration_months,
        created_by_name: pass.created_by_name || 'Dra. Aura Estudillo',
        expires_at: pass.expires_at
      }
    })
  } catch (err: any) {
    console.error('[api/invite/student/verify GET]', err)
    return NextResponse.json({ valid: false, error: 'Error al verificar pase' }, { status: 500 })
  }
}
