import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage';
import { isInternalUser } from '@/lib/auth/admin-emails';

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

    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = (user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase().trim();
    const isStaff = isInternalUser(userEmail, userRole);

    // Si es personal clínico (Doctora / Administrador)
    if (isStaff) {
      const list = await getPersistedAppointments();
      return NextResponse.json({ success: true, appointments: list });
    }

    // Si es paciente, filtrar estrictamente a sus citas aplicando aislamiento
    const { data: patientProfile } = await supabase
      .from('patients')
      .select('id, full_name, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!patientProfile) {
      return NextResponse.json({ success: true, appointments: [] });
    }

    const cleanPatientPhone = patientProfile.phone ? patientProfile.phone.replace(/\D/g, '').slice(-10) : '';

    const list = await getPersistedAppointments();
    const patientFiltered = list.filter((a: any) => {
      // 1. Coincidencia estricta por ID único de paciente
      if (a.patient_id && a.patient_id === patientProfile.id) {
        return true;
      }

      // 2. Coincidencia por teléfono normalizado a 10 dígitos (igualdad estricta, jamás substring)
      if (cleanPatientPhone && cleanPatientPhone.length === 10) {
        const cleanApptPhone = (a.patient_phone || a.phone || '').replace(/\D/g, '').slice(-10);
        if (cleanApptPhone.length === 10 && cleanApptPhone === cleanPatientPhone) {
          return true;
        }
      }

      return false;
    });

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

    // Validación de Horarios: en 2027 aplica Turno Vespertino exclusivo (16:00 a 21:00); en 2026 horario normal (08:00 a 21:00)
    const selectedTime = (appointment_time || '16:00').trim();
    const appDateStr = (appointment_date || '').trim();
    const [hStr, mStr] = selectedTime.split(':');
    const totalMinutes = parseInt(hStr || '0', 10) * 60 + parseInt(mStr || '0', 10);

    if (appDateStr >= '2027-01-01') {
      if (totalMinutes < 16 * 60) {
        return NextResponse.json({
          success: false,
          error: 'Turno matutino bloqueado. A partir del 1 de enero de 2027, el horario de atención clínica es exclusivamente de Lunes a Sábado de 16:00 a 21:00 hrs (Turno Vespertino) y Domingos según disponibilidad de agenda.'
        }, { status: 400 });
      }
      if (totalMinutes > 21 * 60) {
        return NextResponse.json({
          success: false,
          error: 'Horario no permitido. Las citas del turno vespertino concluyen a las 21:00 hrs (9:00 PM).'
        }, { status: 400 });
      }
    } else {
      if (totalMinutes < 8 * 60 || totalMinutes > 21 * 60) {
        return NextResponse.json({
          success: false,
          error: 'Horario normal 2026: Por favor selecciona un horario entre las 08:00 y las 21:00 hrs.'
        }, { status: 400 });
      }
    }

    const folio = body.folio || body.id || `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAppt = {
      id: folio,
      folio,
      patient_name,
      patient_phone: patient_phone || '5522427769',
      appointment_date: appointment_date || new Date().toISOString().split('T')[0],
      appointment_time: selectedTime,
      treatment,
      treatment_type: treatment,
      branch,
      status,
      attendance_confirmed: false,
      notes: notes || 'Cita generada en plataforma Audenti',
      created_at: new Date().toISOString()
    };

    const current = await getPersistedAppointments();
    const updated = [newAppt, ...current.filter((a: any) => a.id !== newAppt.id && a.folio !== newAppt.folio)];
    await savePersistedAppointments(updated);

    // Intentar emitir broadcast en Realtime
    try {
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

// ── PATCH: Confirmar Asistencia de Cita por parte del Paciente o Staff ──
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, attendance_confirmed = true } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de la cita requerido.' }, { status: 400 });
    }

    const current = await getPersistedAppointments();
    let found = false;
    const updated = current.map((a: any) => {
      if (a.id === id || a.folio === id) {
        found = true;
        return {
          ...a,
          status: 'confirmed',
          attendance_confirmed: !!attendance_confirmed,
          attendance_confirmed_at: new Date().toISOString()
        };
      }
      return a;
    });

    if (!found) {
      return NextResponse.json({ success: false, error: 'Cita no encontrada.' }, { status: 404 });
    }

    await savePersistedAppointments(updated);

    // Notificar en realtime
    try {
      await supabase.channel('calendar_page_realtime').send({
        type: 'broadcast',
        event: 'appointment_updated',
        payload: { id, attendance_confirmed: true, status: 'confirmed' }
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Asistencia confirmada exitosamente.',
      appointment: updated.find((a: any) => a.id === id || a.folio === id)
    });
  } catch (err: any) {
    console.error('[API appointments PATCH Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

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
