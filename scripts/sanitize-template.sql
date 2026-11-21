-- ==============================================================================
-- AUDENTI CLOUD PRO (2027) - SCRIPT DE SANITIZACIÓN PARA CLONACIÓN / MARCA BLANCA
-- Propósito: Purgar datos de pacientes reales, teléfonos y registros sensibles
-- antes de desplegar para una nueva clínica o franquicia.
-- CONSERVA: Esquema de base de datos, Catálogo Costos 2, RLS, Vistas y Tabulador.
-- ==============================================================================

BEGIN;

-- 1. Vaciar bitácoras de auditoría y chats clínicos
TRUNCATE TABLE IF EXISTS public.chat_messages CASCADE;
TRUNCATE TABLE IF EXISTS public.audit_logs CASCADE;
TRUNCATE TABLE IF EXISTS public.notifications CASCADE;

-- 2. Vaciar pagos y transacciones financieras
TRUNCATE TABLE IF EXISTS public.payments CASCADE;
TRUNCATE TABLE IF EXISTS public.invoices CASCADE;

-- 3. Vaciar citas y agendas pasadas
TRUNCATE TABLE IF EXISTS public.appointments CASCADE;

-- 4. Vaciar odontogramas, evolución y consentimientos
TRUNCATE TABLE IF EXISTS public.odontograms CASCADE;
TRUNCATE TABLE IF EXISTS public.clinical_evolutions CASCADE;
TRUNCATE TABLE IF EXISTS public.informed_consents CASCADE;
TRUNCATE TABLE IF EXISTS public.medical_prescriptions CASCADE;

-- 5. Vaciar expedientes de pacientes (Conservando estructura y secuencias)
TRUNCATE TABLE IF EXISTS public.patients CASCADE;

-- 6. Insertar Paciente Demo / Plantilla para verificación inicial
INSERT INTO public.patients (
    id,
    full_name,
    phone,
    email,
    birth_date,
    branch_name,
    tenant_id,
    has_no_allergies,
    allergies,
    medical_risk_level,
    notes,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000099',
    'Paciente Demostración Audenti',
    '5500000000',
    'paciente.demo@audenti.cloud',
    '1995-01-01',
    'Sede Matriz — Jardín Balbuena',
    '00000000-0000-0000-0000-000000000001',
    true,
    'Sin alergias confirmadas',
    'bajo',
    'Expediente demo para validación de arquitectura clínica y flujos de odontograma.',
    NOW()
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ==============================================================================
-- FIN DE LA SANITIZACIÓN. EL SISTEMA ESTÁ LISTO PARA CONFIGURAR NUEVO CLIENTE.
-- ==============================================================================
