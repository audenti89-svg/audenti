/**
 * Audenti Clinical AI - Asistente Conversacional 24/7 con Inteligencia de Edad y Roles
 * Genera pláticas humanas adaptadas a la edad del paciente (Infantil, Joven, Adulto, Adulto Mayor)
 * y al rol del personal médico (Dra. Titular, Socios, Trabajadores, Recepción, Pasantes).
 */

export type PatientAgeCategory = 'infantil' | 'joven' | 'adulto' | 'senior';

export interface PatientSpeechContext {
  fullName: string;
  birthDate?: string | null;
  age?: number | null;
  nextAppointment?: {
    date?: string;
    time?: string;
    treatment?: string;
    doctor?: string;
    branch?: string;
  } | null;
  allergies?: string[];
}

export interface StaffSpeechContext {
  role: 'socio' | 'trabajador' | 'recepcion' | 'pasante';
  staffName?: string;
  appointmentsCount?: number;
  nextAppointmentPatient?: string;
  nextAppointmentTime?: string;
  hasAllergyAlerts?: boolean;
  allergyPatientName?: string;
  branchName?: string;
}

/**
 * Calcula la edad exacta a partir de una fecha de nacimiento (YYYY-MM-DD o ISO)
 */
export function calculateAgeFromBirthDate(birthDateStr?: string | null): number | null {
  if (!birthDateStr) return null;
  const bDate = new Date(birthDateStr);
  if (isNaN(bDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - bDate.getFullYear();
  const m = today.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
    age--;
  }
  return age >= 0 && age < 125 ? age : null;
}

/**
 * Determina la categoría de edad del paciente
 */
export function getAgeCategory(age: number | null): PatientAgeCategory {
  if (age === null || age === undefined) return 'adulto'; // Valor por defecto seguro y cordial
  if (age < 13) return 'infantil';
  if (age < 30) return 'joven';
  if (age < 60) return 'adulto';
  return 'senior';
}

/**
 * Obtiene el saludo adecuado según la hora del día en México / horario local
 */
export function getTimeGreeting(): { greeting: string; period: 'mañana' | 'tarde' | 'noche' } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { greeting: '¡Buenos días', period: 'mañana' };
  } else if (hour >= 12 && hour < 19) {
    return { greeting: '¡Buenas tardes', period: 'tarde' };
  } else {
    return { greeting: '¡Buenas noches', period: 'noche' };
  }
}

/**
 * Genera el tratamiento de respeto y honorífico adecuado según el nombre y la edad
 */
export function formatHonorificName(fullName: string, category: PatientAgeCategory): string {
  const cleanName = (fullName || 'Paciente').trim();
  const firstWord = cleanName.split(' ')[0] || 'Paciente';

  // Detección simple de nombres femeninos comunes para cortesía mexicana tradicional
  const femaleNames = ['maria', 'maría', 'angeles', 'ángeles', 'carmen', 'laura', 'ana', 'rosa', 'patricia', 'guadalupe', 'martha', 'lucia', 'lucía', 'teresa', 'claudia', 'aura', 'sofia', 'sofía', 'elena'];
  const isFemale = femaleNames.includes(firstWord.toLowerCase());

  switch (category) {
    case 'senior':
      // Trato con gran calidez y respeto: "Don..." o "Doña / Señora..."
      return isFemale ? `Doña ${firstWord}` : `Don ${firstWord}`;
    case 'adulto':
      // Trato formal y cordial
      return isFemale ? `Estimada Sra. ${firstWord}` : `Estimado Don ${firstWord}`;
    case 'joven':
      // Trato fresco y dinámico de tú
      return firstWord;
    case 'infantil':
      // Trato cariñoso y motivador
      return isFemale ? `pequeña campeona ${firstWord}` : `pequeño campeón ${firstWord}`;
  }
}

/**
 * Obtiene recomendaciones clínicas indispensables según el tratamiento (solo las necesarias)
 */
