'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#fdf9f1]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="relative pt-20 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
