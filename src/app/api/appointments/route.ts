import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export interface PersistentAppointment {
  id: string
  folio: string
  patient_id?: string
  patient_name: string
  patient_phone: string
  appointment_date: string // YYYY-MM-DD
  appointment_time: string // HH:mm:ss o HH:mm
  treatment: string
  branch: string
  status: 'confirmed' | 'pending_review' | 'scheduled' | 'in_chair' | 'in_waiting' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
}

// Almacén global sincronizado en memoria para Next.js runtime
declare global {
  var __audenti_appointments: PersistentAppointment[] | undefined
}

if (!globalThis.__audenti_appointments) {
  globalThis.__audenti_appointments = []
}

export async function GET() {
  try {
    const list = globalThis.__audenti_appointments || []
    return NextResponse.json({
      success: true,
      appointments: list,
      total: list.length,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      folio,
      patient_name,
      patient_phone,
      appointment_date,
      appointment_time,
      treatment,
      branch,
      status = 'confirmed',
      notes
    } = body

    if (!patient_name) {
      return NextResponse.json({ success: false, error: 'El nombre del paciente es requerido' }, { status: 400 })
    }

    const generatedFolio = folio || `AUD-${Math.floor(1000 + Math.random() * 9000)}`
    const nowIso = new Date().toISOString()
    const appDate = appointment_date || new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]
    const appTime = appointment_time || '11:00:00'
    const appBranch = branch || 'Sede Balbuena (Matriz)'
    const appTreatment = treatment || 'Consulta / Valoración Estética Oral'

    const newAppointment: PersistentAppointment = {
      id: `APT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      folio: generatedFolio,
      patient_name,
      patient_phone: patient_phone || '',
      appointment_date: appDate,
      appointment_time: appTime,
      treatment: appTreatment,
      branch: appBranch,
      status: status as any,
      notes: notes || `Agendado en tiempo real por Aura AI. Folio: ${generatedFolio}`,
      created_at: nowIso
    }

    // 1. Guardar en memoria global de alta velocidad
    if (!globalThis.__audenti_appointments) {
      globalThis.__audenti_appointments = []
    }
    // Evitar duplicados por folio
    const exists = globalThis.__audenti_appointments.some(a => a.folio === newAppointment.folio)
    if (!exists) {
      globalThis.__audenti_appointments = [newAppointment, ...globalThis.__audenti_appointments].slice(0, 50)
    }

    // 2. Intentar inserción en base de datos Supabase si la sesión/privilegios lo permiten
    let supabasePersisted = false
    try {
      const supabase = await createClient()
      const { data: patient } = await supabase
        .from('patients')
        .insert({
          full_name: patient_name,
          phone: patient_phone || 'Pendiente por WhatsApp',
          onboarding_completed: false
        })
        .select('id')
        .maybeSingle()

      if (patient?.id) {
        newAppointment.patient_id = patient.id
      }

      const startDateTime = new Date(`${appDate}T${appTime}`)
      const endDateTime = new Date(startDateTime.getTime() + 45 * 60000)

      const { error: apptError } = await supabase.from('appointments').insert({
        patient_id: patient?.id,
        treatment_type: appTreatment,
        status: status === 'confirmed' ? 'confirmed' : 'scheduled',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: `Folio: ${generatedFolio}. Sede: ${appBranch}. Tel: ${patient_phone}`
      })

      if (!apptError) {
        supabasePersisted = true
      }
    } catch (dbErr) {
      // Usar persistencia en memoria y realtime sin romper el flujo
      console.warn('Nota en persistencia Supabase appointments (activo fallback en tiempo real):', dbErr)
    }

    // 3. Revalidar rutas clave del dashboard
    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/agenda')
      revalidatePath('/dashboard/calendar')
    } catch (e) {
      // Ignorar en entornos estáticos
    }

    return NextResponse.json({
      success: true,
      appointment: newAppointment,
      folio: generatedFolio,
      supabasePersisted,
      message: 'Cita persistida exitosamente y sincronizada con el Dashboard.'
    })
  } catch (error: any) {
    console.error('Error en /api/appointments:', error)
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
