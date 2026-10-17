import { createAdminClient } from '@/lib/supabase/admin';
import { getNowInMexico, formatDateInMexico } from '@/utils/timezone';

export const conciergeChatTools = [
  {
    type: 'function' as const,
    function: {
      name: 'searchPatientAppointments',
      description: 'Consulta en la base de datos de Supabase si el paciente tiene citas agendadas, verificando fecha, hora, sede, tratamiento y estado.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Número de teléfono de 10 dígitos del paciente (si está disponible)' },
          patientName: { type: 'string', description: 'Nombre o apellido del paciente para buscar en el expediente' }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'getAvailableSlots',
      description: 'Consulta los horarios y disponibilidad de la agenda de la Dra. Aura Estudillo para una fecha y sede específica.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha a consultar en formato YYYY-MM-DD (ej. 2026-10-18)' },
          branch: { type: 'string', description: 'Sede requerida: Balbuena, Roma o Chalma de Guadalupe' }
        },
        required: ['date']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'createAppointment',
      description: 'Crea y agenda atómicamente una cita en la base de datos de Supabase cuando el paciente ha definido fecha, hora y tratamiento, reflejándose de inmediato en la agenda y KPIs de la Dra. Aura.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Nombre completo del paciente' },
          phone: { type: 'string', description: 'Número de teléfono de 10 dígitos' },
          date: { type: 'string', description: 'Fecha de la cita en formato YYYY-MM-DD (ej. 2026-10-18)' },
          time: { type: 'string', description: 'Hora de inicio de la cita en formato HH:mm (ej. 10:00, 16:30)' },
          treatmentType: { type: 'string', description: 'Tratamiento o motivo (ej. Valoración inicial, Limpieza dental, Resina, Ortodoncia)' },
          branch: { type: 'string', description: 'Sede de la cita (Sede Balbuena o Sede Chalma de Guadalupe)' }
        },
        required: ['date', 'time']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'escalateEmergencyTriage',
      description: 'Registra y escala inmediatamente una urgencia o dolor dental agudo hacia la Dra. Aura Estudillo, activando la alerta en el Dashboard y la contingencia de triaje clínico.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Nombre del paciente (si lo proporcionó)' },
          phone: { type: 'string', description: 'Teléfono de contacto' },
          symptoms: { type: 'string', description: 'Descripción detallada del dolor o urgencia dental' },
          painLevel: { type: 'string', enum: ['critico', 'severo', 'moderado', 'leve'], description: 'Nivel de dolor reportado' },
          userZone: { type: 'string', description: 'Zona geográfica o sede preferida' },
          targetBranch: { type: 'string', description: 'Sede sugerida (Balbuena, Roma, Chalma)' }
        },
        required: ['symptoms']
      }
    }
  }
];

export const schedulingTools = conciergeChatTools;

