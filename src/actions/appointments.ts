'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { PersistentAppointment } from '@/app/api/appointments/route'
import {
  getNowInMexico,
  formatDateInMexico,
  formatTimeInMexico,
  TIMEZONE_MEXICO
} from '@/utils/timezone'

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

    // 1. Guardar de forma inmediata y garantizada en el almacén global del servidor (Lógica Upsert)
    if (!globalThis.__audenti_appointments) {
      globalThis.__audenti_appointments = []
    }

    const parseMinutes = (timeStr: string) => {
      const parts = (timeStr || '').split(':').map(Number)
      return (parts[0] || 0) * 60 + (parts[1] || 0)
    }
    const newMinutes = parseMinutes(appTime)

    const existingIndex = globalThis.__audenti_appointments.findIndex(a => {
      if (a.folio === generatedFolio) return true
      if (a.patient_phone && patient_phone && a.patient_phone === patient_phone) {
        if (a.appointment_date === appDate) {
          const aMinutes = parseMinutes(a.appointment_time)
          if (Math.abs(aMinutes - newMinutes) <= 30 || ['in_chair', 'pending_review', 'confirmed', 'scheduled'].includes(a.status)) {
            return true
          }
        }
      }
      return false
    })

    let resolvedAppointment: PersistentAppointment

    if (existingIndex !== -1) {
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

    // 2. Intentar Upsert / Actualización en Supabase
    let supabasePersisted = false
    try {
      const supabase = await createClient()

      let patientId = resolvedAppointment.patient_id
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
        resolvedAppointment.patient_id = patientId
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
            notes: `Folio: ${resolvedAppointment.folio}. Sede: ${appBranch}. Tel: ${patient_phone}`
          })
          if (!apptError) supabasePersisted = true
        }
      }
    } catch (err: any) {
      console.warn('Nota Supabase Server Action fallback:', err?.message)
    }

    // 3. Revalidación de rutas de Next.js
    try {
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/agenda')
      revalidatePath('/dashboard/calendar')
    } catch {}

    return {
      success: true,
      appointment: newAppointment,
      folio: generatedFolio,
      supabasePersisted,
      message: 'Cita persistida correctamente en Audenti.'
    }
  } catch (err: any) {
    console.error('Error en createAppointmentAction:', err)
    return {
      success: false,
      error: err?.message || 'Error al persistir la cita.'
    }
  }
}
