-- ============================================================
-- MIGRACIÓN RESILIENTE: Demografía de Pacientes, Referidos y Sedes
-- Proyecto: Audenti Cloud Pro 2027 (Dra. Aura Estudillo)
-- Fecha: 2026-11-18
-- ============================================================

-- 1. Agregar columnas en la tabla public.patients si no existen
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Balbuena',
  ADD COLUMN IF NOT EXISTS referral_type TEXT DEFAULT 'directo',
  ADD COLUMN IF NOT EXISTS referred_by_id UUID,
  ADD COLUMN IF NOT EXISTS referred_by_name TEXT,
  ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMPTZ DEFAULT NOW();

-- 2. Normalizar datos existentes
UPDATE public.patients SET branch = 'Balbuena' WHERE branch IS NULL;
UPDATE public.patients SET branch = 'Chalma de Guadalupe' WHERE branch_name ILIKE '%Chalma%' OR branch ILIKE '%Chalma%';
UPDATE public.patients SET referral_type = 'directo' WHERE referral_type IS NULL;

-- 3. Índices de optimización para filtros de reportes e informes
CREATE INDEX IF NOT EXISTS idx_patients_branch ON public.patients (branch);
CREATE INDEX IF NOT EXISTS idx_patients_referral_type ON public.patients (referral_type);
CREATE INDEX IF NOT EXISTS idx_patients_last_visit_date ON public.patients (last_visit_date);
CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON public.patients (birth_date);

-- 4. Políticas de Seguridad RLS para roles administrativos y médicos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'patients') THEN
    ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Permitir lectura completa a administradores y doctores" ON public.patients;
    CREATE POLICY "Permitir lectura completa a administradores y doctores"
      ON public.patients FOR SELECT
      TO authenticated
      USING (
        auth.jwt() ->> 'email' IN ('audenti89@gmail.com', 'rricardos76@gmail.com', 'pruevaz2022@gmail.com') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'owner', 'admin', 'doctor', 'reception', 'director', 'socio', 'trabajador') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'owner', 'admin', 'doctor', 'reception', 'director', 'socio', 'trabajador') OR
        user_id = auth.uid()
      );

    DROP POLICY IF EXISTS "Permitir actualizacion a administradores y doctores" ON public.patients;
    CREATE POLICY "Permitir actualizacion a administradores y doctores"
      ON public.patients FOR UPDATE
      TO authenticated
      USING (
        auth.jwt() ->> 'email' IN ('audenti89@gmail.com', 'rricardos76@gmail.com', 'pruevaz2022@gmail.com') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('superadmin', 'owner', 'admin', 'doctor', 'reception', 'director', 'socio', 'trabajador') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'owner', 'admin', 'doctor', 'reception', 'director', 'socio', 'trabajador') OR
        user_id = auth.uid()
      );
  END IF;
END $$;
