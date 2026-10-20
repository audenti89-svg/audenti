import { NextResponse } from 'next/server'
import { inspectRequestSecurity } from '@/lib/security/ai-sentinel'

export const runtime = 'nodejs'

/**
 * Conector Oficial de Ollama AI Local / Cloud (Audenti CRM)
 * Endpoint por defecto: http://localhost:11434 (o OLLAMA_BASE_URL)
 * Soporta endpoints nativos:
 *  - POST /api/generate (con prompt y systemPrompt)
 *  - POST /api/chat (con messages/history)
 * Soporta autenticación por Bearer Token (OLLAMA_API_KEY).
 */
export async function POST(req: Request) {
  const startTime = Date.now()
  try {
    const body = await req.json()
    const {
      prompt,
      systemPrompt,
      model = 'llama3',
      temperature = 0.3,
      stream = false,
      history = [],
      domain = 'clinical',
      format = ''
    } = body

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Falta parámetro obligatorio: prompt.' },
        { status: 400 }
      )
    }

    // 🛡️ Inspección de Bioseguridad e Inyección de Prompts
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'localhost'
    const securityCheck = await inspectRequestSecurity({
      prompt: String(prompt),
      identifier: clientIp,
      domain: (domain as any) || 'clinical',
      metadata: { provider: 'ollama', model }
    })

    if (!securityCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          error: securityCheck.reason || 'Petición bloqueada por políticas de bioseguridad del sistema.',
          threatType: securityCheck.threatType
        },
        { status: 403 }
      )
    }

    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434'
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '3da15b5f10f74515af889f550d63d947.Ug_qwkUIFI_1r4gond_4IY-T'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (OLLAMA_API_KEY) {
      headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`
    }

    // Si viene historial de conversación, usamos el endpoint /api/chat; si no, el endpoint directo /api/generate
    if (Array.isArray(history) && history.length > 0) {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      } else {
        messages.push({
          role: 'system',
          content: 'Eres el motor de Inteligencia Artificial Clínica Local de Audenti Odontología, asistiendo a la Dra. Aura Estudillo en diagnóstico, triaje y redacción médica.'
        })
      }

      for (const h of history) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content)
        })
      }
      messages.push({ role: 'user', content: prompt })

      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            options: { temperature },
            ...(format === 'json' ? { format: 'json' } : {})
          }),
          signal: AbortSignal.timeout(60000)
        })

        if (!response.ok) {
          const errText = await response.text().catch(() => '')
          return NextResponse.json({
            success: false,
            error: `Ollama respondió status ${response.status}: ${errText}`
          }, { status: response.status })
        }

        const data = await response.json()
        const reply = data.message?.content || data.response || ''

        return NextResponse.json({
          success: true,
          response: reply,
          result: reply,
          content: reply,
          model: data.model || model,
          executionTimeMs: Date.now() - startTime
        })
      } catch (err: any) {
        console.warn(`[Ollama Chat Error]:`, err.message)
        return NextResponse.json({
          success: false,
          error: `Error al conectar con Ollama local (${OLLAMA_BASE_URL}): ${err.message}`
        }, { status: 500 })
      }
    }

    // Petición directa al endpoint /api/generate de Ollama
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          prompt,
          system: systemPrompt || 'Eres el motor de Inteligencia Artificial Clínica Local de Audenti Odontología para la Dra. Aura Estudillo.',
          stream: false,
          options: { temperature },
          ...(format === 'json' ? { format: 'json' } : {})
        }),
        signal: AbortSignal.timeout(60000)
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        return NextResponse.json({
          success: false,
          error: `Ollama respondió con error status ${response.status}: ${errText}`
        }, { status: response.status })
      }

      const data = await response.json()
      return NextResponse.json({
        success: true,
        response: data.response || data.message?.content || '',
        result: data.response || data.message?.content || '',
        content: data.response || data.message?.content || '',
        model: data.model || model,
        executionTimeMs: Date.now() - startTime
      })
    } catch (err: any) {
      console.warn(`[Ollama Generate Error]:`, err.message)
      return NextResponse.json({
        success: false,
        error: `Error al conectar con Ollama local en ${OLLAMA_BASE_URL}`
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al conectar con Ollama local'
    }, { status: 500 })
  }
}

/**
 * GET: Verificación de estado del servidor Ollama
 */
export async function GET() {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434'
  const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '3da15b5f10f74515af889f550d63d947.Ug_qwkUIFI_1r4gond_4IY-T'

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: OLLAMA_API_KEY ? { 'Authorization': `Bearer ${OLLAMA_API_KEY}` } : {},
      signal: AbortSignal.timeout(4000)
    })

    if (!res.ok) {
      return NextResponse.json({
        online: false,
        host: OLLAMA_BASE_URL,
        message: `Ollama respondió con status ${res.status}`
      })
    }

    const data = await res.json()
    return NextResponse.json({
      online: true,
      host: OLLAMA_BASE_URL,
      models: data.models || [],
      recommendedModels: ['llama3', 'gemma4:12b', 'mistral', 'phi3']
    })
  } catch (err: any) {
    return NextResponse.json({
      online: false,
      host: OLLAMA_BASE_URL,
      message: `Ollama local offline o no disponible en ${OLLAMA_BASE_URL}`
    })
  }
}
