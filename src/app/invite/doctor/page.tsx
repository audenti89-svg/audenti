'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  ShieldCheck,
  Stethoscope,
  Building2,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase
} from 'lucide-react'

function InviteDoctorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Formulario
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorMsg('No se proporcionó ningún token de invitación. Solicita tu enlace a la Dra. Aura Estudillo.')
      setLoading(false)
      return
    }

    async function verifyToken() {
      try {
        const res = await fetch(`/api/invite/verify?token=${encodeURIComponent(token!)}`)
        const data = await res.json()

        if (!data.valid) {
          setErrorMsg(data.error || 'Invitación no válida')
        } else {
          setInvitation(data.invitation)
          if (data.invitation.full_name) {
            setFullName(data.invitation.full_name)
          }
        }
      } catch {
        setErrorMsg('Error de conexión al verificar el enlace de invitación.')
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleAcceptWithPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          full_name: fullName.trim(),
          password
        })
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al aceptar la invitación.')
      }

      setSuccessMsg(result.message || '¡Cuenta activada con éxito!')

      // Iniciar sesión inmediatamente
      await supabase.auth.signInWithPassword({
        email: invitation.email,
        password
      })

      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el alta.')
      setSubmitting(false)
    }
  }

  const handleGoogleAccept = async () => {
    setSubmitting(true)
    setErrorMsg('')
    try {
      const stateObj = { invite_token: token }
      const state = btoa(JSON.stringify(stateObj))

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { state }
        }
      })
      if (error) throw error
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con Google.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">Verificando credenciales de invitación médica...</p>
        </div>
      </div>
    )
  }

  if (errorMsg && !invitation) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Enlace No Válido</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
          <div className="pt-2">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              Ir al Inicio de Sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isSocio = invitation?.role === 'socio'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#131B2E] to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Encabezado Institucional */}
        <div className="bg-gradient-to-br from-[#202D4C] to-slate-900 p-6 sm:p-8 text-white text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 mx-auto mb-3 flex items-center justify-center shadow-lg shadow-amber-400/20">
            <Stethoscope className="w-7 h-7 text-slate-950" />
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 border ${
            isSocio
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
              : 'bg-blue-400/20 text-blue-300 border-blue-400/30'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            {isSocio ? 'Odontólogo Socio' : 'Odontólogo Especialista'}
          </span>

          <h1 className="text-2xl font-bold tracking-tight">Audenti DentalCloud Pro</h1>
          <p className="text-xs text-slate-300 mt-1">
            Invitación de {invitation?.invited_by_name}
          </p>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-300">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{invitation?.branch_name}</span>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Tarjeta de Especificación de Rol */}
          <div className={`p-4 rounded-2xl border text-xs ${
            isSocio
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              <Briefcase className="w-4 h-4" />
              <span>Privilegios Asignados: {isSocio ? 'Socio Clínico' : 'Especialista Colaborador'}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {isSocio
                ? 'Acceso total a supervisión de agenda de sucursal, expediente clínico, reportes financieros y analítica de BI.'
                : 'Acceso a tu propia agenda vespertina (4:00 PM a 9:00 PM / Domingos), expedientes clínicos y pacientes asignados a tu sucursal.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulario de Alta */}
          <form onSubmit={handleAcceptWithPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Institucional Invitado
              </label>
              <input
                type="email"
                value={invitation?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre Completo y Especialidad *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Dr. Carlos Mendoza • Ortodoncia"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-98 cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Activando credenciales...' : 'Completar Registro Médico e Ingresar'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* O continuar con Google */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">
              o acepta con tu cuenta de google
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAccept}
            disabled={submitting}
            className="w-full py-3 px-4 border border-slate-300 rounded-xl font-semibold text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 cursor-pointer shadow-sm active:scale-98 disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.12 0 9.82 0 12s.43 3.88 1.18 5.4l4.09-3.16z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.6l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            Vincular con Google
          </button>

          {/* Nota de confidencialidad */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Acceso clínico cifrado bajo la norma NOM-004-SSA3-2012</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InviteDoctorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InviteDoctorContent />
    </Suspense>
  )
}
