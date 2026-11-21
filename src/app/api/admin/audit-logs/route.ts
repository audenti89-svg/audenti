import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuditLogs, logAuditEvent } from '@/lib/audit/auditLogger';
import { isSystemAdminEmail, isInternalUser } from '@/lib/auth/admin-emails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = (user.user_metadata?.role || user.app_metadata?.role || '').toLowerCase().trim();

    if (!isSystemAdminEmail(userEmail, userRole) && !isInternalUser(userEmail, userRole)) {
      return NextResponse.json({ success: false, error: 'Acceso restringido a la Dirección Médica y Auditoría Clínica.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branch = searchParams.get('branch') || undefined;
    const action = searchParams.get('action') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const logs = await getAuditLogs({ branch, action, limit });

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err: any) {
    console.error('[API AuditLogs Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, targetResource, targetId, details, branch, metadata } = body;

    if (!action || !targetResource || !details) {
      return NextResponse.json({ success: false, error: 'Campos requeridos: action, targetResource, details' }, { status: 400 });
    }

    const entry = await logAuditEvent({
      user_email: user.email || 'desconocido@audenti.mx',
      user_role: user.user_metadata?.role || 'doctor',
      action,
      target_resource: targetResource,
      target_id: targetId,
      branch: branch || 'Sucursal Balbuena (Matriz)',
      details,
      metadata
    });

    return NextResponse.json({ success: true, log: entry });
  } catch (err: any) {
    console.error('[API AuditLogs POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
