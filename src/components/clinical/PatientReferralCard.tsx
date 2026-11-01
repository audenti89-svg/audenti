'use client'

import { useState, useEffect } from 'react'
import {
  Share2,
  Copy,
  CheckCircle2,
  QrCode,
  Users,
  Gift,
  Link as LinkIcon,
  Sparkles,
  ChevronRight,
  Award
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// ────────────────────────────────────────────────────────────
// Tipo de datos del paciente con atribución
// ────────────────────────────────────────────────────────────
interface PatientAttribution {
  id: string
  full_name: string
  referral_code: string | null
  total_referrals: number
  acquisition_channel: string | null
}

// ────────────────────────────────────────────────────────────
// Componente: Tarjeta "Mi Código de Referido"
// ────────────────────────────────────────────────────────────
interface PatientReferralCardProps {
  patientId?: string // Si se pasa, carga datos de ese paciente; si no, usa el primero encontrado
}

export function PatientReferralCard({ patientId }: PatientReferralCardProps) {
  const supabase = createClient()
  const [patient, setPatient] = useState<PatientAttribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)

  useEffect(() => {
    async function load() {
      try {
        let query = supabase
          .from('patients')
          .select('id, full_name, referral_code, total_referrals, acquisition_channel')

        if (patientId) {
          query = query.eq('id', patientId)
        }

        const { data } = await query.limit(1).maybeSingle()
        setPatient(data ?? null)
      } catch (err) {
        console.warn('[PatientReferralCard] Error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [patientId, supabase])

  const referralLink = patient?.referral_code
    ? `https://audenti.vercel.app/?ref=${patient.referral_code}`
    : 'https://audenti.vercel.app/?ref=PENDIENTE'

  const handleCopy = async (type: 'link' | 'code') => {
    const text = type === 'link' ? referralLink : (patient?.referral_code ?? '')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Cargando código de referido...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
        <QrCode className="w-10 h-10 text-slate-200 mx-auto" />
        <p className="text-sm font-bold text-slate-400">Sin código de referido aún</p>
        <p className="text-xs text-slate-400">El código se genera automáticamente al registrarse en el sistema.</p>
      </div>
    )
  }

  // Métricas de niveles de embajador
  const level = patient.total_referrals >= 10 ? 'Platino' : patient.total_referrals >= 5 ? 'Oro' : patient.total_referrals >= 2 ? 'Plata' : 'Bronce'
  const levelColors: Record<string, string> = {
    'Platino': 'text-slate-100 bg-slate-700',
    'Oro':     'text-slate-950 bg-amber-400',
    'Plata':   'text-slate-700 bg-slate-200',
    'Bronce':  'text-amber-900 bg-amber-100',
  }
  const nextMilestone = patient.total_referrals >= 10 ? 10 : patient.total_referrals >= 5 ? 10 : patient.total_referrals >= 2 ? 5 : 2

  return (
    <div className="space-y-4">
      {/* Tarjeta Principal */}
      <div className="bg-gradient-to-br from-[#202D4C] to-slate-700 rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Decoración */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-10 w-40 h-40 rounded-full bg-amber-400/10" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Código de Referido</span>
              <h3 className="text-lg font-bold mt-0.5">{patient.full_name}</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-[11px] font-black ${levelColors[level]}`}>
              {level}
            </span>
          </div>

          {/* Código único */}
          <div className="bg-black/20 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tu código único</p>
              <code className="text-2xl font-black tracking-widest text-amber-400 font-mono">
                {patient.referral_code ?? 'Generando...'}
              </code>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('code')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="Copiar código"
            >
              {copied === 'code' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Copy className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Barra de progreso hacia siguiente nivel */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-300">{patient.total_referrals} referidos</span>
              <span className="text-amber-400">{nextMilestone} para {level === 'Bronce' ? 'Plata' : level === 'Plata' ? 'Oro' : 'Platino'}</span>
            </div>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (patient.total_referrals / nextMilestone) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enlace para compartir */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Enlace de invitación</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5">
          <p className="flex-1 text-xs font-mono text-slate-600 truncate">{referralLink}</p>
          <button
            type="button"
            onClick={() => handleCopy('link')}
            className="shrink-0 p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
          >
            {copied === 'link' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Comparte este enlace con amigos o familiares. Al registrarse usando tu enlace, ambos acumulan beneficios en el programa de lealtad Audenti.
        </p>
      </div>

      {/* Beneficios del programa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Beneficios por nivel</span>
        </div>
        <div className="space-y-2">
          {[
            { nivel: 'Bronce',  req: '1 referido',   benefit: 'Descuento 5% en próxima consulta', active: patient.total_referrals >= 1  },
            { nivel: 'Plata',   req: '2 referidos',  benefit: 'Limpieza dental gratuita',           active: patient.total_referrals >= 2  },
            { nivel: 'Oro',     req: '5 referidos',  benefit: 'Blanqueamiento con descuento 30%',  active: patient.total_referrals >= 5  },
            { nivel: 'Platino', req: '10 referidos', benefit: 'Tratamiento de ortodoncia especial', active: patient.total_referrals >= 10 },
          ].map(b => (
            <div key={b.nivel} className={`flex items-center gap-3 p-3 rounded-xl border ${
              b.active ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50 opacity-50'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                b.active ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-400'
              }`}>
                {b.active ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">{b.nivel}</span>
                  <span className="text-[10px] text-slate-400">({b.req})</span>
                </div>
                <p className="text-[11px] text-slate-600">{b.benefit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
