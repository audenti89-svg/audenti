-- ============================================================
-- MIGRACIÓN: Módulo de Registro Inteligente y Atribución Comercial
-- Proyecto: Audenti Cloud Pro
-- Arquitecto: Ricardo Sánchez
-- Fecha: 2026-11-01
-- Instrucción: Ejecutar en Supabase SQL Editor (Dashboard)
-- ============================================================

-- -------------------------------------------------------
-- 1. COLUMNAS DE ATRIBUCIÓN EN LA TABLA patients
-- -------------------------------------------------------

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS acquisition_channel TEXT
    CHECK (acquisition_channel IN ('tiktok','instagram','youtube','facebook','referral','qr','directo','otro')),
  ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referrer_name TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_id TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT CONCAT('AUD-', UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

-- Índice para búsquedas por canal de adquisición (reportes BI)
CREATE INDEX IF NOT EXISTS idx_patients_acquisition_channel ON patients(acquisition_channel);
-- Índice para búsquedas por referidor (árbol de referidos)
CREATE INDEX IF NOT EXISTS idx_patients_referrer_id ON patients(referrer_id);
-- Índice único en código de referido
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_referral_code ON patients(referral_code);

-- -------------------------------------------------------
-- 1.1 COLUMNAS EN TABLA users (perfiles y sincronización OAuth)
-- -------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_channel TEXT,
  ADD COLUMN IF NOT EXISTS referrer_name TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_id TEXT,
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- -------------------------------------------------------
-- 2. TABLA DE RELACIONES FAMILIARES
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  related_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('conyuge','padre','madre','hijo','hija','hermano','hermana','abuelo','abuela','nieto','nieta','tio','tia','primo','prima','otro')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_relationship CHECK (patient_id <> related_patient_id)
);

CREATE INDEX IF NOT EXISTS idx_family_relationships_patient ON family_relationships(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_related ON family_relationships(related_patient_id);

-- -------------------------------------------------------
-- 3. TABLA DE CÓDIGOS QR DE CAMPAÑA
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS campaign_qr_codes (
  id TEXT PRIMARY KEY,           -- ej: 'qr_balbuena_01', 'qr_sucursal_norte'
  name TEXT NOT NULL,
  description TEXT,
  canal TEXT,
  active BOOLEAN DEFAULT true,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- 4. RLS (Row Level Security) para las nuevas tablas
-- -------------------------------------------------------

-- family_relationships: solo roles clínicos autorizados
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_family_relationships"
  ON family_relationships FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin','owner','director','doctor','receptionist')
  );

CREATE POLICY "staff_write_family_relationships"
  ON family_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin','owner','director','doctor','receptionist')
  );

CREATE POLICY "staff_delete_family_relationships"
  ON family_relationships FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin','owner','director','doctor','receptionist')
  );

-- campaign_qr_codes: cualquier usuario autenticado puede leer; solo staff escribe
ALTER TABLE campaign_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_qr_codes"
  ON campaign_qr_codes FOR SELECT TO authenticated USING (true);

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
  UPDATE patients SET total_referrals = total_referrals + 1 WHERE id = referrer;
END;
$$;

-- -------------------------------------------------------
-- 6. FUNCIÓN: Vista de atribución por canal para BI
-- -------------------------------------------------------
CREATE OR REPLACE VIEW attribution_by_channel AS
SELECT
  COALESCE(p.acquisition_channel, 'sin_dato') AS canal,
  COUNT(p.id) AS total_pacientes,
  SUM(p.total_referrals) AS referidos_generados,
  COALESCE(SUM(t.amount), 0) AS ingresos_totales,
  COALESCE(AVG(t.amount), 0) AS ticket_promedio
FROM patients p
LEFT JOIN transactions t ON t.patient_id = p.id AND t.type = 'cobro'
GROUP BY COALESCE(p.acquisition_channel, 'sin_dato')
ORDER BY total_pacientes DESC;

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
-- INSTRUCCIONES POST-MIGRACIÓN:
-- 1. Verificar que la vista attribution_by_channel tenga grants:
--    GRANT SELECT ON attribution_by_channel TO authenticated;
-- 2. Revisar los índices creados con: \di patients*
-- 3. Para regenerar referral_code en pacientes existentes sin código:
--    UPDATE patients SET referral_code = CONCAT('AUD-', UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)))
--    WHERE referral_code IS NULL;
-- ============================================================
