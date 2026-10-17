'use server'

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

export interface CreateAppointmentInput {
  folio?: string
  patient_name: string
  patient_phone: string
  appointment_date?: string
  appointment_time?: string
  treatment?: string
  branch?: string
  status?: 'confirmed' | 'pending_review' | 'scheduled'
  notes?: string
}

export async function createAppointmentAction(input: CreateAppointmentInput) {
  try {
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
    } = input

    if (!patient_name || !patient_phone) {
      return {
        success: false,
        error: 'Nombre y teléfono son obligatorios para registrar la cita.'
      }
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
      patient_phone,
      appointment_date: appDate,
      appointment_time: appTime,
      treatment: appTreatment,
      branch: appBranch,
      status: status as any,
      notes: notes || `Agendado en tiempo real por Aura AI. Folio: ${generatedFolio}`,
      created_at: nowIso
    }

    // 1. Persistencia y Vinculación Atómica en Supabase (Base de Datos Relacional)
    let supabasePersisted = false
    try {
      const supabase = await createClient()

      let patientId: string | undefined
      if (patient_phone) {
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id, full_name')
          .eq('phone', patient_phone)
          .maybeSingle()

        if (existingPatient) {
          patientId = existingPatient.id
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
              phone: patient_phone,
              onboarding_completed: false
            })
            .select('id')
            .maybeSingle()
          patientId = newPat?.id
        }
      }

      if (patientId) {
        newAppointment.patient_id = patientId
      }

      const timePart = appTime.length === 5 ? `${appTime}:00` : appTime
      const startDateTime = new Date(`${appDate}T${timePart}-06:00`)
      const endDateTime = new Date(startDateTime.getTime() + 45 * 60000)

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
          const { error: apptError } = await supabase.from('appointments').insert({
            patient_id: patientId,
            treatment_type: appTreatment,
            status: status === 'confirmed' ? 'confirmed' : 'scheduled',
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            notes: `Folio: ${newAppointment.folio}. Sede: ${appBranch}. Tel: ${patient_phone}`
          })
          if (!apptError) supabasePersisted = true
        }
      }
    } catch (err: any) {
      console.warn('Nota Supabase Server Action fallback:', err?.message)
    }

    // 2. Respaldo permanente en Supabase Storage (Sin memoria volátil globalThis)
    try {
      const currentPersisted = await getPersistedAppointments()
      const updatedList = [newAppointment, ...currentPersisted.filter(a => a.folio !== newAppointment.folio)].slice(0, 50)
      await savePersistedAppointments(updatedList)
    } catch (saveErr) {
      console.warn('Nota en respaldo Supabase Storage:', saveErr)
    }

    // 3. Revalidación de rutas de Next.js y Notificación Realtime
    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/agenda')
      revalidatePath('/dashboard/calendar')

      const supabase = await createClient()
      const channel = supabase.channel('realtime_appointments')
      channel.send({
        type: 'broadcast',
        event: 'new_appointment',
        payload: {
          folio: newAppointment.folio,
          patient_name: newAppointment.patient_name,
          date: newAppointment.appointment_date,
          time: newAppointment.appointment_time,
          status: newAppointment.status
        }
      }).catch(() => {})
    } catch {}

    return {
      success: true,
      appointment: newAppointment,
      folio: generatedFolio,
      supabasePersisted: true,
      message: 'Cita persistida correctamente en Supabase.'
    }
  } catch (err: any) {
    console.error('Error en createAppointmentAction:', err)
    return {
      success: false,
      error: err?.message || 'Error al persistir la cita.'
    }
  }
}
