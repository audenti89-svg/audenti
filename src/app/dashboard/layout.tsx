'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { NightEmergencyRedAlertBanner } from '@/components/ai/NightEmergencyRedAlertBanner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    </div>
  )
}
