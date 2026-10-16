export type StaffDepartment = 'RECEPTION' | 'DENTISTS' | 'ANESTHESIA' | 'MANAGEMENT';

export interface UserPermissions {
  canManageAgenda: boolean;
  canViewFinancials: boolean;
  canEditMedicalRecords: boolean;
  canSendBroadCastMessages: boolean;
  canAccessTechnicalSettings: boolean;
  canManageInventory: boolean;
  canAuditCommissions: boolean;
  departmentLabel: string;
}

/**
 * Resuelve y aprovisiona dinámicamente los permisos de interfaz y acceso
 * según el departamento clínico asignado al empleado.
 * Diseñado para automatizar la incorporación de nuevos dentistas, recepcionistas y especialistas.
 */
export function resolveAutomaticRolePermissions(department: StaffDepartment | string): UserPermissions {
  switch (department) {
    case 'MANAGEMENT':
      return {
        canManageAgenda: true,
        canViewFinancials: true,
        canEditMedicalRecords: true,
        canSendBroadCastMessages: true,
        canAccessTechnicalSettings: true,
        canManageInventory: true,
        canAuditCommissions: true,
        departmentLabel: 'Dirección & Gerencia',
      };

    case 'DENTISTS':
      return {
        canManageAgenda: true,
        canViewFinancials: false,
        canEditMedicalRecords: true,
        canSendBroadCastMessages: false,
        canAccessTechnicalSettings: false,
        canManageInventory: true,
        canAuditCommissions: true,
        departmentLabel: 'Cuerpo Médico & Odontólogos',
      };

    case 'ANESTHESIA':
      return {
        canManageAgenda: true,
        canViewFinancials: false,
        canEditMedicalRecords: true,
        canSendBroadCastMessages: false,
        canAccessTechnicalSettings: false,
        canManageInventory: true,
        canAuditCommissions: false,
        departmentLabel: 'Especialistas en Anestesiología',
      };

    case 'RECEPTION':
    default:
      return {
        canManageAgenda: true,
        canViewFinancials: false,
        canEditMedicalRecords: false,
        canSendBroadCastMessages: true,
        canAccessTechnicalSettings: false,
        canManageInventory: false,
        canAuditCommissions: false,
        departmentLabel: 'Recepción & Atención al Paciente',
      };
  }
}
