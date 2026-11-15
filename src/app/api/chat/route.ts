import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendDoctorWhatsAppAlert, sendPatientWhatsAppMessage } from '@/lib/notifications/whatsapp-doctor';
import { isInternalUser } from '@/lib/auth/admin-emails';

export const runtime = 'nodejs';

// Endpoint para guardar mensajes del chat omnicanal (con autenticación y RLS)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, message } = body;

    if (!patientId || !message) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    // 1. Descargar chat actual
    let allChats: Record<string, any[]> = {};
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) allChats = JSON.parse(text);
      }
    } catch {}

    // 2. Resolver teléfono y pacientes hermanos con el mismo teléfono para consolidación total
    let cleanPhone = '';
    let siblingPatientIds: string[] = [];

    if (patientId.startsWith('prospect_')) {
      cleanPhone = patientId.replace('prospect_', '').replace(/\D/g, '').slice(-10);
    } else {
      try {
        const { data: currentP } = await supabase.from('patients').select('phone').eq('id', patientId).maybeSingle();
        if (currentP?.phone) {
          cleanPhone = currentP.phone.replace(/\D/g, '').slice(-10);
        }
      } catch {}
    }

    if (!cleanPhone && message.metadata?.phone) {
      cleanPhone = String(message.metadata.phone).replace(/\D/g, '').slice(-10);
    }

    if (cleanPhone && cleanPhone.length >= 7) {
      try {
        const { data: siblings } = await supabase.from('patients').select('id').ilike('phone', `%${cleanPhone}%`);
        if (siblings && siblings.length > 0) {
          siblingPatientIds = siblings.map(s => s.id);
        }
      } catch {}
    }

    // Guardar bajo el ID del paciente, bajo el prospect_phone y bajo todos los hermanos que comparten el teléfono
    const targetKeys = new Set<string>([patientId]);
    if (cleanPhone && cleanPhone.length >= 7) {
      targetKeys.add(`prospect_${cleanPhone}`);
      siblingPatientIds.forEach(id => targetKeys.add(id));
    }

    targetKeys.forEach(k => {
      const currentList = allChats[k] || [];
      const exists = currentList.some((m: any) => m.id === message.id || (m.content === message.content && (m.timestamp === message.timestamp || m.time === message.time)));
      if (!exists) {
        allChats[k] = [...currentList, message];
      }
    });

    // 3. Guardar con service role sin restricción RLS
    const { error: uploadError } = await supabase.storage.from('audenti_database').upload(
      'chat_omnichannel.json',
      JSON.stringify(allChats, null, 2),
      { upsert: true, contentType: 'application/json' }
    );

    if (uploadError) {
      throw uploadError;
    }

    // 3.1 Insertar formalmente en la tabla relacional chat_messages de Supabase
    try {
      let resolvedPatientId: string | null = null;
      let cleanPhone = '';

      if (patientId.startsWith('prospect_')) {
        cleanPhone = patientId.replace('prospect_', '').slice(-10);
      } else {
        // Verificar si es un UUID válido de paciente
        resolvedPatientId = patientId;
      }

      // Si no tenemos UUID directo pero hay teléfono, buscar si está registrado
      if (!resolvedPatientId && cleanPhone) {
        try {
          const { data: found } = await supabase
            .from('patients')
            .select('id')
            .ilike('phone', `%${cleanPhone}%`)
            .maybeSingle();
          if (found?.id) {
            resolvedPatientId = found.id;
          }
        } catch {}
      }

      await supabase.from('chat_messages').insert({
        patient_id: resolvedPatientId,
        sender_role: message.senderRole || (message.isDoctor ? 'doctor' : 'patient'),
        sender_name: message.senderName || (message.isDoctor ? 'Dra. Aura Estudillo' : 'Paciente'),
        content: message.content,
        channel_type: message.channel_type || 'web_chat',
        metadata: {
          patientId,
          phone: cleanPhone || message.metadata?.phone || '',
          ...(message.metadata || {}),
          senderRole: message.senderRole,
          timestamp: message.timestamp
        },
        created_at: new Date().toISOString()
      });
    } catch (dbErr: any) {
      console.warn('[DB chat_messages insert notice]:', dbErr?.message);
    }

    // 4. Emitir eventos Realtime bidireccionales y Notificación WhatsApp
    try {
      if (message.senderRole === 'patient') {
        // Notificar a la doctora en vivo
        await supabase.channel('chat_omnichannel_sync').send({
          type: 'broadcast',
          event: 'incoming_patient_message',
          payload: { targetPatientId: patientId, ...message }
        });

        await supabase.channel('header_notifications_realtime').send({
          type: 'broadcast',
          event: 'doctor_notification',
          payload: {
            id: `notif-${Date.now()}`,
            title: `💬 Mensaje de ${message.senderName || 'Paciente'}`,
            message: message.content,
            type: 'general',
            patient_name: message.senderName,
            time: message.timestamp
          }
        });

        // Alerta WhatsApp para cuando la doctora va conduciendo o no está frente a la PC
        await sendDoctorWhatsAppAlert({
          title: `Nuevo Mensaje en Portal Clínico`,
          patientName: message.senderName || 'Paciente',
          message: message.content,
          type: 'chat_message'
        });
      } else if (message.senderRole === 'ai' && message.content.includes('Llamada de Voz')) {
        // Alerta de Resumen de Voz para WhatsApp
        await sendDoctorWhatsAppAlert({
          title: `📞 Resumen de Llamada de Voz Finalizada`,
          patientName: message.senderName || 'Paciente',
          message: message.content,
          type: 'voice_call'
        });
      } else {
        // NOTIFICAR AL PACIENTE EN VIVO EN SU WIDGET WEB
        const outgoingPayload = {
          targetPatientId: patientId,
          patientId,
          ...message,
          senderRole: message.senderRole || 'doctor',
          senderName: message.senderName || 'Dra. Aura Estudillo'
        };

        // Canal dedicado por ID de paciente
        await supabase.channel(`patient_chat_${patientId}`).send({
          type: 'broadcast',
          event: 'doctor_reply',
          payload: outgoingPayload
        });

        await supabase.channel(`patient_chat_${patientId}`).send({
          type: 'broadcast',
          event: 'chatwoot_message_created',
          payload: outgoingPayload
        });

        // Canal omnicanal global y de Chatwoot
        await supabase.channel('chat_omnichannel_sync').send({
          type: 'broadcast',
          event: 'sync_patient_message',
          payload: outgoingPayload
        });

        await supabase.channel('chat_omnichannel_sync').send({
          type: 'broadcast',
          event: 'chatwoot_message_created',
          payload: outgoingPayload
        });

        // 5. Sistema de Notificación Dual por Confirmación / Respuesta Médica:
        // Obtener teléfono del paciente desde Supabase
        try {
          const { data: patientData } = await supabase
            .from('patients')
            .select('full_name, phone')
            .eq('id', patientId)
            .maybeSingle();

          if (patientData?.phone) {
            // A. Notificar al WhatsApp del Paciente
            await sendPatientWhatsAppMessage({
              patientPhone: patientData.phone,
              patientName: patientData.full_name,
              message: message.content
            });

            // B. Notificar confirmación espejo al WhatsApp de la Dra. Aura
            await sendDoctorWhatsAppAlert({
              title: `✅ RESPUESTA ENVIADA A PACIENTE`,
              patientName: `${patientData.full_name} (${patientData.phone})`,
              message: message.content,
              type: 'info'
            });
          }
        } catch (dualErr: any) {
          console.warn('[Dual Notification Error]:', dualErr?.message);
        }
      }
    } catch (e: any) {
      console.warn('Nota broadcast realtime en api/chat:', e?.message);
    }

    return NextResponse.json({ success: true, message: 'Mensaje sincronizado correctamente' }, { status: 200 });
  } catch (err: any) {
    console.error('Error en API chat:', err);
    return NextResponse.json({ error: err.message || 'Error en servidor' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');

    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = (user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase().trim();
    const isStaff = isInternalUser(userEmail, userRole);

    // Si es un paciente, verificar que el patientId solicitado le pertenece
    if (!isStaff && patientId) {
      const { data: ownPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!ownPatient || ownPatient.id !== patientId) {
        return NextResponse.json({ error: 'Prohibido. No puedes acceder al chat de otro paciente.' }, { status: 403 });
      }
    }

    let dbMessages: any[] = [];
    let patientPhone = '';
    let patientName = '';

    if (patientId) {
      try {
        if (!patientId.startsWith('prospect_')) {
          const { data: pData } = await supabase
            .from('patients')
            .select('phone, full_name')
            .eq('id', patientId)
            .maybeSingle();
          if (pData?.phone) patientPhone = pData.phone.replace(/\D/g, '').slice(-10);
          if (pData?.full_name) patientName = pData.full_name.trim();
        } else {
          patientPhone = patientId.replace('prospect_', '').replace(/\D/g, '').slice(-10);
        }
      } catch (dbErr: any) {
        console.warn('[DB patient phone lookup note]:', dbErr?.message);
      }
    }

    let siblingIds: string[] = [];
    if (patientPhone && patientPhone.length >= 7) {
      try {
        const { data: siblings } = await supabase
          .from('patients')
          .select('id')
          .ilike('phone', `%${patientPhone}%`);
        if (siblings && siblings.length > 0) {
          siblingIds = siblings.map(s => s.id);
        }
      } catch {}
    }

    // Cargar también de Storage chat_omnichannel.json garantizando historial completo
    let storageMessages: any[] = [];
    let allChats: Record<string, any[]> = {};
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) {
          allChats = JSON.parse(text);
          if (patientId) {
            const addFromKey = (k: string) => {
              if (allChats[k] && Array.isArray(allChats[k])) {
                storageMessages.push(...allChats[k]);
              }
            };

            addFromKey(patientId);
            if (patientPhone && patientPhone.length >= 7) {
              addFromKey(`prospect_${patientPhone}`);
              siblingIds.forEach(id => addFromKey(id));

              // Buscar en cualquier clave que contenga el teléfono o mensajes con el teléfono
              Object.keys(allChats).forEach(k => {
                if (k !== patientId && !siblingIds.includes(k) && k !== `prospect_${patientPhone}`) {
                  const arr = allChats[k];
                  if (Array.isArray(arr) && arr.some((m: any) => {
                    const mPhone = (m.metadata?.phone || '').replace(/\D/g, '').slice(-10);
                    return mPhone === patientPhone;
                  })) {
                    storageMessages.push(...arr);
                  }
                }
              });
            }
          }
        }
      }
    } catch {}

    if (patientId) {
      // Deduplicar mensajes de forma estricta por ID o firma de contenido y tipo
      const combined: any[] = [];
      const seenIds = new Set<string>();
      const seenSignatures = new Set<string>();

      for (const m of storageMessages) {
        if (!m) continue;
        const sig = `${m.channel_type || m.metadata?.channel_type || ''}_${(m.content || '').trim()}`;
        if (!seenIds.has(m.id) && !seenSignatures.has(sig)) {
          if (m.id) seenIds.add(m.id);
          seenSignatures.add(sig);
          combined.push(m);
        }
      }

      // Ordenar cronológicamente por marca de tiempo
      combined.sort((a, b) => {
        const getT = (item: any) => {
          const raw = item.metadata?.created_at || item.metadata?.timestamp || item.created_at || item.timestamp || item.time;
          if (raw) {
            const t = new Date(raw).getTime();
            if (!isNaN(t)) return t;
          }
          return 0;
        };
        return getT(a) - getT(b);
      });

      return NextResponse.json({ success: true, messages: combined });
    }

    return NextResponse.json({ success: true, chats: allChats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
