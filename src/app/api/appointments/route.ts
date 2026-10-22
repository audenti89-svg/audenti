import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Verificación de sesión activa
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    const ADMIN_EMAILS = ['audenti89@gmail.com'];
    const userEmail = user.email || '';
    const isStaff = ADMIN_EMAILS.includes(userEmail) ||
      user.user_metadata?.role === 'owner' ||
      user.user_metadata?.role === 'admin' ||
      user.user_metadata?.role === 'doctor' ||
      user.app_metadata?.role === 'owner' ||
      user.app_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'doctor';

    // Si es personal clínico (Doctora / Administrador)
    if (isStaff) {
      const list = await getPersistedAppointments();
      return NextResponse.json({ success: true, appointments: list });
    }

    // Si es paciente, filtrar estrictamente a sus citas aplicando RLS
    const { data: patientProfile } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!patientProfile) {
      return NextResponse.json({ success: true, appointments: [] });
    }

    const list = await getPersistedAppointments();
    const patientFiltered = list.filter((a: any) => 
      a.patient_id === patientProfile.id ||
      (a.patient_phone && patientProfile.phone && a.patient_phone.includes(patientProfile.phone)) ||
      (a.patient_name && patientProfile.full_name && a.patient_name.toLowerCase() === patientProfile.full_name.toLowerCase())
    );

    return NextResponse.json({ success: true, appointments: patientFiltered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Se requiere iniciar sesión para agendar citas.' }, { status: 401 });
    }

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

    const folio = body.folio || body.id || `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de la cita requerido.' }, { status: 400 });
    }

    const current = await getPersistedAppointments();
    const updated = current.filter((a: any) => a.id !== id && a.folio !== id);
    await savePersistedAppointments(updated);

    // También intentar borrar de la tabla SQL de appointments si existe
    try {
      const supabase = createAdminClient();
      await supabase.from('appointments').delete().eq('id', id);
      await supabase.channel('calendar_page_realtime').send({
        type: 'broadcast',
        event: 'appointment_deleted',
        payload: { id }
      });
    } catch {}

    return NextResponse.json({ success: true, message: 'Cita eliminada correctamente.' });
  } catch (err: any) {
    console.error('[API appointments DELETE Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
