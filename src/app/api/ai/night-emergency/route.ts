import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export interface EmergencyCase {
  id: string
  alertType?: 'red_emergency' | 'yellow_appointment' | 'general'
  patientName: string
  phone: string
  painLevel: 'severo' | 'critico' | 'moderado' | 'leve'
  symptoms: string
  timestamp: string
  chatSnippet: string
  status: 'pending' | 'approved_exceptional' | 'scheduled_first_hour' | 'appointment_confirmed' | 'dismissed'
  branchId?: 'balbuena' | 'guadalupe-chalma'
  branchName?: string
  proposedSlot?: {
    date: string
    time: string
    treatment: string
  }
  patientLocation?: {
    lat?: number
    lng?: number
    zone?: string
    distanceKm?: number
    travelMinutes?: number
    targetBranch?: string
  }
  doctorDecision?: string
  doctorNotes?: string
  resolvedAt?: string
}

// Almacén en memoria global para el servidor Next.js
declare global {
  var __audenti_emergency_cases: EmergencyCase[] | undefined
}

if (!globalThis.__audenti_emergency_cases) {
  globalThis.__audenti_emergency_cases = []
}

export async function GET() {
  try {
    const list = globalThis.__audenti_emergency_cases || []
    return NextResponse.json({
      success: true,
      cases: list,
      activeCount: list.filter(c => c.status === 'pending').length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, caseId, decision, doctorNotes } = body

    // 1. Crear nuevo reporte de emergencia nocturna (escalamiento)
    if (action === 'report') {
      const { patientName, phone, painLevel, symptoms, chatSnippet, patientLocation } = body

      const newCase: EmergencyCase = {
        id: `EMG-${Date.now().toString().slice(-6)}`,
        patientName: patientName || 'Paciente Nocturno Anónimo',
        phone: phone || 'No proporcionado',
        painLevel: painLevel || 'severo',
        symptoms: symptoms || 'Dolor dental agudo / Urgencia nocturna',
        timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        chatSnippet: chatSnippet || 'El paciente reportó dolor agudo en horario nocturno.',
        status: 'pending',
        patientLocation: patientLocation || undefined
      }

      globalThis.__audenti_emergency_cases = [newCase, ...(globalThis.__audenti_emergency_cases || [])].slice(0, 30)

      // Guardar también en notificaciones in-app de Supabase si la tabla existe
      try {
        const supabase = await createClient()
        const { data: director } = await supabase.from('users').select('id, tenant_id').limit(1).maybeSingle()
        if (director) {
          const locText = patientLocation?.distanceKm
            ? ` • Distancia: ${patientLocation.distanceKm} km (~${patientLocation.travelMinutes} min a ${patientLocation.targetBranch || 'Balbuena'})`
            : ''

          await supabase.from('in_app_notifications').insert({
            tenant_id: director.tenant_id,
            user_id: director.id,
            type: 'emergency',
            title: `🔴 ALERTA ROJA: Urgencia Dental Nocturna (${newCase.painLevel.toUpperCase()})`,
            message: `${newCase.patientName}: ${newCase.symptoms} • Tel: ${newCase.phone}${locText}`,
            data: newCase,
            is_read: false
          })
        }
      } catch (err) {
        console.warn('Nota en guardado de notificación Supabase (usando in-memory fallback):', err)
      }

      return NextResponse.json({
        success: true,
        emergencyCase: newCase,
        message: 'Alerta Roja escalada con éxito a la Dra. Aura Estudillo'
      })
    }

    // 2. Decisión remota de la Doctora (Aprobar atención excepcional, derivar a 1ª hora o Aprobar Cita)
    if (action === 'decide') {
      const list = globalThis.__audenti_emergency_cases || []
      const found = list.find(c => c.id === caseId)

      if (!found) {
        return NextResponse.json({ success: false, error: 'Caso de emergencia no encontrado' }, { status: 404 })
      }

      if (decision === 'confirm_appointment') {
        const chosenSlot = body.slot || found.proposedSlot || {
          date: 'Mañana',
          time: '11:00 AM',
          treatment: 'Valoración Diagnóstica / Diseño de Sonrisa'
        }
        const chosenBranch = body.branchName || found.branchName || 'Sede Balbuena'

        found.status = 'appointment_confirmed'
        found.doctorDecision = 'confirm_appointment'
        found.doctorNotes = `¡Hola! La Dra. Aura Estudillo ha revisado tu caso. Tu cita ha quedado confirmada para el día ${chosenSlot.date} a las ${chosenSlot.time} en la ${chosenBranch}. Te esperamos con gusto en Audenti.`
        found.resolvedAt = new Date().toISOString()

        // Guardar también en el registro persistente de citas de Audenti
        const persistentAppt = {
          id: `APT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          folio: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
          patient_name: found.patientName.replace('[Desconocido] ', ''),
          patient_phone: found.phone.replace('[Desconocido] ', ''),
          appointment_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
          appointment_time: '11:00:00',
          treatment: chosenSlot.treatment || 'Valoración Diagnóstica / Diseño de Sonrisa',
          branch: chosenBranch,
          status: 'confirmed' as const,
          notes: `Confirmado por Dra. Aura Estudillo en panel. Folio generado.`,
          created_at: new Date().toISOString()
        }

        if (!globalThis.__audenti_appointments) {
          globalThis.__audenti_appointments = []
        }
        globalThis.__audenti_appointments = [persistentAppt, ...globalThis.__audenti_appointments].slice(0, 50)

        // Guardar cita oficial en Supabase si está disponible
        try {
          const supabase = await createClient()
          const { data: patient } = await supabase
            .from('patients')
            .upsert({
              full_name: found.patientName.replace('[Desconocido] ', ''),
              phone: found.phone.replace('[Desconocido] ', ''),
              notes: `Agendado automáticamente por Aura AI tras aprobación de Dra. Aura: ${found.symptoms}`
            }, { onConflict: 'phone' })
            .select('id')
            .maybeSingle()

          if (patient) {
            await supabase.from('appointments').insert({
              patient_id: patient.id,
              treatment_type: chosenSlot.treatment,
              status: 'confirmed',
              notes: `Sede: ${chosenBranch}. Confirmado por Dra. Aura Estudillo.`
            })
          }
        } catch (dbErr) {
          console.warn('Persistencia opcional en appointments Supabase:', dbErr)
        }

        return NextResponse.json({
          success: true,
          updatedCase: found,
          officialMessageToPatient: found.doctorNotes
        })
      }

      found.status = decision === 'approved_exceptional' ? 'approved_exceptional' : 'scheduled_first_hour'
      found.doctorDecision = decision
      found.doctorNotes = doctorNotes || (decision === 'approved_exceptional'
        ? 'Dra. Aura Estudillo ha aprobado la apertura extraordinaria del consultorio para atender la urgencia inmediata.'
        : 'Dra. Aura Estudillo ha priorizado su turno como el Primer Paciente de las 08:30 AM garantizando gabinete disponible.')
      found.resolvedAt = new Date().toISOString()

      return NextResponse.json({
        success: true,
        updatedCase: found,
        officialMessageToPatient: found.doctorNotes
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('Error en /api/ai/night-emergency:', error)
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
