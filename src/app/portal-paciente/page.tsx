'use client';

import React from 'react';
import { PatientPortalView } from '@/components/patient/PatientPortalView';

/**
 * PORTAL DEL PACIENTE CANÓNICO (Audenti 2027)
 * Ruta: /portal-paciente
 * Vista exclusiva y segura para pacientes:
 * - Odontograma 3D Personal
 * - Bitácora de Tratamientos Clínicos (Sin precios ni datos administrativos)
 * - Calendario y Recordatorios Interactivos
 * - Recetas Médicas Digitales Descargables
 * - Sucursal Asignada (Balbuena o Chalma)
 */
export default function PortalPacienteRoute() {
  return <PatientPortalView initialTab="odontograma" />;
}
