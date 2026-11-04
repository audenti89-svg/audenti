import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MetaWhatsAppCloudApi } from '@/lib/whatsapp/meta-cloud-api';

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
      patientPhone,
      patientName,
      folio,
      pdfUrl,
      doctorName = 'Dra. Aura Estudillo',
      branchName = 'Sucursal Balbuena (Matriz)',
      medicationsSummary = ''
    } = body;

    if (!patientPhone || !patientName || !folio) {
      return NextResponse.json({
        success: false,
        error: 'Campos requeridos: patientPhone, patientName, folio'
      }, { status: 400 });
    }

    const result = await MetaWhatsAppCloudApi.sendPrescription({
      patientPhone,
      patientName,
      folio,
      pdfUrl,
      doctorName,
      branchName,
      medicationsSummary
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API WhatsApp Send Prescription Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
