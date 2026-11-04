'use client';

import React from 'react';
import { PatientPortalView } from '@/components/patient/PatientPortalView';

/**
 * PORTAL DEL PACIENTE - SECCIÓN DE RECETAS MÉDICAS DIGITALES (Audenti 2027)
 * Ruta: /portal-paciente/recetas
 */
export default function PortalPacienteRecetasRoute() {
  return <PatientPortalView initialTab="recetas" />;
}
