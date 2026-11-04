'use client';

import React from 'react';
import { PatientPortalView } from '@/components/patient/PatientPortalView';

/**
 * PORTAL DEL PACIENTE - SECCIÓN DE PERFIL Y SUCURSAL ASIGNADA (Audenti 2027)
 * Ruta: /portal-paciente/perfil
 */
export default function PortalPacientePerfilRoute() {
  return <PatientPortalView initialTab="perfil" />;
}
