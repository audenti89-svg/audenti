import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDoctorWhatsAppAlert } from '@/lib/notifications/whatsapp-doctor';
import { evaluateIntentionAndUrgency, formatTimeInMexico, getNowInMexico } from '@/utils/timezone';
import { writeAheadLog, upsertChatMessageWithRetry } from '@/lib/persistence/omnichannel-wal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CallTranscriptionPayload {
  call_sid?: string;
  callSid?: string;
  CallSid?: string;
  sid?: string;
  patientId?: string;
  patient_name?: string;
  patientName?: string;
  phone?: string;
  patientPhone?: string;
  durationSeconds?: number;
  reason?: string;
  consultationReason?: string;
  urgency_level?: 'Urgente' | 'No Urgente';
  urgencyLevel?: 'Urgente' | 'No Urgente';
  transcription?: string;
  dialogue?: Array<{ role: 'user' | 'assistant'; text: string }>;
  full_transcript?: Array<{ speaker: string; text: string }>;
  summary?: string;
  timestamp?: string;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.CALL_TRANSCRIPTION_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

    // Validación de firma o secreto de webhook de telefonía
    if (expectedSecret) {
      const token = authHeader?.replace(/^Bearer\s+/i, '');
      if (token !== expectedSecret) {
        return NextResponse.json({ success: false, error: 'Firma de webhook inválida' }, { status: 401 });
      }
    }

    const body: CallTranscriptionPayload = await request.json();

    // 1. RESPALDO LOCAL INMEDIATO (Write-Ahead Log):
    // Guarda el payload completo en storage/backups/omnichannel_backup.jsonl antes de tocar Supabase
    writeAheadLog('call_transcription', body);

    const {
      call_sid: rawCallSid,
      callSid: rawCallSidCamel,
      CallSid: rawCallSidPascal,
      sid: rawSid,
      patientId: rawPatientId,
      patient_name: aliasPatientName,
      patientName: originalPatientName,
      phone: aliasPhone,
      patientPhone: originalPhone = '',
      durationSeconds = 0,
      reason: aliasReason,
      consultationReason: originalReason,
      urgency_level: aliasUrgency,
      urgencyLevel: originalUrgency,
      transcription = '',
      dialogue = [],
      full_transcript = [],
      summary = '',
      timestamp
    } = body;

    const patientName = aliasPatientName || originalPatientName || 'Paciente Consulta de Voz';
    const patientPhone = aliasPhone || originalPhone || '';

    // Normalizar diálogo desde full_transcript o dialogue
    const normalizedDialogue: Array<{ role: 'user' | 'assistant'; text: string }> = dialogue.length > 0
      ? dialogue
      : (full_transcript.length > 0
          ? full_transcript.map(t => ({
              role: t.speaker.toLowerCase().includes('aura') ? 'assistant' : 'user',
              text: t.text
            }))
          : []);

    // Evaluar matriz de intención y urgencia inteligente (Horarios CDMX: L-V 9-18h, Sáb 9-14h, Dom cerrado)
    const callTextCorpus = `${summary} ${transcription} ${normalizedDialogue.map(d => d.text).join(' ')}`;
    const evaluation = evaluateIntentionAndUrgency(callTextCorpus, timestamp || new Date());

    const finalConsultationReason = aliasReason || originalReason || evaluation.suggestedReason || 'Solicitud de Cita Médica por Voz';
    // Regla de Oro: Urgencia únicamente ante dolor agudo, trauma o accidente (trafficLight === 'red')
    const finalUrgencyLevel = evaluation.trafficLight === 'red' ? 'Urgente' : 'No Urgente';
    const trafficLight = evaluation.trafficLight;

    const supabase = createAdminClient();
    const nowFormatted = timestamp
      ? formatTimeInMexico(timestamp)
      : formatTimeInMexico(getNowInMexico());

    // 1. Identificar o vincular paciente en Supabase
    let finalPatientId = rawPatientId;
    let isRegistered = false;
    let folio = '';
    let resolvedName = patientName;
    let resolvedPhone = patientPhone;

    // Buscar en patients de Supabase por teléfono o por nombre
    try {
      if (patientPhone) {
        const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
        if (cleanPhone) {
          const { data: found } = await supabase
            .from('patients')
            .select('id, full_name, phone')
            .ilike('phone', `%${cleanPhone}%`)
            .maybeSingle();

          if (found) {
            finalPatientId = found.id;
            isRegistered = true;
            resolvedName = found.full_name || patientName;
            resolvedPhone = found.phone || patientPhone;
            folio = `EXP-${found.id.slice(0, 8).toUpperCase()}`;
          }
        }
      }

      // Si aún no está registrado pero tenemos nombre, buscar por nombre
      if (!isRegistered && resolvedName && resolvedName !== 'Paciente' && !resolvedName.includes('Consulta de Voz')) {
        const { data: foundByName } = await supabase
          .from('patients')
          .select('id, full_name, phone')
          .ilike('full_name', `%${resolvedName.trim()}%`)
          .maybeSingle();

        if (foundByName) {
          finalPatientId = foundByName.id;
          isRegistered = true;
          resolvedName = foundByName.full_name;
          resolvedPhone = foundByName.phone || resolvedPhone;
          folio = `EXP-${foundByName.id.slice(0, 8).toUpperCase()}`;
        }
      }
    } catch (err: any) {
      console.warn('[Transcription Patient Check Note]:', err?.message);
    }

    if (!finalPatientId) {
      finalPatientId = `prospect_${resolvedPhone.replace(/\D/g, '') || Date.now()}`;
      folio = `PROS-${finalPatientId.slice(-8).toUpperCase()}`;
    }

    // 2. Construir el registro enriquecido con canal estricto
    const effectiveCallSid = rawCallSid || rawCallSidCamel || rawCallSidPascal || rawSid || `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const voiceRecord = {
      id: `voice-rec-${Date.now()}`,
      channel_type: 'voice_call' as const,
      senderName: 'Asistente de Voz (Aura AI)',
      senderRole: 'ai' as const,
      isDoctor: false,
      timestamp: nowFormatted,
      content: summary || `📞 Llamada de voz finalizada con ${resolvedName}. Motivo: ${finalConsultationReason}`,
      // Metadatos de la transcripción
      metadata: {
        channel_type: 'voice_call',
        call_sid: effectiveCallSid,
        durationSeconds,
        consultationReason: finalConsultationReason,
        urgencyLevel: finalUrgencyLevel,
        trafficLight,
        transcription: transcription || (normalizedDialogue.length > 0 ? normalizedDialogue.map(d => `${d.role === 'user' ? resolvedName : 'Aura AI'}: ${d.text}`).join('\n') : ''),
        dialogue: normalizedDialogue.length > 0 ? normalizedDialogue : [
          { role: 'assistant', text: 'Hola, bienvenido a Audenti. ¿En qué podemos ayudarte hoy?' },
          { role: 'user', text: summary || 'Solicitud de valoración y cita médica.' }
        ],
        summary: summary || 'El paciente se comunicó por voz solicitando atención dental.',
        patientName: resolvedName,
        phone: resolvedPhone,
        folio: folio || 'PROSPECTO-VOZ',
        isRegistered,
        isOutsideHours: evaluation.isOutsideHours,
        intention: evaluation.intention
      }
    };

    // 3. Persistir en chat_omnichannel.json de Supabase Storage
    try {
      let allChats: Record<string, any[]> = {};
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allChats = JSON.parse(text);
      }

      allChats[finalPatientId] = [...(allChats[finalPatientId] || []), voiceRecord];

      await supabase.storage.from('audenti_database').upload(
        'chat_omnichannel.json',
        JSON.stringify(allChats, null, 2),
        { upsert: true, contentType: 'application/json' }
      );
    } catch (storageErr: any) {
      console.warn('[Call Transcription Storage Note]:', storageErr?.message);
    }

    // 4. INSERCIÓN IDEMPOTENTE CON REINTENTOS (Exponential Backoff en PostgreSQL con call_sid):
    try {
      await upsertChatMessageWithRetry(supabase, {
        call_sid: effectiveCallSid,
        content: voiceRecord.content,
        media_urls: []
      });
    } catch (insertErr: any) {
      console.warn('[DB chat_messages upsert notice]:', insertErr?.message);
    }

    try {
      await supabase.from('doctor_alerts').insert({
        patient_id: isRegistered ? finalPatientId : null,
        patient_name: resolvedName,
        phone: resolvedPhone,
        title: isRegistered ? `📞 LLAMADA DE VOZ: ${resolvedName}` : `📞 🟠 PROSPECTO NUEVO (VOZ): ${resolvedName}`,
        message: `${finalConsultationReason} • Urgencia: ${finalUrgencyLevel}`,
        type: 'voice',
        urgency_level: finalUrgencyLevel,
        confirmed_by_doctor: false,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    } catch {}

    // Guardar en doctor_alerts.json en Storage para redundancia absoluta
    try {
      let alertsList: any[] = [];
      const { data: alertsFile } = await supabase.storage.from('audenti_database').download('doctor_alerts.json');
      if (alertsFile) {
        const text = await alertsFile.text();
        if (text && text.trim()) alertsList = JSON.parse(text);
      }
      alertsList.unshift({
        id: `alert-voice-${Date.now()}`,
        type: 'voice',
        patient_name: resolvedName,
        phone: resolvedPhone,
        title: isRegistered ? `📞 LLAMADA DE VOZ: ${resolvedName}` : `📞 🟠 PROSPECTO NUEVO (VOZ): ${resolvedName}`,
        message: `${finalConsultationReason} • Urgencia: ${finalUrgencyLevel}`,
        urgency_level: finalUrgencyLevel,
        channel_type: 'voice_call',
        targetPatientId: finalPatientId,
        time: nowFormatted,
        link: `/dashboard/chat?patientId=${encodeURIComponent(finalPatientId)}`
      });
      await supabase.storage.from('audenti_database').upload(
        'doctor_alerts.json',
        JSON.stringify(alertsList.slice(0, 50), null, 2),
        { upsert: true, contentType: 'application/json' }
      );
    } catch {}

    // 5. Emitir eventos Realtime para el Dashboard de la Doctora y el Badge de Comunicación
    const realtimePayload = {
      targetPatientId: finalPatientId,
      patientId: finalPatientId,
      patientName: resolvedName,
      phone: resolvedPhone,
      isRegistered,
      folio,
      channel_type: 'voice_call',
      consultationReason: finalConsultationReason,
      urgencyLevel: finalUrgencyLevel,
      trafficLight,
      durationSeconds,
      summary: voiceRecord.content,
      transcription: voiceRecord.metadata.transcription,
      dialogue: voiceRecord.metadata.dialogue,
      timestamp: nowFormatted,
      status: 'ended'
    };

    await supabase.channel('chat_omnichannel_sync').send({
      type: 'broadcast',
      event: 'voice_call_event',
      payload: realtimePayload
    });

    await supabase.channel('header_notifications_realtime').send({
      type: 'broadcast',
      event: 'doctor_notification',
      payload: {
        id: `notif-voice-${Date.now()}`,
        title: isRegistered ? `📞 LLAMADA DE VOZ: ${resolvedName}` : `📞 🟠 PROSPECTO NUEVO (VOZ): ${resolvedName}`,
        message: `${finalConsultationReason} • Urgencia: ${finalUrgencyLevel}`,
        type: 'voice',
        patient_name: resolvedName,
        phone: resolvedPhone,
        consultationReason: finalConsultationReason,
        urgencyLevel: finalUrgencyLevel,
        trafficLight,
        channel_type: 'voice_call',
        targetPatientId: finalPatientId,
        url: `/dashboard/chat?patientId=${encodeURIComponent(finalPatientId)}`,
        time: nowFormatted
      }
    });

    // 6. Alerta WhatsApp hacia la Dra. Aura
    await sendDoctorWhatsAppAlert({
      title: `📞 LLAMADA DE VOZ FINALIZADA (${finalUrgencyLevel.toUpperCase()})`,
      patientName: `${resolvedName} [${resolvedPhone || 'Web Voice'}]`,
      message: `🎯 Motivo: ${finalConsultationReason}\n⏱️ Duración: ${durationSeconds}s\n🎙️ Resumen: ${voiceRecord.content}`,
      type: 'voice_call'
    });

    return NextResponse.json({
      success: true,
      patientId: finalPatientId,
      recordId: voiceRecord.id,
      call_sid: effectiveCallSid,
      isRegistered,
      folio
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Call Transcription API Error]:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
