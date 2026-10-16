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
