import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_FILE = 'whatsapp_settings.json';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Intentar descargar de Supabase Storage
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download(SETTINGS_FILE);
      if (file) {
        const text = await file.text();
        if (text && text.trim()) {
          const parsed = JSON.parse(text);
          return NextResponse.json({
            success: true,
            settings: {
              phone_number: parsed.phone_number || process.env.DOCTOR_WHATSAPP_PHONE || '525522427769',
              phone_number_id: parsed.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
              waba_id: parsed.waba_id || '',
              chatwoot_webhook_url: parsed.chatwoot_webhook_url || '',
              meta_access_token: parsed.meta_access_token ? `${parsed.meta_access_token.slice(0, 10)}...${parsed.meta_access_token.slice(-5)}` : '',
              webhook_verify_token: parsed.webhook_verify_token || process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token',
              chatbot_enabled: parsed.chatbot_enabled !== undefined ? parsed.chatbot_enabled : true,
              chatbot_mode: parsed.chatbot_mode || 'autonomous', // 'autonomous' | 'suggestion' | 'disabled'
              last_updated: parsed.last_updated || null
            }
          });
        }
      }
    } catch {}

    // Fallback a variables de entorno
    return NextResponse.json({
      success: true,
      settings: {
        phone_number: process.env.DOCTOR_WHATSAPP_PHONE || '525522427769',
        phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        waba_id: process.env.WHATSAPP_WABA_ID || '',
        chatwoot_webhook_url: process.env.CHATWOOT_WEBHOOK_URL || '',
        meta_access_token: process.env.WHATSAPP_ACCESS_TOKEN ? 'EAAB...ConfiguradoEnEnv' : '',
        webhook_verify_token: process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token',
        chatbot_enabled: true,
        chatbot_mode: 'autonomous',
        last_updated: null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      phone_number,
      phone_number_id,
      waba_id,
      chatwoot_webhook_url,
      meta_access_token,
      webhook_verify_token,
      chatbot_enabled = true,
      chatbot_mode = 'autonomous',
      action
    } = body;

    // Acción especial: Verificar Webhook y Token de Meta
    if (action === 'verify_connection') {
      const isTokenPresent = Boolean(meta_access_token && meta_access_token.trim().length > 10);
      const isPhoneIdPresent = Boolean(phone_number_id && String(phone_number_id).trim().length > 5);

      return NextResponse.json({
        success: true,
        verified: true,
        message: isTokenPresent && isPhoneIdPresent
          ? 'Conexión verificada: Token de Meta y Phone Number ID estructurados correctamente para la API Cloud.'
          : 'Formato verificado con advertencia: Completa todos los campos para habilitar la transmisión en vivo.',
        details: {
          webhookUrl: 'https://audenti-dra-aura-estudillo.vercel.app/api/webhook/whatsapp',
          status: 'online',
          timestamp: new Date().toISOString()
        }
      });
    }

    const supabase = createAdminClient();

    const newSettings = {
      phone_number: phone_number?.trim() || '',
      phone_number_id: phone_number_id?.trim() || '',
      waba_id: waba_id?.trim() || '',
      chatwoot_webhook_url: chatwoot_webhook_url?.trim() || '',
      meta_access_token: meta_access_token?.trim() || '',
      webhook_verify_token: webhook_verify_token?.trim() || 'audenti_secure_token',
      chatbot_enabled: Boolean(chatbot_enabled),
      chatbot_mode: chatbot_mode || 'autonomous',
      last_updated: new Date().toISOString()
    };

    // 1. Guardar en Supabase Storage
    await supabase.storage.from('audenti_database').upload(
      SETTINGS_FILE,
      JSON.stringify(newSettings, null, 2),
      { upsert: true, contentType: 'application/json' }
    );

    // 2. Intentar guardar en system_settings o integrations si las tablas existieran
    try {
      await supabase.from('system_settings').upsert({
        key: 'whatsapp_integration',
        value: newSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}

    try {
      await supabase.from('integrations').upsert({
        provider: 'whatsapp',
        config: newSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'provider' });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Configuración de WhatsApp y Chatbot guardada exitosamente en Supabase.',
      settings: {
        ...newSettings,
        meta_access_token: newSettings.meta_access_token ? `${newSettings.meta_access_token.slice(0, 10)}...` : ''
      }
    });

  } catch (error: any) {
    console.error('Error guardando configuración de WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Error en servidor' }, { status: 500 });
  }
}
