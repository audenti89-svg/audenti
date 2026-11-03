'use client'

import { useState, useEffect } from 'react'
import {
  Share2,
  Copy,
  CheckCircle2,
  Users,
  Award,
  Gift,
  QrCode,
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface ReferralPatient {
  id: string
  full_name: string
  referral_code: string
  total_referrals: number
  points: number
  tier?: string
}

interface PatientReferralCardProps {
  patientId?: string
}

export function PatientReferralCard({ patientId }: PatientReferralCardProps) {
  const supabase = createClient()
  const [patient, setPatient] = useState<ReferralPatient | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)

  useEffect(() => {
    async function loadPatient() {
      setLoading(true)
      try {
        let query = supabase
          .from('patients')
          .select('id, full_name, referral_code, total_referrals, points')

        if (patientId) {
          query = query.eq('id', patientId)
        } else {
          // Si no se provee ID, intentar con el usuario autenticado
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            setLoading(false)
            return
          }
          query = query.eq('auth_user_id', user.id)
        }

        const { data, error } = await query.maybeSingle()
        if (error) throw error
        setPatient(data)
      } catch (err) {
        console.warn('[PatientReferralCard] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPatient()
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
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 p-8 text-center text-white">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Cargando código de referido...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 p-8 text-center space-y-2 text-white">
        <QrCode className="w-10 h-10 text-slate-600 mx-auto" />
        <p className="text-sm font-bold text-slate-300">Sin código de referido aún</p>
        <p className="text-xs text-slate-500">El código se genera automáticamente al registrarse en el sistema.</p>
      </div>
    )
  }

  // Métricas de niveles de embajador
  const level = patient.total_referrals >= 10 ? 'Platino' : patient.total_referrals >= 5 ? 'Oro' : patient.total_referrals >= 2 ? 'Plata' : 'Bronce'
  const levelColors: Record<string, string> = {
    'Platino': 'text-slate-100 bg-slate-800 border border-slate-700',
    'Oro':     'text-slate-950 bg-amber-400 font-black',
    'Plata':   'text-slate-950 bg-slate-200 font-bold',
    'Bronce':  'text-amber-300 bg-amber-950/60 border border-amber-500/40',
  }

  return (
    <div className="space-y-4 text-white">
      {/* Tarjeta principal con código QR / Embajador */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 border-2 border-amber-500/40 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Programa de Embajadores Audenti
            </span>
            <h3 className="text-xl font-black text-white">{patient.full_name}</h3>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wide ${levelColors[level]}`}>
                Nivel {level}
              </span>
              <span className="text-xs text-slate-300 font-bold">
                {patient.total_referrals} {patient.total_referrals === 1 ? 'amigo referido' : 'amigos referidos'}
              </span>
            </div>
          </div>

          <div className="shrink-0 p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-md">
            <QrCode className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        {/* Código de referido */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Tu código único</span>
            <span className="text-base font-black font-mono tracking-widest text-amber-400">
              {patient.referral_code || 'AUD-PROMO'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy('code')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors cursor-pointer"
          >
            {copied === 'code' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Enlace para compartir */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Enlace de invitación</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/80 rounded-xl border border-slate-800 px-3 py-2.5">
          <p className="flex-1 text-xs font-mono text-slate-300 truncate">{referralLink}</p>
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
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Beneficios por nivel</span>
        </div>
        <div className="space-y-2">
          {[
            { nivel: 'Bronce',  req: '1 referido',   benefit: 'Descuento 5% en próxima consulta', active: patient.total_referrals >= 1  },
            { nivel: 'Plata',   req: '2 referidos',  benefit: 'Limpieza dental gratuita',           active: patient.total_referrals >= 2  },
            { nivel: 'Oro',     req: '5 referidos',  benefit: 'Blanqueamiento con descuento 30%',  active: patient.total_referrals >= 5  },
            { nivel: 'Platino', req: '10 referidos', benefit: 'Tratamiento de ortodoncia especial', active: patient.total_referrals >= 10 },
          ].map(b => (
            <div key={b.nivel} className={`flex items-center gap-3 p-3 rounded-xl border ${
              b.active ? 'border-amber-400/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60 opacity-50'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                b.active ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
              }`}>
                {b.active ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">{b.nivel}</span>
                  <span className="text-[10px] text-slate-400">({b.req})</span>
                </div>
                <p className="text-[11px] text-slate-300">{b.benefit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
