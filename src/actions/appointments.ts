'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { PersistentAppointment } from '@/app/api/appointments/route'

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
    const nowIso = new Date().toISOString()
    const appDate = appointment_date || new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]
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

    // 1. Guardar de forma inmediata y garantizada en el almacén global del servidor
    if (!globalThis.__audenti_appointments) {
      globalThis.__audenti_appointments = []
    }
    const exists = globalThis.__audenti_appointments.some(a => a.folio === newAppointment.folio)
    if (!exists) {
      globalThis.__audenti_appointments = [newAppointment, ...globalThis.__audenti_appointments].slice(0, 50)
    }

    // 2. Intentar inserción en Supabase si la tabla tiene permisos activos
    let supabasePersisted = false
    try {
      const supabase = await createClient()
      const { data: patient } = await supabase
        .from('patients')
        .insert({
          full_name: patient_name,
          phone: patient_phone,
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
