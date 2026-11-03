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
  { label: 'Inteligencia BI',   path: '/admin/bi',               icon: BarChart3 },
  { label: 'Reportes',          path: '/dashboard/reportes',     icon: BarChart3 },
  { label: 'CRM & Seguimiento', path: '/dashboard/crm',          icon: Contact2 },
  { label: 'Comunicación',      path: '/dashboard/comunicacion', icon: MessageSquare },
  { label: 'Inventario',        path: '/dashboard/inventario',   icon: Package },
  { label: 'Fidelización',      path: '/dashboard/fidelizacion', icon: HeartHandshake },
]

const systemNav: NavItem[] = [
  { label: 'Perfil de la Doctora', path: '/dashboard/perfil', icon: Contact2 },
  { label: 'Configuración General', path: '/dashboard/configuracion', icon: Settings },
  { label: 'Configuración WhatsApp & Chatbot', path: '/dashboard/configuracion/whatsapp', icon: MessageSquare },
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
import { X, UserPlus, GraduationCap, Lock, UserCheck, LogOut, ArrowRight, ExternalLink } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { InviteDoctorModal } from '@/components/admin/InviteDoctorModal'
import { QuickStudentPassModal } from '@/components/admin/QuickStudentPassModal'

export interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [unconfirmedCount, setUnconfirmedCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [doctorType, setDoctorType] = useState<string>('')
  const [userName, setUserName] = useState<string>('Dra. Aura Estudillo')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUser(user)
          const isSuper = user.email === 'audenti89@gmail.com'

          const { data: profile } = await supabase
            .from('users')
            .select('role, doctor_type, full_name')
            .eq('id', user.id)
            .maybeSingle()

          const role = profile?.role || (isSuper ? 'superadmin' : 'doctor')
          setUserRole(role)
          setDoctorType(profile?.doctor_type || (role === 'socio' ? 'socio' : 'trabajador'))

          if (profile?.full_name) {
            setUserName(profile.full_name)
          } else if (isSuper) {
            setUserName('Dra. Aura Estudillo')
          }
        }
      } catch {}
    }

    loadUserProfile()

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

  const isSuperAdmin = currentUser?.email === 'audenti89@gmail.com'
  const isEstudiante = doctorType === 'estudiante'
  const isTrabajador = !isSuperAdmin && !isEstudiante && (userRole === 'trabajador' || doctorType === 'trabajador')
  const isSocio = !isTrabajador && !isEstudiante && (userRole === 'socio' || doctorType === 'socio')
  const canInvite = isSuperAdmin || isSocio || userRole === 'owner' || userRole === 'director' || userRole === 'superadmin'

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'DR'

  const roleBadgeLabel = isSuperAdmin
    ? 'Dirección General & Clínica'
    : isSocio
    ? 'Odontólogo Socio'
    : isTrabajador
    ? 'Odontólogo Colaborador'
    : isEstudiante
    ? 'Servicio Social (Solo Lectura)'
    : 'Equipo Médico'

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

        {/* Botones de Activación Rápida (Solo Dra. Aura o Socios) */}
        {canInvite && (
          <div className="px-4 pt-4 space-y-2">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Invitar Odontólogo</span>
            </button>

            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Pase Rápido Estudiante</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <NavGroup title="Gestión Clínica" items={clinicalNav} unconfirmedCount={unconfirmedCount} />

          {/* Ocultar Operación & Negocio para Trabajadores y Estudiantes */}
          {!isTrabajador && !isEstudiante && (
            <NavGroup title="Operación & Negocio" items={businessNav} unconfirmedCount={unconfirmedCount} />
          )}

          {!isTrabajador && !isEstudiante && (
            <NavGroup title="Sistema" items={systemNav} unconfirmedCount={unconfirmedCount} />
          )}

          {/* ACCESOS Y AUTENTICACIÓN (100% VISIBLE EN BARRA LATERAL) */}
          <div className="pt-3 border-t border-white/10 space-y-1.5">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Accesos &amp; Sesión
            </span>

            <Link
              href="/auth/login"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-400/10 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/30 transition-all cursor-pointer shadow-xs group"
              title="Iniciar sesión o cambiar de cuenta médica"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 group-hover:text-slate-950 transition-colors" />
                <span>Iniciar Sesión Médica</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-slate-950 transition-colors" />
            </Link>

            <Link
              href="/portal/login"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              title="Portal de consultas para pacientes"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Portal del Paciente</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* User Footer & Quick Sign Out */}
        <div className="p-3 border-t border-white/10 bg-black/30 flex items-center justify-between gap-2">
          <Link
            href="/dashboard/perfil"
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition cursor-pointer"
            title="Editar Perfil"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
              isSocio
                ? 'bg-amber-400 text-slate-950'
                : isEstudiante
                ? 'bg-emerald-500 text-white'
                : isTrabajador
                ? 'bg-blue-500 text-white'
                : 'bg-amber-400 text-slate-950'
            }`}>
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{userName}</span>
              <span className={`text-[10px] truncate ${
                isSocio
                  ? 'text-amber-300'
                  : isEstudiante
                  ? 'text-emerald-300'
                  : isTrabajador
                  ? 'text-blue-300'
                  : 'text-amber-300'
              }`}>
                {roleBadgeLabel}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/auth/login'
            }}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
            title="Cerrar Sesión Activa"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Modal de Invitación a Odontólogos */}
      <InviteDoctorModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Modal de Pase Rápido para Estudiante / Servicio Social */}
      <QuickStudentPassModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />
    </>
  )
}
