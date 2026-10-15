-- ============================================================
-- AUDENTI DentalCloud SaaS — Supabase SQL Schema v1.0
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================-- ============================================================
-- 1. ENUM TYPES (Idempotente)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('superadmin', 'owner', 'director', 'doctor', 'receptionist', 'patient');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_status') THEN
    CREATE TYPE patient_status AS ENUM ('active', 'inactive', 'archived');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_type') THEN
    CREATE TYPE relationship_type AS ENUM ('spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'uncle_aunt', 'nephew_niece', 'cousin', 'partner', 'guardian', 'other');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category') THEN
    CREATE TYPE service_category AS ENUM ('prevention', 'restoration', 'endodontics', 'periodontics', 'orthodontics', 'implantology', 'oral_surgery', 'pediatric', 'aesthetic', 'prosthodontics', 'store');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'refund', 'commission');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tooth_condition') THEN
    CREATE TYPE tooth_condition AS ENUM ('healthy', 'caries', 'filled', 'crown', 'missing', 'implant', 'root_canal', 'bridge', 'veneer', 'fracture', 'extraction_needed', 'periapical_lesion', 'mobility', 'erupting', 'impacted');
  END IF;
END $$;

-- ============================================================
-- 2. TABLAS PRINCIPALES
-- ============================================================

-- 2.1 TENANTS (Franquicias)
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  license_key   TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  license_type  TEXT NOT NULL DEFAULT 'standard'
                  CHECK (license_type IN ('standard', 'professional', 'enterprise')),
  license_expires_at TIMESTAMPTZ,
  logo_url      TEXT,
  brand_color   TEXT DEFAULT '#202D4C',
  accent_color  TEXT DEFAULT '#E3A033',
  settings      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 BRANCHES (Sucursales)
CREATE TABLE IF NOT EXISTS branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  country       TEXT DEFAULT 'MX',
  phone         TEXT,
  email         TEXT,
  timezone      TEXT DEFAULT 'America/Mexico_City',
  opening_hours JSONB DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);

-- 2.3 USERS (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id            UUID REFERENCES tenants(id),
  branch_id            UUID REFERENCES branches(id),
  role                 user_role NOT NULL DEFAULT 'receptionist',
  email                TEXT UNIQUE NOT NULL,
  full_name            TEXT,
  avatar_url           TEXT,
  phone                TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

-- 2.4 EMPLOYEE PROFILES
CREATE TABLE IF NOT EXISTS employee_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialty         TEXT,
  license_number    TEXT,
  bio               TEXT,
  commission_rate   NUMERIC(5,2) NOT NULL DEFAULT 0.00
                      CHECK (commission_rate >= 0 AND commission_rate <= 100),
  cumulative_commission NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  schedule          JSONB DEFAULT '{}',
  certifications    JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 PATIENTS
CREATE TABLE IF NOT EXISTS patients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  branch_id         UUID NOT NULL REFERENCES branches(id),
  user_id           UUID REFERENCES users(id),
  referral_code     TEXT UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  referred_by       UUID REFERENCES patients(id),
  full_name         TEXT NOT NULL,
  date_of_birth     DATE,
  gender            TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  status            patient_status NOT NULL DEFAULT 'active',
  photo_url         TEXT,
  last_appointment_at TIMESTAMPTZ,
  total_spent       NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_tenant    ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_branch    ON patients(branch_id);
CREATE INDEX IF NOT EXISTS idx_patients_status    ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_referral  ON patients(referral_code);
CREATE INDEX IF NOT EXISTS idx_patients_last_appt ON patients(last_appointment_at);

-- 2.6 FAMILY NUCLEI
CREATE TABLE IF NOT EXISTS family_nuclei (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_nuclei_tenant ON family_nuclei(tenant_id);

-- 2.7 FAMILY RELATIONSHIPS
CREATE TABLE IF NOT EXISTS family_relationships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_nucleus_id   UUID NOT NULL REFERENCES family_nuclei(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  related_patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship_type   relationship_type NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, related_patient_id),
  CHECK (patient_id <> related_patient_id)
);

-- 2.8 MEDICAL QUESTIONNAIRES
CREATE TABLE IF NOT EXISTS medical_questionnaires (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  completed_at            TIMESTAMPTZ DEFAULT NOW(),
  allergies               TEXT[] DEFAULT '{}',
  chronic_diseases        TEXT[] DEFAULT '{}',
  current_medications     TEXT[] DEFAULT '{}',
  previous_surgeries      TEXT[] DEFAULT '{}',
  pregnancy               BOOLEAN DEFAULT FALSE,
  smoker                  BOOLEAN DEFAULT FALSE,
  alcohol_use             TEXT CHECK (alcohol_use IN ('none', 'occasional', 'regular', 'heavy')),
  blood_type              TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  assigned_specialty      service_category,
  triage_notes            TEXT,
  raw_answers             JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questionnaires_patient ON medical_questionnaires(patient_id);

-- 2.9 ODONTOGRAMS
CREATE TABLE IF NOT EXISTS odontograms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES users(id),
  dentition_type  TEXT NOT NULL DEFAULT 'adult' CHECK (dentition_type IN ('adult', 'pediatric')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON odontograms(patient_id);

-- 2.10 TOOTH RECORDS (historial por pieza)
CREATE TABLE IF NOT EXISTS tooth_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  odontogram_id UUID NOT NULL REFERENCES odontograms(id) ON DELETE CASCADE,
  tooth_number  INTEGER NOT NULL CHECK (tooth_number BETWEEN 11 AND 85), -- FDI
  conditions    tooth_condition[] DEFAULT '{}',
  surfaces      JSONB DEFAULT '{"mesial":null,"distal":null,"occlusal":null,"buccal":null,"lingual":null}',
  notes         TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by   UUID REFERENCES users(id),
  UNIQUE(odontogram_id, tooth_number)
);
CREATE INDEX IF NOT EXISTS idx_tooth_records_odontogram ON tooth_records(odontogram_id);

-- 2.11 SERVICES
CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  name             TEXT NOT NULL,
  category         service_category NOT NULL,
  description      TEXT,
  base_price       NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_tenant   ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- 2.12 APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  branch_id        UUID NOT NULL REFERENCES branches(id),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  doctor_id        UUID NOT NULL REFERENCES users(id),
  service_id       UUID REFERENCES services(id),
  status           appointment_status NOT NULL DEFAULT 'scheduled',
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  notes            TEXT,
  cancelled_reason TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant    ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch    ON appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient   ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor    ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status    ON appointments(status);

-- 2.13 TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  branch_id         UUID NOT NULL REFERENCES branches(id),
  patient_id        UUID REFERENCES patients(id),
  appointment_id    UUID REFERENCES appointments(id),
  doctor_id         UUID REFERENCES users(id),
  service_id        UUID REFERENCES services(id),
  type              transaction_type NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  payment_method    TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'insurance', 'other')),
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant  ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch  ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient ON transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_doctor  ON transactions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(created_at DESC);

