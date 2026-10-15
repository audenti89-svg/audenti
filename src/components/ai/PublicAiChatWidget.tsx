'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, Sparkles, X, Send, Bot, User, ArrowRight, Calendar, Volume2, VolumeX, ShieldCheck } from 'lucide-react'
import { useAccessibility } from '@/context/AccessibilityContext'

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
      content: '¡Hola! Soy el asistente virtual de la Dra. Aura Estudillo en Audenti. ¿Te gustaría conocer más sobre Diseño de Sonrisa, Carillas, Blanqueamiento LED o agendar una valoración?',
      time: 'Ahora'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userText })

      const res = await fetch('/api/ai/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      })

      const data = await res.json()

      if (!res.ok && data?.error) {
        throw new Error(data.error)
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.reply || 'Hola, ¿en qué podemos apoyarte con tu salud bucodental?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, botMsg])
    } catch (err: any) {
      console.warn('Chat interaction error:', err)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hubo una breve intermitencia al procesar tu consulta con la IA. Puedes consultarme nuevamente sobre precios, horarios o pulsar "Agendar Cita" para atención inmediata con la Dra. Aura.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      {/* Botón Flotante para Abrir Chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 text-white shadow-2xl border-2 border-amber-400 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Abrir Asistente IA Dental"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-tight">Preguntar a la IA</span>
          <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono">
            Groq Llama 3.1
          </span>
        </button>
      )}

      {/* Ventana de Chat Expandida */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header del Chat */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white flex items-center gap-1.5 font-hanken">
                  Audenti Concierge IA
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </h3>
                <p className="text-[10px] text-slate-400">
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
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Banner de Garantía Clínica */}
          <div className="px-4 py-1.5 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300/90">
            <span className="inline-flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              Orientación Clínica Inmediata
            </span>
            <span className="text-slate-400 font-mono text-[9px]">Llama 3.1 8B Ultra Fast</span>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-amber-400">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-2xl leading-relaxed text-xs ${
                    m.role === 'user'
                      ? 'bg-amber-400 text-slate-950 font-medium rounded-br-xs'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-bl-xs'
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
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
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
                <span className="text-[10px]">Consultando a la Dra. Aura...</span>
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
                placeholder="Pregunta sobre carillas, dolor, precios..."
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
