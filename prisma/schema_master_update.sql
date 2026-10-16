-- =========================================================================
-- ESQUEMA MAESTRO DE AUDENTI (ACTUALIZADO: REFERIDOS, TRUEQUES Y DEPARTAMENTOS)
-- =========================================================================

-- 1. Enums Adicionales
DO $$ BEGIN
    CREATE TYPE "StaffDepartment" AS ENUM ('RECEPTION', 'DENTISTS', 'ANESTHESIA', 'MANAGEMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AcquisitionSource" AS ENUM ('QR_CODE', 'WHATSAPP_DIRECT', 'SOCIAL_FACEBOOK', 'SOCIAL_INSTAGRAM', 'SOCIAL_TIKTOK', 'SOCIAL_YOUTUBE', 'WEB_ORGANIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Modificaciones a User (departamento de staff)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" "StaffDepartment" NOT NULL DEFAULT 'RECEPTION';

-- 3. Tabla FamilyGroup (Clústeres familiares)
CREATE TABLE IF NOT EXISTS "FamilyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);

-- 4. Modificaciones a Patient (Árbol de Referidos, Grupos Familiares, Canal de Adquisición)
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "acquisitionSource" "AcquisitionSource" NOT NULL DEFAULT 'WEB_ORGANIC';
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "familyGroupId" TEXT;

-- 5. Tabla InternalNote (Notas Clínicas y Administrativas del Paciente)
CREATE TABLE IF NOT EXISTS "InternalNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- 6. Tabla InternalMessage (Comunicación Segmentada de Personal)
CREATE TABLE IF NOT EXISTS "InternalMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "targetDept" "StaffDepartment",
    "targetUserId" TEXT,
    "message" TEXT NOT NULL,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalMessage_pkey" PRIMARY KEY ("id")
);

-- 7. Modificaciones a Service (standardPrice)
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "standardPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- 8. Modificaciones a Appointment (isEmergency)
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "isEmergency" BOOLEAN NOT NULL DEFAULT false;

-- 9. Tabla FinancialLedger (Auditoría Contable, Ingresos y Trueques/Barter)
CREATE TABLE IF NOT EXISTS "FinancialLedger" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isBarter" BOOLEAN NOT NULL DEFAULT false,
    "concept" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLedger_pkey" PRIMARY KEY ("id")
);

-- 10. Foreign Keys y Restricciones
DO $$ BEGIN
    ALTER TABLE "Patient" ADD CONSTRAINT "Patient_referredById_fkey" 
        FOREIGN KEY ("referredById") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Patient" ADD CONSTRAINT "Patient_familyGroupId_fkey" 
        FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_patientId_fkey" 
        FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "InternalMessage" ADD CONSTRAINT "InternalMessage_senderId_fkey" 
        FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FinancialLedger" ADD CONSTRAINT "FinancialLedger_patientId_fkey" 
        FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
