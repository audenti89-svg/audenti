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
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Validación de seguridad para tareas programadas (Vercel Cron)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

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

      // Notificar al paciente recordándole que la doctora está ocupada en atención clínica y en cuanto se desocupe le responderá
      const followUpWaitMessage = `🦷 Hola ${patientName}, la Dra. Aura Estudillo se encuentra actualmente en procedimiento clínico. En cuanto se desocupe atenderá personalmente tu mensaje para confirmar tu cita y fecha. Agradecemos mucho tu paciencia.`;

      // 1. Guardar en chat_omnichannel.json
      try {
        let allChats: Record<string, any[]> = {};
        const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
        if (file) {
          const text = await file.text();
          if (text && text.trim()) allChats = JSON.parse(text);
        }
        allChats[patientId] = [...(allChats[patientId] || []), {
          id: `ai-wait-${Date.now()}`,
          senderName: 'Aura IA (Asistente de la Dra. Aura)',
          senderRole: 'ai',
          channel_type: 'web_chat',
          content: followUpWaitMessage,
          timestamp: formatTimeInMexico(new Date()),
          isDoctor: false
        }];
        await supabase.storage.from('audenti_database').upload(
          'chat_omnichannel.json',
          JSON.stringify(allChats, null, 2),
          { upsert: true, contentType: 'application/json' }
        );
      } catch {}

      // 2. Insertar mensaje en chat_messages de Supabase
      try {
        await supabase.from('chat_messages').insert({
          patient_id: patientId && !patientId.startsWith('prospect_') ? patientId : null,
          sender_role: 'ai',
          sender_name: 'Aura IA (Asistente de la Dra. Aura)',
          content: followUpWaitMessage,
          channel_type: 'web_chat',
          metadata: {
            patientId,
            autoFollowUp: true,
            note: 'Aviso periódico de doctora ocupada atendiendo pacientes.'
          },
          created_at: new Date().toISOString()
        });
      } catch {}

      // 3. Enviar notificación al WhatsApp del paciente
      if (patientPhone && patientPhone.length >= 10) {
        try {
          await sendPatientWhatsAppMessage({
            patientPhone,
            patientName,
            message: followUpWaitMessage
          });
        } catch (waErr: any) {
          console.warn('[WhatsApp Patient Auto Followup notice]:', waErr?.message);
        }
      }

      // 4. Emitir alerta recordatorio a la Dra. Aura por WhatsApp
      try {
        await sendDoctorWhatsAppAlert({
          title: '⏳ RECORDATORIO: Paciente esperando confirmación de cita',
          patientName,
          message: `El paciente ${patientName} (${patientPhone}) sigue a la espera de que confirmes su fecha/hora en la agenda. Aura IA le informó que estás en consulta y que le responderás a la brevedad.`,
          type: 'info'
        });
      } catch {}

      // 5. Notificar al canal Realtime del paciente y del Dashboard
      const broadcastPayload = {
        patientId,
        targetPatientId: patientId,
        content: followUpWaitMessage,
        senderRole: 'ai',
        senderName: 'Aura IA (Asistente de la Dra. Aura)',
        timestamp: formatTimeInMexico(new Date())
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

      results.push({ patientName, status: 'wait_message_sent' });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      waitMessagesSent: results
    });
  } catch (error: any) {
    console.error('[Autonomous appointments error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
