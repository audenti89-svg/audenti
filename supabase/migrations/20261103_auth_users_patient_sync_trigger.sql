-- ================================================================================
-- DIRECTIVA TÉCNICA: VINCULACIÓN AUTOMÁTICA AUTH.USERS <-> PATIENTS (Audenti 2027)
-- Arquitecto: Ricardo Sánchez
-- ================================================================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_branch_name TEXT;
  v_tenant_id UUID;
  v_patient_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Paciente Audenti');
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_branch_name := COALESCE(NEW.raw_user_meta_data->>'branch_name', 'Sucursal Balbuena (Matriz)');
  
  -- Sucursal Matriz Balbuena por defecto
  v_tenant_id := '00000000-0000-0000-0000-000000000001'::UUID;

  -- 1. Sincronizar tabla users con status activo y onboarding completado
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    CASE 
      WHEN v_role IN ('superadmin', 'owner', 'director', 'doctor', 'receptionist', 'patient') 
      THEN v_role::user_role 
      ELSE 'patient'::user_role 
    END,
    TRUE,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN users.full_name IS NULL OR users.full_name = '' THEN EXCLUDED.full_name ELSE users.full_name END,
    is_active = TRUE,
    onboarding_completed = TRUE;

  -- 2. Si es paciente o usuario externo, vincular UUID exacto en tabla patients
  IF v_role = 'patient' OR NEW.email NOT IN ('audenti89@gmail.com') THEN
    SELECT id INTO v_patient_id
    FROM public.patients
    WHERE LOWER(email) = LOWER(NEW.email)
    LIMIT 1;

    IF v_patient_id IS NOT NULL THEN
      -- Actualizar paciente existente con su auth user_id y status activo
      UPDATE public.patients
      SET
        user_id = NEW.id,
        status = 'active',
        full_name = CASE WHEN full_name IS NULL OR full_name = 'Paciente Audenti' THEN v_full_name ELSE full_name END,
        phone = COALESCE(phone, v_phone),
        updated_at = NOW()
      WHERE id = v_patient_id;
    ELSE
      -- Insertar nuevo paciente vinculado con status activo
      INSERT INTO public.patients (
        tenant_id,
        branch_id,
        branch_name,
        user_id,
        full_name,
        email,
        phone,
        status,
        created_at,
        updated_at
      )
      VALUES (
        v_tenant_id,
        v_tenant_id,
        v_branch_name,
        NEW.id,
        v_full_name,
        NEW.email,
        v_phone,
        'active',
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_sync ON auth.users;
CREATE TRIGGER trg_auth_user_sync
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();
