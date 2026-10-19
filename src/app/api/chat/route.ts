import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDoctorWhatsAppAlert, sendPatientWhatsAppMessage } from '@/lib/notifications/whatsapp-doctor';

export const runtime = 'nodejs';

// Endpoint para guardar mensajes del chat omnicanal (con privilegios de service role)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, message } = body;

    if (!patientId || !message) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Descargar chat actual
    let allChats: Record<string, any[]> = {};
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allChats = JSON.parse(text);
      }
    } catch {}

    // 2. Anexar nuevo mensaje
    allChats[patientId] = [...(allChats[patientId] || []), message];

    // 3. Guardar con service role sin restricción RLS
    const { error: uploadError } = await supabase.storage.from('audenti_database').upload(
      'chat_omnichannel.json',
      JSON.stringify(allChats, null, 2),
      { upsert: true, contentType: 'application/json' }
    );

    if (uploadError) {
      throw uploadError;
    }

    // 3.1 Insertar formalmente en la tabla relacional chat_messages de Supabase
    try {
      const isRegistered = !patientId.startsWith('prospect_');
      await supabase.from('chat_messages').insert({
        patient_id: isRegistered ? patientId : null,
        sender_role: message.senderRole || (message.isDoctor ? 'doctor' : 'patient'),
        sender_name: message.senderName || (message.isDoctor ? 'Dra. Aura Estudillo' : 'Paciente'),
        content: message.content,
        channel_type: message.channel_type || 'web_chat',
        metadata: {
          patientId,
          ...(message.metadata || {}),
          senderRole: message.senderRole,
          timestamp: message.timestamp
        },
        created_at: new Date().toISOString()
      });
    } catch (dbErr: any) {
      console.warn('[DB chat_messages insert notice]:', dbErr?.message);
    }

    // 4. Emitir eventos Realtime bidireccionales y Notificación WhatsApp
    try {
      if (message.senderRole === 'patient') {
        // Notificar a la doctora en vivo
        await supabase.channel('chat_omnichannel_sync').send({
          type: 'broadcast',
          event: 'incoming_patient_message',
          payload: { targetPatientId: patientId, ...message }
        });

        await supabase.channel('header_notifications_realtime').send({
          type: 'broadcast',
          event: 'doctor_notification',
          payload: {
            id: `notif-${Date.now()}`,
            title: `💬 Mensaje de ${message.senderName || 'Paciente'}`,
            message: message.content,
            type: 'general',
            patient_name: message.senderName,
            time: message.timestamp
          }
        });

        // Alerta WhatsApp para cuando la doctora va conduciendo o no está frente a la PC
        await sendDoctorWhatsAppAlert({
          title: `Nuevo Mensaje en Portal Clínico`,
          patientName: message.senderName || 'Paciente',
          message: message.content,
          type: 'chat_message'
        });
      } else if (message.senderRole === 'ai' && message.content.includes('Llamada de Voz')) {
        // Alerta de Resumen de Voz para WhatsApp
        await sendDoctorWhatsAppAlert({
          title: `📞 Resumen de Llamada de Voz Finalizada`,
          patientName: message.senderName || 'Paciente',
          message: message.content,
          type: 'voice_call'
        });
      } else {
        // NOTIFICAR AL PACIENTE EN VIVO EN SU WIDGET WEB
        const outgoingPayload = {
          targetPatientId: patientId,
          patientId,
          ...message,
          senderRole: message.senderRole || 'doctor',
          senderName: message.senderName || 'Dra. Aura Estudillo'
        };

        // Canal dedicado por ID de paciente
        await supabase.channel(`patient_chat_${patientId}`).send({
          type: 'broadcast',
          event: 'doctor_reply',
          payload: outgoingPayload
        });

        await supabase.channel(`patient_chat_${patientId}`).send({
          type: 'broadcast',
          event: 'chatwoot_message_created',
          payload: outgoingPayload
        });

        // Canal omnicanal global y de Chatwoot
        await supabase.channel('chat_omnichannel_sync').send({
          type: 'broadcast',
          event: 'sync_patient_message',
          payload: outgoingPayload
        });

        await supabase.channel('chat_omnichannel_sync').send({
          type: 'broadcast',
          event: 'chatwoot_message_created',
          payload: outgoingPayload
        });

        // 5. Sistema de Notificación Dual por Confirmación / Respuesta Médica:
        // Obtener teléfono del paciente desde Supabase
        try {
          const { data: patientData } = await supabase
            .from('patients')
            .select('full_name, phone')
            .eq('id', patientId)
            .maybeSingle();

          if (patientData?.phone) {
            // A. Notificar al WhatsApp del Paciente
            await sendPatientWhatsAppMessage({
              patientPhone: patientData.phone,
              patientName: patientData.full_name,
              message: message.content
            });

            // B. Notificar confirmación espejo al WhatsApp de la Dra. Aura
            await sendDoctorWhatsAppAlert({
              title: `✅ RESPUESTA ENVIADA A PACIENTE`,
              patientName: `${patientData.full_name} (${patientData.phone})`,
              message: message.content,
              type: 'info'
            });
          }
        } catch (dualErr: any) {
          console.warn('[Dual Notification Error]:', dualErr?.message);
        }
      }
    } catch (e: any) {
      console.warn('Nota broadcast realtime en api/chat:', e?.message);
    }

    return NextResponse.json({ success: true, message: 'Mensaje sincronizado correctamente' }, { status: 200 });
  } catch (err: any) {
    console.error('Error en API chat:', err);
    return NextResponse.json({ error: err.message || 'Error en servidor' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');

    const supabase = createAdminClient();
    const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');

    if (file) {
      const text = await file.text();
      if (text && text.trim()) {
        const allChats = JSON.parse(text);
        if (patientId) {
          return NextResponse.json({ success: true, messages: allChats[patientId] || [] });
        }
        return NextResponse.json({ success: true, chats: allChats });
      }
    }

    return NextResponse.json({ success: true, messages: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
