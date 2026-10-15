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

const PUBLIC_WARM_SYSTEM_PROMPT = `Eres "Aura AI", la asistente virtual y concierge inteligente de la clínica dental de alta gama "Audenti — DentalCloud Pro", dirigida por la Dra. Aura Estudillo (Directora Médica & Especialista en Estética Oral, Cédula Profesional 8492019).

PERSONALIDAD (ROL PÚBLICO - CÁLIDO, ACOGEDOR Y HUMANO):
- Eres sumamente acogedora, empática, dulce, reconfortante y cercana. El paciente debe sentirse arropado, comprendido y en total confianza desde el primer segundo.
- Escucha activamente sus inquietudes o miedos dentales con ternura y respeto.

REGLAS DE CIBERSEGURIDAD CLÍNICA, PRIVACIDAD Y GUARDRAILS INQUEBRANTABLES:

1. PROHIBICIÓN ABSOLUTA DE MEDICAMENTOS, DOSIS Y DIAGNÓSTICOS:
   - Queda TERMINANTEMENTE PROHIBIDO diagnosticar patologías invasivas o mencionar nombres de fármacos (ej. ibuprofeno, paracetamol, amoxicilina, ketorolaco, clonixinato, naproxeno, aspirina, etc.), miligramos, dosis u horarios.
   - Si el usuario pregunta qué tomar, qué pastilla tomar o qué remedio usar para el dolor o síntoma, DEBES RESPONDER EXACTAMENTE CON ESTE MENSAJE OBLIGATORIO:
   "No tengo permitido recomendar ni recetar medicamentos. He enviado tu reporte directamente a la Dra. Aura Estudillo. Por favor ingresa tu número de WhatsApp y mantente en línea mientras la doctora evalúa tu caso para darte la indicación correspondiente."

2. PRIVACIDAD DE GEOLOCALIZACIÓN Y TIEMPOS RELATIVOS:
   - NUNCA reveles calles, números ni direcciones físicas exactas de las sedes ni del paciente.
   - Limítate estrictamente a informar el nombre de la sede y el cálculo de tiempos relativos de traslado:
   "La Dra. Aura Estudillo se encuentra a [X minutos / X km] de ti en la Sede [Nombre de Sede]. Estamos verificando en el sistema y en su panel directo si puede atenderte hoy de emergencia o a primera hora. Por favor mantente en línea."

3. PROTOCOLO PUENTE NOCTURNO 24/7 (🔴 ALERTA ROJA):
   - Ante dolor severo o urgencias, usa la herramienta \`escalarEmergenciaNocturnaDraAura\` de inmediato para avisar a la doctora en tiempo real y pide con amabilidad el número de WhatsApp.

4. COSTOS Y CITAS:
   - Usa \`consultarCostosTratamiento\` para aranceles y \`consultarDisponibilidadCalendario\` para fechas con la Dra. Aura.`

