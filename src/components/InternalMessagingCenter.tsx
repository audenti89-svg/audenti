'use client';

import React, { useState } from 'react';
import { Send, AlertTriangle, ShieldCheck, CheckCircle2, Users, Building, Stethoscope, Sparkles } from 'lucide-react';

export function InternalMessagingCenter() {
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [messageContent, setMessageContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; dept: string; text: string; urgent: boolean; time: string }>>([
    {
      id: '1',
      dept: 'RECEPTION',
      text: 'Favor de priorizar la confirmación de citas para mañana en Sede Balbuena.',
      urgent: false,
      time: 'Hoy 10:15 AM'
    },
    {
      id: '2',
      dept: 'DENTISTS',
      text: 'Recordatorio: Los insumos de ortodoncia invisible ya se encuentran disponibles en Gabinete 1.',
      urgent: false,
      time: 'Hoy 11:30 AM'
    }
  ]);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    const newNotice = {
      id: Date.now().toString(),
      dept: selectedDept,
      text: messageContent.trim(),
      urgent: isUrgent,
      time: 'Ahora'
    };

    setHistory([newNotice, ...history]);
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
    setMessageContent('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
                Directivas Clínicas Segmentadas
              </span>
              <span className="text-slate-400 text-xs font-semibold">Exclusivo Dra. Aura Estudillo</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Emisión de Comunicados al Personal</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Envíe directrices, avisos operacionales y alertas de bioseguridad a cada departamento clínico.
            </p>
          </div>
        </div>

        {sentSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ¡Comunicado transmitido con éxito al sector seleccionado!
          </div>
        )}

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Departamento o Especialidad Destino
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
              >
                <option value="ALL">Todo el personal activo (Circular General)</option>
                <option value="RECEPTION">Recepción &amp; Admisión</option>
                <option value="DENTISTS">Odontólogos &amp; Cirujanos Dentistas</option>
                <option value="ANESTHESIA">Especialistas en Anestesiología</option>
                <option value="MANAGEMENT">Dirección &amp; Administración General</option>
              </select>
            </div>

            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 px-3.5 py-2.5 rounded-xl border border-slate-200/80 w-full transition">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${isUrgent ? 'text-rose-700' : 'text-slate-700'}`}>
                    Marcar como Alerta Urgente Prioritaria
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Cuerpo del Mensaje o Directriz Médica
            </label>
            <textarea
              rows={3}
              required
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Escriba aquí la instrucción o directriz para el equipo seleccionado..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Transmitir Mensaje al Personal
            </button>
          </div>
        </form>
      </div>

      {/* Historial de Comunicados Recientes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Historial de Circulares Internas</h4>
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.urgent
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : 'bg-slate-50 border-slate-200/70 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  item.urgent ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  Destino: {item.dept}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{item.time}</span>
              </div>
              <p className="text-xs leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
