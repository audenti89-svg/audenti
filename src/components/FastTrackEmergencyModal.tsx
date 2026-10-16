'use client';

import React, { useState } from 'react';

export function FastTrackEmergencyModal() {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to dispatch high-priority appointment and trigger sound/visual alert
    setSubmitted(true);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-red-950/40 border border-red-600/50 rounded-2xl text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
        <h3 className="text-xl font-bold tracking-tight text-red-200">Admisión de Urgencia (Fast-Track)</h3>
      </div>
      <p className="text-neutral-300 text-sm mb-6">
        ¿Dolor agudo o emergencia? Regístrese rápidamente. La Dra. Aura y recepción recibirán una alerta prioritaria inmediata.
      </p>

      {submitted ? (
        <div className="p-4 bg-red-900/40 border border-red-500/50 rounded-xl text-center space-y-2">
          <p className="font-semibold text-red-300">¡Urgencia registrada con éxito!</p>
          <p className="text-xs text-neutral-300">Un especialista saldrá a atenderle en recepción de inmediato.</p>
        </div>
      ) : (
        <form onSubmit={handleEmergencySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Nombre completo *</label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Ej. Carlos Mendoza"
              className="w-full p-3 bg-neutral-900/80 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Teléfono de contacto *</label>
            <input
              type="tel"
              required
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder="+52 55 0000 0000"
              className="w-full p-3 bg-neutral-900/80 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Descripción breve del dolor o síntoma</label>
            <textarea
              rows={2}
              value={emergencyNotes}
              onChange={(e) => setEmergencyNotes(e.target.value)}
              placeholder="Ej. Dolor punzante en muela superior derecha..."
              className="w-full p-3 bg-neutral-900/80 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/50"
          >
            Solicitar Atención Prioritaria
          </button>
        </form>
      )}
    </div>
  );
}
