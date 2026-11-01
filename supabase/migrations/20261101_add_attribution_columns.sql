-- ============================================================
-- MIGRACIÓN RESILIENTE: Atribución Comercial, Sucursales y BI
-- Proyecto: Audenti Cloud Pro
-- Arquitecto: Ricardo Sánchez
-- Fecha: 2026-11-01
-- Instrucción: Ejecutar en Supabase SQL Editor (Dashboard)
-- 100% IDEMPOTENTE (se puede ejecutar completo o por secciones)
-- ============================================================

-- -------------------------------------------------------
-- 1. COLUMNAS DE ATRIBUCIÓN Y SUCURSALES EN TABLA patients
-- -------------------------------------------------------

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS acquisition_channel TEXT,
  ADD COLUMN IF NOT EXISTS referrer_id UUID,
  ADD COLUMN IF NOT EXISTS referrer_name TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_id TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'Sucursal Balbuena (Matriz)';

-- Constraint de canal de adquisición seguro
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_patients_acquisition_channel') THEN
    ALTER TABLE patients ADD CONSTRAINT chk_patients_acquisition_channel
      CHECK (acquisition_channel IN ('tiktok','instagram','youtube','facebook','referral','qr','directo','otro') OR acquisition_channel IS NULL);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Generar referral_code a pacientes existentes que no lo tengan
UPDATE patients
SET referral_code = CONCAT('AUD-', UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)))
WHERE referral_code IS NULL;

-- Asignar sucursal matriz a pacientes que no tengan sucursal especificada
UPDATE patients
SET branch_name = 'Sucursal Balbuena (Matriz)'
WHERE branch_name IS NULL;

-- Índices en patients
CREATE INDEX IF NOT EXISTS idx_patients_acquisition_channel ON patients(acquisition_channel);
CREATE INDEX IF NOT EXISTS idx_patients_referrer_id ON patients(referrer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_referral_code ON patients(referral_code);
CREATE INDEX IF NOT EXISTS idx_patients_branch_name ON patients(branch_name);

-- -------------------------------------------------------
-- 1.1 COLUMNAS EN TABLA users (perfiles y sincronización OAuth)
-- -------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_channel TEXT,
  ADD COLUMN IF NOT EXISTS referrer_name TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_id TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'Sucursal Balbuena (Matriz)';

-- -------------------------------------------------------
-- 1.2 COLUMNAS EN TABLA transactions (para BI por sucursal)
-- -------------------------------------------------------

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'Sucursal Balbuena (Matriz)';

-- -------------------------------------------------------
-- 2. TABLA DE RELACIONES FAMILIARES
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar que existan todas las columnas requeridas (incluso si la tabla ya existía)
ALTER TABLE family_relationships
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS related_patient_id UUID,
  ADD COLUMN IF NOT EXISTS relationship_type TEXT DEFAULT 'otro',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Constraint de parentesco válido
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_family_relationship_type') THEN
    ALTER TABLE family_relationships ADD CONSTRAINT chk_family_relationship_type CHECK (
      relationship_type IN ('conyuge','padre','madre','hijo','hija','hermano','hermana','abuelo','abuela','nieto','nieta','tio','tia','primo','prima','otro')
    );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Constraint de no autoreferencia
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_self_relationship') THEN
    ALTER TABLE family_relationships ADD CONSTRAINT no_self_relationship CHECK (patient_id <> related_patient_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Índices de relaciones familiares
CREATE INDEX IF NOT EXISTS idx_family_relationships_patient ON family_relationships(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_related ON family_relationships(related_patient_id);

-- -------------------------------------------------------
-- 3. TABLA DE CÓDIGOS QR DE CAMPAÑA
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS campaign_qr_codes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  canal TEXT,
  active BOOLEAN DEFAULT true,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- 4. POLÍTICAS RLS (Con DROP previo para evitar error 42710)
-- -------------------------------------------------------

ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_family_relationships" ON family_relationships;
CREATE POLICY "staff_read_family_relationships"
  ON family_relationships FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin','owner','director','doctor','receptionist')
  );

DROP POLICY IF EXISTS "staff_write_family_relationships" ON family_relationships;
CREATE POLICY "staff_write_family_relationships"
  ON family_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin','owner','director','doctor','receptionist')
  );

DROP POLICY IF EXISTS "staff_delete_family_relationships" ON family_relationships;
CREATE POLICY "staff_delete_family_relationships"
  ON family_relationships FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin','owner','director','doctor','receptionist')
  );

