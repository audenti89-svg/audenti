/**
 * Cliente Universal de Mensajería Externa (Zernio / WhatsApp Cloud / SMS API)
 * Diseñado para Audenti Clinical CRM.
 * Gestiona el despacho HTTP POST hacia proveedores de mensajería externos (Zernio, Meta Cloud, Gateways SMS).
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface ExternalMessagingPayload {
  to: string; // Número telefónico destino (E.164 o 10 dígitos)
  message: string; // Texto del mensaje
  patientId?: string; // ID o folio del paciente
  patientName?: string;
  type?: 'whatsapp' | 'sms' | 'auto';
  template?: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
}

export interface MessagingConfig {
  apiUrl: string;
  apiKey: string;
  provider: 'zernio' | 'meta' | 'openwa' | 'generic';
  phoneNumberId?: string;
  sessionId?: string;
  webhookSecret?: string;
  enabled: boolean;
}

const SETTINGS_FILE = 'whatsapp_settings.json';

/**
 * Obtiene la configuración activa de mensajería desde Supabase Storage o variables de entorno
 */
export async function getMessagingConfig(): Promise<MessagingConfig> {
  const supabase = createAdminClient();

  try {
    const { data: file } = await supabase.storage.from('audenti_database').download(SETTINGS_FILE);
    if (file) {
      const text = await file.text();
      if (text && text.trim()) {
        const parsed = JSON.parse(text);
        return {
          apiUrl: parsed.messaging_api_url || process.env.MESSAGING_API_URL || process.env.OPENWA_API_URL || process.env.ZERNIO_API_URL || 'http://localhost:2785',
          apiKey: parsed.messaging_api_key || process.env.MESSAGING_API_KEY || process.env.OPENWA_API_KEY || process.env.ZERNIO_API_KEY || parsed.meta_access_token || '',
          provider: parsed.messaging_provider || (process.env.OPENWA_API_KEY ? 'openwa' : process.env.ZERNIO_API_KEY ? 'zernio' : 'meta'),
          phoneNumberId: parsed.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
          sessionId: parsed.session_id || process.env.OPENWA_SESSION_ID || 'audenti_default',
          webhookSecret: parsed.webhook_verify_token || process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token',
          enabled: parsed.chatbot_enabled !== undefined ? parsed.chatbot_enabled : true,
        };
      }
    }
  } catch (err) {
    console.warn('[ExternalMessaging] Usando variables de entorno por defecto:', err);
  }

  return {
    apiUrl: process.env.MESSAGING_API_URL || process.env.OPENWA_API_URL || process.env.ZERNIO_API_URL || 'http://localhost:2785',
    apiKey: process.env.MESSAGING_API_KEY || process.env.OPENWA_API_KEY || process.env.ZERNIO_API_KEY || process.env.WHATSAPP_ACCESS_TOKEN || '',
    provider: (process.env.OPENWA_API_KEY ? 'openwa' : process.env.ZERNIO_API_KEY ? 'zernio' : 'meta') as any,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    sessionId: process.env.OPENWA_SESSION_ID || 'audenti_default',
    webhookSecret: process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token',
    enabled: true,
  };
}

/**
 * Envía un mensaje saliente a través de la API externa (Zernio / WhatsApp / SMS)
 * e inserta automáticamente el registro en chat_messages de Supabase para mantener
 * el historial íntegro.
 */
