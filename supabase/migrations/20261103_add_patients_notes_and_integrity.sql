-- ==============================================================================
-- AUDENTI CLOUD PRO 2027: MIGRACIÓN DE COMPATIBILIDAD, COLUMNA NOTES Y FINANZAS
-- ==============================================================================

-- 1. Asegurar que la columna notes exista formalmente en public.patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Asegurar que branch_name y attribution_status existan formalmente en patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'Sucursal Balbuena (Matriz)';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS attribution_status TEXT DEFAULT 'pending_review';

-- 3. Asegurar que la tabla payments exista formalmente como espejo financiero
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  type TEXT NOT NULL DEFAULT 'income',
  status TEXT DEFAULT 'completed',
  payment_method TEXT DEFAULT 'Efectivo',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notificar recarga de schema cache en PostgREST
NOTIFY pgrst, 'reload schema';
