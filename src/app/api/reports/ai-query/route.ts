import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersistedAppointments } from '@/lib/supabase/appointments-storage'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Catálogo Oficial de 19 Servicios (Costos 2 - Dra. Aura Estudillo)
const OFFICIAL_CATALOG = [
  { name: 'Consulta Odontológica General', specialty: 'Diagnóstico', unitPrice: 300, category: 'top' },
  { name: 'Profilaxis con Ultrasonido', specialty: 'Prevención', unitPrice: 500, category: 'top' },
  { name: 'Resina Estética Fotocurable', specialty: 'Operatoria', unitPrice: 500, category: 'top' },
  { name: 'Endodoncia Dientes Posteriores', specialty: 'Endodoncia', unitPrice: 1800, category: 'top' },
  { name: 'Endodoncia Dientes Anteriores', specialty: 'Endodoncia', unitPrice: 1200, category: 'medium' },
  { name: 'Extracción Terceros Molares', specialty: 'Cirugía', unitPrice: 1500, category: 'medium' },
  { name: 'Extracción Dental Simple / Compleja', specialty: 'Cirugía', unitPrice: 650, category: 'medium' },
  { name: 'Corona Metal-Porcelana', specialty: 'Prótesis', unitPrice: 1800, category: 'medium' },
  { name: 'Corona de Porcelana Pura', specialty: 'Prótesis', unitPrice: 2500, category: 'medium' },
  { name: 'Dentadura Completa (Prótesis Total)', specialty: 'Prótesis', unitPrice: 5000, category: 'medium' },
  { name: 'Prótesis Parcial Removible', specialty: 'Prótesis', unitPrice: 4000, category: 'medium' },
  { name: 'Guarda Oclusal (Bruxismo)', specialty: 'Férulas', unitPrice: 800, category: 'bottom' },
  { name: 'Blanqueamiento Dental Profesional', specialty: 'Estética', unitPrice: 2000, category: 'bottom' },
  { name: 'Protector Bucal Deportivo', specialty: 'Férulas', unitPrice: 1400, category: 'bottom' },
  { name: 'Profilaxis y Colocación de Flúor (Niños)', specialty: 'Odontopediatría', unitPrice: 300, category: 'bottom' },
  { name: 'Selladores de Fosetas y Fisuras', specialty: 'Odontopediatría', unitPrice: 400, category: 'bottom' },
  { name: 'Resina Infantil', specialty: 'Odontopediatría', unitPrice: 300, category: 'bottom' },
  { name: 'Pulpotomía Infantil', specialty: 'Odontopediatría', unitPrice: 500, category: 'bottom' },
  { name: 'Pulpectomía Infantil', specialty: 'Odontopediatría', unitPrice: 800, category: 'bottom' }
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userPrompt = (body.prompt || '').trim()
    const selectedBranch = body.branch || 'all'

    const admin = createAdminClient()

    // 1. Obtener Pacientes Reales
    let patientsQuery = admin.from('patients').select('*')
    if (selectedBranch !== 'all') {
      const branchNameMatch = selectedBranch.includes('chalma') ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)'
      patientsQuery = patientsQuery.eq('branch_name', branchNameMatch)
    }
    const { data: dbPatients } = await patientsQuery
    const patientList = dbPatients || []

    // 2. Obtener Citas Reales
    const storageAppts = await getPersistedAppointments()
    const { data: dbAppts } = await admin.from('appointments').select('*')
    const combinedAppts: any[] = [...storageAppts]
    if (dbAppts) {
      dbAppts.forEach((da: any) => {
        if (!combinedAppts.some((ca: any) => ca.id === da.id || ca.folio === da.id)) {
          combinedAppts.push({
            id: da.id,
            folio: da.id,
            patient_id: da.patient_id,
            patient_name: 'Paciente Audenti',
            patient_phone: '',
            appointment_date: da.starts_at ? da.starts_at.split('T')[0] : '2026-11-20',
            appointment_time: da.starts_at ? da.starts_at.split('T')[1]?.substring(0, 5) : '12:00',
            treatment: da.notes?.split('•')?.[1]?.trim() || 'Consulta Odontológica',
            branch: da.branch_id === '00000000-0000-0000-0000-000000000002' ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)',
            status: da.status,
            created_at: da.created_at || new Date().toISOString()
          })
        }
      })
    }

    // 3. Obtener Transacciones Reales
    const { data: dbTransactions } = await admin.from('transactions').select('*')
    const txList = dbTransactions || []

    // 4. Mapeo Estadístico de Servicios
    const serviceStats = OFFICIAL_CATALOG.map((cat) => {
      const matches = combinedAppts.filter((a: any) => {
        const t = (a.treatment || a.treatment_type || '').toLowerCase()
        return t.includes(cat.name.toLowerCase().slice(0, 8))
      })
      const count = matches.length
      const revenue = count * cat.unitPrice
      return {
        ...cat,
        count,
        revenue,
        trend: count > 0 ? (count >= 3 ? 'rising' : 'stable') : 'declining'
      }
    })

    // Calcular totales demográficos
    const totalPatients = patientList.length
    const seniors = patientList.filter(p => (p.age && p.age >= 60) || (p.birth_date && new Date().getFullYear() - new Date(p.birth_date).getFullYear() >= 60)).length
    const adults = patientList.filter(p => (!p.age || (p.age >= 18 && p.age < 60))).length
    const children = patientList.filter(p => p.age && p.age < 18).length

    // Contexto compacto para el motor de IA
    const contextData = {
      sucursalFiltro: selectedBranch,
      totalPacientesRegistrados: totalPatients,
      demografia: { adultosMayores: seniors, adultos: adults, ninos: children },
      serviciosMasDemandados: serviceStats.filter(s => s.count > 0).map(s => `${s.name}: ${s.count} citas`),
      serviciosSinCitasOEnBaja: serviceStats.filter(s => s.count === 0).map(s => s.name).slice(0, 8),
      transaccionesCajaTotales: txList.length,
      citasRegistradas: combinedAppts.length
    }

    // 5. Invocación al Motor de Inteligencia Artificial
    let aiResult: any = null

    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const systemPrompt = `Eres AURA IA, la Directora de Inteligencia de Negocios y Estratega de Marketing de la clínica dental de la Dra. Aura Estudillo en Ciudad de México (Sucursales: Balbuena y Chalma de Guadalupe).
Tu objetivo es analizar los datos clínicos de la clínica para:
1. Responder con precisión preguntas tanto lógicas (estadísticas tradicionales) como "ilógicas" o exploratorias (patrones cruzados inusuales, estacionalidad oculta, oportunidades desaprovechadas).
2. Generar el diagnóstico de estacionalidad: qué servicios caen en demanda y qué servicios tienen picos.
3. Generar un Brief Estratégico claro y directo para el PUBLICISTA de la clínica, indicándole qué campaña lanzar, a qué público dirigir los anuncios, y qué oferta o gancho usar.

Responde SIEMPRE en formato JSON válido con la siguiente estructura exacta:
{
  "title": "Título descriptivo del reporte",
  "summary": "Resumen ejecutivo claro de 2-3 oraciones",
  "insights": [
    "Hallazgo 1 sobre estacionalidad o demanda de servicios",
    "Hallazgo 2 sobre comportamiento de pacientes por edad o canal",
    "Hallazgo 3 sobre oportunidad comercial para el publicista"
  ],
  "seasonalityRadar": [
    {
      "name": "Nombre del servicio",
      "specialty": "Especialidad",
      "unitPrice": 500,
      "currentCount": 0,
      "trend": "rising" | "declining" | "stable",
      "seasonalityInsight": "Texto breve de cuándo sube o baja este servicio (ej. Enero-Febrero baja, Julio sube)",
      "marketingPriority": "Alta (Campaña Urgente)" | "Media (Promoción)" | "Baja (Demanda Orgánica)"
    }
  ],
  "customReportTable": {
    "headers": ["Columna 1", "Columna 2", "Columna 3", "Columna 4"],
    "rows": [
      ["Dato 1", "Dato 2", "Dato 3", "Dato 4"]
    ]
  },
  "marketingBrief": {
    "targetServices": ["Servicio 1 a impulsar", "Servicio 2"],
    "problemIdentified": "Diagnóstico de qué cayó en demanda o qué público no está asistiendo",
    "targetAudience": "Público objetivo con edad, zona (Balbuena o Chalma) y necesidad",
    "recommendedAngle": "Ángulo publicitario o copy persuasivo recomendado para anuncios",
    "suggestedOffer": "Gancho comercial o paquete sugerido",
    "recommendedChannels": ["Canal 1", "Canal 2"]
  }
}`

        const userContent = userPrompt
          ? `Pregunta o Petición de Reporte de la Doctora: "${userPrompt}"\n\nDatos Reales de la Clínica:\n${JSON.stringify(contextData, null, 2)}`
          : `Analiza la estacionalidad de los 19 servicios oficiales, detecta cuáles están en baja o en cero para que el publicista cree campañas, y genera un Brief de Marketing completo.\n\nDatos Reales:\n${JSON.stringify(contextData, null, 2)}`

        const completion = await groq.chat.completions.create({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2500
        })

        const rawText = completion.choices[0]?.message?.content
        if (rawText) {
          aiResult = JSON.parse(rawText)
        }
      } catch (aiErr: any) {
        console.warn('Nota invocando IA con Groq, activando fallback analítico determinista:', aiErr?.message)
      }
    }

    // 6. Fallback Analítico Determinista si la IA no estuviese disponible
    if (!aiResult) {
      const declining = serviceStats.filter(s => s.count === 0).slice(0, 5)
      const topServices = serviceStats.filter(s => s.count > 0)

      aiResult = {
        title: userPrompt ? `Reporte Analítico: ${userPrompt}` : 'Diagnóstico de Estacionalidad & Inteligencia Publicitaria 2027',
        summary: `Se analizaron ${serviceStats.length} procedimientos clínicos oficiales en la base de datos de ${selectedBranch === 'all' ? 'ambas sucursales' : selectedBranch}. Se detectaron ${declining.length} servicios prioritarios en valle de demanda para activar pauta comercial.`,
        insights: [
          `Los servicios preventivos y de estética (Limpieza y Blanqueamiento) presentan mayor potencial de reactivación mediante campañas locales con Código QR en Sucursales.`,
          `En el segmento de adultos mayores (${seniors} pacientes registrados), las prótesis y coronas representan el ticket más elevado pero requieren recalls semestrales.`,
          `Los servicios con 0 registros en el periodo actual requieren pauta de rescate con llamados a la acción orientados a prevención antes de dolor agudo.`
        ],
        seasonalityRadar: serviceStats.slice(0, 10).map(s => ({
          name: s.name,
          specialty: s.specialty,
          unitPrice: s.unitPrice,
          currentCount: s.count,
          trend: s.trend,
          seasonalityInsight: s.count === 0 ? 'Valle actual de baja demanda: requiere activación de marketing' : 'Demanda activa y confirmada en agenda',
          marketingPriority: s.count === 0 ? 'Alta (Campaña Urgente)' : 'Media (Fidelización)'
        })),
        customReportTable: {
          headers: ['Procedimiento Odontológico', 'Especialidad', 'Precio Base', 'Volumen Citas', 'Acción Publicitaria Sugerida'],
          rows: serviceStats.slice(0, 8).map(s => [
            s.name,
            s.specialty,
            `$${s.unitPrice.toLocaleString('es-MX')} MXN`,
            `${s.count} pacientes`,
            s.count === 0 ? 'Lanzar campaña de descuento preventivo' : 'Mantener recordatorio por WhatsApp'
          ])
        },
        marketingBrief: {
          targetServices: ['Profilaxis con Ultrasonido', 'Resina Estética Fotocurable', 'Corona Metal-Porcelana'],
          problemIdentified: 'Baja afluencia en procedimientos preventivos y restaurativos iniciales.',
          targetAudience: 'Pacientes de 25 a 55 años en zonas aledañas a Balbuena y Chalma de Guadalupe.',
          recommendedAngle: '¿Sabías que una limpieza a tiempo evita costosas endodoncias? Cuida tu sonrisa hoy.',
          suggestedOffer: 'Valoración clínica + Profilaxis ultrasónica con tarifa especial para familiares recomendados.',
          recommendedChannels: ['Boca en Boca / Referidos', 'Código QR en Volantes y Clínica', 'Recordatorio Vía WhatsApp']
        }
      }
    }

    return NextResponse.json({
      success: true,
      report: aiResult,
      meta: {
        timestamp: new Date().toISOString(),
        branch: selectedBranch,
        totalPatients,
        totalAppointments: combinedAppts.length
      }
    })
  } catch (err: any) {
    console.error('Error generando reporte con IA:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
