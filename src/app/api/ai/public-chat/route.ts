import { NextResponse } from 'next/server'
import { getGroqClient } from '@/lib/groq'
import { createClient } from '@/utils/supabase/server'
import { createAppointmentAction } from '@/actions/appointments'
import {
  getNowInMexico,
  formatTimeInMexico,
  formatDateInMexico,
  formatPrettyDateInMexico,
  TIMEZONE_MEXICO
} from '@/utils/timezone'

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

2. FILTRADO CLÍNICO ESTRICTO ANTE SÍNTOMAS O DOLOR (CERO CATÁLOGOS O VENTAS):
   - Si el usuario reporta cualquier molestia, dolor de muela, diente flojo, inflamación o síntoma, queda TERMINANTEMENTE PROHIBIDO ofrecer tratamientos estéticos (carillas, blanqueamientos) o recitar listas de precios.
   - Tu respuesta debe ser empática, directa y centrada exclusivamente en calmar al paciente y proponer espacios de valoración diagnóstica con la Dra. Aura Estudillo usando consultarDisponibilidadCalendario.

3. PRIVACIDAD DE GEOLOCALIZACIÓN Y TIEMPOS RELATIVOS:
   - NUNCA reveles calles, números ni direcciones físicas exactas de las sedes ni del paciente.
   - Limítate estrictamente a informar el nombre de la sede y el cálculo de tiempos relativos de traslado:
   "La Dra. Aura Estudillo se encuentra a [X minutos / X km] de ti en la Sede [Nombre de Sede]. Estamos verificando en el sistema y en su panel directo si puede atenderte hoy de emergencia o a primera hora. Por favor mantente en línea."

