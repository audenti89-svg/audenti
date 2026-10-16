'use client';

import React, { useState } from 'react';

export function InternalMessagingCenter() {
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [messageContent, setMessageContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
    setMessageContent('');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-white shadow-xl">
      <h3 className="text-xl font-bold tracking-tight mb-1">Centro de Comunicación Interna</h3>
      <p className="text-sm text-neutral-400 mb-6">Envíe avisos y directrices segmentadas por especialidad o departamento clínico.</p>

      {sentSuccess && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 text-sm text-center">
          ¡Comunicado enviado exitosamente al sector seleccionado!
        </div>
      )}

      <form onSubmit={handleBroadcast} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Seleccionar Destino / Departamento</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
            >
              <option value="ALL">Todo el personal activo (Global)</option>
              <option value="RECEPTION">Recepción y Admisión</option>
              <option value="DENTISTS">Dentistas / Odontólogos</option>
              <option value="ANESTHESIA">Especialistas en Anestesia</option>
              <option value="MANAGEMENT">Administración General</option>
            </select>
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 text-yellow-500 focus:ring-yellow-500 bg-neutral-950"
              />
              <span className="text-sm font-medium text-yellow-400">Marcar como Alerta Urgente</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1">Mensaje o Comunicado</label>
          <textarea
            rows={4}
            required
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Escriba la instrucción para el equipo..."
            className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-yellow-500"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/10"
        >
          Transmitir Mensaje al Personal
        </button>
      </form>
    </div>
  );
}
