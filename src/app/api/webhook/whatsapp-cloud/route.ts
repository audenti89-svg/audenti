import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiResponse } from '@/lib/ai/gemini';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text: { body: string };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// GET: Webhook Verification Challenge Handshake (Meta Developers)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Unauthorized verification token' }, { status: 403 });
}

// POST: Incoming Message Event Handler
export async function POST(req: NextRequest) {
  try {
    const body: WhatsAppWebhookPayload = await req.json();

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const messages = change.value.messages;
        const phoneNumberId = change.value.metadata.phone_number_id;

        if (!messages || messages.length === 0) continue;

        const message = messages[0];
        const senderPhone = message.from;
        const messageText = message.text?.body;
        const messageId = message.id;

        if (!messageText) continue;

        // Idempotency check / Duplicate processing prevention can be hooked here via DB
        console.log(`[WhatsApp Incoming] ID: ${messageId} | From: ${senderPhone} | Text: ${messageText}`);

        // Generate Commercial/Clinical AI Response using Gemini Engine via OpenRouter
        const aiReply = await generateGeminiResponse(senderPhone, messageText);

        // Dispatch Response via Meta Graph API
        await sendWhatsAppMessage(phoneNumberId, senderPhone, aiReply);
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]:', error);
    
    // Graceful Spanish Fallback Protocol
    return NextResponse.json(
      { 
        error: 'Disculpa el inconveniente, estamos experimentando un retraso en la conexión. Un asesor de nuestro equipo se comunicará contigo a la brevedad.' 
      }, 
      { status: 500 }
    );
  }
}
