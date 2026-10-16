import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Clave maestra para reseteo en modo sandbox / pruebas
const ADMIN_RESET_KEY = process.env.ADMIN_RESET_SECRET || 'AURA-RESET-SECURE-2026';

export async function POST(req: NextRequest) {
  try {
    const isSandbox = (process.env.NEXT_PUBLIC_APP_MODE || 'sandbox').toLowerCase() === 'sandbox';

    // Bloqueo estricto en modo Producción
    if (!isSandbox) {
      return NextResponse.json(
        {
          success: false,
          error: 'Operación bloqueada. El sistema se encuentra en MODO PRODUCCIÓN PROTEGIDO. No está permitido el reseteo de la base de datos.',
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { confirmationKey } = body;

    if (confirmationKey !== ADMIN_RESET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Clave de confirmación de superadministrador incorrecta o no proporcionada.',
        },
        { status: 401 }
      );
    }

    // 1. Limpiar almacén en memoria volátil de Next.js
    if (globalThis.__audenti_appointments) {
      globalThis.__audenti_appointments = [];
    }
    if ((globalThis as any).__audenti_chat_history) {
      (globalThis as any).__audenti_chat_history = [];
    }
    if (globalThis.__audenti_emergency_cases) {
      globalThis.__audenti_emergency_cases = [];
    }

    // 2. Limpieza en Supabase (appointments, patients)
    let supabaseCleaned = false;
    try {
      const supabase = await createClient();

      // Borrar citas de prueba
      const { error: apptErr } = await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Borrar pacientes de prueba
      const { error: patErr } = await supabase.from('patients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (!apptErr && !patErr) {
        supabaseCleaned = true;
      }
    } catch (dbErr: any) {
      console.warn('Advertencia al limpiar tablas Supabase:', dbErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos operativa y memoria reseteadas con éxito para fase de pruebas.',
      mode: 'sandbox',
      supabaseCleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error en /api/admin/reset-db:', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
