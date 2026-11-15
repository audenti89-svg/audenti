import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeAIAgent } from '@/lib/ai/router';
import { sendExternalMessage } from '@/lib/messaging/external-client';
import { writeAheadLog, upsertChatMessageWithRetry } from '@/lib/persistence/omnichannel-wal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: Verificación de Webhook para proveedores de mensajería externa (Zernio, Meta, etc.)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode') || url.searchParams.get('mode');
  const token = url.searchParams.get('hub.verify_token') || url.searchParams.get('token') || url.searchParams.get('verify_token');
  const challenge = url.searchParams.get('hub.challenge') || url.searchParams.get('challenge');

  const EXPECTED_TOKEN = process.env.MESSAGING_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token';

  if (token === EXPECTED_TOKEN || mode === 'subscribe') {
    return new NextResponse(challenge || 'OK', { status: 200 });
  }

  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/messaging',
    provider: 'Zernio / Multi-Messaging API',
    clinic: 'Audenti Odontología (Dra. Aura Estudillo)',
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}

/**
 * POST: Receptor de eventos y mensajes entrantes de WhatsApp / SMS desde API Externa (Zernio / Webhooks)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Respaldo Local Inmediato (Write-Ahead Log)
    writeAheadLog('messaging_webhook', body);

    const supabase = createAdminClient();

    let senderPhone = '';
    let messageText = '';
    let senderName = 'Paciente';
    let channel = 'whatsapp';
    let externalEventId = `msg_${Date.now()}`;

    // A. Formato Pasarela OpenWA (NestJS OpenWA Gateway)
    if (
      body.event === 'message.received' ||
      body.event === 'message' ||
      body.event === 'onMessage' ||
      (body.sessionId && (body.data?.body || body.message?.body || body.data?.text)) ||
      (body.chatId && (body.text || body.body))
    ) {
      const openwaMsg = body.data || body.message || body;
      if (openwaMsg.fromMe || body.fromMe) {
        return NextResponse.json({ success: true, status: 'ignored_outbound_openwa' }, { status: 200 });
      }
      const rawFrom = openwaMsg.from || openwaMsg.chatId || openwaMsg.sender?.id || body.chatId || '';
      senderPhone = String(rawFrom).replace(/@.*$/, '').trim();
      messageText = String(openwaMsg.body || openwaMsg.text || openwaMsg.content || '').trim();
      senderName = openwaMsg.sender?.pushname || openwaMsg.sender?.name || openwaMsg.pushName || 'Paciente WhatsApp';
      channel = 'whatsapp';
      externalEventId = openwaMsg.id || body.id || externalEventId;
    }
    // B. Formato Zernio / Proveedor Unificado
    else if (body.from || body.sender || body.phone) {
      senderPhone = String(body.from || body.sender || body.phone || '').trim();
      messageText = String(body.message || body.text || body.content || body.body || '').trim();
      senderName = body.sender_name || body.name || body.profile_name || 'Paciente';
      channel = body.channel || (body.type === 'sms' ? 'sms' : 'whatsapp');
    }
    // C. Formato WhatsApp Cloud API (Meta)
    else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const contact = body.entry[0].changes[0].value.contacts?.[0];
      senderPhone = msg.from || '';
      messageText = msg.text?.body || '';
      senderName = contact?.profile?.name || 'Paciente WhatsApp';
      channel = 'whatsapp';
    }
    // D. Formato Pasarela QR (Evolution API / WAHA)
    else if (body.data?.key) {
      if (body.data.key.fromMe) {
        return NextResponse.json({ success: true, status: 'ignored_outbound_echo' }, { status: 200 });
      }
      const remoteJid = body.data.key.remoteJid || '';
      senderPhone = remoteJid.replace(/@.*$/, '');
      messageText = body.data.message?.conversation || body.data.message?.extendedTextMessage?.text || '';
      senderName = body.data.pushName || 'Paciente WhatsApp';
      channel = 'whatsapp';
    }

    if (!messageText || !senderPhone) {
      return NextResponse.json({
        success: true,
        status: 'no_processable_content',
        received: Object.keys(body),
      }, { status: 200 });
    }

    // Limpieza de formato telefónico
    const rawDigits = senderPhone.replace(/\D/g, '');
    const cleanPhone = rawDigits.slice(-10); // 10 dígitos locales de México

    // 2. Localizar o registrar al paciente en Supabase PostgreSQL
    let targetPatientId: string | null = null;
    let isRegistered = false;
    let registeredPatientName = senderName;

    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('id, full_name, phone')
        .ilike('phone', `%${cleanPhone}%`)
        .maybeSingle();

      if (patient) {
        targetPatientId = patient.id;
        registeredPatientName = patient.full_name || senderName;
        isRegistered = true;
      }
    } catch (patErr: any) {
      console.warn('[Webhook Messaging] Error buscando paciente:', patErr?.message);
    }

    const conversationKey = targetPatientId || `prospect_${rawDigits}`;
    const timestampFormatted = new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());

    // 3. PERSISTENCIA IDEMPOTENTE CON REINTENTOS EN SUPABASE POSTGRESQL (chat_messages)
    const msgSid = `ext_${cleanPhone}_${Date.now()}`;
    await upsertChatMessageWithRetry(supabase, {
      call_sid: msgSid,
      content: `[Mensaje Entrante ${registeredPatientName}]: ${messageText}`
    });

    // 4. PERSISTENCIA EN STORAGE RESILIENTE (chat_omnichannel.json)
    try {
      let allChats: Record<string, any[]> = {};
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allChats = JSON.parse(text);
      }

      const currentList = allChats[conversationKey] || [];
      const newEntry = {
        id: msgSid,
        senderName: registeredPatientName,
        senderRole: 'patient',
        channel_type: channel,
        content: messageText,
        time: timestampFormatted,
        isOwn: false,
        metadata: {
          phone: senderPhone,
          cleanPhone,
          isRegistered,
          provider: 'messaging_webhook',
          externalId: externalEventId,
        },
      };

      allChats[conversationKey] = [...currentList, newEntry];
      if (cleanPhone) {
        allChats[`prospect_${cleanPhone}`] = allChats[conversationKey];
      }

      await supabase.storage.from('audenti_database').upload(
        'chat_omnichannel.json',
        JSON.stringify(allChats, null, 2),
        { upsert: true, contentType: 'application/json' }
      );
    } catch (storageErr: any) {
      console.warn('[Webhook Messaging Storage Note]:', storageErr?.message);
    }

    // 5. EMISIÓN EN TIEMPO REAL (Supabase Realtime Broadcast)
    try {
      await supabase.channel('chat_omnichannel_sync').send({
        type: 'broadcast',
        event: 'incoming_patient_message',
        payload: {
          targetPatientId: conversationKey,
          patientId: targetPatientId,
          patientName: registeredPatientName,
          phone: senderPhone,
          channel_type: channel,
          content: messageText,
          timestamp: timestampFormatted,
          isRegistered,
        },
      });

      await supabase.channel('header_notifications_realtime').send({
        type: 'broadcast',
        event: 'doctor_notification',
        payload: {
          id: `notif-msg-${Date.now()}`,
          title: `💬 Mensaje entrante de ${registeredPatientName}`,
          message: messageText.slice(0, 100),
          type: 'general',
          patient_name: registeredPatientName,
          phone: senderPhone,
          time: timestampFormatted,
        },
      });
    } catch (realtimeErr: any) {
      console.warn('[Webhook Messaging Realtime Note]:', realtimeErr?.message);
    }

    // 6. Invocación de Aura IA (Dominio patient_chat) para autogestión de respuesta
    const aiResponse = await executeAIAgent({
      domain: 'patient_chat',
      prompt: messageText,
      contextData: {
        patientPhone: senderPhone,
        patientName: registeredPatientName,
        channel,
        clinicName: 'Audenti Odontología (Dra. Aura Estudillo)',
      },
    });

    const replyText = typeof aiResponse.result === 'string'
      ? aiResponse.result
      : (aiResponse.result?.result || aiResponse.result?.content || JSON.stringify(aiResponse.result));

    // 7. Despacho automatizado de la respuesta de Aura IA vía API Externa
    if (replyText) {
      await sendExternalMessage({
        to: senderPhone,
        message: replyText,
        patientId: targetPatientId || conversationKey,
        patientName: registeredPatientName,
        type: channel as any,
        metadata: {
          inReplyTo: externalEventId,
          aiDomain: aiResponse.domain,
          provider: aiResponse.provider,
        },
      });
    }

    return NextResponse.json({
      success: true,
      processed: true,
      patient: registeredPatientName,
      phone: senderPhone,
      replySent: Boolean(replyText),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Webhook Messaging Error]:', error?.message);
    return NextResponse.json({
      success: false,
      error: 'Error interno en receptor de mensajería.',
    }, { status: 500 });
  }
}
