'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Building2,
  Search,
  ShieldCheck,
  Bell,
  HelpCircle,
  User,
  ChevronDown,
  Sparkles,
  MapPin,
  Menu,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Clock,
  X,
  ArrowRight,
  ShieldAlert
} from 'lucide-react'
import { useBranchStore, BranchId, BRANCHES_DATA } from '@/stores/branchStore'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { FastTrackEmergencyModal } from '@/components/FastTrackEmergencyModal'
import Link from 'next/link'

export interface HeaderProps {
  onMenuToggle?: () => void
}

interface NotificationItem {
  id: string
  type: 'emergency' | 'appointment' | 'general'
  title: string
  message: string
  time: string
  link?: string
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { currentBranchId, setBranchId, getCurrentBranch } = useBranchStore()
  const currentBranch = getCurrentBranch()
  const { playTone } = useNotificationSound()
  const [showNotifications, setShowNotifications] = useState(false)
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const notifRef = useRef<HTMLDivElement>(null)

  const fetchLiveNotifications = async () => {
    try {
      const items: NotificationItem[] = []

      // 1. Obtener emergencias activas
      const emgRes = await fetch('/api/ai/night-emergency')
      const emgData = await emgRes.json()
      if (emgData?.success && Array.isArray(emgData.cases)) {
        emgData.cases.slice(0, 5).forEach((c: any) => {
          items.push({
            id: `emg-${c.id}`,
            type: 'emergency',
            title: c.alertType === 'red_emergency' ? '🔴 Alerta Roja: Urgencia 24/7' : '🟡 Cita Prioritaria en Espera',
            message: `${c.patientName}: "${c.symptoms}"`,
            time: c.timestamp || 'Hoy',
            link: '/dashboard'
          })
        })
      }

      // 2. Obtener citas agendadas recientes
      const apptRes = await fetch('/api/appointments')
      const apptData = await apptRes.json()
      if (apptData?.success && Array.isArray(apptData.appointments)) {
        apptData.appointments.slice(0, 5).forEach((a: any) => {
          items.push({
            id: `appt-${a.id}`,
            type: 'appointment',
            title: `📅 Cita Confirmada (${a.folio})`,
            message: `${a.patient_name} • ${a.treatment} (${a.appointment_date} ${a.appointment_time})`,
            time: 'En vivo',
            link: '/dashboard/agenda'
          })
        })
      }

      setNotifications(items)
    } catch {
      // Ignorar errores transitorios
    }
  }

  useEffect(() => {
    fetchLiveNotifications()
    const interval = setInterval(fetchLiveNotifications, 4000)

    const handleRefresh = () => fetchLiveNotifications()
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)
    window.addEventListener('audenti_emergency_refresh', handleRefresh)

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
      window.removeEventListener('audenti_emergency_refresh', handleRefresh)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleBranchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value as BranchId
    setBranchId(newId)
    playTone('arrival')

    // Sincronizar en tiempo real la ubicación y sede activa de la Dra. Aura para la IA
    try {
      await fetch('/api/geolocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_doctor_location',
          branchId: newId,
          status: 'en_gabinete'
        })
      })
    } catch (err) {
      console.warn('Error sincronizando geolocalización de Dra. Aura:', err)
    }
  }

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-20 bg-white/85 backdrop-blur-md border-b border-slate-200/80 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-xs">
      {/* Botón hamburguesa en móvil + Selector de Sucursal Reactivo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Abrir Menú Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative flex items-center bg-slate-50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 hover:border-amber-400 transition-colors shadow-2xs max-w-[200px] sm:max-w-none">
          <Building2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
          <select
            value={currentBranchId}
            onChange={handleBranchChange}
            className="bg-transparent text-xs font-bold text-slate-900 pr-7 appearance-none focus:outline-none cursor-pointer"
          >
            <option value="balbuena">Sucursal Balbuena (Matriz) — Dra. Aura Estudillo</option>
            <option value="guadalupe-chalma">Sucursal Guadalupe Chalma — Dr. Ramírez López</option>
            <option value="colonia-roma">Próximamente: Sucursal Colonia Roma</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-slate-400" />
        </div>

        {/* Badge Dinámico de Estado de la Sucursal */}
        <div className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
          currentBranch.isUpcoming
            ? 'bg-purple-50 text-purple-900 border-purple-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            currentBranch.isUpcoming ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
          }`} />
          <span className="text-[11px] font-bold">{currentBranch.statusBadge}</span>
        </div>
      </div>

      {/* Buscador global (Oculto en móvil pequeño) */}
      <div className="hidden md:block flex-1 max-w-lg mx-4 lg:mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={`Buscar en ${currentBranch.name}... (⌘K)`}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 text-slate-900 text-xs border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Controles de Perfil y Notificaciones */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <div className="hidden sm:flex relative items-center bg-slate-100/70 px-2.5 py-1.5 rounded-xl border border-slate-200/50">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600 mr-1.5 shrink-0" />
          <select className="bg-transparent text-[11px] font-bold text-slate-700 pr-4 appearance-none focus:outline-none cursor-pointer">
            <option>Rol: Director Médico</option>
            <option>Rol: Especialista</option>
            <option>Rol: Recepción / Caja</option>
            <option>Rol: Asistente Dental</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1 pointer-events-none text-slate-400" />
        </div>

        {/* Botón Triage Urgencias Inmediatas */}
        <button
          type="button"
          onClick={() => {
            setIsEmergencyModalOpen(true);
            playTone('urgent');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
          title="Triage de Urgencia Inmediata"
        >
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="hidden sm:inline">Triage Urgencias</span>
        </button>

        {/* Menú Flotante de Notificaciones en Vivo */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications)
              playTone('message')
            }}
            className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
              showNotifications ? 'bg-amber-100/80 text-amber-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
            title="Notificaciones de sucursal y urgencias"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header del Dropdown */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black tracking-wide uppercase">Notificaciones en Vivo</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                    {notifications.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lista de Notificaciones */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <CheckCircle className="w-7 h-7 mx-auto mb-2 text-emerald-500/80" />
                    <p className="font-semibold text-slate-700">Bandeja despejada</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No hay alertas ni citas pendientes en este momento.</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <Link
                      key={item.id}
                      href={item.link || '/dashboard'}
                      onClick={() => setShowNotifications(false)}
                      className={`p-3.5 block transition-colors hover:bg-slate-50 cursor-pointer ${
                        item.type === 'emergency' ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[11px] font-bold ${
                          item.type === 'emergency' ? 'text-rose-700' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>

              {/* Footer del Dropdown */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <Link
                  href="/dashboard/agenda"
                  onClick={() => setShowNotifications(false)}
                  className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 transition"
                >
                  <span>Ver toda la agenda</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    fetchLiveNotifications()
                    playTone('message')
                  }}
                  className="text-slate-400 hover:text-slate-600 font-medium transition cursor-pointer"
                >
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
          <User className="w-4 h-4" />
        </div>
      </div>

      {/* Modal Flotante de Admisión Fast-Track */}
      <FastTrackEmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </header>
  )
}
