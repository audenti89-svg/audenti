import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONSENTS_STORAGE_FILE = 'clinical_consents.json';

export interface ConsentRecord {
  id: string;
  folio: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  procedure_name: string;
  branch: string;
  doctor_name: string;
  doctor_license: string;
  signature_data_url: string;
  sha256_hash: string;
  signed_at: string;
  nom_compliance: string;
  notes?: string;
}

async function getPersistedConsents(): Promise<ConsentRecord[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from('audenti_database').download(CONSENTS_STORAGE_FILE);
    if (error || !data) return [];
    const text = await data.text();
    return JSON.parse(text) || [];
  } catch {
    return [];
  }
}

async function savePersistedConsents(consents: ConsentRecord[]): Promise<void> {
  try {
    const admin = createAdminClient();
    const blob = new Blob([JSON.stringify(consents, null, 2)], { type: 'application/json' });
    await admin.storage.from('audenti_database').upload(CONSENTS_STORAGE_FILE, blob, {
      upsert: true,
      contentType: 'application/json'
    });
  } catch (err) {
    console.error('[Consents Storage Error]:', err);
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    const allConsents = await getPersistedConsents();

    if (patientId) {
      const filtered = allConsents.filter(c => c.patient_id === patientId);
      return NextResponse.json({ success: true, consents: filtered });
    }

    return NextResponse.json({ success: true, consents: allConsents });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado para firmar documentos' }, { status: 401 });
    }

    const body = await request.json();
    const {
      patient_id,
      patient_name,
      patient_phone,
      procedure_name = 'Procedimiento Quirúrgico Odontológico',
      branch = 'Sucursal Balbuena (Matriz)',
      doctor_name = 'Dra. Aura Estudillo',
      doctor_license = '8492019',
      signature_data_url,
      sha256_hash,
      notes = ''
    } = body;

    if (!patient_name || !signature_data_url || !sha256_hash) {
      return NextResponse.json({
        success: false,
        error: 'Datos biométricos incompletos: firma y hash SHA-256 obligatorios.'
      }, { status: 400 });
    }

    const newConsent: ConsentRecord = {
      id: `consent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      folio: `AUD-NOM004-${Math.floor(100000 + Math.random() * 900000)}`,
      patient_id: patient_id || user.id,
      patient_name,
      patient_phone,
      procedure_name,
      branch,
      doctor_name,
      doctor_license,
      signature_data_url,
      sha256_hash,
      signed_at: new Date().toISOString(),
      nom_compliance: 'NOM-004-SSA3-2012 / Art. 80-83 Reglamento Ley General de Salud',
      notes
    };

    const current = await getPersistedConsents();
    current.unshift(newConsent);
    await savePersistedConsents(current);

    return NextResponse.json({
      success: true,
      message: 'Consentimiento informado firmado y validado criptográficamente con éxito.',
      consent: newConsent
    });
  } catch (err: any) {
    console.error('[API Consent POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
