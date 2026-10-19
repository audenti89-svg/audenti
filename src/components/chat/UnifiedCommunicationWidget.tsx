'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useConversation, useAgentMessages } from '@fishaudio/agent-react'
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  MessageSquare,
  Send,
  X,
  Volume2,
  Sparkles,
  ChevronDown,
  AlertCircle,
  Globe,
  Radio,
  CheckCheck,
  Minimize2,
  Smile
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export interface PatientDirectMessage {
  id: string
  senderName: string
  senderRole: 'doctor' | 'patient' | 'staff' | 'ai'
  content: string
  timestamp: string
  isDoctor: boolean
}

interface UnifiedCommunicationWidgetProps {
  className?: string
  patient?: {
    id?: string
    full_name?: string
    phone?: string
    branch_name?: string
    tenant_id?: string
  }
}

export function UnifiedCommunicationWidget({
  className = '',
  patient
}: UnifiedCommunicationWidgetProps) {
  // Estado modal: cerrado o abierto
  const [isOpen, setIsOpen] = useState(false)
  // Modo activo dentro de la ventana: 'voice' o 'chat'
  const [activeTab, setActiveTab] = useState<'voice' | 'chat'>('voice')

  // Notificaciones & Sonido
  const { playTone } = useNotificationSound()
  const supabase = createClient()

  // Datos del paciente
  const patientId = patient?.id || '72d77609-2035-477b-a1e3-f6ddc52818b1'
  const patientName = patient?.full_name || 'Ricardo Sánchez'
  const branchName = patient?.branch_name || 'Sucursal Chalma de Guadalupe'

  // --- SECCIÓN 1: ESTADO DEL CHAT DIRECTO ---
  const [messages, setMessages] = useState<PatientDirectMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Cargar historial de chat
  const loadChatHistory = async () => {
    try {
      const res = await fetch(`/api/chat?patientId=${patientId}`)
      if (res.ok) {
        const json = await res.json()
        if (json.messages && json.messages.length > 0) {
          setMessages(json.messages)
          const lastMsg = json.messages[json.messages.length - 1]
          if (lastMsg?.isDoctor && (!isOpen || activeTab !== 'chat')) {
            setUnreadChatCount(1)
          }
          return
        }
      }
    } catch {
      // Sin mensajes previos
      setMessages([])
    }
  }

  useEffect(() => {
    loadChatHistory()
  }, [patientId])

  useEffect(() => {
    const handleOpenWidget = (e?: any) => {
      setIsOpen(true)
      if (e?.detail?.tab) {
        setActiveTab(e.detail.tab)
      }
    }

    window.addEventListener('audenti_open_communication_widget', handleOpenWidget)
    return () => {
      window.removeEventListener('audenti_open_communication_widget', handleOpenWidget)
    }
  }, [])

  // Suscripción Realtime para mensajes de la doctora
  useEffect(() => {
    const channelName = `patient_chat_${patientId}`
    const handleIncomingDoctorOrAssistantMessage = (payload: any) => {
      if (!payload) return
      const targetId = payload.targetPatientId || payload.patientId || payload.conversation_id
      const isForMe = !targetId || targetId === patientId || String(targetId) === String(patientId)
      const isFromClinic = payload.senderRole === 'doctor' || payload.senderRole === 'assistant' || payload.senderRole === 'ai' || payload.isDoctor

      if (isForMe && isFromClinic) {
        playTone('arrival')
        setMessages(prev => {
          const exists = prev.some(m => m.id === payload.id)
          if (exists) return prev
          return [...prev, {
            id: payload.id || `msg-${Date.now()}`,
            senderName: payload.senderName || 'Dra. Aura Estudillo',
            senderRole: (payload.senderRole as any) || 'doctor',
            content: payload.content || '',
            timestamp: payload.timestamp || payload.time || 'Ahora',
            isDoctor: Boolean(payload.isDoctor || payload.senderRole === 'doctor')
          }]
        })
        if (!isOpen || activeTab !== 'chat') {
          setUnreadChatCount(c => c + 1)
        }
      }
    }

    const chatChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'doctor_reply' }, ({ payload }) => handleIncomingDoctorOrAssistantMessage(payload))
      .on('broadcast', { event: 'chatwoot_message_created' }, ({ payload }) => handleIncomingDoctorOrAssistantMessage(payload))
      .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => handleIncomingDoctorOrAssistantMessage(payload))
      .subscribe()

    const globalChannel = supabase
      .channel('chat_omnichannel_sync')
      .on('broadcast', { event: 'sync_patient_message' }, ({ payload }) => handleIncomingDoctorOrAssistantMessage(payload))
      .on('broadcast', { event: 'chatwoot_message_created' }, ({ payload }) => handleIncomingDoctorOrAssistantMessage(payload))
      .on('broadcast', { event: 'doctor_reply' }, ({ payload }) => handleIncomingDoctorOrAssistantMessage(payload))
      .subscribe()

    return () => {
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(globalChannel)
    }
  }, [patientId, isOpen, activeTab, playTone, supabase])

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      setUnreadChatCount(0)
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, activeTab])

  // Envío de mensaje desde el chat del paciente
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || isSending) return

    const messageText = inputText.trim()
    setInputText('')
    setIsSending(true)

    const nowFormatted = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date())
    const newMsg: PatientDirectMessage = {
      id: `msg-${Date.now()}`,
      senderName: patientName,
      senderRole: 'patient',
      content: messageText,
      timestamp: nowFormatted,
      isDoctor: false
    }

    // 1. Reflejo local inmediato en la UI del paciente
    setMessages(prev => [...prev, newMsg])

    try {
      // 2. Persistir vía /api/chat (utiliza createAdminClient para evitar restricciones RLS)
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          message: newMsg
        })
      })

      // 3. Emitir Realtime en chat_omnichannel_sync para actualización instantánea en el panel de la doctora
      await supabase.channel('chat_omnichannel_sync').send({
        type: 'broadcast',
        event: 'incoming_patient_message',
        payload: {
          targetPatientId: patientId,
          ...newMsg
        }
      })

      // 4. Emitir en header para alerta sonora y badge
      await supabase.channel('header_notifications_realtime').send({
        type: 'broadcast',
        event: 'doctor_notification',
        payload: {
          id: `notif-${Date.now()}`,
          title: `💬 Mensaje de ${patientName}`,
          message: messageText,
          type: 'general',
          patient_name: patientName,
          time: nowFormatted,
          branch: branchName
        }
      })
    } catch (err: unknown) {
      console.error('Error enviando mensaje de chat:', err)
    } finally {
      setIsSending(false)
    }
  }

  // --- SECCIÓN 2: ASISTENTE DE VOZ (FISH AUDIO AGENT REACT) ---
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>('es')
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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

  // Obtener mensajes transcritos de la sesión
  const transcripts = useAgentMessages(session)

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting' || status === 'reconnecting'
  const isMicActiveAndListening = isConnected && !micMuted && (mode === 'listening' || !isSpeaking)

  // Medidor interactivo de audio
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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [isMicActiveAndListening])

  const releaseMicStream = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }
  }

  // Notificar al Dashboard de la Doctora cuando inicia y finaliza la llamada
  const notifyDoctorVoiceCall = async (state: 'active' | 'ended', summary?: string, dialogueList?: Array<{ role: 'user' | 'assistant'; text: string }>) => {
    const nowFormatted = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date())
    try {
      await supabase.channel('chat_omnichannel_sync').send({
        type: 'broadcast',
        event: 'voice_call_event',
        payload: {
          patientId,
          patientName,
          status: state,
          timestamp: nowFormatted,
          summary: summary || (state === 'active' ? 'Llamada de voz en curso' : 'Llamada de voz finalizada'),
          dialogue: dialogueList || []
        }
      })

      // Si finalizó la llamada, persistir la transcripción y el caso completo en el backend
      if (state === 'ended') {
        const fullTranscript = dialogueList && dialogueList.length > 0
          ? dialogueList.map(t => `${t.role === 'user' ? patientName : 'Aura AI'}: ${t.text}`).join('\n')
          : (summary || 'Consulta de voz finalizada.')

        await fetch('/api/webhook/call-transcription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            patientPhone: patient?.phone || '',
            durationSeconds: 45,
            consultationReason: 'Solicitud de Cita Médica por Voz',
            urgencyLevel: 'Urgente',
            transcription: fullTranscript,
            dialogue: dialogueList || [],
            summary: summary || 'El paciente se comunicó por voz con Aura IA solicitando consulta.'
          })
        })
      }
    } catch (e) {
      console.warn('Error emitiendo evento de llamada a la doctora:', e)
    }
  }

  // Iniciar o finalizar llamada de voz
  const handleToggleCall = async () => {
    if (isConnected || isConnecting) {
      releaseMicStream()
      const formattedDialogue = transcripts.map(t => ({
        role: (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        text: t.text
      }))
      const transcriptSummary = formattedDialogue.length > 0
        ? formattedDialogue.map(t => `${t.role === 'user' ? patientName : 'Aura'}: ${t.text}`).slice(-4).join(' | ')
        : 'Consulta de voz finalizada.'
      await endSession()
      await notifyDoctorVoiceCall('ended', transcriptSummary, formattedDialogue)
    } else {
      setPermissionError(null)

      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        setPermissionError('Tu navegador no soporta captura de audio WebRTC. Por favor usa Chrome, Edge o Safari actualizado.')
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

        await startSession({
          language: selectedLanguage
        })

        // Avisar a la doctora que el paciente inició la llamada
        await notifyDoctorVoiceCall('active')
      } catch (err) {
        console.error('Error de acceso al micrófono:', err)
        releaseMicStream()
        setPermissionError('Por favor, habilita el acceso al micrófono en tu navegador para hablar con Aura IA.')
      }
    }
  }

  return (
    <div className={`fixed z-50 bottom-6 right-6 ${className}`}>
      {/* =========================================================================
          BOTÓN FLOTANTE UNIFICADO DE ACCESIBILIDAD TOTAL
          - Dorado Audenti #F59E0B
          - Texto #000000 Ultra Bold
          - Tipografía grande de 18px
          - Iconos de alta visibilidad (Teléfono + Chat)
      ========================================================================= */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3.5 px-6 py-4 bg-[#F59E0B] hover:bg-[#D97706] active:scale-95 text-[#000000] font-black rounded-full shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 border-2 border-amber-300 ring-4 ring-black/10 select-none"
          title="Abrir Asistencia de Voz y Chat de la Clínica"
        >
          {/* Ondas pulsantes de alta visibilidad */}
          <span className="absolute -inset-1.5 rounded-full bg-amber-400/40 animate-ping pointer-events-none"></span>

          {/* Iconos de Doble Acción */}
          <div className="relative w-11 h-11 rounded-full bg-black text-[#F59E0B] flex items-center justify-center shrink-0 shadow-lg">
            {isConnected ? (
              <Radio className="w-6 h-6 animate-pulse text-emerald-400" />
            ) : (
              <Phone className="w-6 h-6 animate-bounce" />
            )}
          </div>

          {/* Texto de Accesibilidad 18px en Negrita */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[18px] sm:text-[19px] leading-tight font-black tracking-tight text-black uppercase">
                {isConnected ? 'Llamada Activa' : 'Hablar o Escribir'}
              </span>
              <Sparkles className="w-4 h-4 text-black shrink-0" />
            </div>
            <p className="text-[12px] sm:text-[13px] font-bold text-black/80 leading-none mt-0.5">
              Voz con Aura IA 🎙️ • Chat Clínico 💬
            </p>
          </div>

          {/* Badge de mensajes no leídos de la doctora */}
          {unreadChatCount > 0 && (
            <span className="absolute -top-2 -left-2 bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-white animate-bounce">
              {unreadChatCount} nuevo
            </span>
          )}
        </button>
      )}

      {/* =========================================================================
          MODAL UNIFICADO: CONMUTADOR VOZ / CHAT
      ========================================================================= */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[410px] rounded-3xl bg-[#090F1E] border-2 border-amber-400/50 text-white shadow-2xl overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header Superior con Identidad y Selector de Pestaña */}
          <div className="bg-[#121B32] border-b border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F59E0B] text-black font-black flex items-center justify-center text-lg shadow-md">
                  AE
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-wide uppercase">
                    AUDENTI CLINICAL
                  </h3>
                  <p className="text-[11px] text-amber-400 font-bold">
                    Dra. Aura Estudillo • Céd. 8492019
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Minimizar panel"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (isConnected) endSession()
                    setIsOpen(false)
                  }}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Cerrar ventana"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Selector de Modo Unificado: [ 🎙️ Hablar por Voz ] o [ 💬 Escribir Mensaje ] */}
            <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('voice')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition-all ${
                  activeTab === 'voice'
                    ? 'bg-[#F59E0B] text-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>🎙️ Hablar por Voz</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('chat')
                  setUnreadChatCount(0)
                }}
                className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition-all ${
                  activeTab === 'chat'
                    ? 'bg-[#F59E0B] text-black shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>💬 Escribir Mensaje</span>
                {unreadChatCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>
            </div>
          </div>

          {/* =====================================================================
              PESTAÑA 1: ASISTENTE DE VOZ CON AURA IA (STREAMING FISH AUDIO)
          ===================================================================== */}
          {activeTab === 'voice' && (
            <div className="p-5 flex flex-col items-center justify-center text-center space-y-4">
              {/* Selector de idioma */}
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  Idioma / Language:
                </span>
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-white/10 text-[10px] font-bold">
                  <button
                    onClick={() => setSelectedLanguage('es')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      selectedLanguage === 'es' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Español
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('en')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      selectedLanguage === 'en' ? 'bg-amber-400 text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Alerta de Permisos Denegados */}
              {permissionError && (
                <div className="w-full p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-200">{permissionError}</p>
                    <p className="text-[10px] text-rose-300/80 mt-0.5">
                      Haz clic en el candado del navegador para permitir el uso del micrófono.
                    </p>
                  </div>
                </div>
              )}

              {/* Visualizador central reactivo con ondas */}
              <div className="relative my-2">
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

                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isConnected
                      ? isSpeaking
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-600 text-black scale-105 shadow-amber-500/50'
                        : isMicActiveAndListening
                        ? 'bg-emerald-500 text-black scale-110 shadow-emerald-500/50 ring-4 ring-emerald-400/40 animate-pulse'
                        : 'bg-emerald-700 text-white'
                      : 'bg-[#F59E0B] text-black hover:scale-105'
                  }`}
                >
                  {isConnected ? (
                    isSpeaking ? (
                      <Volume2 className="w-10 h-10 animate-bounce" />
                    ) : isMicActiveAndListening ? (
                      <Mic className="w-10 h-10 text-black stroke-[2.5]" />
                    ) : (
                      <MicOff className="w-10 h-10 text-white" />
                    )
                  ) : (
                    <PhoneCall className="w-10 h-10" />
                  )}
                </div>
              </div>

              {/* Indicador de entrada de audio */}
              {isMicActiveAndListening && (
                <div className="w-full max-w-[200px] flex items-center justify-center gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Audio Mic:</span>
                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/30 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-75"
                      style={{ width: `${Math.max(10, audioLevel)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Mensajes de Estado */}
              <div>
                <h4 className="text-base font-black text-white">
                  {isConnected
                    ? isSpeaking
                      ? 'Aura IA te está hablando...'
                      : isMicActiveAndListening
                      ? 'Micrófono Abierto: ¡Te escucho!'
                      : 'Micrófono en silencio'
                    : 'Asistente de Voz Inteligente'}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-[270px]">
                  {isConnected
                    ? 'Pregunta con confianza sobre citas, extracciones, implantes o presupuestos en tiempo real.'
                    : 'Toca el botón dorado para comenzar la llamada con la inteligencia artificial.'}
                </p>
              </div>

              {/* Botón de Acción Principal de la Llamada con Estilo Semáforo */}
              <div className="w-full pt-1">
                {isConnected ? (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMicMuted(!micMuted)}
                      className={`p-3 rounded-2xl border transition-all ${
                        micMuted
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                          : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      }`}
                      title={micMuted ? 'Activar micrófono' : 'Silenciar'}
                    >
                      {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleCall}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/40 transition-all animate-pulse cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" />
                      Finalizar / Colgar Llamada
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleToggleCall}
                    className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-sm sm:text-base shadow-xl shadow-green-600/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Phone className="w-5 h-5" />
                    {isConnecting ? 'Conectando con Aura...' : 'Iniciar Llamada de Voz con Aura'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              PESTAÑA 2: CHAT DIRECTO CON LA CLÍNICA Y DRA. AURA
          ===================================================================== */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[380px]">
              {/* Lista de Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080d19]/60">
                {messages.map(msg => {
                  const isPatient = msg.senderRole === 'patient' || !msg.isDoctor
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-400">
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium leading-relaxed shadow-sm ${
                          isPatient
                            ? 'bg-amber-400 text-black font-semibold rounded-br-xs'
                            : 'bg-[#1b253d] text-white border border-white/10 rounded-bl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Formulario de Entrada */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-[#11192e] border-t border-white/10 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Escribe tu mensaje a la clínica..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-black disabled:opacity-40 transition-all shrink-0"
                  title="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Footer Informativo */}
          <div className="px-4 py-2.5 bg-[#070b16] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span>Sede: {branchName}</span>
            <span className="text-amber-400 font-bold">Audenti 24/7 Live</span>
          </div>
        </div>
      )}
    </div>
  )
}
