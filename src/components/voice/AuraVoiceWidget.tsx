'use client'

import { useState } from 'react'
import { useConversation } from '@fishaudio/agent-react'
import { Mic, MicOff, PhoneCall, PhoneOff, Volume2, Sparkles, X, ChevronDown } from 'lucide-react'

interface AuraVoiceWidgetProps {
  className?: string
  defaultOpen?: boolean
}

export function AuraVoiceWidget({ className = '', defaultOpen = false }: AuraVoiceWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
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
    agentId
  })

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting' || status === 'reconnecting'

  const handleToggleCall = async () => {
    if (isConnected || isConnecting) {
      endSession()
    } else {
      try {
        await startSession()
        setIsOpen(true)
      } catch (err) {
        console.error('Error starting Fish Audio conversation:', err)
      }
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
          <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-ping group-hover:bg-amber-400/50"></span>

          <div className="relative w-8 h-8 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            {isConnected ? (
              <Volume2 className="w-4 h-4 animate-bounce text-amber-300" />
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
              {isConnected ? 'Llamada activa • Habla ahora' : 'Toca para hablar por voz 24/7'}
            </p>
          </div>
        </button>
      )}

      {/* Modal / Card flotante de la llamada activa */}
      {isOpen && (
        <div className="w-80 md:w-88 rounded-2xl bg-[#0B132B] border border-amber-500/30 text-white shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-4 py-3 bg-[#111c3d] border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-wide text-white uppercase">Aura IA Voice</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected
                        ? 'bg-emerald-400 animate-pulse'
                        : isConnecting
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-300 capitalize">
                    {isConnected ? (isSpeaking ? 'Aura respondiendo...' : 'Escuchando...') : isConnecting ? 'Conectando...' : 'En espera'}
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

          {/* Body / Visualizador de voz */}
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              {/* Ondas radiales si está hablando o escuchando */}
              {isConnected && (
                <div
                  className={`absolute -inset-4 rounded-full border border-amber-400/30 ${
                    isSpeaking ? 'animate-ping' : 'animate-pulse'
                  }`}
                />
              )}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isConnected
                    ? isSpeaking
                      ? 'bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 scale-110 shadow-lg shadow-amber-500/50'
                      : 'bg-emerald-600 text-white scale-100 shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isConnected ? (
                  isSpeaking ? (
                    <Volume2 className="w-8 h-8 animate-bounce" />
                  ) : (
                    <Mic className="w-8 h-8 animate-pulse" />
                  )
                ) : (
                  <PhoneCall className="w-8 h-8" />
                )}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-bold text-white">
                {isConnected
                  ? isSpeaking
                    ? 'Aura IA te está hablando...'
                    : 'Aura te está escuchando atentamente'
                  : 'Asistencia Dental por Voz'}
              </h5>
              <p className="text-xs text-slate-300 mt-1 max-w-[230px] leading-relaxed">
                {isConnected
                  ? 'Puedes preguntarle sobre citas, costo de implantes, cirugías o resolver dudas en tiempo real.'
                  : 'Inicia la llamada de voz directa con la inteligencia artificial de Audenti.'}
              </p>
            </div>

            {/* Controles de Llamada */}
            <div className="flex items-center gap-3 pt-2">
              {isConnected ? (
                <>
                  <button
                    onClick={() => setMicMuted(!micMuted)}
                    className={`p-3 rounded-full border transition-all ${
                      micMuted
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                    title={micMuted ? 'Activar micrófono' : 'Mutear micrófono'}
                  >
                    {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={handleToggleCall}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/40 transition-all"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Finalizar Llamada
                  </button>
                </>
              ) : (
                <button
                  disabled={isConnecting}
                  onClick={handleToggleCall}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/30 transition-all hover:scale-105 disabled:opacity-50"
                >
                  <PhoneCall className="w-4 h-4" />
                  {isConnecting ? 'Conectando con Aura...' : 'Iniciar Conversación de Voz'}
                </button>
              )}
            </div>
          </div>

          {/* Footer Informativo */}
          <div className="px-4 py-2.5 bg-[#080d1e] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span>Powered by Fish Audio Engine</span>
            <span className="font-mono text-amber-400/80">ID: {agentId.substring(0, 8)}...</span>
          </div>
        </div>
      )}
    </div>
  )
}
