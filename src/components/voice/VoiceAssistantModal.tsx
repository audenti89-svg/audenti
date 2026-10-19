'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useConversation, useAgentMessages } from '@fishaudio/agent-react'
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  Sparkles,
  X,
  Radio,
  Globe,
  AlertCircle
} from 'lucide-react'

export interface VoiceAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  patientName?: string
  patientPhone?: string
  patientId?: string
}

export function VoiceAssistantModal({
  isOpen,
  onClose,
  patientName = 'Paciente Consulta',
  patientPhone = '',
  patientId
}: VoiceAssistantModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>('es')
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [callDuration, setCallDuration] = useState<number>(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)

  const agentId = 'f6e132fe196a4319b788fa1acff4ddcf'

  const {
    session,
    status,
    mode,
    isSpeaking,
    micMuted,
    startSession,
    endSession,
    setMicMuted
  } = useConversation({
    agentId,
    language: selectedLanguage
  })

  const transcripts = useAgentMessages(session)

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting' || status === 'reconnecting'
  const isMicActiveAndListening = isConnected && !micMuted && (mode === 'listening' || !isSpeaking)

  // Medidor de nivel de audio y visualización de micro
  useEffect(() => {
    if (isMicActiveAndListening && micStreamRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtx()
        audioContextRef.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        analyserRef.current = analyser

        const source = ctx.createMediaStreamSource(micStreamRef.current)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateLevel = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
          animationFrameRef.current = requestAnimationFrame(updateLevel)
        }

        updateLevel()
      } catch (e) {
        console.warn('Audio metering warning:', e)
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      setAudioLevel(0)
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [isMicActiveAndListening])

  // Temporizador de duración de llamada
  useEffect(() => {
    if (isConnected) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
      setCallDuration(0)
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    }
  }, [isConnected])

  const releaseMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }
  }

  // Notificar backend y persistir transcripción con garantía obligatoria antes de cerrar
  const handleEndCall = async () => {
    releaseMicStream()
    const formattedDialogue = (transcripts || []).map((t: any) => ({
      role: (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      text: t.text || ''
    }))
    const fullTranscriptSpeakers = formattedDialogue.map((t: any) => ({
      speaker: t.role === 'user' ? patientName : 'Aura AI',
      text: t.text
    }))
    const summaryText = formattedDialogue.length > 0
      ? formattedDialogue.map((t: any) => `${t.role === 'user' ? patientName : 'Aura AI'}: ${t.text}`).slice(-4).join(' | ')
      : 'Llamada de voz de consulta finalizada.'

    await endSession()

    const callPayload = {
      patientId,
      patient_name: patientName,
      patientName,
      phone: patientPhone,
      patientPhone,
      reason: 'Solicitud de Cita Médica por Voz',
      consultationReason: 'Solicitud de Cita Médica por Voz',
      urgency_level: 'Urgente',
      urgencyLevel: 'Urgente',
      durationSeconds: callDuration || 1,
      transcription: formattedDialogue.map((d: any) => `${d.role === 'user' ? patientName : 'Aura AI'}: ${d.text}`).join('\n'),
      dialogue: formattedDialogue,
      full_transcript: fullTranscriptSpeakers,
      summary: summaryText,
      timestamp: new Date().toISOString()
    }

    // Persistir de forma síncrona en Supabase antes de cerrar modal
    try {
      const res = await fetch('/api/webhook/call-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callPayload)
      })
      if (!res.ok) {
        throw new Error(`Error en webhook: ${res.statusText}`)
      }
    } catch (e) {
      console.warn('[VoiceAssistantModal]: Error o demora en webhook, guardando en localStorage para reintento automático:', e)
      try {
        const pending = JSON.parse(localStorage.getItem('audenti_pending_transcripts') || '[]')
        pending.push(callPayload)
        localStorage.setItem('audenti_pending_transcripts', JSON.stringify(pending))
      } catch {}
    }

    onClose()
  }

  // Reintento automático de transcripciones pendientes en localStorage
  useEffect(() => {
    const retryPending = async () => {
      try {
        const pendingStr = localStorage.getItem('audenti_pending_transcripts')
        if (!pendingStr) return
        const pending = JSON.parse(pendingStr)
        if (Array.isArray(pending) && pending.length > 0) {
          const remaining = []
          for (const item of pending) {
            try {
              const res = await fetch('/api/webhook/call-transcription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              })
              if (!res.ok) remaining.push(item)
            } catch {
              remaining.push(item)
            }
          }
          if (remaining.length > 0) {
            localStorage.setItem('audenti_pending_transcripts', JSON.stringify(remaining))
          } else {
            localStorage.removeItem('audenti_pending_transcripts')
          }
        }
      } catch {}
    }
    retryPending()
  }, [])

  // Listener de beforeunload para llamadas que terminen abruptamente al cerrar o recargar ventana
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ((isConnected || isSpeaking) && transcripts && transcripts.length > 0) {
        try {
          const formattedDialogue = transcripts.map((t: any) => ({
            role: (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            text: t.text || ''
          }))
          const fullTranscriptSpeakers = formattedDialogue.map((t: any) => ({
            speaker: t.role === 'user' ? patientName : 'Aura AI',
            text: t.text
          }))
          const abruptPayload = {
            patientId,
            patient_name: patientName,
            patientName,
            phone: patientPhone,
            patientPhone,
            reason: 'Llamada de Voz (Cierre Abrupto)',
            consultationReason: 'Solicitud de Cita Médica por Voz',
            urgency_level: 'Urgente',
            urgencyLevel: 'Urgente',
            durationSeconds: callDuration || 1,
            transcription: formattedDialogue.map((d: any) => `${d.role === 'user' ? patientName : 'Aura AI'}: ${d.text}`).join('\n'),
            dialogue: formattedDialogue,
            full_transcript: fullTranscriptSpeakers,
            summary: formattedDialogue.map((t: any) => `${t.role === 'user' ? patientName : 'Aura AI'}: ${t.text}`).slice(-4).join(' | ') || 'Llamada interrumpida por cierre de ventana.',
            timestamp: new Date().toISOString()
          }

          // Guardar en localStorage para reenvío garantizado
          const pending = JSON.parse(localStorage.getItem('audenti_pending_transcripts') || '[]')
          pending.push(abruptPayload)
          localStorage.setItem('audenti_pending_transcripts', JSON.stringify(pending))

          // Intentar enviar mediante navigator.sendBeacon
          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(abruptPayload)], { type: 'application/json' })
            navigator.sendBeacon('/api/webhook/call-transcription', blob)
          }
        } catch {}
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isConnected, isSpeaking, transcripts, patientName, patientPhone, patientId, callDuration])

  const handleStartCall = async () => {
    setPermissionError(null)
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setPermissionError('Navegador incompatible con audio WebRTC. Usa Chrome, Edge o Safari.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }
      })
      micStreamRef.current = stream
      await startSession({ language: selectedLanguage })
    } catch (err) {
      console.error('Error micrófono:', err)
      releaseMicStream()
      setPermissionError('Por favor habilita los permisos de micrófono para hablar con Aura IA.')
    }
  }

  if (!isOpen) return null

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#0F172A] border border-slate-700/80 text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header Elegante */}
        <div className="px-6 py-4 bg-[#1E293B] border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-2 ring-emerald-500/20'
                : 'bg-slate-800 text-amber-400 border border-slate-700'
            }`}>
              {isConnected ? <Radio className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Aura IA — Asistente de Voz
                {isConnected && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold animate-pulse">
                    EN VIVO {formatTimer(callDuration)}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {isConnected
                  ? isSpeaking
                    ? 'Aura está respondiendo...'
                    : 'Micrófono activo • Te escuchamos'
                  : 'Atención odontológica interactiva 24/7'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isConnected) handleEndCall()
              else onClose()
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de permisos */}
        {permissionError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-200 leading-snug">{permissionError}</p>
          </div>
        )}

        {/* Selector de Idioma */}
        <div className="px-6 pt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Globe className="w-4 h-4 text-slate-400" />
            Idioma de Consulta:
          </span>
          <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setSelectedLanguage('es')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedLanguage === 'es' ? 'bg-[#202D4C] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Español
            </button>
            <button
              onClick={() => setSelectedLanguage('en')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedLanguage === 'en' ? 'bg-[#202D4C] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Cuerpo Principal / Orbe Central */}
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-5">
          <div className="relative">
            {isConnected && (
              <div
                className={`absolute -inset-4 rounded-full border transition-all duration-300 ${
                  isMicActiveAndListening
                    ? 'border-emerald-400/50 animate-ping'
                    : 'border-slate-600/30'
                }`}
                style={{
                  transform: isMicActiveAndListening ? `scale(${1 + audioLevel / 100})` : 'scale(1)'
                }}
              />
            )}

            {/* Botón/Esfera Visual - Avatar Oficial de la Dra. Aura Estudillo */}
            <div
              className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 shadow-2xl relative ${
                isConnected
                  ? isSpeaking
                    ? 'ring-4 ring-cyan-400 shadow-blue-500/50 scale-105'
                    : isMicActiveAndListening
                    ? 'ring-4 ring-emerald-400 shadow-emerald-500/50 animate-pulse'
                    : 'ring-2 ring-slate-600'
                  : 'ring-4 ring-amber-400/80 hover:scale-105 shadow-amber-400/30'
              }`}
            >
              <img
                src="/images/dra-aura-estudillo.jpg"
                alt="Dra. Aura Estudillo"
                className="w-full h-full object-cover object-center"
              />

              {/* Indicador de estado superpuesto */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-2">
                {isConnected ? (
                  isSpeaking ? (
                    <span className="p-1 rounded-full bg-cyan-500 text-white shadow-md animate-bounce">
                      <Volume2 className="w-4 h-4" />
                    </span>
                  ) : isMicActiveAndListening ? (
                    <span className="p-1 rounded-full bg-emerald-500 text-slate-950 shadow-md animate-pulse">
                      <Mic className="w-4 h-4 stroke-[2.5]" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-full bg-slate-700 text-slate-300">
                      <MicOff className="w-4 h-4" />
                    </span>
                  )
                ) : (
                  <span className="p-1.5 rounded-full bg-amber-400 text-slate-950 shadow-md">
                    <Sparkles className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Medidor de Audio Input */}
          {isMicActiveAndListening && (
            <div className="w-full max-w-[220px] flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Audio Mic:</span>
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/20 p-0.5">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ width: `${Math.max(10, audioLevel)}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <h4 className="text-base font-bold text-white">
              {isConnected
                ? isSpeaking
                  ? 'Aura IA te está hablando...'
                  : isMicActiveAndListening
                  ? 'Micrófono abierto: puedes hablar'
                  : 'Micrófono silenciado'
                : 'Asistente Odontológica Aura'}
            </h4>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              {isConnected
                ? 'Pregunta con confianza sobre citas, presupuestos, extracciones, endodoncia o valoraciones.'
                : 'Habla directamente con la inteligencia artificial clínica de Audenti con respuesta de voz instantánea.'}
            </p>
          </div>

          {/* BOTÓN SEMÁFORO DE ACCIÓN (Verde Semáforo -> Rojo Alerta) */}
          <div className="w-full pt-2">
            {isConnected ? (
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setMicMuted(!micMuted)}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    micMuted
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  }`}
                  title={micMuted ? 'Activar micrófono' : 'Silenciar'}
                >
                  {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-600/40 transition-all active:scale-95 animate-pulse cursor-pointer"
                >
                  <PhoneOff className="w-5 h-5" />
                  Finalizar / Colgar Llamada
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isConnecting}
                onClick={handleStartCall}
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-sm sm:text-base shadow-xl shadow-green-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <PhoneCall className="w-5 h-5" />
                {isConnecting ? 'Conectando con Aura...' : 'Iniciar Llamada de Voz con Aura'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0a0f1d] border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
            Fish Audio WebRTC Voice Stream
          </span>
          <span className="font-mono text-slate-400">Audenti Clinical</span>
        </div>
      </div>
    </div>
  )
}
