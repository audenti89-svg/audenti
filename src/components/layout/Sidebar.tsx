'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Stethoscope,
  CircleDollarSign,
  BarChart3,
  Contact2,
  MessageSquare,
  Package,
  HeartHandshake,
  Settings,
  Sparkles,
  ChevronDown
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const clinicalNav: NavItem[] = [
  { label: 'Inicio',            path: '/dashboard',              icon: LayoutDashboard },
  { label: 'Agenda (Google Cal)',path: '/dashboard/calendar',     icon: Calendar },
  { label: 'Pacientes',         path: '/dashboard/pacientes',    icon: Users },
  { label: 'Expediente Clínico',path: '/dashboard/expediente',  icon: FileText },
  { label: 'Tratamientos',      path: '/dashboard/tratamientos', icon: Stethoscope },
]

const businessNav: NavItem[] = [
  { label: 'Finanzas',          path: '/dashboard/finanzas',     icon: CircleDollarSign },
  { label: 'Reportes',          path: '/dashboard/reportes',     icon: BarChart3 },
  { label: 'CRM & Seguimiento', path: '/dashboard/crm',          icon: Contact2 },
  { label: 'Comunicación',      path: '/dashboard/chat',         icon: MessageSquare },
  { label: 'Inventario',        path: '/dashboard/inventario',   icon: Package },
  { label: 'Fidelización',      path: '/dashboard/fidelizacion', icon: HeartHandshake },
]

const systemNav: NavItem[] = [
  { label: 'Configuración',     path: '/dashboard/configuracion',icon: Settings },
]

function NavGroup({ title, items, unconfirmedCount }: { title: string; items: NavItem[]; unconfirmedCount: number }) {
  const pathname = usePathname()
  return (
    <div className="space-y-1">
      <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
        {title}
      </span>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
          const Icon = item.icon
          const isCommunication = item.label === 'Comunicación'
          const showPulsingBadge = isCommunication && unconfirmedCount > 0

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>

              {showPulsingBadge && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] shadow-sm animate-pulse border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  Pendiente
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

import { AudentiLogo } from '@/components/ui/AudentiLogo'
import { X } from 'lucide-react'

export interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [unconfirmedCount, setUnconfirmedCount] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('audenti_frozen_omnipresent_toasts')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setUnconfirmedCount(parsed.length)
      }
    } catch {}

    const handleUnconfirmedChange = (e: any) => {
      const count = e?.detail?.unconfirmedCount ?? 0
      setUnconfirmedCount(count)
    }

    window.addEventListener('audenti_unconfirmed_notifications_change', handleUnconfirmedChange)
    return () => {
      window.removeEventListener('audenti_unconfirmed_notifications_change', handleUnconfirmedChange)
    }
  }, [])

  return (
    <>
      {/* Backdrop en Pantallas Móviles */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-[#202D4C] text-white z-50 flex flex-col shadow-2xl border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Oficial AUDENTI & Dra. Aura Estudillo */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
          <Link href="/welcome" className="hover:opacity-90 transition-opacity">
            <AudentiLogo size={42} doctorName="Dra. Aura Estudillo" />
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <NavGroup title="Gestión Clínica"     items={clinicalNav} unconfirmedCount={unconfirmedCount} />
          <NavGroup title="Operación & Negocio" items={businessNav} unconfirmedCount={unconfirmedCount} />
          <NavGroup title="Sistema"             items={systemNav}   unconfirmedCount={unconfirmedCount} />
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              AE
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">Dra. Aura Estudillo</span>
              <span className="text-[10px] text-amber-300 truncate">Dirección General &amp; Clínica</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      </aside>
    </>
  )
}
