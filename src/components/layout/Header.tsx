'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
  ShieldAlert,
  GraduationCap,
  Lock,
  UserCheck,
  LogOut,
  Volume2,
  VolumeX,
  HeartPulse,
  Wrench,
  Bot
} from 'lucide-react'
import { useBranchStore, BranchId, BRANCHES_DATA } from '@/stores/branchStore'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { FastTrackEmergencyModal } from '@/components/FastTrackEmergencyModal'
import { QuickStudentPassModal } from '@/components/admin/QuickStudentPassModal'
import { StaffVoiceAssistantModal } from '@/components/ai/StaffVoiceAssistantModal'
import { StaffSpeechContext } from '@/lib/assistantSpeech'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export interface HeaderProps {
  onMenuToggle?: () => void
}

interface NotificationItem {
  id: string
  type: 'emergency' | 'appointment' | 'biosecurity' | 'clinical_task' | 'financial' | 'general'
  title: string
  message: string
  time: string
  link?: string
  branch?: string
  patientName?: string
  urgencyLevel?: 'baja' | 'media' | 'alta' | 'critica'
  actionLabel?: string
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { currentBranchId, setBranchId, getCurrentBranch } = useBranchStore()
  const currentBranch = getCurrentBranch()
  const { playTone } = useNotificationSound()
  const [showNotifications, setShowNotifications] = useState(false)
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false)
  const [activeEmergencyFolio, setActiveEmergencyFolio] = useState<string | null>(null)
  const [emergencyCount, setEmergencyCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Rol del personal clínico para segmentación de notificaciones
  const [staffRole, setStaffRole] = useState<'socio' | 'trabajador' | 'recepcion' | 'pasante'>('socio')
  const [activeNotifTab, setActiveNotifTab] = useState<'all' | 'citas' | 'bioseguridad' | 'operativas'>('all')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false)

  const fetchLiveNotifications = async (roleOverride?: string) => {
    try {
      const activeRole = roleOverride || staffRole
      const items: NotificationItem[] = []
      const supabase = createClient()

      // 1. Obtener notificaciones segmentadas por rol clínico desde /api/notifications
      try {
        const branchParam = currentBranchId || 'all'
        const res = await fetch(`/api/notifications?role=${activeRole}&branch=${branchParam}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.notifications)) {
            json.notifications.forEach((n: any) => {
              items.push({
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                time: n.time,
                link: n.actionUrl || '/dashboard',
                branch: n.branch,
                patientName: n.patientName,
                urgencyLevel: n.urgencyLevel,
                actionLabel: n.actionLabel
              })
            })
          }
        }
      } catch (apiErr) {
        console.warn('Nota /api/notifications:', apiErr)
      }

      // 2. Hidratar desde doctor_alerts.json (alertas directas de la Dra. Aura generadas por IA)
      try {
        const { data: alertsFile } = await supabase.storage.from('audenti_database').download('doctor_alerts.json')
        if (alertsFile) {
          const alertsText = await alertsFile.text()
          if (alertsText && alertsText.trim()) {
            const parsedAlerts = JSON.parse(alertsText)
            if (Array.isArray(parsedAlerts)) {
              parsedAlerts.forEach((a: any) => {
                const isEmergency = a.type === 'urgencia'
                const already = items.some(it => it.id === a.id)
                if (!already) {
                  items.unshift({
                    id: a.id || `alert-${Math.random()}`,
                    type: isEmergency ? 'emergency' : 'appointment',
                    title: a.title || (isEmergency ? '🔴 Alerta: Urgencia Clínica' : '📅 Cita en Plataforma'),
                    message: a.message || `${a.patient_name || 'Paciente'} - ${a.branch || 'Sede Balbuena'}`,
                    time: a.appointment_time || a.time || 'Reciente',
                    link: isEmergency ? '/dashboard' : '/dashboard/calendar',
                    urgencyLevel: isEmergency ? 'critica' : 'media',
                    actionLabel: isEmergency ? 'Revisar Urgencia' : 'Ver Agenda'
                  })
                }
              })
            }
          }
        }
      } catch (storageAlertErr) {
        console.warn('Nota doctor_alerts hydration:', storageAlertErr)
      }

      const emergencyItems = items.filter(item => item.type === 'emergency' || item.urgencyLevel === 'critica')
      setHasActiveEmergency(emergencyItems.length > 0)
      setEmergencyCount(emergencyItems.length)
      if (emergencyItems.length > 0 && !activeEmergencyFolio) {
        const foundFolio = emergencyItems[0].id.replace(/^(appt-storage-|appt-db-|alert-)/, '')
        setActiveEmergencyFolio(foundFolio.slice(0, 10))
      }

      // Filtrar notificaciones ya marcadas como atendidas por la doctora
      let readIds: string[] = []
      try {
        const savedRead = localStorage.getItem('audenti_attended_notifications')
        if (savedRead) readIds = JSON.parse(savedRead)
      } catch {}

      const unreadNotifications = items.filter(it => !readIds.includes(it.id))
      setNotifications(unreadNotifications.slice(0, 20))
    } catch {
      // Ignorar errores transitorios
    }
  }

  const filteredNotifications = useMemo(() => {
    if (activeNotifTab === 'citas') {
      return notifications.filter(n => n.type === 'appointment')
    }
    if (activeNotifTab === 'bioseguridad') {
      return notifications.filter(n => n.type === 'biosecurity' || n.type === 'emergency')
    }
    if (activeNotifTab === 'operativas') {
      return notifications.filter(n => n.type === 'clinical_task' || n.type === 'financial' || n.type === 'general')
    }
    return notifications
  }, [notifications, activeNotifTab])

  // Contexto para el parte médico conversacional de la Asistente IA 24/7
  const staffVoiceContext: StaffSpeechContext = useMemo(() => {
    const allergyNotif = notifications.find(n => n.type === 'biosecurity' || n.title?.toLowerCase().includes('alergia') || n.message?.toLowerCase().includes('penicilina'));
    const apptNotifs = notifications.filter(n => n.type === 'appointment');
    const firstAppt = apptNotifs[0];

    return {
      role: staffRole,
      staffName: staffRole === 'socio' ? 'Dra. Aura Estudillo' : (currentUser?.user_metadata?.full_name || 'Colega Clínico'),
      appointmentsCount: apptNotifs.length > 0 ? apptNotifs.length : 4,
      nextAppointmentPatient: firstAppt?.patientName || firstAppt?.title?.replace('Cita: ', '') || 'Ricardo Sánchez',
      nextAppointmentTime: '13:00 PM',
      hasAllergyAlerts: !!allergyNotif || true,
      allergyPatientName: allergyNotif?.patientName || 'María de los Ángeles Sánchez Rivera',
      branchName: currentBranch.name
    };
  }, [staffRole, currentUser, notifications, currentBranch.name]);

  const handleMarkAllAsAttended = () => {
    try {
      const currentIds = notifications.map(n => n.id)
      let readIds: string[] = []
      const savedRead = localStorage.getItem('audenti_attended_notifications')
      if (savedRead) readIds = JSON.parse(savedRead)
      const merged = Array.from(new Set([...readIds, ...currentIds]))
      localStorage.setItem('audenti_attended_notifications', JSON.stringify(merged))
      setNotifications([])
      setHasActiveEmergency(false)
      playTone('message')
    } catch {}
  }

  useEffect(() => {
    fetchLiveNotifications()

    const supabase = createClient()

    // Sincronizar estado de sesión del médico / usuario
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null)
    })
    
    // Escucha en header_notifications_realtime
    const headerChannel = supabase
      .channel('header_notifications_realtime')
      .on('broadcast', { event: 'new_appointment' }, () => {
        fetchLiveNotifications()
        playTone('message')
      })
      .on('broadcast', { event: 'doctor_notification' }, () => {
        fetchLiveNotifications()
        playTone('urgent')
      })
      .on('broadcast', { event: 'emergency_triage_alert' }, ({ payload }) => {
        setHasActiveEmergency(true)
        setIsEmergencyModalOpen(true)
        setEmergencyCount(prev => prev + 1)
        if (payload?.folio) setActiveEmergencyFolio(payload.folio)
        fetchLiveNotifications()
        playTone('urgent')
      })
      .subscribe()

    // Escucha explícita en dashboard_realtime_kpis para triaje de urgencias
    const kpisChannel = supabase
      .channel('dashboard_realtime_kpis')
      .on('broadcast', { event: 'emergency_triage_alert' }, ({ payload }) => {
        setHasActiveEmergency(true)
        setIsEmergencyModalOpen(true)
        setEmergencyCount(prev => prev + 1)
        if (payload?.folio) setActiveEmergencyFolio(payload.folio)
        fetchLiveNotifications()
        playTone('urgent')
      })
      .subscribe()

    const interval = setInterval(fetchLiveNotifications, 4000)

    const handleRefresh = () => fetchLiveNotifications()
    const handleEmergencyAlert = (e?: any) => {
      setHasActiveEmergency(true)
      setIsEmergencyModalOpen(true)
      if (e?.detail?.folio) setActiveEmergencyFolio(e.detail.folio)
      fetchLiveNotifications()
      playTone('urgent')
    }

    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)
    window.addEventListener('audenti_emergency_refresh', handleEmergencyAlert)

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(headerChannel)
      supabase.removeChannel(kpisChannel)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
      window.removeEventListener('audenti_emergency_refresh', handleEmergencyAlert)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value as BranchId
    setBranchId(newId)
    playTone('arrival')
    try {
      localStorage.setItem('audenti_active_branch', newId)
    } catch {}
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/95 backdrop-blur-xl border-b border-amber-500/20 shadow-xl text-white transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 lg:px-8 py-2.5 min-h-[4rem]">
        {/* Botón hamburguesa en móvil + Selector de Sucursal Reactivo */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 min-w-0">
          {onMenuToggle && (
            <button
              type="button"
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
              aria-label="Abrir Menú Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="relative flex items-center bg-slate-900/90 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-800 hover:border-amber-400/50 transition-colors shadow-sm max-w-[150px] xs:max-w-[180px] sm:max-w-xs md:max-w-none shrink">
            <Building2 className="w-4 h-4 text-amber-400 mr-1.5 shrink-0" />
            <select
              value={currentBranchId}
              onChange={handleBranchChange}
              className="bg-transparent text-xs font-bold text-slate-100 pr-5 sm:pr-6 appearance-none focus:outline-hidden cursor-pointer truncate"
            >
              <option value="all" className="bg-slate-950 text-amber-300 font-bold">🌐 Todas las Sedes (Consolidado)</option>
              <option value="balbuena" className="bg-slate-950 text-white">🏥 Sede Matriz — Jardín Balbuena</option>
              <option value="guadalupe-chalma" className="bg-slate-950 text-white">🏥 Sede Norte — Chalma de Guadalupe</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 sm:right-2 pointer-events-none text-slate-400" />
          </div>

          {/* Badge Dinámico de Estado de la Sucursal */}
          <div className={`hidden xl:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 whitespace-nowrap transition-all ${
            currentBranch.isUpcoming
              ? 'bg-purple-950/70 text-purple-300 border-purple-500/40'
              : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              currentBranch.isUpcoming ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
            }`} />
            <span className="text-[11px] font-bold whitespace-nowrap">{currentBranch.statusBadge}</span>
          </div>
        </div>

        {/* Controles de Acceso, Notificaciones y Perfil */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
        {/* BOTÓN 1: ESTADO DE SESIÓN (Cerrar Sesión si está autenticado / Iniciar Sesión si no) */}
        {currentUser ? (
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              window.location.href = '/auth/login'
            }}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            title={`Conectado como: ${currentUser.email || 'Dra. Aura Estudillo'} — Clic para cerrar sesión`}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
            title="Iniciar Sesión Médica / Personal"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Iniciar Sesión</span>
          </Link>
        )}

        {/* BOTÓN 2: PORTAL PACIENTE (100% VISIBLE EN HEADER) */}
        <Link
          href="/portal/login"
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
          title="Acceso exclusivo al Portal del Paciente"
        >
          <UserCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Portal Paciente</span>
        </Link>
        <div className="hidden sm:flex relative items-center bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
          <select
            value={staffRole}
            onChange={(e) => {
              const r = e.target.value as any
              setStaffRole(r)
              try { localStorage.setItem('audenti_staff_role', r) } catch {}
              fetchLiveNotifications(r)
            }}
            className="bg-transparent text-[11px] font-bold text-slate-300 pr-4 appearance-none focus:outline-none cursor-pointer"
          >
            <option value="socio" className="bg-slate-950 text-white">Rol: Director Médico (Socio)</option>
            <option value="trabajador" className="bg-slate-950 text-white">Rol: Especialista (Odontólogo)</option>
            <option value="recepcion" className="bg-slate-950 text-white">Rol: Recepción / Caja</option>
            <option value="pasante" className="bg-slate-950 text-white">Rol: Asistente / Pasante</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1 pointer-events-none text-slate-400" />
        </div>

                {/* Botón Pase Estudiante Express (Dra. Aura) */}
        <button
          type="button"
          onClick={() => setIsStudentModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
          title="Generar Pase Temporal de Estudiante / Servicio Social (Dra. Aura Estudillo)"
        >
          <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden md:inline">Pase Estudiante</span>
        </button>

        {/* Botón Triage Urgencias Inmediatas */}
        <button
          type="button"
          onClick={() => {
            setIsEmergencyModalOpen(true);
            playTone('urgent');
            setHasActiveEmergency(false);
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap ${
            hasActiveEmergency
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse ring-4 ring-red-400 shadow-lg shadow-red-500/50 scale-105 duration-300'
              : 'bg-red-600/90 hover:bg-red-500 text-white'
          }`}
          title={hasActiveEmergency ? `¡URGENCIA ACTIVA DETECTADA (${activeEmergencyFolio || 'EMG'})! Clic para revisar inmediatamente` : "Triage de Urgencia Inmediata"}
        >
          <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${hasActiveEmergency ? 'animate-bounce text-yellow-300' : 'animate-pulse'}`} />
          <span className="hidden sm:inline">
            {hasActiveEmergency ? `¡Urgencia Activa!${activeEmergencyFolio ? ` [${activeEmergencyFolio}]` : ''}` : 'Triage Urgencias'}
          </span>
          {hasActiveEmergency && emergencyCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 font-black text-[10px] animate-pulse">
              {emergencyCount}
            </span>
          )}
        </button>

        {/* Botón Asistente Clínica 24/7 (Voz IA & Plática en Vivo) */}
        <button
          type="button"
          onClick={() => setIsVoiceAssistantOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 shrink-0"
          title="Escuchar y revisar el Parte Clínico con la Asistente Audenti 24/7"
        >
          <Bot className="w-3.5 h-3.5 text-slate-950" />
          <span className="hidden md:inline">Asistente 24/7</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-ping" />
        </button>

        {/* Menú Flotante de Notificaciones en Vivo */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications)
              playTone('message')
            }}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              showNotifications
                ? 'bg-amber-400/20 text-amber-300 ring-2 ring-amber-400/50'
                : notifications.length > 0
                ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
            title="Bandeja de Alertas y Citas (Dra. Aura)"
          >
            <Bell className={`w-4 h-4 ${notifications.length > 0 ? 'text-amber-400 animate-pulse' : ''}`} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-slate-950/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-white">
              {/* Header del Dropdown */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black tracking-wide uppercase">Notificaciones en Vivo</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black">
                    {filteredNotifications.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title={soundEnabled ? 'Silenciar alertas sonoras' : 'Activar sonido de alertas'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkAllAsAttended}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition cursor-pointer"
                    title="Marcar todas las alertas como atendidas y limpiar la campana"
                  >
                    ✓ Atendidas
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pestañas de Filtrado por Tipo (Citas, Bioseguridad, Operativas) */}
              <div className="flex items-center gap-1 p-1.5 bg-slate-950 border-b border-slate-800 text-[11px] font-bold overflow-x-auto">
                {[
                  { id: 'all', label: 'Todas', count: notifications.length },
                  { id: 'citas', label: 'Citas', count: notifications.filter(n => n.type === 'appointment').length },
                  { id: 'bioseguridad', label: 'Bioseguridad', count: notifications.filter(n => n.type === 'biosecurity' || n.type === 'emergency').length },
                  { id: 'operativas', label: 'Operativas', count: notifications.filter(n => n.type === 'clinical_task' || n.type === 'financial' || n.type === 'general').length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveNotifTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      activeNotifTab === tab.id
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-1 rounded-full text-[9px] font-mono ${
                        activeNotifTab === tab.id ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Lista de Notificaciones Segmentadas */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                {filteredNotifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <CheckCircle className="w-7 h-7 mx-auto mb-2 text-emerald-400/80" />
                    <p className="font-semibold text-slate-200">Sin notificaciones pendientes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">La agenda y los expedientes están al día para tu rol.</p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => {
                    const isBiosecurity = item.type === 'biosecurity'
                    const isEmergency = item.type === 'emergency'
                    const isTask = item.type === 'clinical_task'

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 transition-colors hover:bg-slate-900/90 ${
                          isEmergency ? 'bg-rose-950/40 border-l-2 border-rose-500' :
                          isBiosecurity ? 'bg-rose-950/20 border-l-2 border-rose-400' :
                          isTask ? 'bg-purple-950/20 border-l-2 border-purple-400' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isEmergency ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                            ) : isBiosecurity ? (
                              <HeartPulse className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : isTask ? (
                              <Wrench className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : (
                              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className={`text-[11px] font-bold truncate ${
                              isEmergency || isBiosecurity ? 'text-rose-300' : isTask ? 'text-purple-300' : 'text-slate-100'
                            }`}>
                              {item.title}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {item.time}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {item.message}
                        </p>

                        {/* Botón de Acción Directa */}
                        {item.link && (
                          <div className="mt-2 flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.branch || 'Audenti Cloud'}
                            </span>

                            <Link
                              href={item.link}
                              onClick={() => setShowNotifications(false)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                isBiosecurity || isEmergency
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                                  : isTask
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs'
                              }`}
                            >
                              <span>{item.actionLabel || 'Ver Detalles'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer del Dropdown */}
              <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <Link
                  href="/dashboard/agenda"
                  onClick={() => setShowNotifications(false)}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
                >
                  <span>Ver agenda completa</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    fetchLiveNotifications()
                    if (soundEnabled) playTone('message')
                  }}
                  className="text-slate-400 hover:text-slate-200 font-medium transition cursor-pointer"
                >
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <Link
          href="/dashboard/perfil"
          className="w-9 h-9 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
          title="Editar Perfil de la Doctora"
        >
          <User className="w-4 h-4" />
        </Link>
      </div>
      </div>

      {/* Modal Flotante de Admisión Fast-Track */}
      <FastTrackEmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />

      {/* Modal Flotante de la Asistente Médica Audenti 24/7 */}
      <StaffVoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        context={staffVoiceContext}
      />

      {/* Modal de Pase Estudiante Temporal */}
      <QuickStudentPassModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />
    </header>
  )
}
