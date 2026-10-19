import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDoctorWhatsAppAlert } from '@/lib/notifications/whatsapp-doctor';
import { evaluateIntentionAndUrgency, formatTimeInMexico, getNowInMexico } from '@/utils/timezone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CallTranscriptionPayload {
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
    const body: CallTranscriptionPayload = await request.json();
    const {
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

    if (patientPhone) {
      const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
      try {
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
      } catch (err: any) {
        console.warn('[Transcription Patient Check Note]:', err?.message);
      }
    }

    if (!finalPatientId) {
      finalPatientId = `prospect_${resolvedPhone.replace(/\D/g, '') || Date.now()}`;
      folio = `PROS-${finalPatientId.slice(-8).toUpperCase()}`;
    }

    // 2. Construir el registro enriquecido con canal estricto
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

    // 4. Garantizar inserción en la base de datos de Supabase bajo el ID del paciente
    try {
      await supabase.from('chat_messages').insert({
        patient_id: isRegistered ? finalPatientId : null,
        sender_role: 'ai',
        sender_name: 'Asistente de Voz (Aura AI)',
        content: voiceRecord.content,
        channel_type: 'voice_call',
        metadata: voiceRecord.metadata,
        created_at: new Date().toISOString()
      });
    } catch (insertErr: any) {
      console.warn('[DB chat_messages insert notice]:', insertErr?.message);
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
      isRegistered,
      folio
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Call Transcription API Error]:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
