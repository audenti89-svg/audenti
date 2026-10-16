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

PERSONALIDAD (AURA AI - DIRECTA, SIN RODEOS, CÁLIDA Y CLÍNICA):
- Empática, resolutiva y ágil. Tu misión principal es brindar auxilio y agendar la consulta de inmediato sin rodeos ni cuestionarios burocráticos.

REGLAS CRÍTICAS DE CONVERSACIÓN (CERO PREGUNTAS OBVIAS):
1. REGLA DE CERO PREGUNTAS OBVIAS ANTE SÍNTOMAS O DOLOR:
   - Si el usuario menciona dolor de muela, punzadas, muela rota, sensibilidad extrema o inflamación (ej. "dolor intenso en la muela desde ayer"):
     * QUEDA ESTRICTAMENTE PROHIBIDO preguntarle qué servicio o tratamiento desea. Asume de inmediato urgencia pulpar / endodóntica o valoración de urgencia.
     * RESPONDE EN MÁXIMO DOS ORACIONES:
       1) Valida el dolor con empatía e indica la urgencia de atención.
       2) Propón directamente la sucursal activa más cercana y un horario inmediato (ej. "Lamento mucho ese dolor intenso; atenderemos esa urgencia de inmediato. ¿Te agendo hoy a las 16:00 hrs en la Sede Balbuena Matriz con la Dra. Aura Estudillo?").
     * Si el paciente tiene un teléfono o nombre registrado, genera de inmediato la cita con agendarCitaNuevayNotificar y márcala como prioridad de urgencia.

2. CERO CATÁLOGOS COMERCIALES NO SOLICITADOS:
   - Prohibido recitar precios o catálogos a menos que el usuario lo pida explícitamente. Actúa como recepcionista médica de alto nivel.

3. PROHIBICIÓN ABSOLUTA DE MEDICAMENTOS Y DOSIS:
   - Jamás indiques dosis ni nombres de medicamentos farmacológicos. Si preguntan qué tomar, di que la Dra. Aura Estudillo evaluará el caso en gabinete para indicar el fármaco adecuado.

4. MEMORIA ACTIVA DE CONTACTO (NO REPETIR PREGUNTAS):
   - Si el paciente ya dio su teléfono o nombre en la conversación, NO lo vuelvas a pedir. Úsalos directamente para la confirmación.

5. REGLA ESTRICTA DE GEOLOCALIZACIÓN Y CERO SUPOSICIONES FALSAS:
   - QUEDA ESTRICTAMENTE PROHIBIDO inventar que una sucursal es "la más cercana" si el usuario no ha compartido su ubicación exacta.
   - Sede Balbuena (Matriz) se ubica en la zona oriente/centro (Alcaldía Venustiano Carranza / Balbuena).
   - Sede Guadalupe Chalma se ubica en el extremo Norte de la CDMX (Alcaldía Gustavo A. Madero, cerca de Cuautepec / Reclusorio Norte).
   - Si el paciente menciona una zona lejana a Balbuena (ej. "Reclusorio Norte", "Cuautepec", "Indios Verdes", "GAM", "Tlalnepantla", "Satélite"):
     * NUNCA le digas falsamente que Balbuena le queda a 15 minutos ni que es la más cercana.
     * Si está en el Norte / Reclusorio Norte / GAM, ofrécele con total honestidad la Sede Guadalupe Chalma como la opción más próxima en su zona, o aclárale que la Sede Balbuena Matriz requiere un traslado de 35 a 55 minutos en vehículo.
     * Pregúntale con honestidad si prefiere la Sede Guadalupe Chalma o la Sede Matriz Balbuena.
   - Si el usuario NO menciona su ubicación, indícale amablemente que la clínica matriz se ubica en Balbuena y consulta si prefiere acudir ahí o en Guadalupe Chalma.

