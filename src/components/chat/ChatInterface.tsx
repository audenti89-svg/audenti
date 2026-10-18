'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Users,
  HeartHandshake,
  Stethoscope,
  Receipt,
  MessageSquare,
  Shield,
  Search,
  Send,
  Paperclip,
  Video,
  MoreVertical,
  QrCode,
  Share2,
  CheckCheck,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  CheckSquare,
  Square,
  UserPlus,
  SendHorizontal,
  ChevronRight,
  TrendingUp,
  User,
  Radio
} from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'

type ChatTab = 'external' | 'internal' | 'aura_ai_history'
type InternalSubTab = 'peer' | 'specialty_board' | 'reception' | 'management'

interface ReferralPerson {
  id: string
  name: string
  code: string
  ltvContributed: number
  status: 'active' | 'in_treatment' | 'completed'
}

interface FamilyMember {
  id: string
  name: string
  relationship: string
  lastVisit: string
  age?: number
}

interface PatientDetails {
  id: string
  name: string
  phone: string
  photo?: string
  referrer?: {
    name: string
    code: string
    avatar: string
  }
  referralsMade: ReferralPerson[]
  familyMembers: FamilyMember[]
}

interface Message {
  id: string
  senderName: string
  senderInitials: string
  content: string
  time: string
  isOwn: boolean
  isCascadeNotice?: boolean
}

import { createClient } from '@/utils/supabase/client'

