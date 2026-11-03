import { NextResponse } from 'next/server';
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage';
import { sendPatientWhatsAppMessage } from '@/lib/notifications/whatsapp-doctor';

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
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Validación si se configuró CRON_SECRET en Vercel
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const appointments: any[] = await getPersistedAppointments();
    const now = Date.now();
    const results: any[] = [];
    let updatedAny = false;

    for (const appt of appointments) {
      if (appt.status === 'cancelled') continue;

      const dateStr = appt.appointment_date; // YYYY-MM-DD
      const timeStr = appt.appointment_time || '16:00'; // HH:mm
      if (!dateStr) continue;

      const [hours, minutes] = timeStr.split(':').map((n: string) => parseInt(n, 10) || 0);
      const apptTimestamp = new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`).getTime();

      const diffMs = apptTimestamp - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      const phone = appt.patient_phone || '';
      const patientName = appt.patient_name || 'Estimado Paciente';
      const branchName = appt.branch || 'Sucursal Balbuena';
      const confirmUrl = `https://audenti.vercel.app/portal-paciente?confirmAppt=${encodeURIComponent(appt.id || appt.folio)}`;

      // ── RECORDATORIO 1 DÍA ANTES (Entre 20 y 26 horas antes) ──
      if (diffHours >= 20 && diffHours <= 26 && !appt.reminder_1_day_sent) {
        const msg = `🦷 *AUDENTI RECORDATORIO DE CITA (1 DÍA ANTES)*\n\n` +
          `Hola *${patientName}*, te recordamos tu cita odontológica programada para mañana *${dateStr}* a las *${timeStr} hrs* en *${branchName}*.\n\n` +
          `Dra. Aura Estudillo te espera puntualmente. Por favor confirma tu asistencia con un clic aquí:\n` +
          `👉 ${confirmUrl}\n\n` +
          `_Audenti Cloud Pro • Odontología de Alta Especialidad_`;

        if (phone) {
          await sendPatientWhatsAppMessage({
            patientPhone: phone,
            message: msg,
            patientName
          });
        }

        appt.reminder_1_day_sent = true;
        appt.reminder_1_day_sent_at = new Date().toISOString();
        updatedAny = true;
        results.push({ id: appt.id, type: '1_day', patient: patientName, phone });
      }

      // ── RECORDATORIO 1 HORA ANTES (Entre 45 y 75 minutos antes) ──
      if (diffHours > 0.7 && diffHours <= 1.3 && !appt.reminder_1_hour_sent) {
        const msg = `⏰ *AUDENTI RECORDATORIO DE CITA (EN 1 HORA)*\n\n` +
          `Hola *${patientName}*, tu consulta médica es hoy en 1 hora (*${timeStr} hrs*) en *${branchName}*.\n\n` +
          `Nuestro equipo médico tiene listo tu sillón clínico. Confirma tu llegada aquí:\n` +
          `👉 ${confirmUrl}\n\n` +
          `_Nos vemos en clínica._`;

        if (phone) {
          await sendPatientWhatsAppMessage({
            patientPhone: phone,
            message: msg,
            patientName
          });
        }

        appt.reminder_1_hour_sent = true;
        appt.reminder_1_hour_sent_at = new Date().toISOString();
        updatedAny = true;
        results.push({ id: appt.id, type: '1_hour', patient: patientName, phone });
      }
    }

    if (updatedAny) {
      await savePersistedAppointments(appointments);
    }

    return NextResponse.json({
      success: true,
      reminders_sent: results.length,
      details: results,
      total_checked: appointments.length
    });
  } catch (err: any) {
    console.error('[Appointment Reminders Cron Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
