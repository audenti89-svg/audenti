import { NextResponse } from 'next/server';
import { AIDispatcher, AIRole } from '@/lib/ai/ai-dispatcher';
import { createClient } from '@/lib/supabase/client';
import { getPersistedAppointments } from '@/lib/supabase/appointments-storage';

export const runtime = 'nodejs';

/**
 * Obtiene el contexto clínico y de expedientes de los pacientes de la base de datos
 */
async function getClinicalContext(searchTerm?: string) {
  try {
    const supabase = createClient();
    const { data: patients } = await supabase
      .from('patients')
      .select('id, full_name, phone, birth_date, age, allergies_medication, medical_conditions, emergency_contact_name, emergency_contact_phone, status')
      .limit(20);

    const appointments = await getPersistedAppointments();

    return {
      patients: patients || [],
      appointments: appointments || [],
    };
  } catch (e) {
    console.warn('[Clinical Context Error]:', e);
    return { patients: [], appointments: [] };
  }
}

export async function POST(request: Request) {
  try {
    const { prompt, role } = await request.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt es requerido.' }, { status: 400 });
    }

    const aiRole: AIRole = (role || 'SUPPORT') as AIRole;

    // Cargar contexto clínico en vivo de la base de datos
    const dbContext = await getClinicalContext();

    const response = await AIDispatcher.dispatch(prompt, aiRole, dbContext);

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    console.error('[API AI-OFFICE ERROR]:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error interno al despachar IA'
    }, { status: 500 });
  }
}
