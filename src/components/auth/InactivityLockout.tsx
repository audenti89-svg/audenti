'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Lock, ShieldAlert, KeyRound, LogOut, CheckCircle2, Clock } from 'lucide-react'

// 45 minutos = 2,700,000 ms (NOM-004-SSA3 para expediente clínico electrónico)
const INACTIVITY_TIMEOUT_MS = 45 * 60 * 1000
// Advertencia a los 40 minutos (5 minutos antes del bloqueo)
const WARNING_TIMEOUT_MS = 40 * 60 * 1000

export function InactivityLockout() {
  const router = useRouter()
  const supabase = createClient()

  const [isLocked, setIsLocked] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(300)
  const [password, setPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [doctorInfo, setDoctorInfo] = useState<{ email: string; name: string; branch: string }>({
    email: '',
    name: 'Personal Médico Audenti',
    branch: 'Sucursal Balbuena (Matriz)'
  })

  const lastActivityRef = useRef<number>(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Obtener info del usuario activo
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setDoctorInfo({
            email: user.email || '',
            name: user.user_metadata?.full_name || user.user_metadata?.name || 'Dra. Aura Estudillo',
            branch: user.user_metadata?.branch_name || user.user_metadata?.branch || 'Sucursal Balbuena (Matriz)'
          })
        }
      } catch {}
    }
    loadUser()

    // Recuperar estado de bloqueo si se recargó la página mientras estaba bloqueada
    if (typeof window !== 'undefined') {
      const wasLocked = sessionStorage.getItem('audenti_session_locked')
      if (wasLocked === 'true') {
        setIsLocked(true)
      }
    }
  }, [supabase])

  const resetActivity = useCallback(() => {
    if (isLocked) return
    lastActivityRef.current = Date.now()
    setShowWarning(false)
  }, [isLocked])

  // Escuchar eventos de interacción del usuario
  useEffect(() => {
    if (isLocked) return

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    const handleUserActivity = () => resetActivity()

    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }))

    // Comprobación periódica cada 10 segundos
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        setIsLocked(true)
        setShowWarning(false)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('audenti_session_locked', 'true')
        }
      } else if (elapsed >= WARNING_TIMEOUT_MS) {
        setShowWarning(true)
        const remSecs = Math.max(0, Math.floor((INACTIVITY_TIMEOUT_MS - elapsed) / 1000))
        setSecondsRemaining(remSecs)
      } else {
        setShowWarning(false)
      }
    }, 10000)

    timerRef.current = interval

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity))
      clearInterval(interval)
    }
  }, [isLocked, resetActivity])

  const handleKeepActive = () => {
    lastActivityRef.current = Date.now()
    setShowWarning(false)
  }

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setUnlockError('')
    setUnlocking(true)

    try {
      if (password.trim().length > 0 && doctorInfo.email) {
        const { error } = await supabase.auth.signInWithPassword({
          email: doctorInfo.email,
          password: password.trim()
        })
        if (error) {
          setUnlockError('Contraseña incorrecta. Ingresa tu clave médica asignada.')
          setUnlocking(false)
          return
        }
      }

      // Desbloqueo exitoso
      setIsLocked(false)
      setPassword('')
      lastActivityRef.current = Date.now()
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('audenti_session_locked')
      }
    } catch {
      setUnlockError('Error al validar credencial. Intenta de nuevo.')
    } finally {
      setUnlocking(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('audenti_session_locked')
      }
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch {
      window.location.href = '/auth/login'
    }
  }

  return (
    <>
      {/* ── BANNER FLOTANTE DE ADVERTENCIA (40 MIN DE INACTIVIDAD) ── */}
      {showWarning && !isLocked && (
        <div className="fixed top-5 right-5 z-[9990] max-w-sm w-full bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-4 shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-xl text-white animate-bounce-subtle">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Alerta NOM-004-SSA3
              </span>
              <h4 className="text-xs font-black text-white">Bloqueo por Inactividad en {Math.ceil(secondsRemaining / 60)} min</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Por seguridad de datos clínicos, la terminal médica se suspenderá automáticamente.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleKeepActive}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Continuar Activo
                </button>
                <button
                  type="button"
                  onClick={() => setIsLocked(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Bloquear Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERLAY DE BLOQUEO MÉDICO COMPLETO (45 MIN DE INACTIVIDAD) ── */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] text-center relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border-2 border-amber-400/60 mx-auto flex items-center justify-center text-amber-300 shadow-xl shadow-amber-500/20">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-400 border border-amber-400/30">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Terminal Clínica Suspendida (NOM-004-SSA3)
                </span>
                <h2 className="text-xl font-black text-white tracking-tight mt-2">
                  Bloqueo de Seguridad por Inactividad
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Han transcurrido 45 minutos sin actividad. Tus registros y cambios han sido preservados de forma segura.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                  Profesional en Turno:
                </span>
                <div className="font-bold text-white text-sm flex items-center justify-between">
                  <span>{doctorInfo.name}</span>
                  <span className="text-[10px] font-mono text-amber-400">{doctorInfo.branch}</span>
                </div>
                {doctorInfo.email && (
                  <span className="text-xs font-mono text-slate-400 block truncate">{doctorInfo.email}</span>
                )}
              </div>

              {unlockError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left">
                  {unlockError}
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-3">
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Ingresa tu contraseña para reanudar"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={unlocking}
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>{unlocking ? 'Verificando...' : 'Desbloquear Expediente Clínico'}</span>
                </button>
              </form>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión Segura</span>
                </button>
                <span className="text-[10px] font-mono text-slate-400">Persistencia 12h Activa</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
