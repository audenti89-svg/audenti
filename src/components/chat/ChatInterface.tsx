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

type ChatTab = 'external' | 'internal'
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

const PATIENTS_MOCK: PatientDetails[] = [
  {
    id: 'p-1',
    name: 'Mateo Morales Ruiz',
    phone: '+52 55 4444 8821',
    referrer: {
      name: 'Ricardo Pérez Gómez',
      code: 'RP-8812',
      avatar: 'RP'
    },
    referralsMade: [
      { id: 'ref-1', name: 'Roberto Garza', code: 'RG-6419', ltvContributed: 18500, status: 'in_treatment' },
      { id: 'ref-2', name: 'Laura Patricia Vega', code: 'LV-9921', ltvContributed: 12500, status: 'completed' },
      { id: 'ref-3', name: 'Daniela Montes', code: 'DM-1104', ltvContributed: 7000, status: 'active' },
    ],
    familyMembers: [
      { id: 'f-1', name: 'Sofía Hernández', relationship: 'Cónyuge / Esposa', lastVisit: 'Hace 2 semanas', age: 31 },
      { id: 'f-2', name: 'Mateo Morales Jr.', relationship: 'Hijo', lastVisit: 'Hace 1 mes', age: 8 },
      { id: 'f-3', name: 'Elena Ruiz', relationship: 'Madre', lastVisit: 'Hace 6 meses', age: 58 },
      { id: 'f-4', name: 'Javier Morales', relationship: 'Hermano', lastVisit: 'Hace 3 meses', age: 35 },
    ]
  },
  {
    id: 'p-2',
    name: 'Mariana Ruíz',
    phone: '+52 55 9821 4455',
    referrer: {
      name: 'Campaña QR Instagram (Sede Roma)',
      code: 'QR-IG-ROMA',
      avatar: 'QR'
    },
    referralsMade: [
      { id: 'ref-4', name: 'Valeria López', code: 'VL-5502', ltvContributed: 8400, status: 'active' }
    ],
    familyMembers: [
      { id: 'f-5', name: 'Patricia Vega Ruíz', relationship: 'Hermana', lastVisit: 'Ayer', age: 29 },
      { id: 'f-6', name: 'Dr. Alberto Ruíz', relationship: 'Padre', lastVisit: 'Hace 4 meses', age: 62 },
    ]
  }
]