export function ChatInterface() {
  const { soundEnabled, setSoundEnabled, playTone } = useNotificationSound()
  const supabase = createClient()

  // Tabs y Navegación
  const [mainTab, setMainTab] = useState<ChatTab>('external')
  const [internalTab, setInternalTab] = useState<InternalSubTab>('peer')

  // Pacientes reales cargados de Supabase
  const [patients, setPatients] = useState<PatientDetails[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)

  // Paciente seleccionado
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Selección múltiple para envíos en conjunto (Familiares + Referidos)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'family_only' | 'referrals_only' | 'custom'>('custom')

  // Canal interno seleccionado
  const [selectedInternalTarget, setSelectedInternalTarget] = useState('Interconsulta Médica')

  // Mensajería dinámica
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [unreadPatients, setUnreadPatients] = useState<Set<string>>(new Set())

  // Historial de Conversaciones de Aura AI (CRM Directo)
  const [auraAiSessions, setAuraAiSessions] = useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [loadingAuraSessions, setLoadingAuraSessions] = useState(false)

  const fetchAuraAiHistory = async () => {
    try {
      setLoadingAuraSessions(true)
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, phone, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        const sessions = data.map((p: any) => ({
          sessionId: p.id,
          patientName: p.full_name,
          phone: p.phone,
          timestamp: p.created_at
        }))
        setAuraAiSessions(sessions)
        if (!selectedSessionId && sessions.length > 0) {
          setSelectedSessionId(sessions[0].sessionId)
        }
      }
    } catch (e) {
      console.warn('Error fetching Aura AI history:', e)
    } finally {
      setLoadingAuraSessions(false)
    }
  }

  useEffect(() => {
    fetchAuraAiHistory()
  }, [])

  useEffect(() => {
    async function loadChatPatients() {
      setLoadingPatients(true)
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, full_name, phone, emergency_contact_name, emergency_contact_phone')
          .order('created_at', { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          const mapped: PatientDetails[] = data.map(p => ({
            id: p.id,
            name: p.full_name || 'Paciente sin nombre',
            phone: p.phone || 'Sin teléfono',
            referrer: undefined,
            referralsMade: [],
            familyMembers: p.emergency_contact_name ? [
              {
                id: `fam-${p.id}`,
                name: p.emergency_contact_name,
                relationship: 'Contacto de Emergencia',
                lastVisit: p.emergency_contact_phone || 'Registrado en ficha',
              }
            ] : []
          }))
          setPatients(mapped)
          setSelectedPatientId(mapped[0].id)
        } else {
          setPatients([])
          setSelectedPatientId('')
        }
      } catch (err) {
        console.warn('Nota en chat pacientes:', err)
        setPatients([])
        setSelectedPatientId('')
      } finally {
        setLoadingPatients(false)
      }
    }

    loadChatPatients()
  }, [])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activePatient = patients.find(p => p.id === selectedPatientId) || null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedPatientId, mainTab, internalTab])

  // Manejo de checkboxes de selección de familiares y referidos
  const toggleRecipient = (name: string) => {
    setSelectedRecipients(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  const selectAllFamily = () => {
    if (!activePatient) return
    const famNames = activePatient.familyMembers.map(m => m.name)
    setSelectedRecipients(famNames)
    setBroadcastTarget('family_only')
  }

  const selectAllReferrals = () => {
    if (!activePatient) return
    const refNames = activePatient.referralsMade.map(r => r.name)
    setSelectedRecipients(refNames)
    setBroadcastTarget('referrals_only')
  }

  const clearSelection = () => {
    setSelectedRecipients([])
    setBroadcastTarget('custom')
  }

  // Cargar mensajes persistidos de cada paciente desde chat_omnichannel.json
  const loadStoredOmnichannelMessages = async () => {
    try {
      const { data: file } = await supabase.storage
        .from('audenti_database')
        .download('chat_omnichannel.json')

      if (file) {
        const text = await file.text()
        if (text && text.trim()) {
          const stored = JSON.parse(text)
          const mapped: Record<string, Message[]> = {}
          Object.keys(stored).forEach(patId => {
            mapped[patId] = (stored[patId] || []).map((m: any) => ({
              id: m.id || String(Math.random()),
              senderName: m.senderName,
              senderInitials: m.isDoctor ? 'AE' : 'PAC',
              content: m.content,
              time: m.timestamp,
              isOwn: m.isDoctor
            }))
          })
          setMessages(prev => ({ ...prev, ...mapped }))
        }
      }
    } catch {}
  }

  useEffect(() => {
    loadStoredOmnichannelMessages()

    // Escucha en tiempo real de mensajes entrantes del paciente
    const channel = supabase
      .channel('chat_omnichannel_sync')
      .on('broadcast', { event: 'incoming_patient_message' }, ({ payload }) => {
        if (payload && payload.targetPatientId) {
          playTone('arrival')
          const incomingMsg: Message = {
            id: payload.id || String(Date.now()),
            senderName: payload.senderName || 'Paciente',
            senderInitials: 'PAC',
            content: payload.content,
            time: payload.timestamp || 'Ahora',
            isOwn: false
          }

          setMessages(prev => ({
            ...prev,
            [payload.targetPatientId]: [...(prev[payload.targetPatientId] || []), incomingMsg]
          }))

          // Si el paciente no es el que actualmente está seleccionado con el chat abierto, o para dar alerta visible
          setUnreadPatients(prev => {
            const next = new Set(prev)
            next.add(payload.targetPatientId)
            return next
          })
        }
      })
      .on('broadcast', { event: 'voice_call_event' }, ({ payload }) => {
        if (payload && payload.patientId) {
          if (payload.status === 'active') {
            playTone('arrival')
            const callNotice: Message = {
              id: `call-start-${Date.now()}`,
              senderName: 'Asistente de Voz Aura IA',
              senderInitials: 'IA',
              content: `📞 [Llamada de Voz Iniciada]: El paciente ${payload.patientName || 'Ricardo Sánchez'} ha iniciado una conversación de voz con Aura IA.`,
              time: payload.timestamp || 'Ahora',
              isOwn: false
            }
            setMessages(prev => ({
              ...prev,
              [payload.patientId]: [...(prev[payload.patientId] || []), callNotice]
            }))
            setUnreadPatients(prev => {
              const next = new Set(prev)
              next.add(payload.patientId)
              return next
            })
          } else if (payload.status === 'ended') {
            playTone('message')
            const callSummary: Message = {
              id: `call-end-${Date.now()}`,
              senderName: 'Resumen Aura IA Voice',
              senderInitials: 'IA',
              content: `🎙️ [Llamada Finalizada]: ${payload.summary || 'Consulta por voz concluida con el paciente.'}`,
              time: payload.timestamp || 'Ahora',
              isOwn: false
            }
            setMessages(prev => ({
              ...prev,
              [payload.patientId]: [...(prev[payload.patientId] || []), callSummary]
            }))
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [playTone, supabase])

  // Enviar mensaje desde el panel de la doctora hacia el portal del paciente
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    playTone('message')

    const messageText = inputMessage.trim()
    const nowFormatted = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date())

    const newMsg: Message = {
      id: Date.now().toString(),
      senderName: 'Dra. Aura Estudillo',
      senderInitials: 'AE',
      content: messageText,
      time: nowFormatted,
      isOwn: true,
      isCascadeNotice: selectedRecipients.length > 0
    }

    const currentKey = mainTab === 'external' ? selectedPatientId : `internal-${internalTab}`

    setMessages(prev => ({
      ...prev,
      [currentKey]: [...(prev[currentKey] || []), newMsg]
    }))

    setInputMessage('')

    // Si es chat con paciente externo, persistir y emitir evento Realtime al paciente
    if (mainTab === 'external' && selectedPatientId) {
      try {
        const payloadMsg = {
          id: newMsg.id,
          senderName: 'Dra. Aura Estudillo',
          senderRole: 'doctor',
          content: messageText,
          timestamp: nowFormatted,
          isDoctor: true,
          targetPatientId: selectedPatientId
        }

        // 1. Guardar en Storage (chat_omnichannel.json)
        try {
          const { data: file } = await supabase.storage.from('audenti_database').download('chat_omnichannel.json')
          let allChats: Record<string, any[]> = {}
          if (file) {
            const text = await file.text()
            if (text) allChats = JSON.parse(text)
          }
          allChats[selectedPatientId] = [...(allChats[selectedPatientId] || []), payloadMsg]
          await supabase.storage.from('audenti_database').upload(
            'chat_omnichannel.json',
            JSON.stringify(allChats, null, 2),
            { upsert: true, contentType: 'application/json' }
          )
        } catch {}

        // 2. Disparar Realtime hacia el canal exclusivo del paciente
        await supabase.channel(`patient_chat_${selectedPatientId}`).send({
          type: 'broadcast',
          event: 'doctor_reply',
          payload: payloadMsg
        })

        // 3. Disparar Realtime en canal de sincronización global
        await supabase.channel('chat_omnichannel_sync').send({
          type: 'broadcast',
          event: 'sync_patient_message',
          payload: payloadMsg
        })
      } catch (err: any) {
        console.warn('Error sincronizando mensaje de la doctora:', err?.message)
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[760px]">
      {/* Barra Superior de Control Omni-Canal & Alertas Sonoras */}
      <div className="bg-[#202D4C] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMainTab('external')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'external' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            A. Pacientes &amp; Familias
          </button>

          <button
            type="button"
            onClick={() => setMainTab('internal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'internal' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            B. Staff Interno
          </button>

          <button
            type="button"
            onClick={() => setMainTab('aura_ai_history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'aura_ai_history' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            C. Historial Aura AI (Pacientes Web &amp; Urgencias)
            {auraAiSessions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
                {auraAiSessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Controles de Sonido Web Audio API & Notificaciones */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) playTone('arrival')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Alertas Sonoras: {soundEnabled ? 'Activas' : 'Mute'}</span>
          </button>

          <button
            type="button"
            onClick={() => playTone('arrival')}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200"
            title="Probar sonido de llegada de paciente"
          >
            <Bell className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Cuerpo Principal Dividido */}
      <div className="flex-1 flex overflow-hidden">
        {/* =========================================================================
            COLUMNA IZQUIERDA: DIRECTORIO O JERARQUÍA SEGÚN TAB
        ========================================================================= */}
        <div className="w-80 border-r border-slate-200/80 flex flex-col shrink-0 bg-slate-50/50">
          {mainTab === 'external' ? (
            // Directorio de Pacientes
            <>
              <div className="p-3.5 border-b border-slate-200/80">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar paciente o código de red..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loadingPatients ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Cargando pacientes de Supabase...
                  </div>
                ) : patients.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Sin pacientes en la base</p>
                    <p className="text-[11px] text-slate-500">
                      No hay pacientes registrados todavía. El canal omni-canal iniciará en cuanto registres un paciente.
                    </p>
                  </div>
                ) : (
                  patients
                    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm))
                    .map(p => {
                      const isSelected = selectedPatientId === p.id
                      const isUnread = unreadPatients.has(p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setSelectedRecipients([]);
                            setUnreadPatients(prev => {
                              const next = new Set(prev)
                              next.delete(p.id)
                              return next
                            })
                          }}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all relative ${
                            isUnread
                              ? 'bg-rose-50/90 border-2 border-rose-400 shadow-md ring-2 ring-rose-200'
                              : isSelected
                              ? 'bg-amber-100/70 border border-amber-300 shadow-2xs'
                              : 'hover:bg-white border border-transparent'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isUnread ? 'bg-rose-600 animate-pulse' : 'bg-[#202D4C]'
                          }`}>
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                              {isUnread ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-white font-bold bg-rose-600 px-2 py-0.5 rounded-full shadow-xs animate-bounce">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                  Nuevo
                                </span>
                              ) : p.familyMembers.length > 0 ? (
                                <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 rounded">
                                  {p.familyMembers.length} contactos
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[11px] text-slate-500 block">{p.phone}</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold">
                              {isUnread ? (
                                <span className="text-rose-600 flex items-center gap-1">
                                  <Radio className="w-3 h-3 animate-spin" />
                                  ¡Mensaje entrante pendiente!
                                </span>
                              ) : (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Expediente Activo
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })
                )}
              </div>
            </>
          ) : mainTab === 'aura_ai_history' ? (
            // Directorio de Sesiones Web con Aura AI
            <>
              <div className="p-3.5 border-b border-slate-200/80 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wide">Sesiones Web Aura AI</span>
                </div>
                <button
                  onClick={fetchAuraAiHistory}
                  className="text-[10px] text-amber-300 hover:underline font-mono"
                >
                  Refrescar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {loadingAuraSessions && auraAiSessions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Sincronizando chats de pacientes con Aura AI...
                  </div>
                ) : auraAiSessions.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Sin conversaciones registradas</p>
                    <p className="text-[11px] text-slate-500">
                      Cuando un paciente interactúe con el widget web de Aura AI, la conversación se registrará aquí en tiempo real.
                    </p>
                  </div>
                ) : (
                  auraAiSessions.map(session => {
                    const isSelected = selectedSessionId === session.sessionId
                    const isRedAlert = session.urgencyLevel === 'red'
                    const isYellowAlert = session.urgencyLevel === 'yellow'

                    return (
                      <button
                        key={session.sessionId}
                        onClick={() => setSelectedSessionId(session.sessionId)}
                        className={`w-full p-3 rounded-xl text-left transition-all border ${
                          isSelected
                            ? 'bg-amber-100/80 border-amber-400 shadow-2xs'
                            : isRedAlert
                            ? 'bg-rose-50/70 border-rose-300 hover:bg-rose-100/50'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {isRedAlert && '🔴 '}{isYellowAlert && '🟡 '}
                            {session.patientName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {session.lastTimestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                          "{session.lastMessage}"
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                          <span className="font-mono text-slate-500 font-semibold">{session.phone}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
                            {session.messageCount} msgs
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            // Jerarquía Interna
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block">
                Jerarquía Organizacional
              </span>

              {[
                { id: 'peer', label: 'Colega a Colega (Interconsulta)', desc: 'Chat privado médico', icon: Stethoscope, unread: 1 },
                { id: 'specialty_board', label: 'Junta de Especialistas', desc: 'Ortodoncia + Cirugía + Prótesis', icon: Users, unread: 0 },
                { id: 'reception', label: 'Canal Directo Recepción', desc: 'Avisos de sala y sillón', icon: Radio, unread: 2 },
                { id: 'management', label: 'Alto Mando (Dirección/Dueño)', desc: 'Reportes de gastos y equipo', icon: Shield, unread: 0 },
              ].map(sub => {
                const Icon = sub.icon
                const isSelected = internalTab === sub.id
                return (
                  <button
                    key={sub.id}
                    onClick={() => setInternalTab(sub.id as InternalSubTab)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected ? 'bg-amber-100/70 border border-amber-300 shadow-2xs' : 'hover:bg-white border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-800 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{sub.label}</span>
                        {sub.unread > 0 && (
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                            {sub.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{sub.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            COLUMNA CENTRAL: CHAT ACTIVO Y MENSAJERÍA MULTIDIRECCIONAL
        ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200/80">
          {/* Cabecera del chat */}
          <div className="h-16 px-6 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-slate-50/30">
            <div>
              {mainTab === 'aura_ai_history' ? (
                (() => {
                  const currentSession = auraAiSessions.find(s => s.sessionId === selectedSessionId)
                  return (
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {currentSession ? currentSession.patientName : 'Historial de Chat Aura AI'}
                        </h3>
                        {currentSession?.urgencyLevel === 'red' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            🔴 Urgencia 24/7 (Fast-Track)
                          </span>
                        )}
                        {currentSession?.urgencyLevel === 'yellow' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🟡 Cita Prioritaria
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {currentSession?.phone || 'Sin WhatsApp'} • ID de Sesión: {selectedSessionId || 'Ninguna'}
                      </p>
                    </div>
                  )
                })()
              ) : mainTab === 'external' ? (
                activePatient ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{activePatient.name}</h3>
                      {selectedRecipients.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Envío en conjunto a {selectedRecipients.length} personas
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{activePatient.phone} • Trazabilidad activa</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-slate-900">Canal de Pacientes</h3>
                    <p className="text-[11px] text-slate-500">Selecciona o da de alta un paciente para iniciar conversación</p>
                  </>
                )
              ) : (
                <>
                  <h3 className="text-sm font-bold text-slate-900">
                    {internalTab === 'peer' ? selectedInternalTarget :
                     internalTab === 'specialty_board' ? 'Junta Médica Multidisciplinaria' :
                     internalTab === 'reception' ? 'Recepción Central & Asistencia' : 'Dirección General & Dueño'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Canal encriptado interno de alta disponibilidad</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Videollamada">
                <Video className="w-4 h-4" />
              </button>
              <button type="button" className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
            {mainTab === 'aura_ai_history' ? (
              (() => {
                const currentSession = auraAiSessions.find(s => s.sessionId === selectedSessionId)
                const sessionMsgs = currentSession?.messages || []

                if (sessionMsgs.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">Selecciona una sesión de Aura AI</h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Selecciona cualquier conversación de la lista lateral para inspeccionar el historial completo de mensajes entre el paciente y Aura AI.
                      </p>
                    </div>
                  )
                }

                return sessionMsgs.map((msg: any) => {
                  const isUser = msg.sender === 'user'
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${
                        isUser ? 'bg-amber-400 text-slate-950' : 'bg-cyan-700 text-white'
                      }`}>
                        {isUser ? 'PAC' : 'AI'}
                      </div>
                      <div className={`max-w-[78%] space-y-1 ${isUser ? 'items-end' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700 pl-1">
                            {isUser ? (msg.patientName || 'Paciente') : 'Aura AI (Asistente Virtual)'}
                          </span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-xs'
                            : 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs'
                        }`}>
                          {msg.messageText}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${isUser ? 'justify-end pr-1' : 'pl-1'}`}>
                          <span>{msg.timestamp} hrs</span>
                          {isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()
            ) : ((mainTab === 'external' ? messages[selectedPatientId] : messages[`internal-${internalTab}`]) || []).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Canal en Blanco (Sin Mensajes)</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  {mainTab === 'external'
                    ? activePatient
                      ? `Inicia la conversación clínica directa con ${activePatient.name}. Los mensajes se sincronizan en tiempo real.`
                      : 'No hay paciente seleccionado. Elige un paciente del directorio izquierdo o da de alta uno nuevo.'
                    : 'Canal interno de comunicación clínica. Escribe un mensaje para coordinar con el equipo dental.'}
                </p>
              </div>
            ) : (
              (messages[mainTab === 'external' ? selectedPatientId : `internal-${internalTab}`] || []).map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${
                    msg.isOwn ? 'bg-amber-400 text-slate-950' : 'bg-[#202D4C] text-white'
                  }`}>
                    {msg.senderInitials}
                  </div>
                  <div className={`max-w-[75%] space-y-1 ${msg.isOwn ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2">
                      {!msg.isOwn && (
                        <span className="text-[11px] font-bold text-slate-700 pl-1">{msg.senderName}</span>
                      )}
                      {msg.isCascadeNotice && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded-md">
                          Difusión en Conjunto
                        </span>
                      )}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      msg.isOwn
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${msg.isOwn ? 'justify-end pr-1' : 'pl-1'}`}>
                      <span>{msg.time}</span>
                      {msg.isOwn && <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de Entrada y Destinatarios Dinámicos */}
          <div className="p-4 border-t border-slate-200/80 bg-white">
            {mainTab === 'external' && selectedRecipients.length > 0 && (
              <div className="mb-2 p-2 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs">
                <span className="text-amber-950 font-medium">
                  Enviando en conjunto a: <strong>{selectedRecipients.join(', ')}</strong>
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-amber-800 hover:underline font-bold text-xs"
                >
                  Limpiar selección
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button type="button" className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  selectedRecipients.length > 0
                    ? `Enviar mensaje grupal a ${selectedRecipients.length} personas...`
                    : activePatient
                    ? `Escribe un mensaje para ${activePatient.name}...`
                    : 'Escribe un mensaje para el canal...'
                }
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="p-2.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors disabled:opacity-40 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMNA DERECHA: SELECCIÓN DINÁMICA DE RED, FAMILIA Y CHECKBOXES
        ========================================================================= */}
        {mainTab === 'external' && (
          <div className="w-88 p-5 space-y-5 overflow-y-auto bg-slate-50/70 shrink-0 border-l border-slate-200/80 hidden xl:block">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                Ficha de Red Relacional &amp; Familias
              </span>
              <h4 className="text-sm font-bold text-slate-900">Selección Dinámica de Destinatarios</h4>
            </div>

            {!activePatient ? (
              <div className="p-6 text-center space-y-2 bg-white rounded-xl border border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Sin paciente activo</p>
                <p className="text-[11px] text-slate-500">
                  Selecciona un paciente del directorio para visualizar sus contactos de emergencia o familiares asociados.
                </p>
              </div>
            ) : (
              <>
                {/* Origen / Embajador */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origen / Registro</span>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                      {activePatient.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{activePatient.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Folio: AUD-{activePatient.id.slice(0, 6).toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* 1. Contacto Familiar / Emergencia con Checkboxes */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Contactos Registrados ({activePatient.familyMembers.length})</span>
                    {activePatient.familyMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={selectAllFamily}
                        className="text-[11px] font-bold text-amber-800 hover:underline"
                      >
                        Seleccionar Todo
                      </button>
                    )}
                  </div>

                  {activePatient.familyMembers.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-xs text-center">
                      Sin familiares o contacto de emergencia registrado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activePatient.familyMembers.map(m => {
                        const isChecked = selectedRecipients.includes(m.name)
                        return (
                          <div
                            key={m.id}
                            onClick={() => toggleRecipient(m.name)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isChecked ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">{m.name}</span>
                                <span className="text-[10px] text-slate-500">{m.relationship} • {m.lastVisit}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