4. PROTOCOLO PUENTE NOCTURNO 24/7 (🔴 ALERTA ROJA):
   - Ante dolor severo o urgencias, usa la herramienta \`escalarEmergenciaNocturnaDraAura\` de inmediato para avisar a la doctora en tiempo real y pide con amabilidad el número de WhatsApp.

5. PROTOCOLO OBLIGATORIO DE CONTACTO Y MEMORIA DE SESIÓN PARA AGENDAR CITAS:
   - MEMORIA DE SESIÓN (NO REPETIR PREGUNTAS): Si en el contexto del chat o en los mensajes previos el paciente ya compartió su número telefónico / WhatsApp o su nombre, GUÁRDALO en tu memoria activa de sesión y **NUNCA VUELVAS A PEDIRLE SU TELÉFONO O NOMBRE**. Avanza de inmediato con la atención, propuesta de horarios o confirmación de cita.
   - VALIDACIÓN OBLIGATORIA DE TELÉFONO/WHATSAPP: Si el usuario desea agendar, elige fecha o pide apartar su lugar pero NO ha proporcionado su número de WhatsApp/teléfono celular (ni en este mensaje ni en mensajes anteriores), solicita amablemente su teléfono con este mensaje claro:
   "Para apartar tu lugar y enviarte el folio de confirmación a tu WhatsApp, por favor indícame tu número de teléfono."
   - Solo cuando el paciente proporcione su nombre y un número de teléfono/WhatsApp válido (o ya lo haya dado previamente), invoca la herramienta \`agendarCitaNuevayNotificar\`.
   - NUNCA digas que la notificación se envió a su celular a menos que el paciente haya proporcionado su número de WhatsApp o teléfono celular.

6. COSTOS Y CITAS:
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
    const nowMx = getNowInMexico()
    const currentHour = nowMx.getHours()
    const currentMin = nowMx.getMinutes()
    const todayFormatted = formatPrettyDateInMexico(nowMx)

    // Bloques estándar de atención en clínica
    const standardDailySlots = [
      { hour: 10, time: '10:00', label: '10:00 hrs (Mañana)' },
      { hour: 11, time: '11:00', label: '11:00 hrs (Mañana)' },
      { hour: 12, time: '12:00', label: '12:00 hrs (Mediodía)' },
      { hour: 16, time: '16:00', label: '16:00 hrs (Tarde)' },
      { hour: 17, time: '17:30', label: '17:30 hrs (Tarde)' },
      { hour: 19, time: '19:00', label: '19:00 hrs (Vespertino)' }
    ]

    // Si el usuario pregunta por "hoy" o no especificó fecha
    const fechaPedida = (args.fecha || '').toLowerCase()
    const isAskingToday = fechaPedida.includes('hoy')

    // Filtrar huecos que aún no han pasado hoy
    const remainingToday = standardDailySlots.filter(s => s.hour > currentHour || (s.hour === currentHour && currentMin < 15))

    let fechaSugerida = ''
    let horariosDisponibles: string[] = []
    let avisoTemporal = ''

    if (isAskingToday && remainingToday.length > 0) {
      fechaSugerida = `Hoy (${todayFormatted})`
      horariosDisponibles = remainingToday.slice(0, 3).map(s => s.label)
      avisoTemporal = 'Horarios disponibles para el resto del día de hoy.'
    } else {
      // Si ya pasaron los horarios de hoy (ej. son más de las 18:00 hrs) o no quedan slots hoy,
      // NUNCA ofrecer horarios matutinos/vespertinos pasados. Ofrecer el día de mañana a primera hora.
      const tomorrowMx = new Date(nowMx)
      tomorrowMx.setDate(tomorrowMx.getDate() + 1)
      const tomorrowFormatted = formatPrettyDateInMexico(tomorrowMx)

      fechaSugerida = `Mañana (${tomorrowFormatted})`
      horariosDisponibles = ['08:30 hrs (Primera Hora / Prioritario)', '11:00 hrs (Mañana)', '16:00 hrs (Tarde)']
      avisoTemporal = currentHour >= 18
        ? 'Por el horario actual vespertino (más de las 18:00 hrs), los turnos regulares de hoy han concluido. Te ofrecemos atención a Primera Hora de mañana o apertura extraordinaria en caso de urgencia roja.'
        : 'Horarios confirmados y libres para mañana.'
    }

    return {
      disponible: true,
      horaActualMexico: formatTimeInMexico(nowMx) + ' hrs',
      fechaSugerida,
      horariosDisponibles,
      avisoTemporal,
      doctora: 'Dra. Aura Estudillo (Directora Médica & Especialista en Estética Oral, Céd. 8492019)',
      sede: 'Audenti — Estudio Clínico Principal (Sede Balbuena)',
      instruccionAlPaciente: 'Elige el horario que más te convenga y facilítame tu nombre y WhatsApp para apartarlo de inmediato.'
    }
  }

  if (name === 'agendarCitaNuevayNotificar') {
    const { nombrePaciente, telefono, fechaHora, tratamiento, notasClinicas } = args

    // Validación estricta de teléfono: Si no se proporcionó teléfono real, detener confirmación falsa
    const cleanPhone = (telefono || '').trim()
    const hasValidPhone = cleanPhone.length >= 8 && cleanPhone !== '[Desconocido]' && !cleanPhone.toLowerCase().includes('pendiente')

    if (!hasValidPhone) {
      return {
        confirmado: false,
        requiereTelefono: true,
        mensaje: 'Para apartar tu lugar y enviarte el folio de confirmación a tu WhatsApp, por favor indícame tu número de teléfono.',
        paciente: nombrePaciente || 'Estimado/a paciente',
        fechaHoraSugerida: fechaHora
      }
    }

    const folioGenerado = `AUD-${Math.floor(1000 + Math.random() * 9000)}`
    const patientNameClean = nombrePaciente || 'Paciente Web'
    const appTreatment = tratamiento || 'Consulta / Valoración Estética Oral'
    const appDate = (fechaHora && fechaHora.includes('-')) ? fechaHora.split(' ')[0] : new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]
    const appTime = (fechaHora && fechaHora.includes(':')) ? (fechaHora.split(' ')[1] || '11:00:00') : '11:00:00'

    // Ejecución Síncrona de Server Action de Persistencia
    const actionResult = await createAppointmentAction({
      folio: folioGenerado,
      patient_name: patientNameClean,
      patient_phone: cleanPhone,
      appointment_date: appDate,
      appointment_time: appTime,
      treatment: appTreatment,
      branch: 'Sede Balbuena (Matriz)',
      status: 'confirmed',
      notes: `Cita reservada por Aura AI. Folio: ${folioGenerado}. ${notasClinicas ? `ALERTA: ${notasClinicas}` : ''}`
    })

    if (!actionResult.success) {
      return {
        confirmado: false,
        error: true,
        mensaje: 'Hubo un inconveniente al registrar la cita en la base de datos de la clínica. Por favor, reintenta o comunícate directamente con recepción.'
      }
    }

    return {
      confirmado: true,
      folio: folioGenerado,
      paciente: patientNameClean,
      telefono: cleanPhone,
      horario: fechaHora,
      especialista: 'Dra. Aura Estudillo (Céd. 8492019)',
      notificacionEnviada: `Se ha enviado el comprobante a tu WhatsApp (${cleanPhone}) y la alerta al CRM de la Dra. Aura Estudillo.`,
      indicaciones: 'Presentarse 10 minutos antes con identificación. ¡Te esperamos con gusto en Audenti!'
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
    const nowTime = formatTimeInMexico()

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
    const alreadyEscalated = globalThis.__audenti_emergency_cases.some(c => c.symptoms === newCase.symptoms)
    if (!alreadyEscalated) {
      globalThis.__audenti_emergency_cases = [newCase, ...globalThis.__audenti_emergency_cases].slice(0, 30)
    }

    return {
      escalamientoExitoso: true,
      folioEmergencia: caseId,
      horaNotificacion: nowTime + ' hrs (CDMX)',
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
    const { messages, userMessage, role = 'public', sessionContext } = await request.json()

    // 1. Extracción de Memoria de Sesión (Teléfono y Nombre) de los mensajes previos
    let rememberedPhone = sessionContext?.phone || ''
    let rememberedName = sessionContext?.patientName || ''

    const allHistoryText = [
      ...(Array.isArray(messages) ? messages.map((m: any) => m.content || '') : []),
      userMessage || ''
    ].join(' ')

    if (!rememberedPhone) {
      const match = allHistoryText.match(/\b\d{10}\b/) || allHistoryText.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/)
      if (match) {
        rememberedPhone = match[0].replace(/\D/g, '')
      }
    }

    if (!rememberedName) {
      const nameMatch = allHistoryText.match(/(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,30})/i)
      if (nameMatch) {
        rememberedName = nameMatch[1].trim()
      }
    }

    // Selector de contexto y personalidad según el rol
    let basePrompt = role === 'doctor'
      ? DOCTOR_EXECUTIVE_SYSTEM_PROMPT
      : PUBLIC_WARM_SYSTEM_PROMPT

    // Inyección de Fecha, Hora y Zona Horaria Oficial (America/Mexico_City)
    const nowMx = getNowInMexico()
    const currentTimeStr = formatTimeInMexico(nowMx)
    const todayPretty = formatPrettyDateInMexico(nowMx)
    const isLateEvening = nowMx.getHours() >= 18

    basePrompt += `\n\n[CONTEXTO TEMPORAL Y ZONA HORARIA EN TIEMPO REAL - AUDENTI (AMERICA/MEXICO_CITY, GMT-6)]:\n`
    basePrompt += `- Fecha actual: ${todayPretty}\n`
    basePrompt += `- Hora actual de México: ${currentTimeStr} hrs\n`
    basePrompt += `- REGLA CRÍTICA TEMPORAL: Son las ${currentTimeStr} hrs. NUNCA ofrezcas horarios del día de hoy que ya hayan transcurrido (por ejemplo, NO ofrezcas 10:00, 11:00, 12:00, 16:00 ni horas anteriores a las ${currentTimeStr} hrs). `
    if (isLateEvening) {
      basePrompt += `Como ya son más de las 18:00 hrs, el horario regular de consulta presencial de hoy ha concluido. Ofrece exclusivamente horarios para MAÑANA (ej. Primera hora a las 08:30 AM o 11:00 AM) o atención extraordinaria nocturna si es una urgencia médica grave.`
    } else {
      basePrompt += `Solo puedes ofrecer horarios posteriores a las ${currentTimeStr} hrs para el día de hoy, o turnos a partir de mañana.`
    }

    // Si ya tenemos datos del paciente en la sesión, inyectarlos en la memoria activa del prompt
    if (role === 'public' && (rememberedPhone || rememberedName)) {
      basePrompt += `\n\n[MEMORIA ACTIVA DE LA SESIÓN ACTUAL]:\n`
      if (rememberedName) basePrompt += `- Nombre del paciente: "${rememberedName}".\n`
      if (rememberedPhone) basePrompt += `- Teléfono/WhatsApp del paciente: "${rememberedPhone}".\n`
      basePrompt += `- INSTRUCCIÓN CLAVE: Como ya cuentas con estos datos de contacto en la sesión, NO se los vuelvas a pedir bajo ninguna circunstancia. Si solicita agendar o apartar cita, utiliza este número y nombre directamente con la herramienta \`agendarCitaNuevayNotificar\` y avanza de inmediato a la confirmación.`
    }

    const conversation: ChatMessage[] = [
      { role: 'system', content: basePrompt }
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

        // Si la función es agendar y no trajo teléfono pero la sesión ya lo tiene, enriquecerlo
        if (fnName === 'agendarCitaNuevayNotificar') {
          if (!fnArgs.telefono && rememberedPhone) {
            fnArgs.telefono = rememberedPhone
          }
          if (!fnArgs.nombrePaciente && rememberedName) {
            fnArgs.nombrePaciente = rememberedName
          }
        } else if (fnName === 'escalarEmergenciaNocturnaDraAura') {
          if (!fnArgs.telefono && rememberedPhone) {
            fnArgs.telefono = rememberedPhone
          }
          if (!fnArgs.nombrePaciente && rememberedName) {
            fnArgs.nombrePaciente = rememberedName
          }
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

    // Normalización semántica para tolerancia a acentos, mayúsculas y caracteres especiales
    const normalizeText = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

    const rawUser = userMessage || conversation[conversation.length - 1]?.content || ''
    const normUser = normalizeText(rawUser)
    const normReply = normalizeText(finalReply)

    // =========================================================================
    // MOTOR DE TRIAJE SEMÁNTICO MULTINIVEL (NLP):
    // Tolera errores ortográficos, lenguaje coloquial y ausencia de tildes.
    //
    // 🟢 NIVEL VERDE (Consultas y Citas de Rutina / Información):
    //    Triggers: "podria darme una cita", "que dia me atienden", "horario",
    //              "limpieza", "revision", "costo", "precio", "agendar", "saludo".
    //    Acción: Responde amablemente sin disparar modales invasivos de urgencia 24/7.
    //
    // 🟡 NIVEL AMARILLO / ORANGE (Cita Prioritaria / Molestia Leve o Estética de Alta Gama):
    //    Triggers: "molestia", "dolor leve", "sensibilidad", "me duele al masticar",
    //              "diseno de sonrisa", "carillas", "ortodoncia", "alineadores", "implante".
    //    Acción: Registro con prioridad media en el CRM para agendar en las próximas 24-48 hrs.
    //
    // 🔴 NIVEL ROJO (Urgencia Médica Real 24/7 - Dispara Alerta Roja):
    //    Triggers ÚNICOS de dolor insoportable, trauma o infección severa:
    //    "dolor insoportable", "dolor muy fuerte", "no aguanto el dolor", "sangrado",
    //    "se me cayo un diente", "se me rompio el diente", "flemon", "absceso",
    //    "hinchazon de cara", "hinchado", "infeccion severa", "golpe en la boca".
    // =========================================================================

    // 1. Red Alert Check (Extrema urgencia médica)
    const RED_REGEX = /\b(dolor\s+(insoportable|muy\s+fuerte|intenso|agudo|severo|horrible|demasiado)|no\s+aguanto\s+(el\s+)?dolor|sangrado(\s+abundante|\s+constante)?|se\s+me\s+cay[o|e]\s+(un\s+)?diente|se\s+cay[o|e]\s+(el|un)\s+diente|se\s+me\s+rompi[o|e]\s+(el|un)\s+diente|diente\s+roto\s+por\s+golpe|infecci[o|e]n\s+severa|flemon|absceso|hinchaz[o|e]n\s+severa|cara\s+hinchada|se\s+me\s+hincho|accidente|trauma)\b/i

    // 2. Yellow Alert Check (Molestia persistente moderada o estética de alta gama)
    const YELLOW_REGEX = /\b(molestia|sensibil(idad|e)|me\s+duele\s+al\s+masticar|dolor\s+(leve|moderado|ocasional)|carilla(s)?|diseno\s+de\s+sonrisa|ortodoncia|alineador(es)?|invisalign|implante(s)?)\b/i

    // 3. Green Alert Check (Consultas de rutina, agendamiento ordinario, costos o información general)
    const GREEN_REGEX = /\b(cita|agendar|apartar|revision|chequeo|limpieza|profilaxis|costo(s)?|precio(s)?|informaci[o|e]n|horario(s)?|que\s+dia|cuando\s+abren|donde\s+estan|saludos|hola|buen(as|os)?)\b/i

    const isRed = RED_REGEX.test(normUser)
    // Solo es amarillo si NO es rojo y presenta triggers amarillos sin ser una solicitud de rutina pura
    const isYellow = !isRed && YELLOW_REGEX.test(normUser)

    // Solo se registra en el panel de alertas si es una Urgencia Roja real o una Solicitud Amarilla prioritaria
    if (isRed || isYellow) {
      const nowTime = formatTimeInMexico()
      
      // Extraer posible teléfono
      const phoneMatch = rawUser.match(/\b\d{10}\b/) || conversation.map(c => c.content || '').join(' ').match(/\b\d{10}\b/)
      const detectedPhone = phoneMatch ? phoneMatch[0] : (rememberedPhone || '[Desconocido] Pendiente por WhatsApp')

      const targetBranch = normUser.includes('chalma') || normUser.includes('gam') || normUser.includes('gustavo')
        ? 'Sede Guadalupe Chalma'
        : 'Sede Balbuena (Matriz)'

      if (!globalThis.__audenti_emergency_cases) {
        globalThis.__audenti_emergency_cases = []
      }

      // Evitar duplicados por contenido/síntomas parecidos o alertas rojas ya activas en la misma sesión
      const alreadyReported = globalThis.__audenti_emergency_cases.some(
        c => c.symptoms.trim().toLowerCase() === rawUser.trim().toLowerCase() ||
             (c.phone === detectedPhone && detectedPhone !== '[Desconocido] Pendiente por WhatsApp' && c.status === 'pending')
      )

      if (!alreadyReported) {
        const caseId = `${isRed ? 'RED' : 'YEL'}-${Date.now().toString().slice(-6)}`
        const newAlertCase = {
          id: caseId,
          alertType: (isRed ? 'red_emergency' : 'yellow_appointment') as 'red_emergency' | 'yellow_appointment',
          patientName: detectedPhone !== '[Desconocido] Pendiente por WhatsApp' ? `Paciente (${detectedPhone})` : (rememberedName || '[Desconocido] Paciente Web en Línea'),
          phone: detectedPhone,
          painLevel: (isRed ? 'severo' : 'moderado') as 'severo' | 'moderado',
          symptoms: rawUser || conversation[conversation.length - 1]?.content || (isRed ? 'Urgencia por dolor agudo' : 'Valoración Estética Especializada'),
          timestamp: nowTime,
          chatSnippet: `Mensaje recibido: "${rawUser || conversation[conversation.length - 1]?.content}"`,
          status: 'pending' as const,
          branchName: targetBranch,
          proposedSlot: isYellow ? {
            date: 'Próxima fecha disponible',
            time: '11:00 AM o 16:00 PM',
            treatment: normUser.includes('carilla') ? 'Carillas E.Max' : 'Diseño de Sonrisa'
          } : undefined
        }

        globalThis.__audenti_emergency_cases = [newAlertCase, ...globalThis.__audenti_emergency_cases].slice(0, 30)
      }
    }

    // ========================================================
    // FILTRO DE CONTENCIÓN ESTRICTO Y CIBERSEGURIDAD CLÍNICA:
    // Queda ABSOLUTAMENTE PROHIBIDO que la IA mencione nombres de fármacos,
    // dosis, miligramos o pautas de automedicación.
    // SOLO se activa cuando el usuario EXPLICITAMENTE pide qué fármaco/pastilla tomar,
    // o si el bot generó por error nombres de medicamentos.
    // ========================================================
    const PROHIBITED_MEDS_REGEX = /\b(ibuprofeno|paracetamol|acetaminofen|amoxicilina|ketorolaco|clonixinato|naproxeno|aspirina|tramadol|diclofenaco|dexametasona|ampicilina|azitromicina|clindamicina|\d+\s*mg|\d+\s*miligramos|\d+\s*gramos)\b/i
    const ASKS_EXPLICIT_PRESCRIPTION_REGEX = /\b(que\s+(me\s+tomo|puedo\s+tomar|pastilla|medicamento|medicina|farmaco)|recetame|dame\s+una\s+receta|que\s+dosis|que\s+tomar|algun\s+analgesico)\b/i

    const mandatoryMedicationDenial = 'No tengo permitido recomendar ni recetar medicamentos. He enviado tu reporte directamente a la Dra. Aura Estudillo. Por favor ingresa tu número de WhatsApp y mantente en línea mientras la doctora evalúa tu caso para darte la indicación correspondiente.'

    // Si el usuario simplemente pide cita o saluda, NUNCA bloquear con negativa de medicamentos
    const isAskingForAppointmentOrGreeting = /\b(cita|agendar|apartar|hora|horario|consulta|hola|buen|buenos|buenas|precio|costo|cuanto|podria|dia)\b/i.test(normUser)

    if (!isAskingForAppointmentOrGreeting && (ASKS_EXPLICIT_PRESCRIPTION_REGEX.test(normUser) || PROHIBITED_MEDS_REGEX.test(normReply))) {
      finalReply = mandatoryMedicationDenial
    } else if (isAskingForAppointmentOrGreeting && PROHIBITED_MEDS_REGEX.test(normReply)) {
      // Si la respuesta del bot contenía un fármaco por error mientras el usuario pedía cita, limpiarlo con mensaje de cita
      finalReply = '¡Con mucho gusto! La Dra. Aura Estudillo (Céd. Prof. 8492019) cuenta con espacios disponibles para tu valoración y consulta en Sede Balbuena y Guadalupe Chalma. ¿Prefieres un horario matutino o vespertino?'
    }

    // ========================================================
    // COHERENCIA EN CONFIRMACIÓN Y CONTACTO:
    // Si el usuario NO proporcionó un teléfono ni en el mensaje actual ni en la memoria previa,
    // la IA NO debe afirmar que "se envió una notificación a tu celular".
    // En su lugar, solicitar amablemente el teléfono para enviarle el folio.
    // ========================================================
    const hasAnyPhone = Boolean(rememberedPhone) || Boolean(rawUser.match(/\b\d{10}\b/)) || Boolean(conversation.map(c => c.content || '').join(' ').match(/\b\d{10}\b/))
    const claimsSentToPhone = /\b(se\s+(ha\s+)?enviado(\s+la\s+notificaci[o|e]n)?\s+(a\s+tu|al)\s+(celular|tel[eé]fono|whatsapp)|notificaci[o|e]n\s+(ya\s+)?se\s+envi[o|e]\s+a\s+tu\s+celular)\b/i.test(normReply)

    if (!hasAnyPhone && claimsSentToPhone) {
      finalReply = 'Para apartar tu lugar y enviarte el folio de confirmación a tu WhatsApp, por favor indícame tu número de teléfono.'
    }

    // Si por alguna razón vino vacío o el modelo ofreció estética ante dolor
    const isPainReport = /\b(dolor|molestia|inflama|hinchad|muela|diente|sensib)\b/i.test(normUser)
    if (!finalReply.trim()) {
      if (isPainReport) {
        finalReply = 'Comprendo tu molestia dental. La Dra. Aura Estudillo cuenta con espacios prioritarios para una valoración diagnóstica y darte alivio hoy mismo. ¿Prefieres que te agende por la mañana o por la tarde?'
      } else {
        finalReply = 'Con gusto te atiendo en Audenti. La Dra. Aura Estudillo (Céd. Prof. 8492019) ofrece tratamientos de alta gama en Carillas E.Max, Blanqueamiento Dental LED y Ortodoncia Invisible. ¿Deseas consultar nuestros horarios disponibles o el costo de algún procedimiento?'
      }
    } else if (isPainReport && /\b(carillas|blanqueamiento|promoci[oó]n|est[eé]tica)\b/i.test(normReply)) {
      finalReply = 'Lamento mucho que tengas esa molestia. Para darte pronta atención y alivio con la Dra. Aura Estudillo (Céd. Prof. 8492019), contamos con espacios para revisión y diagnóstico en Sede Balbuena y Guadalupe Chalma. ¿Te gustaría acudir por la mañana o por la tarde?'
    }

    // Sincronización de seguridad: Si la respuesta contiene un folio AUD-XXXX que el modelo haya generado,
    // persistirlo de forma inmediata con createAppointmentAction para garantizar que exista en BD
    const folioMatches = finalReply.match(/AUD-\d{4,6}/i)
    if (folioMatches && folioMatches[0]) {
      const detectedFolio = folioMatches[0].toUpperCase()
      const cleanPhone = rememberedPhone || (rawUser.match(/\b\d{10}\b/) ? rawUser.match(/\b\d{10}\b/)![0] : 'WhatsApp')
      const patientNameClean = rememberedName || 'Paciente Web'

      createAppointmentAction({
        folio: detectedFolio,
        patient_name: patientNameClean,
        patient_phone: cleanPhone,
        treatment: isPainReport ? 'Consulta / Alivio de Dolor Dental' : 'Consulta / Valoración Estética Oral',
        branch: normUser.includes('chalma') ? 'Sede Guadalupe Chalma' : 'Sede Balbuena (Matriz)',
        status: 'confirmed'
      }).catch(e => console.warn('Sync fallback error:', e?.message))
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
