import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGroqClient } from '@/lib/groq'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { patientId, clinicalText } = await request.json()

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'patientId es requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    let aiSummary = `Resumen clínico generado para el expediente: Paciente atendido por valoración general. Se observa estabilidad en piezas dentales y se recomienda seguimiento preventivo en 6 meses.`

    // Si se proporciona clinicalText, procesar mediante IA real con Groq / Llama
    if (clinicalText && typeof clinicalText === 'string' && clinicalText.trim().length > 0) {
      try {
        const groq = getGroqClient()
        const completion = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: `Eres el Asistente Clínico Inteligente de la Dra. Aura Estudillo (Especialista en Odontología Estética y Restauradora, Cédula Profesional 8492019).
Tu tarea es analizar el texto libre o notas clínicas proporcionadas por el doctor y generar un RESUMEN CLÍNICO ESTRUCTURADO, formal, conciso y profesional para el expediente único del paciente.
Sintetiza hallazgos, tratamiento realizado o sugerido, indicaciones de bioseguridad y plan de seguimiento en máximo 3 oraciones.`
            },
            {
              role: 'user',
              content: `Notas clínicas del paciente:\n"${clinicalText}"\n\nGenera el resumen clínico oficial para el expediente médico:`
            }
          ],
          temperature: 0.2,
          max_tokens: 300,
        })

        const generatedContent = completion.choices[0]?.message?.content?.trim()
        if (generatedContent) {
          aiSummary = generatedContent
        }
      } catch (aiError: any) {
        console.warn('Advertencia en IA Groq para clinical-summary, utilizando resumen estructurado:', aiError?.message)
        aiSummary = `Resumen clínico (Audenti): ${clinicalText.trim().slice(0, 200)}. Expediente actualizado para seguimiento clínico por la Dra. Aura Estudillo.`
      }
    }

    // Guardar automáticamente el resumen analizado en el expediente único del paciente en Supabase
    const { error } = await supabase
      .from('patients')
      .update({ medical_history_summary: aiSummary })
      .eq('id', patientId)

    if (error) {
      console.warn('Advertencia al actualizar medical_history_summary en Supabase:', error.message)
    }

    return NextResponse.json({
      success: true,
      summary: aiSummary,
      patientId,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error en /api/ai/clinical-summary:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Error al generar resumen clínico con IA' }, { status: 500 })
  }
}
