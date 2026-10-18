import { NextResponse } from 'next/server';
import { executeAIAgent } from '@/lib/ai/router';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDoctorWhatsAppAlert } from '@/lib/notifications/whatsapp-doctor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatwootWebhookPayload {
  event: string;
  id?: number;
  content?: string;
  message_type?: 'incoming' | 'outgoing' | 'template';
  conversation?: {
    id: number;
    inbox_id: number;
    status: string;
    channel?: string;
    meta?: {
      sender?: {
        id: number;
        name: string;
        phone_number?: string;
        email?: string;
      };
    };
  };
  sender?: {
    id: number;
    name: string;
    phone_number?: string;
    email?: string;
    type?: string;
  };
}

export async function POST(request: Request) {
  try {
    const payload: ChatwootWebhookPayload = await request.json();
    const event = payload.event;

    // Solo procesar mensajes entrantes de clientes o prospectos
    if (event !== 'message_created' || payload.message_type !== 'incoming') {
      return NextResponse.json({ success: true, status: 'ignored_event' }, { status: 200 });
    }

    const messageContent = payload.content || '';
    const conversationId = payload.conversation?.id;
    const senderName = payload.sender?.name || payload.conversation?.meta?.sender?.name || 'Prospecto Omnicanal';
    const senderPhone = payload.sender?.phone_number || payload.conversation?.meta?.sender?.phone_number || '';
    const channelType = payload.conversation?.channel || 'chatwoot_omnichannel';

    if (!messageContent.trim()) {
      return NextResponse.json({ success: true, status: 'empty_content' }, { status: 200 });
    }

    const supabase = createAdminClient();

    // 1. Clasificación Dinámica con Supabase: Paciente Registrado vs Prospecto Nuevo
    let isRegistered = false;
    let patientRecord: any = null;
    let folio = '';

    try {
      if (senderPhone) {
        // Buscar por teléfono en la tabla 'patients'
        const cleanPhone = senderPhone.replace(/\D/g, '').slice(-10);
        const { data: found } = await supabase
          .from('patients')
          .select('id, full_name, phone')
          .ilike('phone', `%${cleanPhone}%`)
          .maybeSingle();

        if (found) {
          isRegistered = true;
          patientRecord = found;
          folio = `EXP-${found.id.slice(0, 8).toUpperCase()}`;
        }
      }
    } catch (dbErr: any) {
      console.warn('[Chatwoot DB Check Note]:', dbErr?.message);
    }

    // 2. Ejecutar Triaje Inteligente con Aura IA (Captain AI)
    let aiTriageResponse = '';
    try {
      const aiResult = await executeAIAgent({
        domain: 'patient_chat',
        prompt: messageContent,
        contextData: {
          patientName: isRegistered ? patientRecord.full_name : senderName,
          patientPhone: senderPhone,
          channel: channelType,
          isRegistered,
          folio: folio || 'PROSPECTO-NUEVO',
          clinicName: 'Audenti Odontología (Dra. Aura Estudillo)'
        }
      });

      aiTriageResponse = typeof aiResult.result === 'string'
        ? aiResult.result
        : (aiResult.result?.result || aiResult.result?.content || JSON.stringify(aiResult.result));
    } catch (aiErr: any) {
      aiTriageResponse = '¡Hola! En Audenti estamos a tu disposición. La Dra. Aura Estudillo y nuestro equipo han recibido tu mensaje y te responderán a la brevedad.';
    }

    // 3. Persistir en chat_omnichannel.json de Supabase Storage para reflejar en /dashboard/chat
    const targetPatientId = patientRecord?.id || `prospect_${senderPhone.replace(/\D/g, '') || conversationId || Date.now()}`;
    const nowFormatted = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date());

    try {
      let allChats: Record<string, any[]> = {};
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allChats = JSON.parse(text);
      }

      const clientMsg = {
        id: `cw-msg-${payload.id || Date.now()}`,
        senderName: isRegistered ? patientRecord.full_name : `${senderName} (Prospecto)`,
        senderRole: 'patient',
        content: messageContent,
        timestamp: nowFormatted,
        isDoctor: false,
        isRegistered,
        folio: folio || 'PROSPECTO',
        channel: channelType
      };

      const aiReplyMsg = {
        id: `cw-ai-${Date.now()}`,
        senderName: 'Aura IA (Triaje Automático)',
        senderRole: 'ai',
        content: aiTriageResponse,
        timestamp: nowFormatted,
        isDoctor: false
      };

      allChats[targetPatientId] = [...(allChats[targetPatientId] || []), clientMsg, aiReplyMsg];

      await supabase.storage.from('audenti_database').upload(
        'chat_omnichannel.json',
        JSON.stringify(allChats, null, 2),
        { upsert: true, contentType: 'application/json' }
      );
    } catch (storageErr: any) {
      console.warn('[Chatwoot Storage Note]:', storageErr?.message);
    }

    // 4. Emitir eventos Realtime para el Dashboard de la Doctora y el Badge del Menú Lateral
    await supabase.channel('chat_omnichannel_sync').send({
      type: 'broadcast',
      event: 'incoming_patient_message',
      payload: {
        targetPatientId,
        senderName: isRegistered ? patientRecord.full_name : `${senderName} (${senderPhone || 'Prospecto'})`,
        content: messageContent,
        timestamp: nowFormatted,
        isRegistered,
        folio: folio || 'PROSPECTO',
        phone: senderPhone
      }
    });

    await supabase.channel('header_notifications_realtime').send({
      type: 'broadcast',
      event: 'doctor_notification',
      payload: {
        id: `notif-cw-${Date.now()}`,
        title: isRegistered ? `🟢 PACIENTE REGISTRADO: ${patientRecord.full_name}` : `🟠 PROSPECTO NUEVO: ${senderName}`,
        message: messageContent,
        type: 'general',
        patient_name: isRegistered ? patientRecord.full_name : senderName,
        time: nowFormatted
      }
    });

    // 5. Notificación Dual a WhatsApp (Aviso a la Dra. Aura para monitoreo en ruta)
    await sendDoctorWhatsAppAlert({
      title: isRegistered ? `🟢 MENSAJE DE PACIENTE REGISTRADO (${folio})` : `🟠 NUEVO PROSPECTO EN CHATWOOT`,
      patientName: isRegistered ? `${patientRecord.full_name} (${folio})` : `${senderName} [${senderPhone || 'Web'}]`,
      message: messageContent,
      type: 'chat_message'
    });

    return NextResponse.json({
      success: true,
      processed: true,
      isRegistered,
      folio,
      aiResponse: aiTriageResponse
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Chatwoot Webhook Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