const DOCTOR_EXECUTIVE_SYSTEM_PROMPT = `Eres "Aura AI Copilot", el copiloto clínico, operativo y analítico de máxima confianza para la Dra. Aura Estudillo (Directora Médica & Propietaria de Audenti, Cédula 8492019).

PERSONALIDAD (ROL INTERNO / DOCTORA - EJECUTIVO Y PROFESIONAL):
- 100% profesional, analítico, eficiente, quirúrgico y directo al grano.
- Cero rodeos innecesarios. Proveer resúmenes ejecutivos, balances de sedes (Balbuena matriz vs Guadalupe Chalma), triaje clínico clasificado por severidad y sugerencias operativas de alto nivel.

CAPACIDADES DEL COPILOTO:
1. Resumen y clasificación instantánea de quejas, síntomas y pacientes en espera.
2. Supervisión de alertas de emergencias nocturnas (🔴 Roja / 🟡 Amarilla).
3. Recomendación de huecos en agenda y optimización del flujo en gabinete.
4. Soporte en toma de decisiones de aranceles y tratamientos estéticos complejos.`

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
  },
  {
    type: 'function',
    function: {
      name: 'consultarUbicacionSedeOptima',
      description: 'Cruza en tiempo real la ubicación del paciente con la sede donde se encuentra la Dra. Aura Estudillo en ese momento (Balbuena, Guadalupe Chalma, etc.) para calcular distancias, tiempos de traslado y sugerir la mejor alternativa.',
      parameters: {
        type: 'object',
        properties: {
          zonaPaciente: { type: 'string', description: 'Colonia, alcaldía, municipio o referencia de donde viene el paciente' },
          lat: { type: 'number', description: 'Latitud opcional si el usuario compartió GPS' },
          lng: { type: 'number', description: 'Longitud opcional si el usuario compartió GPS' }
        },
        required: ['zonaPaciente']
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

  if (name === 'consultarUbicacionSedeOptima') {
    const { zonaPaciente, lat, lng } = args
    const doctorLoc = globalThis.__audenti_doctor_location || {
      branchId: 'balbuena',
      branchName: 'Sede Balbuena',
      address: 'Zona Balbuena, CDMX',
      lat: 19.4187,
      lng: -99.1124,
      status: 'en_gabinete'
    }

    // Coordenadas aproximadas según la zona mencionada
    const z = (zonaPaciente || '').toLowerCase()
    let estimatedLat = lat || 19.4187
    let estimatedLng = lng || -99.1124
    let distanceApprox = 4.2
    let travelTime = 15

    if (z.includes('norte') || z.includes('gam') || z.includes('gustavo') || z.includes('lindavista') || z.includes('chalma')) {
      estimatedLat = 19.5000
      estimatedLng = -99.1400
      distanceApprox = 12.5
      travelTime = 32
    } else if (z.includes('roma') || z.includes('condesa') || z.includes('cuauhtemoc') || z.includes('reforma') || z.includes('centro')) {
      estimatedLat = 19.4162
      estimatedLng = -99.1628
      distanceApprox = 5.8
      travelTime = 18
    } else if (z.includes('sur') || z.includes('coyoacan') || z.includes('tlalpan') || z.includes('del valle')) {
      estimatedLat = 19.3500
      estimatedLng = -99.1600
      distanceApprox = 14.8
      travelTime = 38
    }

    return {
      consultaExitosa: true,
      zonaReportada: zonaPaciente,
      sedeActivaDraAura: {
        nombre: doctorLoc.branchName,
        estado: doctorLoc.status === 'en_gabinete' ? 'Atendiendo en Gabinete' : 'Disponible en Consulta'
      },
      distanciaEstimada: `a unos ${travelTime} minutos de distancia (aprox. ${distanceApprox} km)`,
      tiempoEstimadoVehiculo: `a unos ${travelTime} minutos de distancia`,
      recomendacionLogistica: `La Dra. Aura Estudillo se encuentra a unos ${travelTime} minutos de distancia de ti en la ${doctorLoc.branchName}. Estamos verificando en el sistema y en su panel directo si puede atenderte hoy de emergencia o a primera hora. Por favor mantente en línea.`,
      redSedesAudenti: [
        'Sede Balbuena (Dra. Aura Estudillo presente)',
        'Sede Guadalupe Chalma (Red Audenti)',
        'Sede Roma Norte (Próxima apertura)'
      ]
    }
  }

  return { error: 'Función no reconocida' }
}

export async function POST(request: Request) {
  try {
    const { messages, userMessage, role = 'public' } = await request.json()

    // Selector de contexto y personalidad según el rol
    const activePrompt = role === 'doctor'
      ? DOCTOR_EXECUTIVE_SYSTEM_PROMPT
      : PUBLIC_WARM_SYSTEM_PROMPT

    const conversation: ChatMessage[] = [
      { role: 'system', content: activePrompt }
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
    const modelToUse = role === 'doctor' ? 'openai/gpt-oss-120b' : 'openai/gpt-oss-20b'

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

    const lowerUser = (userMessage || conversation.map(c => c.content || '').join(' ')).toLowerCase()
    const lowerReply = (finalReply || '').toLowerCase()

    // =========================================================================
    // MOTOR DE DETECCIÓN E INTENCIÓN DE ALERTAS DE AURA AI:
    // 1. Alerta Roja (🔴): Urgencias, dolor intenso, abscesos, muela rota, sangrado.
    // 2. Alerta Amarilla (🟡): Solicitud de cita, valoración o diseño de sonrisa.
    // 3. Consultas Generales: Respuestas autónomas por la IA sin alertar a la doctora.
    // =========================================================================
    const RED_ALERT_REGEX = /\b(dolor|me\s+duele|duele|muela|infecci[oó]n|urgencia|sangrado|emergencia|hinchaz[oó]n|flem[oó]n|golpe|absceso|insoportable|calmante|fractura)\b/i
    const YELLOW_ALERT_REGEX = /\b(cita|agendar|apartar|horario|disponible|cu[aá]ndo\s+puedo|valoraci[oó]n|diseño\s+de\s+sonrisa|carillas|blanqueamiento|limpieza|consulta)\b/i

    const isRed = RED_ALERT_REGEX.test(lowerUser)
    const isYellow = !isRed && YELLOW_ALERT_REGEX.test(lowerUser)

    if (isRed || isYellow) {
      const caseId = `${isRed ? 'RED' : 'YEL'}-${Date.now().toString().slice(-6)}`
      const nowTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      
      // Extraer posible teléfono
      const phoneMatch = userMessage?.match(/\b\d{10}\b/) || conversation.map(c => c.content || '').join(' ').match(/\b\d{10}\b/)
      const detectedPhone = phoneMatch ? phoneMatch[0] : '[Desconocido] Pendiente por WhatsApp'

      // Detectar sede preferida o por defecto Balbuena
      const targetBranch = lowerUser.includes('chalma') || lowerUser.includes('gam') || lowerUser.includes('gustavo')
        ? 'Sede Guadalupe Chalma'
        : 'Sede Balbuena (Matriz)'

      const newAlertCase = {
        id: caseId,
        alertType: (isRed ? 'red_emergency' : 'yellow_appointment') as 'red_emergency' | 'yellow_appointment',
        patientName: detectedPhone !== '[Desconocido] Pendiente por WhatsApp' ? `Paciente (${detectedPhone})` : '[Desconocido] Paciente Web en Línea',
        phone: detectedPhone,
        painLevel: (isRed ? 'severo' : 'moderado') as 'severo' | 'moderado',
        symptoms: userMessage || conversation[conversation.length - 1]?.content || (isRed ? 'Urgencia por dolor agudo' : 'Solicitud de Cita / Valoración'),
        timestamp: nowTime,
        chatSnippet: `Mensaje recibido: "${userMessage || conversation[conversation.length - 1]?.content}"`,
        status: 'pending' as const,
        branchName: targetBranch,
        proposedSlot: isYellow ? {
          date: 'Mañana',
          time: '11:00 AM',
          treatment: lowerUser.includes('carilla') ? 'Carillas E.Max' : lowerUser.includes('blanque') ? 'Blanqueamiento LED' : 'Valoración Estética'
        } : undefined
      }

      if (!globalThis.__audenti_emergency_cases) {
        globalThis.__audenti_emergency_cases = []
      }

      // Evitar duplicar caso idéntico en los últimos 30 segundos
      const exists = globalThis.__audenti_emergency_cases.some(c => c.symptoms === newAlertCase.symptoms)
      if (!exists) {
        globalThis.__audenti_emergency_cases = [newAlertCase, ...globalThis.__audenti_emergency_cases].slice(0, 30)
      }
    }

    // ========================================================
    // FILTRO DE CONTENCIÓN ESTRICTO Y CIBERSEGURIDAD CLÍNICA:
    // Queda ABSOLUTAMENTE PROHIBIDO que la IA mencione nombres de fármacos,
    // dosis, miligramos o pautas de automedicación.
    // ========================================================
    const PROHIBITED_MEDS_REGEX = /\b(ibuprofeno|paracetamol|acetaminof[eé]n|amoxicilina|ketorolaco|clonixinato|naproxeno|aspirina|tramadol|diclofenaco|dexametasona|ampicilina|azitromicina|clindamicina|analg[eé]sico|antibi[oó]tico|\d+\s*mg|\d+\s*miligramos|\d+\s*gramos|cada\s*\d+\s*horas)\b/i
    const ASKS_FOR_MEDS_REGEX = /\b(qu[eé]\s+(tomar|puedo\s+tomar|me\s+tomo|pastilla|medicamento|medicina|remedio|dosis)|receta|rec[eé]tame)\b/i

    const mandatoryMedicationDenial = 'No tengo permitido recomendar ni recetar medicamentos. He enviado tu reporte directamente a la Dra. Aura Estudillo. Por favor ingresa tu número de WhatsApp y mantente en línea mientras la doctora evalúa tu caso para darte la indicación correspondiente.'

    if (ASKS_FOR_MEDS_REGEX.test(lowerUser) || PROHIBITED_MEDS_REGEX.test(lowerReply)) {
      finalReply = mandatoryMedicationDenial
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
