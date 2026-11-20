import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage';
import { isInternalUser } from '@/lib/auth/admin-emails';
import { GoogleCalendarService } from '@/lib/google/calendar-service';
import { findDuplicatePatient } from '@/lib/patients/patientDeduplicator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 0. Búsqueda pública por Folio o ID de Cita (Permite a pacientes verificar su cita desde WhatsApp sin login)
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id') || searchParams.get('folio') || searchParams.get('confirmAppt');

    if (queryId) {
      const list = await getPersistedAppointments();
      const matched: any = list.find((a: any) => String(a.id || a.folio) === String(queryId));
      if (matched) {
        return NextResponse.json({
          success: true,
          appointment: {
            id: matched.id,
            folio: matched.folio,
            patient_name: matched.patient_name || 'Paciente Audenti',
            patient_phone: matched.patient_phone,
            appointment_date: matched.appointment_date,
            appointment_time: matched.appointment_time,
            treatment: matched.treatment || matched.treatment_type || 'Consulta Odontológica',
            branch: matched.branch || 'Sucursal Balbuena (Matriz)',
            status: matched.status,
            attendance_confirmed: matched.attendance_confirmed || false,
            notes: matched.notes || ''
          }
        });
      }
      return NextResponse.json({ success: false, error: 'Cita no encontrada.' }, { status: 404 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Verificación de sesión activa para listados generales
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

    // Resolver patient_id con el Motor de Deduplicación Inteligente si no viene en el body
    let resolvedPatientId = body.patient_id || null;
    let canonicalPatientName = patient_name;
    try {
      const adminClient = createAdminClient();
      const dup = await findDuplicatePatient(adminClient, {
        phone: patient_phone,
        full_name: patient_name
      });
      if (dup.isDuplicate && dup.matchedPatient) {
        resolvedPatientId = dup.matchedPatient.id;
        canonicalPatientName = dup.matchedPatient.full_name || patient_name;
      }
    } catch {}

    const folio = body.folio || body.id || `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAppt = {
      id: folio,
      folio,
      patient_id: resolvedPatientId,
      patient_name: canonicalPatientName,
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

    // Sincronizar en tabla relacional appointments de Supabase
    if (resolvedPatientId) {
      try {
        const adminSupabase = createAdminClient();
        const startDateTime = new Date(`${newAppt.appointment_date}T${newAppt.appointment_time}:00-06:00`);
        const endDateTime = new Date(startDateTime.getTime() + 45 * 60000);
        const isChalma = branch.toLowerCase().includes('chalma') || branch.toLowerCase().includes('guadalupe');

        await adminSupabase.from('appointments').insert({
          tenant_id: 'c62fc15b-bf68-4101-881d-fdd9258fce1f',
          branch_id: isChalma ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
          patient_id: resolvedPatientId,
          doctor_id: '5e8853ee-b813-4a1b-aafd-48b3d20ec1e3',
          starts_at: startDateTime.toISOString(),
          ends_at: endDateTime.toISOString(),
          status: status === 'confirmed' ? 'confirmed' : 'scheduled',
          notes: `Folio: ${folio} • ${treatment} • ${notes || 'Cita clínica'} • Tel: ${newAppt.patient_phone}`
        });
      } catch (dbErr) {
        console.warn('Nota guardando en appointments Supabase:', dbErr);
      }
    }

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

    // Sincronización automática con Google Calendar (Dra. Aura Estudillo)
    try {
      const gcalStartTime = `${newAppt.appointment_date}T${newAppt.appointment_time}:00`;
      await GoogleCalendarService.syncAppointment({
        id: newAppt.id,
        folio: newAppt.folio,
        patient_name: newAppt.patient_name,
        patient_phone: newAppt.patient_phone,
        treatment: newAppt.treatment,
        start_time: gcalStartTime,
        branch: newAppt.branch,
        notes: newAppt.notes
      });
    } catch (gcalErr) {
      console.warn('[Google Calendar Sync Note]:', gcalErr);
    }

    return NextResponse.json({ success: true, appointment: newAppt });
  } catch (err: any) {
    console.error('[API appointments POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── PATCH: Confirmar Asistencia de Cita por parte del Paciente o Staff ──
export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, attendance_confirmed = true } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de la cita requerido.' }, { status: 400 });
    }

    // Permitir confirmación pública de asistencia para pacientes que vienen desde WhatsApp sin login
    const current = await getPersistedAppointments();
    let found = false;
    const updated = current.map((a: any) => {
      if (String(a.id || a.folio) === String(id)) {
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

    const supabase = await createClient();

    // Sincronizar en tabla relacional appointments de Supabase
    try {
      await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          attendance_confirmed: true,
          attendance_confirmed_at: new Date().toISOString()
        })
        .or(`id.eq.${id},folio.eq.${id}`);
    } catch (dbErr) {
      console.warn('Nota sincronizando tabla appointments en Supabase:', dbErr);
    }

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
