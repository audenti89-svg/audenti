'use client'

import { useEffect } from 'react'

/**
 * REGLA MAESTRA DE SESIÓN AUDENTI 2027:
 * Persistencia continua de sesión. NO se cierra ni bloquea la sesión por inactividad,
 * cambio de pestaña, ventana en segundo plano o caducidad de alertas de citas.
 * La sesión permanece 100% activa hasta que el usuario decida cerrarla explícitamente.
 */
export function InactivityLockout() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('audenti_session_locked')
      } catch {}
    }
  }, [])

  return null
}
