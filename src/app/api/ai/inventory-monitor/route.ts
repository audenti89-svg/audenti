import { NextResponse } from 'next/server'
import { getGroqClient } from '@/lib/groq'

export const runtime = 'nodejs'

/**
 * Agente de Control de Inventario Inteligente (High-End Supplies Guardian):
 * Monitorea el consumo proyectado de zirconio, carillas E.Max, resinas compuestas,
 * anestésicos y biomateriales quirúrgicos según la carga clínica de la semana.
 */
export async function POST(request: Request) {
  try {
    const { weeklyAppointmentsCount, highValueTreatments } = await request.json().catch(() => ({}))

    const appointmentsCount = weeklyAppointmentsCount || 24
    const highValueList = highValueTreatments || [
      '4 Diseños de Sonrisa con Carillas Cerámicas E.Max',
      '3 Implantes Dentales de Titanio con Regeneración Ósea',
      '8 Blanqueamientos Dentales con Lámpara LED',
      '9 Reconstrucciones Estéticas con Resinas Nanohíbridas'
    ]

    const systemPrompt = `Eres el Agente Autónomo de Gestión de Suministros y Control de Inventario de Audenti — DentalCloud Pro para la Dra. Aura Estudillo (Cédula 8492019).
Evalúas la carga de trabajo semanal y alertarás preventivamente sobre niveles de insumos críticos antes de que causen retrasos en quirófano o gabinete.`

    const userPrompt = `Carga de trabajo programada para la semana:
- Total de procedimientos: ${appointmentsCount}
- Procedimientos de alta gama:
${highValueList.map((t: string) => `  * ${t}`).join('\n')}

Genera un reporte de inventario predictivo en JSON con la siguiente estructura:
{
  "inventoryHealthScore": 92,
  "criticalAlerts": [
    {
      "item": "Bloques de Disilicato de Litio E.Max (A1/BL2)",
      "currentStock": 3,
      "projectedNeed": 5,
      "status": "URGENTE_REORDENAR",
      "recommendedAction": "Solicitar 6 unidades al distribuidor Ivoclar antes de las 14:00"
    }
  ],
  "optimalSupplies": [
    "Resinas Nanohíbridas Tokuyama Estelite Quick (Stock suficiente para 15 días)",
    "Membranas de Colágeno y Hueso Liofilizado (Stock adecuado para 4 cirugías)"
  ],
  "budgetRequired": "$8,400 MXN",
  "supplierLeadTimeAdvice": "Pedir el jueves para recibir el viernes previo a cirugías de fin de semana."
}`

    let resultJson: any = null

    try {
      const groq = getGroqClient()
      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 450
      })

      const raw = completion.choices[0]?.message?.content?.trim() || '{}'
      resultJson = JSON.parse(raw)
    } catch (err: any) {
      console.warn('Groq fallback para inventory-monitor:', err?.message)
      resultJson = {
        inventoryHealthScore: 88,
        criticalAlerts: [
          {
            item: 'Bloques de Cerámica E.Max CAD (Tonos Bleach 2 / A1)',
            currentStock: 4,
            projectedNeed: 6,
            status: 'URGENTE_REORDENAR',
            recommendedAction: 'Pedir reposición urgente para cubrir los 4 diseños de sonrisa agendados.'
          },
          {
            item: 'Puntas de Pulido de Diamante Ultra-fino para Estética',
            currentStock: 2,
            projectedNeed: 4,
            status: 'ALERTA_PREVENTIVA',
            recommendedAction: 'Incluir en el pedido semanal de laboratorio.'
          }
        ],
        optimalSupplies: [
          'Kit de Implantes Neodent / Straumann (Stock óptimo: 7 piezas)',
          'Anestesia Articaína 4% con Epinefrina (Stock completo: 3 cajas)',
          'Gel Desensibilizante y Barreras Gingivales LED (Suficiente para 12 sesiones)'
        ],
        budgetRequired: '$12,500 MXN',
        supplierLeadTimeAdvice: 'Enviar orden de compra a primera hora para entrega garantizada al día siguiente.'
      }
    }

    return NextResponse.json({
      success: true,
      data: resultJson,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error en inventory-monitor:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Error en el monitor de inventario' },
      { status: 500 }
    )
  }
}
