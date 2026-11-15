// Helper de Zona Horaria Oficial de Audenti: America/Mexico_City (GMT-6)

export const TIMEZONE_MEXICO = 'America/Mexico_City'

/**
 * Obtiene la fecha y hora actual en la zona horaria de la Ciudad de México.
 */
export function getNowInMexico(): Date {
  const now = new Date()
  const mexicoTimeString = now.toLocaleString('en-US', { timeZone: TIMEZONE_MEXICO })
  return new Date(mexicoTimeString)
}

/**
 * Formatea una fecha o timestamp a formato legible de hora (HH:mm) en hora local de México.
 */
export function formatTimeInMexico(date?: Date | string | number): string {
  const d = date ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date) : new Date()
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE_MEXICO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

/**
 * Formatea una fecha a formato YYYY-MM-DD en hora local de México.
 */
export function formatDateInMexico(date?: Date | string | number): string {
  const d = date ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date) : new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_MEXICO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)

  const year = parts.find(p => p.type === 'year')?.value || '2026'
  const month = parts.find(p => p.type === 'month')?.value || '10'
  const day = parts.find(p => p.type === 'day')?.value || '15'
  return `${year}-${month}-${day}`
}

/**
 * Formatea una fecha a formato legible (ej. "Jueves, 15 de Octubre 2026") en hora local de México.
 */
export function formatPrettyDateInMexico(date?: Date | string | number): string {
  const d = date ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date) : new Date()
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE_MEXICO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d)
}

/**
 * Determina si una fecha/hora dada está Fuera de Horario Laboral en la Clínica:
 * - Lunes a Viernes de 6:00 p.m. a 9:00 a.m. (Horario laboral: 9:00 a.m. a 6:00 p.m.)
 * - Sábados después de las 2:00 p.m. (Horario laboral: 9:00 a.m. a 2:00 p.m.)
 * - Todo el Domingo (Cerrado)
 */
export function isOutsideBusinessHoursInMexico(date?: Date | string | number): boolean {
  const d = date ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date) : new Date()
  
  // Extraer día de la semana y hora en America/Mexico_City
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_MEXICO,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(d)

  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || '' // 'Mon', 'Tue', ... 'Sun'
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '12', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  const timeInMinutes = hour * 60 + minute

  // Domingo completo: fuera de horario
  if (weekdayStr === 'Sun') {
    return true
  }

  // Sábado: hábil de 9:00 a 14:00 (540 a 840 min). Después de 2:00 p.m. o antes de 9:00 a.m.: fuera de horario
  if (weekdayStr === 'Sat') {
    return timeInMinutes < 9 * 60 || timeInMinutes >= 14 * 60
  }

  // Lunes a Viernes: hábil de 9:00 a 18:00 (540 a 1080 min). Fuera de horario: 6:00 p.m. a 9:00 a.m.
  return timeInMinutes < 9 * 60 || timeInMinutes >= 18 * 60
}

export type IntentionCategory = 'Información' | 'Consulta' | 'Urgencia Médica'
export type TriageTrafficLight = 'green' | 'yellow' | 'red'

export type ClinicalDentalCategory =
  | 'URGENCIA_AGUDA'
  | 'REHABILITACION'
  | 'ENDODONCIA'
  | 'ORTODONCIA'
  | 'PERIODONCIA'
  | 'PREVENTIVA_GENERAL'
  | 'INFORMACION_SERVICIOS'

export interface ClinicalTriageEvaluation {
  intention: IntentionCategory
  trafficLight: TriageTrafficLight
  urgencyLevel: 'Urgente' | 'No Urgente'
  isOutsideHours: boolean
  suggestedReason: string
  clinicalCategory?: ClinicalDentalCategory
  requestedSchedule?: string | null
}

/**
 * Matriz Estricta de Semaforización y Triage de Intención Médica ECC (Audenti CRM):
 * REGLA DE ORO: La intención médica y patología del paciente predomina sobre la hora de contacto.
 * 
 * 🔴 ROJO (Urgencia Médica): Dolor agudo/pulsátil, traumatismo, avulsión, absceso, flemón, celulitis,
 *   alveolitis, pericoronaritis aguda o hemorragia activa.
 * 
 * 🟢 VERDE (Consulta / Cita): Solicitud de valoración o cita programada de rehabilitación, ortodoncia,
 *   endodoncia, periodoncia o preventiva.
 * 
 * 🟡 AMARILLO (Información): Preguntas generales de ubicación, preparación o dudas no urgentes.
 */
