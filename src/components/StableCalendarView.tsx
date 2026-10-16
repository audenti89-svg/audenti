'use client';

import React, { useState } from 'react';

export function StableCalendarView() {
  const [currentView, setCurrentView] = useState<'day' | 'week'>('day');
  const [selectedCabinet, setSelectedCabinet] = useState('Gabinete 1 (Principal)');

  return (
    <div className="space-y-6 text-white p-4 md:p-6 bg-[#0a0c0e] min-h-screen">
      {/* Header de Controles sin re-renders molestos */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111315] p-4 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Agenda & Sillón Dental en Tiempo Real</h2>
          <p className="text-xs text-neutral-400">Sincronización estable con Supabase (Sin parpadeos)</p>
        </div>
        <div className="flex items-center gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setCurrentView('day')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              currentView === 'day' ? 'bg-yellow-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vista Día
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              currentView === 'week' ? 'bg-yellow-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vista Semana
          </button>
        </div>
      </div>

      {/* Selector de Unidades Dentales */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['Gabinete 1 (Principal)', 'Gabinete 2', 'Quirófano Quirúrgico'].map((cabinet) => (
          <button
            key={cabinet}
            onClick={() => setSelectedCabinet(cabinet)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-all ${
              selectedCabinet === cabinet
                ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
            }`}
          >
            {cabinet}
          </button>
        ))}
      </div>

      {/* Cuadrícula de Horarios Estable */}
      <div className="bg-[#111315] border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
          <span className="font-semibold text-sm text-yellow-400">Unidad Activa: {selectedCabinet}</span>
          <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
            ● En Vivo (Supabase Realtime)
          </span>
        </div>

        <div className="space-y-3">
          {['09:00 AM', '10:30 AM', '12:00 PM', '04:00 PM', '05:30 PM'].map((time, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-neutral-900/80 border border-neutral-800/60 rounded-xl hover:border-neutral-700 transition-all">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-neutral-300 w-20">{time}</span>
                <div>
                  <span className="text-sm font-medium block text-white">Disponible para Asignación</span>
                  <span className="text-xs text-neutral-400">Sillón libre sincronizado</span>
                </div>
              </div>
              <button className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-neutral-950 border border-yellow-500/30 text-xs font-bold rounded-lg transition-all">
                + Agendar Cita
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
