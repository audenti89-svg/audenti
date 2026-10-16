-- =========================================================
-- ESQUEMA COMPLETO DE AUDENTI (PRISMA SCHEMA PARA SUPABASE)
-- =========================================================

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_CLINIC', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING_HUMAN', 'RESOLVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SenderType" AS ENUM ('CLIENT', 'AI', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- 3. Tabla Patient
CREATE TABLE IF NOT EXISTS "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappLid" TEXT,
    "email" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- 4. Tabla Conversation
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- 5. Tabla Message
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderName" TEXT,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- 6. Tabla Service
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "priceFrom" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "requiresPriorValuation" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- 7. Tabla Appointment
CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "assignedStaffId" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'AI',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- 8. Tabla ClinicConfig
CREATE TABLE IF NOT EXISTS "ClinicConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Audenti',
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "aiAssistantName" TEXT NOT NULL DEFAULT 'Aura AI',
    "aiTone" TEXT NOT NULL DEFAULT 'Profesional, empático y clínico',
    "aiSystemPrompt" TEXT NOT NULL DEFAULT 'Eres Aura AI, la asistente virtual de la Dra. Aura Estudillo en Audenti...',
    "activeTheme" TEXT NOT NULL DEFAULT 'default',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicConfig_pkey" PRIMARY KEY ("id")
);

-- 9. Índices Únicos
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_phone_key" ON "Patient"("phone");

-- 10. Relaciones (Foreign Keys)
DO $$ BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_fkey" 
        FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" 
        FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" 
        FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" 
        FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" 
        FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_assignedStaffId_fkey" 
        FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
