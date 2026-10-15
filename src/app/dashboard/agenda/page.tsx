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
  RefreshCw
} from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

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
  const [horizon, setHorizon] = useState<TimeHorizon>('present')
  const [chairFilter, setChairFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [appointments, setAppointments] = useState<ClinicalAppointment[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

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
        const mapped: ClinicalAppointment[] = data.map((item: any) => {
          const startDate = new Date(item.start_time)
          const endDate = new Date(item.end_time || item.start_time)
          const timeStr = `${startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
          const dateStr = startDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
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
        setAppointments(mapped)
      } else {
        setAppointments([])
      }
    } catch (err) {
      console.warn('Nota en appointments sync (tabla limpia o sin datos aún):', err)
      setAppointments([])
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

    return () => {
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

          <Link
            href="/dashboard/agenda"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            + Nueva Cita
          </Link>
        </div>
      </div>

      {/* Selector de Horizonte Temporal */}
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
    </div>
  )
}