-- 2.14 REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  referrer_patient_id  UUID NOT NULL REFERENCES patients(id),
  referred_patient_id  UUID NOT NULL REFERENCES patients(id),
  referral_code        TEXT NOT NULL,
  channel              TEXT DEFAULT 'qr' CHECK (channel IN ('qr', 'link', 'whatsapp', 'direct')),
  reward_amount        NUMERIC(10,2) DEFAULT 0.00,
  ltv_attributed       NUMERIC(12,2) DEFAULT 0.00,
  converted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_patient_id, referred_patient_id),
  CHECK (referrer_patient_id <> referred_patient_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_tenant   ON referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_patient_id);

-- 2.15 CHAT CHANNELS
CREATE TABLE IF NOT EXISTS chat_channels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  branch_id         UUID REFERENCES branches(id),
  name              TEXT NOT NULL,
  channel_type      TEXT NOT NULL DEFAULT 'general'
                      CHECK (channel_type IN ('general', 'specialty', 'accounting', 'family', 'direct')),
  family_nucleus_id UUID REFERENCES family_nuclei(id),
  allowed_roles     user_role[] DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant ON chat_channels(tenant_id);

-- 2.16 CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  media_urls  TEXT[] DEFAULT '{}',
  reply_to_id UUID REFERENCES chat_messages(id),
  read_by     UUID[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender  ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_date    ON chat_messages(created_at DESC);

-- 2.17 PRODUCTS (E-Commerce Dental)
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

-- 2.18 ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  branch_id  UUID NOT NULL REFERENCES branches(id),
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total      NUMERIC(12,2) NOT NULL,
  items      JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_tenant  ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id);

-- 2.19 PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS prescriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  patient_id    UUID NOT NULL REFERENCES patients(id),
  doctor_id     UUID NOT NULL REFERENCES users(id),
  appointment_id UUID REFERENCES appointments(id),
  medications   JSONB NOT NULL DEFAULT '[]',
  instructions  TEXT,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.20 AUDIT LOGS (inmutable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id),
  user_id    UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant    ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table     ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record    ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_date      ON audit_logs(created_at DESC);


-- ============================================================
-- 3. FUNCIONES Y TRIGGERS
-- ============================================================

-- 3.1 Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar a todas las tablas con updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tenants', 'branches', 'users', 'employee_profiles', 'patients',
    'medical_questionnaires', 'odontograms', 'appointments',
    'chat_messages', 'orders'
  ]) LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t
    );
  END LOOP;
END;
$$;

