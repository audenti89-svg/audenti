'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { NightEmergencyRedAlertBanner } from '@/components/ai/NightEmergencyRedAlertBanner'
import { DoctorVoiceCallAlertBanner } from '@/components/voice/DoctorVoiceCallAlertBanner'

// Validación estricta de acceso por correo oficial de la Dra. Aura Estudillo
const ADMIN_EMAILS = ['audenti89@gmail.com'];

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
    async function checkAdminAuth() {
      // Obtener el usuario actual desde la sesión de Supabase
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Si no hay sesión, mandar al login
        router.push('/auth/login')
        return
      }

      const userEmail = user.email || ''
      const isAdmin = ADMIN_EMAILS.includes(userEmail) ||
        user.user_metadata?.role === 'owner' ||
        user.user_metadata?.role === 'admin' ||
        user.app_metadata?.role === 'owner' ||
        user.app_metadata?.role === 'admin'

      // REGLA CLAVE: Si NO es la doctora y está intentando ver el dashboard administrativo:
      if (!isAdmin) {
        // Redirigir inmediatamente al portal de paciente y bloquear el acceso al panel general
        window.location.href = '/portal'
        return
      }

      setAuthorized(true)
    }

    checkAdminAuth()
  }, [router, supabase])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#080d19] flex items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Verificando credenciales de acceso administrativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#fdf9f1]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72 flex flex-col min-h-[100dvh]">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="relative pt-20 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto flex-1">
          {children}
        </main>
      </div>

      {/* Panel Flotante de Alerta Roja 24/7 para la Dra. Aura Estudillo */}
      <NightEmergencyRedAlertBanner />

      {/* Banner de Notificaciones de Llamadas de Voz Aura IA en Tiempo Real */}
      <DoctorVoiceCallAlertBanner />
    </div>
  )
}
