'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { AcquisitionChannelSelector } from '@/components/auth/AcquisitionChannelSelector'
import { ReferrerInput } from '@/components/auth/ReferrerInput'
import Link from 'next/link'
import { ChevronRight, Sparkles, Building2, UserCheck, Phone, CheckCircle2, Lock } from 'lucide-react'

// Definición canónica de sucursales institucionales Audenti
const BRANCHES = [
  {
    id: 'balbuena',
    name: 'Sucursal Balbuena (Matriz)',
    address: 'Av. del Taller & Retorno 12, Jardín Balbuena, Venustiano Carranza',
    tenantId: '00000000-0000-0000-0000-000000000001',
    badge: 'Sede Principal • Dra. Aura Estudillo',
  },
  {
    id: 'guadalupe-chalma',
    name: 'Sucursal Guadalupe Chalma',
    address: 'Av. Guadalupe Victoria 45, Gustavo A. Madero',
    tenantId: '00000000-0000-0000-0000-000000000002',
    badge: 'Franquicia Operativa',
  },
  {
    id: 'colonia-roma',
    name: 'Sucursal Colonia Roma',
    address: 'Álvaro Obregón 180, Col. Roma Norte, Cuauhtémoc',
    tenantId: '00000000-0000-0000-0000-000000000003',
    badge: 'Especialidades Odontológicas',
  },
]

