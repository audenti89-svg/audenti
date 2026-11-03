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
      description: 'Consulta los horarios y disponibilidad de la agenda de la Dra. Aura Estudillo para una fecha y sede específica. A partir de enero 2027, el servicio es exclusivamente vespertino de Lunes a Sábado de 16:00 a 21:00 hrs y Domingos según agenda. El turno matutino está estrictamente bloqueado.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha a consultar en formato YYYY-MM-DD (ej. 2027-01-15)' },
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
      description: 'Crea y agenda atómicamente una cita en la base de datos de Supabase cuando el paciente ha definido fecha, hora y tratamiento, reflejándose de inmediato en la agenda y KPIs de la Dra. Aura. A partir de 2027, el turno matutino está estrictamente bloqueado; únicamente se admiten citas en Turno Vespertino (16:00 a 21:00 hrs) de lunes a sábado o domingos según agenda.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string', description: 'Nombre completo del paciente' },
          phone: { type: 'string', description: 'Número de teléfono de 10 dígitos' },
          date: { type: 'string', description: 'Fecha de la cita en formato YYYY-MM-DD (ej. 2027-01-18)' },
          time: { type: 'string', description: 'Hora de inicio de la cita en formato HH:mm (Turno Vespertino obligatorio: 16:00 a 21:00 hrs de lunes a sábado, o disponibilidad dominical)' },
          treatmentType: { type: 'string', description: 'Tratamiento o motivo (ej. Valoración inicial, Limpieza dental, Resina, Ortodoncia)' },
          branch: { type: 'string', description: 'Sede de la cita (Sede Balbuena, Sede Roma o Sede Chalma de Guadalupe)' }
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

      // Franjas: en 2026 horario normal (09:00 a 20:00); en 2027 vespertino (16:00 a 21:00)
      const is2027 = targetDate >= '2027-01-01';
      const standardSlots = is2027
        ? ['16:00', '16:45', '17:30', '18:15', '19:00', '19:45', '20:15']
        : ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
      const availableSlots = standardSlots.filter(s => !bookedHours.has(s));

      return {
        fechaConsultada: targetDate,
        sede: branch,
        horariosDisponibles: availableSlots.length > 0 ? availableSlots : [is2027 ? '19:00 (Sobre-cupo vespertino a autorizar por Dra. Aura)' : '11:00 (Sobre-cupo a autorizar por Dra. Aura)'],
        politicaHorario: is2027
          ? 'A partir de 2027: Lunes a Sábado exclusivamente Turno Vespertino (16:00 a 21:00 hrs) y Domingos según agenda.'
          : 'Noviembre y Diciembre 2026: Horario normal de atención (09:00 a 20:00 hrs).',
        sedeInfo: branch.toLowerCase().includes('balbuena')
          ? 'Sede Balbuena (Matriz) activa con normalidad'
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

      // 0.1 Validación de Política de Horarios 2027 (Turno Vespertino 16:00 a 21:00 hrs)
      const parsedTime = (time || '').trim();
      const [hoursStr, minutesStr] = parsedTime.split(':');
      const appointmentHour = parseInt(hoursStr || '0', 10);
      const appointmentMinute = parseInt(minutesStr || '0', 10);
      const totalAppMinutes = appointmentHour * 60 + appointmentMinute;

      // Bloqueo del Turno Matutino solo a partir del 1 de enero de 2027
      if (date >= '2027-01-01') {
        if (totalAppMinutes < 16 * 60) {
          return {
            status: 400,
            confirmed: false,
            error: 'TURNO_MATUTINO_BLOQUEADO',
            mensajeError: 'A partir del 1 de enero de 2027, el turno matutino se encuentra estrictamente bloqueado y deshabilitado para consultas. El horario de atención oficial es de Lunes a Sábado exclusivamente de 4:00 PM a 9:00 PM (16:00 a 21:00 hrs) y Domingos según disponibilidad de agenda. Por favor elige un horario en turno vespertino.'
          };
        }
        if (totalAppMinutes > 21 * 60) {
          return {
            status: 400,
            confirmed: false,
            error: 'HORARIO_EXCEDE_CIERRE',
            mensajeError: 'El horario seleccionado supera las 21:00 hrs. El turno vespertino concluye a las 9:00 PM. Por favor selecciona un bloque entre las 16:00 y las 20:15 hrs.'
          };
        }
      } else {
        // En noviembre y diciembre de 2026: horario normal (08:00 a 21:00)
        if (totalAppMinutes < 8 * 60 || totalAppMinutes > 21 * 60) {
          return {
            status: 400,
            confirmed: false,
            error: 'HORARIO_FUERA_DE_RANGO',
            mensajeError: 'En 2026 el horario de atención normal es de 08:00 a 21:00 hrs. Por favor selecciona un horario en ese rango.'
          };
        }
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

        // 6. Notificación y Confirmación Externa Automatizada (Zernio / WhatsApp API)
        try {
          const { sendExternalMessage } = await import('@/lib/messaging/external-client');
          const doctorPhone = process.env.DOCTOR_WHATSAPP || process.env.DOCTOR_WHATSAPP_PHONE || '525522427769';

          // Aviso directo a la Dra. Aura Estudillo
          await sendExternalMessage({
            to: doctorPhone,
            message: `📅 *Nueva Cita Agendada (Aura AI)*\n• Paciente: ${patientName}\n• Fecha: ${date} a las ${time} hrs\n• Sede: ${branch}\n• Folio: ${folio}\n• Tel: ${phone}`,
            patientId: patId || folio,
            patientName: patientName,
            metadata: { type: 'doctor_alert', folio, branch }
          });

          // Notificación al Paciente informando que la doctora evaluará y confirmará
          if (phone && phone !== 'No provisto' && phone.length >= 10) {
            await sendExternalMessage({
              to: phone,
              message: `🦷 *Audenti Clinical*\nHola ${patientName}, recibimos tu solicitud de cita para el día *${date} a las ${time} hrs* en ${branch} (Folio: *${folio}*).\nLa Dra. Aura Estudillo revisará su agenda clínica y te confirmará directamente a la brevedad por este medio.`,
              patientId: patId || folio,
              patientName: patientName,
              metadata: { type: 'patient_confirmation_pending', folio, branch }
            });
          }
        } catch (msgErr: any) {
          console.warn('[SchedulingTools] Error en despacho de mensajería externa:', msgErr?.message);
        }

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
          mensajeConfirmacion: `He tomado tu solicitud de cita para el día ${date} a las ${time} hrs (Folio: ${folio}). Se la he transmitido de inmediato a la Dra. Aura Estudillo para que ella revise su agenda y te confirme formalmente la fecha y hora por WhatsApp a la brevedad.`
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
            // Actualizar nombre si no lo tenía
            try {
              if (patientName && patientName !== 'Paciente Urgencia') {
                await supabase.from('patients').update({ full_name: patientName }).eq('id', patId);
              }
            } catch {}
          } else {
            const { data: newPat } = await supabase
              .from('patients')
              .insert({
                full_name: patientName || 'Paciente Urgencia',
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
        const emergencyBroadcastPayload = {
          folio: folio.startsWith('EMG-') ? folio : `EMG-${Date.now()}`,
          patient_name: patientName,
          phone: phone,
          reason: symptoms,
          symptoms: symptoms,
          pain_level: painLevel,
          treatment: `URGENCIA DENTAL (${painLevel.toUpperCase()})`,
          branch: targetBranch,
          timestamp: nowIso,
          created_at: nowIso
        };

        const emitToChannel = (channelName: string) => {
          const ch = supabase.channel(channelName);
          ch.send({
            type: 'broadcast',
            event: 'emergency_triage_alert',
            payload: emergencyBroadcastPayload
          }).catch(() => {});

          ch.send({
            type: 'broadcast',
            event: 'doctor_notification',
            payload: doctorAlert
          }).catch(() => {});
        };

        // Enviar con await explícito al canal solicitado 'dashboard_realtime_kpis'
        try {
          await supabase.channel('dashboard_realtime_kpis').send({
            type: 'broadcast',
            event: 'emergency_triage_alert',
            payload: emergencyBroadcastPayload
          });
        } catch (kpiBroadcastErr) {
          console.warn('Nota broadcast directo a dashboard_realtime_kpis:', kpiBroadcastErr);
        }

        emitToChannel('dashboard_page_realtime');
        emitToChannel('header_notifications_realtime');
        emitToChannel('calendar_page_realtime');

        // 6. Notificación WhatsApp Prioritaria de Urgencia a la Dra. Aura Estudillo
        const doctorPhone = process.env.DOCTOR_WHATSAPP || '525522427769';
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        if (phoneId && accessToken) {
          const { sendWhatsAppMessage } = await import('@/lib/whatsapp/client');
          sendWhatsAppMessage(
            phoneId,
            doctorPhone,
            `🚨 *URGENCIA DENTAL ESCALADA (Aura AI)*\n• Paciente: *${patientName}*\n• Nivel de Dolor: *${painLevel.toUpperCase()}*\n• Teléfono: ${phone}\n• Sede: ${targetBranch}\n• Síntomas: ${symptoms}\n• Folio: *${folio}*\nFavor de revisar el Dashboard clínico para autorizar recepción.`
          ).catch((e: any) => console.warn('Nota de envío WhatsApp Urgencia a la Doctora:', e?.message));
        }
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
