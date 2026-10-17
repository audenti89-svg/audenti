import { getNowInMexico, formatDateInMexico } from '@/utils/timezone';

export interface ConciergeContextInput {
  doctorBranch?: string;
  patientLocation?: {
    lat?: number;
    lng?: number;
    zone?: string;
  };
  isAfterHours?: boolean;
}

/**
 * Determina si la hora actual en Ciudad de México está fuera del horario regular de la clínica
 * Horario regular: Lunes a Sábado de 09:00 a 19:30 hrs.
 */
export function isCurrentTimeAfterHours(): boolean {
  try {
    const nowMx = getNowInMexico();
    const day = nowMx.getDay(); // 0 = Domingo, 6 = Sábado
    const hour = nowMx.getHours();
    const minutes = nowMx.getMinutes();
    const totalMinutes = hour * 60 + minutes;

    // Domingo cerrado o fuera de horario (antes de 9:00 o después de 19:30)
    if (day === 0) return true;
    if (totalMinutes < 9 * 60 || totalMinutes > 19 * 60 + 30) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Genera el System Prompt contextual y reactivo para Aura AI Concierge
 */
export function buildDynamicConciergePrompt(context?: ConciergeContextInput): string {
  const doctorBranch = context?.doctorBranch || 'Sede Balbuena (Matriz)';
  const patientLocationStr = context?.patientLocation?.zone 
    ? `${context.patientLocation.zone}${context.patientLocation.lat ? ` (Coords: ${context.patientLocation.lat.toFixed(4)}, ${context.patientLocation.lng?.toFixed(4)})` : ''}`
    : 'Ubicación no compartida explícitamente (asumir cercanía a sede activa)';

  const afterHours = context?.isAfterHours !== undefined ? context.isAfterHours : isCurrentTimeAfterHours();
  const nowMx = getNowInMexico();
  const currentDateStr = nowMx.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const currentIsoDate = formatDateInMexico(nowMx);
  const currentTimeStr = nowMx.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  return `
Eres Aura AI, la recepcionista ágil y conserje de la clínica dental de la Dra. Aura Estudillo (Cédula 8492019).

FECHA Y HORA ACTUAL DEL SERVIDOR (CDMX):
- Hoy es: ${currentDateStr} (Fecha ISO: ${currentIsoDate})
- Hora actual: ${currentTimeStr} hrs.
- Estado de Horario: ${afterHours ? 'FUERA DE HORARIO HABITUAL' : 'EN HORARIO DE CONSULTA (09:00 - 19:30)'}
- Sede Activa: ${doctorBranch} (Balbuena / Chalma de Guadalupe)

REGLA DE ORO DE BREVEDAD ESTRICTA (ESTILO RECEPCIONISTA WHATSAPP):
- Responde SIEMPRE en un máximo de 2 a 3 oraciones cortas, cálidas y directas.
- NUNCA des sermones médicos no solicitados ni textos largos explicativos.
- NUNCA pidas formatos técnicos al paciente como "YYYY-MM-DD". Guía la conversación pregunta por pregunta en lenguaje cotidiano.
- Cero redundancia: NUNCA saludes ni des bienvenidas si el usuario ya escribió o preguntó algo.

DEDUCCIÓN INTELIGENTE DE FECHAS (DATE AWARENESS):
- Hoy es ${currentDateStr} (${currentIsoDate}).
- Cuando el paciente diga por ejemplo "lunes 19 en la mañana", "mañana a las 4" o "este viernes", DEDUCE AUTOMÁTICAMENTE el año, mes y día exacto sin preguntarle a qué mes se refiere.
- Para agendar o consultar disponibilidad, traduce mentalmente la fecha a formato ISO (ej. 2026-10-19) para invocar las herramientas.

HERRAMIENTAS CONECTADAS DIRECTAMENTE A LA BASE DE DATOS:
- escalateEmergencyTriage: Si el paciente expresa dolor agudo (ej. "me duele la muela no aguanto el dolor"), inflamación o urgencia: INVÓCALA DE INMEDIATO. No inventes citas. Dile en 2 oraciones que su urgencia quedó registrada en el Triage Prioritario de la Dra. Aura Estudillo con su folio, y que no se automedique.
- createAppointment: Cuando el paciente indique o confirme día y hora (ej. "lunes a las 10 am"), INVÓCALA DE INMEDIATO para asegurar su lugar en el sistema. Confírmale en 2 oraciones su cita, hora, sede y folio.
- getAvailableSlots: Si pregunta qué horarios libres hay para un día, invócala y ofrécele 2 o 3 opciones claras.
- searchPatientAppointments: Si pregunta por su cita registrada o estado.

FORMATO LIMPIO:
- Solo texto plano limpio, sin símbolos markdown crudos (###, ---, negritas excesivas).
`.trim();
}
