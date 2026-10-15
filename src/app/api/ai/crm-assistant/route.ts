import { NextResponse } from 'next/server'
import { getGroqClient } from '@/lib/groq'

export const runtime = 'nodejs'

interface CrmAssistantRequest {
  action?: 'followup' | 'budget_reminder' | 'triage_urgency' | 'custom'
  patientName?: string
  stage?: string
  treatment?: string
  lastVisit?: string
  notes?: string
  customPrompt?: string
}

export async function POST(request: Request) {
  try {
    const body: CrmAssistantRequest = await request.json()
    const {
      action = 'followup',
      patientName = 'Paciente',
      stage = 'contacto_inicial',
      treatment = 'Consulta General',
      lastVisit,
      notes,
      customPrompt,
    } = body

    const systemPrompt = `Eres el Asistente Clínico Inteligente de "Audenti — DentalCloud Pro" para el consultorio de la Dra. Aura Estudillo (Cédula Profesional 8492019).
Tu propósito es generar comunicaciones odontológicas altamente profesionales, cálidas, empáticas y orientadas a la conversión y fidelización del paciente.

Debes responder SIEMPRE en formato JSON válido con la siguiente estructura exacta:
{
  "message": "Texto completo y redactado listo para enviar por WhatsApp o correo al paciente",
  "subject": "Título breve o asunto sugerido",
  "urgency": "baja" | "media" | "alta",
  "recommendedAction": "Acción recomendada para el personal de recepción (ej: agendar valoración, enviar presupuesto, llamada de seguimiento)",
  "tokensUsed": "aproximado"
}

Reglas estrictas:
1. No inventes diagnósticos médicos invasivos.
2. Menciona a la Dra. Aura Estudillo de forma cordial y respetuosa.
3. El tono debe ser humano, confiable y enfocado en el bienestar dental del paciente.
4. Genera únicamente el JSON sin markdown adicional alrededor (o con json codeblocks estándar).`

    const userPrompt = customPrompt || `
Acción solicitada: ${action}
Nombre del Paciente: ${patientName}
Etapa actual en el embudo CRM: ${stage}
Tratamiento o motivo de interés: ${treatment}
Última visita registrada: ${lastVisit || 'Sin registro previo'}
Notas o contexto clínico: ${notes || 'Ninguna observación especial'}

Por favor genera el mensaje de seguimiento óptimo para este paciente.`

    let jsonResponse = null
    let fallbackUsed = false

    try {
      const groq = getGroqClient()
      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 450,
      })

      const rawContent = completion.choices[0]?.message?.content
      if (rawContent) {
        jsonResponse = JSON.parse(rawContent)
      }
    } catch (groqError: any) {
      console.warn('Groq API call warning or key missing, applying professional dental fallback:', groqError?.message)
      fallbackUsed = true
    }

    // Fallback estructurado de alta calidad si no hay clave API configurada aún
    if (!jsonResponse) {
      const fallbackMessages: Record<string, any> = {
        followup: {
          message: `Hola ${patientName}, esperamos que te encuentres muy bien. Te saludamos del consultorio dental de la Dra. Aura Estudillo (Audenti). Queremos dar seguimiento a tu atención para ${treatment}. Contamos con espacios disponibles esta semana para tu valoración. ¿Te gustaría agendar en un horario matutino o vespertino?`,
          subject: `Seguimiento de Consulta — Dra. Aura Estudillo`,
          urgency: 'media',
          recommendedAction: 'Enviar por WhatsApp y ofrecer 2 horarios concretos',
        },
        budget_reminder: {
          message: `Estimado/a ${patientName}, te saluda el equipo de la Dra. Aura Estudillo de Audenti. Te contactamos para saber si tuviste oportunidad de revisar la propuesta de tratamiento para ${treatment}. Con gusto podemos resolver cualquier duda sobre el plan de pagos o citas disponibles.`,
          subject: `Plan de Tratamiento — Dra. Aura Estudillo`,
          urgency: 'baja',
          recommendedAction: 'Ofrecer facilidades de pago o cita de dudas sin costo',
        },
        triage_urgency: {
          message: `Estimado/a ${patientName}, la Dra. Aura Estudillo ha priorizado tu atención odontológica para ${treatment}. Por favor infórmanos si presentas molestias agudas para habilitar un espacio de urgencia hoy mismo.`,
          subject: `Prioridad de Atención Dental — Audenti`,
          urgency: 'alta',
          recommendedAction: 'Llamar directamente por teléfono para valorar dolor o inflamación',
        },
      }

      const selectedFallback = fallbackMessages[action] || fallbackMessages.followup
      jsonResponse = {
        ...selectedFallback,
        tokensUsed: 'fallback_mode',
      }
    }

    return NextResponse.json({
      success: true,
      data: jsonResponse,
      provider: fallbackUsed ? 'audenti_clinical_fallback' : 'groq_llama-3.3-70b-versatile',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error en /api/ai/crm-assistant:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al procesar solicitud con Groq' },
      { status: 500 }
    )
  }
}
