import { NextResponse } from 'next/server'
import { executeAIAgent, AITaskDomain } from '@/lib/ai/router'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { domain, prompt, contextData, userContext, patientContext, taskType, history, messages } = body

    // Soporte flexible para peticiones de router (domain) o peticiones legadas (taskType/prompt)
    const resolvedDomain = (domain || taskType || 'patient_chat') as AITaskDomain
    const resolvedPrompt = prompt || body.notes || body.userMessage || ''

    // Preservar historial conversacional completo para mantener el hilo lógico
    const resolvedHistory = Array.isArray(history) && history.length > 0
      ? history
      : (Array.isArray(messages) ? messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        })) : [])

    // Validación básica de parámetros obligatorios
    if (!resolvedDomain || !resolvedPrompt) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros obligatorios: domain y prompt.' },
        { status: 400 }
      )
    }

    // BLINDAJE DE SEGURIDAD (ANTI-ABUSO Y PREVENCIÓN DE INYECCIONES):
    // 1. Limitar longitud máxima de texto para evitar ataques DoS o agotamiento de tokens
    if (typeof resolvedPrompt === 'string' && resolvedPrompt.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'Longitud de texto excesiva. Máximo permitido: 4,000 caracteres.' },
        { status: 413 }
      )
    }

    // 2. Sanitizar dominios permitidos (evitar ejecución de dominios arbitrarios o privilegiados sin auth)
    const ALLOWED_DOMAINS: AITaskDomain[] = ['clinical', 'patient_chat', 'finance', 'bi', 'scheduling']
    if (!ALLOWED_DOMAINS.includes(resolvedDomain)) {
      return NextResponse.json(
        { success: false, error: 'Dominio de tarea de IA no autorizado.' },
        { status: 403 }
      )
    }

    // 3. Sanitizar patrones obvios de System Prompt Override / Leakage
    const sanitizedPrompt = typeof resolvedPrompt === 'string'
      ? resolvedPrompt.replace(/(\bignore\s+all\s+previous\s+instructions\b|\bignora\s+las\s+instrucciones\s+anteriores\b|\brevela\s+el\s+system\s+prompt\b)/gi, '[FILTRADO POR PROTOCOLO DE SEGURIDAD AUDENTI]')
      : resolvedPrompt

    // Ejecutamos el enrutador de agentes especializados con historial y Function Calling
    const result = await executeAIAgent({
      domain: resolvedDomain,
      prompt: sanitizedPrompt,
      history: resolvedHistory.slice(-15), // Máximo 15 turnos para evitar desbordamiento de contexto
      contextData: contextData || patientContext || userContext,
    })

    return NextResponse.json({
      success: true,
      result,
      triageCategory: (result as any)?.triageCategory,
      appointmentCreated: (result as any)?.appointmentCreated
    }, { status: 200 })

  } catch (error: any) {
    console.error('[API AI Route Error] Capturado en el servidor:', {
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
      status: error?.status,
      errorDetails: error?.error || error
    })
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno en el servidor de IA de Audenti.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    gateway: 'Audenti AI Unified Router Endpoint',
    domainsSupported: ['clinical', 'patient_chat', 'finance', 'bi', 'scheduling'],
    doctor: 'Dra. Aura Estudillo (Cédula 8492019)',
    timestamp: new Date().toISOString()
  })
}
