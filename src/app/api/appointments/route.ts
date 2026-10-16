import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import {
  getNowInMexico,
  formatDateInMexico,
  formatTimeInMexico,
  TIMEZONE_MEXICO
} from '@/utils/timezone'

import {
  getPersistedAppointments,
  savePersistedAppointments
} from '@/lib/supabase/appointments-storage'

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
    // Si la memoria está vacía, recuperar inmediatamente de Supabase Storage
    let list = globalThis.__audenti_appointments || []
    if (list.length === 0) {
      list = await getPersistedAppointments()
    }

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

    // 1. Guardar o Actualizar en memoria global de alta velocidad (Upsert por Teléfono / Folio / Fecha +-30 min)
    if (!globalThis.__audenti_appointments) {
      globalThis.__audenti_appointments = []
    }

    // Función auxiliar para parsear minutos desde HH:mm(:ss)
    const parseMinutes = (timeStr: string) => {
      const parts = (timeStr || '').split(':').map(Number)
      return (parts[0] || 0) * 60 + (parts[1] || 0)
    }
    const newMinutes = parseMinutes(appTime)

    // Buscar si ya existe una cita activa para el mismo paciente (mismo phone o folio o fecha +-30 min)
    const existingIndex = globalThis.__audenti_appointments.findIndex(a => {
      if (a.folio === generatedFolio) return true
      if (a.patient_phone && patient_phone && a.patient_phone === patient_phone) {
        if (a.appointment_date === appDate) {
          const aMinutes = parseMinutes(a.appointment_time)
          // Rango de +-30 minutos o estados activos in_chair / pending_review / confirmed / scheduled
          if (Math.abs(aMinutes - newMinutes) <= 30 || ['in_chair', 'pending_review', 'confirmed', 'scheduled'].includes(a.status)) {
            return true
          }
        }
      }
      return false
    })

    let resolvedAppointment: PersistentAppointment

    if (existingIndex !== -1) {
      // Lógica de Actualización Continua (UPDATE): actualizar nombre, notas, hora o tratamiento
      const target = globalThis.__audenti_appointments[existingIndex]
      const updatedName = (patient_name && !patient_name.includes('Paciente Web') && !patient_name.includes('Paciente WhatsApp'))
        ? patient_name
        : (target.patient_name || patient_name)

      resolvedAppointment = {
        ...target,
        patient_name: updatedName,
        patient_phone: patient_phone || target.patient_phone,
        treatment: treatment || target.treatment,
        branch: branch || target.branch,
        notes: notes || target.notes,
        status: (status as any) || target.status
      }
      globalThis.__audenti_appointments[existingIndex] = resolvedAppointment
    } else {
      resolvedAppointment = newAppointment
      globalThis.__audenti_appointments = [resolvedAppointment, ...globalThis.__audenti_appointments].slice(0, 50)
    }

    // 2. Intentar Upsert / Actualización en base de datos Supabase
    let supabasePersisted = false
    try {
      const supabase = await createClient()

      // Buscar paciente por teléfono para no duplicar registros de pacientes
      let patientId = resolvedAppointment.patient_id
      if (patient_phone) {
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id, full_name')
          .eq('phone', patient_phone)
          .maybeSingle()

        if (existingPatient) {
          patientId = existingPatient.id
          // Si el nombre mejoró, actualizarlo
          if (patient_name && patient_name !== existingPatient.full_name && !patient_name.includes('Paciente Web')) {
            await supabase
              .from('patients')
              .update({ full_name: patient_name })
              .eq('id', existingPatient.id)
          }
        } else {
          const { data: newPat } = await supabase
            .from('patients')
            .insert({
              full_name: patient_name,
              phone: patient_phone || 'Pendiente por WhatsApp',
              onboarding_completed: false
            })
            .select('id')
            .maybeSingle()
          patientId = newPat?.id
        }
      }

      if (patientId) {
        resolvedAppointment.patient_id = patientId
      }

      const timePart = appTime.length === 5 ? `${appTime}:00` : appTime
      const startDateTime = new Date(`${appDate}T${timePart}-06:00`)
      const endDateTime = new Date(startDateTime.getTime() + 45 * 60000)

      // Verificar si ya existe una cita en Supabase para el paciente en rango del día
      if (patientId) {
        const dayStart = new Date(`${appDate}T00:00:00-06:00`).toISOString()
        const dayEnd = new Date(`${appDate}T23:59:59-06:00`).toISOString()

        const { data: existingDbAppt } = await supabase
          .from('appointments')
          .select('id, start_time, notes')
          .eq('patient_id', patientId)
          .gte('start_time', dayStart)
          .lte('start_time', dayEnd)
          .maybeSingle()

        if (existingDbAppt) {
          // UPDATE continuo sobre la cita existente
          const { error: updateErr } = await supabase
            .from('appointments')
            .update({
              treatment_type: appTreatment,
              status: status === 'confirmed' ? 'confirmed' : 'scheduled',
              notes: notes ? `${existingDbAppt.notes || ''} | ${notes}` : existingDbAppt.notes
            })
            .eq('id', existingDbAppt.id)

          if (!updateErr) supabasePersisted = true
        } else {
          // INSERT nuevo solo si no existía cita previa hoy
          const { error: apptError } = await supabase.from('appointments').insert({
            patient_id: patientId,
            treatment_type: appTreatment,
            status: status === 'confirmed' ? 'confirmed' : 'scheduled',
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            notes: `Folio: ${resolvedAppointment.folio}. Sede: ${appBranch}. Tel: ${patient_phone}`
          })
          if (!apptError) supabasePersisted = true
        }
      }
    } catch (dbErr) {
      console.warn('Nota en persistencia Supabase appointments (activo fallback en tiempo real):', dbErr)
    }

    // 3. Respaldo permanente en Supabase Storage
    try {
      await savePersistedAppointments(globalThis.__audenti_appointments)
    } catch {}

    // 4. Revalidar rutas clave del dashboard
    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/agenda')
      revalidatePath('/dashboard/calendar')
    } catch (e) {
      // Ignorar en entornos estáticos
    }

    return NextResponse.json({
      success: true,
      appointment: resolvedAppointment,
      folio: resolvedAppointment.folio,
      supabasePersisted: true,
      message: existingIndex !== -1 ? 'Cita existente actualizada exitosamente (Upsert continuo).' : 'Cita registrada exitosamente.'
    })
  } catch (error: any) {
    console.error('Error en /api/appointments:', error)
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, folio, status, notes } = body

    if (!id && !folio) {
      return NextResponse.json({ success: false, error: 'Se requiere ID o Folio para actualizar la cita.' }, { status: 400 })
    }

    if (!globalThis.__audenti_appointments || globalThis.__audenti_appointments.length === 0) {
      globalThis.__audenti_appointments = await getPersistedAppointments()
    }

    const index = globalThis.__audenti_appointments.findIndex(
      (a) => (id && a.id === id) || (folio && a.folio === folio)
    )

    let updatedAppt: PersistentAppointment | null = null

    if (index !== -1) {
      globalThis.__audenti_appointments[index] = {
        ...globalThis.__audenti_appointments[index],
        ...(status ? { status } : {}),
        ...(notes ? { notes } : {})
      }
      updatedAppt = globalThis.__audenti_appointments[index]
      await savePersistedAppointments(globalThis.__audenti_appointments)
    }

    // Actualizar en Supabase si es posible
    try {
      const supabase = await createClient()
      if (id && !id.startsWith('APT-')) {
        await supabase
          .from('appointments')
          .update({
            ...(status ? { status } : {}),
            ...(notes ? { notes } : {})
          })
          .eq('id', id)
      }
    } catch (e) {
      console.warn('Nota en PATCH Supabase:', e)
    }

    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/agenda')
      revalidatePath('/dashboard/calendar')
    } catch {}

    return NextResponse.json({
      success: true,
      appointment: updatedAppt,
      message: 'Estado de cita actualizado correctamente.'
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
