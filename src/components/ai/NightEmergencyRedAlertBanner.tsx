'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Phone,
  ShieldAlert,
  User,
  X,
  Zap,
  ArrowRight,
  MessageSquare
} from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export interface EmergencyCase {
  id: string
  alertType?: 'red_emergency' | 'yellow_appointment' | 'general'
  patientName: string
  phone: string
  painLevel: 'severo' | 'critico' | 'moderado' | 'leve'
  symptoms: string
  timestamp: string
  chatSnippet?: string
  status: 'pending' | 'approved_exceptional' | 'scheduled_first_hour' | 'appointment_confirmed' | 'dismissed'
  branchId?: 'balbuena' | 'guadalupe-chalma'
  branchName?: string
  proposedSlot?: {
    date: string
    time: string
    treatment: string
  }
  patientLocation?: {
    lat?: number
    lng?: number
    zone?: string
    distanceKm?: number
    travelMinutes?: number
    targetBranch?: string
  }
  doctorDecision?: string
  doctorNotes?: string
  resolvedAt?: string
}

import { createClient } from '@/utils/supabase/client'

export function NightEmergencyRedAlertBanner() {
  const [cases, setCases] = useState<EmergencyCase[]>([])
  const [activeCase, setActiveCase] = useState<EmergencyCase | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const { playTone } = useNotificationSound()

  // Sincronización rápida (5s) y escucha de eventos para tiempo real instantáneo
  const fetchEmergencies = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('appointments')
        .select('id, treatment_type, status, start_time, notes, created_at, patients(full_name, phone)')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })

      if (data) {
        const mapped: EmergencyCase[] = data.map((d: any) => ({
          id: d.id,
          alertType: 'red_emergency',
          patientName: d.patients?.full_name || 'Paciente Urgencia',
          phone: d.patients?.phone || 'Sin teléfono',
          painLevel: 'severo',
          symptoms: d.notes || d.treatment_type || 'Urgencia odontológica inmediata',
          timestamp: 'Ahora',
          created_at: d.created_at,
          status: 'pending'
        }))
        setCases(mapped)
        const pendingRed = mapped.find((c: EmergencyCase) => c.status === 'pending')
        if (pendingRed && (!activeCase || activeCase.id !== pendingRed.id)) {
          setActiveCase(pendingRed)
          setMinimized(false)
          playTone('arrival')
        } else if (!pendingRed && activeCase) {
          setActiveCase(null)
        }
      }
    } catch (e) {
      // Ignorar errores de red transitorios
    }
  }

  useEffect(() => {
    fetchEmergencies()
    const interval = setInterval(fetchEmergencies, 5000)

    // Escuchar eventos locales en tiempo real
    const handleStorageChange = () => fetchEmergencies()
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('audenti_emergency_refresh', handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('audenti_emergency_refresh', handleStorageChange)
    }
  }, [activeCase])

  const handleDecision = async (
    decision: 'approved_exceptional' | 'scheduled_first_hour' | 'confirm_appointment',
    customNotes?: string
  ) => {
    if (!activeCase) return
    setIsProcessing(true)

    try {
      const defaultNotes = decision === 'confirm_appointment'
        ? `¡Hola! La Dra. Aura Estudillo ha revisado tu caso. Tu cita ha quedado confirmada para el día ${activeCase.proposedSlot?.date || 'Mañana'} a las ${activeCase.proposedSlot?.time || '11:00 AM'} en la ${activeCase.branchName || 'Sede Balbuena'}. Te esperamos.`
        : decision === 'approved_exceptional'
        ? 'Dra. Aura Estudillo ha aprobado la apertura extraordinaria del consultorio para atender tu urgencia de inmediato.'
        : 'Dra. Aura Estudillo ha confirmado tu atención prioritaria a Primera Hora (08:30 AM) con gabinete y analgésicos preparados.'

      const notes = customNotes || defaultNotes

      const supabase = createClient()
      await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          notes: notes
        })
        .eq('id', activeCase.id)

      playTone('message')
      setCases(prev => prev.map(c => c.id === activeCase.id ? { ...c, status: 'appointment_confirmed', doctorNotes: notes } : c))
      window.dispatchEvent(new Event('audenti_appointment_refresh'))
      window.dispatchEvent(new Event('audenti_emergency_refresh'))
      try {
        localStorage.setItem('audenti_emergency_last_resolved', Date.now().toString())
      } catch {}

      setActiveCase(null)
    } catch (err) {
      console.error('Error al resolver caso de emergencia:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!activeCase) {
    const pendingTotal = cases.filter(c => c.status === 'pending').length
    if (pendingTotal === 0) return null

    const hasRed = cases.some(c => c.status === 'pending' && c.alertType === 'red_emergency')

    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce">
        <button
          onClick={() => {
            const firstPending = cases.find(c => c.status === 'pending')
            if (firstPending) setActiveCase(firstPending)
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-bold text-xs shadow-2xl border-2 transition-all cursor-pointer ${
            hasRed ? 'bg-rose-600 border-rose-400' : 'bg-amber-500 border-amber-300'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-white animate-ping" />
          <span>{hasRed ? '🔴' : '🟡'} {pendingTotal} Alerta{pendingTotal > 1 ? 's' : ''} en Espera (Dra. Aura)</span>
        </button>
      </div>
    )
  }

  const isRed = activeCase.alertType !== 'yellow_appointment'

  if (minimized) {
    return (
      <div className="fixed top-24 right-6 z-50">
        <button
          onClick={() => setMinimized(false)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-white text-xs font-bold shadow-2xl border-2 border-white animate-pulse cursor-pointer ${
            isRed ? 'bg-rose-600' : 'bg-amber-600'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isRed ? '🔴 ALERTA ROJA' : '🟡 CITA PENDIENTE'}: {activeCase.patientName}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-4 top-24 md:inset-x-auto md:right-8 md:w-[480px] z-50 animate-in slide-in-from-top-4 duration-300">
      <div className={`bg-slate-950/95 border-2 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden text-white flex flex-col ${
        isRed ? 'border-rose-500' : 'border-amber-400'
      }`}>
        {/* Encabezado con efecto de Alerta Roja o Amarilla */}
        <div className={`p-4 flex items-center justify-between bg-gradient-to-r ${
          isRed
            ? 'from-rose-700 via-rose-600 to-rose-700'
            : 'from-amber-600 via-amber-500 to-amber-600'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider text-white">
                  {isRed ? '🔴 Alerta Roja: Urgencia 24/7' : '🟡 Alerta Amarilla: Nueva Cita'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isRed ? 'bg-white text-rose-700' : 'bg-slate-950 text-amber-300'
                }`}>
                  {activeCase.branchName || 'Sede Balbuena'}
                </span>
              </div>
              <p className="text-[11px] text-white/90 font-medium">
                Resumen Ejecutivo preparado por Aura AI para la Dra. Aura Estudillo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg transition cursor-pointer"
              title="Minimizar alerta"
            >
              _
            </button>
            <button
              onClick={() => setActiveCase(null)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg transition cursor-pointer"
              title="Cerrar vista"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Caso Clínico / Solicitud de Cita */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Paciente:</span>
              <span className="text-white font-bold text-sm">{activeCase.patientName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">WhatsApp / Teléfono:</span>
              <a
                href={`tel:${activeCase.phone}`}
                className="text-amber-400 font-mono font-bold hover:underline flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                {activeCase.phone}
              </a>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Sede Asignada:</span>
              <span className="font-semibold text-cyan-300">{activeCase.branchName || 'Sede Balbuena (Matriz)'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Hora de reporte:</span>
              <span className="font-mono text-slate-200">{activeCase.timestamp} hrs</span>
            </div>

            {/* Hueco libre propuesto por Aura AI si es cita */}
            {activeCase.proposedSlot && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  📅 Horario Disponible Recomendado:
                </span>
                <span className="text-white font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-amber-400/40">
                  {activeCase.proposedSlot.date} • {activeCase.proposedSlot.time}
                </span>
              </div>
            )}
          </div>

          {/* Mensaje original o motivo de consulta */}
          <div className={`p-3.5 rounded-2xl border space-y-1 ${
            isRed
              ? 'bg-rose-950/40 border-rose-500/20 text-rose-100'
              : 'bg-amber-950/30 border-amber-500/20 text-amber-100'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider block text-slate-400">
              {isRed ? 'Cuadro Clínico / Motivo de Urgencia:' : 'Solicitud del Paciente:'}
            </span>
            <p className="text-xs leading-relaxed font-medium">
              "{activeCase.symptoms}"
            </p>
          </div>

          {/* Botones de Decisión Remota de la Dra. Aura */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Aprobación Rápida (Dra. Aura Estudillo):
            </span>

            {isRed ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleDecision('approved_exceptional')}
                  className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Aprobar Urgencia Inmediata</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleDecision('scheduled_first_hour')}
                  className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/30 transition active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Agendando...</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-slate-950" />
                      <span>Derivar a 1ª Hora</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleDecision('confirm_appointment')}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-400/20 transition active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Guardando Cita en Agenda...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      <span>Aprobar Cita / Asignar Horario Oficial</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
