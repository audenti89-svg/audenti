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
  Building2
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'

type CrmStage = 'all' | 'contacto_inicial' | 'cita_valoracion' | 'primera_atencion' | 'presupuesto_enviado' | 'tratamiento_activo' | 'paciente_fiel'

export default function CrmPage() {
  const [copied, setCopied] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [appointmentsCount, setAppointmentsCount] = useState(0)
  const [loading, setLoading] = useState(true)
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
    if (activeStageFilter === 'all') return true
    return (patientStages[p.id] || 'contacto_inicial') === activeStageFilter
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
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
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
                        </div>
                        <p className="text-xs text-slate-600">Teléfono: {p.phone || 'Sin número'}</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {p.email ? `Correo: ${p.email}` : 'Sin correo registrado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
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
                        href={`https://wa.me/${(p.phone || '').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Panel Audenti Intelligence (Conectado a 9Router) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-wider text-amber-700 uppercase">Motor 9Router Activo</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Audenti Intelligence</h3>
              <p className="text-xs text-slate-500">Asistente de Retención y Copiloto Dental</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-100/60 text-slate-900 border border-amber-200">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>Soporte decisional clínico. Toda sugerencia requiere aprobación médica antes del envío.</span>
          </div>

          {/* Borrador Generado por IA */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-900">Plantilla Oficial: Recordatorio Clínico</span>
              <span className="text-slate-500">Canal: WhatsApp</span>
            </div>
            <p className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs italic text-slate-700 leading-relaxed shadow-2xs">
              “Hola, te saludamos del consultorio de la Dra. Aura Estudillo. Esperamos que te encuentres muy bien. Te compartimos el esquema y citas disponibles para tu atención odontológica. ¿Te gustaría agendar una valoración?”
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={copyMessage}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? '¡Copiado al portapapeles!' : 'Copiar Texto'}
              </button>
            </div>
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
