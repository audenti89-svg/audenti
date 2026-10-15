-- ============================================================================
-- AUDENTI / DENTALCLOUD SAAS: EXPANSION PROTOCOL (CHATS, GROUPS & APPOINTMENT LOGS)
-- Script Seguro e Idempotente para Supabase SQL Editor
-- ============================================================================

-- 1. Tabla de Grupos Personalizados de Chat
CREATE TABLE IF NOT EXISTS chat_custom_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('staff_interconsulta', 'staff_department', 'patient_family', 'patient_referral_network', 'broadcast_cascade')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Miembros de Grupos Personalizados
CREATE TABLE IF NOT EXISTS chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_custom_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  patient_id UUID REFERENCES patients(id),
  role_in_group TEXT DEFAULT 'member',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Historial Inmutable y Logs de Auditoría de Citas (Appointment Logs)
CREATE TABLE IF NOT EXISTS appointment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  previous_status appointment_status,
  new_status appointment_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Notificaciones In-App con soporte de alertas sonoras y Realtime
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('new_message', 'patient_arrival', 'appointment_rescheduled', 'critical_inventory', 'emergency')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sound_played BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Habilitar Realtime de forma segura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'in_app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'appointment_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointment_logs;
  END IF;
END $$;
