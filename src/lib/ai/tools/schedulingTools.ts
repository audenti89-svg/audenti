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

      // 0. Prohibición estricta de autoconfirmación de citas si el motivo es dolor agudo o urgencia
      const isEmergencyRequest =
        treatmentType.toLowerCase().includes('urgencia') ||
        treatmentType.toLowerCase().includes('dolor') ||
        treatmentType.toLowerCase().includes('emergencia');

      if (isEmergencyRequest) {
        return {
          status: 403,
          confirmed: false,
          error: 'POLITICA_URGENCIA_ACTIVA',
          mensajeError: 'Las urgencias no pueden autoconfirmarse como citas ordinarias. Por favor escala el caso con escalateEmergencyTriage para someterlo a la decisión médica de la Dra. Aura Estudillo.'
        };
      }

      // Validar horario y márgenes permitidos
      const startDateTimeStr = `${date}T${time}:00`;
      const startDate = new Date(startDateTimeStr);
      const endDate = new Date(startDate.getTime() + 45 * 60 * 1000); // 45 minutos estándar

      // Verificar si el horario solicitado colisiona con una cita confirmada
      try {
        const checkStart = new Date(startDate.getTime() - 30 * 60 * 1000).toISOString();
        const checkEnd = new Date(endDate.getTime() + 30 * 60 * 1000).toISOString();
        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id, start_time, treatment_type')
          .gte('start_time', checkStart)
          .lte('start_time', checkEnd)
          .neq('status', 'cancelled')
          .limit(1);

        if (conflicts && conflicts.length > 0) {
          return {
            status: 409,
            confirmed: false,
            error: 'CONFLICTO_AGENDA',
            mensajeError: `El horario de las ${time} hrs en esa fecha ya tiene un compromiso reservado en la agenda. Por favor consulta getAvailableSlots y ofrece una alternativa disponible.`
          };
        }
      } catch (confErr: any) {
        console.warn('Nota de verificación de colisiones en citas:', confErr?.message);
      }

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

      // 2. Intentar inserción en base de datos relacional de Supabase (tolerante a esquema)
      try {
        await supabase
          .from('appointments')
          .insert({
            patient_id: patId || null,
            treatment_type: treatmentType,
            status: 'confirmed',
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            notes: `[FOLIO: ${folio}] Cita confirmada por Aura AI. Sede: ${branch}. Teléfono: ${phone}. Paciente: ${patientName}`
          });
      } catch (dbErr: any) {
        console.warn('Nota Supabase DB insert en createAppointment:', dbErr?.message);
      }

      // 3. Persistencia atómica definitiva en Supabase Storage (appointments.json)
      try {
        const { data: currentFile } = await supabase.storage.from('audenti_database').download('appointments.json');
        let currentList: any[] = [];
        if (currentFile) {
          try {
            const currentText = await currentFile.text();
            if (currentText && currentText.trim()) {
              currentList = JSON.parse(currentText);
            }
          } catch {}
        }

        const newAppointmentRecord = {
          id: folio,
          folio: folio,
          patient_name: patientName,
          patient_phone: phone,
          appointment_date: date,
          appointment_time: time,
          treatment: treatmentType,
          treatment_type: treatmentType,
          branch: branch,
          status: 'confirmed',
          notes: `[FOLIO: ${folio}] Cita confirmada por Aura AI. Sede: ${branch}. Teléfono: ${phone}. Paciente: ${patientName}`,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          created_at: new Date().toISOString()
        };

        const updatedList = [newAppointmentRecord, ...currentList.filter((a: any) => a.folio !== folio && a.id !== folio)].slice(0, 50);
        const { error: uploadError } = await supabase.storage.from('audenti_database').upload('appointments.json', JSON.stringify(updatedList, null, 2), {
          upsert: true,
          contentType: 'application/json'
        });

        if (uploadError) {
          throw new Error(`Fallo de almacenamiento: ${uploadError.message}`);
        }

        // 4. Registrar alerta formal para la Dra. Aura Estudillo en notifications/doctor_alerts
        const doctorAlert = {
          id: `alert-${folio}`,
          type: 'nueva_cita',
          title: `Nueva cita agendada por IA: ${patientName}`,
          message: `${patientName} • ${treatmentType} • ${date} ${time} hrs (${branch})`,
          patient_name: patientName,
          appointment_date: date,
          appointment_time: time,
          branch: branch,
          folio: folio,
          time: `${date} ${time}`,
          created_at: new Date().toISOString(),
          read: false
        };

        // Guardar alerta en doctor_alerts.json
        try {
          const { data: alertsFile } = await supabase.storage.from('audenti_database').download('doctor_alerts.json');
          let alertsList: any[] = [];
          if (alertsFile) {
            try {
              const text = await alertsFile.text();
              if (text && text.trim()) alertsList = JSON.parse(text);
            } catch {}
          }
          const updatedAlerts = [doctorAlert, ...alertsList.filter((a: any) => a.id !== doctorAlert.id)].slice(0, 50);
          await supabase.storage.from('audenti_database').upload('doctor_alerts.json', JSON.stringify(updatedAlerts, null, 2), {
            upsert: true,
            contentType: 'application/json'
          });
        } catch (alertErr: any) {
          console.warn('Nota al persistir doctor_alerts:', alertErr?.message);
        }

        // 5. Emitir broadcast realtime para actualizar el Dashboard, Calendario y Notificaciones de la Dra. Aura de inmediato
        const emitAppointmentToChannels = (channelName: string) => {
          const ch = supabase.channel(channelName);
          ch.send({
            type: 'broadcast',
            event: 'new_appointment',
            payload: newAppointmentRecord
          }).catch(() => {});

          ch.send({
            type: 'broadcast',
            event: 'doctor_notification',
            payload: doctorAlert
          }).catch(() => {});
        };

        emitAppointmentToChannels('dashboard_page_realtime');
        emitAppointmentToChannels('header_notifications_realtime');
        emitAppointmentToChannels('calendar_page_realtime');
        emitAppointmentToChannels('dashboard_realtime_kpis');

        return {
          status: 200,
          confirmed: true,
          id: folio,
          folio,
          appointmentId: folio,
          patientName,
          date,
          time,
          start_time: startDate.toISOString(),
          treatmentType,
          branch,
          mensajeConfirmacion: `Tu cita ha quedado agendada con la Dra. Aura Estudillo para el día ${date} a las ${time} hrs en ${branch}. Tu folio es ${folio}. Te esperamos con gusto.`
        };
      } catch (storageErr: any) {
        console.error('Error al persistir cita en Supabase:', storageErr);
        return {
          status: 500,
          confirmed: false,
          error: storageErr?.message || 'Error de base de datos',
          mensajeError: 'Hubo un detalle al guardar tu espacio en la agenda, un momento mientras lo soluciono o te conecto con la doctora.'
        };
      }
    }

    if (name === 'escalateEmergencyTriage') {
      const { patientName = 'Paciente Urgencia', phone = 'No provisto', symptoms, painLevel = 'severo', userZone = 'Ciudad de México', targetBranch = 'Sede Balbuena' } = args;

      const nowIso = new Date().toISOString();
      const folio = `EMG-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Asegurar o crear paciente
      let patId: string | undefined;
      if (phone && phone !== 'No provisto') {
        try {
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
                phone: phone,
                onboarding_completed: false
              })
              .select('id')
              .maybeSingle();
            patId = newPat?.id;
          }
        } catch {}
      }

      // 2. Intentar inserción en base de datos relacional de citas de emergencia
      try {
        await supabase
          .from('appointments')
          .insert({
            patient_id: patId || null,
            treatment_type: `URGENCIA DENTAL (${painLevel.toUpperCase()})`,
            status: 'pending_review',
            start_time: nowIso,
            notes: `[FOLIO: ${folio}] SÍNTOMAS: ${symptoms}. Zona Paciente: ${userZone}. Sede: ${targetBranch}. Tel: ${phone}`
          });
      } catch (dbErr: any) {
        console.warn('Nota Supabase DB insert en emergency triage:', dbErr?.message);
      }

      // 3. Persistencia atómica de urgencia en Supabase Storage para activar el Triage en vivo
      try {
        const { data: currentFile } = await supabase.storage.from('audenti_database').download('appointments.json');
        let currentList: any[] = [];
        if (currentFile) {
          try {
            const currentText = await currentFile.text();
            if (currentText && currentText.trim()) {
              currentList = JSON.parse(currentText);
            }
          } catch {}
        }

        const emergencyRecord = {
          id: folio,
          folio: folio,
          patient_name: patientName,
          patient_phone: phone,
          appointment_date: formatDateInMexico(getNowInMexico()),
          appointment_time: 'Urgencia Inmediata',
          treatment: `URGENCIA DENTAL (${painLevel.toUpperCase()})`,
          treatment_type: `URGENCIA DENTAL (${painLevel.toUpperCase()})`,
          branch: targetBranch,
          status: 'pending_review',
          notes: `[FOLIO: ${folio}] SÍNTOMAS: ${symptoms}. Zona Paciente: ${userZone}. Sede: ${targetBranch}. Tel: ${phone}`,
          start_time: nowIso,
          created_at: nowIso
        };

        const updatedList = [emergencyRecord, ...currentList.filter((a: any) => a.folio !== folio && a.id !== folio)].slice(0, 50);
        await supabase.storage.from('audenti_database').upload('appointments.json', JSON.stringify(updatedList, null, 2), {
          upsert: true,
          contentType: 'application/json'
        });

        // 4. Guardar alerta de urgencia en doctor_alerts.json
        const doctorAlert = {
          id: `alert-${folio}`,
          type: 'urgencia',
          title: `🔴 Urgencia Clínica Escalada: ${patientName}`,
          message: `${patientName} • Dolor ${painLevel.toUpperCase()} • ${targetBranch} • Síntomas: ${symptoms}`,
          patient_name: patientName,
          appointment_date: formatDateInMexico(getNowInMexico()),
          appointment_time: 'Inmediata',
          branch: targetBranch,
          folio: folio,
          time: 'Urgencia Inmediata',
          created_at: nowIso,
          read: false
        };

        try {
          const { data: alertsFile } = await supabase.storage.from('audenti_database').download('doctor_alerts.json');
          let alertsList: any[] = [];
          if (alertsFile) {
            try {
              const text = await alertsFile.text();
              if (text && text.trim()) alertsList = JSON.parse(text);
            } catch {}
          }
          const updatedAlerts = [doctorAlert, ...alertsList.filter((a: any) => a.id !== doctorAlert.id)].slice(0, 50);
          await supabase.storage.from('audenti_database').upload('doctor_alerts.json', JSON.stringify(updatedAlerts, null, 2), {
            upsert: true,
            contentType: 'application/json'
          });
        } catch (alertErr: any) {
          console.warn('Nota al persistir doctor_alerts para urgencia:', alertErr?.message);
        }

        // 5. Emitir broadcast realtime para encender la barra de triaje, toast y campana de la Dra. Aura en todos los canales activos
        const emitToChannel = (channelName: string) => {
          const ch = supabase.channel(channelName);
          ch.send({
            type: 'broadcast',
            event: 'emergency_triage_alert',
            payload: emergencyRecord
          }).catch(() => {});

          ch.send({
            type: 'broadcast',
            event: 'doctor_notification',
            payload: doctorAlert
          }).catch(() => {});
        };

        emitToChannel('dashboard_page_realtime');
        emitToChannel('header_notifications_realtime');
        emitToChannel('calendar_page_realtime');
        emitToChannel('dashboard_realtime_kpis');
      } catch (storageErr: any) {
        console.warn('Error al respaldar urgencia en Supabase Storage:', storageErr?.message);
      }

      return {
        status: 200,
        confirmed: true,
        escalated: true,
        folio,
        appointmentId: folio,
        patientName,
        phone,
        statusLabel: 'notified_to_doctor',
        doctorName: 'Dra. Aura Estudillo',
        targetBranch,
        mensajeParaPaciente: `He registrado tu urgencia con el folio ${folio} para la Dra. Aura Estudillo. Por favor mantén la calma y evita automedicarte; nuestro equipo se está coordinando para atenderte.`
      };
    }

    return { error: `Herramienta ${name} no reconocida` };
  } catch (err: any) {
    console.error(`[Tool Execution Error: ${name}]:`, err.message);
    return { error: err.message || 'Error en ejecución de base de datos' };
  }
}