export async function sendExternalMessage(payload: ExternalMessagingPayload): Promise<{
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}> {
  const config = await getMessagingConfig();
  const cleanPhone = payload.to.replace(/\D/g, '').replace(/^(\+?52)?/, '52');

  try {
    let apiSuccess = false;
    let messageId = `msg-ext-${Date.now()}`;

    // 1. Despacho HTTP POST si el proveedor configurado es OpenWA (Open-WhatsApp Gateway)
    if (config.provider === 'openwa' && config.apiUrl) {
      try {
        const sessionId = config.sessionId || 'audenti_default';
        const openwaUrl = config.apiUrl.includes('/messages/send-text')
          ? config.apiUrl
          : `${config.apiUrl.replace(/\/+$/, '')}/api/sessions/${sessionId}/messages/send-text`;

        const openwaRes = await fetch(openwaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { 'X-API-Key': config.apiKey, 'Authorization': `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            chatId: `${cleanPhone}@c.us`,
            text: payload.message,
          }),
        });

        if (openwaRes.ok) {
          const respData = await openwaRes.json().catch(() => ({}));
          messageId = respData.id || respData.messageId || respData.message_id || messageId;
          apiSuccess = true;
        } else {
          console.warn(`[OpenWA Gateway] Retornó status ${openwaRes.status}. Intentando fallbacks.`);
        }
      } catch (openwaErr: any) {
        console.warn('[OpenWA Gateway] Error conectando con pasarela OpenWA:', openwaErr?.message);
      }
    }

    // 2. Despacho HTTP POST al proveedor configurado (Zernio / Proveedor Externo)
    if (!apiSuccess && config.apiKey && config.apiUrl && config.provider !== 'openwa') {
      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'X-API-Key': config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: cleanPhone,
            phone: cleanPhone,
            to: cleanPhone,
            message: payload.message,
            content: payload.message,
            channel: payload.type || 'whatsapp',
            sender: 'Audenti Dra. Aura Estudillo',
            metadata: {
              patientId: payload.patientId,
              patientName: payload.patientName,
              source: 'audenti_multi_agent',
              ...payload.metadata,
            },
          }),
        });

        if (response.ok) {
          const respData = await response.json().catch(() => ({}));
          messageId = respData.id || respData.messageId || respData.message_id || messageId;
          apiSuccess = true;
        } else {
          console.warn(`[ExternalMessaging] Proveedor retornó status ${response.status}. Intentando fallback Meta/Local.`);
        }
      } catch (httpErr: any) {
        console.warn('[ExternalMessaging] Error al contactar API externa:', httpErr?.message);
      }
    }

    // 2. Fallback a WhatsApp Cloud API de Meta si Zernio no tiene API Key configurada
    if (!apiSuccess && config.phoneNumberId && config.apiKey) {
      try {
        const metaUrl = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;
        const metaRes = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body: payload.message },
          }),
        });

        if (metaRes.ok) {
          apiSuccess = true;
        }
      } catch (metaErr: any) {
        console.warn('[ExternalMessaging] Fallback Meta API error:', metaErr?.message);
      }
    }

    // 3. Fallback a Pasarela QR (Evolution API / WAHA / DeskcommCRM)
    const qrGatewayUrl = process.env.WHATSAPP_QR_GATEWAY_URL;
    const qrApiKey = process.env.WHATSAPP_QR_API_KEY;
    const qrInstanceName = process.env.WHATSAPP_QR_INSTANCE || 'audenti-aura';
    if (!apiSuccess && qrGatewayUrl) {
      try {
        await fetch(`${qrGatewayUrl}/message/sendText/${qrInstanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(qrApiKey ? { apikey: qrApiKey } : {}),
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: payload.message,
          }),
        });
        apiSuccess = true;
      } catch (qrErr: any) {
        console.warn('[ExternalMessaging] QR Gateway error:', qrErr?.message);
      }
    }

    // 4. Registro OBLIGATORIO en Supabase PostgreSQL (chat_messages y Storage)
    const supabase = createAdminClient();
    try {
      let resolvedPatientId = payload.patientId || null;

      // Si no tenemos patientId pero sí teléfono, buscar al paciente
      if (!resolvedPatientId && cleanPhone) {
        const tenDigits = cleanPhone.slice(-10);
        const { data: found } = await supabase
          .from('patients')
          .select('id')
          .ilike('phone', `%${tenDigits}%`)
          .maybeSingle();
        if (found?.id) {
          resolvedPatientId = found.id;
        }
      }

      await supabase.from('chat_messages').insert({
        patient_id: resolvedPatientId,
        sender_role: 'ai',
        sender_name: 'Dra. Aura Estudillo (Aura IA)',
        content: payload.message,
        channel_type: payload.type || 'whatsapp',
        metadata: {
          phone: cleanPhone,
          patientName: payload.patientName,
          direction: 'outbound',
          provider: config.provider || 'zernio',
          messageId,
          ...(payload.metadata || {}),
        },
        created_at: new Date().toISOString(),
      });

      // Redundancia síncrona en chat_omnichannel.json
      if (resolvedPatientId) {
        try {
          let allChats: Record<string, any[]> = {};
          const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
          if (file) {
            const text = await file.text();
            if (text && text.trim()) allChats = JSON.parse(text);
          }
          const patientHistory = allChats[resolvedPatientId] || [];
          patientHistory.push({
            id: messageId,
            channel_type: payload.type || 'whatsapp',
            senderName: 'Dra. Aura Estudillo (Aura IA)',
            senderRole: 'ai',
            isDoctor: true,
            timestamp: new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date()),
            content: payload.message,
          });
          allChats[resolvedPatientId] = patientHistory;
          await supabase.storage.from('audenti_database').upload(
            'chat_omnichannel.json',
            JSON.stringify(allChats, null, 2),
            { upsert: true, contentType: 'application/json' }
          );
        } catch {}
      }
    } catch (dbErr: any) {
      console.warn('[ExternalMessaging] Error guardando en chat_messages:', dbErr?.message);
    }

    return {
      success: true,
      messageId,
      provider: config.provider,
    };
  } catch (error: any) {
    console.error('[ExternalMessaging] Error global de despacho:', error);
    return {
      success: false,
      error: error?.message || 'Error desconocido al despachar mensaje.',
    };
  }
}
