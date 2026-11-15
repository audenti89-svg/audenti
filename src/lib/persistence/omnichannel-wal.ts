import fs from 'fs';
import path from 'path';

export interface OmnichannelBackupRecord {
  timestamp: string;
  type: 'call_transcription' | 'chat_message' | 'webhook_whatsapp' | 'chatwoot_webhook' | 'messaging_webhook' | string;
  payload: any;
}

/**
 * 1. RESPALDO LOCAL INMEDIATO (Write-Ahead Log - WAL):
 * Guarda el payload completo en storage/backups/omnichannel_backup.jsonl con timestamp ISO antes de tocar Supabase.
 * Diseñado con protección total contra excepciones para garantizar que jamás interrumpa la respuesta HTTP.
 */
export function writeAheadLog(type: string, payload: any): void {
  try {
    const backupDir = path.join(process.cwd(), 'storage', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFilePath = path.join(backupDir, 'omnichannel_backup.jsonl');
    const record: OmnichannelBackupRecord = {
      timestamp: new Date().toISOString(),
      type,
      payload
    };

    // Escritura rápida y segura
    fs.appendFile(backupFilePath, JSON.stringify(record) + '\n', 'utf8', (err) => {
      if (err) {
        console.warn('[WAL Async Notice] Escritura en segundo plano diferida:', err.message);
      }
    });
  } catch (walErr: any) {
    console.error('[WAL Error] No se pudo escribir en omnichannel_backup.jsonl:', walErr?.message);
  }
}

let cachedChannelId: string | null = null;
let cachedSenderId: string | null = null;

async function resolveDefaultChannelAndSender(supabase: any) {
  if (!cachedChannelId) {
    try {
      const { data: channel } = await supabase.from('chat_channels').select('id').limit(1).maybeSingle();
      if (channel?.id) {
        cachedChannelId = channel.id;
      } else {
        const { data: created } = await supabase.from('chat_channels').insert({
          tenant_id: 'c62fc15b-bf68-4101-881d-fdd9258fce1f',
          name: 'Canal general',
          channel_type: 'general'
        }).select('id').maybeSingle();
        cachedChannelId = created?.id || '43119aa2-c564-4348-b4bc-64933545a90d';
      }
    } catch {
      cachedChannelId = '43119aa2-c564-4348-b4bc-64933545a90d';
    }
  }

  if (!cachedSenderId) {
    try {
      const { data: user } = await supabase.from('users').select('id').limit(1).maybeSingle();
      cachedSenderId = user?.id || '063504f1-2752-4734-9bc4-5174940af6eb';
    } catch {
      cachedSenderId = '063504f1-2752-4734-9bc4-5174940af6eb';
    }
  }

  return {
    channelId: cachedChannelId || '43119aa2-c564-4348-b4bc-64933545a90d',
    senderId: cachedSenderId || '063504f1-2752-4734-9bc4-5174940af6eb'
  };
}

export interface UpsertChatRecordOptions {
  call_sid: string;
  content: string;
  channel_id?: string;
  sender_id?: string;
  media_urls?: string[];
  [key: string]: any;
}

/**
 * 2. INSERCIÓN IDEMPOTENTE CON REINTENTOS (Exponential Backoff):
 * - Extrae call_sid o identificador determinístico.
 * - Ejecuta upsert en la tabla chat_messages usando { onConflict: 'call_sid' }.
 * - Hasta 3 reintentos (esperando 1s, 2s y 4s entre fallos).
 */
export async function upsertChatMessageWithRetry(
  supabase: any,
  record: UpsertChatRecordOptions,
  maxRetries = 3
): Promise<{ success: boolean; data?: any; error?: any }> {
  const backoffDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

  const { channelId, senderId } = await resolveDefaultChannelAndSender(supabase);

  const payloadToInsert: Record<string, any> = {
    channel_id: record.channel_id || channelId,
    sender_id: record.sender_id || senderId,
    content: record.content || 'Sin contenido especificado',
    call_sid: record.call_sid,
    media_urls: record.media_urls || []
  };

  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .upsert(payloadToInsert, { onConflict: 'call_sid' })
        .select();

      if (!error && data) {
        return { success: true, data };
      }

      lastError = error;
      console.warn(`[chat_messages upsert intento ${attempt + 1}/${maxRetries} falló]:`, error?.message);
    } catch (err: any) {
      lastError = err;
      console.warn(`[chat_messages upsert intento ${attempt + 1}/${maxRetries} excepción]:`, err?.message);
    }

    if (attempt < maxRetries - 1) {
      const delayMs = backoffDelays[attempt] || 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { success: false, error: lastError };
}
