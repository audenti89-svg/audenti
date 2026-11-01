'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { AcquisitionChannelSelector } from '@/components/auth/AcquisitionChannelSelector'
import { ReferrerInput } from '@/components/auth/ReferrerInput'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'

// ────────────────────────────────────────────────────────────
// Leer y guardar UTM params en sessionStorage
// ────────────────────────────────────────────────────────────
function captureUTMParams(params: URLSearchParams) {
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'canal', 'qr']
  utmKeys.forEach(key => {
    const val = params.get(key)
    if (val) sessionStorage.setItem(`audenti_${key}`, val)
  })
}

function getStoredUTM() {
  if (typeof window === 'undefined') return {}
  return {
    utm_source:   sessionStorage.getItem('audenti_utm_source') ?? '',
    utm_medium:   sessionStorage.getItem('audenti_utm_medium') ?? '',
    utm_campaign: sessionStorage.getItem('audenti_utm_campaign') ?? '',
    utm_content:  sessionStorage.getItem('audenti_utm_content') ?? '',
    ref:          sessionStorage.getItem('audenti_ref') ?? '',
    canal:        sessionStorage.getItem('audenti_canal') ?? '',
    qr:           sessionStorage.getItem('audenti_qr') ?? '',
  }
}

// ────────────────────────────────────────────────────────────
// Formulario de registro con atribución
// ────────────────────────────────────────────────────────────
function RegisterForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Datos del usuario
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Atribución
  const [channel, setChannel] = useState('')
  const [referrerCode, setReferrerCode] = useState('')
  const [referrerName, setReferrerName] = useState('')
  const [detectedQR, setDetectedQR] = useState('')
  const [detectedCanal, setDetectedCanal] = useState('')

  // Capturar UTM params al montar
  useEffect(() => {
    captureUTMParams(searchParams)
    const stored = getStoredUTM()

    // Pre-llenar canal si viene en URL
    if (stored.canal && !channel) setChannel(stored.canal)
    if (stored.utm_source && !channel) setChannel(stored.utm_source)
    if (stored.ref) setReferrerCode(stored.ref)
    if (stored.qr) setDetectedQR(stored.qr)
    if (stored.canal) setDetectedCanal(stored.canal)
  }, [searchParams])

  // Construir el estado OAuth con los UTM guardados
  const buildOAuthState = () => {
    const utm = getStoredUTM()
    return btoa(JSON.stringify({
      channel:       channel || utm.canal || utm.utm_source || '',
      referrer_code: referrerCode || utm.ref || '',
      referrer_name: referrerName,
      qr_code_id:    detectedQR || utm.qr || '',
      utm_source:    utm.utm_source,
      utm_medium:    utm.utm_medium,
      utm_campaign:  utm.utm_campaign,
      utm_content:   utm.utm_content,
      full_name:     fullName,
      phone:         phone,
    }))
  }

  const handleGoogleRegister = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const state = buildOAuthState()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?registration=true`,
          queryParams: { state },
        },
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Error en OAuth:', err)
      setErrorMsg(err?.message || 'Error al conectar con Google')
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#202D4C] to-slate-700 p-6 text-white text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 mx-auto mb-3 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-slate-950" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Audenti DentalCloud Pro</h1>
        <p className="text-xs text-slate-300 mt-1">Registro de paciente — Dra. Aura Estudillo</p>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className={`w-2 h-2 rounded-full transition-all ${step >= 1 ? 'bg-amber-400 w-6' : 'bg-white/20'}`} />
          <div className={`w-2 h-2 rounded-full transition-all ${step >= 2 ? 'bg-amber-400 w-6' : 'bg-white/20'}`} />
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Detectado QR / Canal */}
        {(detectedQR || detectedCanal) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {detectedQR ? `Código QR detectado: ${detectedQR}` : `Canal detectado: ${detectedCanal}`}
            — tus datos de origen quedan guardados automáticamente.
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* PASO 1: Datos personales */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800">1 de 2 — Información personal</h2>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej. María García López"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                Teléfono <span className="text-slate-400 normal-case font-normal">(WhatsApp preferido)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="5512345678"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono"
                autoComplete="tel"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!fullName.trim() || phone.length < 10}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PASO 2: Atribución y Google OAuth */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-800">2 de 2 — ¿Cómo nos conociste?</h2>

            <AcquisitionChannelSelector
              value={channel}
              onChange={setChannel}
            />

            <ReferrerInput
              referrerCode={referrerCode}
              referrerName={referrerName}
              onCodeChange={setReferrerCode}
              onNameChange={setReferrerName}
            />

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <p className="text-[11px] text-slate-400 text-center">
                Al continuar, creas tu expediente con Google y aceptas nuestro tratamiento de datos personales (NOM-004-SSA3).
              </p>
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading}
                className="w-full py-3.5 px-4 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 text-sm"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.12 0 9.82 0 12s.43 3.88 1.18 5.4l4.09-3.16z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.6l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                </svg>
                {loading ? 'Conectando con Google...' : 'Crear expediente con Google'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ← Volver
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-5 flex items-center justify-between text-xs text-slate-400">
        <Link href="/auth/login" className="hover:text-amber-600 transition-colors">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
        <span className="font-semibold">Céd. Prof. 8492019</span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page export
// ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Cargando...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