export function evaluateIntentionAndUrgency(
  text: string,
  timestamp?: Date | string | number
): ClinicalTriageEvaluation {
  const lower = (text || '').toLowerCase()
  const isOutside = isOutsideBusinessHoursInMexico(timestamp)

  // 1. Detección de Horario Solicitado (Extracción estructurada)
  let requestedSchedule: string | null = null
  const scheduleMatch = lower.match(/(?:(?:el\s+)?(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|hoy|mañana|pasado\s*mañana)|(?:a\s+las?\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|hrs?|horas?)?)|(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|hrs?|horas?))|(?:por\s+la\s+(?:tarde|mañana|noche)))/i)
  if (scheduleMatch) {
    requestedSchedule = scheduleMatch[0].trim()
  }

  // 2. Patologías Odontológicas Agudas de Urgencia (ROJO)
  const isTraumaOrAvulsion = /(?:trauma|golpe|accidente|ca[ií]da|fractur|quebr|rompi|astill|avulsi[oó]n|diente\s*(?:ca[ií]do|volado|arrancado)|diente\s*flojo|luxaci[oó]n|sangr|hemorragi)/i.test(lower)
  const isInfectionOrAbscess = /(?:pulpitis|absceso|flem[oó]n|celulitis|fistul|supura|pus|hinchad|inflamad|tumefacci[oó]n|alveolitis)/i.test(lower)
  const isWisdomPericoronitis = /(?:pericoronaritis|muela\s*del\s*juicio|tercer\s*molar|trismus|no\s*puedo\s*abrir\s*la\s*boca)/i.test(lower)
  const isAcutePain = /(?:dolor\s*(?:agudo|fuerte|insoportable|intenso|puls[aá]til|punzante|no\s*aguanto|terrible)|duele\s*(?:mucho|fuerte|horrible|demasiado)|no\s*aguanto|no\s*puedo\s*dormir|muela\s*picada|urgente|urgencia|emergencia)/i.test(lower)

  const hasAcutePainOrTrauma = isTraumaOrAvulsion || isInfectionOrAbscess || isWisdomPericoronitis || isAcutePain

  // 1. 🔴 ROJO: Urgencia Médica
  if (hasAcutePainOrTrauma) {
    let reason = 'Urgencia Médica: Dolor Agudo / Patología Dental'
    if (isTraumaOrAvulsion) reason = 'Urgencia Odontológica: Traumatismo Dental / Avulsión / Hemorragia'
    else if (isInfectionOrAbscess) reason = 'Urgencia Odontológica: Absceso Periapical / Flemón / Infección Aguda'
    else if (isWisdomPericoronitis) reason = 'Urgencia Odontológica: Pericoronaritis / Muela del Juicio'
    else if (isAcutePain) reason = 'Urgencia Odontológica: Dolor Pulpar Agudo / Pulpitis Irreversible'

    return {
      intention: 'Urgencia Médica',
      trafficLight: 'red',
      urgencyLevel: 'Urgente',
      isOutsideHours: isOutside,
      suggestedReason: reason,
      clinicalCategory: 'URGENCIA_AGUDA',
      requestedSchedule
    }
  }

  // 3. Especialidades Odontológicas Programadas (VERDE)
  const isEndodontics = /(?:endodoncia|conductos?|tratamiento\s*de\s*conducto|nervio|biopulpectom[ií]a)/i.test(lower)
  const isOrthodontics = /(?:ortodoncia|brackets|alineador|invisalign|chuecos|mordida|frenos)/i.test(lower)
  const isRehabOrProsthesis = /(?:corona|puente|pr[oó]tesis|implante|incrustaci[oó]n|zirconio|disilicato|rehabilitaci[oó]n)/i.test(lower)
  const isPeriodontics = /(?:periodon|gingivitis|enc[ií]as|raspado|curetaje|profilaxis\s*profunda)/i.test(lower)
  const isPreventiveOrCosmetic = /(?:limpieza|profilaxis|blanqueamiento|resina|sarro|est[eé]tica|sellador)/i.test(lower)
  const isGeneralAppointment = /(?:cita|agendar|programar|horario|disponib|turno|apartar|reservar|consulta|valoraci[oó]n|revisi[oó]n|chequeo)/i.test(lower)

  if (isEndodontics || isOrthodontics || isRehabOrProsthesis || isPeriodontics || isPreventiveOrCosmetic || isGeneralAppointment) {
    let reason = isOutside
      ? 'Solicitud de Cita / Valoración Dental (Registro Fuera de Horario)'
      : 'Programación de Cita / Consulta Odontológica'
    let cat: ClinicalDentalCategory = 'PREVENTIVA_GENERAL'

    if (isEndodontics) {
      reason = 'Consulta Especializada: Endodoncia / Terapia de Conductos'
      cat = 'ENDODONCIA'
    } else if (isOrthodontics) {
      reason = 'Consulta Especializada: Ortodoncia / Alineación Dental'
      cat = 'ORTODONCIA'
    } else if (isRehabOrProsthesis) {
      reason = 'Consulta Especializada: Rehabilitación Oral / Prótesis / Coronas'
      cat = 'REHABILITACION'
    } else if (isPeriodontics) {
      reason = 'Consulta Especializada: Periodoncia / Tratamiento Gingival'
      cat = 'PERIODONCIA'
    } else if (isPreventiveOrCosmetic) {
      reason = 'Consulta Odontológica: Prevención / Limpieza Ultrasónica / Resinas'
      cat = 'PREVENTIVA_GENERAL'
    }

    return {
      intention: 'Consulta',
      trafficLight: 'green',
      urgencyLevel: 'No Urgente',
      isOutsideHours: isOutside,
      suggestedReason: reason,
      clinicalCategory: cat,
      requestedSchedule
    }
  }

  // 4. 🟡 AMARILLO: Información
  return {
    intention: 'Información',
    trafficLight: 'yellow',
    urgencyLevel: 'No Urgente',
    isOutsideHours: isOutside,
    suggestedReason: 'Informes de Servicios, Ubicación o Cuidados Dentales',
    clinicalCategory: 'INFORMACION_SERVICIOS',
    requestedSchedule
  }
}
