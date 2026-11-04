'use client';

import React from 'react';
import { PatientPortalView } from '@/components/patient/PatientPortalView';

/**
 * PORTAL DEL PACIENTE (Audenti 2027)
 * Ruta: /portal
 */
export default function PortalPage() {
  return <PatientPortalView initialTab="odontograma" />;
}