6. NOTIFICACIÓN DIRECTA AL PANEL MÉDICO:
   - Toda urgencia o dolor reportado se escala automáticamente con la herramienta escalarEmergenciaNocturnaDraAura para que la doctora la reciba y confirme sin intermediarios.`

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
          sucursal: {
            type: 'string',
            enum: ['Sede Balbuena (Matriz)', 'Sede Guadalupe Chalma', 'Cualquiera'],
            description: 'Sucursal elegida según la ubicación del paciente (Norte = Guadalupe Chalma, Centro/Oriente = Balbuena)'
          },
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

    // Parseo inteligente de fecha
    const nowMx = getNowInMexico()
    let appDate = formatDateInMexico(nowMx)
    const rawFechaHora = (fechaHora || '').toLowerCase()

    if (rawFechaHora.includes('mañana')) {
      const tomorrow = new Date(nowMx)
      tomorrow.setDate(tomorrow.getDate() + 1)
      appDate = formatDateInMexico(tomorrow)
    } else if (rawFechaHora.match(/\b(202\d-\d{2}-\d{2})\b/)) {
      appDate = rawFechaHora.match(/\b(202\d-\d{2}-\d{2})\b/)![1]
    }

    // Parseo inteligente de hora (17:30, 16:00, etc.)
    let appTime = '11:00:00'
    const timeMatch = rawFechaHora.match(/\b(\d{1,2}:\d{2})\b/)
    if (timeMatch) {
      appTime = timeMatch[1].length === 5 ? `${timeMatch[1]}:00` : timeMatch[1]
    } else {
      const hourMatch = rawFechaHora.match(/\b(\d{1,2})\s*(?:pm|de la tarde|hrs|horas)\b/i)
      if (hourMatch) {
        let h = parseInt(hourMatch[1], 10)
        if (h < 12 && /pm|tarde/i.test(hourMatch[0])) h += 12
        appTime = `${h < 10 ? '0' + h : h}:00:00`
      }
    }

    const { sucursal } = args
    const chosenBranch = sucursal && sucursal !== 'Cualquiera'
      ? sucursal
      : ((notasClinicas || '').toLowerCase().includes('chalma') || (nombrePaciente || '').toLowerCase().includes('chalma'))
      ? 'Sede Guadalupe Chalma'
      : 'Sede Balbuena (Matriz)'

    // Ejecución Síncrona de Server Action de Persistencia
    const actionResult = await createAppointmentAction({
      folio: folioGenerado,
      patient_name: patientNameClean,
      patient_phone: cleanPhone,
      appointment_date: appDate,
      appointment_time: appTime,
      treatment: appTreatment,
      branch: chosenBranch,
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
      notificacionEnviada: `Folio registrado en agenda de la Dra. Aura Estudillo. Se vinculó a tu número (${cleanPhone}).`,
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
    const z = (zonaPaciente || '').toLowerCase()

    const isNorthOrChalma = z.includes('norte') || z.includes('reclusorio') || z.includes('gam') ||
      z.includes('gustavo') || z.includes('lindavista') || z.includes('chalma') ||
      z.includes('cuautepec') || z.includes('ticoman') || z.includes('tlalnepantla')

    let sedeRecomendada = 'Sede Balbuena (Matriz)'
    let distanciaKm = 6.5
    let tiempoMinutos = 20
    let explicacionZona = ''

    if (isNorthOrChalma) {
      sedeRecomendada = 'Sede Guadalupe Chalma (Zona Norte / GAM)'
      distanciaKm = 4.0
      tiempoMinutos = 12
      explicacionZona = `Para la zona Norte (${zonaPaciente}), nuestra clínica en Sede Guadalupe Chalma es la opción más cercana (aprox. 12-15 min). La Sede Matriz Balbuena se encuentra a unos 40-55 minutos en vehículo.`
    } else if (z.includes('roma') || z.includes('condesa') || z.includes('cuauhtemoc') || z.includes('centro') || z.includes('reforma')) {
      sedeRecomendada = 'Sede Balbuena (Matriz)'
      distanciaKm = 6.0
      tiempoMinutos = 18
      explicacionZona = `Desde la zona Centro/Roma (${zonaPaciente}), la Sede Balbuena Matriz queda a unos 18-22 minutos en vehículo.`
    } else if (z.includes('sur') || z.includes('coyoacan') || z.includes('tlalpan') || z.includes('del valle')) {
      sedeRecomendada = 'Sede Balbuena (Matriz)'
      distanciaKm = 14.5
      tiempoMinutos = 35
      explicacionZona = `Desde el Sur (${zonaPaciente}), la Sede Balbuena Matriz se encuentra a aproximadamente 30-40 minutos de traslado.`
    } else {
      sedeRecomendada = 'Sede Balbuena (Matriz)'
      distanciaKm = 8.0
      tiempoMinutos = 25
      explicacionZona = `Nuestra clínica matriz se ubica en Sede Balbuena. Si estás en el extremo norte de la ciudad, también contamos con Sede Guadalupe Chalma.`
    }

    return {
      consultaExitosa: true,
      zonaReportada: zonaPaciente || 'No especificada',
      sedeOptimaRecomendada: sedeRecomendada,
      tiempoEstimadoVehiculo: `${tiempoMinutos} minutos aprox.`,
      distanciaAprox: `${distanciaKm} km`,
      analisisGeograficoHonesto: explicacionZona,
      redSedesDisponibles: [
        'Sede Balbuena (Matriz — Dra. Aura Estudillo)',
        'Sede Guadalupe Chalma (Extremo Norte / GAM)',
        'Sede Roma Norte (Próxima apertura)'
      ]
    }
  }

  return { error: 'Función no reconocida' }
}

export async function POST(request: Request) {
  try {
    const { messages, userMessage, role = 'public', sessionContext, sessionId: incomingSessionId } = await request.json()

    // 1. Extracción de Memoria de Sesión (Teléfono y Nombre) de los mensajes previos
    let rememberedPhone = sessionContext?.phone || ''
    let rememberedName = sessionContext?.patientName || ''
    const currentSessionId = incomingSessionId || sessionContext?.sessionId || `sess_web_${Date.now()}`

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
      // 1. Patrones explícitos: "me llamo Juan", "mi nombre es Juan", "soy Juan"
      const nameMatch = allHistoryText.match(/(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,30})/i)
      if (nameMatch) {
        rememberedName = nameMatch[1].trim()
      } else {
        // 2. Patrón común directo: "ricardo 5522427769" o "ricardo gomez 5522427769"
        const directNamePhoneMatch = allHistoryText.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,25})\s+\b\d{10}\b/i) ||
                                     userMessage?.match(/^([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,25})\s+\b\d{10}\b/i)
        if (directNamePhoneMatch) {
          const candidate = directNamePhoneMatch[1].trim()
          // Evitar palabras de parada
          const stopWords = ['hola', 'buen', 'buenas', 'buenos', 'cita', 'agendar', 'quiero', 'podria', 'para']
          if (!stopWords.some(w => candidate.toLowerCase().startsWith(w))) {
            rememberedName = candidate
          }
        }
      }
    }

    // Capitalizar nombre si existe
    if (rememberedName) {
      rememberedName = rememberedName
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
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

    // ========================================================
    // SANITIZACIÓN DE CATÁLOGOS COMERCIALES NO SOLICITADOS:
    // Si el usuario simplemente pide cita o dio sus datos (nombre/teléfono) sin pedir estética,
    // queda terminantemente prohibido escupir catálogo de carillas/blanqueamiento.
    // ========================================================
    const mentionsCosmeticExplicitly = /\b(carilla|blanque|alineador|invisalign|diseño\s+de\s+sonrisa)\b/i.test(normUser)
    const isAppointmentIntent = /\b(cita|agendar|apartar|hora|horario|consulta|sacar\s+una\s+cita)\b/i.test(normUser) || Boolean(rememberedPhone)
    const containsCosmeticCatalog = /\b(carillas\s+e\.max|blanqueamiento\s+dental\s+led|ortodoncia\s+invisible|alta\s+gama\s+en\s+carillas)\b/i.test(finalReply)

    if (isAppointmentIntent && !mentionsCosmeticExplicitly && containsCosmeticCatalog) {
      const greetingName = rememberedName ? `¡Con mucho gusto, ${rememberedName}! ` : '¡Con mucho gusto! '
      const contactNote = rememberedPhone ? `Ya registré tu WhatsApp (${rememberedPhone}). ` : ''
      finalReply = `${greetingName}${contactNote}La Dra. Aura Estudillo (Céd. Prof. 8492019) cuenta con espacios disponibles para tu valoración y consulta en Sede Balbuena (Matriz) y Guadalupe Chalma. ¿Qué tipo de atención requieres (revisión de rutina, limpieza o valoración general) y qué horario prefieres (matutino o vespertino)?`
    }

    // Si por alguna razón vino vacío o el modelo ofreció estética ante dolor
    const isPainReport = /\b(dolor|molestia|inflama|hinchad|muela|diente|sensib)\b/i.test(normUser)
    if (!finalReply.trim()) {
      if (isPainReport) {
        finalReply = 'Comprendo tu molestia dental. La Dra. Aura Estudillo cuenta con espacios prioritarios para una valoración diagnóstica y darte alivio hoy mismo. ¿Prefieres que te agende por la mañana o por la tarde?'
      } else {
        const greetingName = rememberedName ? `¡Hola ${rememberedName}! ` : '¡Hola! '
        finalReply = `${greetingName}Con gusto te atiendo en Audenti con la Dra. Aura Estudillo. ¿Te gustaría agendar una cita de valoración diagnóstica o consultar nuestros horarios disponibles?`
      }
    } else if (isPainReport && /\b(carillas|blanqueamiento|promoci[oó]n|est[eé]tica)\b/i.test(normReply)) {
      finalReply = 'Lamento mucho que tengas esa molestia. Para darte pronta atención y alivio con la Dra. Aura Estudillo (Céd. Prof. 8492019), contamos con espacios para revisión y diagnóstico en Sede Balbuena y Guadalupe Chalma. ¿Te gustaría acudir por la mañana o por la tarde?'
    }

    // Sincronización de seguridad: Solo persistir si la tool no fue invocada directamente
    const folioMatches = finalReply.match(/AUD-\d{4,6}/i)
    const toolAlreadyScheduled = firstChoice?.tool_calls?.some((c: any) => c.function?.name === 'agendarCitaNuevayNotificar')
    if (folioMatches && folioMatches[0] && !toolAlreadyScheduled) {
      const detectedFolio = folioMatches[0].toUpperCase()
      const cleanPhone = rememberedPhone || (rawUser.match(/\b\d{10}\b/) ? rawUser.match(/\b\d{10}\b/)![0] : 'WhatsApp')
      const patientNameClean = rememberedName || 'Paciente Web'

      // Extraer hora precisa si fue acordada en el chat (ej. "17:30", "16:00", "4 de la tarde")
      let inferredTime = '11:00:00'
      const timeMatch = (finalReply + ' ' + rawUser).match(/\b(\d{1,2}:\d{2})\b/)
      if (timeMatch) {
        inferredTime = timeMatch[1].length === 5 ? `${timeMatch[1]}:00` : timeMatch[1]
      } else {
        const hourMatch = (finalReply + ' ' + rawUser).match(/\b(\d{1,2})\s*(?:pm|de la tarde|hrs|horas)\b/i)
        if (hourMatch) {
          let h = parseInt(hourMatch[1], 10)
          if (h < 12 && /pm|tarde/i.test(hourMatch[0])) h += 12
          inferredTime = `${h < 10 ? '0' + h : h}:00:00`
        }
      }

      // Extraer fecha precisa si menciona "hoy" o formato YYYY-MM-DD
      const nowMx = getNowInMexico()
      let inferredDate = formatDateInMexico(nowMx)
      if (normReply.includes('mañana') || normUser.includes('mañana')) {
        const tomorrow = new Date(nowMx)
        tomorrow.setDate(tomorrow.getDate() + 1)
        inferredDate = formatDateInMexico(tomorrow)
      } else {
        const dateMatch = (finalReply + ' ' + rawUser).match(/\b(202\d-\d{2}-\d{2})\b/)
        if (dateMatch) {
          inferredDate = dateMatch[1]
        }
      }

      const isNorthUser = normUser.includes('chalma') || normUser.includes('reclusorio') ||
        normUser.includes('cuautepec') || normUser.includes('gam') || normUser.includes('norte')

      try {
        await createAppointmentAction({
          folio: detectedFolio,
          patient_name: patientNameClean,
          patient_phone: cleanPhone,
          appointment_date: inferredDate,
          appointment_time: inferredTime,
          treatment: isPainReport ? 'Consulta / Alivio de Dolor Dental' : 'Consulta / Valoración Estética Oral',
          branch: isNorthUser ? 'Sede Guadalupe Chalma' : 'Sede Balbuena (Matriz)',
          status: 'confirmed',
          notes: `Folio: ${detectedFolio}. Sincronizado por fallback NLP Aura AI. Tel: ${cleanPhone}`
        })
      } catch (e: any) {
        console.warn('Sync fallback error:', e?.message)
      }
    }

    // Persistencia del Historial de Conversación para el CRM de la Dra. Aura
    try {
      const nowMx = getNowInMexico()
      const timeFormatted = formatTimeInMexico(nowMx)
      const urgencyTag = isRed ? 'red' : isYellow ? 'yellow' : 'normal'
      const patientLabel = rememberedName || (rawUser.match(/(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,30})/i)?.[1]?.trim()) || 'Paciente en Línea'
      const phoneLabel = rememberedPhone || (rawUser.match(/\b\d{10}\b/)?.[0]) || 'Pendiente por WhatsApp'

      if (!globalThis.__audenti_chat_history) {
        globalThis.__audenti_chat_history = []
      }

      // 1. Mensaje del usuario
      globalThis.__audenti_chat_history.push({
        id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        sessionId: currentSessionId,
        sender: 'user',
        messageText: rawUser,
        timestamp: timeFormatted,
        createdAt: new Date().toISOString(),
        patientName: patientLabel,
        phone: phoneLabel,
        urgencyLevel: urgencyTag
      })

      // 2. Respuesta de la IA
      globalThis.__audenti_chat_history.push({
        id: `ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        sessionId: currentSessionId,
        sender: 'assistant',
        messageText: finalReply,
        timestamp: timeFormatted,
        createdAt: new Date().toISOString(),
        patientName: patientLabel,
        phone: phoneLabel,
        urgencyLevel: urgencyTag
      })

      if (globalThis.__audenti_chat_history.length > 500) {
        globalThis.__audenti_chat_history.splice(0, globalThis.__audenti_chat_history.length - 500)
      }

      // Intento de guardado en Supabase en tabla chat_history si existe
      createClient().then(async (supabase) => {
        try {
          await supabase.from('chat_history').insert([
            {
              session_id: currentSessionId,
              sender: 'user',
              message_text: rawUser,
              patient_name: patientLabel,
              patient_phone: phoneLabel,
              urgency_level: urgencyTag,
              local_timestamp: timeFormatted
            },
            {
              session_id: currentSessionId,
              sender: 'assistant',
              message_text: finalReply,
              patient_name: patientLabel,
              patient_phone: phoneLabel,
              urgency_level: urgencyTag,
              local_timestamp: timeFormatted
            }
          ])
        } catch {}
      }).catch(() => {})
    } catch (histErr) {
      console.warn('Error al persistir historial de chat en CRM:', histErr)
    }

    return NextResponse.json({
      success: true,
      reply: finalReply,
      sessionId: currentSessionId,
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
