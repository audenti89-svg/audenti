-- -----------------------------------------------------------------------------
-- TABLE: security_logs
-- DESCRIPTION: Registra todos los intentos de ataque y alertas detectadas por el Security Guard.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT,
    endpoint TEXT,
    payload TEXT,
    threat_level TEXT CHECK (threat_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    reason TEXT,
    detected_pattern TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_taken TEXT DEFAULT 'BLOCKED'
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo los administradores pueden ver los logs de seguridad
CREATE POLICY "Admins can view security logs"
ON public.security_logs
FOR SELECT
USING (
    -- Aquí deberías tener una columna 'role' en tu tabla de perfiles o una tabla de admins
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Política: El sistema (Service Role) puede insertar logs
CREATE POLICY "System can insert security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (true);
