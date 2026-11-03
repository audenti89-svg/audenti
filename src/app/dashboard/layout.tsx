'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { NightEmergencyRedAlertBanner } from '@/components/ai/NightEmergencyRedAlertBanner'
import { OmnipresentDoctorLiveAlerts } from '@/components/notifications/OmnipresentDoctorLiveAlerts'
import { InactivityLockout } from '@/components/auth/InactivityLockout'

// Validación estricta de personal clínico interno (Doctores, Socios, Pasantes, Administradores)
const ADMIN_EMAILS = ['audenti89@gmail.com']
const INTERNAL_ROLES = ['owner', 'admin', 'director', 'doctor', 'socio', 'trabajador', 'pasante', 'estudiante']

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

      const userEmail = user.email || ''
      const userMetaRole = (user.user_metadata?.role || user.app_metadata?.role || user.user_metadata?.doctor_type || '').toLowerCase()
      
      let isInternalUser =
        ADMIN_EMAILS.includes(userEmail) ||
        INTERNAL_ROLES.includes(userMetaRole)

      // Si no viene en metadata, verificar en tabla users
      if (!isInternalUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('role, doctor_type')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          const dbRole = (profile.role || profile.doctor_type || '').toLowerCase()
          if (INTERNAL_ROLES.includes(dbRole)) {
            isInternalUser = true
          }
        }
      }

      // REGLA CLAVE: Acceso exclusivo para personal interno creado previamente por la dirección
      if (!isInternalUser) {
        // Cerrar sesión y redirigir con error explícito de personal interno
        await supabase.auth.signOut()
        window.location.href = '/auth/login?error=acceso_denegado_personal_interno'
        return
      }

      setAuthorized(true)
    }

    checkInternalAuth()
  }, [router, supabase])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#080d19] flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Verificando credenciales de acceso clínico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_center,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-slate-200">
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
