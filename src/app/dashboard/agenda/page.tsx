'use client'

import { useState, useEffect } from 'react'
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
  List
} from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'
import { StableCalendarView } from '@/components/StableCalendarView'

type TimeHorizon = 'present' | 'past' | 'future'

interface ClinicalAppointment {
  id: string
  date: string
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
  const { soundEnabled, setSoundEnabled, playTone } = useNotificationSound()
  const [viewMode, setViewMode] = useState<'flow' | 'units'>('flow')
  const [horizon, setHorizon] = useState<TimeHorizon>('present')
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

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          treatment_type,
          notes,
          patients (
            full_name,
            phone
          ),
          users:doctor_id (
            full_name
          )
        `)
        .order('start_time', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        const mapped: ClinicalAppointment[] = (data || []).map((item: any) => {
          const startDate = new Date(item.start_time)
          const endDate = new Date(item.end_time || item.start_time)
          const timeStr = `${startDate.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit' })}`
          const dateStr = startDate.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', year: 'numeric' })
          const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000) || 45

          return {
            id: item.id,
            date: dateStr,
            time: timeStr,
            duration: `${durationMin} min`,
            patientName: item.patients?.full_name || 'Paciente Sin Nombre',
            phone: item.patients?.phone || 'Sin teléfono',
            treatment: item.treatment_type || 'Consulta Odontológica General',
            doctor: item.users?.full_name || 'Dra. Aura Estudillo',
            chair: 'Gabinete Principal',
            status: (item.status as any) || 'scheduled',
            notes: item.notes || 'Cita clínica en plataforma Audenti',
            commissionDue: 0,
          }
        })

        // Unir con citas guardadas en /api/appointments
        try {
          const apiRes = await fetch('/api/appointments')
          const apiData = await apiRes.json()
          if (apiData?.success && Array.isArray(apiData.appointments)) {
            const apiMapped: ClinicalAppointment[] = apiData.appointments.map((a: any) => {
              const dParts = (a.appointment_date || '').split('-')
              const prettyDate = dParts.length === 3 ? `${dParts[2]} oct ${dParts[0]}` : a.appointment_date
              return {
                id: a.id,
                date: prettyDate,
                time: `${a.appointment_time} (45 min)`,
                duration: '45 min',
                patientName: a.patient_name,
                phone: a.patient_phone || 'WhatsApp',
                treatment: a.treatment || 'Consulta Odontológica General',
                doctor: 'Dra. Aura Estudillo',
                chair: a.branch || 'Gabinete Principal (Sede Balbuena)',
                status: a.status || 'scheduled',
                notes: `Folio: ${a.folio}. ${a.notes || ''}`,
                commissionDue: 0
              }
            })
            const existingIds = new Set(mapped.map(m => m.id))
            const additional = apiMapped.filter(m => !existingIds.has(m.id))
            setAppointments([...additional, ...mapped])
          } else {
            setAppointments(mapped)
          }
        } catch {
          setAppointments(mapped)
        }
      } else {
        // Fallback a /api/appointments si Supabase aún está vacío
        try {
          const apiRes = await fetch('/api/appointments')
          const apiData = await apiRes.json()
          if (apiData?.success && Array.isArray(apiData.appointments) && apiData.appointments.length > 0) {
            const apiMapped: ClinicalAppointment[] = apiData.appointments.map((a: any) => {
              const dParts = (a.appointment_date || '').split('-')
              const prettyDate = dParts.length === 3 ? `${dParts[2]} oct ${dParts[0]}` : a.appointment_date
              return {
                id: a.id,
                date: prettyDate,
                time: `${a.appointment_time} (45 min)`,
                duration: '45 min',
                patientName: a.patient_name,
                phone: a.patient_phone || 'WhatsApp',
                treatment: a.treatment || 'Consulta Odontológica General',
                doctor: 'Dra. Aura Estudillo',
                chair: a.branch || 'Gabinete Principal (Sede Balbuena)',
                status: a.status || 'scheduled',
                notes: `Folio: ${a.folio}. ${a.notes || ''}`,
                commissionDue: 0
              }
            })
            setAppointments(apiMapped)
          } else {
            setAppointments([])
          }
        } catch {
          setAppointments([])
        }
      }
    } catch (err) {
      console.warn('Nota en appointments sync (tabla limpia o sin datos aún):', err)
      try {
        const apiRes = await fetch('/api/appointments')
        const apiData = await apiRes.json()
        if (apiData?.success && Array.isArray(apiData.appointments) && apiData.appointments.length > 0) {
          const apiMapped: ClinicalAppointment[] = apiData.appointments.map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: `${a.appointment_time} (45 min)`,
            duration: '45 min',
            patientName: a.patient_name,
            phone: a.patient_phone || 'WhatsApp',
            treatment: a.treatment || 'Consulta Odontológica General',
            doctor: 'Dra. Aura Estudillo',
            chair: a.branch || 'Gabinete Principal (Sede Balbuena)',
            status: a.status || 'scheduled',
            notes: `Folio: ${a.folio}. ${a.notes || ''}`,
            commissionDue: 0
          }))
          setAppointments(apiMapped)
        } else {
          setAppointments([])
        }
      } catch {
        setAppointments([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()

    // Suscripción Realtime a citas
    const channel = supabase
      .channel('realtime_appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments()
        }
      )
      .subscribe()

    // Polling reactivo cada 3 segundos y escucha de eventos de almacenamiento
    const interval = setInterval(fetchAppointments, 3000)
    const handleRefresh = () => fetchAppointments()
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
      supabase.removeChannel(channel)
    }
  }, [])

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
      const startDateTime = new Date(`${newDate}T${newTime}:00`)
      const endDateTime = new Date(startDateTime.getTime() + parseInt(newDuration, 10) * 60000)

      const { error } = await supabase.from('appointments').insert({
        patient_id: newPatientId,
        treatment_type: newTreatment,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'scheduled',
        notes: newNotes.trim() || 'Cita generada en consultorio',
      })

      if (error) throw error

      playTone('message')
      setShowNewModal(false)
      setNewNotes('')
      fetchAppointments()
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
            onClick={fetchAppointments}
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
          {/* Lista de Citas en Tiempo Real */}
          <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-600">Consultando agenda clínica de Supabase...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hay citas programadas en este momento</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              La agenda de la Dra. Aura Estudillo está lista para recibir citas reales en tiempo real. Los pacientes pueden agendar desde el portal o el equipo de recepción.
            </p>
          </div>
        ) : (
          appointments.map((app) => (
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
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {app.status === 'in_chair' ? '⚡ En Sillón' :
                       app.status === 'in_waiting' ? '⏳ En Espera' :
                       app.status === 'completed' ? '✓ Completada' : '📅 Programada'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-amber-900">{app.treatment}</p>
                  <p className="text-[11px] text-slate-600">
                    Doctor asignado: <strong className="text-slate-900">{app.doctor}</strong> • {app.notes}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {app.status === 'in_waiting' && (
                  <button
                    type="button"
                    onClick={() => handleCallToChair(app.patientName)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    Llamar a Sillón
                  </button>
                )}

                <Link
                  href="/dashboard/expediente"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                >
                  Expediente
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
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
