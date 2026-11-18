import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MetaWhatsAppCloudApi } from '@/lib/whatsapp/meta-cloud-api';
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { appointmentId, reminderType = '24h', customPhone } = body;

    const appointments: any[] = await getPersistedAppointments();
    const appt: any = appointments.find((a: any) => String(a.id || a.folio) === String(appointmentId));

    if (!appt && !body.patientPhone) {
      return NextResponse.json({ success: false, error: 'Cita no encontrada' }, { status: 404 });
    }

    const patientPhone = customPhone || appt?.patient_phone || appt?.phone || body.patientPhone || '';
    const patientName = appt?.patient_name || appt?.patientName || body.patientName || 'Estimado Paciente';
    const branchName = appt?.branch || appt?.branch_name || body.branchName || 'Sucursal Balbuena (Matriz)';
    const dateStr = appt?.appointment_date || body.dateStr || new Date().toISOString().split('T')[0];
    const timeStr = appt?.appointment_time || body.timeStr || '16:00';
    const confirmUrl = `https://audenti.vercel.app/portal-paciente?confirmAppt=${encodeURIComponent(appointmentId || 'direct')}`;

    if (!patientPhone) {
      return NextResponse.json({ success: false, error: 'El paciente no tiene número telefónico registrado' }, { status: 400 });
    }

    const result = await MetaWhatsAppCloudApi.sendAppointmentReminder({
      patientPhone,
      patientName,
      dateStr,
      timeStr,
      branchName,
      confirmUrl,
      reminderType: reminderType === '1h' ? '1h' : '24h'
    });

    if (appt) {
      if (reminderType === '1h') {
        appt.reminder_1_hour_sent = true;
        appt.reminder_1_hour_sent_at = new Date().toISOString();
      } else {
        appt.reminder_1_day_sent = true;
        appt.reminder_1_day_sent_at = new Date().toISOString();
      }
      await savePersistedAppointments(appointments);
    }

    return NextResponse.json({
      success: true,
      message: `Recordatorio ${reminderType} despachado exitosamente`,
      waResult: result
    });
  } catch (err: any) {
    console.error('[Send Reminder Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