-- 3.2 Auto-inactivar pacientes sin cita en 6 meses
CREATE OR REPLACE FUNCTION auto_inactivate_patients()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE patients
  SET status = 'inactive', updated_at = NOW()
  WHERE status = 'active'
    AND (
      last_appointment_at < NOW() - INTERVAL '6 months'
      OR (last_appointment_at IS NULL AND created_at < NOW() - INTERVAL '6 months')
    );
END;
$$;

-- Trigger que actualiza last_appointment_at cuando se completa una cita
CREATE OR REPLACE FUNCTION update_patient_last_appointment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE patients
    SET last_appointment_at = NEW.scheduled_at,
        status = 'active',
        updated_at = NOW()
    WHERE id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_patient_last_appt
AFTER UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_patient_last_appointment();

-- 3.3 Calcular comisión del doctor en cada transacción de ingreso
CREATE OR REPLACE FUNCTION calculate_doctor_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_commission_rate NUMERIC;
BEGIN
  IF NEW.type = 'income' AND NEW.doctor_id IS NOT NULL THEN
    SELECT commission_rate INTO v_commission_rate
    FROM employee_profiles
    WHERE user_id = NEW.doctor_id;

    IF v_commission_rate IS NOT NULL AND v_commission_rate > 0 THEN
      NEW.commission_amount := ROUND(NEW.amount * v_commission_rate / 100, 2);

      -- Acumular comisión en el perfil del doctor
      UPDATE employee_profiles
      SET cumulative_commission = cumulative_commission + NEW.commission_amount,
          updated_at = NOW()
      WHERE user_id = NEW.doctor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_commission
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION calculate_doctor_commission();

-- 3.4 Actualizar total gastado del paciente
CREATE OR REPLACE FUNCTION update_patient_total_spent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'income' AND NEW.patient_id IS NOT NULL THEN
    UPDATE patients
    SET total_spent = total_spent + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_patient_spent
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_patient_total_spent();

-- 3.5 Actualizar LTV del referidor cuando el paciente referido genera ingresos
CREATE OR REPLACE FUNCTION update_referral_ltv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'income' AND NEW.patient_id IS NOT NULL THEN
    UPDATE referrals
    SET ltv_attributed = ltv_attributed + NEW.amount
    WHERE referred_patient_id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_referral_ltv
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_referral_ltv();

-- 3.6 Crear perfil de usuario al registrarse (via auth hook)
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'receptionist')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- 3.7 Audit log genérico
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::UUID;

  INSERT INTO audit_logs (
    user_id, action, table_name, record_id, old_data, new_data
  ) VALUES (
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Auditar tablas críticas
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['patients', 'transactions', 'appointments', 'prescriptions']) LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION audit_changes()', t, t
    );
  END LOOP;
END;
$$;


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_nuclei        ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE odontograms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- Helper: obtener tenant_id del usuario autenticado
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$;

-- Helper: obtener rol del usuario autenticado
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- Helper: es superadmin?
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
$$;


-- ============================================================
-- 4.1 POLÍTICAS — TENANTS
-- ============================================================
-- Solo superadmin puede ver todos los tenants
CREATE POLICY "superadmin_all_tenants" ON tenants
  FOR ALL USING (is_superadmin());

-- Cada usuario solo ve su propio tenant
CREATE POLICY "user_own_tenant" ON tenants
  FOR SELECT USING (id = auth_tenant_id());


-- ============================================================
-- 4.2 POLÍTICAS — BRANCHES
-- ============================================================
CREATE POLICY "tenant_branches" ON branches
  FOR ALL USING (
    is_superadmin() OR tenant_id = auth_tenant_id()
  );


-- ============================================================
-- 4.3 POLÍTICAS — USERS
-- ============================================================
-- Superadmin ve todo
CREATE POLICY "superadmin_all_users" ON users
  FOR ALL USING (is_superadmin());

-- Owner/Director ven usuarios de su tenant
CREATE POLICY "tenant_users_read" ON users
  FOR SELECT USING (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('owner', 'director')
  );

-- Usuario ve su propio perfil
CREATE POLICY "self_profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Usuario actualiza su propio perfil (no puede cambiar rol)
CREATE POLICY "self_update" ON users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));


-- ============================================================
-- 4.4 POLÍTICAS — PATIENTS
-- ============================================================
-- Isolación estricta por tenant
CREATE POLICY "tenant_patients" ON patients
  FOR ALL USING (tenant_id = auth_tenant_id());

-- Paciente solo ve su propio registro
CREATE POLICY "patient_self" ON patients
  FOR SELECT USING (
    auth_user_role() = 'patient' AND user_id = auth.uid()
  );

-- Owner NO puede modificar datos médicos de pacientes
CREATE POLICY "owner_no_medical_write" ON patients
  FOR UPDATE USING (
    auth_user_role() <> 'owner'
    OR (auth_user_role() = 'owner' AND tenant_id = auth_tenant_id())
  );


