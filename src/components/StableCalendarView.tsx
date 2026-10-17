'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, Building2, User, Stethoscope, RefreshCw, Plus } from 'lucide-react';
import { useNotificationSound } from '@/hooks/useNotificationSound';

import { createClient } from '@/utils/supabase/client';

export function StableCalendarView() {
  const [currentView, setCurrentView] = useState<'day' | 'week'>('day');
  const [selectedCabinet, setSelectedCabinet] = useState('Gabinete 1 (Principal)');
  const [liveSlots, setLiveSlots] = useState<Array<{ time: string; patient?: string; status: 'free' | 'busy'; treatment?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { playTone } = useNotificationSound();

  const CABINETS = [
    { id: 'cab-1', name: 'Gabinete 1 (Principal)', desc: 'Sillón Director Dra. Aura Estudillo', badge: 'Activo' },
    { id: 'cab-2', name: 'Gabinete 2', desc: 'Ortodoncia & Profilaxis Ultrasónica', badge: 'Operativo' },
    { id: 'cab-3', name: 'Quirófano Quirúrgico', desc: 'Implantología & Cirugía Maxilofacial', badge: 'Esterilizado' }
  ];

  const fetchCabinetStatus = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('appointments')
        .select('id, start_time, treatment_type, status, notes, patients(full_name)');
      
      const appointments = data || [];
      const times = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '04:00 PM', '05:30 PM', '07:00 PM'];
      const mapped = times.map((t) => {
        const hour = t.substring(0, 2);
        const matching = appointments.find((a: any) => {
          const timeStr = a.start_time ? new Date(a.start_time).toLocaleTimeString('es-MX', { hour: '2-digit' }) : '';
          return timeStr.startsWith(hour);
        });
          const patName = Array.isArray((matching as any).patients)
            ? (matching as any).patients[0]?.full_name
            : (matching as any).patients?.full_name;
          return {
            time: t,
            patient: matching ? (patName || 'Paciente en Turno') : undefined,
            treatment: matching ? (matching.treatment_type || 'Tratamiento Clínico') : undefined,
            status: matching ? ('busy' as const) : ('free' as const)
          };
      });
      setLiveSlots(mapped);
    } catch (e) {
      console.warn('Error fetching cabinet status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCabinetStatus();
    const interval = setInterval(fetchCabinetStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedCabinet]);

  return (
    <div className="space-y-6">
      {/* Header de Gabinete Estable */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Matriz de Sillones Dentales
            </span>
            <span className="text-slate-400 text-xs font-semibold">Zero-Flickering Realtime</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Monitor Clínico de Unidades Dentales</h2>
          <p className="text-xs text-slate-500 mt-0.5">Disponibilidad en vivo y asignación de tiempos por sillón.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchCabinetStatus(); playTone('message'); }}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refrescar estado de sillones"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setCurrentView('day')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                currentView === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Turno Día
            </button>
            <button
              onClick={() => setCurrentView('week')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                currentView === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Unidades Dentales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CABINETS.map((cab) => {
          const isSelected = selectedCabinet === cab.name;
          return (
            <button
              key={cab.id}
              onClick={() => { setSelectedCabinet(cab.name); playTone('message'); }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${isSelected ? 'text-amber-950' : 'text-slate-900'}`}>
                  {cab.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {cab.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">{cab.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Cuadrícula Horaria Estable */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span className="font-bold text-xs text-slate-900">Unidad Seleccionada: {selectedCabinet}</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronizado Supabase Realtime
          </span>
        </div>

        <div className="space-y-2.5">
          {liveSlots.map((slot, idx) => (
            <div
              key={idx}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                slot.status === 'busy'
                  ? 'bg-amber-50/50 border-amber-200/90 text-amber-950'
                  : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5 mb-2 sm:mb-0">
                <span className="text-xs font-mono font-bold text-slate-700 w-20">{slot.time}</span>
                <div>
                  {slot.status === 'busy' ? (
                    <>
                      <span className="text-xs font-bold text-slate-900 block">{slot.patient}</span>
                      <span className="text-[11px] text-amber-800 font-medium">{slot.treatment || 'Consulta Especializada'}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-slate-700 block">Sillón Libre &amp; Esterilizado</span>
                      <span className="text-[11px] text-slate-400">Disponible para asignación inmediata</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                {slot.status === 'busy' ? (
                  <span className="inline-flex px-3 py-1 rounded-lg bg-amber-200 text-amber-900 text-xs font-bold">
                    Cita en Proceso
                  </span>
                ) : (
                  <span className="inline-flex px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold">
                    Disponible
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
