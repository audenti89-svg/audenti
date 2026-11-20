'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  X, 
  Square, 
  Play, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  UserCheck, 
  Building2,
  Stethoscope
} from 'lucide-react';
import { 
  generateStaffSpeech, 
  playVoiceSpeech, 
  stopVoiceSpeech, 
  StaffSpeechContext 
} from '@/lib/assistantSpeech';

interface StaffVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: StaffSpeechContext;
}

export function StaffVoiceAssistantModal({ isOpen, onClose, context }: StaffVoiceAssistantModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechData, setSpeechData] = useState(() => generateStaffSpeech(context));
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSpeechData(generateStaffSpeech(context));
  }, [context.role, context.staffName, context.appointmentsCount, context.hasAllergyAlerts, context.branchName]);

  useEffect(() => {
    if (!isOpen) {
      stopVoiceSpeech();
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handleToggleVoice = () => {
    if (isPlaying) {
      if (stopRef.current) stopRef.current();
      stopVoiceSpeech();
      setIsPlaying(false);
    } else {
      const controller = playVoiceSpeech(speechData.script, {
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false)
      });
      stopRef.current = controller.stop;
    }
  };

  if (!isOpen) return null;

  const roleLabels: Record<string, { title: string; color: string }> = {
    socio: { title: 'Dra. Aura Estudillo (Dirección Médica & Socios)', color: 'text-amber-400' },
    trabajador: { title: 'Odontólogo de Turno', color: 'text-sky-400' },
    recepcion: { title: 'Recepción & Coordinación Administrativa', color: 'text-emerald-400' },
    pasante: { title: 'Asistente Clínico & Pasante Odontología', color: 'text-purple-400' }
  };

  const currentRole = roleLabels[context.role] || roleLabels.socio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-[#070b14] border border-amber-500/40 rounded-3xl shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Luces de fondo */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="relative z-10 flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center ${isPlaying ? 'ring-4 ring-amber-400/40 scale-105 transition-all' : ''}`}>
              <Bot className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Asistente Médica Audenti 24/7
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                  REPORTE EN VIVO
                </span>
              </div>
              <p className={`text-xs font-bold mt-0.5 ${currentRole.color}`}>
                {currentRole.title}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopVoiceSpeech();
              setIsPlaying(false);
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 transition-colors cursor-pointer"
            aria-label="Cerrar Asistente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Conversacional */}
        <div className="relative z-10 my-5 bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
              {speechData.greetingHeader}
            </span>
            {isPlaying && (
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                Voz activa reproduciendo...
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            &ldquo;{speechData.script}&rdquo;
          </p>

          {/* Resumen Clínico / Métricas */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Citas Hoy</span>
                <strong className="text-white font-bold">{context.appointmentsCount ?? 0} Pacientes</strong>
              </div>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Siguiente Cita</span>
                <strong className="text-white font-bold truncate max-w-[120px] block">
                  {context.nextAppointmentTime || '13:00 PM'} • {context.nextAppointmentPatient?.split(' ')[0] || 'Ricardo'}
                </strong>
              </div>
            </div>
          </div>

          {context.hasAllergyAlerts && (
            <div className="bg-rose-950/80 border border-rose-500/50 p-2.5 rounded-xl flex items-center gap-2.5 text-xs text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>NOM-004:</strong> {context.allergyPatientName || 'Sra. María de los Ángeles'} tiene alergia documentada a la <strong>Penicilina</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs transition-all shadow-lg cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 ring-2 ring-rose-400'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/25'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Pausar Parte Clínico</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-slate-950" />
                <span>Escuchar Parte Clínico Completo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              stopVoiceSpeech();
              setIsPlaying(false);
              onClose();
            }}
            className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
