-- =====================================================================
-- AUDENTI CLOUD PRO (2027) - MIGRACIÓN DE BLINDAJE DE SEGURIDAD ECC (P0)
-- Corrección de Políticas RLS y Cierre Definitivo de Vectores Críticos
-- Arquitecto: Ricardo Sánchez
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. REVOCAR POLÍTICAS DE LECTURA PÚBLICA DE TOKENS DE INVITACIÓN
-- Cierra la fuga de datos en doctor_invitations y student_passes
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "public_read_valid_invitation_by_token" ON public.doctor_invitations;
DROP POLICY IF EXISTS "public_verify_student_pass_by_token" ON public.student_passes;

-- ---------------------------------------------------------------------
-- 2. BLINDAR TABLA PUBLIC.USERS CONTRA ELEVACIÓN DE PRIVILEGIOS
-- Impide que usuarios autenticados modifiquen su propio campo 'role' o 'doctor_type'
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "allow_upsert_own_user" ON public.users;
DROP POLICY IF EXISTS "allow_update_own_profile" ON public.users;

CREATE POLICY "allow_update_own_profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    AND (doctor_type IS NOT DISTINCT FROM (SELECT doctor_type FROM public.users WHERE id = auth.uid()))
  );

-- ---------------------------------------------------------------------
-- 3. TRIGGER DE DEFENSA EN PROFUNDIDAD CONTRA ESCALACIÓN DE ROLES
-- Bloquea a nivel de motor PostgreSQL cualquier intento de manipulación
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_user_role_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (current_user <> 'service_role' AND auth.role() = 'authenticated') THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Violación de Seguridad ECC: Modificación de rol denegada.';
    END IF;
    IF (NEW.doctor_type IS DISTINCT FROM OLD.doctor_type) THEN
      RAISE EXCEPTION 'Violación de Seguridad ECC: Modificación de tipo médico denegada.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_user_role_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.prevent_user_role_escalation();
