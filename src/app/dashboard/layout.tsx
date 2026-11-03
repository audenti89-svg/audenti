'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { NightEmergencyRedAlertBanner } from '@/components/ai/NightEmergencyRedAlertBanner'
import { OmnipresentDoctorLiveAlerts } from '@/components/notifications/OmnipresentDoctorLiveAlerts'
import { InactivityLockout } from '@/components/auth/InactivityLockout'
import { isSystemAdminEmail, isInternalUser as checkIsInternalUser } from '@/lib/auth/admin-emails'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function checkInternalAuth() {
      // Obtener el usuario actual desde la sesión de Supabase
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Si no hay sesión, mandar al login
        router.push('/auth/login')
        return
      }

      const userEmail = (user.email || '').toLowerCase().trim()
      const userMetaRole = (user.user_metadata?.role || user.app_metadata?.role || user.user_metadata?.doctor_type || '').toLowerCase()
      
      // Ricardo Sánchez y Dra. Aura Estudillo tienen acceso irrestricto de SuperAdmin / Dueño
      let isInternal = isSystemAdminEmail(userEmail) || checkIsInternalUser(userEmail, userMetaRole)

      // Si no viene en metadata, verificar en tabla users
      if (!isInternal) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('role, doctor_type')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) {
            const dbRole = (profile.role || profile.doctor_type || '').toLowerCase()
            if (checkIsInternalUser(userEmail, dbRole)) {
              isInternal = true
            }
          }
        } catch {}
      }

      // Si definitivamente no es personal interno (es paciente), redirigir a su portal sin cerrar sesión
      if (!isInternal) {
        router.push('/portal')
        return
      }

      setAuthorized(true)
    }

    checkInternalAuth()
  }, [router, supabase])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Verificando credenciales de acceso clínico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72 flex flex-col min-h-[100dvh]">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="relative pt-20 px-4 sm:px-6 lg:px-12 py-8 w-full max-w-7xl mx-auto flex-1">
          {children}
        </main>
      </div>

      {/* Bloqueo por Inactividad NOM-004-SSA3 (45 min con alerta preventiva a 40 min) */}
      <InactivityLockout />

      {/* Panel Flotante de Alerta Roja 24/7 para la Dra. Aura Estudillo */}
      <NightEmergencyRedAlertBanner />

      {/* Sistema Omnipresente de Alertas en Vivo y Web Push 24/7 */}
      <OmnipresentDoctorLiveAlerts />
    </div>
  )
}
