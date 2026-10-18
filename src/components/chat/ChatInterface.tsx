'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Send,
  Phone,
  PhoneCall,
  MessageSquare,
  Sparkles,
  Lock,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  Volume2,
  VolumeX,
  User,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ChevronRight,
  Filter,
  CheckCheck
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export type ChannelFilter = 'all' | 'voice_call' | 'whatsapp' | 'web_chat' | 'urgent'

export interface ChatMessageItem {
  id: string
  senderName: string
  senderInitials?: string
  senderRole?: 'doctor' | 'patient' | 'ai' | 'staff'
  channel_type?: 'voice_call' | 'whatsapp' | 'web_chat'
  content: string
  time: string
  isOwn: boolean
  isPrivateNote?: boolean
  metadata?: {
    channel_type?: 'voice_call' | 'whatsapp' | 'web_chat'
    durationSeconds?: number
    consultationReason?: string
    urgencyLevel?: 'Urgente' | 'No Urgente'
    transcription?: string
    dialogue?: Array<{ role: 'user' | 'assistant'; text: string }>
    summary?: string
    patientName?: string
    phone?: string
    folio?: string
    isRegistered?: boolean
    classification?: string
  }
}

export interface PatientDirectoryItem {
  id: string
  name: string
  phone: string
  folio: string
  isRegistered: boolean
  channel_type: 'voice_call' | 'whatsapp' | 'web_chat'
  lastMessage: string
  lastTime: string
  isUrgent: boolean
  consultationReason?: string
  address?: string
  emergencyContact?: string
}