// ────────────────────────────────────────────────────────────
// Leer y guardar UTM params en sessionStorage y cookie
// ────────────────────────────────────────────────────────────
function captureUTMParams(params: URLSearchParams) {
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'canal', 'qr']
  const attribution: Record<string, string> = {}
  utmKeys.forEach(key => {
    const val = params.get(key)
    if (val) {
      sessionStorage.setItem(`audenti_${key}`, val)
      attribution[key] = val
    }
  })
  if (Object.keys(attribution).length > 0) {
    try {
      document.cookie = `audenti_attr=${encodeURIComponent(JSON.stringify(attribution))}; path=/; max-age=2592000; SameSite=Lax`
    } catch {}
  }
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
// Formulario de registro con sucursal y atribución
// ────────────────────────────────────────────────────────────
function RegisterForm() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Datos personales y sucursal
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('balbuena')

  // Atribución comercial
  const [channel, setChannel] = useState('')
  const [referrerCode, setReferrerCode] = useState('')
  const [referrerName, setReferrerName] = useState('')
  const [referrerId, setReferrerId] = useState('')
  const [relationshipType, setRelationshipType] = useState('otro')
  const [detectedQR, setDetectedQR] = useState('')
  const [detectedCanal, setDetectedCanal] = useState('')

  // Registro manual directo opcional
  const [registerMode, setRegisterMode] = useState<'google' | 'direct'>('google')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Capturar UTM params al montar
  useEffect(() => {
    captureUTMParams(searchParams)
    const stored = getStoredUTM()

    if (stored.canal && !channel) setChannel(stored.canal)
    if (stored.utm_source && !channel) setChannel(stored.utm_source)
    if (stored.ref) setReferrerCode(stored.ref)
    if (stored.qr) setDetectedQR(stored.qr)
    if (stored.canal) setDetectedCanal(stored.canal)
  }, [searchParams])

  const currentBranch = BRANCHES.find(b => b.id === selectedBranchId) ?? BRANCHES[0]

  // Construir el payload de atribución y sucursal
  const buildAttributionPayload = () => {
    const utm = getStoredUTM()
    const effChannel = channel || utm.canal || utm.utm_source || ''
    const effRefCode = referrerCode || utm.ref || ''
    const effQR = detectedQR || utm.qr || ''

    // Determinar si la atribución está completa o pendiente de revisión en recepción
    const isAttributed = Boolean(
      (effChannel && effChannel !== 'sin_dato') ||
      effRefCode ||
      referrerId ||
      referrerName.trim() ||
      effQR
    )
    const attributionStatus = isAttributed ? 'completed' : 'pending_review'

    return {
      channel:            effChannel || 'directo',
      referrer_code:      effRefCode,
      referrer_name:      referrerName.trim(),
      referrer_id:        referrerId || null,
      relationship_type:  relationshipType,
      qr_code_id:         effQR,
      attribution_status: attributionStatus,
      utm_source:         utm.utm_source,
      utm_medium:         utm.utm_medium,
      utm_campaign:       utm.utm_campaign,
      utm_content:        utm.utm_content,
      full_name:          fullName.trim(),
      phone:              phone.trim(),
      branch_id:          currentBranch.id,
      branch_name:        currentBranch.name,
      tenant_id:          currentBranch.tenantId,
    }
  }

  // 1. Registro con Google OAuth (pasando atribución y sucursal en el estado)
  const handleGoogleRegister = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const payload = buildAttributionPayload()
      const state = btoa(JSON.stringify(payload))
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?registration=true`,
          queryParams: { state },
        },
      })
      if (error) throw error
    } catch (err: any) {
      console.error('[Register] Error con Google OAuth:', err)
      setErrorMsg(err?.message || 'Error al conectar con Google')
      setLoading(false)
    }
  }

  // 2. Registro directo con correo y contraseña
  const handleDirectRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (!email.trim() || !password || password.length < 6) {
        throw new Error('Por favor ingresa un correo válido y contraseña de al menos 6 caracteres.')
      }

      const payload = buildAttributionPayload()

      // Crear usuario en Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: payload.full_name,
            phone: payload.phone,
            branch_id: payload.branch_id,
            branch_name: payload.branch_name,
          },
        },
      })

      if (authErr) throw authErr

      const userId = authData.user?.id
      if (userId) {
        // Resolver referidor ID definitivo si viene código o id
        let finalReferrerId = payload.referrer_id
        if (!finalReferrerId && payload.referrer_code) {
          const { data: refPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('referral_code', payload.referrer_code.toUpperCase())
            .maybeSingle()
          if (refPatient?.id) {
            finalReferrerId = refPatient.id
          }
        }

        // Guardar paciente con atribución y sucursal
        const patientData: any = {
          id: userId,
          auth_user_id: userId,
          user_id: userId,
          full_name: payload.full_name,
          phone: payload.phone,
          email: email.trim(),
          acquisition_channel: payload.channel,
          branch_id: payload.branch_id,
          branch_name: payload.branch_name,
          tenant_id: payload.tenant_id,
          referrer_name: payload.referrer_name || null,
          referrer_id: finalReferrerId || null,
          qr_code_id: payload.qr_code_id || null,
          attribution_status: payload.attribution_status,
          referral_code: `AUD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          onboarding_completed: true,
        }

        await supabase.from('patients').upsert(patientData, { onConflict: 'id' })

        // Si se vinculó referidor, sumar al embajador y conectar árbol familiar
        if (finalReferrerId) {
          try {
            await supabase.rpc('increment_referral_count', { referrer: finalReferrerId })
          } catch {}

          if (payload.relationship_type) {
            try {
              await supabase.from('family_relationships').insert({
                patient_id: finalReferrerId,
                related_patient_id: userId,
                relationship_type: payload.relationship_type,
                notes: `Vinculado en registro web (${payload.relationship_type})`
              })
            } catch (famErr) {
              console.warn('Nota registro en family_relationships:', famErr)
            }
          }
        }

        // Sincronizar en users si existe tabla de perfil
        try {
          await supabase.from('users').upsert({
            id: userId,
            email: email.trim(),
            full_name: payload.full_name,
            phone: payload.phone,
            role: 'patient',
            branch_id: payload.branch_id,
            branch_name: payload.branch_name,
            acquisition_channel: payload.channel,
            referrer_name: payload.referrer_name,
            qr_code_id: payload.qr_code_id,
            attribution_status: payload.attribution_status,
            onboarding_completed: true,
          }, { onConflict: 'id' })
        } catch {}
      }

      setSuccessMsg('¡Cuenta y expediente creados con éxito! Redirigiendo...')
      setTimeout(() => {
        router.push('/portal')
        router.refresh()
      }, 1200)
    } catch (err: any) {
      console.error('[Register] Error directo:', err)
      setErrorMsg(err?.message || 'Error al crear la cuenta.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header Institucional */}
      <div className="bg-gradient-to-br from-[#202D4C] to-slate-800 p-6 text-white text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 mx-auto mb-3 flex items-center justify-center shadow-lg shadow-amber-400/20">
          <Sparkles className="w-6 h-6 text-slate-950" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Audenti DentalCloud Pro</h1>
        <p className="text-xs text-slate-300 mt-1">Alta de Expediente Clínico — Dra. Aura Estudillo</p>

        {/* Pasos */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className={`w-2 h-2 rounded-full transition-all ${step >= 1 ? 'bg-amber-400 w-6' : 'bg-white/20'}`} />
          <div className={`w-2 h-2 rounded-full transition-all ${step >= 2 ? 'bg-amber-400 w-6' : 'bg-white/20'}`} />
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        {/* Notificación de campaña detectada */}
        {(detectedQR || detectedCanal) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              {detectedQR ? `Campaña física detectada (${detectedQR})` : `Canal detectado (${detectedCanal})`}.
              Tus beneficios y origen quedarán vinculados de inmediato.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs font-semibold text-emerald-800">
            {successMsg}
          </div>
        )}

        {/* ── PASO 1: Datos Personales y Selección Explícita de Sucursal ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">1 de 2 — Información y Sucursal</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paso 1</span>
            </div>

            {/* Nombre Completo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                Nombre Completo Real *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej. Roberto Sánchez Gómez"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                autoComplete="name"
              />
            </div>

            {/* Teléfono Celular */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                Teléfono Celular (WhatsApp) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="55 1234 5678"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono"
                autoComplete="tel"
              />
            </div>

            {/* SELECCIÓN OBLIGATORIA DE SUCURSAL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                Sucursal Dental de Preferencia *
              </label>
              <div className="space-y-2">
                {BRANCHES.map(branch => {
                  const isSelected = selectedBranchId === branch.id
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => setSelectedBranchId(branch.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/30 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{branch.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                            {branch.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{branch.address}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Tu expediente clínico se asignará a esta clínica sin requerir permisos de ubicación GPS.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!fullName.trim() || phone.length < 10}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Siguiente: Canal de Origen <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── PASO 2: Atribución Comercial y Selección de Método ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">2 de 2 — ¿Cómo nos conociste?</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paso 2</span>
            </div>

            {/* Resumen de Sede Elegida */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-700">{currentBranch.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-amber-600 font-bold hover:underline cursor-pointer"
              >
                Cambiar
              </button>
            </div>

            {/* Selector de Canal */}
            <AcquisitionChannelSelector
              value={channel}
              onChange={setChannel}
            />

            {/* Referidor con Autocompletado y Red Familiar */}
            <ReferrerInput
              referrerCode={referrerCode}
              referrerName={referrerName}
              referrerId={referrerId}
              relationshipType={relationshipType}
              onCodeChange={setReferrerCode}
              onNameChange={setReferrerName}
              onIdChange={setReferrerId}
              onRelationshipChange={setRelationshipType}
            />

            {/* Métodos de Registro: Google OAuth vs Directo */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRegisterMode('google')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    registerMode === 'google' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Conectar con Google
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterMode('direct')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    registerMode === 'direct' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Correo y Contraseña
                </button>
              </div>

              {registerMode === 'google' ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Sincronización instantánea de tu correo de Google con tu expediente Audenti (NOM-004-SSA3).
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleRegister}
                    disabled={loading}
                    className="w-full py-3.5 px-4 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 shadow-xs active:scale-95 cursor-pointer disabled:opacity-60 text-sm"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.12 0 9.82 0 12s.43 3.88 1.18 5.4l4.09-3.16z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.6l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                    </svg>
                    {loading ? 'Conectando con Google...' : 'Continuar con Google OAuth'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDirectRegister} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="paciente@correo.com"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Contraseña Personal *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Creando expediente...' : 'Crear Expediente Directo'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer text-center"
              >
                ← Volver al paso 1
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
        <Link href="/auth/login" className="hover:text-amber-600 transition-colors font-medium">
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
        <span className="font-semibold text-slate-400">Dra. Aura Estudillo • Céd. 8492019</span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Page export
// ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Cargando módulo de registro...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
