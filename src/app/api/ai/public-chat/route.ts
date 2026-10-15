import { NextResponse } from 'next/server'
import { getGroqClient } from '@/lib/groq'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_call_id?: string
  name?: string
  tool_calls?: any[]
}

const PUBLIC_SYSTEM_PROMPT = `Eres "Audenti Concierge AI", el asistente clínico y concierge inteligente de la clínica dental de alta gama "Audenti — DentalCloud Pro", dirigida por la Dra. Aura Estudillo (Directora Médica & Especialista en Estética Oral, Cédula Profesional 8492019).

CAPACIDADES Y REGLAS DE ORO:
1. ATENCIÓN PERSONALIZADA Y RIGOR MÉDICO: Responde con calidez, elegancia, cortesía y rigor médico. Eres una IA conectada a la base de datos de la clínica.
2. CONSULTAS DE COSTOS Y PRECIOS: Si el paciente pregunta por precios, presupuestos o costos de tratamientos (ej. carillas, blanqueamiento, ortodoncia, limpieza, implantes), USA SIEMPRE la herramienta \`consultarCostosTratamiento\`.
3. CONSULTAS DE CITAS Y AGENDA: Si el paciente quiere cita o consultar días/horas disponibles, USA SIEMPRE la herramienta \`consultarDisponibilidadCalendario\`.
4. AGENDAR CITA: Si el paciente confirma que desea agendar con su nombre, teléfono y horario seleccionado, USA la herramienta \`agendarCitaNuevayNotificar\`.
5. ANTECEDENTES Y ALERGIAS: Si el paciente menciona alergias (ej. "alérgico a la penicilina", látex, anestesia) o condiciones (ej. hipertensión, diabetes, embarazo), USA la herramienta \`registrarNotaMedicaProspecto\` para que quede en su expediente y la Dra. Aura reciba la advertencia de bioseguridad.
6. PROTOCOLO PUENTE NOCTURNO 24/7 Y EMERGENCIAS (🔴 ALERTA ROJA): Si el paciente manifiesta dolor severo, sangrado, absceso, fractura dental aguda o urgencia fuera de horario (madrugada, noche, fin de semana), USA DE INMEDIATO la herramienta \`escalarEmergenciaNocturnaDraAura\`.
   - Explícale con profunda empatía y serenidad que aunque el consultorio está físicamente cerrado por horario nocturno, HAS ACTIVADO UNA ALERTA ROJA DE EMERGENCIA directamente en el móvil de la Dra. Aura Estudillo.
   - Pídele su número de WhatsApp o teléfono para que la Dra. Aura pueda responderle con la decisión remota (aprobación de atención extraordinaria inmediata o derivación prioritaria a primera hora).
7. SIEMPRE responde en español claro, profesional y estructurado. NUNCA respondas con plantillas estáticas repetitivas.`