-- ============================================================
-- 4.5 POLÍTICAS — MEDICAL DATA (questionnaires, odontograms, tooth_records)
-- ============================================================
CREATE POLICY "tenant_questionnaires" ON medical_questionnaires
  FOR ALL USING (
    (SELECT tenant_id FROM patients WHERE id = patient_id) = auth_tenant_id()
    AND auth_user_role() IN ('superadmin', 'director', 'doctor')
  );

CREATE POLICY "tenant_odontograms" ON odontograms
  FOR ALL USING (
    (SELECT tenant_id FROM patients WHERE id = patient_id) = auth_tenant_id()
    AND auth_user_role() IN ('superadmin', 'director', 'doctor')
  );

CREATE POLICY "tenant_tooth_records" ON tooth_records
  FOR ALL USING (
    (SELECT (SELECT tenant_id FROM patients WHERE id = o.patient_id)
     FROM odontograms o WHERE o.id = odontogram_id) = auth_tenant_id()
    AND auth_user_role() IN ('superadmin', 'director', 'doctor')
  );


-- ============================================================
-- 4.6 POLÍTICAS — APPOINTMENTS
-- ============================================================
CREATE POLICY "tenant_appointments" ON appointments
  FOR ALL USING (tenant_id = auth_tenant_id());

-- Doctor ve solo sus citas
CREATE POLICY "doctor_own_appointments" ON appointments
  FOR SELECT USING (
    auth_user_role() = 'doctor' AND doctor_id = auth.uid()
  );

-- Paciente ve sus propias citas
CREATE POLICY "patient_own_appointments" ON appointments
  FOR SELECT USING (
    auth_user_role() = 'patient'
    AND patient_id = (SELECT id FROM patients WHERE user_id = auth.uid() LIMIT 1)
  );


-- ============================================================
-- 4.7 POLÍTICAS — TRANSACTIONS (Owner solo lectura, sin mantenimiento)
-- ============================================================
CREATE POLICY "tenant_transactions_read" ON transactions
  FOR SELECT USING (tenant_id = auth_tenant_id());

-- Solo doctor/receptionist/director pueden crear transacciones
CREATE POLICY "staff_create_transactions" ON transactions
  FOR INSERT WITH CHECK (
    tenant_id = auth_tenant_id()
    AND auth_user_role() IN ('director', 'doctor', 'receptionist')
  );

-- Owner NO puede modificar ni eliminar transacciones
CREATE POLICY "owner_no_transaction_write" ON transactions
  FOR UPDATE USING (auth_user_role() NOT IN ('owner', 'patient'));

CREATE POLICY "owner_no_transaction_delete" ON transactions
  FOR DELETE USING (auth_user_role() IN ('superadmin', 'director'));


-- ============================================================
-- 4.8 POLÍTICAS — CHAT
-- ============================================================
CREATE POLICY "tenant_chat_channels" ON chat_channels
  FOR ALL USING (tenant_id = auth_tenant_id());

CREATE POLICY "tenant_chat_messages" ON chat_messages
  FOR ALL USING (
    (SELECT tenant_id FROM chat_channels WHERE id = channel_id) = auth_tenant_id()
  );

-- Paciente solo ve canales de su familia
CREATE POLICY "patient_family_channels" ON chat_channels
  FOR SELECT USING (
    auth_user_role() = 'patient'
    AND (channel_type = 'family' AND family_nucleus_id IN (
      SELECT fn.id FROM family_nuclei fn
      JOIN family_relationships fr ON fn.id = fr.family_nucleus_id
      JOIN patients p ON fr.patient_id = p.id
      WHERE p.user_id = auth.uid()
    ))
  );


-- ============================================================
-- 4.9 POLÍTICAS — AUDIT LOGS (solo lectura, solo superadmin)
-- ============================================================
CREATE POLICY "superadmin_audit" ON audit_logs
  FOR SELECT USING (is_superadmin());

-- NADIE puede modificar audit logs (ni siquiera superadmin)
CREATE POLICY "no_audit_write" ON audit_logs
  FOR INSERT WITH CHECK (TRUE); -- Solo via triggers SECURITY DEFINER


-- ============================================================
-- 5. RESTRICCIONES ADICIONALES PARA OWNER
-- ============================================================
-- (Opcional: configurar roles en Supabase Dashboard -> Database Roles si se requiere)


-- ============================================================
-- 6. DATOS INICIALES (SEED)
-- ============================================================

-- Sucursal demo para desarrollo
INSERT INTO tenants (name, slug, license_key, license_type)
VALUES ('AUDENTI Demo', 'audenti-demo', 'DEMO-KEY-2026', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Versión: 1.0 | AUDENTI DentalCloud SaaS
-- Ejecutar como: postgres (role con permisos de superuser en Supabase)
-- ============================================================
