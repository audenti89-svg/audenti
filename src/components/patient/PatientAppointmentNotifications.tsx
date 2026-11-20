'use client'

import React, { useState, useEffect } from 'react'
import {
  Bell,
  Calendar,
  Clock,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
  Phone
} from 'lucide-react'
import Link from 'next/link'
import { formatWhatsAppUrl } from '@/lib/whatsapp-link'

interface PatientNotification {
  id: string
  type: 'appointment' | 'biosecurity' | 'preparation' | 'urgent'
  title: string
  message: string
  time: string
  branch?: string
  treatment?: string
  appointmentDate?: string
  appointmentTime?: string
  actionUrl?: string
  actionLabel?: string
}

interface PatientAppointmentNotificationsProps {
  patientId?: string
  patientName?: string
  branchName?: string
  branchPhoneClean?: string
}

export function PatientAppointmentNotifications({
  patientId,
  patientName = 'Paciente Audenti',
  branchName = 'Sucursal Balbuena',
  branchPhoneClean = '525522427769'
}: PatientAppointmentNotificationsProps) {
  const [notifications, setNotifications] = useState<PatientNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [currentNow, setCurrentNow] = useState<number>(() => Date.now())

  // Intervalo ligero para actualizar la caducidad en tiempo real (cada 15s)
  useEffect(() => {
    const timer = setInterval(() => setCurrentNow(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  const fetchPatientNotifications = async () => {
    try {
      const url = patientId
        ? `/api/notifications?role=paciente&patientId=${patientId}`
        : `/api/notifications?role=paciente`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (json.success && Array.isArray(json.notifications)) {
          setNotifications(json.notifications)
        }
      }
    } catch (err) {
      console.warn('Nota cargando notificaciones del paciente:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatientNotifications()
    const interval = setInterval(fetchPatientNotifications, 60000) // cada minuto
    return () => clearInterval(interval)
  }, [patientId])

  // Filtrar notificaciones caducadas: una vez transcurridos 65 minutos (1h 5m) se ocultan automáticamente
  const activeNotifications = notifications.filter(item => {
    if (item.type === 'appointment' && item.appointmentDate) {
      const timeStr = item.appointmentTime || '12:00'
      const [h, m] = timeStr.split(':').map(n => parseInt(n, 10) || 0)
      const apptTime = new Date(`${item.appointmentDate}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`).getTime()
      if (!isNaN(apptTime) && (currentNow - apptTime) > 65 * 60 * 1000) {
        return false // Caducada automáticamente (65 minutos posteriores al inicio)
      }
    }
    return true
  })

  const handleConfirmAppointment = (notifId: string, apptDate?: string, apptTime?: string, treatment?: string) => {
    setConfirmedIds(prev => new Set(prev).add(notifId))
    const msg = `Hola Dra. Aura Estudillo, confirmo mi asistencia a mi cita dental programada para el ${apptDate || 'próximo turno'} a las ${apptTime || ''} hrs (${treatment || 'Consulta'}). Paciente: ${patientName}.`
    const waUrl = formatWhatsAppUrl(branchPhoneClean, msg)
    window.open(waUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse text-xs text-slate-400">
        Cargando tus notificaciones y recordatorios de cita...
      </div>
    )
  }

  if (activeNotifications.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
            Avisos &amp; Recordatorios de tus Citas
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black">
            {activeNotifications.length}
          </span>
        </div>

        <span className="text-[10px] text-slate-400 font-medium">
          Dra. Aura Estudillo • Céd. Prof. 8492019
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {activeNotifications.map((item) => {
          const isConfirmed = confirmedIds.has(item.id)
          const isPreparation = item.type === 'preparation'

          return (
            <div
              key={item.id}
              className={`p-4 rounded-3xl border transition-all backdrop-blur-xl flex flex-col justify-between gap-3 ${
                isPreparation
                  ? 'bg-gradient-to-br from-slate-950 via-slate-900/90 to-cyan-950/20 border-cyan-500/30'
                  : 'bg-gradient-to-br from-slate-950 via-slate-900/90 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                    isPreparation
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-amber-400/10 text-amber-300 border-amber-400/40'
                  }`}>
                    {isPreparation ? <Info className="w-3 h-3 text-cyan-300" /> : <Calendar className="w-3 h-3 text-amber-400" />}
                    <span>{isPreparation ? 'Preparación Previa' : 'Cita en Gabinete'}</span>
                  </span>

                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {item.time}
                  </span>
                </div>

                <h4 className="text-sm font-black text-white leading-tight">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.message}
                </p>
              </div>

              {/* Botones de Acción para el Paciente */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate max-w-[150px]">{item.branch || branchName}</span>
                </div>

                <div className="flex items-center gap-2">
                  {!isPreparation && (
                    <button
                      type="button"
                      onClick={() => handleConfirmAppointment(item.id, item.appointmentDate, item.appointmentTime, item.treatment)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        isConfirmed
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isConfirmed ? '¡Cita Confirmada!' : 'Confirmar por WhatsApp'}</span>
                    </button>
                  )}

                  {isPreparation && item.actionUrl && (
                    <Link
                      href={item.actionUrl}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>{item.actionLabel || 'Ver Indicaciones'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
