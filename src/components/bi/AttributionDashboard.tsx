'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Users,
  QrCode,
  Share2,
  Megaphone,
  UserCheck,
  ArrowRight,
  Sparkles,
  BarChart3,
  Award,
  GitBranch,
  Building2,
  Wallet,
  Receipt,
  DollarSign,
  Clock,
  Check,
  X,
  AlertCircle,
  UserPlus
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { InviteDoctorModal } from '@/components/admin/InviteDoctorModal'

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────
interface ChannelStat {
  canal: string
  total_pacientes: number
  referidos_generados: number
  ingresos_totales: number
  ticket_promedio: number
}

interface TopReferrer {
  id: string
  full_name: string
  total_referrals: number
  acquisition_channel: string
  referral_code: string
}

interface FamilyNode {
  id: string
  full_name: string
  related_full_name: string
  relationship_type: string
}

interface BranchStat {
  sucursal: string
  total_pacientes: number
  total_transacciones: number
  ingresos_totales: number
  egresos_totales: number
  flujo_neto: number
}

interface PendingPatient {
  id: string
  full_name: string
  phone: string
  email: string
  branch_name: string
  created_at: string
  referral_code: string
  attribution_status: string
}

// ────────────────────────────────────────────────────────────
// Iconos y colores de canal
// ────────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  tiktok:    { label: 'TikTok',       color: 'bg-slate-900 text-white',          icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.2 8.2 0 004.79 1.53V6.84a4.85 4.85 0 01-1.02-.15z"/></svg> },
  instagram: { label: 'Instagram',    color: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
  youtube:   { label: 'YouTube',      color: 'bg-red-600 text-white',            icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  facebook:  { label: 'Facebook',     color: 'bg-blue-600 text-white',           icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  referral:  { label: 'Referido',     color: 'bg-amber-400 text-slate-950',      icon: <Share2 className="w-4 h-4" /> },
  qr:        { label: 'Código QR',    color: 'bg-emerald-500 text-white',        icon: <QrCode className="w-4 h-4" /> },
  directo:   { label: 'Directo',      color: 'bg-slate-200 text-slate-800',      icon: <Megaphone className="w-4 h-4" /> },
  otro:      { label: 'Otro',         color: 'bg-slate-100 text-slate-600',      icon: <Sparkles className="w-4 h-4" /> },
  sin_dato:  { label: 'Sin dato',     color: 'bg-slate-50 text-slate-400',       icon: <BarChart3 className="w-4 h-4" /> },
}

// ────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────
export function AttributionDashboard() {
  const supabase = createClient()
  const [channelStats, setChannelStats] = useState<ChannelStat[]>([])
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [familyLinks, setFamilyLinks] = useState<FamilyNode[]>([])
  const [branchStats, setBranchStats] = useState<BranchStat[]>([])
  const [pendingPatients, setPendingPatients] = useState<PendingPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'canales' | 'referidores' | 'familias' | 'sucursales' | 'pendientes'>('canales')

  // Estado para modal de asignación rápida en recepción
  const [assigningPatient, setAssigningPatient] = useState<PendingPatient | null>(null)
  const [selectedChannel, setSelectedChannel] = useState('tiktok')
  const [assignReferrerCode, setAssignReferrerCode] = useState('')
  const [savingAttribution, setSavingAttribution] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // ① Canal stats vía vista SQL (attribution_by_channel)
      const { data: stats } = await supabase
        .from('attribution_by_channel')
        .select('*')
      setChannelStats(stats || [])

      // ② Top referidores
      const { data: referrers } = await supabase
        .from('patients')
        .select('id, full_name, total_referrals, acquisition_channel, referral_code')
        .gt('total_referrals', 0)
        .order('total_referrals', { ascending: false })
        .limit(10)
      setTopReferrers(referrers || [])

      // ③ Relaciones familiares
      const { data: families } = await supabase
        .from('family_relationships')
        .select(`
          id,
          relationship_type,
          patient:patient_id(full_name),
          related:related_patient_id(full_name)
        `)
        .limit(50)
      const flat: FamilyNode[] = (families || []).map((r: any) => ({
        id: r.id,
        relationship_type: r.relationship_type,
        full_name: r.patient?.full_name ?? '',
        related_full_name: r.related?.full_name ?? '',
      }))
      setFamilyLinks(flat)

      // ④ Historial financiero por sucursal
      const { data: bStats } = await supabase
        .from('financial_by_branch')
        .select('*')

      if (bStats && bStats.length > 0) {
        setBranchStats(bStats)
      } else {
        // Fallback en tiempo real directamente de patients y transactions
        const { data: pList } = await supabase.from('patients').select('id, branch_name')
        const { data: tList } = await supabase.from('transactions').select('patient_id, amount, type')

        const map: Record<string, { pacientes: Set<string>; transacciones: number; ingresos: number; egresos: number }> = {
          'Sucursal Balbuena (Matriz)': { pacientes: new Set(), transacciones: 0, ingresos: 0, egresos: 0 },
          'Sucursal Guadalupe Chalma': { pacientes: new Set(), transacciones: 0, ingresos: 0, egresos: 0 },
          'Sucursal Colonia Roma': { pacientes: new Set(), transacciones: 0, ingresos: 0, egresos: 0 },
        }

        const patientMap: Record<string, string> = {}
        ;(pList || []).forEach(p => {
          const b = p.branch_name || 'Sucursal Balbuena (Matriz)'
          patientMap[p.id] = b
          if (!map[b]) map[b] = { pacientes: new Set(), transacciones: 0, ingresos: 0, egresos: 0 }
          map[b].pacientes.add(p.id)
        })

        ;(tList || []).forEach(t => {
          const b = patientMap[t.patient_id] || 'Sucursal Balbuena (Matriz)'
          if (!map[b]) map[b] = { pacientes: new Set(), transacciones: 0, ingresos: 0, egresos: 0 }
          map[b].transacciones++
          const amt = Number(t.amount) || 0
          if (['income', 'cobro'].includes(String(t.type))) {
            map[b].ingresos += amt
          } else if (['expense', 'egreso'].includes(String(t.type))) {
            map[b].egresos += amt
          }
        })

        const calculated: BranchStat[] = Object.entries(map).map(([sucursal, d]) => ({
          sucursal,
          total_pacientes: d.pacientes.size,
          total_transacciones: d.transacciones,
          ingresos_totales: d.ingresos,
          egresos_totales: d.egresos,
          flujo_neto: d.ingresos - d.egresos,
        }))
        setBranchStats(calculated)
      }

      // ⑤ Pacientes con atribución pendiente (para recepción durante turno vespertino)
      const { data: pending } = await supabase
        .from('patients')
        .select('id, full_name, phone, email, branch_name, created_at, referral_code, attribution_status')
        .or('attribution_status.eq.pending_review,acquisition_channel.is.null')
        .order('created_at', { ascending: false })
        .limit(30)
      setPendingPatients((pending as any) || [])
    } catch (err) {
      console.warn('[AttributionDashboard] Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveAttribution = async () => {
    if (!assigningPatient) return
    setSavingAttribution(true)
    try {
      const res = await fetch('/api/attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: assigningPatient.id,
          acquisition_channel: selectedChannel,
          referrer_code: assignReferrerCode.trim() || undefined,
          attribution_status: 'completed'
        })
      })
      if (res.ok) {
        setAssigningPatient(null)
        setAssignReferrerCode('')
        await loadData()
      }
    } catch (err) {
      console.warn('Error al resolver atribución:', err)
    } finally {
      setSavingAttribution(false)
    }
  }

  // KPIs totales
  const totalPatients = channelStats.reduce((s, c) => s + c.total_pacientes, 0)
  const totalReferrals = channelStats.reduce((s, c) => s + c.referidos_generados, 0)
  const totalRevenue   = channelStats.reduce((s, c) => s + Number(c.ingresos_totales), 0)
  const maxPatients    = Math.max(...channelStats.map(c => c.total_pacientes), 1)

  return (
    <div className="space-y-6">
      {/* Header BI */}
      <div className="bg-gradient-to-br from-[#202D4C] to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Business Intelligence &amp; Analítica Comercial</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Atribución de Pacientes, Redes y Sucursales</h2>
            <p className="text-xs text-slate-300 mt-1">Dirección General — Dra. Aura Estudillo • Céd. Prof. 8492019</p>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invitar a Odontólogo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Pacientes Atribuidos</span>
            <p className="text-3xl font-black mt-1">{totalPatients.toLocaleString('es-MX')}</p>
            <p className="text-[10px] text-slate-300 mt-0.5">Base clínica activa</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Referidos Generados</span>
            <p className="text-3xl font-black mt-1 text-amber-400">{totalReferrals.toLocaleString('es-MX')}</p>
            <p className="text-[10px] text-amber-300 mt-0.5">Red de embajadores</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Ingresos Identificados</span>
            <p className="text-3xl font-black mt-1 text-emerald-400">
              ${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">Trazabilidad por canal</p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/70">
        {([
          { key: 'canales', label: 'Canales de Origen', icon: <BarChart3 className="w-4 h-4 text-amber-600" /> },
          { key: 'sucursales', label: 'Finanzas por Sede', icon: <Building2 className="w-4 h-4 text-amber-600" /> },
          { key: 'referidores', label: 'Red de Embajadores', icon: <Award className="w-4 h-4 text-amber-600" /> },
          { key: 'familias', label: 'Árbol Familiar', icon: <GitBranch className="w-4 h-4 text-amber-600" /> },
          { key: 'pendientes', label: 'Atribución Pendiente', icon: <Clock className="w-4 h-4 text-amber-600" />, badge: pendingPatients.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {'badge' in tab && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Cargando inteligencia comercial y financiera...</p>
        </div>
      ) : (
        <>
          {/* ── TAB: CANALES DE ORIGEN ── */}
          {activeTab === 'canales' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Desglose de Conversión por Canal</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Pacientes, ingresos y volumen originados por TikTok, Instagram, QR y recomendaciones</p>
                </div>
              </div>

              {channelStats.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Sin datos de atribución aún</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Los registros nuevos y altas en recepción comenzarán a poblar este gráfico automáticamente.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {channelStats.map(stat => {
                    const cfg = CHANNEL_CONFIG[stat.canal] ?? CHANNEL_CONFIG['otro']
                    const pct = Math.round((stat.total_pacientes / maxPatients) * 100)
                    return (
                      <div key={stat.canal} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.color}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Pacientes</p>
                              <p className="text-lg font-black text-slate-900">{stat.total_pacientes}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Referidos</p>
                              <p className="text-lg font-black text-amber-700">{stat.referidos_generados}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Ingresos</p>
                              <p className="text-lg font-black text-emerald-700">
                                ${Number(stat.ingresos_totales).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                          <span>{pct}% del canal líder</span>
                          <span>Ticket Promedio: ${Number(stat.ticket_promedio).toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: FINANZAS POR SUCURSAL (SEDES) ── */}
          {activeTab === 'sucursales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {branchStats.map(bs => (
                  <div key={bs.sucursal} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Sede Dental
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{bs.sucursal}</h4>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-[#202D4C] text-white flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-amber-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pacientes Dados de Alta</p>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{bs.total_pacientes}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Flujo Neto</p>
                        <p className="text-2xl font-black text-emerald-700 mt-0.5">
                          ${Number(bs.flujo_neto).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Ingresos cobrados:</span>
                        <strong className="text-emerald-700">${Number(bs.ingresos_totales).toLocaleString('es-MX')}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Egresos asentados:</span>
                        <strong className="text-rose-600">${Number(bs.egresos_totales).toLocaleString('es-MX')}</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                        <span>Transacciones totales:</span>
                        <span>{bs.total_transacciones} operaciones</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla consolidada de sucursales */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Historial Financiero y Altas por Sede</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Monitoreo consolidado de ventas y balance de cada unidad dental</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Sucursal</th>
                        <th className="px-6 py-4 text-center">Pacientes</th>
                        <th className="px-6 py-4 text-center">Transacciones</th>
                        <th className="px-6 py-4 text-right">Ingresos</th>
                        <th className="px-6 py-4 text-right">Egresos</th>
                        <th className="px-6 py-4 text-right">Flujo Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branchStats.map(bs => (
                        <tr key={bs.sucursal} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                            {bs.sucursal}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{bs.total_pacientes}</td>
                          <td className="px-6 py-4 text-center font-medium text-slate-500">{bs.total_transacciones}</td>
                          <td className="px-6 py-4 text-right font-bold text-emerald-700">
                            ${Number(bs.ingresos_totales).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-rose-600">
                            ${Number(bs.egresos_totales).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">
                            ${Number(bs.flujo_neto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: TOP REFERIDORES ── */}
          {activeTab === 'referidores' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Pacientes Embajadores — Ranking de Referidos</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pacientes que han compartido su código de lealtad e invitado amigos o familiares</p>
              </div>
              {topReferrers.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Award className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Ningún embajador con referidos aún</p>
                  <p className="text-xs text-slate-400">Los embajadores aparecerán conforme se usen los códigos AUD- en registros.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">Embajador</th>
                        <th className="px-6 py-4">Código único</th>
                        <th className="px-6 py-4">Canal origen</th>
                        <th className="px-6 py-4 text-right">Referidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topReferrers.map((r, idx) => {
                        const cfg = CHANNEL_CONFIG[r.acquisition_channel] ?? CHANNEL_CONFIG['otro']
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">
                                  {(r.full_name?.[0] ?? '?')}
                                </div>
                                {r.full_name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <code className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono text-[11px] font-bold border border-amber-200">
                                {r.referral_code}
                              </code>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-lg font-black text-amber-700">{r.total_referrals}</span>
                              <span className="text-slate-400 ml-1">personas</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: ÁRBOL FAMILIAR ── */}
          {activeTab === 'familias' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Árbol de Familias Registradas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Relaciones familiares entre pacientes para planes preventivos y facturación familiar</p>
              </div>
              {familyLinks.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <GitBranch className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No hay relaciones familiares registradas</p>
                  <p className="text-xs text-slate-400">Registra las relaciones desde el expediente de cada paciente en recepción.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Relación</th>
                        <th className="px-6 py-4">Familiar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {familyLinks.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {f.full_name}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-500">
                              <ArrowRight className="w-3 h-3" />
                              <span className="capitalize font-semibold text-slate-700">{f.relationship_type}</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {f.related_full_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* ── TAB: ATRIBUCIÓN PENDIENTE (Recepción Vespertina) ── */}
          {activeTab === 'pendientes' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Pacientes con Atribución Pendiente</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                      {pendingPatients.length} en espera
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pacientes registrados sin canal o referidor identificado. El personal de recepción puede validar y asignar su origen al asistir a su cita vespertina (16:00 a 21:00 hrs o domingos).
                  </p>
                </div>
              </div>

              {pendingPatients.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Check className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">¡Todo al día!</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Todos los pacientes registrados tienen su origen comercial, QR o referidor embajador debidamente atribuido.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                      <tr>
                        <th className="px-6 py-3.5">Paciente</th>
                        <th className="px-6 py-3.5">Contacto</th>
                        <th className="px-6 py-3.5">Sucursal</th>
                        <th className="px-6 py-3.5">Código Único</th>
                        <th className="px-6 py-3.5 text-right">Acción en Recepción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingPatients.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900 block">{p.full_name}</span>
                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-0.5">
                              Atribución Pendiente
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-600 block">{p.phone || 'Sin cel'}</span>
                            <span className="text-[10px] text-slate-400">{p.email || 'Sin correo'}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-medium">
                            {p.branch_name || 'Sucursal Balbuena'}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            {p.referral_code || 'AUD-REG'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningPatient(p)
                                setSelectedChannel('tiktok')
                                setAssignReferrerCode('')
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Asignar Origen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Modal de Asignación Rápida para Recepción */}
          {assigningPatient && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Validar Atribución en Recepción</h4>
                    <p className="text-[11px] text-slate-500">Paciente: <strong className="text-slate-800">{assigningPatient.full_name}</strong></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssigningPatient(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">
                      Canal de Adquisición / Origen
                    </label>
                    <select
                      value={selectedChannel}
                      onChange={e => setSelectedChannel(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-semibold"
                    >
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="facebook">Facebook</option>
                      <option value="qr">Código QR Físico / Digital</option>
                      <option value="referral">Recomendación Personal</option>
                      <option value="directo">Directo (Paso por la clínica)</option>
                      <option value="otro">Otro medio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-1">
                      Código del Referidor o Nombre (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="AUD-XXXX o Nombre del embajador"
                      value={assignReferrerCode}
                      onChange={e => setAssignReferrerCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Si el paciente menciona quién lo recomendó, ingrésalo aquí para vincular los beneficios en el panel financiero.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAssigningPatient(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAttribution}
                    disabled={savingAttribution}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 shadow-sm flex items-center gap-1.5"
                  >
                    {savingAttribution ? 'Guardando...' : 'Confirmar y Atribuir'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Invitación a Odontólogos */}
      <InviteDoctorModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  )
}