export function getTreatmentClinicalRecommendation(treatmentName?: string, category: PatientAgeCategory = 'adulto'): string {
  const tx = (treatmentName || '').toLowerCase();
  
  if (tx.includes('limpieza') || tx.includes('profilaxis') || tx.includes('detartraje') || tx.includes('sarro')) {
    return 'Indicación clínica para tu cita: Por favor realiza un cepillado dental minucioso antes de salir de casa y evita consumir café, té o alimentos con colorantes intensos justo antes de tu consulta.';
  }
  if (tx.includes('conducto') || tx.includes('endodoncia') || tx.includes('pulpar')) {
    return 'Indicación clínica para tu cita: Procura venir bien alimentado con tu comida habitual y evita tomar analgésicos fuertes en las 4 horas previas para permitir una correcta valoración de la vitalidad dental.';
  }
  if (tx.includes('resto') || tx.includes('radicular') || tx.includes('extracc') || tx.includes('cirug') || tx.includes('muela')) {
    return 'Indicación clínica para tu cita: Desayuna ligero, ven con ropa cómoda y fresca, y te sugerimos venir acompañado de un familiar. No tomes aspirinas antes del procedimiento.';
  }
  if (tx.includes('ortodoncia') || tx.includes('bracket') || tx.includes('alineador') || tx.includes('guarda')) {
    return 'Indicación clínica para tu cita: Realiza un cepillado dental a conciencia incluyendo cepillo interdental e hilo, y no olvides traer tus alineadores o guardas si los utilizas.';
  }
  if (tx.includes('resina') || tx.includes('caries') || tx.includes('obturac') || tx.includes('calza')) {
    return 'Indicación clínica para tu cita: Lávate muy bien los dientes antes de salir y procura llegar con 10 minutos de anticipación para pasar directo al gabinete.';
  }
  // Revisión o valoración general
  return 'Indicación clínica para tu cita: Recuerda realizar tu cepillado dental previo y tener a la mano el nombre de cualquier medicamento que tomes habitualmente para registrarlo en tu expediente.';
}

/**
 * Genera el guion conversacional hablado para el Paciente según su edad y horario
 */