export function ChatInterface() {
  const searchParams = useSearchParams()
  const urlPatientId = searchParams.get('patientId')

  const { soundEnabled, setSoundEnabled, playTone } = useNotificationSound()
  const supabase = createClient()

  // Filtros y Búsqueda
  const [activeFilter, setActiveFilter] = useState<ChannelFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Lista de Contactos/Pacientes
  const [patients, setPatients] = useState<PatientDirectoryItem[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [unreadPatients, setUnreadPatients] = useState<Set<string>>(new Set())

  // Mensajes por ID de paciente
  const [messages, setMessages] = useState<Record<string, ChatMessageItem[]>>({})
  const [inputMessage, setInputMessage] = useState('')
  const [isPrivateNote, setIsPrivateNote] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Cargar historial persistido desde chat_omnichannel.json de Supabase Storage
  const loadOmnichannelHistory = async () => {
    try {
      const { data: file } = await supabase.storage
        .from('audenti_database')
        .download('chat_omnichannel.json')

      if (file) {
        const text = await file.text()
        if (text && text.trim()) {
          const stored = JSON.parse(text)
          const mappedMessages: Record<string, ChatMessageItem[]> = {}
          const directoryList: PatientDirectoryItem[] = []

          // Obtener lista oficial de pacientes registrados de la base de datos para cruzar datos
          let registeredMap: Record<string, any> = {}
          try {
            const { data: dbPatients } = await supabase
              .from('patients')
              .select('id, full_name, phone, emergency_contact_name, emergency_contact_phone')
            if (dbPatients) {
              dbPatients.forEach(p => {
                registeredMap[p.id] = p
              })
            }
          } catch {}

          Object.keys(stored).forEach(contactId => {
            const chatArray = stored[contactId] || []
            mappedMessages[contactId] = chatArray.map((m: any) => ({
              id: m.id || String(Math.random()),
              senderName: m.senderName || (m.isDoctor ? 'Dra. Aura Estudillo' : 'Paciente'),
              senderRole: m.senderRole || (m.isDoctor ? 'doctor' : 'patient'),
              channel_type: m.channel_type || m.metadata?.channel_type || (m.content?.includes('Llamada de Voz') ? 'voice_call' : 'web_chat'),
              content: m.content,
              time: m.timestamp || m.time || '11:30 a.m.',
              isOwn: Boolean(m.isDoctor),
              isPrivateNote: Boolean(m.isPrivateNote),
              metadata: m.metadata
            }))

            // Obtener último mensaje para el directorio
            const lastMsg = chatArray[chatArray.length - 1]
            const isReg = Boolean(registeredMap[contactId] || lastMsg?.isRegistered || lastMsg?.metadata?.isRegistered || !contactId.startsWith('prospect_'))
            const regData = registeredMap[contactId]

            const rawName = regData?.full_name || lastMsg?.metadata?.patientName || lastMsg?.senderName || 'Paciente'
            const cleanName = rawName.replace(/\s*\(Prospecto\)/gi, '').replace(/\s*\(.*?folio.*?\)/gi, '').trim()
            const phone = regData?.phone || lastMsg?.metadata?.phone || lastMsg?.phone || (contactId.startsWith('prospect_') ? contactId.replace('prospect_', '') : '')
            const folio = isReg ? `EXP-${contactId.slice(0, 8).toUpperCase()}` : (lastMsg?.folio || `PROS-${contactId.slice(-6).toUpperCase()}`)

            const msgText = lastMsg?.content || 'Sin mensajes'
            const isUrgent = /(?:dolor|duele|muela|urgente|emergencia|sangr|inflamad)/i.test(msgText) || lastMsg?.metadata?.urgencyLevel === 'Urgente'

            let chType: 'voice_call' | 'whatsapp' | 'web_chat' = 'web_chat'
            if (lastMsg?.channel_type) chType = lastMsg.channel_type
            else if (lastMsg?.metadata?.channel_type) chType = lastMsg.metadata.channel_type
            else if (msgText.includes('Llamada de Voz') || lastMsg?.senderName?.includes('Voice')) chType = 'voice_call'
            else if (lastMsg?.channel === 'whatsapp' || lastMsg?.metadata?.channel === 'whatsapp') chType = 'whatsapp'

            directoryList.push({
              id: contactId,
              name: cleanName || 'Paciente Sin Nombre',
              phone: phone || 'Sin teléfono',
              folio,
              isRegistered: isReg,
              channel_type: chType,
              lastMessage: msgText,
              lastTime: lastMsg?.timestamp || lastMsg?.time || 'Hoy',
              isUrgent,
              consultationReason: lastMsg?.metadata?.consultationReason,
              emergencyContact: regData?.emergency_contact_name ? `${regData.emergency_contact_name} (${regData.emergency_contact_phone || ''})` : undefined
            })
          })

          setMessages(mappedMessages)

          // Si el directorio tiene items, actualizar
          if (directoryList.length > 0) {
            setPatients(directoryList)
            // Si la URL traía un paciente específico, seleccionarlo
            if (urlPatientId && directoryList.some(p => p.id === urlPatientId)) {
              setSelectedPatientId(urlPatientId)
            } else if (!selectedPatientId) {
              setSelectedPatientId(directoryList[0].id)
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('Error cargando historial de chat:', e?.message)
    } finally {
      setLoadingPatients(false)
    }
  }

  // Carga inicial y respuesta a parámetros de URL
  useEffect(() => {
    loadOmnichannelHistory()
  }, [])

  useEffect(() => {
    if (urlPatientId) {
      setSelectedPatientId(urlPatientId)
      setUnreadPatients(prev => {
        const next = new Set(prev)
        next.delete(urlPatientId)
        return next
      })
    }
  }, [urlPatientId])

  // Scroll automático en hilo de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedPatientId])

  // 2. Suscripción a Realtime de mensajes entrantes y llamadas de voz
  useEffect(() => {
    const channel = supabase
      .channel('chat_omnichannel_sync')
      .on('broadcast', { event: 'incoming_patient_message' }, ({ payload }) => {
        if (!payload) return
        playTone('arrival')
        const targetId = payload.targetPatientId || payload.patientId || `prospect_${Date.now()}`
        const nowTime = payload.timestamp || 'Ahora'

        const incomingMsg: ChatMessageItem = {
          id: payload.id || `msg-${Date.now()}`,
          senderName: payload.senderName || 'Paciente',
          senderRole: 'patient',
          channel_type: payload.channel_type || 'web_chat',
          content: payload.content,
          time: nowTime,
          isOwn: false,
          metadata: {
            consultationReason: payload.consultationReason,
            urgencyLevel: payload.urgencyLevel,
            phone: payload.phone
          }
        }

        setMessages(prev => ({
          ...prev,
          [targetId]: [...(prev[targetId] || []), incomingMsg]
        }))

        // Actualizar o insertar paciente en el directorio
        setPatients(prev => {
          const index = prev.findIndex(p => p.id === targetId)
          const isUrgent = payload.urgencyLevel === 'Urgente' || /(?:dolor|duele|muela|urgente)/i.test(payload.content)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              lastMessage: payload.content,
              lastTime: nowTime,
              isUrgent: updated[index].isUrgent || isUrgent
            }
            return updated
          } else {
            const newPat: PatientDirectoryItem = {
              id: targetId,
              name: payload.senderName?.replace(/\(.*?prospecto.*?\)/gi, '').trim() || 'Nuevo Contacto',
              phone: payload.phone || 'Sin número',
              folio: payload.folio || (payload.isRegistered ? 'EXP-PACIENTE' : 'PROS-NUEVO'),
              isRegistered: Boolean(payload.isRegistered),
              channel_type: payload.channel_type || 'web_chat',
              lastMessage: payload.content,
              lastTime: nowTime,
              isUrgent,
              consultationReason: payload.consultationReason
            }
            return [newPat, ...prev]
          }
        })

        if (selectedPatientId !== targetId) {
          setUnreadPatients(prev => new Set(prev).add(targetId))
        }
      })
      .on('broadcast', { event: 'voice_call_event' }, ({ payload }) => {
        if (!payload) return
        const targetId = payload.targetPatientId || payload.patientId || 'prospect_voice'
        const nowTime = payload.timestamp || 'Ahora'

        if (payload.status === 'active') {
          playTone('arrival')
          const callStartMsg: ChatMessageItem = {
            id: `call-start-${Date.now()}`,
            senderName: 'Asistente de Voz (Aura AI)',
            senderRole: 'ai',
            channel_type: 'voice_call',
            content: `📞 [Llamada de Voz Iniciada]: El paciente ${payload.patientName || 'Paciente'} se encuentra en llamada de voz con Aura IA.`,
            time: nowTime,
            isOwn: false
          }
          setMessages(prev => ({
            ...prev,
            [targetId]: [...(prev[targetId] || []), callStartMsg]
          }))
          setUnreadPatients(prev => new Set(prev).add(targetId))
        } else if (payload.status === 'ended') {
          playTone('arrival')
          const voiceCard: ChatMessageItem = {
            id: `voice-ended-${Date.now()}`,
            senderName: 'Asistente de Voz (Aura AI)',
            senderRole: 'ai',
            channel_type: 'voice_call',
            content: payload.summary || `Llamada finalizada con ${payload.patientName || 'Paciente'}`,
            time: nowTime,
            isOwn: false,
            metadata: {
              channel_type: 'voice_call',
              durationSeconds: payload.durationSeconds || 45,
              consultationReason: payload.consultationReason || 'Solicitud de Cita Médica por Voz',
              urgencyLevel: payload.urgencyLevel || 'Urgente',
              transcription: payload.transcription,
              dialogue: payload.dialogue,
              summary: payload.summary,
              patientName: payload.patientName,
              phone: payload.phone
            }
          }

          setMessages(prev => ({
            ...prev,
            [targetId]: [...(prev[targetId] || []), voiceCard]
          }))

          setPatients(prev => {
            const index = prev.findIndex(p => p.id === targetId)
            if (index >= 0) {
              const updated = [...prev]
              updated[index] = {
                ...updated[index],
                lastMessage: `📞 ${payload.summary || 'Llamada de voz finalizada'}`,
                lastTime: nowTime,
                isUrgent: true,
                channel_type: 'voice_call'
              }
              return updated
            }
            return prev
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedPatientId, playTone, supabase])

  // 3. Envío de mensaje desde el panel (Respuesta médica al paciente o Nota Privada)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMessage.trim() || !selectedPatientId || sendingMessage) return

    const messageText = inputMessage.trim()
    const nowFormatted = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date())

    const newMsg: ChatMessageItem = {
      id: `doctor-${Date.now()}`,
      senderName: isPrivateNote ? 'Nota Interna (Dra. Aura)' : 'Dra. Aura Estudillo',
      senderRole: 'doctor',
      channel_type: 'web_chat',
      content: messageText,
      time: nowFormatted,
      isOwn: true,
      isPrivateNote
    }

    // Reflejo local inmediato
    setMessages(prev => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), newMsg]
    }))

    setInputMessage('')
    setSendingMessage(true)
    playTone('message')

    try {
      if (!isPrivateNote) {
        // Enviar vía /api/chat para disparar Supabase Realtime y WhatsApp dual
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: selectedPatientId,
            message: {
              id: newMsg.id,
              senderName: 'Dra. Aura Estudillo',
              senderRole: 'doctor',
              channel_type: 'web_chat',
              content: messageText,
              timestamp: nowFormatted,
              isDoctor: true
            }
          })
        })
      } else {
        // Guardar nota privada interna en el storage
        const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json')
        let allChats: Record<string, any[]> = {}
        if (file) {
          const text = await file.text()
          if (text) allChats = JSON.parse(text)
        }
        allChats[selectedPatientId] = [...(allChats[selectedPatientId] || []), {
          ...newMsg,
          timestamp: nowFormatted,
          isDoctor: true,
          isPrivateNote: true
        }]
        await supabase.storage.from('audenti_database').upload(
          'chat_omnichannel.json',
          JSON.stringify(allChats, null, 2),
          { upsert: true, contentType: 'application/json' }
        )
      }
    } catch (err: any) {
      console.warn('Error enviando mensaje:', err?.message)
    } finally {
      setSendingMessage(false)
    }
  }

  // Paciente Activo Seleccionado
  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0] || null
  const currentChatMessages = (selectedPatientId ? messages[selectedPatientId] : null) || []

  // Filtrado de la bandeja
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.phone.includes(searchTerm) ||
                          p.folio.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    if (activeFilter === 'voice_call') return p.channel_type === 'voice_call'
    if (activeFilter === 'whatsapp') return p.channel_type === 'whatsapp'
    if (activeFilter === 'web_chat') return p.channel_type === 'web_chat'
    if (activeFilter === 'urgent') return p.isUrgent
    return true
  })

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[780px]">
      {/* Barra de Estado y Control Superior */}
      <div className="bg-[#0F172A] px-6 py-3 flex items-center justify-between text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black tracking-wide uppercase text-slate-200">
              Centro Multicanal Audenti
            </span>
          </div>
          <span className="text-slate-500 text-xs">|</span>
          <span className="text-xs text-slate-300 font-medium hidden sm:inline">
            Voz Aura AI • WhatsApp Business • Web Chat
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) playTone('arrival')
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Alertas: {soundEnabled ? 'On' : 'Mute'}</span>
          </button>
        </div>
      </div>

      {/* ARQUITECTURA DE 3 PANELES */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden divide-x divide-slate-200/80">

        {/* =========================================================================
            PANEL 1 (Izquierdo - Columnas 1 a 4): FILTROS Y BANDEJA DE CANALES
        ========================================================================= */}
        <div className="col-span-12 md:col-span-4 lg:col-span-4 flex flex-col bg-slate-50/70 h-full overflow-hidden">
          {/* Filtros Superiores por Canal */}
          <div className="p-3 border-b border-slate-200/80 space-y-2 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por paciente, teléfono o folio..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
              />
            </div>

            {/* Chips de Canales y Filtros */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({patients.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('voice_call')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  activeFilter === 'voice_call'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <Phone className="w-3 h-3" />
                Voz
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('whatsapp')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  activeFilter === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('web_chat')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  activeFilter === 'web_chat'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                }`}
              >
                💬 Web
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('urgent')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  activeFilter === 'urgent'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-900 hover:bg-rose-100'
                }`}
              >
                🚨 Urgentes
              </button>
            </div>
          </div>

          {/* Lista de Conversaciones */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loadingPatients ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Sincronizando bandeja omnicanal con Supabase...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Sin mensajes en este filtro</p>
                <p className="text-[11px] text-slate-400">
                  Las llamadas de voz con Aura IA y chats de WhatsApp se registrarán aquí automáticamente.
                </p>
              </div>
            ) : (
              filteredPatients.map(patient => {
                const isSelected = selectedPatientId === patient.id
                const isUnread = unreadPatients.has(patient.id)

                return (
                  <button
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatientId(patient.id)
                      setUnreadPatients(prev => {
                        const next = new Set(prev)
                        next.delete(patient.id)
                        return next
                      })
                    }}
                    className={`w-full p-3 rounded-2xl text-left transition-all border relative cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 shadow-xs ring-1 ring-amber-300'
                        : isUnread
                        ? 'bg-rose-50/90 border-rose-300 shadow-xs ring-2 ring-rose-200'
                        : 'bg-white border-slate-200/70 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar con Canal */}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
                          patient.isUrgent ? 'bg-rose-600' : 'bg-[#0F172A]'
                        }`}>
                          {patient.name.substring(0, 2).toUpperCase()}
                        </div>
                        {/* Badge de Canal */}
                        <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-full text-[9px] shadow-xs border ${
                          patient.channel_type === 'voice_call'
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : patient.channel_type === 'whatsapp'
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-blue-500 text-white border-blue-400'
                        }`}>
                          {patient.channel_type === 'voice_call' ? '📞' : patient.channel_type === 'whatsapp' ? '📱' : '💬'}
                        </span>
                      </div>

                      {/* Info del Paciente */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {patient.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {patient.lastTime}
                          </span>
                        </div>

                        {/* Insignia: Paciente Registrado vs Prospecto Nuevo */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {patient.isRegistered ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black">
                              🟢 PACIENTE REGISTRADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black">
                              🟠 PROSPECTO NUEVO
                            </span>
                          )}

                          {patient.isUrgent && (
                            <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[9px] font-black animate-pulse">
                              🚨 URGENCIA
                            </span>
                          )}
                        </div>

                        {/* Extracto del último mensaje */}
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-snug">
                          {patient.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            PANEL 2 (Central - Columnas 5 a 9): HILO UNIFICADO DE CONVERSACIÓN
        ========================================================================= */}
        <div className="col-span-12 md:col-span-5 lg:col-span-5 flex flex-col bg-white h-full overflow-hidden">
          {/* Header del Hilo */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            {activePatient ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {activePatient.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{activePatient.name}</h3>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {activePatient.folio}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{activePatient.phone}</span>
                    <span>•</span>
                    <span className="capitalize font-semibold text-amber-700">
                      Canal: {activePatient.channel_type === 'voice_call' ? '📞 Llamada de Voz' : activePatient.channel_type === 'whatsapp' ? '📱 WhatsApp' : '💬 Chat Web'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Selecciona una conversación</span>
            )}
          </div>

          {/* Hilo de Mensajes con Render Especial para Llamadas de Voz */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {currentChatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">Sin mensajes en este hilo</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Escribe una respuesta médica o espera la interacción del paciente por voz o chat.
                </p>
              </div>
            ) : (
              currentChatMessages.map((msg, idx) => {
                const isVoice = msg.channel_type === 'voice_call' || msg.metadata?.channel_type === 'voice_call' || msg.content.includes('Llamada de Voz')
                const isDoctor = msg.isOwn || msg.senderRole === 'doctor'
                const isPrivate = msg.isPrivateNote

                // RENDER ESPECIAL DE LLAMADAS DE VOZ (Contenedor Destacado Profesional)
                if (isVoice) {
                  const dialogue = msg.metadata?.dialogue || []
                  const duration = msg.metadata?.durationSeconds || 45
                  const reason = msg.metadata?.consultationReason || 'Solicitud de Cita Médica por Voz'
                  const urgency = msg.metadata?.urgencyLevel || 'Urgente'

                  return (
                    <div key={msg.id || idx} className="w-full my-3 p-4 rounded-3xl bg-[#0F172A] text-white border-2 border-amber-400/80 shadow-xl space-y-3">
                      {/* Encabezado de la Tarjeta de Voz */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                              📞 Llamada de Voz (Aura AI)
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Duración: {Math.floor(duration / 60)}m {duration % 60}s • {msg.time}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          urgency === 'Urgente'
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          🚨 {urgency}
                        </span>
                      </div>

                      {/* Motivo de Consulta Sintetizado */}
                      <div className="bg-slate-900/90 p-3 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-xs text-slate-300">
                          🎯 <strong>Motivo Identificado:</strong> <span className="text-white font-bold">{reason}</span>
                        </p>
                        {msg.metadata?.summary && (
                          <p className="text-[11px] text-slate-400 pt-1 leading-snug">
                            {msg.metadata.summary}
                          </p>
                        )}
                      </div>

                      {/* Diálogo / Transcripción Completa */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Transcripción Completa del Diálogo:
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {dialogue.length > 0 ? (
                            dialogue.map((turn, tIdx) => (
                              <div
                                key={tIdx}
                                className={`p-2 rounded-xl text-xs leading-relaxed ${
                                  turn.role === 'user'
                                    ? 'bg-slate-800/80 border border-slate-700 text-slate-200'
                                    : 'bg-amber-400/10 border border-amber-400/30 text-amber-200'
                                }`}
                              >
                                <span className="font-bold block text-[10px] opacity-75 uppercase">
                                  {turn.role === 'user' ? (msg.metadata?.patientName || activePatient?.name || 'Paciente') : 'Aura AI'}:
                                </span>
                                {turn.text}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-300 italic p-2.5 bg-slate-800/60 rounded-xl">
                              &ldquo;{msg.content}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                // BURBUJAS DE MENSAJES ORDINARIOS (Doctor o Paciente)
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${isDoctor ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {msg.senderName}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {msg.time}
                      </span>
                      {isPrivate && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Nota Privada
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                        isPrivate
                          ? 'bg-amber-50 border-2 border-amber-300 text-amber-950 font-medium'
                          : isDoctor
                          ? 'bg-[#0F172A] text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Editor Inferior con Selector de Respuesta / Nota Privada */}
          <div className="p-3 border-t border-slate-200/80 bg-white space-y-2">
            {/* Selector: Respuesta al Paciente vs Nota Privada Interna */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrivateNote(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !isPrivateNote
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                💬 Respuesta al Paciente
              </button>
              <button
                type="button"
                onClick={() => setIsPrivateNote(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isPrivateNote
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Lock className="w-3 h-3" />
                Nota Privada Interna
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder={
                  isPrivateNote
                    ? 'Escribe una nota interna para el equipo médico (no visible al paciente)...'
                    : `Responder a ${activePatient?.name || 'paciente'} por WhatsApp o Chat Web...`
                }
                className={`flex-1 px-4 py-2.5 rounded-2xl border text-xs focus:outline-none transition-all ${
                  isPrivateNote
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950 focus:ring-2 focus:ring-amber-400 placeholder:text-amber-800/50'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#0F172A] focus:bg-white'
                }`}
              />

              <button
                type="submit"
                disabled={sendingMessage || !inputMessage.trim()}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${
                  isPrivateNote
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-[#0F172A] hover:bg-slate-800 text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        </div>

        {/* =========================================================================
            PANEL 3 (Derecho - Columnas 10 a 12): FICHA CLÍNICA & ACCIONES RÁPIDAS
        ========================================================================= */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3 flex flex-col bg-slate-50/60 h-full overflow-y-auto p-4 space-y-5">
          {activePatient ? (
            <>
              {/* Resumen del Perfil */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-black text-xl mx-auto shadow-sm">
                  {activePatient.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{activePatient.name}</h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500 block">
                    Folio: {activePatient.folio}
                  </span>
                </div>
                <div className="pt-1">
                  {activePatient.isRegistered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                      🟢 Paciente Registrado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                      🟠 Prospecto Nuevo
                    </span>
                  )}
                </div>
              </div>

              {/* Datos de Contacto */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Datos de Contacto
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Teléfono Principal:</span>
                    <span className="font-mono font-bold text-slate-800">{activePatient.phone}</span>
                  </div>
                  {activePatient.emergencyContact && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Contacto de Emergencia:</span>
                      <span className="font-medium text-slate-700">{activePatient.emergencyContact}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sede de Atención:</span>
                    <span className="font-medium text-slate-700">Sucursal Valbuena (Matriz)</span>
                  </div>
                </div>
              </div>

              {/* Acciones Clínicas Directas */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Acciones Rápidas
                </h4>

                <Link
                  href={`/dashboard/calendar?patientId=${encodeURIComponent(activePatient.id)}`}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Agendar Cita
                  </span>
                  <ChevronRight className="w-4 h-4 text-amber-500" />
                </Link>

                <Link
                  href={activePatient.isRegistered ? `/dashboard/expediente?patientId=${encodeURIComponent(activePatient.id)}` : `/dashboard/pacientes`}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    Abrir Expediente
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    playTone('message')
                    alert(`El caso de ${activePatient.name} ha sido marcado como atendido y resuelto.`)
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Marcar como Resuelto
                  </span>
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Selecciona un paciente para ver su ficha clínica.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
