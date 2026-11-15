import { NextResponse } from 'next/server';
import { executeAIAgent } from '@/lib/ai/router';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDoctorWhatsAppAlert } from '@/lib/notifications/whatsapp-doctor';
import { evaluateIntentionAndUrgency } from '@/utils/timezone';
import { writeAheadLog, upsertChatMessageWithRetry } from '@/lib/persistence/omnichannel-wal';

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
    const authHeader = request.headers.get('x-chatwoot-signature') || request.headers.get('authorization') || request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.CHATWOOT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

    if (expectedSecret) {
      const token = authHeader?.replace(/^Bearer\s+/i, '');
      if (token !== expectedSecret) {
        return NextResponse.json({ success: false, error: 'Firma de Chatwoot inválida' }, { status: 401 });
      }
    }

    const payload: ChatwootWebhookPayload = await request.json();

    // 1. Respaldo Local Inmediato (Write-Ahead Log)
    writeAheadLog('chatwoot_webhook', payload);

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

    // 2. Extracción Obligatoria de Metadatos de Prospecto Nuevo / Consulta
    let prospectName = senderName;
    const nameMatch = messageContent.match(/(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,25}(?:\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,25})?)/i);
    if (nameMatch && nameMatch[1]) {
      prospectName = nameMatch[1].trim();
    }

    let prospectPhone = senderPhone;
    if (!prospectPhone) {
      const phoneMatch = messageContent.match(/\b\d{10}\b/) || messageContent.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
      if (phoneMatch) {
        prospectPhone = phoneMatch[0].replace(/\D/g, '');
      }
    }

    // Evaluación Inteligente de Intención, Horario de México y Urgencia
    const evaluation = evaluateIntentionAndUrgency(messageContent, new Date());
    let consultationReason = evaluation.suggestedReason;
    const lowerContent = messageContent.toLowerCase();

    if (lowerContent.includes('limpieza') || lowerContent.includes('profilaxis')) {
      consultationReason = 'Limpieza Dental (Profilaxis Ultrasónica)';
    } else if (lowerContent.includes('ortodoncia') || lowerContent.includes('brackets') || lowerContent.includes('alineadores')) {
      consultationReason = 'Ortodoncia / Alineación Dental';
    } else if (lowerContent.includes('blanqueamiento')) {
      consultationReason = 'Blanqueamiento Dental Estético';
    } else if (lowerContent.includes('implante')) {
      consultationReason = 'Implantología / Prótesis';
    } else if (lowerContent.includes('resina') || lowerContent.includes('caries')) {
      consultationReason = 'Restauración / Resina Estética';
    }

    const trafficLight = evaluation.trafficLight;
    const isUrgent = trafficLight === 'red';
    const urgencyLevel: 'Urgente' | 'No Urgente' = isUrgent ? 'Urgente' : 'No Urgente';

    // Si el usuario no existe en Supabase, registrar al prospecto si tiene teléfono
    if (!isRegistered && prospectPhone) {
      try {
        const cleanPhone = prospectPhone.replace(/\D/g, '').slice(-10);
        const { data: newProspect } = await supabase
          .from('patients')
          .insert({
            full_name: prospectName !== 'Prospecto Omnicanal' ? prospectName : `Prospecto (${cleanPhone})`,
            phone: cleanPhone,
            onboarding_completed: false,
            status: 'prospecto_nuevo'
          })
          .select('id, full_name, phone')
          .maybeSingle();

        if (newProspect) {
          patientRecord = newProspect;
          folio = `PROS-${newProspect.id.slice(0, 8).toUpperCase()}`;
        }
      } catch (insertErr: any) {
        console.warn('[Prospect Insert Note]:', insertErr?.message);
      }
    }

    // 3. Ejecutar Triaje Inteligente con Aura IA
    let aiTriageResponse = '';
    try {
      const aiResult = await executeAIAgent({
        domain: 'patient_chat',
        prompt: messageContent,
        contextData: {
          patientName: isRegistered ? patientRecord.full_name : prospectName,
          phone: prospectPhone,
          channel: channelType,
          consultationReason,
          urgencyLevel
        }
      });
      aiTriageResponse = typeof aiResult.result === 'string'
        ? aiResult.result
        : (aiResult.result?.result || aiResult.result?.content || 'Un momento, estamos procesando tu mensaje con la Dra. Aura Estudillo.');
    } catch (aiErr: any) {
      console.warn('[Chatwoot AI Agent Note]:', aiErr?.message);
      aiTriageResponse = 'Hola, hemos recibido tu mensaje. La Dra. Aura Estudillo lo está revisando para contactarte a la brevedad.';
    }

    // 4. Sincronizar en chat_omnichannel.json de Supabase Storage e inserción idempotente en chat_messages
    const targetPatientId = isRegistered
      ? patientRecord.id
      : (patientRecord?.id || `prospect_${prospectPhone.replace(/\D/g, '') || conversationId || Date.now()}`);

    const nowFormatted = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    const resolvedChannelType = channelType === 'whatsapp' ? 'whatsapp' : 'web_chat';

    const cwInSid = `cw_in_${payload.id || Date.now()}`;
    const cwOutSid = `cw_out_${payload.id || Date.now() + 1}`;

    // Doble escritura idempotente en chat_messages con call_sid
    await upsertChatMessageWithRetry(supabase, {
      call_sid: cwInSid,
      content: `[Chatwoot ${prospectName}]: ${messageContent}`
    });

    await upsertChatMessageWithRetry(supabase, {
      call_sid: cwOutSid,
      content: `[Chatwoot Aura IA]: ${aiTriageResponse}`
    });

    try {
      let allChats: Record<string, any[]> = {};
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allChats = JSON.parse(text);
      }

      const clientMsg = {
        id: cwInSid,
        senderName: isRegistered ? patientRecord.full_name : `${prospectName} (Prospecto)`,
        senderRole: 'patient',
        channel_type: resolvedChannelType,
        content: messageContent,
        timestamp: nowFormatted,
        isDoctor: false,
        isRegistered,
        folio: folio || 'PROSPECTO-NUEVO',
        channel: channelType,
        metadata: {
          channel_type: resolvedChannelType,
          patientName: isRegistered ? patientRecord.full_name : prospectName,
          phone: prospectPhone,
          consultationReason,
          urgencyLevel,
          classification: isRegistered ? '🟢 PACIENTE REGISTRADO' : '🟠 PROSPECTO NUEVO'
        }
      };

      const aiReplyMsg = {
        id: cwOutSid,
        senderName: 'Aura IA (Triaje Automático)',
        senderRole: 'ai',
        channel_type: resolvedChannelType,
        content: aiTriageResponse,
        timestamp: nowFormatted,
        isDoctor: false
      };

      allChats[targetPatientId] = [...(allChats[targetPatientId] || []), clientMsg, aiReplyMsg];
      if (prospectPhone) {
        const cleanP = prospectPhone.replace(/\D/g, '').slice(-10);
        if (cleanP) allChats[`prospect_${cleanP}`] = allChats[targetPatientId];
      }

      await supabase.storage.from('audenti_database').upload(
        'chat_omnichannel.json',
        JSON.stringify(allChats, null, 2),
        { upsert: true, contentType: 'application/json' }
      );
    } catch (storageErr: any) {
      console.warn('[Chatwoot Storage Note]:', storageErr?.message);
    }

    // 5. Emitir eventos Realtime para el Dashboard de la Doctora
    await supabase.channel('chat_omnichannel_sync').send({
      type: 'broadcast',
      event: 'incoming_patient_message',
      payload: {
        targetPatientId,
        senderName: isRegistered ? patientRecord.full_name : `${prospectName} (${prospectPhone || 'Prospecto'})`,
        content: messageContent,
        timestamp: nowFormatted,
        isRegistered,
        folio: folio || 'PROSPECTO-NUEVO',
        channel_type: resolvedChannelType,
        phone: prospectPhone,
        consultationReason,
        urgencyLevel,
        trafficLight,
        classification: isRegistered ? '🟢 PACIENTE REGISTRADO' : '🟠 PROSPECTO NUEVO'
      }
    });

    await supabase.channel('header_notifications_realtime').send({
      type: 'broadcast',
      event: 'doctor_notification',
      payload: {
        id: `notif-cw-${Date.now()}`,
        title: isRegistered ? `💬 PACIENTE REGISTRADO (${folio}): ${patientRecord.full_name}` : `💬 🟠 PROSPECTO NUEVO (${urgencyLevel.toUpperCase()}): ${prospectName}`,
        message: `${consultationReason} • "${messageContent.slice(0, 80)}"`,
        type: isUrgent ? 'urgent' : 'general',
        patient_name: isRegistered ? patientRecord.full_name : prospectName,
        phone: prospectPhone,
        consultationReason,
        urgencyLevel,
        trafficLight,
        targetPatientId,
        url: `/dashboard/chat?patientId=${encodeURIComponent(targetPatientId)}`,
        time: nowFormatted
      }
    });

    // 6. Notificación Dual a WhatsApp (Aviso a la Dra. Aura)
    await sendDoctorWhatsAppAlert({
      title: isRegistered ? `🟢 MENSAJE DE PACIENTE REGISTRADO (${folio})` : `🟠 NUEVO PROSPECTO EN CHATWOOT (${urgencyLevel.toUpperCase()})`,
      patientName: isRegistered ? `${patientRecord.full_name} (${folio})` : `${prospectName} [${prospectPhone || 'Web'}]`,
      message: `🎯 Motivo: ${consultationReason}\n🚨 Urgencia: ${urgencyLevel}\n💬 Mensaje: ${messageContent}`,
      type: isUrgent ? 'voice_call' : 'chat_message'
    });

    return NextResponse.json({
      success: true,
      processed: true,
      isRegistered,
      folio,
      aiResponse: aiTriageResponse
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Chatwoot Webhook Error]:', error?.message);
    return NextResponse.json({ success: false, error: 'Error procesando webhook de Chatwoot' }, { status: 500 });
  }
}
