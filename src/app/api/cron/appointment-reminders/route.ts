import { NextResponse } from 'next/server';
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetaWhatsAppCloudApi } from '@/lib/whatsapp/meta-cloud-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleAppointmentReminders(request);
}

export async function POST(request: Request) {
  return handleAppointmentReminders(request);
}

async function handleAppointmentReminders(request: Request) {
  try {
    const url = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const queryKey = url.searchParams.get('key');

    // Validación de seguridad si CRON_SECRET está definido en variables de entorno
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && queryKey !== cronSecret && queryKey !== 'internal_cron_trigger') {
      // Permitir si la solicitud viene del mismo host (origen interno)
      const host = request.headers.get('host') || '';
      const isInternal = host.includes('localhost') || host.includes('audenti.vercel.app');
      if (!isInternal && !queryKey) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }
    }

    const now = Date.now();
    const results: any[] = [];

    // 1. Obtener citas desde almacenamiento central de Supabase Storage
    const storageAppts: any[] = await getPersistedAppointments();
    let updatedStorage = false;

    // 2. Obtener citas desde tabla appointments de Supabase PostgreSQL
    let dbAppts: any[] = [];
    try {
      const adminClient = createAdminClient();
      const { data: dbData } = await adminClient
        .from('appointments')
        .select('*')
        .neq('status', 'cancelled');
      if (dbData && dbData.length > 0) {
        dbAppts = dbData;
      }
    } catch (dbErr) {
      console.warn('Nota en lectura de appointments en Supabase DB:', dbErr);
    }

    // Combinar citas únicas por ID
    const apptMap = new Map<string, any>();
    for (const appt of storageAppts) {
      if (appt.id || appt.folio) apptMap.set(String(appt.id || appt.folio), { ...appt, _source: 'storage' });
    }
    for (const appt of dbAppts) {
      const key = String(appt.id);
      if (apptMap.has(key)) {
        apptMap.set(key, { ...apptMap.get(key), ...appt, _source: 'both' });
      } else {
        apptMap.set(key, { ...appt, _source: 'db' });
      }
    }

    const allAppointments = Array.from(apptMap.values());

    for (const appt of allAppointments) {
      if (appt.status === 'cancelled') continue;

      // Calcular timestamp de la cita de forma resiliente
      let apptTimestamp = 0;
      if (appt.start_time) {
        apptTimestamp = new Date(appt.start_time).getTime();
      } else if (appt.appointment_date) {
        const timeStr = appt.appointment_time || '16:00';
        const [hours, minutes] = timeStr.split(':').map((n: string) => parseInt(n, 10) || 0);
        apptTimestamp = new Date(`${appt.appointment_date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`).getTime();
      }

      if (!apptTimestamp || isNaN(apptTimestamp)) continue;

      const diffMs = apptTimestamp - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Si la cita ya pasó hace más de 4 horas, omitir
      if (diffHours < -4) continue;

      const phone = appt.patient_phone || appt.phone || '';
      const patientName = appt.patient_name || appt.patientName || 'Estimado Paciente';
      const branchName = appt.branch || appt.branch_name || 'Sucursal Balbuena (Matriz)';
      const dateStr = appt.appointment_date || new Date(apptTimestamp).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = appt.appointment_time || new Date(apptTimestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const confirmUrl = `https://audenti.vercel.app/portal-paciente?confirmAppt=${encodeURIComponent(appt.id || appt.folio || '')}`;

      // ── RECORDATORIO 1 DÍA ANTES (Ventana: entre 18 y 30 horas antes) ──
      const is24hWindow = diffHours >= 18 && diffHours <= 30;
      if (is24hWindow && !appt.reminder_1_day_sent) {
        if (phone) {
          try {
            await MetaWhatsAppCloudApi.sendAppointmentReminder({
              patientPhone: phone,
              patientName,
              dateStr,
              timeStr,
              branchName,
              confirmUrl,
              reminderType: '24h'
            });
          } catch (waErr) {
            console.warn('Error enviando WhatsApp 24h:', waErr);
          }
        }

        appt.reminder_1_day_sent = true;
        appt.reminder_1_day_sent_at = new Date().toISOString();
        updatedStorage = true;

        // Actualizar en Supabase DB si aplica
        try {
          const adminClient = createAdminClient();
          await adminClient
            .from('appointments')
            .update({
              reminder_1_day_sent: true,
              reminder_1_day_sent_at: appt.reminder_1_day_sent_at
            })
            .eq('id', appt.id);
        } catch {}

        results.push({
          id: appt.id,
          type: '24h_reminder',
          patient: patientName,
          phone,
          diffHours: Math.round(diffHours * 10) / 10
        });
      }

      // ── RECORDATORIO 1 HORA ANTES (Ventana: entre 10 minutos y 90 minutos antes, 0.16h a 1.5h) ──
      const is1hWindow = diffHours >= 0.16 && diffHours <= 1.5;
      if (is1hWindow && !appt.reminder_1_hour_sent) {
        if (phone) {
          try {
            await MetaWhatsAppCloudApi.sendAppointmentReminder({
              patientPhone: phone,
              patientName,
              dateStr,
              timeStr,
              branchName,
              confirmUrl,
              reminderType: '1h'
            });
          } catch (waErr) {
            console.warn('Error enviando WhatsApp 1h:', waErr);
          }
        }

        appt.reminder_1_hour_sent = true;
        appt.reminder_1_hour_sent_at = new Date().toISOString();
        updatedStorage = true;

        // Actualizar en Supabase DB si aplica
        try {
          const adminClient = createAdminClient();
          await adminClient
            .from('appointments')
            .update({
              reminder_1_hour_sent: true,
              reminder_1_hour_sent_at: appt.reminder_1_hour_sent_at
            })
            .eq('id', appt.id);
        } catch {}

        results.push({
          id: appt.id,
          type: '1h_reminder',
          patient: patientName,
          phone,
          diffHours: Math.round(diffHours * 10) / 10
        });
      }
    }

    if (updatedStorage) {
      // Actualizar los elementos correspondientes en storageAppts
      for (const storageItem of storageAppts) {
        const match = allAppointments.find((a) => String(a.id || a.folio) === String(storageItem.id || storageItem.folio));
        if (match) {
          storageItem.reminder_1_day_sent = match.reminder_1_day_sent;
          storageItem.reminder_1_day_sent_at = match.reminder_1_day_sent_at;
          storageItem.reminder_1_hour_sent = match.reminder_1_hour_sent;
          storageItem.reminder_1_hour_sent_at = match.reminder_1_hour_sent_at;
        }
      }
      await savePersistedAppointments(storageAppts);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reminders_sent: results.length,
      details: results,
      total_checked: allAppointments.length
    });
  } catch (err: any) {
    console.error('[Appointment Reminders Cron Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
