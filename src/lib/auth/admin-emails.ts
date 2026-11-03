/**
 * CONTROL DE IDENTIDADES Y ROLES (Audenti 2027)
 * Dirección Médica: Dra. Aura Estudillo (audenti89@gmail.com)
 * Arquitecto: Ricardo Sánchez
 */

// Único correo con facultades directivas máximas de la clínica
export const ADMIN_EMAILS = [
  'audenti89@gmail.com',
];

export const INTERNAL_ROLES = [
  'owner',
  'admin',
  'director',
  'doctor',
  'socio',
  'partner',
  'trabajador',
  'pasante',
  'intern',
  'estudiante',
  'superadmin',
  'receptionist'
];

export function isSystemAdminEmail(email?: string | null, role?: string | null): boolean {
  if (!email) return false;
  if (role && role.toLowerCase().trim() === 'patient') return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean);
}

export function isInternalUser(email?: string | null, role?: string | null): boolean {
  if (role && role.toLowerCase().trim() === 'patient') return false;
  if (isSystemAdminEmail(email, role)) return true;
  if (!role) return false;
  return INTERNAL_ROLES.includes(role.toLowerCase().trim());
}