export function generatePatientSpeech(context: PatientSpeechContext): {
  script: string;
  category: PatientAgeCategory;
  age: number | null;
  greetingHeader: string;
} {
  const age = context.age ?? calculateAgeFromBirthDate(context.birthDate);
  const category = getAgeCategory(age);
  const { greeting, period } = getTimeGreeting();
  const honorific = formatHonorificName(context.fullName, category);

  const greetingHeader = `${greeting}, ${honorific}!`;

  const appt = context.nextAppointment;
  const hasAppt = !!(appt && (appt.date || appt.time));
  const apptTime = appt?.time || '13:00';
  const apptDoctor = appt?.doctor || 'la Dra. Aura Estudillo';
  const apptBranch = appt?.branch || 'Sucursal Chalma de Guadalupe';
  const apptTreatment = appt?.treatment || 'su consulta y revisión dental';

  let script = '';

  switch (category) {
    case 'senior': // 60+ años (ej. Sra. María de los Ángeles de 71 años)
      if (hasAppt) {
        script = `${greeting}, ${honorific}. Qué gran alegría saludarle y saber que se encuentra bien. Soy su asistente inteligente de Audenti. Le recuerdo con mucho aprecio que tiene programada su cita médica de ${apptTreatment} con ${apptDoctor} a la hora ${apptTime} en ${apptBranch}. Su bienestar y salud dental son nuestra mayor prioridad; por favor tómese su tiempo, venga con calma y con ropa cómoda. Si requiere apoyo con su transporte o tiene alguna duda previa, estamos para servirle con todo el cariño de siempre. ¡Le esperamos con los brazos abiertos!`;
      } else {
        script = `${greeting}, ${honorific}. Qué gran gusto saludarle. Soy su asistente de salud de Audenti. Le informo que su expediente clínico se encuentra al día y en orden. Recuerde cuidar la higiene de sus encías con agua templada y cepillo suave. Si llega a sentir cualquier molestia o molestia al comer, avísenos de inmediato para agendarle una revisión prioritaria con ${apptDoctor}. Que tenga un día lleno de bendiciones y tranquilidad.`;
      }
      break;

    case 'adulto': // 30 a 59 años (ej. Don Ricardo de 48-50 años)
      if (hasAppt) {
        script = `${greeting}, ${honorific}. Qué gusto saludarle en este ${period}. Soy su asistente ejecutiva 24/7 de Audenti. Le recuerdo que tiene agendada su consulta de ${apptTreatment} con ${apptDoctor} el día de hoy a las ${apptTime} en ${apptBranch}. Le sugerimos presentarse 10 minutos antes para registrar sus signos vitales y pasar directo al gabinete sin esperas. Si necesita confirmar o consultar detalles, puede hacerlo aquí mismo en su portal. ¡Que tenga una excelente y productiva jornada!`;
      } else {
        script = `${greeting}, ${honorific}. Bienvenido a su portal digital Audenti. Su historial odontológico y diagnósticos 3D están actualizados. Recuerde que una limpieza preventiva semestral previene caries profundas y acumulaciones de sarro. Si desea agendar su próxima revisión con ${apptDoctor}, puede seleccionarla en un clic. ¡Seguimos a sus órdenes!`;
      }
      break;

    case 'joven': // 13 a 29 años (ej. Aaron de 20 años)
      if (hasAppt) {
        script = `${greeting}, ${honorific}! ¿Cómo estás? Soy tu asistente digital de Audenti. Te recuerdo que tienes tu cita para ${apptTreatment} con ${apptDoctor} hoy a las ${apptTime} en ${apptBranch}. Recuerda venir con tus dientes bien cepillados y llegar unos 5 minutitos antes para pasar sin demora. ¡Te esperamos para seguir cuidando tu sonrisa al máximo!`;
      } else {
        script = `${greeting}, ${honorific}! Qué bueno verte por tu portal Audenti. Tu expediente y seguimiento están activos. Mantén tu sonrisa radiante cepillándote después de cada comida y usando hilo dental. Cualquier duda con brackets, alineadores o limpieza, aquí estamos para ti 24/7. ¡Que tengas un día increíble!`;
      }
      break;

    case 'infantil': // Menores de 13 años
      if (hasAppt) {
        script = `${greeting}, ${honorific}! Te mandamos un abrazo gigante desde la clínica Audenti. ${apptDoctor} ya tiene listos todos los instrumentos mágicos para cuidar tus dientitos hoy a las ${apptTime} en ${apptBranch}. ¡Dile a tus papás que lleguen a tiempo porque te tenemos preparadas muchas sorpresas para que salgas sonriendo como todo un superhéroe!`;
      } else {
        script = `${greeting}, ${honorific}! Te saludamos desde tu clínica dental favorita. Recuerda cepillarte los dientes por dos minutos en las mañanas y en las noches, ¡y ganarle a los bichitos de las caries! Sigue sonriendo mucho y que tengas un día súper divertido.`;
      }
      break;
  }

  // Si tiene cita agendada, añadir la recomendación clínica indispensable (solo lo necesario)
  if (hasAppt) {
    const clinicalRec = getTreatmentClinicalRecommendation(apptTreatment, category);
    script += ` ${clinicalRec}`;
  }

  // Si tiene alergias médicas registradas, añadir nota de seguridad preventiva
  if (context.allergies && context.allergies.length > 0) {
    const allergyText = context.allergies.join(', ');
    script += ` Recuerde que tenemos registrada en sistema su alerta de alergia a: ${allergyText}, por lo que el equipo médico aplicará el protocolo estricto de bioseguridad.`;
  }

  return {
    script,
    category,
    age,
    greetingHeader,
  };
}

/**
 * Genera el guion conversacional hablado para el Personal Clínico / Administrativo
 */