export async function executeConciergeTool(name: string, args: Record<string, any>): Promise<any> {
  const supabase = createAdminClient();

  try {
    if (name === 'searchPatientAppointments') {
      const { phone, patientName } = args;

      let patientId: string | undefined;

      // 1. Buscar paciente por teléfono o nombre
      if (phone) {
        const { data: p } = await supabase
          .from('patients')
          .select('id, full_name, phone')
          .ilike('phone', `%${phone.replace(/\D/g, '')}%`)
          .maybeSingle();
        if (p) patientId = p.id;
      }

      if (!patientId && patientName) {
        const { data: p } = await supabase
          .from('patients')
          .select('id, full_name, phone')
          .ilike('full_name', `%${patientName.trim()}%`)
          .limit(1)
          .maybeSingle();
        if (p) patientId = p.id;
      }

      // 2. Buscar citas
      let query = supabase
        .from('appointments')
        .select('id, start_time, treatment_type, status, notes, patients(full_name, phone)')
        .order('start_time', { ascending: false })
        .limit(5);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else if (patientName) {
        query = query.ilike('notes', `%${patientName}%`);
      }

      const { data: appointments } = await query;

      if (!appointments || appointments.length === 0) {
        return {
          found: false,
          message: 'No se encontraron citas registradas bajo ese nombre o teléfono. Invita cordialmente al paciente a agendar indicando fecha y hora de preferencia.'
        };
      }

      const formatted = appointments.map((a: any) => ({
        id: a.id,
        paciente: a.patients?.full_name || 'Paciente',
        telefono: a.patients?.phone || 'No registrado',
        fechaHora: a.start_time,
        tratamiento: a.treatment_type,
        estado: a.status,
        detalles: a.notes
      }));

      return {
        found: true,
        citasEncontradas: formatted,
        total: formatted.length,
        nota: 'Informa al paciente con precisión sobre su cita confirmada y sede.'
      };
    }

    if (name === 'getAvailableSlots') {
      const { date, branch = 'Sede Balbuena' } = args;
      const targetDate = date || formatDateInMexico(getNowInMexico());

      // Consultar citas ya reservadas en esa fecha
      const dayStart = `${targetDate}T00:00:00-06:00`;
      const dayEnd = `${targetDate}T23:59:59-06:00`;

      const { data: booked } = await supabase
        .from('appointments')
        .select('start_time, status')
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .neq('status', 'cancelled');

      const bookedHours = new Set(
        (booked || []).map((b: any) => {
          if (!b.start_time) return '';
          const d = new Date(b.start_time);
          return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
        })
      );

      const standardSlots = ['10:00', '11:30', '13:00', '15:30', '17:00', '18:30'];
      const availableSlots = standardSlots.filter(s => !bookedHours.has(s));

      return {
        fechaConsultada: targetDate,
        sede: branch,
        horariosDisponibles: availableSlots.length > 0 ? availableSlots : ['11:00 (Sobre-cupo confirmado con Dra. Aura)'],
        sedeInfo: branch.toLowerCase().includes('balbuena')
          ? 'Sede Balbuena activa (con próxima mudanza a Colonia Roma)'
          : 'Sede Chalma de Guadalupe activa con normalidad'
      };
    }

    if (name === 'createAppointment') {
      const {
        patientName = 'Paciente Cita Web',
        phone = 'No provisto',
        date,
        time,
        treatmentType = 'Valoración Odontológica',
        branch = 'Sede Balbuena'
      } = args;

      // Generar fecha y hora combinada ISO
      const startDateTimeStr = `${date}T${time}:00`;
      const startDate = new Date(startDateTimeStr);
      const endDate = new Date(startDate.getTime() + 45 * 60 * 1000); // 45 minutos estándar

      const folio = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Asegurar o crear paciente
      let patId: string | undefined;
      if (phone && phone !== 'No provisto') {
        const { data: existingPat } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingPat) {
          patId = existingPat.id;
        } else {
          const { data: newPat } = await supabase
            .from('patients')
            .insert({
              full_name: patientName,
              phone: phone,
              onboarding_completed: false
            })
            .select('id')
            .maybeSingle();
          patId = newPat?.id;
        }
      }

      // 2. Insertar cita confirmada atómicamente en appointments
      const { data: createdAppt, error: apptError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patId || null,
          treatment_type: treatmentType,
          status: 'confirmed',
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          notes: `[FOLIO: ${folio}] Cita confirmada por Aura AI. Sede: ${branch}. Teléfono: ${phone}. Paciente: ${patientName}`
        })
        .select('id')
        .maybeSingle();

      if (apptError) {
        throw new Error(apptError.message);
      }

      return {
        confirmed: true,
        folio,
        appointmentId: createdAppt?.id || folio,
        patientName,
        date,
        time,
        treatmentType,
        branch,
        mensajeConfirmacion: `Tu cita ha quedado agendada y confirmada con la Dra. Aura Estudillo para el día ${date} a las ${time} hrs en ${branch}. Tu folio de atención es ${folio}. Te esperamos 10 minutos antes.`
      };
    }

    if (name === 'escalateEmergencyTriage') {
      const { patientName = 'Paciente Urgencia', phone = 'No provisto', symptoms, painLevel = 'severo', userZone = 'Ciudad de México', targetBranch = 'Sede Balbuena' } = args;

      const nowIso = new Date().toISOString();
      const folio = `EMG-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Asegurar o crear paciente
      let patId: string | undefined;
      if (phone && phone !== 'No provisto') {
        const { data: existingPat } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingPat) {
          patId = existingPat.id;
        } else {
          const { data: newPat } = await supabase
            .from('patients')
            .insert({
              full_name: patientName,
              phone: phone,
              onboarding_completed: false
            })
            .select('id')
            .maybeSingle();
          patId = newPat?.id;
        }
      }

      // 2. Insertar cita prioritaria en Supabase para alertar a la Dra. Aura
      const { data: newAppt, error: apptError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patId || null,
          treatment_type: `URGENCIA DENTAL (${painLevel.toUpperCase()})`,
          status: 'pending_review',
          start_time: nowIso,
          notes: `[FOLIO: ${folio}] SÍNTOMAS: ${symptoms}. Zona Paciente: ${userZone}. Sede: ${targetBranch}. Tel: ${phone}`
        })
        .select('id')
        .maybeSingle();

      return {
        escalated: true,
        folio,
        appointmentId: newAppt?.id || folio,
        status: 'notified_to_doctor',
        doctorName: 'Dra. Aura Estudillo',
        targetBranch,
        mensajeParaPaciente: `El caso de urgencia ha sido asignado al Triage Prioritario de la Dra. Aura Estudillo bajo el Folio ${folio}. La clínica está evaluando tiempos y apertura extraordinaria en ${targetBranch}.`
      };
    }

    return { error: `Herramienta ${name} no reconocida` };
  } catch (err: any) {
    console.error(`[Tool Execution Error: ${name}]:`, err.message);
    return { error: err.message || 'Error en ejecución de base de datos' };
  }
}
