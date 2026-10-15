'use client'

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Users,
  Clock,
  Calendar as CalendarIcon,
  X,
  Volume2,
  VolumeX,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Filter,
  UserCheck,
  Stethoscope
} from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'

type CalendarView = 'day' | 'week' | 'month' | 'year'

interface CalendarAppointment {
  id: string
  title: string
  patientName: string
  doctor: string
  chair: string
  specialty: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  durationMin: number
  status: 'confirmed' | 'in_chair' | 'in_waiting' | 'completed' | 'no_show'
  color: string
}

const DOCTORS = [
  { id: 'doc-1', name: 'Dra. Aura Estudillo', specialty: 'Dirección Médica & Especialista', color: 'border-l-amber-500 bg-amber-50 text-amber-950' },
  { id: 'doc-2', name: 'Dr. Ramírez López', specialty: 'Ortodoncia & Alineadores', color: 'border-l-blue-500 bg-blue-50 text-blue-950' },
  { id: 'doc-3', name: 'Dr. Cortés', specialty: 'Endodoncia Mecanizada', color: 'border-l-emerald-500 bg-emerald-50 text-emerald-950' },
  { id: 'doc-4', name: 'Dra. Gutiérrez', specialty: 'Cirugía & Implantología', color: 'border-l-purple-500 bg-purple-50 text-purple-950' },
]

const CHAIRS = ['Gabinete 1 (Principal)', 'Gabinete 2', 'Quirófano Quirúrgico']

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

const INITIAL_APPOINTMENTS: CalendarAppointment[] = []