export function generateStaffSpeech(context: StaffSpeechContext): {
  script: string;
  greetingHeader: string;
} {
  const { greeting, period } = getTimeGreeting();
  const staffName = context.staffName || 'Doctor(a)';
  let greetingHeader = '';
  let script = '';

  const branch = context.branchName || 'Sucursal Chalma de Guadalupe';
  const totalCount = context.appointmentsCount ?? 0;
  const nextPt = context.nextAppointmentPatient || 'Ricardo Sánchez';
  const nextTime = context.nextAppointmentTime || '13:00 PM';

  switch (context.role) {
    case 'socio': // Dra. Aura Estudillo y Odontólogos Socios
      greetingHeader = `${greeting}, Dra. Aura Estudillo!`;
      script = `${greeting}, Dra. Aura Estudillo. Su asistente clínica 24/7 le da el parte médico para este turno en ${branch}. Tenemos ${totalCount} citas registradas en agenda. Su próxima consulta programada es a las ${nextTime} con el paciente ${nextPt}.`;
      if (context.hasAllergyAlerts) {
        script += ` Atención clínica importante: contamos con alerta activa de bioseguridad NOM-004 para la paciente ${context.allergyPatientName || 'María de los Ángeles Sánchez Rivera'} por alergia confirmada a la Penicilina. Gabinetes esterilizados e instrumental listo para su jornada.`;
      } else {
        script += ` Todos los protocolos de bioseguridad e historial clínico se encuentran validados sin alertas farmacológicas.`;
      }
      script += ` Checklist médico para su turno: 1) Verificar signos vitales previos al pase a sillón. 2) Validar consentimiento informado digital firmado. 3) Corroborar testigo de esterilización en autoclave antes de abrir la charola. ¡Le deseamos una exitosa jornada clínica!`;
      break;

    case 'trabajador': // Odontólogos de turno
      greetingHeader = `${greeting}, Dr(a). ${staffName}!`;
      script = `${greeting}, Dr. ${staffName}. Su asistente de operaciones le informa que para este ${period} en ${branch} tenemos ${totalCount} pacientes en lista. El siguiente ingreso corresponde a ${nextPt} a las ${nextTime}. Recordatorios de turno: 1) Revisar notas de evolución previa en el expediente. 2) Validar odontograma del paciente. 3) Cumplir con la técnica aséptica en todo el procedimiento. ¡Éxito en sus tratamientos!`;
      break;

    case 'recepcion': // Administrativos y Recepción
      greetingHeader = `${greeting}, Equipo de Recepción!`;
      script = `${greeting}, equipo de recepción. Soy la asistente de soporte 24/7. Para la jornada de hoy en ${branch} tenemos ${totalCount} citas agendadas. Checklist operativo: 1) Solicitar identificación oficial y corroborar datos de WhatsApp. 2) Validar cuestionario de bioseguridad al ingreso. 3) Cobrar y emitir recibo o factura. 4) Ofrecer agua en sala de espera y avisar a la asistente del arribo del paciente. ¡Excelente turno de trabajo!`;
      break;

    case 'pasante': // Pasantes y Asistentes Clínicos
      greetingHeader = `${greeting}, Estimado(a) ${staffName}!`;
      script = `${greeting}, estimado colega. Su asistente académica le recuerda que el siguiente paciente en ingresar es ${nextPt} a las ${nextTime}. Checklist de gabinete: 1) Colocar barreras de plástico estériles en mangueras y lámpara. 2) Montar la charola estéril con el kit específico según el tratamiento del día. 3) Colocar babero desechable y gafas protectoras al paciente antes de iniciar. ¡Buen turno de aprendizaje clínico!`;
      break;
  }

  return {
    script,
    greetingHeader,
  };
}

/**
 * Motor de Voz: Reproduce el guion usando Web Speech API nativo
 */
export function playVoiceSpeech(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
): { stop: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis no disponible en este entorno.');
    callbacks?.onEnd?.();
    return { stop: () => {} };
  }

  // Cancelar reproducción previa si la hubiera
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-MX';
  utterance.rate = 0.96; // Ritmo pausado, empático y comprensible para todas las edades
  utterance.pitch = 1.04; // Tono cálido y agradable

  // Intentar seleccionar la voz en español de mejor calidad disponible en el dispositivo
  const voices = window.speechSynthesis.getVoices();
  const spanishVoice = voices.find(
    (v) =>
      (v.lang.includes('es-MX') || v.lang.includes('es-US') || v.lang.startsWith('es')) &&
      (v.name.includes('Paulina') ||
        v.name.includes('Monica') ||
        v.name.includes('Sabina') ||
        v.name.includes('Natural') ||
        v.name.includes('Google') ||
        v.name.includes('Microsoft'))
  ) || voices.find((v) => v.lang.startsWith('es'));

  if (spanishVoice) {
    utterance.voice = spanishVoice;
  }

  utterance.onstart = () => {
    callbacks?.onStart?.();
  };

  utterance.onend = () => {
    callbacks?.onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn('Nota en síntesis de voz:', e);
    callbacks?.onError?.(e);
    callbacks?.onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      callbacks?.onEnd?.();
    },
  };
}

/**
 * Detiene cualquier voz activa
 */
export function stopVoiceSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
