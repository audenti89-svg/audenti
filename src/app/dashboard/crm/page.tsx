'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus,
  TrendingUp,
  ThumbsUp,
  RotateCcw,
  UserX,
  Mail,
  Calendar,
  Stethoscope,
  Receipt,
  Activity,
  CheckCircle,
  MessageCircle,
  Clock,
  Sparkles,
  Copy,
  Send,
  Sparkle,
  ArrowRight,
  ShieldAlert,
  Info,
  RefreshCw,
  Users,
  Filter,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  Building2,
  Headphones,
  Volume2,
  VolumeX,
  AlertTriangle,
  Lightbulb,
  Search,
  FolderOpen
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'

type CrmStage = 'all' | 'contacto_inicial' | 'cita_valoracion' | 'primera_atencion' | 'presupuesto_enviado' | 'tratamiento_activo' | 'paciente_fiel'

export default function CrmPage() {
  const [copied, setCopied] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [appointmentsCount, setAppointmentsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [activeStageFilter, setActiveStageFilter] = useState<CrmStage>('all')
  const [patientStages, setPatientStages] = useState<Record<string, CrmStage>>({})

  const supabase = createClient()

  const fetchCrmData = async () => {
    setLoading(true)
    try {
      const { data: pts } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
      const { count: apptCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true })

      const patientList = pts || []
      setPatients(patientList)
      setAppointmentsCount(apptCount || 0)

      // Inicializar etapas locales a partir de su estado real
      const initialMap: Record<string, CrmStage> = {}
      patientList.forEach((p) => {
        if (!p.onboarding_completed) {
          initialMap[p.id] = 'contacto_inicial'
        } else {
          initialMap[p.id] = 'cita_valoracion'
        }
      })
      setPatientStages(initialMap)
    } catch (err) {
      console.warn('Error fetching CRM data:', err)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCrmData()
  }, [])

  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [selectedPatientForAi, setSelectedPatientForAi] = useState<any | null>(null)
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<string>('')
  const [aiMeta, setAiMeta] = useState<any | null>(null)

  // Estado de Auditoría Proactiva en Background
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditData, setAuditData] = useState<any | null>(null)

  // Estado del Reporte de Audio Ejecutivo para la Dra. Aura
  const [isBriefGenerating, setIsBriefGenerating] = useState(false)
  const [executiveBrief, setExecutiveBrief] = useState<any | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const handleRunProactiveAudit = async () => {
    setIsAuditing(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'bi',
          prompt: 'Realiza una auditoría proactiva del CRM de la clínica dental: analiza pacientes en riesgo de fuga, cuellos de botella en presupuesto y oportunidades de reactivación.'
        })
      })
      const data = await res.json()
      if (data?.success && data?.result) {
        const text = typeof data.result === 'string' ? data.result : (data.result?.result || data.result?.analysis || JSON.stringify(data.result))
        setAuditData({
          title: 'Auditoría Proactiva de Retención',
          summary: text,
          recommendations: ['Contactar a pacientes con presupuesto pendiente', 'Priorizar revisiones periódicas de 6 meses']
        })
      }
    } catch (err) {
      console.error('Error running proactive audit:', err)
    } finally {
      setIsAuditing(false)
    }
  }

  const handleGenerateExecutiveAudio = async () => {
    setIsBriefGenerating(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'bi',
          prompt: `Genera el guión conciso para el resumen ejecutivo en audio del día para la Dra. Aura Estudillo. Total de pacientes: ${patients.length}, tratamientos activos: ${stageCounts.tratamiento_activo}, ingresos estimados: $24,500 MXN.`
        })
      })
      const data = await res.json()
      const text = typeof data?.result === 'string' ? data.result : (data?.result?.result || data?.result?.analysis || 'Resumen operativo del día listo.')
      const briefObj = {
        title: 'Cierre de Operaciones del Día',
        script: text,
        metrics: { totalPatients: patients.length, activeTreatments: stageCounts.tratamiento_activo }
      }
      setExecutiveBrief(briefObj)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'es-MX'
        utterance.rate = 1.05
        utterance.onend = () => setIsPlayingAudio(false)
        utterance.onerror = () => setIsPlayingAudio(false)
        setIsPlayingAudio(true)
        window.speechSynthesis.speak(utterance)
      }
    } catch (err) {
      console.error('Error generating executive audio:', err)
    } finally {
      setIsBriefGenerating(false)
    }
  }

  const handleToggleAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel()
        setIsPlayingAudio(false)
      } else if (executiveBrief?.script) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(executiveBrief.script)
        utterance.lang = 'es-MX'
        utterance.rate = 1.05
        utterance.onend = () => setIsPlayingAudio(false)
        utterance.onerror = () => setIsPlayingAudio(false)
        setIsPlayingAudio(true)
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  const handleGenerateAiFollowup = async (patient?: any) => {
    setIsAiGenerating(true)
    const targetPatient = patient || selectedPatientForAi || patients[0]
    const stage = targetPatient ? (patientStages[targetPatient.id] || 'contacto_inicial') : 'contacto_inicial'

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'patient_chat',
          prompt: `Redacta un mensaje amable de seguimiento para el paciente ${targetPatient?.full_name || 'Paciente'} en etapa ${stage} sobre su tratamiento de ${targetPatient?.treatment || 'Valoración Odontológica'}.`
        })
      })

      const data = await res.json()
      const messageText = typeof data?.result === 'string' ? data.result : (data?.result?.result || data?.result?.content || '¡Hola! Te contactamos de la clínica Audenti...')
      setAiGeneratedMessage(messageText)
      setAiMeta({ message: messageText })
      if (targetPatient) setSelectedPatientForAi(targetPatient)
    } catch (err) {
      console.error('Error generating AI followup:', err)
    } finally {
      setIsAiGenerating(false)
    }
  }

  const handleChangeStage = (patientId: string, newStage: CrmStage) => {
    setPatientStages(prev => ({
      ...prev,
      [patientId]: newStage
    }))
  }

  const stageCounts = {
    contacto_inicial: Object.values(patientStages).filter(s => s === 'contacto_inicial').length,
    cita_valoracion: Object.values(patientStages).filter(s => s === 'cita_valoracion').length,
    primera_atencion: Object.values(patientStages).filter(s => s === 'primera_atencion').length,
    presupuesto_enviado: Object.values(patientStages).filter(s => s === 'presupuesto_enviado').length,
    tratamiento_activo: Object.values(patientStages).filter(s => s === 'tratamiento_activo').length,
    paciente_fiel: Object.values(patientStages).filter(s => s === 'paciente_fiel').length,
  }

  const kpis = [
    { label: 'Pacientes en Embudo', value: patients.length.toString(), delta: '+0%', icon: UserPlus, note: 'Base total en seguimiento' },
    { label: 'Citas en Tiempo Real', value: appointmentsCount.toString(), delta: '+0%', icon: Calendar, note: 'Agenda clínica activa' },
    { label: 'Expedientes Verificados', value: patients.filter(p => p.onboarding_completed).length.toString(), icon: CheckCircle, note: 'Bioseguridad completada' },
    { label: 'Presupuestos Activos', value: stageCounts.presupuesto_enviado.toString(), icon: Receipt, note: 'En revisión por paciente' },
  ]

  const funnelStages = [
    {
      id: 'contacto_inicial',
      n: '01',
      label: 'Contacto Nuevo',
      sub: 'Prospecto / Registro web',
      count: stageCounts.contacto_inicial,
      color: 'text-amber-800 bg-amber-50 border-amber-200',
      icon: Mail,
      value: stageCounts.contacto_inicial === 0 ? 'Sin prospectos' : `${stageCounts.contacto_inicial} prospectos`,
      details: [['Directorio:', `${patients.length}`], ['Pendientes:', `${stageCounts.contacto_inicial}`]]
    },
    {
      id: 'cita_valoracion',
      n: '02',
      label: 'Cita de Valoración',
      sub: 'Agendada en consultorio',
      count: stageCounts.cita_valoracion,
      color: 'text-blue-800 bg-blue-50 border-blue-200',
      icon: Calendar,
      value: appointmentsCount === 0 ? '0 citas' : `${appointmentsCount} agendadas`,
      details: [['Confirmadas:', `${appointmentsCount}`]]
    },
    {
      id: 'primera_atencion',
      n: '03',
      label: 'Primera Atención',
      sub: 'Diagnóstico & Odontograma',
      count: stageCounts.primera_atencion,
      color: 'text-slate-800 bg-slate-50 border-slate-200',
      icon: Stethoscope,
      value: '$0.00 MXN',
      details: [['Odontograma:', `${stageCounts.primera_atencion}`]]
    },
    {
      id: 'presupuesto_enviado',
      n: '04',
      label: 'Plan Presentado',
      sub: 'Cotización / Presupuesto',
      count: stageCounts.presupuesto_enviado,
      color: 'text-amber-900 bg-amber-100/50 border-amber-300',
      icon: Receipt,
      value: '$0.00 MXN',
      details: [['Por aceptar:', `${stageCounts.presupuesto_enviado}`]]
    },
    {
      id: 'tratamiento_activo',
      n: '05',
      label: 'Tx en Curso',
      sub: 'Tratamiento en sillón',
      count: stageCounts.tratamiento_activo,
      color: 'text-indigo-800 bg-indigo-50 border-indigo-200',
      icon: Activity,
      value: 'En gabinete',
      details: [['En curso:', `${stageCounts.tratamiento_activo}`]]
    },
    {
      id: 'paciente_fiel',
      n: '06',
      label: 'Paciente Fiel',
      sub: 'Preventivo semestral',
      count: stageCounts.paciente_fiel,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      icon: CheckCircle,
      value: 'Salud óptima',
      details: [['Al día:', `${stageCounts.paciente_fiel}`]]
    },
  ]

  const copyMessage = () => {
    const text = 'Hola, te saludamos del consultorio dental de la Dra. Aura Estudillo. Te compartimos el plan de tratamiento y citas disponibles para tu atención odontológica. ¿Te gustaría agendar en este momento?'
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const filteredPatients = patients.filter(p => {
    if (activeStageFilter !== 'all') {
      const stage = patientStages[p.id] || 'contacto_inicial'
      if (stage !== activeStageFilter) return false
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      const matchesName = (p.full_name || '').toLowerCase().includes(term)
      const matchesPhone = (p.phone || '').includes(term)
      const matchesId = (p.id || '').toLowerCase().includes(term)
      const matchesEmail = (p.email || '').toLowerCase().includes(term)
      if (!matchesName && !matchesPhone && !matchesId && !matchesEmail) return false
    }
    return true
  })

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Módulo CRM &amp; Seguimiento Clínico
            </span>
            <span className="text-slate-500 text-xs">• Sincronizado en tiempo real</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            CRM Dental &amp; Ciclo de Vida del Paciente
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl mt-0.5">
            Dra. Aura Estudillo • Céd. Prof. 8492019 | Trazabilidad del prospecto desde el contacto inicial hasta el plan de tratamiento completado.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchCrmData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Sincronizar CRM"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Registrar Paciente (Alta Rápida)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {k.value}
                </span>
                {k.delta && (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {k.delta}
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <p className="text-[11px] text-slate-500">{k.note}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Embudo de Conversión (Funnel) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Embudo Integral de Conversión &amp; Atención</h2>
          <p className="text-xs text-slate-500">Monitoreo dinámico del ciclo clínico desde el primer contacto hasta el régimen preventivo regular.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
          {funnelStages.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.n} className="bg-slate-50/80 border border-slate-200/70 p-4 rounded-xl flex flex-col justify-between hover:bg-slate-50 transition-all cursor-pointer group shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500">ETAPA {s.n}</span>
                    <Icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{s.label}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.sub}</p>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-slate-900">{s.count}</span>
                    <span className="text-[10px] text-slate-500">pacientes</span>
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-700">{s.value}</div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
                  {s.details.map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="font-bold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tablero de Seguimiento + Panel de Audenti Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tablero de Pacientes */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Tablero de Seguimiento Activo</h2>
              <p className="text-xs text-slate-500">Acciones programadas para pacientes en seguimiento clínico y presupuestos abiertos.</p>
            </div>
            {/* Buscador Rápido y Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar paciente o folio..."
                  className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 w-48 sm:w-56"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveStageFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeStageFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({patients.length})
              </button>
              {funnelStages.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStageFilter(s.id as CrmStage)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeStageFilter === s.id
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label} ({s.count})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredPatients.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50/70 border border-slate-200/70 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {patients.length === 0
                    ? 'No hay pacientes en seguimiento activo'
                    : 'No hay pacientes en esta etapa del embudo'}
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  {patients.length === 0
                    ? 'La base está lista en blanco. Al registrar pacientes se activará el seguimiento automatizado y los recordatorios.'
                    : 'Puedes cambiar la etapa de un paciente desde el selector de etapa en cualquier momento.'}
                </p>
                {patients.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold shadow-xs hover:bg-amber-300 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Registrar Primer Paciente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveStageFilter('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300 transition-colors"
                  >
                    Ver todos los pacientes
                  </button>
                )}
              </div>
            ) : (
              filteredPatients.map((p) => {
                const initials = (p.full_name || 'Paciente')
                  .split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                const currentStage = patientStages[p.id] || 'contacto_inicial'

                return (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {initials}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{p.full_name}</h4>
                          <span className="text-[11px] text-slate-500 font-mono">ID: {p.id.slice(0, 8)}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            {p.onboarding_completed ? 'Bioseguridad Verificada' : 'Onboarding Pendiente'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            Canal: {p.source_channel || p.referral_source || 'Boca en Boca'}
                          </span>
                          {p.referred_by && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              Ref: {p.referred_by}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">Teléfono: {p.phone || 'Sin número'}</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {p.email ? `Correo: ${p.email}` : 'Sin correo registrado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateAiFollowup(p)}
                        disabled={isAiGenerating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer disabled:opacity-50"
                        title="Generar mensaje personalizado con Groq IA"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                        Generar Seguimiento IA
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Etapa:</span>
                        <select
                          value={currentStage}
                          onChange={(e) => handleChangeStage(p.id, e.target.value as CrmStage)}
                          className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 shadow-2xs focus:ring-1 focus:ring-amber-500 outline-none cursor-pointer"
                        >
                          <option value="contacto_inicial">01. Contacto Nuevo</option>
                          <option value="cita_valoracion">02. Cita Valoración</option>
                          <option value="primera_atencion">03. Primera Atención</option>
                          <option value="presupuesto_enviado">04. Plan Presentado</option>
                          <option value="tratamiento_activo">05. Tx en Curso</option>
                          <option value="paciente_fiel">06. Paciente Fiel</option>
                        </select>
                      </div>

                      <a
                        href={`https://wa.me/521${(p.phone || '').replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`Hola ${p.full_name}, te saluda la Dra. Aura Estudillo de Audenti Clinical.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>

                      <Link
                        href={`/dashboard/expediente?patient_id=${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs shrink-0 bg-slate-100 text-slate-800 hover:bg-slate-200"
                        title="Abrir Expediente Clínico"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                        Expediente
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Panel Audenti Intelligence (Groq Llama 3.3 Engine) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider text-amber-700 uppercase">Motor Groq Llama 3.3</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Audenti Intelligence</h3>
              <p className="text-xs text-slate-500">Asistente de Retención y Conversión Dental</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-100/60 text-slate-900 border border-amber-200">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>Respuestas clínicas asistidas en milisegundos con Groq SDK. Diseñado para la Dra. Aura Estudillo.</span>
          </div>

          {/* Borrador Generado por IA */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-900">
                {selectedPatientForAi ? `Para: ${selectedPatientForAi.full_name}` : 'Plantilla Oficial: Recordatorio Clínico'}
              </span>
              <span className="text-slate-500">Canal: WhatsApp</span>
            </div>

            {aiMeta && (
              <div className="flex items-center justify-between text-[11px] bg-amber-100/60 px-2.5 py-1 rounded-lg text-amber-900 font-semibold border border-amber-200/70">
                <span>Acción: {aiMeta.recommendedAction || 'Seguimiento'}</span>
                <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-white font-bold text-amber-800">
                  Urgencia: {aiMeta.urgency || 'Media'}
                </span>
              </div>
            )}

            <p className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs italic text-slate-700 leading-relaxed shadow-2xs whitespace-pre-line">
              {aiGeneratedMessage || (
                selectedPatientForAi
                  ? `“Hola ${selectedPatientForAi.full_name}, te saludamos del consultorio de la Dra. Aura Estudillo. Te compartimos los horarios y opciones para tu valoración odontológica. ¿Te gustaría agendar una cita esta semana?”`
                  : `“Hola, te saludamos del consultorio de la Dra. Aura Estudillo. Esperamos que te encuentres muy bien. Te compartimos el esquema y citas disponibles para tu atención odontológica. ¿Te gustaría agendar una valoración?”`
              )}
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleGenerateAiFollowup()}
                disabled={isAiGenerating}
                className="w-full py-2 px-3 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                {isAiGenerating ? 'Generando con Groq...' : 'Generar Seguimiento IA'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = aiGeneratedMessage || (
                    selectedPatientForAi
                      ? `Hola ${selectedPatientForAi.full_name}, te saludamos del consultorio de la Dra. Aura Estudillo. Te compartimos los horarios y opciones para tu valoración odontológica. ¿Te gustaría agendar una cita esta semana?`
                      : 'Hola, te saludamos del consultorio de la Dra. Aura Estudillo. Esperamos que te encuentres muy bien. Te compartimos el esquema y citas disponibles para tu atención odontológica. ¿Te gustaría agendar una valoración?'
                  )
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(text)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? '¡Copiado al portapapeles!' : 'Copiar Texto'}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MÓDULO 2: SISTEMA DE INFORMES & AUDIO PODCAST DRA. AURA */}
          {/* ======================================================== */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white tracking-tight">Audio Podcast Ejecutivo</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono">
                Cierre de Jornada
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Genera una síntesis ejecutiva por voz para la Dra. Aura Estudillo con el balance del día, altas y alertas de retención.
            </p>

            {executiveBrief && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <p className="font-bold text-amber-400">{executiveBrief.headline}</p>
                <p className="text-slate-300 text-[11px] italic leading-snug">"{executiveBrief.script}"</p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Acción: <strong>{executiveBrief.actionItem}</strong></span>
                  <button
                    onClick={handleToggleAudio}
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold"
                  >
                    {isPlayingAudio ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    {isPlayingAudio ? 'Pausar Audio' : 'Escuchar de nuevo'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateExecutiveAudio}
              disabled={isBriefGenerating}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isBriefGenerating ? 'animate-bounce' : ''}`} />
              {isBriefGenerating ? 'Generando Reporte y Voz...' : 'Escuchar Audio Reporte Diario'}
            </button>
          </div>

          {/* ======================================================== */}
          {/* MÓDULO 3: DIAGNÓSTICO PROACTIVO & DETECCIÓN DE FUGAS (LEAKS) */}
          {/* ======================================================== */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-900">Auditoría Proactiva CRM</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                Llama 3.3 70B
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Escanea la base para prevenir pacientes en riesgo de abandono y optimizar tratamientos de alta rentabilidad.
            </p>

            {auditData && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Alerta de Fuga: {auditData.leakAlert?.riskLevel}
                  </span>
                  <p className="text-[11px] text-slate-700 mt-1">{auditData.leakAlert?.description}</p>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-slate-600">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Oportunidad:</strong> {auditData.financialInsight?.opportunityService} ({auditData.financialInsight?.projectedImpact})</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRunProactiveAudit}
              disabled={isAuditing}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              {isAuditing ? 'Analizando Base de Pacientes...' : 'Escanear Fugas y Oportunidades'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Flotante de Alta Rápida */}
      <QuickRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onPatientCreated={() => {
          setIsRegisterOpen(false)
          fetchCrmData()
        }}
      />
    </div>
  )
}
