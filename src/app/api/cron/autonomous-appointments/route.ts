import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDoctorWhatsAppAlert, sendPatientWhatsAppMessage } from '@/lib/notifications/whatsapp-doctor';
import { formatTimeInMexico, getNowInMexico } from '@/utils/timezone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleAutonomousCheck(request);
}

export async function POST(request: Request) {
  return handleAutonomousCheck(request);
}

async function handleAutonomousCheck(request: Request) {
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 1. Obtener alertas de doctor_alerts o Storage que requieran atención o confirmación
    let pendingAlerts: any[] = [];
    try {
      const { data: dbAlerts } = await supabase
        .from('doctor_alerts')
        .select('*')
        .or('status.eq.pending,confirmed_by_doctor.eq.true')
        .lte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(20);

      if (dbAlerts && dbAlerts.length > 0) {
        pendingAlerts = dbAlerts;
      }
    } catch (e: any) {
      console.warn('[Autonomous Cron DB Alerts Notice]:', e?.message);
    }

    // Complementar con doctor_alerts.json en Storage
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download('doctor_alerts.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) {
          const list = JSON.parse(text);
          if (Array.isArray(list)) {
            for (const item of list) {
              const itemCreated = new Date(item.created_at || item.time || 0);
              if (itemCreated.getTime() > 0 && itemCreated <= oneHourAgo && item.status !== 'auto_scheduled') {
                if (!pendingAlerts.some(p => p.id === item.id || p.patient_name === item.patient_name)) {
                  pendingAlerts.push(item);
                }
              }
            }
          }
        }
      }
    } catch {}

    const results: any[] = [];

    for (const alert of pendingAlerts) {
      const patientName = alert.patient_name || alert.patientName || 'Paciente';
      const patientPhone = alert.phone || alert.patientPhone || '';
      const patientId = alert.patient_id || alert.targetPatientId || (patientPhone ? `prospect_${patientPhone.replace(/\D/g, '')}` : '');
      const isUrgent = alert.urgency_level === 'Urgente' || alert.type === 'emergency' || /(?:dolor|duele|muela|urgente)/i.test(alert.message || '');

      // Las urgencias extremas no se autoprograman ordinariamente sin triaje médico
      if (isUrgent) {
        continue;
      }

      // Verificar si ya existe cita para este paciente
      let hasAppointment = false;
      try {
        const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
        let apptQuery = supabase
          .from('appointments')
          .select('id, status')
          .neq('status', 'cancelled')
          .limit(1);

        if (patientId && !patientId.startsWith('prospect_')) {
          apptQuery = apptQuery.eq('patient_id', patientId);
        } else if (cleanPhone) {
          apptQuery = apptQuery.ilike('notes', `%${cleanPhone}%`);
        }

        const { data: appts } = await apptQuery;
        if (appts && appts.length > 0) {
          hasAppointment = true;
        }
      } catch {}

      if (hasAppointment) {
        continue;
      }

      // Nivel 1 & 2: Si ya pasaron 60 minutos y no hay cita ni respuesta, Aura IA asume la confirmación
      const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const scheduledDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nextDay);
      const scheduledTime = '11:00';
      const branch = 'Sede Balbuena';
      const folio = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
      const treatmentType = alert.consultationReason || alert.message?.split('•')[0]?.trim() || 'Consulta / Valoración Dental';

      // 1. Insertar la cita en la tabla appointments de Supabase
      try {
        const startIso = `${scheduledDate}T${scheduledTime}:00-06:00`;
        const endIso = `${scheduledDate}T11:45:00-06:00`;

        await supabase.from('appointments').insert({
          patient_id: patientId && !patientId.startsWith('prospect_') ? patientId : null,
          treatment_type: treatmentType,
          status: 'confirmed',
          start_time: startIso,
          end_time: endIso,
          notes: `[FOLIO: ${folio}] [Aura IA] Cita confirmada automáticamente tras 1 hora sin respuesta manual de la doctora. Paciente: ${patientName}. Tel: ${patientPhone}. Sede: ${branch}`
        });
      } catch (insertApptErr: any) {
        console.warn('[Autonomous appointment DB notice]:', insertApptErr?.message);
      }

      // 2. Registrar en appointments.json de Storage
      try {
        let apptList: any[] = [];
        const { data: file } = await supabase.storage.from('audenti_database').download('appointments.json');
        if (file) {
          const text = await file.text();
          if (text && text.trim()) apptList = JSON.parse(text);
        }
        apptList.unshift({
          id: folio,
          folio,
          patient_name: patientName,
          patient_phone: patientPhone,
          appointment_date: scheduledDate,
          appointment_time: scheduledTime,
          treatment: treatmentType,
          treatment_type: treatmentType,
          branch,
          status: 'confirmed',
          notes: `[FOLIO: ${folio}] [Aura IA] Cita confirmada automáticamente tras 1 hora sin respuesta manual de la doctora.`,
          created_at: new Date().toISOString()
        });
        await supabase.storage.from('audenti_database').upload(
          'appointments.json',
          JSON.stringify(apptList.slice(0, 50), null, 2),
          { upsert: true, contentType: 'application/json' }
        );
      } catch {}

      // 3. Insertar mensaje en chat_messages de Supabase
      const confirmationMessageContent = `🦷 Hola ${patientName}, para asegurar tu atención prioritaria y evitar esperas, Aura IA ha reservado formalmente tu cita con la Dra. Aura Estudillo para el día *${scheduledDate} a las ${scheduledTime} hrs* en ${branch}.\n\n• Folio de Confirmación: *${folio}*\n• Estado: Confirmada por Asistente Clínico Inteligente 24/7.\n¡Te esperamos en clínica!`;

      try {
        await supabase.from('chat_messages').insert({
          patient_id: patientId && !patientId.startsWith('prospect_') ? patientId : null,
          sender_role: 'ai',
          sender_name: 'Aura IA (Asistente Clínico)',
          content: confirmationMessageContent,
          channel_type: 'web_chat',
          metadata: {
            folio,
            patientId,
            autoScheduled: true,
            note: '[Aura IA] Cita confirmada automáticamente tras 1 hora sin respuesta manual de la doctora.'
          },
          created_at: new Date().toISOString()
        });
      } catch {}

      // 4. Enviar notificación al WhatsApp del paciente
      if (patientPhone && patientPhone.length >= 10) {
        try {
          await sendPatientWhatsAppMessage({
            patientPhone,
            patientName,
            message: confirmationMessageContent
          });
        } catch (waErr: any) {
          console.warn('[WhatsApp Patient Auto Confirm notice]:', waErr?.message);
        }
      }

      // 5. Emitir alerta espejo al WhatsApp de la Dra. Aura
      try {
        await sendDoctorWhatsAppAlert({
          title: '🤖 Cita Agendada Autónomamente (Aura IA)',
          patientName,
          message: `Tras 1 hora de ventana sin confirmación manual, Aura IA aseguró la cita de ${patientName} para el ${scheduledDate} a las ${scheduledTime} hrs (Folio: ${folio}).`,
          type: 'info'
        });
      } catch {}

      // 6. Notificar al canal Realtime del paciente y del Dashboard
      const broadcastPayload = {
        patientId,
        targetPatientId: patientId,
        content: confirmationMessageContent,
        senderRole: 'ai',
        senderName: 'Aura IA (Asistente Clínico)',
        timestamp: formatTimeInMexico(new Date()),
        folio
      };

      await supabase.channel(`patient_chat_${patientId}`).send({
        type: 'broadcast',
        event: 'doctor_reply',
        payload: broadcastPayload
      }).catch(() => {});

      await supabase.channel('chat_omnichannel_sync').send({
        type: 'broadcast',
        event: 'sync_patient_message',
        payload: broadcastPayload
      }).catch(() => {});

      results.push({ patientName, folio, scheduledDate, scheduledTime });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      appointmentsCreated: results
    });
  } catch (error: any) {
    console.error('[Autonomous appointments error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
