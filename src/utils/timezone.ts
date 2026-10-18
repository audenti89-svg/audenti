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

/**
 * Matriz de Intención y Clasificación de Urgencia Inteligente 24/7:
 * - Información / Pregunta: pregunta costos, ubicación o detalles sin dolor ni fecha de cita.
 * - Consulta / Cita: solicita programar procedimiento en horario hábil.
 * - Urgencia Médica: dolor agudo, inflamación, golpe, o si entra FUERA DE HORARIO manifestando molestia.
 */
export function evaluateIntentionAndUrgency(
  text: string,
  timestamp?: Date | string | number
): {
  intention: IntentionCategory
  urgencyLevel: 'Urgente' | 'No Urgente'
  isOutsideHours: boolean
  suggestedReason: string
} {
  const lower = (text || '').toLowerCase()
  const isOutside = isOutsideBusinessHoursInMexico(timestamp)

  const hasPainOrTrauma = /(?:dolor|duele|muela|aguanto|dolores|puntiagudo|fuerte|insoportable|sangr|sangrado|inflamaci|inflamad|hinchad|absceso|pus|golpe|fractur|quebr|rompi|ca[ií]da|accidente|infecci|emergencia|urgente|urgencia)/i.test(lower)
  const hasDiscomfort = /(?:molestia|molesta|sensibil|sensible|incomodidad|punzada|latido)/i.test(lower)
  const asksAppointment = /(?:cita|agendar|programar|horario|disponib|turno|apartar|reservar|consulta)/i.test(lower)

  // 1. Urgencia Médica
  // Si menciona dolor/trauma O entra fuera de horario manifestando molestia/dolor
  if (hasPainOrTrauma || (isOutside && (hasDiscomfort || hasPainOrTrauma))) {
    return {
      intention: 'Urgencia Médica',
      urgencyLevel: 'Urgente',
      isOutsideHours: isOutside,
      suggestedReason: hasPainOrTrauma ? 'Dolor Agudo / Traumatismo Dental' : 'Molestia Fuera de Horario Laboral'
    }
  }

  // 2. Consulta / Cita
  if (asksAppointment || /(?:limpieza|profilaxis|blanqueamiento|resina|ortodoncia|brackets|implante|corona|endodoncia|extraccion)/i.test(lower)) {
    return {
      intention: 'Consulta',
      urgencyLevel: isOutside ? 'Urgente' : 'No Urgente', // Si piden cita de emergencia fuera de horario se prioriza
      isOutsideHours: isOutside,
      suggestedReason: isOutside ? 'Solicitud de Cita Fuera de Horario' : 'Programación de Cita Odontológica'
    }
  }

  // 3. Información / Pregunta
  return {
    intention: 'Información',
    urgencyLevel: 'No Urgente',
    isOutsideHours: isOutside,
    suggestedReason: 'Consulta de Precios, Ubicación o Servicios'
  }
}
