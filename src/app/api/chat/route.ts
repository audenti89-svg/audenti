import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendDoctorWhatsAppAlert, sendPatientWhatsAppMessage } from '@/lib/notifications/whatsapp-doctor';

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

    // 2. Anexar nuevo mensaje
    allChats[patientId] = [...(allChats[patientId] || []), message];

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

    const ADMIN_EMAILS = ['audenti89@gmail.com'];
    const userEmail = user.email || '';
    const isStaff = ADMIN_EMAILS.includes(userEmail) ||
      user.user_metadata?.role === 'owner' ||
      user.user_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'doctor';

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
    if (patientId) {
      try {
        const query = supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true });

        // Si es UUID de paciente registrado, filtrar por patient_id o por metadata
        if (!patientId.startsWith('prospect_')) {
          query.or(`patient_id.eq.${patientId},metadata->>patientId.eq.${patientId}`);
        } else {
          const rawPhone = patientId.replace('prospect_', '').slice(-10);
          query.or(`metadata->>patientId.eq.${patientId},metadata->>phone.ilike.%${rawPhone}%`);
        }

        const { data: rows } = await query;
        if (rows && rows.length > 0) {
          dbMessages = rows.map(r => ({
            id: r.id,
            senderName: r.sender_name || (r.sender_role === 'ai' ? 'Asistente de Voz (Aura AI)' : (r.sender_role === 'doctor' ? 'Dra. Aura Estudillo' : 'Paciente')),
            senderRole: r.sender_role,
            channel_type: r.channel_type || 'web_chat',
            content: r.content,
            timestamp: r.created_at ? new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(r.created_at)) : 'Hoy',
            time: r.created_at ? new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(r.created_at)) : 'Hoy',
            isDoctor: r.sender_role === 'doctor',
            isOwn: r.sender_role === 'doctor',
            metadata: r.metadata
          }));
        }
      } catch (dbErr: any) {
        console.warn('[DB chat_messages query note]:', dbErr?.message);
      }
    }

    // Cargar también de Storage para asegurar que nunca falte ningún mensaje
    let storageMessages: any[] = [];
    let allChats: Record<string, any[]> = {};
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) {
          allChats = JSON.parse(text);
          if (patientId && allChats[patientId]) {
            storageMessages = allChats[patientId];
          }
        }
      }
    } catch {}

    if (patientId) {
      // Fusionar DB y Storage deduplicando por ID o contenido
      const combined: any[] = [...storageMessages];
      const seenIds = new Set(combined.map(m => m.id));
      const seenContent = new Set(combined.map(m => `${m.content}_${m.time || m.timestamp}`));

      for (const dbm of dbMessages) {
        const signature = `${dbm.content}_${dbm.time || dbm.timestamp}`;
        if (!seenIds.has(dbm.id) && !seenContent.has(signature)) {
          seenIds.add(dbm.id);
          seenContent.add(signature);
          combined.push(dbm);
        }
      }

      return NextResponse.json({ success: true, messages: combined });
    }

    return NextResponse.json({ success: true, chats: allChats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
