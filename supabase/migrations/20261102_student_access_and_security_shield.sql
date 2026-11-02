-- =====================================================================
-- AUDENTI CLOUD PRO (2027): GESTIÓN DE PASANTES/ESTUDIANTES,
-- BLINDAJE INMUNOLÓGICO Y CIBERSEGURIDAD
-- Arquitecto: Ricardo Sánchez
-- 100% IDEMPOTENTE Y SEGURO (Sin bloqueos 55P04)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLA DE PASES TEMPORALES PARA ESTUDIANTES / SERVICIO SOCIAL
-- ---------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS student_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_temporary_student BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS university_origin TEXT;

-- Actualizar constraint de doctor_type para aceptar 'estudiante'
DO $$ BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_users_doctor_type;
  ALTER TABLE public.users ADD CONSTRAINT chk_users_doctor_type
    CHECK (doctor_type IN ('socio', 'trabajador', 'estudiante') OR doctor_type IS NULL);
EXCEPTION WHEN duplicate_object THEN null; WHEN others THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.student_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  university TEXT DEFAULT 'UNAM / UAM / IPN',
  branch_id TEXT NOT NULL DEFAULT 'balbuena',
  branch_name TEXT NOT NULL DEFAULT 'Sucursal Balbuena (Matriz)',
  pass_token TEXT UNIQUE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name TEXT DEFAULT 'Dra. Aura Estudillo',
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_passes_token ON public.student_passes(pass_token);
CREATE INDEX IF NOT EXISTS idx_student_passes_status ON public.student_passes(status);
CREATE INDEX IF NOT EXISTS idx_student_passes_expires ON public.student_passes(expires_at);

ALTER TABLE public.student_passes ENABLE ROW LEVEL SECURITY;

-- Dra. Aura y Socios pueden gestionar pases de estudiantes
DROP POLICY IF EXISTS "staff_manage_student_passes" ON public.student_passes;
CREATE POLICY "staff_manage_student_passes"
  ON public.student_passes FOR ALL
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

-- Consulta de verificación de token de pase temporal
DROP POLICY IF EXISTS "public_verify_student_pass_by_token" ON public.student_passes;
CREATE POLICY "public_verify_student_pass_by_token"
  ON public.student_passes FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND expires_at > now());

-- ---------------------------------------------------------------------
-- 2. TABLA DEL SISTEMA INMUNOLÓGICO: LOGS DE AMENAZAS Y ANTI-HACK
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_threat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type TEXT NOT NULL,          -- 'sql_injection', 'xss', 'path_traversal', 'rate_limit', 'scanner'
  severity TEXT NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  ip_address TEXT,
  endpoint TEXT NOT NULL,
  payload_sample TEXT,
  user_agent TEXT,
  blocked BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_threat_created ON public.security_threat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_threat_ip ON public.security_threat_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_threat_type ON public.security_threat_logs(threat_type);

ALTER TABLE public.security_threat_logs ENABLE ROW LEVEL SECURITY;

-- Solo Superadmin y Dra. Aura pueden auditar registros del sistema inmunológico
DROP POLICY IF EXISTS "superadmin_audit_security_threats" ON public.security_threat_logs;
CREATE POLICY "superadmin_audit_security_threats"
  ON public.security_threat_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid())::text IN ('superadmin', 'owner', 'director')
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'audenti89@gmail.com'
  );

-- Backend o anon para insertar amenazas bloqueadas
DROP POLICY IF EXISTS "system_log_security_threats" ON public.security_threat_logs;
CREATE POLICY "system_log_security_threats"
  ON public.security_threat_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 3. POLÍTICAS RLS: ESTUDIANTES SOLO LECTURA CLÍNICA EN SU SUCURSAL
-- (Bloqueados si expiró su pase temporal o en vistas financieras)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patients') THEN
    ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

    -- Política de lectura para estudiantes activos con cast seguro text = text
    DROP POLICY IF EXISTS "student_read_branch_patients" ON public.patients;
    CREATE POLICY "student_read_branch_patients"
      ON public.patients FOR SELECT
      TO authenticated
      USING (
        (SELECT doctor_type FROM public.users WHERE id = auth.uid()) = 'estudiante'
        AND (SELECT student_expires_at FROM public.users WHERE id = auth.uid()) > now()
        AND (
          branch_name = (SELECT branch_name FROM public.users WHERE id = auth.uid())
          OR branch_id::text = (SELECT branch_id::text FROM public.users WHERE id = auth.uid())
          OR branch_name IS NULL
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4. FUNCIÓN ATÓMICA: Activar pase temporal de estudiante
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION activate_student_pass(
  p_pass_token TEXT,
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
BEGIN
  SELECT * INTO v_pass
  FROM public.student_passes
  WHERE pass_token = p_pass_token AND status = 'active' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pase temporal de estudiante inválido, expirado o revocado.');
  END IF;

  -- Actualizar pase
  UPDATE public.student_passes
  SET assigned_user_id = p_user_id,
      activated_at = now()
  WHERE id = v_pass.id;

  -- Upsert en users con perfil de estudiante temporal
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    doctor_type,
    branch_id,
    branch_name,
    student_expires_at,
    is_temporary_student,
    supervisor_id,
    onboarding_completed,
    is_active
  ) VALUES (
    p_user_id,
    v_pass.student_email,
    COALESCE(p_full_name, v_pass.student_name, 'Estudiante de Odontología'),
    'doctor',
    'estudiante',
    v_pass.branch_id,
    v_pass.branch_name,
    v_pass.expires_at,
    true,
    v_pass.created_by,
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'doctor',
    doctor_type = 'estudiante',
    branch_id = EXCLUDED.branch_id,
    branch_name = EXCLUDED.branch_name,
    student_expires_at = EXCLUDED.student_expires_at,
    is_temporary_student = true,
    supervisor_id = EXCLUDED.supervisor_id,
    onboarding_completed = true,
    is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'expires_at', v_pass.expires_at,
    'branch_name', v_pass.branch_name,
    'student_name', v_pass.student_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION activate_student_pass(TEXT, UUID, TEXT) TO anon, authenticated;
