'use client';

import React from 'react';
import { PatientPortalView } from '@/components/patient/PatientPortalView';

/**
 * PORTAL DEL PACIENTE - SECCIÓN DE CITAS Y CALENDARIO (Audenti 2027)
 * Ruta: /portal-paciente/citas
 */
export default function PortalPacienteCitasRoute() {
  return <PatientPortalView initialTab="citas" />;
}
