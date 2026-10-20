'use client'

import { useState, useEffect } from 'react'
import { formatWhatsAppUrl } from '@/lib/whatsapp-link'
import {
  Calendar,
  Clock,
  Plus,
  User,
  CheckCircle2,
  AlertCircle,
  Video,
  Phone,
  Filter,
  Volume2,
  VolumeX,
  History,
  Activity,
  CalendarDays,
  Sparkles,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  MessageSquare,
  Search
} from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { createClient } from '@/utils/supabase/client'
import { createAppointmentAction } from '@/actions/appointments'
import { formatDateInMexico } from '@/utils/timezone'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'
import { StableCalendarView } from '@/components/StableCalendarView'

type TimeHorizon = 'present' | 'past' | 'future'

interface ClinicalAppointment {
  id: string
  patientId?: string
  date: string
  rawDate: string // YYYY-MM-DD
  isoStart: string
  time: string
  duration: string
  patientName: string
  phone: string
  treatment: string
  doctor: string
  chair: string
  status: 'completed' | 'in_chair' | 'in_waiting' | 'scheduled' | 'no_show' | 'canceled'
  notes?: string
  commissionDue?: number
}

export default function CalendarPage() {
  const router = useRouter()
  const { soundEnabled, setSoundEnabled, playTone } = useNotificationSound()
  const [viewMode, setViewMode] = useState<'flow' | 'units'>('flow')
  const [horizon, setHorizon] = useState<TimeHorizon | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('') // Filtro específico por fecha
  const [monthFilter, setMonthFilter] = useState<string>('all') // Filtro por mes (01-12)
  const [yearFilter, setYearFilter] = useState<string>('all') // Filtro por año (2025, 2026, etc)
  const [chairFilter, setChairFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [appointments, setAppointments] = useState<ClinicalAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showQuickRegister, setShowQuickRegister] = useState(false)
  const [patientsList, setPatientsList] = useState<any[]>([])
  const [newPatientId, setNewPatientId] = useState('')
  const [newTreatment, setNewTreatment] = useState('Consulta Odontológica General')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [newTime, setNewTime] = useState('10:00')
  const [newDuration, setNewDuration] = useState('45')
  const [newNotes, setNewNotes] = useState('')
  const [savingAppointment, setSavingAppointment] = useState(false)

  const supabase = createClient()

  const loadPatients = async () => {
    try {
      const { data } = await supabase.from('patients').select('id, full_name, phone').order('full_name')
      if (data && data.length > 0) {
        setPatientsList(data)
        if (!newPatientId) setNewPatientId(data[0].id)
      } else {
        setPatientsList([])
      }
    } catch (e) {
      console.warn('Error loading patients for appointment modal:', e)
    }
  }

  const fetchAppointments = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/appointments')
      if (res.ok) {
        const json = await res.json()
        if (json.appointments && Array.isArray(json.appointments)) {
          const mappedStorage: ClinicalAppointment[] = json.appointments.map((item: any) => ({
            id: item.id || item.folio,
            patientId: item.patient_id || item.patientId || '72d77609-2035-477b-a1e3-f6ddc52818b1',
            date: item.appointment_date || '2026-10-21',
            rawDate: item.appointment_date || '2026-10-21',
            isoStart: (item.appointment_date || '2026-10-21') + 'T' + (item.appointment_time || '10:00:00'),
            time: item.appointment_time || '10:00',
            duration: '45 min',
            patientName: item.patient_name || item.paciente || 'Paciente Audenti',
            phone: item.patient_phone || item.telefono || 'Sin teléfono',
            treatment: item.treatment || item.treatment_type || 'Valoración Odontológica',
            doctor: item.doctor || 'Dra. Aura Estudillo',
            chair: item.chair || 'Gabinete Principal',
            status: (item.status as any) || 'scheduled',
            notes: item.notes || 'Cita clínica en plataforma Audenti',
            commissionDue: 0
          }))
          setAppointments(mappedStorage)
          return
        }
      }
    } catch (err) {
      console.warn('Nota consultando /api/appointments:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()

    // Suscripción Realtime a citas (postgres changes + broadcast)
    const channel = supabase
      .channel('realtime_appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments(true)
        }
      )
      .on('broadcast', { event: 'new_appointment' }, () => {
        fetchAppointments(true)
      })
      .subscribe()

    // Polling de respaldo cada 8 segundos sin parpadeo (silent refresh)
    const interval = setInterval(() => fetchAppointments(true), 8000)
    const handleRefresh = () => fetchAppointments(true)
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
      supabase.removeChannel(channel)
    }
  }, [])

  // MÁQUINA DE ESTADOS CLÍNICA OPTIMISTA (0 ms de latencia)
  // 1. "Registrar Llegada" -> EN_ESPERA (in_waiting)
  const handleRegisterArrival = async (app: ClinicalAppointment) => {
    playTone('arrival')
    // Mutación optimista inmediata en estado local
    setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'in_waiting' } : a))

    try {
      await supabase
        .from('appointments')
        .update({
          status: 'in_waiting',
          notes: `${app.notes ? app.notes + ' | ' : ''}[ESTADO]: Llegada registrada en recepción (${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
        })
        .eq('id', app.id)

      // Notificación sonora y síntesis de voz en recepción
      handleCallToChair(app.patientName)

      // Enviar notificación a gabinete en Supabase Realtime
      await supabase.channel('header_notifications_realtime').send({
        type: 'broadcast',
        event: 'doctor_notification',
        payload: {
          id: `arrival-${app.id}`,
          title: `🚶 Llegada de Paciente: ${app.patientName}`,
          message: `El paciente ${app.patientName} ha llegado y está en sala de espera para ${app.treatment}.`,
          type: 'general',
          patient_name: app.patientName,
          time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        }
      })
      window.dispatchEvent(new Event('audenti_appointment_refresh'))
    } catch (err) {
      console.warn('Error al registrar llegada:', err)
    }
  }

  // 2. "Pasar a Sillón" -> EN_SILLON (in_chair) + NAVEGACIÓN AUTOMÁTICA AL EXPEDIENTE
  const handlePassToChair = async (app: ClinicalAppointment) => {
    playTone('arrival')
    // Mutación optimista inmediata
    setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'in_chair' } : a))

    try {
      await supabase
        .from('appointments')
        .update({
          status: 'in_chair',
          notes: `${app.notes ? app.notes + ' | ' : ''}[ESTADO]: En sillón con la Dra. Aura Estudillo (${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
        })
        .eq('id', app.id)

      window.dispatchEvent(new Event('audenti_appointment_refresh'))
    } catch (err) {
      console.warn('Error al pasar a sillón:', err)
    }

    // Navegación automática sin parpadeo al Expediente Clínico con la Alerta de Bioseguridad visible
    const targetPatientId = app.patientId || app.id
    router.push(`/dashboard/expediente?patient_id=${targetPatientId}&alert=biosecurity`)
  }

  // 3. "Concluir / Atendido" -> ATENDIDO (completed / PENDIENTE_PAGO) + NAVEGACIÓN A FINANZAS
  const handleConcludeAndCheckout = async (app: ClinicalAppointment) => {
    playTone('message')
    // Mutación optimista inmediata
    setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'completed' } : a))

    try {
      await supabase
        .from('appointments')
        .update({
          status: 'completed',
          notes: `${app.notes ? app.notes + ' | ' : ''}[ESTADO]: Procedimiento atendido. Trasladado a Caja (${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
        })
        .eq('id', app.id)

      window.dispatchEvent(new Event('audenti_appointment_refresh'))
    } catch (err) {
      console.warn('Error al concluir cita:', err)
    }

    // Navegación automática a la ventana de Cobro / Caja con parámetros de checkout
    const patientQuery = encodeURIComponent(app.patientName)
    const treatmentQuery = encodeURIComponent(app.treatment)
    router.push(`/dashboard/finanzas?action=checkout&appointment_id=${app.id}&patient=${patientQuery}&treatment=${treatmentQuery}&patient_id=${app.patientId || ''}`)
  }

  const handleCallToChair = (patientName: string) => {
    playTone('arrival')
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Paciente ${patientName}, favor de pasar al gabinete de la Doctora Aura Estudillo.`)
      utterance.lang = 'es-MX'
      utterance.rate = 0.95
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleOpenNewAppointment = () => {
    loadPatients()
    setShowNewModal(true)
  }

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatientId) {
      alert('Debes seleccionar o registrar un paciente primero.')
      return
    }

    setSavingAppointment(true)
    try {
      const selectedPatientObj = patientsList.find(p => p.id === newPatientId)
      const patientFullName = selectedPatientObj?.full_name || 'Paciente'
      const patientPhone = selectedPatientObj?.phone || '5522427769'

      // Guardar vía API de persistencia permanente (/api/appointments)
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientFullName,
          patient_phone: patientPhone,
          appointment_date: newDate,
          appointment_time: newTime,
          treatment: newTreatment,
          branch: 'Sucursal Balbuena (Matriz)',
          status: 'confirmed',
          notes: newNotes.trim() || 'Cita generada en consultorio'
        })
      })

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}))
        throw new Error(errorJson.error || 'Error al guardar cita')
      }

      playTone('message')
      setShowNewModal(false)
      setNewNotes('')
      await fetchAppointments()
    } catch (err: any) {
      console.error('Error al agendar cita:', err)
      alert(err?.message || 'Error al agendar cita')
    } finally {
      setSavingAppointment(false)
    }
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Agenda &amp; Sillón Dental en Tiempo Real
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Dra. Aura Estudillo • Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Control Clínico de Citas</h1>
          <p className="text-xs text-slate-500 mt-0.5">Gestión de tiempos, llamado por voz a gabinete y sincronización con Supabase.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
            title="Llamado auditivo a sillón"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio Activo' : 'Audio Silenciado'}</span>
          </button>

          <button
            onClick={() => fetchAppointments()}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Sincronizar Citas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenNewAppointment}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nueva Cita
          </button>
        </div>
      </div>

      {/* Selector de Vistas: Flujo Clínico Continuo vs Monitor por Sillones Dentales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/70">
          <button
            onClick={() => setHorizon('present')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              horizon === 'present'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Presente (Hoy)</span>
          </button>

          <button
            onClick={() => setHorizon('future')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              horizon === 'future'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span>Próximas Citas</span>
          </button>

          <button
            onClick={() => setHorizon('past')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              horizon === 'past'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Historial Clínico</span>
          </button>

          <button
            onClick={() => setHorizon('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              horizon === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Filter className="w-4 h-4 text-amber-500" />
            <span>Ver Todo el Archivo</span>
          </button>
        </div>

        {/* Barra de Búsqueda Rápida de Citas y Pacientes */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, teléfono o folio..."
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros Históricos por Fecha, Mes y Año */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
            title="Filtrar por fecha exacta"
          />

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <option value="all">Todos los Meses</option>
            <option value="01">Enero</option>
            <option value="02">Febrero</option>
            <option value="03">Marzo</option>
            <option value="04">Abril</option>
            <option value="05">Mayo</option>
            <option value="06">Junio</option>
            <option value="07">Julio</option>
            <option value="08">Agosto</option>
            <option value="09">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <option value="all">Todos los Años</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>

          {(dateFilter || monthFilter !== 'all' || yearFilter !== 'all') && (
            <button
              onClick={() => {
                setDateFilter('')
                setMonthFilter('all')
                setYearFilter('all')
              }}
              className="text-[11px] font-bold text-amber-600 hover:underline px-1"
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Alternador de Modo de Vista */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/70 w-fit">
          <button
            type="button"
            onClick={() => setViewMode('flow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'flow'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5 text-amber-600" />
            <span>Flujo Continuo</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('units')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'units'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-600" />
            <span>Monitor por Gabinetes</span>
          </button>
        </div>
      </div>

      {viewMode === 'units' ? (
        <StableCalendarView />
      ) : (
        <>
          {/* Lista de Citas en Tiempo Real Filtradas sin pérdida histórica */}
          {(() => {
            const todayStr = formatDateInMexico()
            const filtered = appointments.filter((app) => {
              // 0. Filtro por término de búsqueda (nombre, teléfono, folio)
              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim()
                const matchesName = app.patientName.toLowerCase().includes(term)
                const matchesPhone = app.phone.includes(term)
                const matchesId = app.id.toLowerCase().includes(term) || (app.patientId && app.patientId.toLowerCase().includes(term))
                const matchesTreatment = app.treatment.toLowerCase().includes(term)
                if (!matchesName && !matchesPhone && !matchesId && !matchesTreatment) return false
              }

              // 1. Filtro específico de fecha manual
              if (dateFilter && app.rawDate && app.rawDate !== dateFilter) return false

              // 2. Filtro de mes
              if (monthFilter !== 'all' && app.rawDate) {
                const appMonth = app.rawDate.split('-')[1]
                if (appMonth !== monthFilter) return false
              }

              // 3. Filtro de año
              if (yearFilter !== 'all' && app.rawDate) {
                const appYear = app.rawDate.split('-')[0]
                if (appYear !== yearFilter) return false
              }

              // 4. Filtro de horizonte temporal (si no se seleccionó fecha manual)
              // DESBLOQUEO TOTAL: Toda cita del día de hoy (todayStr) permanece SIEMPRE en Presente (Hoy)
              // sin importar si su hora ya pasó o si ya fue completada.
              if (!dateFilter && horizon !== 'all') {
                if (horizon === 'present') {
                  return app.rawDate === todayStr || ['in_chair', 'in_waiting'].includes(app.status)
                }
                if (horizon === 'future') {
                  return app.rawDate > todayStr
                }
                if (horizon === 'past') {
                  return app.rawDate < todayStr
                }
              }

              return true
            })

            return (
              <div className="space-y-3">
                {loading ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-600">Consultando agenda clínica de Supabase...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No hay citas en este periodo seleccionado</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Todas las citas pasadas, presentes y futuras se conservan de forma permanente en la base de datos histórica.
                    </p>
                  </div>
                ) : (
                  filtered.map((app) => (
            <div
              key={app.id}
              className={`p-5 rounded-2xl border transition-all bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs ${
                app.status === 'in_chair'
                  ? 'border-emerald-400 ring-2 ring-emerald-400/20'
                  : app.status === 'in_waiting'
                  ? 'border-amber-300 ring-2 ring-amber-300/20'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center font-bold text-slate-900 shrink-0 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase">{app.date.split(' ')[1] || 'Cita'}</span>
                  <span className="text-sm leading-none">{app.date.split(' ')[0] || '01'}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{app.patientName}</h3>
                    <span className="text-xs text-slate-400">• {app.time} ({app.duration})</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      app.status === 'in_chair'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : app.status === 'in_waiting'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : app.status === 'completed'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {app.status === 'in_chair' ? '⚡ En Sillón' :
                       app.status === 'in_waiting' ? '⏳ En Espera' :
                       app.status === 'completed' ? '✓ Completada / Atendido' : '📅 Programada'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-amber-900">{app.treatment}</p>
                  <p className="text-[11px] text-slate-600">
                    Doctor asignado: <strong className="text-slate-900">{app.doctor}</strong> • {app.notes}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {/* 1. REGISTRAR LLEGADA: Cambia a EN_ESPERA (in_waiting) con aviso sonoro y notificación al gabinete */}
                {app.status === 'scheduled' && (
                  <button
                    type="button"
                    onClick={() => handleRegisterArrival(app)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                    title="Registrar llegada del paciente a recepción"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Registrar Llegada
                  </button>
                )}

                {/* Si está en espera, botón de llamar a sillón por voz */}
                {app.status === 'in_waiting' && (
                  <button
                    type="button"
                    onClick={() => handleCallToChair(app.patientName)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Llamar al paciente por altavoz"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    Llamar a Sillón
                  </button>
                )}

                {/* 2. PASAR A SILLÓN: Cambia a EN_SILLON (in_chair) y NAVEGA AUTOMÁTICAMENTE a Expediente Clínico */}
                {app.status !== 'in_chair' && (
                  <button
                    type="button"
                    onClick={() => handlePassToChair(app)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                    title="Pasar al paciente al sillón dental y abrir su Expediente Clínico"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    {app.status === 'completed' ? 'Reabrir a Sillón' : 'Pasar a Sillón'}
                  </button>
                )}

                {/* 3. CONCLUIR / ATENDIDO: Cambia a ATENDIDO / PENDIENTE_PAGO y NAVEGA AUTOMÁTICAMENTE a Finanzas / Cobro */}
                {app.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => handleConcludeAndCheckout(app)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                    title="Concluir tratamiento y abrir ventana de Cobro en Caja"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Concluir / Atendido
                  </button>
                )}

                {/* Reactivar Turno si ya estaba completada */}
                {app.status === 'completed' && (
                  <button
                    type="button"
                    onClick={() => handleRegisterArrival(app)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Regresar cita a lista de espera"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    Reactivar Turno
                  </button>
                )}

                <a
                  href={formatWhatsAppUrl(
                    app.phone,
                    `Hola ${app.patientName}, te saluda la Dra. Aura Estudillo de Audenti Clinical respecto a tu cita agendada.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                  title={`Abrir WhatsApp con ${app.patientName}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>WhatsApp</span>
                </a>

                <Link
                  href={app.patientId ? `/dashboard/expediente?patient_id=${app.patientId}` : "/dashboard/expediente"}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                >
                  Expediente
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    )
  })()}
        </>
      )}

      {/* Modal Flotante de Agendar Cita */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            onClick={() => setShowNewModal(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-slate-900 z-10 animate-in zoom-in-95">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-[#202D4C]">Agendar Nueva Cita</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Dra. Aura Estudillo • Gabinete Dental Principal</p>

            <form onSubmit={handleSaveAppointment} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600">Paciente</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickRegister(true)}
                    className="text-[11px] font-bold text-amber-600 hover:underline"
                  >
                    + Alta Rápida de Paciente
                  </button>
                </div>
                {patientsList.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <span>No hay pacientes registrados aún.</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickRegister(true)}
                      className="px-2.5 py-1 bg-amber-400 text-slate-950 rounded-lg font-bold text-[11px]"
                    >
                      Registrar Ahora
                    </button>
                  </div>
                ) : (
                  <select
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tipo de Tratamiento</label>
                <input
                  type="text"
                  required
                  value={newTreatment}
                  onChange={(e) => setNewTreatment(e.target.value)}
                  placeholder="Ej. Profilaxis, Ortodoncia, Resina, Valoración..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Duración</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Notas Clínicas / Motivo</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ej. Primera cita, molestia en molar, revisión..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingAppointment || !newPatientId}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingAppointment ? 'Guardando en agenda...' : 'Confirmar y Guardar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rápido de Registro de Pacientes si no hay ninguno */}
      <QuickRegisterModal
        isOpen={showQuickRegister}
        onClose={() => setShowQuickRegister(false)}
        onPatientCreated={() => {
          setShowQuickRegister(false)
          loadPatients()
        }}
      />
    </div>
  )
}
