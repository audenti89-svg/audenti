'use client';

import React from 'react';
import PortalPage from '@/app/portal/page';

/**
 * PORTAL DEL PACIENTE CANÓNICO (Audenti 2027)
 * Ruta: /portal-paciente
 * Vista exclusiva y segura para pacientes:
 * - Odontograma 3D Personal
 * - Bitácora de Tratamientos Clínicos (Sin precios ni datos administrativos)
 * - Historial y Agendamiento de Citas
 * - Recetas Médicas Digitales Descargables
 * - Sucursal Asignada (Balbuena o Chalma)
 */
export default function PortalPacienteRoute() {
  return <PortalPage />;
}
