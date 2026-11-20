'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Play, 
  Square, 
  HeartHandshake,
  Bot,
  UserCheck,
  Calendar
} from 'lucide-react';
import { 
  generatePatientSpeech, 
  playVoiceSpeech, 
  stopVoiceSpeech, 
  PatientSpeechContext, 
  PatientAgeCategory 
} from '@/lib/assistantSpeech';

interface AudentiVoiceAssistantCardProps {
  context: PatientSpeechContext;
  className?: string;
}

export function AudentiVoiceAssistantCard({ context, className = '' }: AudentiVoiceAssistantCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechData, setSpeechData] = useState(() => generatePatientSpeech(context));
  const [expanded, setExpanded] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);

  // Regenerar guion si cambia el contexto o el nombre
  useEffect(() => {
    setSpeechData(generatePatientSpeech(context));
  }, [context.fullName, context.birthDate, context.age, context.nextAppointment, context.allergies]);

  // Limpiar voz al desmontar
  useEffect(() => {
    return () => {
      stopVoiceSpeech();
      setIsPlaying(false);
    };
  }, []);

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

  // Badges informativos según categoría de edad
  const categoryConfig: Record<PatientAgeCategory, { label: string; badgeClass: string; icon: string }> = {
    senior: {
      label: `Atención con Máximo Respeto y Calidez (${speechData.age ? `${speechData.age} años` : 'Tercera Edad'})`,
      badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/40',
      icon: '🤍'
    },
    adulto: {
      label: `Atención Ejecutiva & Cordial (${speechData.age ? `${speechData.age} años` : 'Adulto'})`,
      badgeClass: 'bg-sky-400/15 text-sky-300 border-sky-400/40',
      icon: '👔'
    },
    joven: {
      label: `Atención Dinámica & Directa (${speechData.age ? `${speechData.age} años` : 'Joven'})`,
      badgeClass: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40',
      icon: '⚡'
    },
    infantil: {
      label: `Modo Sonrisas & Superhéroe (${speechData.age ? `${speechData.age} años` : 'Pediátrico'})`,
      badgeClass: 'bg-pink-400/15 text-pink-300 border-pink-400/40',
      icon: '🎈'
    }
  };

  const currentCategory = categoryConfig[speechData.category] || categoryConfig.adulto;

  return (
    <section 
      aria-label="Asistente Conversacional Audenti 24/7"
      className={`relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-[#0B1020] to-[#070b14] p-5 sm:p-6 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Resplandor ambiental de IA */}
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        {/* Cabecera del Asistente */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20 ${isPlaying ? 'ring-4 ring-amber-400/50 scale-105 transition-all' : ''}`}>
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            {/* Indicador de pulso activo 24/7 */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-950 ${isPlaying ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Asistente Audenti 24/7</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">VOZ IA</span>
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentCategory.badgeClass}`}>
                {currentCategory.icon} {currentCategory.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Plática interactiva adaptada con calidez humana según tu edad y próximas consultas.
            </p>
          </div>
        </div>

        {/* Botón Principal para Escuchar la Plática de la IA */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all shadow-lg cursor-pointer w-full sm:w-auto ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 scale-102 ring-2 ring-rose-400'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/25 active:scale-95'
            }`}
            title={isPlaying ? 'Pausar plática' : 'Escuchar a tu Asistente Audenti en voz alta'}
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Pausar Voz</span>
                {/* Animación de onda sonora */}
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-slate-950" />
                <span>Escuchar Plática de la IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Burbuja de Diálogo Conversacional (Subtítulos en Vivo) */}
      <div className="relative z-10 mt-4 bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-800 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                {speechData.greetingHeader}
              </span>
              {isPlaying && (
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                  <Volume2 className="w-3 h-3" /> Hablando en vivo...
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              &ldquo;{speechData.script}&rdquo;
            </p>

            {/* Fila de Accesos Rápidos según Cita */}
            {context.nextAppointment && (
              <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300 border-t border-slate-800/80">
                <span className="inline-flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-lg text-amber-300 font-bold">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  Cita: {context.nextAppointment.time || '13:00 PM'}
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-lg text-slate-200">
                  <Clock className="w-3 h-3 text-sky-400" />
                  Sede: {context.nextAppointment.branch || 'Chalma de Guadalupe'}
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/90 px-2.5 py-1 rounded-lg text-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Dra. Aura Estudillo
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
