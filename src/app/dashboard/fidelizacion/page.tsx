'use client'

import { useState, useEffect } from 'react'
import {
  HeartHandshake,
  QrCode,
  Gift,
  Share2,
  Users,
  Trophy,
  Copy,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Star,
  Award
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'
import { ReviewRedirectEngine } from '@/components/ReviewRedirectEngine'

export default function FidelizacionPage() {
  const [activeTab, setActiveTab] = useState<'referrals' | 'reviews'>('referrals')
  const [copied, setCopied] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadFidelizacion() {
      try {
        const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false })
        setPatients(data || [])
      } catch (e) {
        console.warn('Error loading fidelizacion patients:', e)
        setPatients([])
      } finally {
        setLoading(false)
      }
    }
    loadFidelizacion()
  }, [])

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://audenti.vercel.app/onboarding?promo=FAMILIA2026')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
            Programa de Lealtad &amp; Red de Referidos
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Fidelización &amp; Recompensas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Trazabilidad de pacientes embajadores, puntos por referidos y planes preventivos familiares.</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          {copied ? '¡Enlace de Campaña Copiado!' : 'Copiar Enlace de Campaña'}
        </button>
      </div>

      {/* Selector de Pestañas: Red de Referidos vs Fidelización en Redes/Reseñas */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/70">
        <button
          type="button"
          onClick={() => setActiveTab('referrals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'referrals'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-amber-600" />
          <span>Árbol de Referidos &amp; Embajadores</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'reviews'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Motor de Reseñas 5★ &amp; Redes Sociales</span>
        </button>
      </div>

      {activeTab === 'reviews' ? (
        <ReviewRedirectEngine />
      ) : (
        <>
          {/* Tarjetas KPI de Fidelización */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pacientes Fieles</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{patients.length}</p>
          <span className="text-xs text-emerald-700 font-bold">100% de la base activa</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">LTV de Referidos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">$0.00 <span className="text-xs font-normal text-slate-500">MXN</span></p>
          <span className="text-xs text-amber-700 font-bold">Sin transacciones registradas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Beneficios Canjeados</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">0</p>
          <span className="text-xs text-slate-500 font-medium">Recompensas este trimestre</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tasa de Retención</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-emerald-700">100%</p>
          <span className="text-xs text-emerald-800 font-bold">Base lista en producción</span>
        </div>
      </div>

      {/* Ranking de Pacientes Embajadores */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Top Pacientes Embajadores (Ranking por LTV)</h2>
            <p className="text-xs text-slate-500">Pacientes que recomiendan la clínica a través de su código de referido</p>
          </div>
        </div>

        {patients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No hay embajadores registrados aún</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              El programa de lealtad comenzará a acumular puntos automáticamente conforme los pacientes registrados compartan su enlace institucional.
            </p>
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              + Dar de alta paciente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Posición</th>
                  <th className="px-6 py-3.5">Paciente</th>
                  <th className="px-6 py-3.5">Código Único</th>
                  <th className="px-6 py-3.5">Bioseguridad</th>
                  <th className="px-6 py-3.5">LTV Aportado</th>
                  <th className="px-6 py-3.5 text-right">Recompensa Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {patients.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-700'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{r.full_name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-amber-800 bg-amber-50/50 px-2 py-0.5 rounded-md inline-block my-3">
                      AUD-{r.id.slice(0, 4).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.onboarding_completed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {r.onboarding_completed ? 'Verificado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">$0.00 MXN</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Programa Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      <QuickRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onPatientCreated={() => {
          setIsRegisterOpen(false)
          supabase.from('patients').select('*').order('created_at', { ascending: false }).then(({ data }) => setPatients(data || []))
        }}
      />
    </div>
  )
}
