import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROFILE_FILE = 'doctor_profile.json';

const DEFAULT_PROFILE = {
  fullName: 'Dra. Aura Estudillo',
  title: 'Dirección General & Clínica',
  specialty: 'Cirujano Dentista / Especialista en Odontología Integral',
  license: '8492019',
  secondaryLicense: 'E-551982',
  university: 'Universidad Nacional Autónoma de México (UNAM)',
  phone: '5522427769',
  email: 'contacto@audenti.com',
  secondaryEmail: 'audenti89@gmail.com',
  address: 'Sucursal Balbuena (Matriz) & Sucursal Chalma de Guadalupe',
  bio: 'Especialista en rehabilitación oral, estética dental y cirugía menor con más de 12 años de trayectoria clínica bajo estrictas normas de bioseguridad NOM-004-SSA3.',
  workingHours: 'Lunes a Sábado de 09:00 a 19:30 hrs',
  avatarUrl: '/images/dra-aura-estudillo.png',
  letterheadEnabled: true,
  printerDefault: 'letter',
  lastUpdated: new Date().toISOString()
};

export async function GET() {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download(PROFILE_FILE);
      if (file) {
        const text = await file.text();
        if (text && text.trim()) {
          const parsed = JSON.parse(text);
          return NextResponse.json({ success: true, profile: { ...DEFAULT_PROFILE, ...parsed } });
        }
      }
    } catch {}

    return NextResponse.json({ success: true, profile: DEFAULT_PROFILE });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error cargando perfil' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    let current = { ...DEFAULT_PROFILE };
    try {
      const { data: file } = await supabase.storage.from('audenti_database').download(PROFILE_FILE);
      if (file) {
        const text = await file.text();
        if (text && text.trim()) current = { ...current, ...JSON.parse(text) };
      }
    } catch {}

    const updated = {
      ...current,
      ...body,
      lastUpdated: new Date().toISOString()
    };

    const { error: uploadErr } = await supabase.storage.from('audenti_database').upload(
      PROFILE_FILE,
      JSON.stringify(updated, null, 2),
      { upsert: true, contentType: 'application/json' }
    );

    if (uploadErr) {
      throw uploadErr;
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error('[API Doctor Profile POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error guardando perfil' }, { status: 500 });
  }
}
