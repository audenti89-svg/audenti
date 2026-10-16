import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import {
  getNowInMexico,
  formatDateInMexico,
  formatTimeInMexico,
  TIMEZONE_MEXICO
} from '@/utils/timezone'

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
    const nowMx = getNowInMexico()
    const nowIso = new Date().toISOString()
    const tomorrowMx = new Date(nowMx)
    tomorrowMx.setDate(tomorrowMx.getDate() + 1)

    const appDate = appointment_date || formatDateInMexico(tomorrowMx)
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
    // Evitar duplicados por folio o por mismo paciente y teléfono en la misma fecha
    const exists = globalThis.__audenti_appointments.some(
      a => a.folio === newAppointment.folio ||
           (a.patient_phone && a.patient_phone === newAppointment.patient_phone && a.appointment_date === newAppointment.appointment_date)
    )
    if (!exists) {
      globalThis.__audenti_appointments = [newAppointment, ...globalThis.__audenti_appointments].slice(0, 50)
    } else {
      // Si ya existía, retornar la cita existente sin crear una segunda
      const existingAppt = globalThis.__audenti_appointments.find(
        a => a.folio === newAppointment.folio ||
             (a.patient_phone && a.patient_phone === newAppointment.patient_phone && a.appointment_date === newAppointment.appointment_date)
      )
      return NextResponse.json({
        success: true,
        appointment: existingAppt || newAppointment,
        folio: existingAppt?.folio || generatedFolio,
        message: 'Cita ya registrada previamente en la agenda.'
      })
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

      const timePart = appTime.length === 5 ? `${appTime}:00` : appTime
      const startDateTime = new Date(`${appDate}T${timePart}-06:00`)
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
