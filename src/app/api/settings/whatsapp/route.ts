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
              waba_id: parsed.waba_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
              meta_access_token: parsed.meta_access_token ? `${parsed.meta_access_token.slice(0, 10)}...${parsed.meta_access_token.slice(-5)}` : '',
              webhook_verify_token: parsed.webhook_verify_token || process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token',
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
        waba_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        meta_access_token: process.env.WHATSAPP_ACCESS_TOKEN ? 'EAAB...ConfiguradoEnEnv' : '',
        webhook_verify_token: process.env.WHATSAPP_VERIFY_TOKEN || 'audenti_secure_token',
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
    const { phone_number, waba_id, meta_access_token, webhook_verify_token } = body;

    const supabase = createAdminClient();

    const newSettings = {
      phone_number: phone_number?.trim() || '',
      waba_id: waba_id?.trim() || '',
      meta_access_token: meta_access_token?.trim() || '',
      webhook_verify_token: webhook_verify_token?.trim() || 'audenti_secure_token',
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
      message: 'Configuración de WhatsApp guardada exitosamente en Supabase.',
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
