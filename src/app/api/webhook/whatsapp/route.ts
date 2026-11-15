import { NextResponse } from 'next/server';
import { executeAIAgent } from '@/lib/ai/router';
import { prisma } from '@/lib/prisma';
import { writeAheadLog, upsertChatMessageWithRetry } from '@/lib/persistence/omnichannel-wal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verificación del Webhook (requerido por Meta / WhatsApp Cloud API)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Token de verificación inválido' }, { status: 403 });
}

// Recepción de mensajes entrantes de los pacientes
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Respaldo Local Inmediato (Write-Ahead Log)
    writeAheadLog('webhook_whatsapp', body);

    // 1. Formato WhatsApp Cloud API (Meta Developers)
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messageData = value?.messages?.[0];

    // 2. Formato Pasarela OpenWA (Open-WhatsApp Gateway / NestJS)
    const isOpenWA = Boolean(
      body.event === 'message.received' ||
      body.event === 'message' ||
      body.event === 'onMessage' ||
      (body.sessionId && (body.data?.body || body.message?.body || body.data?.text)) ||
      body.chatId
    );

    // 3. Formato Pasarela QR (Evolution API / Z-API / Baileys)
    const qrData = body.data;
    const isQrGateway = Boolean(qrData?.key);

    let patientPhone = '';
    let patientMessage = '';
    let patientName = 'Paciente WhatsApp';

    if (isOpenWA) {
      // Proviene de Pasarela OpenWA
      const openwaMsg = body.data || body.message || body;
      if (openwaMsg.fromMe || body.fromMe) {
        return NextResponse.json({ success: true, status: 'ignored_own_openwa_message' }, { status: 200 });
      }
      const rawFrom = openwaMsg.from || openwaMsg.chatId || openwaMsg.sender?.id || body.chatId || '';
      patientPhone = String(rawFrom).replace(/@.*$/, '').replace(/^521/, '52');
      patientMessage = String(openwaMsg.body || openwaMsg.text || openwaMsg.content || '').trim();
      patientName = openwaMsg.sender?.pushname || openwaMsg.sender?.name || openwaMsg.pushName || 'Paciente WhatsApp';
    } else if (messageData) {
      // Proviene de WhatsApp Cloud API
      patientPhone = messageData.from || '';
      patientMessage = messageData.text?.body || '';
      patientName = value?.contacts?.[0]?.profile?.name || 'Paciente WhatsApp';
    } else if (isQrGateway) {
      // Proviene de pasarela QR
      if (qrData?.key?.fromMe) {
        return NextResponse.json({ success: true, status: 'ignored_own_message' }, { status: 200 });
      }
      const remoteJid = qrData?.key?.remoteJid || '';
      patientPhone = remoteJid.replace(/@.*$/, '').replace(/^521/, '52');
      patientMessage = qrData?.message?.conversation || qrData?.message?.extendedTextMessage?.text || '';
      patientName = qrData?.pushName || 'Paciente WhatsApp';
    }

    if (!patientMessage || !patientPhone) {
      return NextResponse.json({ success: true, status: 'no_processable_message' }, { status: 200 });
    }

    // Invocamos nuestro Enrutador Central usando el dominio 'patient_chat'
    const aiResponse = await executeAIAgent({
      domain: 'patient_chat',
      prompt: patientMessage,
      contextData: {
        patientPhone,
        channel: 'whatsapp',
        clinicName: 'Audenti Odontología (Dra. Aura Estudillo)',
      },
    });

    const replyText = typeof aiResponse.result === 'string'
      ? aiResponse.result
      : (aiResponse.result?.result || aiResponse.result?.content || JSON.stringify(aiResponse.result));

    // Opcional: Persistir en Prisma si está configurado
    try {
      let patientRecord = await prisma.patient.findFirst({
        where: { phone: patientPhone }
      });

      if (!patientRecord) {
        patientRecord = await prisma.patient.create({
          data: {
            name: patientName,
            phone: patientPhone,
            tags: ['whatsapp', 'crm_cxm']
          }
        });
      }

      let conv = await prisma.conversation.findFirst({
        where: { patientId: patientRecord.id, status: 'OPEN' }
      });

      if (!conv) {
        conv = await prisma.conversation.create({
          data: { patientId: patientRecord.id, status: 'OPEN', aiEnabled: true }
        });
      }

      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderType: 'CLIENT',
          senderName: patientName,
          content: patientMessage
        }
      });

      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderType: 'AI',
          senderName: 'Aura AI',
          content: replyText
        }
      });
    } catch (dbErr: any) {
      console.warn('[WhatsApp Webhook Prisma Note]:', dbErr?.message);
    }

    // Persistencia Directa en Supabase PostgreSQL (chat_messages & chat_omnichannel.json)
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();

      const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
      let targetPatientId = '';
      let isRegistered = false;

      const { data: found } = await supabase
        .from('patients')
        .select('id, full_name, phone')
        .ilike('phone', `%${cleanPhone}%`)
        .maybeSingle();

      if (found) {
        targetPatientId = found.id;
        isRegistered = true;
      } else {
        targetPatientId = `prospect_${patientPhone.replace(/\D/g, '') || Date.now()}`;
      }

      const nowFormatted = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Inserción idempotente con reintentos para mensaje entrante y respuesta de IA
      const inSid = `wa_in_${cleanPhone}_${Date.now()}`;
      const outSid = `wa_out_${cleanPhone}_${Date.now() + 1}`;

      await upsertChatMessageWithRetry(supabase, {
        call_sid: inSid,
        content: `[WhatsApp Paciente]: ${patientMessage}`
      });

      await upsertChatMessageWithRetry(supabase, {
        call_sid: outSid,
        content: `[WhatsApp Aura IA]: ${replyText}`
      });

      // Redundancia en Storage chat_omnichannel.json
      try {
        let allChats: Record<string, any[]> = {};
        const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
        if (file) {
          const text = await file.text();
          if (text && text.trim()) allChats = JSON.parse(text);
        }
        const patientHistory = allChats[targetPatientId] || [];
        patientHistory.push({
          id: inSid,
          channel_type: 'whatsapp',
          senderName: patientName,
          senderRole: 'patient',
          isDoctor: false,
          timestamp: nowFormatted,
          content: patientMessage
        });
        patientHistory.push({
          id: outSid,
          channel_type: 'whatsapp',
          senderName: 'Aura AI',
          senderRole: 'ai',
          isDoctor: false,
          timestamp: nowFormatted,
          content: replyText
        });
        allChats[targetPatientId] = patientHistory;
        if (cleanPhone) {
          allChats[`prospect_${cleanPhone}`] = patientHistory;
        }
        await supabase.storage.from('audenti_database').upload(
          'chat_omnichannel.json',
          JSON.stringify(allChats, null, 2),
          { upsert: true, contentType: 'application/json' }
        );
      } catch (stErr: any) {
        console.warn('[WhatsApp Storage Sync Note]:', stErr?.message);
      }

      // Emisión de Realtime Broadcast
      await supabase.channel('chat_omnichannel_sync').send({
        type: 'broadcast',
        event: 'sync_patient_message',
        payload: {
          targetPatientId,
          patientId: targetPatientId,
          patientName,
          phone: patientPhone,
          channel_type: 'whatsapp',
          message: patientMessage,
          reply: replyText,
          timestamp: nowFormatted
        }
      });
    } catch (supaErr: any) {
      console.warn('[WhatsApp Supabase Sync Note]:', supaErr?.message);
    }

    // Si está configurada la pasarela QR, despachar el mensaje
    const qrGatewayUrl = process.env.WHATSAPP_QR_GATEWAY_URL;
    const qrApiKey = process.env.WHATSAPP_QR_API_KEY;
    const qrInstanceName = process.env.WHATSAPP_QR_INSTANCE || 'audenti-aura';

    if (qrGatewayUrl) {
      try {
        await fetch(`${qrGatewayUrl}/message/sendText/${qrInstanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(qrApiKey ? { apikey: qrApiKey } : {})
          },
          body: JSON.stringify({
            number: patientPhone,
            text: replyText
          })
        });
      } catch (sendErr: any) {
        console.error('[WhatsApp QR Send Error]:', sendErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      processed: true,
      patientPhone,
      reply: replyText
    }, { status: 200 });

  } catch (error: any) {
    console.error('[WhatsApp Webhook Error]:', error?.message);
    return NextResponse.json({ success: false, error: 'Error procesando webhook de WhatsApp' }, { status: 500 });
  }
}
