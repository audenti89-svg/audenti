-- ============================================================================
-- AUDENTI / DENTALCLOUD SAAS: MÓDULO OMNI-CANAL, RED DE REFERIDOS Y FAMILIAS
-- Script Seguro e Idempotente para Supabase SQL Editor
-- ============================================================================

-- 1. Actualización de columnas en patients (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'qr_code_source') THEN
    ALTER TABLE patients ADD COLUMN qr_code_source TEXT DEFAULT 'direct_qr';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'family_nucleus_id') THEN
    ALTER TABLE patients ADD COLUMN family_nucleus_id UUID REFERENCES family_nuclei(id);
  END IF;
END $$;

-- 2. Asegurar campos en tabla de mensajes para Omni-Canal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'receiver_id') THEN
    ALTER TABLE chat_messages ADD COLUMN receiver_id UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'family_group_id') THEN
    ALTER TABLE chat_messages ADD COLUMN family_group_id UUID REFERENCES family_nuclei(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'read_status') THEN
    ALTER TABLE chat_messages ADD COLUMN read_status BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 3. Habilitar Supabase Realtime de forma segura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
  END IF;
END $$;

-- 4. Función RPC para obtener la Red de Confianza del Paciente
CREATE OR REPLACE FUNCTION get_patient_trust_network(p_patient_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_patient RECORD;
  v_referrer RECORD;
  v_family RECORD;
  v_network JSONB;
BEGIN
  -- Obtener paciente
  SELECT id, full_name, phone, referral_code, referred_by, qr_code_source, family_nucleus_id
  INTO v_patient
  FROM patients
  WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Paciente no encontrado');
  END IF;

  -- Obtener referidor (si tiene)
  IF v_patient.referred_by IS NOT NULL THEN
    SELECT id, full_name, referral_code
    INTO v_referrer
    FROM patients
    WHERE id = v_patient.referred_by;
  END IF;

  -- Obtener núcleo familiar (si tiene)
  IF v_patient.family_nucleus_id IS NOT NULL THEN
    SELECT fn.id AS nucleus_id, fn.name AS nucleus_name,
           COALESCE(
             jsonb_agg(
               jsonb_build_object(
                 'id', p.id,
                 'name', p.full_name,
                 'relationship', fnm.relationship
               )
             ) FILTER (WHERE p.id IS NOT NULL), '[]'::jsonb
           ) AS members
    INTO v_family
    FROM family_nuclei fn
    LEFT JOIN family_nucleus_members fnm ON fnm.nucleus_id = fn.id
    LEFT JOIN patients p ON p.id = fnm.patient_id
    WHERE fn.id = v_patient.family_nucleus_id
    GROUP BY fn.id, fn.name;
  END IF;

  -- Construir respuesta unificada
  v_network := jsonb_build_object(
    'patient', jsonb_build_object(
      'id', v_patient.id,
      'name', v_patient.full_name,
      'phone', v_patient.phone,
      'referral_code', v_patient.referral_code,
      'qr_source', v_patient.qr_code_source
    ),
    'referrer', CASE 
      WHEN v_referrer.id IS NOT NULL THEN jsonb_build_object(
        'id', v_referrer.id,
        'name', v_referrer.full_name,
        'code', v_referrer.referral_code
      )
      ELSE NULL 
    END,
    'family_nucleus', CASE
      WHEN v_family.nucleus_id IS NOT NULL THEN jsonb_build_object(
        'id', v_family.nucleus_id,
        'name', v_family.nucleus_name,
        'members', v_family.members
      )
      ELSE NULL
    END
  );

  RETURN v_network;
END;
$$;

-- 5. Función RPC para enviar mensaje a todo el Núcleo Familiar en cascada
CREATE OR REPLACE FUNCTION send_family_group_message(
  p_tenant_id UUID,
  p_family_group_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_channel_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_channel_id UUID := p_channel_id;
  v_message_id UUID;
BEGIN
  -- Si no se especifica canal, buscar o crear canal de la familia
  IF v_channel_id IS NULL THEN
    SELECT id INTO v_channel_id
    FROM chat_channels
    WHERE tenant_id = p_tenant_id 
      AND family_nucleus_id = p_family_group_id
    LIMIT 1;

    IF v_channel_id IS NULL THEN
      INSERT INTO chat_channels (tenant_id, name, channel_type, family_nucleus_id)
      VALUES (p_tenant_id, 'Chat Familiar', 'family', p_family_group_id)
      RETURNING id INTO v_channel_id;
    END IF;
  END IF;

  -- Insertar el mensaje
  INSERT INTO chat_messages (channel_id, sender_id, content, family_group_id, read_status)
  VALUES (v_channel_id, p_sender_id, p_content, p_family_group_id, FALSE)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;