export function ChatInterface() {
  const { soundEnabled, setSoundEnabled, playTone } = useNotificationSound()

  // Tabs y Navegación
  const [mainTab, setMainTab] = useState<ChatTab>('external')
  const [internalTab, setInternalTab] = useState<InternalSubTab>('peer')

  // Paciente seleccionado
  const [selectedPatientId, setSelectedPatientId] = useState('p-1')
  const [searchTerm, setSearchTerm] = useState('')

  // Selección múltiple para envíos en conjunto (Familiares + Referidos)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'family_only' | 'referrals_only' | 'custom'>('custom')

  // Canal interno seleccionado
  const [selectedInternalTarget, setSelectedInternalTarget] = useState('Dr. Ramírez (Ortodoncista)')

  // Mensajería
  const [inputMessage, setInputMessage] = useState('')
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    'p-1': [
      { id: '1', senderName: 'Mateo Morales Ruiz', senderInitials: 'MM', content: 'Buenas tardes Dra. Sofía, ¿cómo vamos con el reporte de la endodoncia?', time: '10:00 AM', isOwn: false },
      { id: '2', senderName: 'Dra. Sofía Valero', senderInitials: 'SV', content: 'Hola Mateo, la instrumentación de los dos primeros conductos quedó perfecta. La próxima cita sellamos con termoplástica.', time: '10:04 AM', isOwn: true },
    ],
    'internal-peer': [
      { id: '3', senderName: 'Dr. Ramírez (Ortodoncista)', senderInitials: 'DR', content: 'Dra. Sofía, ¿revisaste el caso de la mordida cruzada de Mariana Ruíz? Creo que podemos alinear sin extracciones.', time: '09:30 AM', isOwn: false },
      { id: '4', senderName: 'Dra. Sofía Valero', senderInitials: 'SV', content: 'Coincido colega. Con los aditamentos interproximales ganamos los 3.5mm necesarios sin tocar premolares.', time: '09:35 AM', isOwn: true },
    ],
    'internal-reception': [
      { id: '5', senderName: 'Recepción Central', senderInitials: 'RC', content: 'Dra. Valero: Mateo Morales ya se encuentra en sala de espera. Firmó su consentimiento digital.', time: '09:50 AM', isOwn: false },
    ],
    'internal-management': [
      { id: '6', senderName: 'Administración & Dueño', senderInitials: 'AD', content: 'Se aprobó la compra del lote de fresas piezoeléctricas para cirugías complejas de fin de mes.', time: 'Ayer', isOwn: false },
    ]
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activePatient = PATIENTS_MOCK.find(p => p.id === selectedPatientId) || PATIENTS_MOCK[0]

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
    const famNames = activePatient.familyMembers.map(m => m.name)
    setSelectedRecipients(famNames)
    setBroadcastTarget('family_only')
  }

  const selectAllReferrals = () => {
    const refNames = activePatient.referralsMade.map(r => r.name)
    setSelectedRecipients(refNames)
    setBroadcastTarget('referrals_only')
  }

  const clearSelection = () => {
    setSelectedRecipients([])
    setBroadcastTarget('custom')
  }

  // Enviar mensaje
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    playTone('message')

    const newMsg: Message = {
      id: Date.now().toString(),
      senderName: 'Dra. Aura Estudillo',
      senderInitials: 'AE',
      content: inputMessage.trim(),
      time: new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
      isOwn: true,
      isCascadeNotice: selectedRecipients.length > 0
    }

    const currentKey = mainTab === 'external' ? selectedPatientId : `internal-${internalTab}`

    setMessages(prev => ({
      ...prev,
      [currentKey]: [...(prev[currentKey] || []), newMsg]
    }))

    setInputMessage('')
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
            A. Pacientes, Red de Referidos &amp; Familias
          </button>

          <button
            type="button"
            onClick={() => setMainTab('internal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mainTab === 'internal' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            B. Jerarquía Interna &amp; Staff
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
                {PATIENTS_MOCK.map(p => {
                  const isSelected = selectedPatientId === p.id
                  const totalReferralLtv = p.referralsMade.reduce((sum, r) => sum + r.ltvContributed, 0)
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPatientId(p.id); setSelectedRecipients([]); }}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                        isSelected ? 'bg-amber-100/70 border border-amber-300 shadow-2xs' : 'hover:bg-white border border-transparent'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#202D4C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 rounded">
                            {p.familyMembers.length} familiares
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">{p.phone}</span>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-700 font-bold">
                          <TrendingUp className="w-3 h-3" />
                          <span>LTV Red: ${totalReferralLtv.toLocaleString('es-MX')} MXN</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
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
              {mainTab === 'external' ? (
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
            {(messages[mainTab === 'external' ? selectedPatientId : `internal-${internalTab}`] || []).map(msg => (
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
            ))}
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
                    : `Escribe un mensaje para ${activePatient.name}...`
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

            {/* Quién lo Recomendó */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origen / Embajador</span>
              {activePatient.referrer ? (
                <div className="flex items-center gap-2.5 pt-0.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                    {activePatient.referrer.avatar}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{activePatient.referrer.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Folio: {activePatient.referrer.code}</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Sin referidor registrado</span>
              )}
            </div>

            {/* 1. Núcleo Familiar con Checkboxes */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Núcleo Familiar ({activePatient.familyMembers.length})</span>
                <button
                  type="button"
                  onClick={selectAllFamily}
                  className="text-[11px] font-bold text-amber-800 hover:underline"
                >
                  Seleccionar Todo
                </button>
              </div>

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
                      {m.age && <span className="text-[10px] text-slate-400 font-medium">{m.age}a</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. Red de Referidos que él ha Traído */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Amistades Recomendadas ({activePatient.referralsMade.length})</span>
                  <span className="text-[10px] text-slate-500">Traídos por su código QR</span>
                </div>
                <button
                  type="button"
                  onClick={selectAllReferrals}
                  className="text-[11px] font-bold text-amber-800 hover:underline"
                >
                  Seleccionar Todo
                </button>
              </div>

              <div className="space-y-2">
                {activePatient.referralsMade.map(r => {
                  const isChecked = selectedRecipients.includes(r.name)
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRecipient(r.name)}
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
                          <span className="text-xs font-bold text-slate-900 block">{r.name}</span>
                          <span className="text-[10px] text-emerald-700 font-bold">LTV: ${r.ltvContributed.toLocaleString('es-MX')}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                        {r.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
