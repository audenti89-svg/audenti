/**
 * ADMINISTRADORES Y DUEÑOS DEL SISTEMA (Audenti 2027)
 * Arquitecto: Ricardo Sánchez
 * Dirección Médica: Dra. Aura Estudillo
 */

export const ADMIN_EMAILS = [
  'audenti89@gmail.com',
  'rricardos76@gmail.com',
  'pruevaz2022@gmail.com',
  'ricardo@audenti.com'
];

export const INTERNAL_ROLES = [
  'owner',
  'admin',
  'director',
  'doctor',
  'socio',
  'trabajador',
  'pasante',
  'estudiante',
  'superadmin'
];

export function isSystemAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(clean) || clean.endsWith('@audenti.com');
}

export function isInternalUser(email?: string | null, role?: string | null): boolean {
  if (isSystemAdminEmail(email)) return true;
  if (!role) return false;
  return INTERNAL_ROLES.includes(role.toLowerCase().trim());
}
