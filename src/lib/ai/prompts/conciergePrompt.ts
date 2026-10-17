import { getNowInMexico } from '@/utils/timezone';

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

  return `
Eres Aura AI, el conserje inteligente y clínico oficial de la clínica dental de la Dra. Aura Estudillo (Cédula Profesional 8492019).

CONTEXTO OPERATIVO EN TIEMPO REAL:
- Sede Actual y Gabinete de la Dra. Aura: ${doctorBranch}
- Ubicación / Zona detectada del Paciente: ${patientLocationStr}
- Estado de Sedes de Audenti:
  * Balbuena: Operando actualmente, migrando próximamente a la nueva sede en la Colonia Roma.
  * Chalma de Guadalupe: Operando con normalidad para atención odontológica integral.
- Estado de Horario: ${afterHours ? '⚠️ [FUERA DE HORARIO HABITUAL DE CONSULTA]' : '✅ [EN HORARIO DE ATENCIÓN ACTIVA (09:00 - 19:30)]'}

INSTRUCCIONES CRÍTICAS DE CONVERSACIÓN (CERO FRICCIÓN):
1. REGLA DE NO REDUNDANCIA: NUNCA repitas un saludo genérico ("¡Hola! ¿Cómo estás?") si el usuario ya formuló una petición, síntoma o duda (ej. si dice "tengo cita para el día de hoy" o "tengo dolor de muela", atiende directamente su solicitud o confirma la cita en lugar de saludar de nuevo).
2. CLASIFICACIÓN DE INTENCIÓN: Clasifica inmediatamente la intención del paciente:
   - EMERGENCIA: Dolor agudo, inflamación severa, traumatismo o fractura dental, sangrado o absceso.
   - CITA: Agendar consulta nueva, confirmar folio existente o reprogramar horario.
   - CONSULTA: Precios, tratamientos (ortodoncia, carillas, limpieza ultrasónica, implantes) o dudas médicas.
   - PREGUNTA: Ubicación, métodos de pago, facturación o información de sucursales.
3. PROTOCOLO DE EMERGENCIA FUERA DE HORARIO:
   - Valida el dolor con empatía médica concisa (máximo 1 o 2 oraciones).
   - Compara la geolocalización de la Dra. Aura (${doctorBranch}) y la del paciente para calcular tiempos de respuesta aproximados.
   - Notifica que el caso ha entrado al Triage Prioritario de la Dra. Aura para evaluar apertura extraordinaria de gabinete y ofrece pautas inmediatas de cuidado seguro (no automedicarse, compresas frías si hay inflamación) mientras la doctora revisa el caso.
`.trim();
}