ALTER TABLE campaign_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_qr_codes" ON campaign_qr_codes;
CREATE POLICY "authenticated_read_qr_codes"
  ON campaign_qr_codes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_qr_codes" ON campaign_qr_codes;
CREATE POLICY "staff_write_qr_codes"
  ON campaign_qr_codes FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin','owner','director','doctor','receptionist')
  );

-- -------------------------------------------------------
-- 5. FUNCIÓN: Incrementar contador de referidos
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_referral_count(referrer UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE patients SET total_referrals = COALESCE(total_referrals, 0) + 1 WHERE id = referrer;
END;
$$;

-- -------------------------------------------------------
-- 6. VISTA BI: Desglose e Ingresos por Canal
-- -------------------------------------------------------

CREATE OR REPLACE VIEW attribution_by_channel AS
SELECT
  COALESCE(p.acquisition_channel, 'sin_dato') AS canal,
  COUNT(p.id) AS total_pacientes,
  COALESCE(SUM(p.total_referrals), 0) AS referidos_generados,
  COALESCE(SUM(t.amount), 0) AS ingresos_totales,
  COALESCE(AVG(t.amount), 0) AS ticket_promedio
FROM patients p
LEFT JOIN transactions t ON t.patient_id = p.id AND t.type::text IN ('income', 'cobro')
GROUP BY COALESCE(p.acquisition_channel, 'sin_dato')
ORDER BY total_pacientes DESC;

GRANT SELECT ON attribution_by_channel TO authenticated;

-- -------------------------------------------------------
-- 6.1 VISTA BI: Historial Financiero por Sucursal
-- -------------------------------------------------------

CREATE OR REPLACE VIEW financial_by_branch AS
SELECT
  COALESCE(p.branch_name, 'Sucursal Balbuena (Matriz)') AS sucursal,
  COUNT(DISTINCT p.id) AS total_pacientes,
  COUNT(t.id) AS total_transacciones,
  COALESCE(SUM(CASE WHEN t.type::text IN ('income', 'cobro') THEN t.amount ELSE 0 END), 0) AS ingresos_totales,
  COALESCE(SUM(CASE WHEN t.type::text IN ('expense', 'egreso') THEN t.amount ELSE 0 END), 0) AS egresos_totales,
  COALESCE(SUM(CASE WHEN t.type::text IN ('income', 'cobro') THEN t.amount ELSE -t.amount END), 0) AS flujo_neto
FROM patients p
LEFT JOIN transactions t ON t.patient_id = p.id
GROUP BY COALESCE(p.branch_name, 'Sucursal Balbuena (Matriz)')
ORDER BY ingresos_totales DESC;

GRANT SELECT ON financial_by_branch TO authenticated;

-- -------------------------------------------------------
-- 7. DATOS DE EJEMPLO: Códigos QR de campaña
-- -------------------------------------------------------

INSERT INTO campaign_qr_codes (id, name, description, canal) VALUES
  ('qr_balbuena_01', 'QR Clínica Balbuena – Recepción', 'QR físico en la entrada de recepción', 'qr'),
  ('qr_tarjeta_presentacion', 'QR Tarjeta de Presentación Dra. Aura', 'QR impreso en tarjetas de presentación', 'qr'),
  ('qr_redes_tiktok', 'QR Campaña TikTok Nov 2026', 'Enlace con QR compartido en TikTok', 'tiktok'),
  ('qr_instagram_bio', 'QR Bio Instagram @auradentista', 'Enlace en la bio de Instagram', 'instagram')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
