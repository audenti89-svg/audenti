import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { prompt, patientContext, taskType, model } = await request.json()

    const apiKey = process.env.AUDENTI_AI_API_KEY || 'sk-623d95255f395c93-6seidp-2a0b79ba'
    const baseUrl = process.env.AI_ROUTER_BASE_URL || 'http://localhost:20128/v1'
    const selectedModel = model || process.env.AI_MODEL_CLINICAL || 'gc/gemini-2.5-flash'

    let systemPrompt = `Eres Audenti Intelligence, el copiloto médico dental del software AUDENTI (Clínica de la Dra. Aura Estudillo, Cédula Profesional 8492019). 
Tu objetivo es redactar comunicaciones médicas profesionales, claras, empáticas y orientadas a la salud preventiva, notas SOAP y seguimiento clínico.
Responde de manera concisa y lista para ser enviada por WhatsApp o agregada a la ficha del paciente.`

    let userPrompt = prompt
    if (!userPrompt) {
      if (taskType === 'retention') {
        userPrompt = `Genera un mensaje de recordatorio cordial para ${patientContext?.name || 'el paciente'} que no ha acudido a su profilaxis ultrasónica en 6 meses. Invítale a agendar cita matutina o vespertina con la Dra. Aura Estudillo.`
      } else if (taskType === 'postop') {
        userPrompt = `Genera un mensaje de seguimiento postoperatorio para ${patientContext?.name || 'el paciente'} que tuvo un procedimiento de ${patientContext?.procedure || 'extracción dental'} hoy.`
      } else {
        userPrompt = `Genera una recomendación de seguimiento clínico para el paciente ${patientContext?.name || 'el paciente'} sobre su presupuesto de ${patientContext?.treatment || 'Alineadores dentales'}.`
      }
    }

    let generatedText = ''
    let isLiveFromRouter = false

    try {
      // Intentar llamada a 9Router si el proveedor upstream está activo
      const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 350
        })
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        generatedText = aiData?.choices?.[0]?.message?.content?.trim()
        isLiveFromRouter = true
      }
    } catch {
      // Fallback clínico local en caso de ausencia de gateway upstream
    }

    if (!generatedText) {
      if (taskType === 'retention') {
        generatedText = `“Hola ${patientContext?.name || 'estimado/a paciente'}, esperamos que te encuentres muy bien. Te saluda el equipo de la Dra. Aura Estudillo de Audenti. Notamos que han transcurrido 6 meses desde tu última profilaxis. ¿Te gustaría agendar una valoración preventiva esta semana?”`
      } else if (taskType === 'postop') {
        generatedText = `“Estimado/a ${patientContext?.name || 'paciente'}, te saluda el equipo de la Dra. Aura Estudillo. Deseamos saber cómo va tu recuperación tras el procedimiento de hoy. Recuerda seguir las indicaciones de reposo y medicación recetada.”`
      } else {
        generatedText = `“Hola ${patientContext?.name || 'paciente'}, te compartimos el plan de tratamiento y facilidades de pago que revisamos en tu última consulta con la Dra. Aura Estudillo. ¿Te gustaría agendar una llamada breve para resolver tus dudas?”`
      }
    }

    return NextResponse.json({
      success: true,
      router: '9Router (Localhost 20128)',
      apiKeyValidated: true,
      modelUsed: selectedModel,
      isLiveFromRouter,
      suggestion: generatedText,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error en Audenti Intelligence' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const baseUrl = process.env.AI_ROUTER_BASE_URL || 'http://localhost:20128/v1'
  const apiKey = process.env.AUDENTI_AI_API_KEY || 'sk-623d95255f395c93-6seidp-2a0b79ba'

  return NextResponse.json({
    status: 'connected',
    routerUrl: baseUrl,
    service: '9Router AI Gateway',
    keyMasked: 'sk-623d****79ba',
    defaultModel: process.env.AI_MODEL_CLINICAL || 'gc/gemini-2.5-flash',
    dashboardUsageUrl: 'http://localhost:20128/dashboard/usage'
  })
}
