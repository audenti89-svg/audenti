'use client'

import { useState, useRef, useEffect } from 'react'
import { useConversation } from '@fishaudio/agent-react'
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  Sparkles,
  X,
  ChevronDown,
  AlertCircle,
  Globe,
  Radio
} from 'lucide-react'

interface AuraVoiceWidgetProps {
  className?: string
  defaultOpen?: boolean
}

export function AuraVoiceWidget({ className = '', defaultOpen = false }: AuraVoiceWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>('es')
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const agentId = 'f6e132fe196a4319b788fa1acff4ddcf'

  const {
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

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting' || status === 'reconnecting'
  // Micrófono abierto y escuchando activamente
  const isMicActiveAndListening = isConnected && !micMuted && (mode === 'listening' || !isSpeaking)

  // Medición visual interactiva del nivel de audio del micrófono cuando está activo
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
        console.warn('Audio metering init warning:', e)
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [isMicActiveAndListening])

  // Limpiar tracks de micrófono al colgar o desmontar
  const releaseMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }
  }

  const handleToggleCall = async () => {
    if (isConnected || isConnecting) {
      releaseMicStream()
      await endSession()
      try {
        await fetch('/api/webhook/call-transcription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName: 'Paciente Consulta de Voz',
            durationSeconds: 30,
            consultationReason: 'Solicitud de Cita Médica por Voz',
            urgencyLevel: 'Urgente',
            transcription: 'Llamada de voz con Aura IA finalizada.',
            dialogue: [
              { role: 'assistant', text: 'Hola, bienvenido a Audenti. ¿En qué podemos ayudarte?' },
              { role: 'user', text: 'Hola, requiero valoración y cita dental.' }
            ],
            summary: 'El paciente se comunicó por voz solicitando atención dental.'
          })
        })
      } catch (e) {
        console.warn('Error enviando reporte de llamada:', e)
      }
    } else {
      setPermissionError(null)

      // 1. Verificación explícita de Navigator.mediaDevices y permisos de micrófono
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        setPermissionError('Tu navegador no soporta captura de audio WebRTC. Por favor usa Chrome, Edge o Safari actualizado.')
        setIsOpen(true)
        return
      }

      try {
        // Solicitar explícitamente el permiso del micrófono con configuraciones PCM / WebRTC óptimas
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000
          }
        })

        // Guardamos el stream para visualización de audio interactiva
        micStreamRef.current = stream

        // 2. Iniciar sesión con useConversation y el idioma seleccionado (es / en)
        await startSession({
          language: selectedLanguage
        })
        setIsOpen(true)
      } catch (err: unknown) {
        console.error('Error de acceso a micrófono:', err)
        releaseMicStream()
        setPermissionError('Por favor, habilita el acceso al micrófono en tu navegador para hablar con Aura IA.')
        setIsOpen(true)
      }
    }
  }

  const handleSwitchLanguage = (lang: 'es' | 'en') => {
    setSelectedLanguage(lang)
    if (isConnected) {
      // Si ya está conectado, reiniciar con el nuevo idioma
      endSession().then(() => {
        startSession({ language: lang }).catch(() => {})
      })
    }
  }

  return (
    <div className={`fixed z-50 ${className}`}>
      {/* Botón Flotante Principal cuando está minimizado o colapsado */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-bold rounded-full shadow-2xl hover:scale-105 transition-all duration-300 border border-amber-300/60"
          title="Hablar por voz con Aura IA (Fish Audio)"
        >
          {/* Pulso de onda */}
          <span className={`absolute -inset-1 rounded-full ${
            isMicActiveAndListening ? 'bg-emerald-400/40 animate-ping' : 'bg-amber-400/30 animate-ping'
          } group-hover:bg-amber-400/50`}></span>

          <div className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-colors ${
            isMicActiveAndListening
              ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
              : 'bg-slate-950 text-amber-400'
          }`}>
            {isConnected ? (
              isSpeaking ? (
                <Volume2 className="w-4 h-4 animate-bounce text-slate-950" />
              ) : (
                <Mic className="w-4 h-4 animate-pulse text-slate-950" />
              )
            ) : (
              <Mic className="w-4 h-4 text-amber-400" />
            )}
          </div>

          <div className="relative text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xs font-black tracking-wide text-slate-950 uppercase">
                Aura Asistente de Voz
              </span>
              <Sparkles className="w-3 h-3 text-slate-950" />
            </div>
            <p className="text-[10px] text-slate-900/80 font-medium mt-0.5">
              {isConnected
                ? isSpeaking
                  ? 'Aura respondiendo...'
                  : 'Micrófono activo • Te escucho'
                : 'Toca para hablar por voz 24/7'}
            </p>
          </div>
        </button>
      )}

      {/* Modal / Card flotante de la llamada activa */}
      {isOpen && (
        <div className="w-80 md:w-92 rounded-2xl bg-[#0B132B] border border-amber-500/30 text-white shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-4 py-3 bg-[#111c3d] border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                isMicActiveAndListening
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400'
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-400'
              }`}>
                {isMicActiveAndListening ? (
                  <Radio className="w-4 h-4 animate-pulse" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide text-white uppercase flex items-center gap-1.5">
                  Aura IA Voice
                  {isMicActiveAndListening && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-bold animate-pulse">
                      MIC LIVE
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected
                        ? isSpeaking
                          ? 'bg-amber-400 animate-bounce'
                          : 'bg-emerald-400 animate-pulse'
                        : isConnecting
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-300">
                    {isConnected
                      ? isSpeaking
                        ? 'Aura hablando...'
                        : 'Micrófono abierto • Escuchando'
                      : isConnecting
                      ? 'Conectando audio WebRTC...'
                      : 'Listo para conectar'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimizar panel"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  releaseMicStream()
                  if (isConnected) endSession()
                  setIsOpen(false)
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Cerrar y colgar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Alerta de Permisos Denegados o Error de Micrófono */}
          {permissionError && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-rose-200 leading-snug">
                  {permissionError}
                </p>
                <p className="text-[10px] text-rose-300/80 mt-1">
                  Haz clic en el icono del candado en la barra de direcciones de tu navegador y selecciona &quot;Permitir micrófono&quot;.
                </p>
              </div>
            </div>
          )}

          {/* Selector de Idioma (Español / Inglés con PCM fluido) */}
          <div className="px-4 pt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              Idioma / Language:
            </span>
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-white/10 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => handleSwitchLanguage('es')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedLanguage === 'es'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ES (Español)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchLanguage('en')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedLanguage === 'en'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN (English)
              </button>
            </div>
          </div>

          {/* Body / Visualizador de voz e Indicador Interactivo de Audio */}
          <div className="p-5 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              {/* Ondas radiales reactivas */}
              {isConnected && (
                <div
                  className={`absolute -inset-4 rounded-full border transition-all duration-300 ${
                    isMicActiveAndListening
                      ? 'border-emerald-400/60 animate-ping'
                      : isSpeaking
                      ? 'border-amber-400/50 animate-pulse'
                      : 'border-slate-600/30'
                  }`}
                  style={{
                    transform: isMicActiveAndListening ? `scale(${1 + audioLevel / 120})` : 'scale(1)'
                  }}
                />
              )}

              {/* Globo central de estado con Avatar Oficial de la Dra. Aura */}
              <div
                className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 relative ${
                  isConnected
                    ? isSpeaking
                      ? 'scale-105 shadow-lg shadow-amber-500/50 ring-4 ring-amber-400'
                      : isMicActiveAndListening
                      ? 'scale-110 shadow-lg shadow-emerald-500/60 ring-4 ring-emerald-400 animate-pulse'
                      : 'ring-2 ring-emerald-500'
                    : 'ring-3 ring-amber-400/80 shadow-md'
                }`}
              >
                <img
                  src="/images/dra-aura-estudillo.jpg"
                  alt="Dra. Aura Estudillo"
                  className="w-full h-full object-cover object-center"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-1">
                  {isConnected ? (
                    isSpeaking ? (
                      <Volume2 className="w-5 h-5 text-amber-300 animate-bounce" />
                    ) : isMicActiveAndListening ? (
                      <Mic className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                    ) : (
                      <MicOff className="w-5 h-5 text-slate-300" />
                    )
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                </div>
              </div>
            </div>

            {/* Ecualizador / Medidor de Audio Interactivo */}
            {isMicActiveAndListening && (
              <div className="w-full max-w-[200px] flex items-center justify-center gap-1.5 py-1">
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Audio Input:</span>
                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/30 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-75"
                    style={{ width: `${Math.max(10, audioLevel)}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <h5 className="text-sm font-bold text-white">
                {isConnected
                  ? isSpeaking
                    ? 'Aura IA te está hablando...'
                    : isMicActiveAndListening
                    ? '¡Micrófono abierto! Puedes hablar'
                    : 'Micrófono en pausa'
                  : 'Asistencia Dental por Voz'}
              </h5>
              <p className="text-xs text-slate-300 mt-1 max-w-[250px] leading-relaxed">
                {isConnected
                  ? isMicActiveAndListening
                    ? 'Pregunta con confianza en español o inglés sobre citas, implantes, extracciones o presupuesto.'
                    : 'Aura está procesando o respondiendo a tu consulta.'
                  : 'Inicia la llamada con reconocimiento de voz fluido bidireccional.'}
              </p>
            </div>

              {/* Controles de Llamada y Micrófono con Botón Semáforo */}
            <div className="flex items-center gap-3 pt-1 w-full max-w-xs">
              {isConnected ? (
                <>
                  <button
                    onClick={() => setMicMuted(!micMuted)}
                    className={`p-3 rounded-2xl border transition-all ${
                      micMuted
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                    title={micMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                  >
                    {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleCall}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/40 transition-all animate-pulse cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Finalizar / Colgar Llamada
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={handleToggleCall}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-xs shadow-lg shadow-green-600/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  {isConnecting ? 'Conectando con Aura...' : 'Iniciar Llamada de Voz con Aura'}
                </button>
              )}
            </div>
          </div>

          {/* Footer Informativo */}
          <div className="px-4 py-2.5 bg-[#080d1e] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isMicActiveAndListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              Fish Audio • WebRTC Stream
            </span>
            <span className="font-mono text-amber-400/80">ID: {agentId.substring(0, 8)}...</span>
          </div>
        </div>
      )}
    </div>
  )
}
