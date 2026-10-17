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
import { createClient } from '@/utils/supabase/client'

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
  { id: 'doc-1', name: 'Dra. Aura Estudillo', specialty: 'Dirección Médica & Cirujana Dentista', color: 'border-l-amber-500 bg-amber-50 text-amber-950' },
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
  
  // Obtener fecha actual en formato YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date()
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    return parts // YYYY-MM-DD
  }

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr)
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(INITIAL_APPOINTMENTS)
  const [filterDoctor, setFilterDoctor] = useState('all')

  // Modal de Creación Rápida Estilo Google Calendar
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false)
  const [modalSlot, setModalSlot] = useState({ date: getTodayStr(), time: '12:00' })
  const [newTitle, setNewTitle] = useState('')
  const [newPatient, setNewPatient] = useState('')
  const [newDoctor, setNewDoctor] = useState('Dra. Aura Estudillo')
  const [newChair, setNewChair] = useState('Gabinete 1 (Principal)')
  const [isFamilyBatch, setIsFamilyBatch] = useState(false)

  // Drag and drop simulado
  const [draggedApptId, setDraggedApptId] = useState<string | null>(null)

  // Calcular dinámicamente los 7 días de la semana según la fecha seleccionada
  const weekDays = (() => {
    const base = new Date(`${selectedDate}T12:00:00-06:00`)
    const dayOfWeek = (base.getDay() + 6) % 7 // 0=Lunes, 6=Domingo
    const monday = new Date(base)
    monday.setDate(base.getDate() - dayOfWeek)

    const names = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
    const todayStr = getTodayStr()

    return names.map((name, idx) => {
      const current = new Date(monday)
      current.setDate(monday.getDate() + idx)
      const fullDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(current)
      const dayNum = fullDate.split('-')[2]

      return {
        name,
        day: dayNum,
        fullDate,
        isToday: fullDate === todayStr
      }
    })
  })()

  // Cargar citas persistentes en el calendario estilo Google Calendar
  const fetchCalendarAppointments = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('appointments')
        .select('id, treatment_type, status, start_time, notes, patients(full_name)')
        .order('start_time', { ascending: true })

      let allAppointments: CalendarAppointment[] = []

      if (data && data.length > 0) {
        allAppointments = data.map((a: any) => {
          const d = a.start_time ? new Date(a.start_time) : new Date()
          const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
          const timeStr = d.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false })

          return {
            id: a.id,
            title: a.treatment_type || 'Consulta / Valoración Estética Oral',
            patientName: a.patients?.full_name || 'Paciente',
            doctor: 'Dra. Aura Estudillo',
            chair: 'Gabinete 1 (Principal)',
            specialty: 'Odontología Integral & Estética',
            date: dateStr,
            startTime: timeStr,
            endTime: '12:00',
            durationMin: 45,
            status: a.status || 'confirmed',
            color: 'bg-amber-100 text-amber-950 border-l-4 border-amber-500'
          }
        })
      }

      // Hidratar desde Supabase Storage para citas agendadas por IA
      try {
        const { data: storageFile } = await supabase.storage.from('audenti_database').download('appointments.json')
        if (storageFile) {
          const text = await storageFile.text()
          if (text && text.trim()) {
            const list = JSON.parse(text)
            if (Array.isArray(list) && list.length > 0) {
              const existingIds = new Set(allAppointments.map(a => a.id))
              for (const p of list) {
                const appId = p.id || p.folio || `apt-${Date.now()}`
                if (!existingIds.has(appId)) {
                  const appointmentDate = p.appointment_date || (p.start_time ? p.start_time.split('T')[0] : '2026-10-19')
                  let rawTime = p.appointment_time || (p.start_time ? p.start_time.split('T')[1]?.substring(0, 5) : '09:00')
                  if (rawTime.length > 5) rawTime = rawTime.substring(0, 5)

                  allAppointments.push({
                    id: appId,
                    title: p.treatment || p.treatment_type || 'Consulta Odontológica',
                    patientName: p.patient_name || p.paciente || 'Paciente Audenti',
                    doctor: 'Dra. Aura Estudillo',
                    chair: 'Gabinete 1 (Principal)',
                    specialty: 'Odontología Integral',
                    date: appointmentDate,
                    startTime: rawTime,
                    endTime: '10:00',
                    durationMin: 45,
                    status: (p.status as any) || 'confirmed',
                    color: 'bg-amber-100 text-amber-950 border-l-4 border-amber-500'
                  })
                  existingIds.add(appId)
                }
              }
            }
          }
        }
      } catch (storageErr) {
        console.warn('Nota en lectura de storage para calendario:', storageErr)
      }

      setAppointments(allAppointments)
    } catch {
      // Ignorar errores transitorios
    }
  }

  useEffect(() => {
    fetchCalendarAppointments()
    const supabase = createClient()

    // Suscripción Realtime a citas (broadcast)
    const channel = supabase
      .channel('calendar_page_realtime')
      .on('broadcast', { event: 'new_appointment' }, () => {
        fetchCalendarAppointments()
      })
      .on('broadcast', { event: 'emergency_triage_alert' }, () => {
        fetchCalendarAppointments()
      })
      .subscribe()

    const interval = setInterval(fetchCalendarAppointments, 3000)
    const handleRefresh = () => fetchCalendarAppointments()
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
      supabase.removeChannel(channel)
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
              onClick={() => { setSelectedDate(getTodayStr()); playTone('message'); }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Hoy
            </button>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  const b = new Date(`${selectedDate}T12:00:00-06:00`)
                  b.setDate(b.getDate() - 7)
                  setSelectedDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(b))
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = new Date(`${selectedDate}T12:00:00-06:00`)
                  b.setDate(b.getDate() + 7)
                  setSelectedDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(b))
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight ml-1 capitalize">
              {new Date(`${selectedDate}T12:00:00-06:00`).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', month: 'long', year: 'numeric' })}
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
            onClick={() => handleSlotClick(selectedDate, '12:00')}
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
              <span className="text-xs font-bold text-slate-800 capitalize">
                {new Date(`${selectedDate}T12:00:00-06:00`).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', month: 'long', year: 'numeric' })}
              </span>
              <div className="flex items-center gap-1">
                <ChevronLeft
                  onClick={() => {
                    const b = new Date(`${selectedDate}T12:00:00-06:00`)
                    b.setMonth(b.getMonth() - 1)
                    setSelectedDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(b))
                  }}
                  className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-700"
                />
                <ChevronRight
                  onClick={() => {
                    const b = new Date(`${selectedDate}T12:00:00-06:00`)
                    b.setMonth(b.getMonth() + 1)
                    setSelectedDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(b))
                  }}
                  className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-700"
                />
              </div>
            </div>
            {/* Matriz 7x5 mini con semana iniciando en Lunes (L M M J V S D) */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
              <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
            </div>
            {(() => {
              const [yearStr, monthStr] = selectedDate.split('-')
              const year = parseInt(yearStr, 10)
              const month = parseInt(monthStr, 10) - 1 // 0-indexed
              const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0)
              // 0=Domingo, 1=Lunes, ... 6=Sábado -> convertir a Lunes=0, Domingo=6
              const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7
              const totalDaysInMonth = new Date(year, month + 1, 0).getDate()

              const monthPrefix = `${yearStr}-${monthStr}-`
              const todayStr = getTodayStr()

              return (
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {/* Celdas vacías previas para alinear el día 1 en su columna correcta */}
                  {Array.from({ length: startDayOffset }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-7 w-7 mx-auto pointer-events-none" />
                  ))}

                  {/* Días del mes */}
                  {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map(day => {
                    const dayPadded = day < 10 ? '0' + day : '' + day
                    const targetFull = `${monthPrefix}${dayPadded}`
                    const isSelected = selectedDate === targetFull
                    const isRealToday = todayStr === targetFull

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(targetFull)}
                        className={`h-7 w-7 rounded-full flex items-center justify-center font-semibold text-xs transition-colors mx-auto ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                            : isRealToday
                            ? 'border border-amber-500 font-bold text-amber-900 bg-amber-50/50'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              )
            })()}
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
                  <h2 className="text-base font-bold text-slate-900 capitalize">
                    Agenda del Día — {new Date(`${selectedDate}T12:00:00-06:00`).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-xs text-slate-500">Distribución simultánea por 3 Unidades Dentales</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CHAIRS.map(chair => (
                  <div key={chair} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-900 block border-b pb-2">{chair}</span>
                    <div className="space-y-2">
                      {appointments.filter(a => a.date === selectedDate && a.chair.includes(chair.substring(0, 8))).map(a => (
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
              <h2 className="text-base font-bold text-slate-900 capitalize">
                Vista Panorámica Mensual ({new Date(`${selectedDate}T12:00:00-06:00`).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', month: 'long', year: 'numeric' })})
              </h2>
              {/* Header de días de la semana L M M J V S D */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-1">
                <span>Lunes</span>
                <span>Martes</span>
                <span>Miércoles</span>
                <span>Jueves</span>
                <span>Viernes</span>
                <span>Sábado</span>
                <span>Domingo</span>
              </div>
              {(() => {
                const [yearStr, monthStr] = selectedDate.split('-')
                const year = parseInt(yearStr, 10)
                const month = parseInt(monthStr, 10) - 1
                const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0)
                const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7
                const totalDaysInMonth = new Date(year, month + 1, 0).getDate()
                const monthPrefix = `${yearStr}-${monthStr}-`
                const todayStr = getTodayStr()

                return (
                  <div className="grid grid-cols-7 gap-2">
                    {/* Celdas vacías de desfase */}
                    {Array.from({ length: startDayOffset }).map((_, idx) => (
                      <div key={`month-empty-${idx}`} className="min-h-[85px] p-2 rounded-xl border border-transparent bg-slate-50/20 pointer-events-none" />
                    ))}

                    {/* Días del mes */}
                    {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map(day => {
                      const dayPadded = day < 10 ? '0' + day : '' + day
                      const dayDate = `${monthPrefix}${dayPadded}`
                      const count = appointments.filter(a => a.date === dayDate).length
                      const isSelected = selectedDate === dayDate
                      const isRealToday = todayStr === dayDate
                      return (
                        <div
                          key={day}
                          onClick={() => handleSlotClick(dayDate, '10:00')}
                          className={`min-h-[85px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-50/80 border-amber-400 shadow-xs'
                              : isRealToday
                              ? 'bg-amber-50/30 border-amber-300'
                              : 'bg-slate-50/50 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold ${isSelected ? 'text-amber-950 font-black' : 'text-slate-700'}`}>{day}</span>
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
                )
              })()}
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
