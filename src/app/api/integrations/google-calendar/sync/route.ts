import { NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/google/calendar-service';
import { createClient } from '@/lib/supabase/server';
import { isInternalUser } from '@/lib/auth/admin-emails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      patient_name,
      patient_phone,
      treatment = 'Consulta Odontológica',
      start_time,
      end_time,
      branch = 'Sucursal Balbuena (Matriz)',
      doctor_name = 'Dra. Aura Estudillo',
      notes = ''
    } = body;

    if (!id || !patient_name || !start_time) {
      return NextResponse.json({ success: false, error: 'Campos requeridos: id, patient_name, start_time' }, { status: 400 });
    }

    const syncResult = await GoogleCalendarService.syncAppointment({
      id,
      patient_name,
      patient_phone,
      treatment,
      start_time,
      end_time,
      branch,
      doctor_name,
      notes
    });

    return NextResponse.json(syncResult);
  } catch (err: any) {
    console.error('[API Google Calendar Sync Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
