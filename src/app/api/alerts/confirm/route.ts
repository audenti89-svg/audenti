import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, reference_id, patientId } = body;

    if (!id && !reference_id && !patientId) {
      return NextResponse.json({ error: 'Falta identificador de alerta o paciente' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const cleanAlertId = id ? id.replace(/^(toast-|voice-end-|notif-)/, '') : null;

    // 1. Actualizar en doctor_alerts
    try {
      if (cleanAlertId) {
        await supabase
          .from('doctor_alerts')
          .update({
            confirmed_by_doctor: true,
            status: 'confirmed',
            confirmed_at: nowIso
          })
          .or(`id.eq.${cleanAlertId},reference_id.eq.${cleanAlertId}`);
      }
      if (patientId) {
        await supabase
          .from('doctor_alerts')
          .update({
            confirmed_by_doctor: true,
            status: 'confirmed',
            confirmed_at: nowIso
          })
          .eq('patient_id', patientId);
      }
    } catch (e: any) {
      console.warn('[Alerts Confirm doctor_alerts Notice]:', e?.message);
    }

    // 2. Actualizar en chat_messages si aplica
    try {
      if (cleanAlertId) {
        await supabase
          .from('chat_messages')
          .update({
            confirmed_by_doctor: true,
            confirmed_at: nowIso
          })
          .eq('id', cleanAlertId);
      }
      if (patientId) {
        await supabase
          .from('chat_messages')
          .update({
            confirmed_by_doctor: true,
            confirmed_at: nowIso
          })
          .eq('patient_id', patientId);
      }
    } catch (e: any) {
      console.warn('[Alerts Confirm chat_messages Notice]:', e?.message);
    }

    // 3. Sincronizar en doctor_alerts.json en Storage
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download('doctor_alerts.json');
      if (file) {
        const text = await file.text();
        if (text && text.trim()) {
          const list = JSON.parse(text);
          if (Array.isArray(list)) {
            const updated = list.map((item: any) => {
              const matchId = cleanAlertId && (item.id?.includes(cleanAlertId) || item.reference_id === cleanAlertId);
              const matchPat = patientId && (item.targetPatientId === patientId || item.patient_id === patientId);
              if (matchId || matchPat) {
                return {
                  ...item,
                  confirmed_by_doctor: true,
                  confirmed_at: nowIso,
                  status: 'confirmed'
                };
              }
              return item;
            });
            await supabase.storage.from('audenti_database').upload(
              'doctor_alerts.json',
              JSON.stringify(updated, null, 2),
              { upsert: true, contentType: 'application/json' }
            );
          }
        }
      }
    } catch (storageErr: any) {
      console.warn('[Alerts Confirm Storage Notice]:', storageErr?.message);
    }

    return NextResponse.json({
      success: true,
      confirmed_by_doctor: true,
      confirmed_at: nowIso
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API Alerts Confirm Error]:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