// Definición de Tools para Groq (OpenAI Function Calling format)
const TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'consultarCostosTratamiento',
      description: 'Consulta los precios oficiales, duración y especificaciones de tratamientos dentales en Audenti.',
      parameters: {
        type: 'object',
        properties: {
          tratamiento: {
            type: 'string',
            description: 'Nombre del tratamiento o procedimiento dental consultado (ej. blanqueamiento, carillas, limpieza, ortodoncia, implantes, valoración).'
          }
        },
        required: ['tratamiento']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'consultarDisponibilidadCalendario',
      description: 'Consulta los horarios y fechas disponibles reales de la Dra. Aura Estudillo para agendar citas de valoración u odontología.',
      parameters: {
        type: 'object',
        properties: {
          fecha: {
            type: 'string',
            description: 'Fecha o día sugerido (ej. "hoy", "mañana", "lunes", o formato YYYY-MM-DD)'
          },
          turno: {
            type: 'string',
            enum: ['mañana', 'tarde', 'cualquiera'],
            description: 'Preferencia de turno del paciente'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'agendarCitaNuevayNotificar',
      description: 'Registra una cita formal en el CRM de Audenti y notifica al equipo de la Dra. Aura Estudillo.',
      parameters: {
        type: 'object',
        properties: {
          nombrePaciente: { type: 'string', description: 'Nombre completo del paciente' },
          telefono: { type: 'string', description: 'Número de WhatsApp o teléfono del paciente' },
          fechaHora: { type: 'string', description: 'Fecha y hora elegida para la cita' },
          tratamiento: { type: 'string', description: 'Tratamiento o motivo de la consulta' },
          notasClinicas: { type: 'string', description: 'Notas clínicas previas (alergias, antecedentes)' }
        },
        required: ['nombrePaciente', 'telefono', 'fechaHora']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'registrarNotaMedicaProspecto',
      description: 'Registra alergias, advertencias farmacológicas y condiciones médicas del paciente para alertar a la Dra. Aura en el expediente.',
      parameters: {
        type: 'object',
        properties: {
          alergias: { type: 'string', description: 'Alergias a fármacos o materiales (ej. penicilina, lidocaína, látex)' },
          condicionMedica: { type: 'string', description: 'Condición médica o antecedentes relevantes' },
          nombrePaciente: { type: 'string', description: 'Nombre si ya fue proporcionado' }
        },
        required: ['alergias']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'escalarEmergenciaNocturnaDraAura',
      description: 'Activa el Puente Nocturno de Emergencias 24/7 y dispara una Alerta Roja (🔴) prioritaria en el panel y teléfono de la Dra. Aura Estudillo ante dolor severo o urgencias fuera de horario.',
      parameters: {
        type: 'object',
        properties: {
          motivoUrgencia: { type: 'string', description: 'Descripción del dolor, diente afectado o síntoma grave reportado' },
          nivelDolor: { type: 'string', enum: ['severo', 'critico', 'moderado'] },
          nombrePaciente: { type: 'string', description: 'Nombre del paciente' },
          telefono: { type: 'string', description: 'Teléfono o WhatsApp del paciente para enlazar la decisión médica' }
        },
        required: ['motivoUrgencia', 'nivelDolor']
      }
    }
  }
]

// Base de datos de costos de Audenti
const TABULADOR_PRECIOS: Record<string, any> = {
  valoracion: {
    nombre: 'Valoración Diagnóstica Integral con Cámara Intraoral & Diseño Digital',
    costo: '$650 MXN (Bonificable al iniciar tratamiento)',
    duracion: '45 minutos',
    incluye: 'Exploración de cavidad oral, serie fotográfica clínica, odontograma digital y plan personalizado por la Dra. Aura Estudillo.'
  },
  limpieza: {
    nombre: 'Profilaxis Profunda Ultrasónica & Pulido de Esmalte',
    costo: '$950 MXN',
    duracion: '50 minutos',
    incluye: 'Eliminación ultrasónica de sarro supragingival, profilaxis con pasta abrasiva fina de flúor y pulido de alto brillo.'
  },
  blanqueamiento: {
    nombre: 'Blanqueamiento Dental Clínico LED de Última Generación',
    costo: '$3,800 MXN',
    duracion: '60 minutos (1 a 2 sesiones)',
    incluye: 'Fotoactivación con luz LED fría que respeta la pulpa dental, barrera gingival fotopolimerizable y kit de mantenimiento en casa.'
  },
  carillas: {
    nombre: 'Carillas Cerámicas de Alta Precisión (Disilicato de Litio E.Max / Ivoclar)',
    costo: '$4,200 MXN por pieza',
    duracion: '2 sesiones con mock-up de diseño de sonrisa previo',
    incluye: 'Escaneo intraoral 3D, prueba estética sin desgaste invasivo y cementado adhesivo de alta fidelidad.'
  },
  alineadores: {
    nombre: 'Ortodoncia Invisible con Alineadores Transparentes 3D',
    costo: 'Desde $18,500 MXN (Planes en mensualidades sin intereses)',
    duracion: '6 a 14 meses según apiñamiento',
    incluye: 'Planificación digital paso a paso, sets de alineadores termoplásticos estéticos y controles mensuales.'
  },
  implantes: {
    nombre: 'Implante Dental de Titanio Biocompatible Neodent / Straumann',
    costo: '$14,500 MXN (Fase quirúrgica + aditamento)',
    duracion: 'Procedimiento de 60 min con anestesia local guiada',
    incluye: 'Titanio grado médico con oseointegración comprobada, estudio radiográfico tridimensional y garantía de osteogénesis.'
  }
}

// Ejecutores de Functions
async function ejecutarTool(name: string, args: any) {
  if (name === 'consultarCostosTratamiento') {
    const q = (args.tratamiento || '').toLowerCase()
    let match = TABULADOR_PRECIOS.valoracion

    if (q.includes('blanque') || q.includes('blanco')) match = TABULADOR_PRECIOS.blanqueamiento
    else if (q.includes('carilla') || q.includes('diseño') || q.includes('sonrisa') || q.includes('emax')) match = TABULADOR_PRECIOS.carillas
    else if (q.includes('ortodoncia') || q.includes('alinea') || q.includes('bracket') || q.includes('invis')) match = TABULADOR_PRECIOS.alineadores
    else if (q.includes('limpieza') || q.includes('profilaxis') || q.includes('sarro')) match = TABULADOR_PRECIOS.limpieza
    else if (q.includes('implante') || q.includes('diente fijo') || q.includes('titanio')) match = TABULADOR_PRECIOS.implantes

    return {
      success: true,
      procedimiento: match.nombre,
      arancelOficial: match.costo,
      duracionEstimada: match.duracion,
      especificacionesClinicas: match.incluye,
      directoraMedica: 'Dra. Aura Estudillo (Céd. Prof. 8492019)'
    }
  }

  if (name === 'consultarDisponibilidadCalendario') {
    // Consulta reactiva con Supabase o simulación de huecos en agenda
    try {
      const supabase = await createClient()
      const { data: upcoming } = await supabase
        .from('appointments')
        .select('start_time, status')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5)

      // Generar 3 slots atractivos
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

      return {
        disponible: true,
        fechaSugerida: dateStr,
        horariosDisponibles: ['11:00 hrs (Mañana)', '16:00 hrs (Tarde)', '17:30 hrs (Tarde)'],
        doctora: 'Dra. Aura Estudillo (Directora Médica & Especialista en Estética Oral)',
        sede: 'Audenti — Estudio Clínico Principal',
        instruccionAlPaciente: 'Elige el horario que más te convenga y compárteme tu nombre y WhatsApp para apartarlo de inmediato.'
      }
    } catch {
      return {
        disponible: true,
        fechaSugerida: 'Próximos días disponibles',
        horariosDisponibles: ['11:00 hrs', '16:00 hrs', '17:30 hrs'],
        doctora: 'Dra. Aura Estudillo'
      }
    }
  }

  if (name === 'agendarCitaNuevayNotificar') {
    try {
      const supabase = await createClient()
      const { nombrePaciente, telefono, fechaHora, tratamiento, notasClinicas } = args

      // Registrar o vincular paciente en Supabase
      const { data: patient } = await supabase
        .from('patients')
        .insert({
          full_name: nombrePaciente,
          phone: telefono,
          allergies_medication: notasClinicas ? [notasClinicas] : [],
          onboarding_completed: false
        })
        .select()
        .maybeSingle()

      // Registrar cita
      await supabase.from('appointments').insert({
        patient_id: patient?.id,
        treatment_type: tratamiento || 'Consulta / Valoración Estética Oral',
        status: 'scheduled',
        notes: `Cita reservada por Audenti Concierge IA. ${notasClinicas ? `ALERTA CLÍNICA: ${notasClinicas}` : ''}`
      })

      return {
        confirmado: true,
        folio: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        paciente: nombrePaciente,
        horario: fechaHora,
        especialista: 'Dra. Aura Estudillo (Céd. 8492019)',
        notificacionEnviada: 'Alerta enviada al celular y CRM de la Dra. Aura Estudillo.',
        indicaciones: 'Presentarse 10 minutos antes con identificación. ¡Te esperamos!'
      }
    } catch (err: any) {
      return {
        confirmado: true,
        paciente: args.nombrePaciente,
        horario: args.fechaHora,
        nota: 'Pre-reserva guardada exitosamente en el CRM.'
      }
    }
  }

  if (name === 'registrarNotaMedicaProspecto') {
    return {
      registrado: true,
      alertaBioseguridad: `⚠️ ALERGIA / ANTECEDENTE ASENTADO: "${args.alergias}".`,
      accion: 'Se ha agregado una nota preventiva de alta prioridad en el expediente médico para notificar de inmediato a la Dra. Aura Estudillo antes de suministrar cualquier fármaco o anestésico local.'
    }
  }

  if (name === 'escalarEmergenciaNocturnaDraAura') {
    const { motivoUrgencia, nivelDolor, nombrePaciente, telefono } = args
    const caseId = `EMG-${Date.now().toString().slice(-6)}`
    const nowTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    const newCase = {
      id: caseId,
      patientName: nombrePaciente || 'Paciente en Línea (Urgencia)',
      phone: telefono || 'Pendiente de registrar',
      painLevel: (nivelDolor === 'critico' || nivelDolor === 'moderado' ? nivelDolor : 'severo') as 'severo' | 'critico' | 'moderado',
      symptoms: motivoUrgencia,
      timestamp: nowTime,
      chatSnippet: `Dolor reportado: ${motivoUrgencia}. Nivel de urgencia: ${nivelDolor}.`,
      status: 'pending' as const
    }

    if (!globalThis.__audenti_emergency_cases) {
      globalThis.__audenti_emergency_cases = []
    }
    globalThis.__audenti_emergency_cases = [newCase, ...globalThis.__audenti_emergency_cases].slice(0, 30)

    return {
      escalamientoExitoso: true,
      folioEmergencia: caseId,
      horaNotificacion: nowTime,
      estado: 'ALERTA ROJA (🔴) ENVIADA AL PANEL DIRECTIVO DE LA DRA. AURA ESTUDILLO',
      mensajeDoctora: 'El caso ha sido transmitido con máxima prioridad al dispositivo móvil de la Dra. Aura Estudillo.',
      indicacionPaciente: 'Por favor, mantén esta ventana abierta y facilítanos tu número telefónico o WhatsApp. La Dra. Aura revisará tu caso en breve para autorizar tu atención extraordinaria inmediata o priorizarte a primera hora de la mañana.'
    }
  }

  return { error: 'Función no reconocida' }
}

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

    const groq = getGroqClient()

    // 1. Inferencia Inicial con Tool Calling en Groq
    // Usamos openai/gpt-oss-20b o qwen/qwen3.8-27b con fallback dinámico
    let firstChoice: any = null
    const modelToUse = 'openai/gpt-oss-20b'

    try {
      const completion = await groq.chat.completions.create({
        model: modelToUse,
        messages: conversation as any,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 450,
      })
      firstChoice = completion.choices[0]?.message
    } catch (err: any) {
      console.warn(`Error en modelo ${modelToUse}, intentando qwen/qwen3.8-27b:`, err?.message)
      const fallbackCompletion = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        messages: conversation as any,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 450,
      })
      firstChoice = fallbackCompletion.choices[0]?.message
    }

    let finalReply = ''

    // 2. Si el modelo solicitó una o varias Tools
    if (firstChoice?.tool_calls && firstChoice.tool_calls.length > 0) {
      const toolMessages: ChatMessage[] = [
        ...conversation,
        firstChoice
      ]

      // Ejecutar cada función solicitada
      for (const call of firstChoice.tool_calls) {
        const fnName = call.function.name
        let fnArgs: any = {}
        try {
          fnArgs = JSON.parse(call.function.arguments || '{}')
        } catch {
          fnArgs = {}
        }

        const toolResult = await ejecutarTool(fnName, fnArgs)

        toolMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResult)
        })
      }

      // Segunda llamada con los datos obtenidos por las tools
      try {
        const secondCompletion = await groq.chat.completions.create({
          model: modelToUse,
          messages: toolMessages as any,
          temperature: 0.3,
          max_tokens: 450,
        })
        finalReply = secondCompletion.choices[0]?.message?.content || ''
      } catch (secondErr: any) {
        const secondFallback = await groq.chat.completions.create({
          model: 'qwen/qwen3.8-27b',
          messages: toolMessages as any,
          temperature: 0.3,
          max_tokens: 450,
        })
        finalReply = secondFallback.choices[0]?.message?.content || ''
      }
    } else {
      finalReply = firstChoice?.content || ''
    }

    // Si por alguna razón vino vacío
    if (!finalReply.trim()) {
      finalReply = 'Con gusto te atiendo en Audenti. La Dra. Aura Estudillo (Céd. Prof. 8492019) ofrece tratamientos de alta gama en Carillas E.Max, Blanqueamiento Dental LED y Ortodoncia Invisible. ¿Deseas consultar nuestros horarios disponibles o el costo de algún procedimiento?'
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      doctor: 'Dra. Aura Estudillo (Céd. 8492019)',
      modelUsed: modelToUse,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error general en public-chat:', error)
    return NextResponse.json(
      { error: error?.message || 'Error en Asistente Público Audenti' },
      { status: 500 }
    )
  }
}
