'use client'

import React, { useEffect, useState } from 'react'
import { AlertCircle, Clock, CheckCircle2, Phone, Sparkles, Send, BellRing, MapPin, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useNotificationSound } from '@/hooks/useNotificationSound'

interface EmergencyAlert {
  id: string
  alertType?: 'red_emergency' | 'yellow_appointment' | 'general'
  patientName: string
  phone: string
  painLevel: 'severo' | 'critico' | 'moderado' | 'leve'
  symptoms: string
  timestamp: string
  created_at?: string
  chatSnippet?: string
  status: 'pending' | 'approved_exceptional' | 'scheduled_first_hour' | 'appointment_confirmed' | 'dismissed'
  branchName?: string
}

export function DoctorLiveTriageAlert() {
  const [cases, setCases] = useState<EmergencyAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [elapsedSecondsMap, setElapsedSecondsMap] = useState<Record<string, number>>({})
  const { playTone } = useNotificationSound()

  const fetchAlerts = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('appointments')
        .select('id, treatment_type, status, start_time, notes, created_at, patients(full_name, phone)')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })

      let triageCases: EmergencyAlert[] = []

      if (data && data.length > 0) {
        triageCases = data.map((d: any) => ({
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
      }

      // Hidratar desde Supabase Storage para respaldar la alerta en vivo
      try {
        const { data: storageFile } = await supabase.storage.from('audenti_database').download('appointments.json')
        if (storageFile) {
          const text = await storageFile.text()
          if (text && text.trim()) {
            const list = JSON.parse(text)
            if (Array.isArray(list)) {
              const pendingFromStorage = list.filter((a: any) => a.status === 'pending_review' || (a.treatment && a.treatment.includes('URGENCIA')))
              const existingIds = new Set(triageCases.map(c => c.id))
              for (const p of pendingFromStorage) {
                const caseId = p.id || p.folio
                if (!existingIds.has(caseId)) {
                  triageCases.push({
                    id: caseId,
                    alertType: 'red_emergency',
                    patientName: p.patient_name || p.paciente || 'Paciente Urgencia',
                    phone: p.patient_phone || p.telefono || 'Sin teléfono',
                    painLevel: 'severo',
                    symptoms: p.notes || p.treatment || 'Dolor dental agudo / Urgencia médica',
                    timestamp: 'Ahora',
                    created_at: p.created_at || new Date().toISOString(),
                    status: 'pending'
                  })
                  existingIds.add(caseId)
                }
              }
            }
          }
        }
      } catch (storageErr) {
        console.warn('Nota en lectura de urgencias desde storage:', storageErr)
      }

      setCases(triageCases)
    } catch (e) {
      // Ignorar fallas silenciosas en polling
    }
  }

  useEffect(() => {
    fetchAlerts()

    // Suscripción Realtime para activación instantánea del Triage y sonido urgente
    const supabase = createClient()
    const channel = supabase
      .channel('live_triage_alert_channel')
      .on('broadcast', { event: 'emergency_triage_alert' }, () => {
        fetchAlerts()
        playTone('urgent')
      })
      .subscribe()

    const interval = setInterval(fetchAlerts, 3000)

    const handleRefresh = () => {
      fetchAlerts()
      playTone('urgent')
    }
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_emergency_refresh', handleRefresh)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_emergency_refresh', handleRefresh)
    }
  }, [])

  // Timer de segundos transcurridos
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const newMap: Record<string, number> = {}
      cases.forEach(c => {
        if (c.created_at) {
          const created = new Date(c.created_at).getTime()
          const diff = Math.max(0, Math.floor((now - created) / 1000))
          newMap[c.id] = diff
        } else {
          newMap[c.id] = (elapsedSecondsMap[c.id] || 0) + 1
        }
      })
      setElapsedSecondsMap(newMap)
    }, 1000)
    return () => clearInterval(timer)
  }, [cases])

  const handleDecision = async (
    caseId: string,
    decision: 'approved_exceptional' | 'scheduled_first_hour' | 'confirm_appointment' | 'dismissed',
    doctorNotes?: string,
    branchName?: string
  ) => {
    setActionInProgress(caseId)
    try {
      const supabase = createClient()
      const newStatus = decision === 'dismissed' ? 'cancelled' : 'confirmed'
      await supabase
        .from('appointments')
        .update({
          status: newStatus,
          notes: doctorNotes ? `Decisión médica: ${decision}. ${doctorNotes}` : `Decisión médica: ${decision}`
        })
        .eq('id', caseId)

      fetchAlerts()
      window.dispatchEvent(new Event('audenti_appointment_refresh'))
    } catch (err) {
      console.warn('Error al procesar decisión médica:', err)
    } finally {
      setActionInProgress(null)
    }
  }

  if (cases.length === 0) return null

  return (
    <div className="w-full space-y-3">
      {cases.map((c) => {
        const elapsed = elapsedSecondsMap[c.id] || 0
        const isOver60s = elapsed >= 60
        const isRed = c.alertType === 'red_emergency' || c.painLevel === 'severo' || c.painLevel === 'critico'

        return (
          <div
            key={c.id}
            className={`rounded-2xl p-4 sm:p-5 border shadow-md transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
              isRed
                ? 'bg-rose-950/10 border-rose-500/40 text-slate-900 dark:text-rose-100'
                : 'bg-amber-950/10 border-amber-500/40 text-slate-900 dark:text-amber-100'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Información del paciente y motivo */}
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      isRed
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-amber-500 text-slate-950 shadow-xs'
                    }`}
                  >
                    <BellRing className="w-3.5 h-3.5 animate-bounce" />
                    {isRed ? 'Urgencia / Dolor Agudo' : 'Cita Prioritaria / Triaje'}
                  </span>
                  
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Folio: {c.id}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                      isOver60s
                        ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    En espera: {elapsed}s {isOver60s && '(IA en contingencia activa)'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {c.patientName}
                  </h3>
                  {c.phone && c.phone !== '[Desconocido] Pendiente por WhatsApp' && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {c.phone}
                    </span>
                  )}
                  {c.branchName && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3 h-3 text-amber-500" />
                      {c.branchName}
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                  <strong className="text-slate-900 dark:text-white">Síntoma reportado:</strong> {c.symptoms}
                </p>

                {c.chatSnippet && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1">
                    "{c.chatSnippet}"
                  </p>
                )}
              </div>

              {/* Botones de Respuesta Rápida de la Dra. Aura */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  disabled={actionInProgress === c.id}
                  onClick={() =>
                    handleDecision(
                      c.id,
                      'approved_exceptional',
                      'Dra. Aura te atiende de urgencia en 30 min. Por favor dirígete a la clínica.',
                      c.branchName
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Atiendo en 30 min
                </button>

                <button
                  disabled={actionInProgress === c.id}
                  onClick={() =>
                    handleDecision(
                      c.id,
                      'confirm_appointment',
                      `Cita confirmada por la Dra. Aura Estudillo en ${c.branchName || 'Sede Balbuena'}. ¡Te esperamos!`,
                      c.branchName
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmar Espacio Hoy
                </button>

                <button
                  disabled={actionInProgress === c.id}
                  onClick={() =>
                    handleDecision(
                      c.id,
                      'scheduled_first_hour',
                      'Dra. Aura ha reservado tu atención prioritaria a primera hora mañana (08:30 AM).',
                      c.branchName
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  1ª Hora Mañana
                </button>

                <button
                  disabled={actionInProgress === c.id}
                  onClick={() => handleDecision(c.id, 'dismissed', 'Descartada por la Dra. Aura')}
                  title="Descartar alerta"
                  className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
