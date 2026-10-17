'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Activity,
  CreditCard,
  FileSignature,
  Plus,
  RefreshCw,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  Bell,
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { DoctorLiveTriageAlert } from '@/components/dashboard/DoctorLiveTriageAlert'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import Link from 'next/link'

interface ToastAlert {
  id: string
  title: string
  message: string
  type: 'appointment' | 'emergency'
  date?: string
  time?: string
  branch?: string
  folio?: string
}

export default function DashboardPage() {
  const { playTone } = useNotificationSound()
  const [kpis, setKpis] = useState({
    todayAppointments: 0,
    activeInChair: 'Sin paciente activo',
    inChairProcedure: 'Gabinete listo',
    dailyRevenue: 0,
    pendingNotes: 0,
    waitingRoomCount: 0,
  })
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeToast, setActiveToast] = useState<ToastAlert | null>(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // 1. Contar citas registradas
      const { data: appointments, error: appErr } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          treatment_type,
          patients (full_name)
        `)
        .order('start_time', { ascending: true })

      if (appErr) console.warn('Error en appointments fetch:', appErr)

      let appList: any[] = (appointments as any[]) || []

      // Si la tabla relacional no retorna citas (debido a permisos RLS en Supabase),
      // hidratar desde el almacenamiento persistente atómico de Supabase Storage
      try {
        const { data: storageFile } = await supabase.storage.from('audenti_database').download('appointments.json')
        if (storageFile) {
          const storageText = await storageFile.text()
          if (storageText && storageText.trim()) {
            const persistedList = JSON.parse(storageText)
            if (Array.isArray(persistedList) && persistedList.length > 0) {
              const mappedFromStorage: any[] = persistedList.map((p: any) => ({
                id: p.id || p.folio,
                start_time: p.start_time || `${p.appointment_date || '2026-10-18'}T${p.appointment_time || '10:00:00'}`,
                end_time: p.end_time || `${p.appointment_date || '2026-10-18'}T${p.appointment_time || '10:45:00'}`,
                status: p.status || 'confirmed',
                treatment_type: p.treatment || p.treatment_type || 'Valoración Odontológica',
                patients: [{ full_name: p.patient_name || p.paciente || 'Paciente Audenti' }]
              }))
              // Fusionar evitando duplicados por id o folio
              const existingIds = new Set(appList.map((a: any) => a.id))
              for (const item of mappedFromStorage) {
                if (!existingIds.has(item.id)) {
                  appList.push(item)
                  existingIds.add(item.id)
                }
              }
            }
          }
        }
      } catch (storageErr) {
        console.warn('Nota en hidratación de Storage para dashboard:', storageErr)
      }

      // Desduplicar cualquier entrada redundante final en appList
      const seenSessions = new Set<string>()
      appList = appList.filter((a: any) => {
        const name = (Array.isArray(a.patients) ? a.patients[0]?.full_name : a.patients?.full_name) || ''
        const day = (a.start_time || '').split('T')[0]
        const sessionKey = `${name.toLowerCase().trim()}_${day}_${a.id || ''}`
        if (seenSessions.has(sessionKey)) return false
        seenSessions.add(sessionKey)
        return true
      })

      const inChairAppointment = appList.find((a: any) => a.status === 'in_chair')
      const inWaitingCount = appList.filter((a: any) => a.status === 'in_waiting').length

      // 2. Sumar ingresos reales de pagos
      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select('amount, status')

      if (payErr) console.warn('Error en payments fetch:', payErr)

      const totalRevenue = (payments || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)

      const getPatientName = (p: any) => {
        if (!p) return null
        if (Array.isArray(p)) return p[0]?.full_name || null
        return p?.full_name || null
      }

      setKpis({
        todayAppointments: appList.length,
        activeInChair: getPatientName(inChairAppointment?.patients) || 'Sin paciente activo',
        inChairProcedure: inChairAppointment?.treatment_type || 'Gabinete preparado',
        dailyRevenue: totalRevenue,
        pendingNotes: 0,
        waitingRoomCount: inWaitingCount,
      })
      setRecentAppointments(appList.slice(0, 5))
    } catch (err) {
      console.error('Error al cargar métricas del dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    const supabase = createClient()
    // Suscripción Realtime a broadcast de citas y alertas de la Dra. Aura
    const channel = supabase
      .channel('dashboard_page_realtime')
      .on('broadcast', { event: 'new_appointment' }, ({ payload }) => {
        fetchDashboardData()
        if (payload) {
          const dateStr = payload.appointment_date || 'Lunes 19'
          const timeStr = payload.appointment_time || '09:00'
          setActiveToast({
            id: payload.id || `toast-${Date.now()}`,
            title: `Nueva cita agendada por IA: ${payload.patient_name || 'Paciente'}`,
            message: `${payload.patient_name || 'Paciente'} - ${dateStr}, ${timeStr} hrs (${payload.branch || 'Sede Balbuena'})`,
            type: 'appointment',
            date: dateStr,
            time: timeStr,
            branch: payload.branch,
            folio: payload.folio
          })
          try {
            window.dispatchEvent(new CustomEvent('audenti_appointment_refresh'))
          } catch {}
        }
      })
      .on('broadcast', { event: 'doctor_notification' }, ({ payload }) => {
        if (payload) {
          setActiveToast({
            id: payload.id || `toast-${Date.now()}`,
            title: payload.title || 'Nueva notificación de la clínica',
            message: payload.message || 'Se ha registrado una actividad en la plataforma.',
            type: payload.type === 'urgencia' ? 'emergency' : 'appointment',
            date: payload.appointment_date,
            time: payload.appointment_time,
            branch: payload.branch,
            folio: payload.folio
          })
        }
      })
      .on('broadcast', { event: 'emergency_triage_alert' }, ({ payload }) => {
        fetchDashboardData()
        playTone('urgent')
        if (payload) {
          setActiveToast({
            id: payload.id || `toast-urg-${Date.now()}`,
            title: `🔴 Urgencia Clínica Escalada: ${payload.patient_name || 'Paciente'}`,
            message: `${payload.treatment || 'Urgencia'} - ${payload.branch || 'Sede Balbuena'}. Folio: ${payload.folio || 'EMG'}.`,
            type: 'emergency',
            date: payload.appointment_date,
            time: payload.appointment_time,
            branch: payload.branch,
            folio: payload.folio
          })
          try {
            window.dispatchEvent(new CustomEvent('audenti_emergency_refresh'))
          } catch {}
        }
      })
      .subscribe()

    // Suscripción al canal estándar de KPIs y alertas globales
    const kpiChannel = supabase
      .channel('dashboard_kpis_realtime_listener')
      .on('broadcast', { event: 'emergency_triage_alert' }, ({ payload }) => {
        fetchDashboardData()
        playTone('urgent')
        if (payload) {
          setActiveToast({
            id: payload.id || `toast-urg-${Date.now()}`,
            title: `🔴 Urgencia Clínica Escalada: ${payload.patient_name || 'Paciente'}`,
            message: `${payload.treatment || 'Urgencia'} - ${payload.branch || 'Sede Balbuena'}. Folio: ${payload.folio || 'EMG'}.`,
            type: 'emergency',
            date: payload.appointment_date,
            time: payload.appointment_time,
            branch: payload.branch,
            folio: payload.folio
          })
          try {
            window.dispatchEvent(new CustomEvent('audenti_emergency_refresh'))
          } catch {}
        }
      })
      .subscribe()

    // Polling reactivo cada 3 segundos y escucha de eventos locales
    const interval = setInterval(fetchDashboardData, 3000)
    const handleRefresh = () => fetchDashboardData()
    const handleEmergencyAlert = () => {
      fetchDashboardData()
      playTone('urgent')
    }
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)
    window.addEventListener('audenti_emergency_refresh', handleEmergencyAlert)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
      window.removeEventListener('audenti_emergency_refresh', handleEmergencyAlert)
      supabase.removeChannel(channel)
      supabase.removeChannel(kpiChannel)
    }
  }, [])

  // Auto-cerrar el Toast después de 8 segundos
  useEffect(() => {
    if (!activeToast) return
    const timer = setTimeout(() => {
      setActiveToast(null)
    }, 8000)
    return () => clearTimeout(timer)
  }, [activeToast])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const today = mounted
    ? new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date())
    : 'Cargando jornada...'

  return (
    <div className="flex flex-col w-full space-y-6 pb-12 relative">
      {/* Toast Flotante de Notificación en Vivo (Dra. Aura) */}
      {activeToast && (
        <div className="fixed top-24 right-4 sm:right-8 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3.5 transition-all ${
            activeToast.type === 'emergency'
              ? 'bg-red-950/95 text-white border-red-500/80 shadow-red-900/30'
              : 'bg-slate-900/95 text-white border-amber-500/80 shadow-amber-950/30'
          }`}>
            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
              activeToast.type === 'emergency' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {activeToast.type === 'emergency' ? (
                <AlertCircle className="w-5 h-5 animate-pulse" />
              ) : (
                <Sparkles className="w-5 h-5 animate-spin" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  activeToast.type === 'emergency'
                    ? 'bg-red-500/30 text-red-300 border border-red-500/40'
                    : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}>
                  {activeToast.type === 'emergency' ? 'Urgencia Inmediata' : 'Cita Agendada por IA'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">Ahora mismo</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1 leading-snug line-clamp-1">
                {activeToast.title}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                {activeToast.message}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  href="/dashboard/calendar"
                  onClick={() => setActiveToast(null)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Ver en Calendario
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Descartar
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold capitalize border border-slate-200/60">
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              {today}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistema en Producción Real (BD Limpia)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Buen día, <span className="text-amber-600">Dra. Aura Estudillo</span>
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Dirección General &amp; Clínica DentalCloud Pro • Céd. Prof. 8492019. Panel conectado reactivamente a Supabase PostgreSQL.
          </p>
        </div>

        {/* Resumen numérico en vivo */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/70 p-4 rounded-2xl shrink-0">
          <button
            onClick={fetchDashboardData}
            title="Refrescar métricas"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl font-bold shadow-xs">
            {kpis.todayAppointments}
          </div>
          <div className="flex flex-col pr-2">
            <span className="text-xs font-bold text-slate-900">Citas registradas</span>
            <span className="text-[11px] text-slate-500">Persistencia activa</span>
          </div>
        </div>
      </section>

      {/* Banner de Triaje Clínico y Alertas Médicas en Vivo */}
      <DoctorLiveTriageAlert />

      {/* Quick Actions Bar */}
      <QuickActions />

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Tarjeta Citas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Citas de Hoy</p>
            <CalendarDays className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-3xl font-extrabold text-[#202D4C]">{kpis.todayAppointments}</h3>
          <p className="text-xs text-slate-500 mt-2">Programadas para la jornada</p>
        </div>

        {/* Tarjeta Sillón */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">En Sillón Ahora</p>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 truncate">{kpis.activeInChair}</h3>
          <p className="text-xs text-amber-700 mt-2 truncate font-semibold">{kpis.inChairProcedure}</p>
        </div>

        {/* Tarjeta Caja */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Caja del Turno</p>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-3xl font-extrabold text-emerald-600">
            ${kpis.dailyRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs font-normal text-slate-400">MXN</span>
          </h3>
          <p className="text-xs text-slate-500 mt-2">Ingresos registrados hoy</p>
        </div>

        {/* Tarjeta Notas SOAP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Notas por Firmar</p>
            <FileSignature className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="text-3xl font-extrabold text-[#202D4C]">{kpis.pendingNotes}</h3>
          <p className="text-xs text-slate-500 mt-2">Expedientes clínicos pendientes</p>
        </div>
      </section>

      {/* Main Layout: Flujo de Pacientes y Resumen Limpio */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Citas de Hoy en Vivo (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Flujo de Pacientes de Hoy</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sincronización en vivo desde Supabase PostgreSQL</p>
            </div>
            <Link
              href="/dashboard/agenda"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
            >
              Ver agenda completa →
            </Link>
          </div>

          {recentAppointments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">Sin pacientes en atención en este momento</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                La jornada comenzará en cuanto se registre una cita en la agenda o un paciente ingrese por el portal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt) => {
                const patientName = Array.isArray(apt.patients)
                  ? apt.patients[0]?.full_name
                  : apt.patients?.full_name || 'Paciente'
                return (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{patientName}</h4>
                      <p className="text-[11px] text-slate-500">{apt.treatment_type || 'Tratamiento'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {apt.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Resumen de Caja Real (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Arqueo de Caja del Turno</h2>
              <p className="text-xs text-slate-500 mt-0.5">Control de ingresos por sede</p>
            </div>
            <Link
              href="/dashboard/finanzas"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
            >
              Ver finanzas →
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Ingresos Totales del Día</span>
              <span className="font-bold text-slate-900">
                ${kpis.dailyRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Pacientes en Sala de Espera</span>
              <span className="font-bold text-amber-700">{kpis.waitingRoomCount} en recepción</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
