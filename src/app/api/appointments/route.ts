import { NextResponse } from 'next/server';
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getPersistedAppointments();
    return NextResponse.json({ success: true, appointments: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patient_name,
      patient_phone,
      appointment_date,
      appointment_time,
      treatment = 'Consulta Odontológica General',
      branch = 'Sucursal Balbuena (Matriz)',
      notes = '',
      status = 'confirmed'
    } = body;

    if (!patient_name) {
      return NextResponse.json({ success: false, error: 'El nombre del paciente es obligatorio.' }, { status: 400 });
    }

    const folio = body.folio || `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAppt = {
      id: folio,
      folio,
      patient_name,
      patient_phone: patient_phone || '5522427769',
      appointment_date: appointment_date || new Date().toISOString().split('T')[0],
      appointment_time: appointment_time || '10:00',
      treatment,
      treatment_type: treatment,
      branch,
      status,
      notes: notes || 'Cita generada en plataforma Audenti',
      created_at: new Date().toISOString()
    };

    const current = await getPersistedAppointments();
    const updated = [newAppt, ...current.filter((a: any) => a.id !== newAppt.id && a.folio !== newAppt.folio)];
    await savePersistedAppointments(updated);

    // Intentar emitir broadcast en Realtime
    try {
      const supabase = createAdminClient();
      await supabase.channel('chat_omnichannel_sync').send({
        type: 'broadcast',
        event: 'appointment_created',
        payload: newAppt
      });
      await supabase.channel('calendar_page_realtime').send({
        type: 'broadcast',
        event: 'appointment_created',
        payload: newAppt
      });
    } catch {}

    return NextResponse.json({ success: true, appointment: newAppt });
  } catch (err: any) {
    console.error('[API appointments POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
