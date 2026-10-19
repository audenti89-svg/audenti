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

/**
 * Matriz Estricta de Semaforización y Triage de Intención Médica (Audenti CRM):
 * REGLA DE ORO: La intención médica del paciente predomina sobre la hora de contacto.
 * 
 * 🟢 VERDE (Consulta / Cita): Si el usuario solicita agendar/programar una cita de valoración,
 *   limpieza, revisión o tratamiento (incluso si llama un sábado o domingo fuera de horario).
 * 
 * 🟡 AMARILLO (Información): Preguntas generales sobre precios, ubicación o servicios
 *   sin dolor ni urgencia.
 * 
 * 🔴 ROJO (Urgencia): ÚNICAMENTE si el paciente reporta dolor agudo, trauma, sangrado,
 *   inflamación, absceso o accidente dental.
 */
export function evaluateIntentionAndUrgency(
  text: string,
  timestamp?: Date | string | number
): {
  intention: IntentionCategory
  trafficLight: TriageTrafficLight
  urgencyLevel: 'Urgente' | 'No Urgente'
  isOutsideHours: boolean
  suggestedReason: string
} {
  const lower = (text || '').toLowerCase()
  const isOutside = isOutsideBusinessHoursInMexico(timestamp)

  // Patrones estrictos de dolor agudo, traumatismo, sangrado o inflamación (ROJO)
  const hasAcutePainOrTrauma = /(?:dolor\s*(?:agudo|fuerte|insoportable|intenso)?|duele\s*(?:mucho|fuerte|horrible)?|muela\s*picada|no\s*aguanto|aguanto|sangr|sangrado|inflamaci|inflamad|hinchad|absceso|pus|flem[oó]n|golpe|trauma|fractur|quebr|rompi|ca[ií]da|accidente|emergencia|urgente|urgencia)/i.test(lower)

  // Patrones de solicitud de cita o tratamiento médico (VERDE)
  const asksAppointmentOrTreatment = /(?:cita|agendar|programar|horario|disponib|turno|apartar|reservar|consulta|valoraci[oó]n|revisi[oó]n|limpieza|profilaxis|blanqueamiento|resina|ortodoncia|brackets|alineador|implante|corona|endodoncia|extracci[oó]n|pr[oó]tesis)/i.test(lower)

  // 1. 🔴 ROJO: Urgencia Médica (ÚNICAMENTE si el paciente reporta dolor, trauma, sangrado o inflamación)
  if (hasAcutePainOrTrauma) {
    return {
      intention: 'Urgencia Médica',
      trafficLight: 'red',
      urgencyLevel: 'Urgente',
      isOutsideHours: isOutside,
      suggestedReason: 'Urgencia Médica: Dolor Agudo / Traumatismo Dental'
    }
  }

  // 2. 🟢 VERDE: Consulta / Cita (Solicitud de cita de valoración, limpieza, revisión o tratamiento)
  // La intención predomina: incluso si llama fuera de horario, es una cita de consulta regular (No Urgente)
  if (asksAppointmentOrTreatment) {
    return {
      intention: 'Consulta',
      trafficLight: 'green',
      urgencyLevel: 'No Urgente',
      isOutsideHours: isOutside,
      suggestedReason: isOutside
        ? 'Solicitud de Cita / Valoración Dental (Registro Fuera de Horario)'
        : 'Programación de Cita / Consulta Odontológica'
    }
  }

  // 3. 🟡 AMARILLO: Información (Preguntas generales de precios, ubicación o servicios sin dolor ni urgencia)
  return {
    intention: 'Información',
    trafficLight: 'yellow',
    urgencyLevel: 'No Urgente',
    isOutsideHours: isOutside,
    suggestedReason: 'Informes de Precios, Ubicación o Servicios'
  }
}
