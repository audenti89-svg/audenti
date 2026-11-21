import { createAdminClient } from '@/lib/supabase/admin';

export type AuditAction =
  | 'ROLE_CHANGE'
  | 'RECORD_DELETE'
  | 'RECORD_SOFT_DELETE'
  | 'RECORD_RESTORE'
  | 'RECORD_EDIT'
  | 'BACKUP_EXPORT'
  | 'CLINICAL_EXPORT'
  | 'SECURITY_ALERT'
  | 'CONSENT_SIGNED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_email: string;
  user_role?: string;
  action: AuditAction;
  target_resource: string;
  target_id?: string;
  branch?: string;
  details: string;
  metadata?: Record<string, any>;
  ip?: string;
}

const AUDIT_STORAGE_FILE = 'system_audit_log.json';

/**
 * Registra una acción sensible en la bitácora de auditoría inmutable de Audenti 2027.
 * Soporta persistencia dual: PostgreSQL (tabla audit_logs si existe) y Supabase Storage JSON.
 */
export async function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
  const fullEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  try {
    const admin = createAdminClient();

    // 1. Intentar registrar en PostgreSQL si la tabla audit_logs existe
    try {
      await admin.from('audit_logs').insert({
        id: fullEntry.id,
        created_at: fullEntry.timestamp,
        user_email: fullEntry.user_email,
        user_role: fullEntry.user_role || 'doctor',
        action: fullEntry.action,
        target_resource: fullEntry.target_resource,
        target_id: fullEntry.target_id || null,
        branch: fullEntry.branch || 'Sucursal Balbuena (Matriz)',
        details: fullEntry.details,
        metadata: fullEntry.metadata || {}
      });
    } catch {
      // Si la tabla no existe aún en SQL, continuar con el respaldo en Storage
    }

    // 2. Persistir en Storage (archivo inmutable json con los últimos 500 eventos)
    try {
      const { data: file } = await admin.storage
        .from('audenti_database')
        .download(AUDIT_STORAGE_FILE);

      let list: AuditLogEntry[] = [];
      if (file) {
        try {
          const text = await file.text();
          if (text) list = JSON.parse(text);
        } catch {}
      }

      const updated = [fullEntry, ...list].slice(0, 500);
      await admin.storage.from('audenti_database').upload(
        AUDIT_STORAGE_FILE,
        JSON.stringify(updated, null, 2),
        { upsert: true, contentType: 'application/json' }
      );
    } catch (storageErr: any) {
      console.warn('[AuditLogger Storage Warning]:', storageErr?.message);
    }

    // 3. Emitir evento Realtime al Dashboard médico para alerta instantánea
    try {
      await admin.channel('system_audit_stream').send({
        type: 'broadcast',
        event: 'new_audit_log',
        payload: fullEntry
      });
    } catch {}

  } catch (err: any) {
    console.error('[AuditLogger Error]:', err?.message);
  }

  return fullEntry;
}

/**
 * Obtiene las entradas más recientes de la bitácora de auditoría
 */
export async function getAuditLogs(options?: {
  branch?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const admin = createAdminClient();

    // Intentar leer de base de datos
    try {
      let query = admin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);

      if (options?.branch && options.branch !== 'all') {
        query = query.ilike('branch', `%${options.branch}%`);
      }
      if (options?.action && options.action !== 'all') {
        query = query.eq('action', options.action);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          timestamp: d.created_at || d.timestamp,
          user_email: d.user_email,
          user_role: d.user_role,
          action: d.action,
          target_resource: d.target_resource,
          target_id: d.target_id,
          branch: d.branch,
          details: d.details,
          metadata: d.metadata
        }));
      }
    } catch {}

    // Fallback de Storage
    const { data: file } = await admin.storage
      .from('audenti_database')
      .download(AUDIT_STORAGE_FILE);

    if (file) {
      const text = await file.text();
      let list: AuditLogEntry[] = JSON.parse(text) || [];
      if (options?.branch && options.branch !== 'all') {
        list = list.filter(e => (e.branch || '').toLowerCase().includes(options.branch!.toLowerCase()));
      }
      if (options?.action && options.action !== 'all') {
        list = list.filter(e => e.action === options.action);
      }
      return list.slice(0, options?.limit || 100);
    }
  } catch (err) {
    console.warn('[AuditLogger Read Error]:', err);
  }

  return [];
}
