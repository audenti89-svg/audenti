import { NextResponse } from 'next/server'
import { getGroqClient } from '@/lib/groq'

export const runtime = 'nodejs'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const PUBLIC_SYSTEM_PROMPT = `Eres "Audenti Concierge AI", el asistente inteligente y especialista de atención al paciente de la clínica dental de alta gama "Audenti — DentalCloud Pro", dirigida por la Dra. Aura Estudillo (Directora Médica & Especialista en Estética Oral, Cédula Profesional 8492019).

TU MISIÓN:
1. Responder con calidez, empatía, elegancia y rigor médico las dudas de los pacientes sobre:
   - Diseño de Sonrisa Digital (DSD) y carillas de porcelana E.Max / disilicato de litio.
   - Blanqueamiento Dental LED y fotoactivación que preserva el esmalte.
   - Ortodoncia invisible con alineadores transparentes de última generación.
   - Implantes dentales de titanio biocompatible y rehabilitación oral.
   - Limpieza dental profunda (profilaxis ultrasónica indolora).
2. ORIENTACIÓN A LA CONVERSIÓN: En cada respuesta, invita de forma natural y elegante al paciente a agendar una cita o valoración personalizada con la Dra. Aura Estudillo usando el botón de "Agendar Cita" o el formulario de la página.
3. RESTRICCIÓN: Responde exclusivamente sobre salud bucodental, tratamientos de Audenti y citas. No des diagnósticos definitivos ni recetas médicas; siempre aclara que se requiere una valoración clínica presencial. Responde de forma concisa (máximo 2 a 3 párrafos cortos).`

export async function POST(request: Request) {
  try {
    const { messages, userMessage } = await request.json()

    const conversation: ChatMessage[] = [
      { role: 'system', content: PUBLIC_SYSTEM_PROMPT }
    ]

    if (Array.isArray(messages) && messages.length > 0) {
      messages.forEach((m: any) => {
        if (m.role === 'user' || m.role === 'assistant') {
          conversation.push({ role: m.role, content: m.content })
        }
      })
    } else if (userMessage) {
      conversation.push({ role: 'user', content: userMessage })
    } else {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    let reply = ''
    try {
      const groq = getGroqClient()
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Ultra baja latencia para chat público
        messages: conversation,
        temperature: 0.4,
        max_tokens: 400,
      })
      reply = completion.choices[0]?.message?.content || ''
    } catch (err: any) {
      console.warn('Groq fast chat fallback:', err?.message)
      reply = '¡Hola! Con gusto puedo orientarte sobre los tratamientos de estética dental, carillas y blanqueamiento LED de la Dra. Aura Estudillo. ¿Te gustaría agendar una valoración presencial en nuestra clínica para revisar tu caso a detalle?'
    }

    return NextResponse.json({
      success: true,
      reply,
      doctor: 'Dra. Aura Estudillo (Céd. 8492019)',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error en Asistente Público Audenti' },
      { status: 500 }
    )
  }
}
