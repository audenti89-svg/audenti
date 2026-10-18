'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, X, Volume2, Sparkles, User, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export interface VoiceCallAlert {
  id: string
  patientName: string
  patientId: string
  phone?: string
  status: 'active' | 'ended'
  startedAt: string
  endedAt?: string
  summary?: string
}

export function DoctorVoiceCallAlertBanner() {
  const [activeCall, setActiveCall] = useState<VoiceCallAlert | null>(null)
  const { playTone } = useNotificationSound()
  const supabase = createClient()

  useEffect(() => {
    // 1. Escuchar eventos broadcast en chat_omnichannel_sync y doctor_voice_alerts
    const voiceChannel = supabase
      .channel('chat_omnichannel_sync')
      .on('broadcast', { event: 'voice_call_event' }, ({ payload }) => {
        if (!payload) return
        if (payload.status === 'active') {
          playTone('arrival')
          setActiveCall({
            id: payload.id || `voice-${Date.now()}`,
            patientName: payload.patientName || 'Ricardo Sánchez',
            patientId: payload.patientId || '',
            phone: payload.phone,
            status: 'active',
            startedAt: payload.timestamp || 'Ahora'
          })
        } else if (payload.status === 'ended') {
          playTone('message')
          setActiveCall(prev => {
            if (!prev) return null
            return {
              ...prev,
              status: 'ended',
              endedAt: payload.timestamp || 'Ahora',
              summary: payload.summary || 'Llamada de voz con Aura IA concluida exitosamente.'
            }
          })
          // Auto ocultar después de 8 segundos si finalizó
          setTimeout(() => {
            setActiveCall(null)
          }, 8000)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(voiceChannel)
    }
  }, [playTone, supabase])

  if (!activeCall) return null

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all ${
        activeCall.status === 'active'
          ? 'bg-[#0f172a]/95 border-amber-400/80 text-white shadow-amber-500/20'
          : 'bg-[#0f172a]/95 border-emerald-400/80 text-white shadow-emerald-500/20'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              activeCall.status === 'active'
                ? 'bg-amber-400 text-slate-950 animate-pulse'
                : 'bg-emerald-500 text-slate-950'
            }`}>
              {activeCall.status === 'active' ? (
                <Phone className="w-6 h-6 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  activeCall.status === 'active'
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  {activeCall.status === 'active' ? '📞 Llamada de Voz Activa' : '✓ Llamada Finalizada'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeCall.startedAt}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">
                {activeCall.patientName}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeCall.status === 'active'
                  ? 'Hablando en tiempo real con Aura IA (Asistente de Voz)...'
                  : 'Transcripción registrada en el historial clínico.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveCall(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Descartar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeCall.summary && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-amber-200/90">
            <span className="font-bold text-white block mb-0.5">Resumen de la llamada:</span>
            {activeCall.summary}
          </div>
        )}
      </div>
    </div>
  )
}
