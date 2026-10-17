import { NextResponse } from 'next/server';
import { executeAIAgent } from '@/lib/ai/router';
import { prisma } from '@/lib/prisma';

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

    // 1. Formato WhatsApp Cloud API (Meta Developers)
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messageData = value?.messages?.[0];

    // 2. Formato Pasarela QR (Evolution API / Z-API / Baileys)
    const qrData = body.data;
    const isQrGateway = Boolean(qrData?.key);

    let patientPhone = '';
    let patientMessage = '';
    let patientName = 'Paciente WhatsApp';

    if (messageData) {
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

    // Invocamos nuestro Enrutador Central usando el dominio 'patient_chat' (GPT-4o mini)
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

    console.log(`[WhatsApp CXM] Respuesta generada para ${patientPhone}:`, replyText);

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
      console.warn('[WhatsApp Webhook DB Note]:', dbErr.message);
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
        console.error('[WhatsApp QR Send Error]:', sendErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      processed: true,
      patientPhone,
      reply: replyText
    }, { status: 200 });

  } catch (error: any) {
    console.error('[WhatsApp Webhook Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
