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
  GitBranch
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

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

// ────────────────────────────────────────────────────────────
// Iconos de canal
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
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'canales' | 'referidores' | 'familias'>('canales')

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
      // Aplanar la estructura anidada
      const flat: FamilyNode[] = (families || []).map((r: any) => ({
        id: r.id,
        relationship_type: r.relationship_type,
        full_name: r.patient?.full_name ?? '',
        related_full_name: r.related?.full_name ?? '',
      }))
      setFamilyLinks(flat)
    } catch (err) {
      console.warn('[AttributionDashboard] Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  // KPIs totales
  const totalPatients = channelStats.reduce((s, c) => s + c.total_pacientes, 0)
  const totalReferrals = channelStats.reduce((s, c) => s + c.referidos_generados, 0)
  const totalRevenue   = channelStats.reduce((s, c) => s + Number(c.ingresos_totales), 0)
  const maxPatients    = Math.max(...channelStats.map(c => c.total_pacientes), 1)

  return (
    <div className="space-y-6">
      {/* Header BI */}
      <div className="bg-gradient-to-br from-[#202D4C] to-slate-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Business Intelligence</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Atribución Comercial & Canales de Adquisición</h2>
        <p className="text-xs text-slate-300 mt-1">Panel de dirección — Dra. Aura Estudillo</p>

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Pacientes Totales</span>
            <p className="text-3xl font-bold mt-1">{totalPatients.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Referidos Generados</span>
            <p className="text-3xl font-bold mt-1 text-amber-400">{totalReferrals.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Ingresos Atribuidos</span>
            <p className="text-3xl font-bold mt-1 text-emerald-400">
              ${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/70">
        {([
          { key: 'canales', label: 'Canales', icon: <BarChart3 className="w-4 h-4 text-amber-600" /> },
          { key: 'referidores', label: 'Top Referidores', icon: <Award className="w-4 h-4 text-amber-600" /> },
          { key: 'familias', label: 'Árbol Familiar', icon: <GitBranch className="w-4 h-4 text-amber-600" /> },
        ] as const).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Cargando inteligencia comercial...</p>
        </div>
      ) : (
        <>
          {/* ── TAB: CANALES ── */}
          {activeTab === 'canales' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Desglose por Canal de Adquisición</h3>
                <p className="text-xs text-slate-500 mt-0.5">Distribución de pacientes, referidos e ingresos por canal de origen</p>
              </div>

              {channelStats.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <BarChart3 className="w-10 h-10 text-slate-200 mx-auto" />
                  <p className="text-sm font-bold text-slate-400">Sin datos de atribución aún</p>
                  <p className="text-xs text-slate-400">Los datos aparecerán conforme los pacientes se registren con su canal de origen.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {channelStats.map(stat => {
                    const cfg = CHANNEL_CONFIG[stat.canal] ?? CHANNEL_CONFIG['otro']
                    const pct = Math.round((stat.total_pacientes / maxPatients) * 100)
                    return (
                      <div key={stat.canal} className="p-5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.color}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Pacientes</p>
                              <p className="text-lg font-bold text-slate-900">{stat.total_pacientes}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Referidos</p>
                              <p className="text-lg font-bold text-amber-700">{stat.referidos_generados}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Ingresos</p>
                              <p className="text-lg font-bold text-emerald-700">
                                ${Number(stat.ingresos_totales).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{pct}% del canal líder</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: TOP REFERIDORES ── */}
          {activeTab === 'referidores' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Pacientes Embajadores — Ranking de Referidos</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pacientes que han traído más personas nuevas a la clínica</p>
              </div>
              {topReferrers.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Award className="w-10 h-10 text-slate-200 mx-auto" />
                  <p className="text-sm font-bold text-slate-400">Ningún embajador con referidos aún</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">#</th>
                        <th className="px-5 py-3.5">Embajador</th>
                        <th className="px-5 py-3.5">Código único</th>
                        <th className="px-5 py-3.5">Canal origen</th>
                        <th className="px-5 py-3.5 text-right">Referidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topReferrers.map((r, idx) => {
                        const cfg = CHANNEL_CONFIG[r.acquisition_channel] ?? CHANNEL_CONFIG['otro']
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-4">
                              <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">
                                  {(r.full_name?.[0] ?? '?')}
                                </div>
                                {r.full_name}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <code className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono text-[11px] font-bold border border-amber-200">
                                {r.referral_code}
                              </code>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Árbol de Familias Registradas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Relaciones familiares entre pacientes para planes preventivos y facturación familiar</p>
              </div>
              {familyLinks.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <GitBranch className="w-10 h-10 text-slate-200 mx-auto" />
                  <p className="text-sm font-bold text-slate-400">No hay relaciones familiares registradas</p>
                  <p className="text-xs text-slate-400">Registra las relaciones desde el expediente de cada paciente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3.5">Paciente</th>
                        <th className="px-5 py-3.5">Relación</th>
                        <th className="px-5 py-3.5">Familiar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {familyLinks.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {f.full_name}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-slate-500">
                              <ArrowRight className="w-3 h-3" />
                              <span className="capitalize font-semibold text-slate-700">{f.relationship_type}</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900">
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
        </>
      )}
    </div>
  )
}
