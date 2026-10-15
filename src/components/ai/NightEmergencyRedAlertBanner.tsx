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
  patientName: string
  phone: string
  painLevel: 'severo' | 'critico' | 'moderado'
  symptoms: string
  timestamp: string
  chatSnippet: string
  status: 'pending' | 'approved_exceptional' | 'scheduled_first_hour' | 'dismissed'
  doctorDecision?: string
  doctorNotes?: string
  resolvedAt?: string
}

export function NightEmergencyRedAlertBanner() {
  const [cases, setCases] = useState<EmergencyCase[]>([])
  const [activeCase, setActiveCase] = useState<EmergencyCase | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const { playTone } = useNotificationSound()

  // Polling ligero cada 8 segundos para detectar emergencias nocturnas escaladas
  const fetchEmergencies = async () => {
    try {
      const res = await fetch('/api/ai/night-emergency')
      const data = await res.json()
      if (data?.success && Array.isArray(data.cases)) {
        setCases(data.cases)
        const pending = data.cases.find((c: EmergencyCase) => c.status === 'pending')
        if (pending && (!activeCase || activeCase.id !== pending.id)) {
          setActiveCase(pending)
          setMinimized(false)
          playTone('arrival')
        } else if (!pending) {
          setActiveCase(null)
        }
      }
    } catch (e) {
      // Ignorar errores de red transitorios
    }
  }

  useEffect(() => {
    fetchEmergencies()
    const interval = setInterval(fetchEmergencies, 7000)
    return () => clearInterval(interval)
  }, [])

  const handleDecision = async (decision: 'approved_exceptional' | 'scheduled_first_hour') => {
    if (!activeCase) return
    setIsProcessing(true)

    try {
      const notes = decision === 'approved_exceptional'
        ? 'Dra. Aura Estudillo ha aprobado la apertura extraordinaria del consultorio para atender tu urgencia de inmediato.'
        : 'Dra. Aura Estudillo ha confirmado tu atención prioritaria a Primera Hora (08:30 AM) con gabinete y analgésicos preparados.'

      const res = await fetch('/api/ai/night-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decide',
          caseId: activeCase.id,
          decision,
          doctorNotes: notes
        })
      })

      const data = await res.json()
      if (data?.success) {
        playTone('message')
        // Actualizar estado local
        setCases(prev => prev.map(c => c.id === activeCase.id ? { ...c, status: decision, doctorNotes: notes } : c))
        setActiveCase(null)
      }
    } catch (err) {
      console.error('Error al resolver caso de emergencia:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!activeCase) {
    const pendingTotal = cases.filter(c => c.status === 'pending').length
    if (pendingTotal === 0) return null

    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce">
        <button
          onClick={() => {
            const firstPending = cases.find(c => c.status === 'pending')
            if (firstPending) setActiveCase(firstPending)
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-2xl border-2 border-rose-400"
        >
          <span className="w-3 h-3 rounded-full bg-white animate-ping" />
          <span>🔴 {pendingTotal} Urgencia Nocturna Pendiente</span>
        </button>
      </div>
    )
  }

  if (minimized) {
    return (
      <div className="fixed top-24 right-6 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-rose-600 text-white text-xs font-bold shadow-2xl border-2 border-white animate-pulse"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>🔴 ALERTA ROJA: {activeCase.patientName}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-4 top-24 md:inset-x-auto md:right-8 md:w-[480px] z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-950/95 border-2 border-rose-500 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden text-white flex flex-col">
        {/* Encabezado con efecto de Alerta Roja */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider text-white">
                  🔴 Alerta Roja: Urgencia 24/7
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-rose-700 uppercase">
                  {activeCase.painLevel}
                </span>
              </div>
              <p className="text-[11px] text-rose-100 font-medium">
                Escalado por Audenti Concierge IA a la Dra. Aura Estudillo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1.5 text-rose-200 hover:text-white rounded-lg transition"
              title="Minimizar alerta"
            >
              _
            </button>
            <button
              onClick={() => setActiveCase(null)}
              className="p-1.5 text-rose-200 hover:text-white rounded-lg transition"
              title="Cerrar vista"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Caso Clínico de Urgencia */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-rose-500/30 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Paciente:</span>
              <span className="text-white font-bold text-sm">{activeCase.patientName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Teléfono / WhatsApp:</span>
              <a
                href={`tel:${activeCase.phone}`}
                className="text-amber-400 font-mono font-bold hover:underline flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                {activeCase.phone}
              </a>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-semibold text-slate-400">Hora de reporte:</span>
              <span className="font-mono text-rose-300">{activeCase.timestamp} hrs</span>
            </div>
          </div>

          {/* Síntomas y dolor reportado */}
          <div className="p-3.5 bg-rose-950/40 rounded-2xl border border-rose-500/20 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">
              Cuadro Clínico / Motivo de Urgencia:
            </span>
            <p className="text-xs text-rose-100 leading-relaxed font-medium">
              "{activeCase.symptoms}"
            </p>
          </div>

          {/* Botones de Decisión Remota de la Dra. Aura */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Decisión Médica Remota (Dra. Aura Estudillo):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleDecision('approved_exceptional')}
                className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Aprobar Atención Excepcional</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleDecision('scheduled_first_hour')}
                className="p-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/30 transition active:scale-95 disabled:opacity-50"
              >
                <Clock className="w-4 h-4 text-slate-950" />
                <span>Derivar a 1ª Hora con Prioridad</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
