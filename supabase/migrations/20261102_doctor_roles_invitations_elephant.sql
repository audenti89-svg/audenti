-- =====================================================================
-- AUDENTI CLOUD PRO (2027) - MIGRACIÓN MAESTRA:
-- Roles Médicos (Socio vs Trabajador), Sistema de Invitaciones Privadas,
-- y Soporte de Concurrencia Elephant-Goldfish
-- Arquitecto: Ricardo Sánchez
-- Fecha: 2026-11-02
-- 100% IDEMPOTENTE Y RESILIENTE (Sin conflictos 55P04)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TIPOS MÉDICOS Y PERMISOS: doctor_type ('socio' vs 'trabajador')
-- Se utiliza columna TEXT con CHECK para total compatibilidad transaccional
-- ---------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS doctor_type TEXT DEFAULT 'trabajador',
  ADD COLUMN IF NOT EXISTS medical_license TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID,
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'balbuena',
  ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'Sucursal Balbuena (Matriz)';

-- Constraint para doctor_type
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_doctor_type') THEN
    ALTER TABLE public.users ADD CONSTRAINT chk_users_doctor_type
      CHECK (doctor_type IN ('socio', 'trabajador') OR doctor_type IS NULL);
  END IF;
EXCEPTION WHEN duplicate_object THEN null; WHEN others THEN null; END $$;

-- ---------------------------------------------------------------------
-- 2. TABLA DE INVITACIONES PRIVADAS PARA ODONTÓLOGOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'trabajador' CHECK (role IN ('socio', 'trabajador', 'doctor')),
  branch_id TEXT NOT NULL DEFAULT 'balbuena',
  branch_name TEXT NOT NULL DEFAULT 'Sucursal Balbuena (Matriz)',
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_by_name TEXT DEFAULT 'Dra. Aura Estudillo',
  accepted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_invitations_token ON public.doctor_invitations(token);
CREATE INDEX IF NOT EXISTS idx_doctor_invitations_email ON public.doctor_invitations(email);
CREATE INDEX IF NOT EXISTS idx_doctor_invitations_status ON public.doctor_invitations(status);

-- RLS en doctor_invitations
ALTER TABLE public.doctor_invitations ENABLE ROW LEVEL SECURITY;

-- Staff con permisos altos (socio, director, owner, superadmin) puede administrar invitaciones
DROP POLICY IF EXISTS "staff_manage_doctor_invitations" ON public.doctor_invitations;
CREATE POLICY "staff_manage_doctor_invitations"
  ON public.doctor_invitations FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid())::text IN ('superadmin', 'owner', 'director', 'socio')
    OR (SELECT doctor_type FROM public.users WHERE id = auth.uid()) = 'socio'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'audenti89@gmail.com'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid())::text IN ('superadmin', 'owner', 'director', 'socio')
    OR (SELECT doctor_type FROM public.users WHERE id = auth.uid()) = 'socio'
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'audenti89@gmail.com'
  );

-- Invitado con token válido puede leer los detalles de su invitación
DROP POLICY IF EXISTS "public_read_valid_invitation_by_token" ON public.doctor_invitations;
CREATE POLICY "public_read_valid_invitation_by_token"
  ON public.doctor_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND expires_at > now());

-- ---------------------------------------------------------------------
-- 3. POLÍTICAS RLS PARA PROTECCIÓN FINANCIERA (Socio vs Trabajador)
-- Socios: Acceso a reportes y finanzas
-- Trabajadores: Limitados a agenda y pacientes de su sucursal, SIN transacciones
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "tenant_transactions_read" ON public.transactions;
    CREATE POLICY "tenant_transactions_read" ON public.transactions
      FOR SELECT TO authenticated
      USING (
        (SELECT role FROM public.users WHERE id = auth.uid())::text IN ('superadmin', 'owner', 'director', 'socio')
        OR (SELECT doctor_type FROM public.users WHERE id = auth.uid()) = 'socio'
        OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'audenti89@gmail.com'
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. CONCURRENCY CONTROL PATTERN ELEPHANT-GOLDFISH EN APPOINTMENTS
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    ALTER TABLE public.appointments
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS last_modified_by UUID,
      ADD COLUMN IF NOT EXISTS concurrency_token TEXT DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. FUNCIÓN: Aceptar invitación de odontólogo de forma atómica
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_doctor_invitation(
  p_token TEXT,
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_role TEXT;
BEGIN
  -- Validar token
  SELECT * INTO v_invitation
  FROM public.doctor_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitación inválida, expirada o previamente aceptada.');
  END IF;

  v_role := v_invitation.role;

  -- Actualizar invitación a aceptada
  UPDATE public.doctor_invitations
  SET status = 'accepted',
      accepted_by = p_user_id,
      accepted_at = now()
  WHERE id = v_invitation.id;

  -- Insertar o actualizar en users: role base 'doctor' y doctor_type ('socio' | 'trabajador')
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    doctor_type,
    branch_id,
    branch_name,
    invited_by,
    onboarding_completed,
    is_active
  ) VALUES (
    p_user_id,
    v_invitation.email,
    COALESCE(p_full_name, v_invitation.full_name, 'Odontólogo Especialista'),
    'doctor',
    v_role,
    v_invitation.branch_id,
    v_invitation.branch_name,
    v_invitation.created_by,
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'doctor',
    doctor_type = v_role,
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    invited_by = EXCLUDED.invited_by,
    onboarding_completed = true,
    is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'role', v_role,
    'branch_name', v_invitation.branch_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_doctor_invitation(TEXT, UUID, TEXT) TO anon, authenticated;