export default function CalendarPage() {
  const { soundEnabled, setSoundEnabled, playTone } = useNotificationSound()

  const [currentView, setCurrentView] = useState<CalendarView>('week')
  const [selectedDate, setSelectedDate] = useState('2026-10-10')
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(INITIAL_APPOINTMENTS)
  const [filterDoctor, setFilterDoctor] = useState('all')

  // Modal de Creación Rápida Estilo Google Calendar
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false)
  const [modalSlot, setModalSlot] = useState({ date: '2026-10-10', time: '12:00' })
  const [newTitle, setNewTitle] = useState('')
  const [newPatient, setNewPatient] = useState('')
  const [newDoctor, setNewDoctor] = useState('Dra. Aura Estudillo')
  const [newChair, setNewChair] = useState('Gabinete 1 (Principal)')
  const [isFamilyBatch, setIsFamilyBatch] = useState(false)

  // Drag and drop simulado
  const [draggedApptId, setDraggedApptId] = useState<string | null>(null)

  // Días de la semana para vista Semana
  const weekDays = [
    { name: 'LUN', day: '05', fullDate: '2026-10-05' },
    { name: 'MAR', day: '06', fullDate: '2026-10-06' },
    { name: 'MIÉ', day: '07', fullDate: '2026-10-07' },
    { name: 'JUE', day: '08', fullDate: '2026-10-08' },
    { name: 'VIE', day: '09', fullDate: '2026-10-09' },
    { name: 'SÁB', day: '10', fullDate: '2026-10-10', isToday: true },
    { name: 'DOM', day: '11', fullDate: '2026-10-11' },
  ]

  // Cargar citas persistentes en el calendario estilo Google Calendar
  const fetchCalendarAppointments = async () => {
    try {
      const res = await fetch('/api/appointments')
      const json = await res.json()
      if (json?.success && Array.isArray(json.appointments)) {
        const mapped: CalendarAppointment[] = json.appointments.map((a: any) => ({
          id: a.id,
          title: a.treatment || 'Consulta / Valoración Estética Oral',
          patientName: a.patient_name,
          doctor: 'Dra. Aura Estudillo',
          chair: a.branch || 'Gabinete 1 (Principal)',
          specialty: 'Odontología Integral & Estética',
          date: a.appointment_date,
          startTime: (a.appointment_time || '11:00').substring(0, 5),
          endTime: '12:00',
          durationMin: 45,
          status: a.status || 'confirmed',
          color: 'bg-amber-100 text-amber-950 border-l-4 border-amber-500'
        }))
        setAppointments(prev => {
          const manual = prev.filter(p => !p.id.startsWith('APT-'))
          return [...manual, ...mapped]
        })
      }
    } catch {
      // Ignorar errores transitorios
    }
  }

  useEffect(() => {
    fetchCalendarAppointments()
    const interval = setInterval(fetchCalendarAppointments, 3000)
    const handleRefresh = () => fetchCalendarAppointments()
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
    }
  }, [])

  // Abrir modal de creación al hacer clic en un slot
  const handleSlotClick = (date: string, time: string) => {
    setModalSlot({ date, time })
    setNewTitle('')
    setNewPatient('')
    setShowQuickCreateModal(true)
  }

  // Guardar cita con alerta sonora
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newPatient) return

    playTone('message')

    const newAppt: CalendarAppointment = {
      id: `apt-${Date.now()}`,
      title: newTitle,
      patientName: newPatient,
      doctor: newDoctor,
      chair: newChair,
      specialty: 'Odontología Integral',
      date: modalSlot.date,
      startTime: modalSlot.time,
      endTime: '13:00',
      durationMin: 60,
      status: 'confirmed',
      color: 'bg-amber-100 text-amber-950 border-l-4 border-amber-500',
    }

    setAppointments(prev => [...prev, newAppt])
    setShowQuickCreateModal(false)
    setIsFamilyBatch(false)
  }

  return (
    <div className="flex flex-col w-full space-y-4 pb-12">
      {/* =========================================================================
          TOP BAR ESTILO GOOGLE CALENDAR
      ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSelectedDate('2026-10-10'); playTone('message'); }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Hoy
            </button>
            <div className="flex items-center">
              <button type="button" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight ml-1">
              Octubre 2026
            </h1>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sincronizado Supabase Realtime
          </span>
        </div>

        {/* Selector de Vistas Top-Right & Alertas Sonoras */}
        <div className="flex items-center gap-3">
          {/* Controles de Sonido */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) playTone('arrival')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Sonido: {soundEnabled ? 'On' : 'Mute'}</span>
          </button>

          {/* Selector de Vista: Día, Semana, Mes, Año */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {(['day', 'week', 'month', 'year'] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setCurrentView(v)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  currentView === v
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleSlotClick('2026-10-10', '12:00')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>
      </div>

      {/* =========================================================================
          CONTENEDOR DIVIDIDO: MINI-CALENDARIO LATERAL + CUADRÍCULA PRINCIPAL
      ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* MINI-CALENDARIO LATERAL ESTILO GOOGLE CALENDAR */}
        <aside className="w-full lg:w-64 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm shrink-0 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Octubre 2026</span>
              <div className="flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-700" />
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-700" />
              </div>
            </div>
            {/* Matriz 7x5 mini */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
              <span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const isSelected = day === 10
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(`2026-10-${day < 10 ? '0' + day : day}`)}
                    className={`h-7 w-7 rounded-full flex items-center justify-center font-semibold text-xs transition-colors mx-auto ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filtros por Especialistas Dentales */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Mis Doctores &amp; Sillones
            </span>
            <div className="space-y-1.5">
              {DOCTORS.map(d => (
                <label key={d.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-3.5 h-3.5 accent-amber-500 rounded"
                  />
                  <span className="truncate">{d.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sillones Dentales */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Unidades Dentales
            </span>
            <div className="space-y-1.5">
              {CHAIRS.map(c => (
                <div key={c} className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="truncate">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* =========================================================================
            CUADRÍCULA PRINCIPAL DEL CALENDARIO (ESTILO GOOGLE CALENDAR)
        ========================================================================= */}
        <main className="flex-1 w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* VISTA SEMANA */}
          {currentView === 'week' && (
            <div className="flex flex-col min-w-[700px] overflow-x-auto">
              {/* Header de Días */}
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/70 text-center">
                <div className="p-3 border-r border-slate-200/70 text-[11px] font-bold text-slate-400">
                  GMT-6
                </div>
                {weekDays.map(d => (
                  <div key={d.fullDate} className="p-3 border-r border-slate-200/70 last:border-r-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">{d.name}</span>
                    <span className={`text-base font-bold inline-block h-7 w-7 rounded-full leading-7 mt-0.5 ${
                      d.isToday ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-800'
                    }`}>
                      {d.day}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grilla Horaria */}
              <div className="divide-y divide-slate-100 relative">
                {/* Línea roja de hora actual estilo Google */}
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: '225px' }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-600 -ml-1" />
                  <div className="flex-1 h-0.5 bg-rose-600" />
                </div>

                {HOURS.map(hour => (
                  <div key={hour} className="grid grid-cols-8 min-h-[58px] group">
                    <div className="p-2 border-r border-slate-200/70 text-[11px] font-mono text-slate-400 text-right pr-3 -mt-2">
                      {hour}
                    </div>

                    {weekDays.map(d => {
                      const slotAppointments = appointments.filter(
                        a => a.date === d.fullDate && a.startTime.startsWith(hour.substring(0, 2))
                      )

                      return (
                        <div
                          key={d.fullDate}
                          onClick={() => handleSlotClick(d.fullDate, hour)}
                          className="border-r border-slate-200/60 last:border-r-0 p-1 hover:bg-slate-50/60 transition-colors relative cursor-pointer"
                        >
                          {slotAppointments.map(app => (
                            <div
                              key={app.id}
                              className={`p-2 rounded-xl text-xs font-semibold shadow-2xs mb-1 transition-transform hover:scale-[1.02] cursor-grab ${app.color}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                playTone('arrival')
                                alert(`Cita: ${app.title}\nPaciente: ${app.patientName}\nDoctor: ${app.doctor}\nSillón: ${app.chair}`)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold truncate text-[11px]">{app.patientName}</span>
                                <span className="text-[10px] opacity-75">{app.startTime}</span>
                              </div>
                              <p className="text-[10px] truncate opacity-90">{app.title}</p>
                              <span className="text-[9px] font-mono opacity-75 block">{app.chair}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA DÍA */}
          {currentView === 'day' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Agenda de Hoy — Sábado, 10 de Octubre 2026</h2>
                  <p className="text-xs text-slate-500">Distribución simultánea por 3 Unidades Dentales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CHAIRS.map(chair => (
                  <div key={chair} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-900 block border-b pb-2">{chair}</span>
                    <div className="space-y-2">
                      {appointments.filter(a => a.chair.includes(chair.substring(0, 8))).map(a => (
                        <div key={a.id} className={`p-3 rounded-xl border text-xs font-semibold shadow-2xs ${a.color}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{a.patientName}</span>
                            <span className="font-mono text-[10px]">{a.startTime} - {a.endTime}</span>
                          </div>
                          <p className="text-[11px] mt-1">{a.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Atiende: {a.doctor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA MES */}
          {currentView === 'month' && (
            <div className="p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Vista Panorámica Mensual (Octubre 2026)</h2>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const dayDate = `2026-10-${day < 10 ? '0' + day : day}`
                  const count = appointments.filter(a => a.date === dayDate).length
                  return (
                    <div
                      key={day}
                      onClick={() => handleSlotClick(dayDate, '10:00')}
                      className={`min-h-[85px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        day === 10 ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50/50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${day === 10 ? 'text-amber-900' : 'text-slate-700'}`}>{day}</span>
                        {count > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400 text-slate-950">
                            {count} citas
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {count > 0 && (
                          <span className="text-[9px] text-slate-600 truncate block">Ocupación: {count * 20}%</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* VISTA AÑO */}
          {currentView === 'year' && (
            <div className="p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Calendario Anual 2026</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((month, idx) => (
                  <div key={month} className={`p-4 rounded-xl border text-center ${idx === 9 ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200 bg-slate-50'}`}>
                    <span className="text-xs font-bold text-slate-900 block">{month}</span>
                    <span className="text-[11px] text-slate-500 mt-1 block">{idx === 9 ? 'Mes Activo (86 citas)' : 'Planificado'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL DE CREACIÓN RÁPIDA ESTILO GOOGLE CALENDAR
      ========================================================================= */}
      {showQuickCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Agendar Cita Rápida</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tratamiento o Título de la Cita</label>
                <input
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ej. Limpieza Ultrasónica, Extracción o Control..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Paciente (Autocompletado)</label>
                  <input
                    required
                    value={newPatient}
                    onChange={e => setNewPatient(e.target.value)}
                    placeholder="Nombre del paciente..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={modalSlot.time}
                    onChange={e => setModalSlot({ ...modalSlot, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Doctor Asignado</label>
                  <select
                    value={newDoctor}
                    onChange={e => setNewDoctor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  >
                    {DOCTORS.map(d => (
                      <option key={d.name} value={d.name}>{d.name} ({d.specialty.split(' ')[0]})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Sillón / Gabinete</label>
                  <select
                    value={newChair}
                    onChange={e => setNewChair(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none"
                  >
                    {CHAIRS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botón 1-Click Núcleo Familiar */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">Agendamiento Familiar en Cascada</span>
                  <span className="text-[10px] text-purple-700">Bloquear citas consecutivas para el cónyuge o hijos.</span>
                </div>
                <input
                  type="checkbox"
                  checked={isFamilyBatch}
                  onChange={e => setIsFamilyBatch(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors shadow-xs"
                >
                  Guardar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
