/**
 * CONFIGURACIÓN DE VISIBILIDAD DE ROLES Y MATRIZ DE RECURSOS (Audenti 2027)
 * Proyecto: Audenti Cloud Pro
 * Control de acceso granular para interfaz de usuario y navegación.
 */

export interface UIVisibilityRules {
  show_financial_summary: boolean;
  show_doctor_notes_internal: boolean;
  show_global_branch_selector: boolean;
  show_ai_voice_banners: boolean;
  show_patient_own_records_only: boolean;
  allow_download_prescription_pdf: boolean;
}

export interface RoleVisibilityConfig {
  role: string;
  allowed_routes: string[];
  blocked_routes: string[];
  ui_visibility_rules: UIVisibilityRules;
}

export const PATIENT_VISIBILITY_CONFIG: RoleVisibilityConfig = {
  role: "patient",
  allowed_routes: [
    "/portal-paciente",
    "/portal-paciente/citas",
    "/portal-paciente/recetas",
    "/portal-paciente/perfil"
  ],
  blocked_routes: [
    "/dashboard",
    "/admin",
    "/api/admin/*"
  ],
  ui_visibility_rules: {
    show_financial_summary: false,
    show_doctor_notes_internal: false,
    show_global_branch_selector: false,
    show_ai_voice_banners: false,
    show_patient_own_records_only: true,
    allow_download_prescription_pdf: true
  }
};

export const STAFF_VISIBILITY_CONFIG: RoleVisibilityConfig = {
  role: "staff",
  allowed_routes: [
    "/dashboard",
    "/dashboard/*",
    "/admin/*"
  ],
  blocked_routes: [
    "/portal-paciente"
  ],
  ui_visibility_rules: {
    show_financial_summary: true,
    show_doctor_notes_internal: true,
    show_global_branch_selector: true,
    show_ai_voice_banners: true,
    show_patient_own_records_only: false,
    allow_download_prescription_pdf: true
  }
};

/**
 * Obtiene las reglas de visibilidad de UI para un rol determinado.
 */
export function getUIVisibilityRules(role?: string | null): UIVisibilityRules {
  if (role?.toLowerCase().trim() === 'patient') {
    return PATIENT_VISIBILITY_CONFIG.ui_visibility_rules;
  }
  return STAFF_VISIBILITY_CONFIG.ui_visibility_rules;
}

/**
 * Verifica si una ruta está bloqueada para un rol específico.
 */
export function isRouteBlockedForRole(role: string | null | undefined, pathname: string): boolean {
  const isPatient = (role || '').toLowerCase().trim() === 'patient';
  if (!isPatient) return false;

  const blocked = PATIENT_VISIBILITY_CONFIG.blocked_routes;
  return blocked.some((pattern) => {
    if (pattern.endsWith('/*')) {
      const base = pattern.replace('/*', '');
      return pathname === base || pathname.startsWith(base + '/');
    }
    return pathname === pattern || pathname.startsWith(pattern + '/');
  });
}

/**
 * Verifica si una ruta está permitida para un rol específico.
 */
export function isRouteAllowedForRole(role: string | null | undefined, pathname: string): boolean {
  const isPatient = (role || '').toLowerCase().trim() === 'patient';
  if (!isPatient) return true;

  const allowed = PATIENT_VISIBILITY_CONFIG.allowed_routes;
  return allowed.some((route) => pathname === route || pathname.startsWith(route + '/'));
}
