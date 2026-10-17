'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, Clock, Phone, ShieldAlert, Sparkles, User, X } from 'lucide-react';

import { createAppointmentAction } from '@/actions/appointments';

interface FastTrackEmergencyModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function FastTrackEmergencyModal({ isOpen = true, onClose }: FastTrackEmergencyModalProps) {
  const [mounted, setMounted] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [painLevel, setPainLevel] = useState<'severo' | 'critico' | 'moderado'>('severo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createAppointmentAction({
        patient_name: patientName,
        patient_phone: patientPhone,
        treatment: `Urgencia Odontológica 24/7 (Nivel: ${painLevel.toUpperCase()})`,
        status: 'pending_review',
        notes: emergencyNotes || 'Urgencia dental inmediata reportada desde Triage Fast-Track'
      });
      if (res.success) {
        setSubmitted(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('audenti_emergency_refresh'));
          window.dispatchEvent(new CustomEvent('audenti_appointment_refresh'));
        }
      }
    } catch (err) {
      console.error('Error submitting fast-track emergency:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop clicable para cerrar */}
      <div 
        className="absolute inset-0 bg-transparent" 
        onClick={onClose} 
      />

      <div className="w-full max-w-lg bg-slate-900 border border-red-500/50 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative z-10 overflow-hidden">
        {/* Glow ambiental de emergencia */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">
                Triage Clínico Prioritario
              </span>
              <h3 className="text-xl font-bold tracking-tight text-white">
                Admisión de Urgencia Inmediata
              </h3>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-slate-300 text-xs mb-6 relative z-10 leading-relaxed">
          ¿Dolor agudo o traumatismo? Al registrarte, la <strong>Dra. Aura Estudillo</strong> y el equipo de recepción en turno recibirán una alerta acústica y visual con prioridad máxima en sus pantallas.
        </p>

        {submitted ? (
          <div className="p-6 bg-red-950/60 border border-red-500/60 rounded-2xl text-center space-y-3 relative z-10">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-base">¡Alerta Prioritaria Notificada!</h4>
            <p className="text-xs text-slate-300">
              La notificación fue enviada a la terminal del consultorio. El personal te atenderá de forma inmediata.
            </p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
              >
                Cerrar Ventana
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleEmergencySubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Nombre del Paciente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Ej. Juan Carlos Méndez"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+52 55 2242 7769"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nivel de Dolor / Urgencia
                </label>
                <select
                  value={painLevel}
                  onChange={(e) => setPainLevel(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  <option value="severo">Dolor Severo (Inmediato)</option>
                  <option value="critico">Crítico (Trauma / Hemorragia)</option>
                  <option value="moderado">Moderado (Tolerable)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Síntoma o Zona Afectada
              </label>
              <textarea
                rows={2}
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
                placeholder="Ej. Dolor punzante e inflamación en molar superior derecho..."
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  'Notificando al Sillón...'
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Emitir Alerta de Triage Inmediata
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
