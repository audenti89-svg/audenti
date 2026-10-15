import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export interface EmergencyCase {
  id: string
  patientName: string
  phone: string
  painLevel: 'severo' | 'critico' | 'moderado'
  symptoms: string
  timestamp: string
  chatSnippet: string
  status: 'pending' | 'approved_exceptional' | 'scheduled_first_hour' | 'dismissed'
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
      const { patientName, phone, painLevel, symptoms, chatSnippet } = body

      const newCase: EmergencyCase = {
        id: `EMG-${Date.now().toString().slice(-6)}`,
        patientName: patientName || 'Paciente Nocturno Anónimo',
        phone: phone || 'No proporcionado',
        painLevel: painLevel || 'severo',
        symptoms: symptoms || 'Dolor dental agudo / Urgencia nocturna',
        timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        chatSnippet: chatSnippet || 'El paciente reportó dolor agudo en horario nocturno.',
        status: 'pending'
      }

      globalThis.__audenti_emergency_cases = [newCase, ...(globalThis.__audenti_emergency_cases || [])].slice(0, 30)

      // Guardar también en notificaciones in-app de Supabase si la tabla existe
      try {
        const supabase = await createClient()
        const { data: director } = await supabase.from('users').select('id, tenant_id').limit(1).maybeSingle()
        if (director) {
          await supabase.from('in_app_notifications').insert({
            tenant_id: director.tenant_id,
            user_id: director.id,
            type: 'emergency',
            title: `🔴 ALERTA ROJA: Urgencia Dental Nocturna (${newCase.painLevel.toUpperCase()})`,
            message: `${newCase.patientName}: ${newCase.symptoms} • Tel: ${newCase.phone}`,
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

    // 2. Decisión remota de la Doctora (Aprobar atención excepcional o derivar con prioridad)
    if (action === 'decide') {
      const list = globalThis.__audenti_emergency_cases || []
      const found = list.find(c => c.id === caseId)

      if (!found) {
        return NextResponse.json({ success: false, error: 'Caso de emergencia no encontrado' }, { status: 404 })
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
