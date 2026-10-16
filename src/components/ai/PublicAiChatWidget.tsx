'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Sparkles, X, Send, Bot, User, ArrowRight, Calendar, Volume2, VolumeX, ShieldCheck } from 'lucide-react'
import { useAccessibility } from '@/context/AccessibilityContext'
import { AuraHologram } from './AuraHologram'
import { formatTimeInMexico } from '@/utils/timezone'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

export function PublicAiChatWidget() {
  const { isSeniorMode } = useAccessibility()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy Aura AI, la asistente virtual de la Dra. Aura Estudillo en Audenti. ¿En qué te puedo ayudar?',
      time: 'Ahora'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [lastEmergencyId, setLastEmergencyId] = useState<string | null>(null)
  const receivedDecisions = useRef<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

  // Escuchar si la Dra. Aura Estudillo tomó una decisión remota para transmitirla en vivo al chat
  useEffect(() => {
    const checkDoctorDecision = async () => {
      try {
        const res = await fetch('/api/ai/night-emergency')
        const data = await res.json()
        if (data?.success && Array.isArray(data.cases)) {
          data.cases.forEach((c: any) => {
            if ((c.status === 'approved_exceptional' || c.status === 'scheduled_first_hour') && !receivedDecisions.current.has(c.id)) {
              receivedDecisions.current.add(c.id)
              const decisionMsg: Message = {
                id: `decision-${c.id}`,
                role: 'assistant',
                content: `🩺 **COMUNICADO OFICIAL DE LA DRA. AURA ESTUDILLO:**\n\n${c.doctorNotes}\n\n*Folio de seguimiento: ${c.id}*. Nuestro equipo médico ya está coordinando la apertura/ingreso prioritario.`,
                time: formatTimeInMexico()
              }
              setMessages(prev => [...prev, decisionMsg])
              setIsOpen(true)
            }
          })
        }
      } catch {}
    }

    const timer = setInterval(checkDoctorDecision, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      if (speaking) {
        window.speechSynthesis.cancel()
        setSpeaking(false)
        return
      }

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-MX'
      utterance.rate = 1.05
      utterance.pitch = 1.0

      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      time: formatTimeInMexico()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userText })

      // Extracción automática de teléfono y nombre del historial
      let detectedPhone = ''
      let detectedName = ''

      const allUserText = [...messages.filter(m => m.role === 'user').map(m => m.content), userText].join(' ')
      const phoneMatch = allUserText.match(/\b\d{10}\b/) || allUserText.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/)
      if (phoneMatch) {
        detectedPhone = phoneMatch[0].replace(/\D/g, '')
      }

      const nameMatch = allUserText.match(/(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,30})/i)
      if (nameMatch) {
        detectedName = nameMatch[1].trim()
      }

      const res = await fetch('/api/ai/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          role: 'public',
          sessionContext: {
            phone: detectedPhone || undefined,
            patientName: detectedName || undefined
          }
        })
      })

      const data = await res.json()

      if (!res.ok && data?.error) {
        throw new Error(data.error)
      }

      // Si la IA generó o confirmó una cita con folio, disparar evento para refrescar la agenda en tiempo real
      if (data?.reply && (data.reply.includes('AUD-') || data.reply.includes('folio') || data.reply.includes('Folio'))) {
        window.dispatchEvent(new Event('audenti_appointment_refresh'))
        try {
          localStorage.setItem('audenti_last_booking_sync', Date.now().toString())
        } catch {}
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.reply || '¡Hola! Soy Aura AI, ¿en qué te puedo ayudar?',
        time: formatTimeInMexico()
      }

      setMessages(prev => [...prev, botMsg])
    } catch (err: any) {
      console.warn('Chat interaction error:', err)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hubo una breve intermitencia al procesar tu consulta con la IA. Puedes consultarme nuevamente sobre procedimientos, horarios o pulsar "Agendar Cita" para atención inmediata con la Dra. Aura.',
        time: formatTimeInMexico()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // Ocultar widget de chat complejo en Modo Senior para priorizar botones grandes y asistencia directa
  if (isSeniorMode) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {/* Botón Flotante para Abrir Chat con Avatar Holográfico */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-slate-900/95 text-white shadow-2xl border-2 border-amber-400 hover:border-cyan-400 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          aria-label="Abrir Aura AI"
        >
          <AuraHologram isActive={false} size="sm" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight flex items-center gap-1.5">
              Aura AI
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <span className="text-[10px] text-amber-300 font-medium">Asistente Virtual</span>
          </div>
        </button>
      )}

      {/* Ventana de Chat Expandida con Holograma en Cabecera */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[390px] h-[540px] max-h-[85vh] bg-[#0B0F19] text-white rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header del Chat con Holograma */}
          <div className="p-3.5 bg-[#111827]/95 border-b border-slate-800/80 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <AuraHologram isActive={isOpen} size="md" />
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5 font-hanken">
                  Aura AI
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-400/20 text-amber-300 font-mono border border-amber-400/30">
                    Hologram
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Dra. Aura Estudillo • Céd. 8492019
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (speaking) {
                  window.speechSynthesis?.cancel()
                  setSpeaking(false)
                }
                setIsOpen(false)
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Cerrar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner de Garantía Clínica */}
          <div className="px-4 py-1.5 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300/90">
            <span className="inline-flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              Orientación Clínica Inmediata
            </span>
            <span className="text-slate-400 font-mono text-[9px]">Aura AI • Concierge</span>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-[#0B0F19]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="relative w-7 h-7 rounded-full overflow-hidden bg-slate-900 border border-amber-400/50 shrink-0 shadow-sm">
                    <img
                      src="/images/aura-ai-avatar-transp.png"
                      alt="Aura AI"
                      className="w-full h-full object-cover object-top scale-110"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-2xl leading-relaxed text-xs ${
                    m.role === 'user'
                      ? 'bg-amber-400 text-slate-950 font-medium rounded-br-xs'
                      : 'bg-[#111827] text-slate-100 border border-slate-800/80 rounded-bl-xs shadow-sm'
                  }`}
                >
                  <p>{m.content}</p>
                  <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-black/5 dark:border-white/5 text-[9px] text-slate-400">
                    <span>{m.time}</span>
                    {m.role === 'assistant' && (
                      <button
                        onClick={() => handleSpeak(m.content)}
                        className="hover:text-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Escuchar respuesta"
                      >
                        {speaking ? <VolumeX className="w-3 h-3 text-amber-400" /> : <Volume2 className="w-3 h-3" />}
                        <span>Escuchar</span>
                      </button>
                    )}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pl-9">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px]">Aura AI consultando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer del Chat con Acceso Rápido a Cita */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-slate-400">¿Listo para comenzar?</span>
              <a
                href="#reservar"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold"
              >
                Agendar Cita
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu duda o síntoma aquí..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
