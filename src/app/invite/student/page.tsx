'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  GraduationCap,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock
} from 'lucide-react'

function InviteStudentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pass, setPass] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorMsg('No se proporcionó ningún token de pase. Solicita tu enlace a la Dra. Aura Estudillo.')
      setLoading(false)
      return
    }

    async function verifyPass() {
      try {
        const res = await fetch(`/api/invite/student/verify?token=${encodeURIComponent(token!)}`)
        const data = await res.json()

        if (!data.valid) {
          setErrorMsg(data.error || 'Pase no válido')
        } else {
          setPass(data.pass)
          if (data.pass.student_name) {
            setFullName(data.pass.student_name)
          }
        }
      } catch {
        setErrorMsg('Error al verificar el pase de servicio social.')
      } finally {
        setLoading(false)
      }
    }

    verifyPass()
  }, [token])

  const handleActivate = async (e: React.FormEvent) => {
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
      const res = await fetch('/api/invite/student/accept', {
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
        throw new Error(result.error || 'Error al activar el pase.')
      }

      setSuccessMsg(result.message)

      await supabase.auth.signInWithPassword({
        email: pass.student_email,
        password
      })

      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el pase.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">Validando pase de servicio social...</p>
        </div>
      </div>
    )
  }

  if (errorMsg && !pass) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Pase No Válido</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all cursor-pointer"
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    )
  }

  const expiresFormatted = new Date(pass?.expires_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0D1F2D] to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1B3B36] to-slate-900 p-6 sm:p-8 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-400 mx-auto mb-3 flex items-center justify-center shadow-lg shadow-emerald-400/20 text-slate-950">
            <GraduationCap className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
            Pase de Servicio Social / Prácticas
          </span>

          <h1 className="text-2xl font-bold tracking-tight">Audenti DentalCloud Pro</h1>
          <p className="text-xs text-slate-300 mt-1">
            Supervisado por: {pass?.created_by_name}
          </p>

          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center justify-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{pass?.branch_name}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Vigencia: {pass?.duration_months} meses</span>
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Card de Restricción */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Vigencia hasta: {expiresFormatted}</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Pase con <strong>permisos de solo lectura clínica</strong> en tu sucursal. Concluido el periodo de {pass?.duration_months} meses, el acceso expira automáticamente.
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

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Institucional Registrado
              </label>
              <input
                type="email"
                disabled
                value={pass?.student_email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Estudiante / Pasante *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Pasante Sofía Hernández"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Crear Contraseña *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              {submitting ? 'Activando pase...' : 'Activar Pase de Servicio Social e Ingresar'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Uso académico regulado • Sin facultades de cobro ni finanzas</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InviteStudentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InviteStudentContent />
    </Suspense>
  )
}
