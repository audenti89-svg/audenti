'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellRing, MessageSquare, Phone, X, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export interface OmnipresentToast {
  id: string
  title: string
  message: string
  type: 'chat' | 'voice' | 'emergency' | 'general'
  patientName?: string
  phone?: string
  folio?: string
  isRegistered?: boolean
  consultationReason?: string
  urgencyLevel?: 'Urgente' | 'No Urgente'
  timestamp: string
  url?: string
}

const STORAGE_KEY_TOASTS = 'audenti_frozen_omnipresent_toasts'

export function OmnipresentDoctorLiveAlerts() {
  const router = useRouter()
  const [toasts, setToasts] = useState<OmnipresentToast[]>([])
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const { playTone } = useNotificationSound()
  const supabase = createClient()

  // Cargar notificaciones congeladas persistentes desde localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TOASTS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setToasts(parsed)
          window.dispatchEvent(new CustomEvent('audenti_unconfirmed_notifications_change', {
            detail: { unconfirmedCount: parsed.length }
          }))
        }
      }
    } catch {}
  }, [])

  // Guardar en localStorage cada vez que la lista cambie
  const updateToastsPersistently = (updater: (prev: OmnipresentToast[]) => OmnipresentToast[]) => {
    setToasts(prev => {
      const next = updater(prev)
      try {
        localStorage.setItem(STORAGE_KEY_TOASTS, JSON.stringify(next))
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('audenti_unconfirmed_notifications_change', {
          detail: { unconfirmedCount: next.length }
        }))
      } catch {}
      return next
    })
  }

  // Dismiss y auto-confirmación formal vía /api/alerts/confirm (Supabase confirmed_by_doctor = true & confirmed_at)
  const dismissAlert = async (id: string, targetUrl?: string) => {
    // 1. Quitar toast inmediatamente de la UI y del storage persistente
    updateToastsPersistently(prev => prev.filter(item => item.id !== id))
    
    // 2. Registrar en lista de notificaciones atendidas localmente
    try {
      const savedRead = localStorage.getItem('audenti_attended_notifications')
      const readIds = savedRead ? JSON.parse(savedRead) : []
      if (!readIds.includes(id)) {
        readIds.push(id)
        localStorage.setItem('audenti_attended_notifications', JSON.stringify(readIds))
      }
    } catch {}

    // 3. Ejecutar petición formal a /api/alerts/confirm para grabar en Supabase confirmed_by_doctor = true y confirmed_at
    try {
      await fetch('/api/alerts/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
    } catch (err) {
      console.warn('[dismissAlert confirmation endpoint error]:', err)
      // Fallback directo con cliente supabase
      try {
        const cleanAlertId = id.replace(/^(toast-|voice-end-|notif-)/, '')
        await supabase
          .from('doctor_alerts')
          .update({ confirmed_by_doctor: true, status: 'confirmed', confirmed_at: new Date().toISOString() })
          .or(`id.eq.${cleanAlertId},reference_id.eq.${cleanAlertId}`)
      } catch {}
    }

    // 4. Si se especificó una URL, navegar
    if (targetUrl) {
      router.push(targetUrl)
    }
  }

  // 1. Registro del Service Worker y Verificación de Permiso de Notificaciones Nativas
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
      // Registrar el Service Worker
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[Service Worker Audenti Registrado]:', reg.scope)
      }).catch((err) => {
        console.warn('[Service Worker Error]:', err)
      })

      const currentPerm = Notification.permission
      setPushPermission(currentPerm)
      if (currentPerm === 'default') {
        setShowPermissionPrompt(true)
      }
    }
  }, [])

  // Solicitar permiso de Web Push nativo a la Dra. Aura
  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      setShowPermissionPrompt(false)

      if (permission === 'granted') {
        playTone('arrival')
        // Mostrar notificación de confirmación
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          reg.showNotification('✅ Notificaciones 24/7 Activadas', {
            body: 'Recibirás avisos inmediatos cuando los pacientes escriban o llamen, incluso con la pantalla bloqueada.',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'audenti-welcome'
          })
        }
      }
    } catch (e) {
      console.warn('Error solicitando permisos push:', e)
    }
  }

  // 2. Disparador de Notificación Nativa del Sistema Operativo
  const triggerNativePush = (title: string, body: string, url: string = '/dashboard/chat') => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            const options: any = {
              body,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: `audenti-${Date.now()}`,
              renotify: true,
              data: { url }
            }
            reg.showNotification(title, options)
          })
        } else {
          new Notification(title, { body, icon: '/logo.png' })
        }
      } catch (err) {
        console.warn('Error lanzando notificación nativa:', err)
      }
    }
  }

  // 3. Listener Global Omnipresente de Supabase Realtime a Nivel Raíz
  useEffect(() => {
    const handleIncomingMessage = async (payload: any) => {
      if (!payload) return
      playTone('arrival')

      const sender = payload.senderName || payload.patient_name || 'Paciente'
      const content = payload.content || payload.message || 'Nuevo mensaje'
      const time = payload.timestamp || payload.time || new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date())

      // Identificador único de usuario para consolidación
      const cleanPhone = (payload.phone || '').replace(/\D/g, '')
      const targetId = payload.targetPatientId || payload.patientId || (cleanPhone ? `prospect_${cleanPhone}` : '')
      const targetUrl = targetId ? `/dashboard/chat?patientId=${encodeURIComponent(targetId)}` : (payload.url || '/dashboard/chat')

      // Verificar si el paciente está registrado en la base de datos
      let isRegistered = false
      let folio = ''
      try {
        if (payload.targetPatientId) {
          const { data: pat } = await supabase
            .from('patients')
            .select('id, full_name, phone')
            .eq('id', payload.targetPatientId)
            .maybeSingle()
          if (pat) {
            isRegistered = true
            folio = `EXP-${pat.id.slice(0, 8).toUpperCase()}`
          }
        }
      } catch {}

      // Lógica de Consolidación por Usuario (Debounce / Single Active Toast):
      // Si el mismo paciente/teléfono ya tiene una alerta activa, se actualiza y concatena su mensaje
      updateToastsPersistently(prev => {
        const existingIdx = prev.findIndex(t => {
          if (targetId && (t.id.includes(targetId) || (t.url && t.url.includes(encodeURIComponent(targetId))))) return true
          if (cleanPhone && t.phone && t.phone.replace(/\D/g, '') === cleanPhone) return true
          if (sender && t.patientName && t.patientName.toLowerCase().trim() === sender.toLowerCase().trim()) return true
          return false
        })

        if (existingIdx !== -1) {
          const existing = prev[existingIdx]
          const isUrgent = payload.urgencyLevel === 'Urgente' || existing.urgencyLevel === 'Urgente' || /(?:dolor|duele|muela|aguanto|urgente)/i.test(content)
          const updatedToast: OmnipresentToast = {
            ...existing,
            title: isRegistered ? `💬 Mensaje de ${sender}` : `🟠 PROSPECTO NUEVO: ${sender}`,
            message: `${existing.message}\n• "${content}"`,
            urgencyLevel: isUrgent ? 'Urgente' : 'No Urgente',
            type: isUrgent ? 'emergency' : existing.type,
            timestamp: time,
            url: targetUrl
          }
          const copy = [...prev]
          copy[existingIdx] = updatedToast
          return copy
        }

        const newToast: OmnipresentToast = {
          id: `toast-${targetId || Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: isRegistered ? `💬 Mensaje de ${sender}` : `🟠 PROSPECTO NUEVO: ${sender}`,
          message: content,
          type: payload.urgencyLevel === 'Urgente' ? 'emergency' : 'chat',
          patientName: sender,
          phone: payload.phone || '',
          folio,
          isRegistered,
          consultationReason: payload.consultationReason || 'Consulta General',
          urgencyLevel: payload.urgencyLevel || (/(?:dolor|duele|muela|aguanto|urgente)/i.test(content) ? 'Urgente' : 'No Urgente'),
          timestamp: time,
          url: targetUrl
        }
        return [newToast, ...prev].slice(0, 5)
      })

      triggerNativePush(
        isRegistered ? `💬 Mensaje de ${sender}` : `🟠 PROSPECTO NUEVO: ${sender}`,
        `${payload.consultationReason || 'Consulta'} • "${content}"`,
        targetUrl
      )
    }

    const handleVoiceEvent = async (payload: any) => {
      if (!payload) return
      const patient = payload.patientName || 'Ricardo Sánchez'
      const time = payload.timestamp || 'Ahora'
      const cleanPhone = (payload.phone || '').replace(/\D/g, '')
      const voiceTargetId = payload.patientId || payload.targetPatientId || (cleanPhone ? `prospect_${cleanPhone}` : '')
      const voiceUrl = voiceTargetId ? `/dashboard/chat?patientId=${encodeURIComponent(voiceTargetId)}` : '/dashboard/chat'

      // Verificar si existe en la BD
      let isRegistered = false
      let folio = ''
      try {
        if (payload.patientId) {
          const { data: pat } = await supabase
            .from('patients')
            .select('id, full_name, phone')
            .eq('id', payload.patientId)
            .maybeSingle()
          if (pat) {
            isRegistered = true
            folio = `EXP-${pat.id.slice(0, 8).toUpperCase()}`
          }
        }
      } catch {}

      if (payload.status === 'active') {
        playTone('arrival')
        triggerNativePush(`📞 Llamada de Voz en Curso`, `${patient} está hablando con Aura IA.`, '/dashboard/chat')
      } else if (payload.status === 'ended') {
        playTone('arrival')

        // FUSIÓN MENSAJE + LLAMADA:
        // Si el paciente ya tenía una alerta previa de chat/WhatsApp activa, unificar en una sola alerta con informe completo
        updateToastsPersistently(prev => {
          const existingIdx = prev.findIndex(t => {
            if (voiceTargetId && (t.id.includes(voiceTargetId) || (t.url && t.url.includes(encodeURIComponent(voiceTargetId))))) return true
            if (cleanPhone && t.phone && t.phone.replace(/\D/g, '') === cleanPhone) return true
            if (patient && t.patientName && t.patientName.toLowerCase().trim() === patient.toLowerCase().trim()) return true
            return false
          })

          const voiceSummary = payload.summary || `Solicitud de Cita Médica • Fecha/Horario por confirmar`

          if (existingIdx !== -1) {
            const existing = prev[existingIdx]
            const fusedToast: OmnipresentToast = {
              ...existing,
              id: existing.id,
              title: `📞 Sesión Unificada (Chat + Llamada): ${patient}`,
              message: `💬 Chat previo: "${existing.message}"\n\n🎙️ Resumen Llamada Aura IA:\n${voiceSummary}`,
              type: 'voice',
              consultationReason: payload.consultationReason || existing.consultationReason || 'Solicitud de Cita Médica por Voz',
              urgencyLevel: payload.urgencyLevel || existing.urgencyLevel || 'Urgente',
              timestamp: time,
              url: voiceUrl,
              folio: folio || existing.folio,
              isRegistered: isRegistered || existing.isRegistered
            }
            const copy = [...prev]
            copy[existingIdx] = fusedToast
            return copy
          }

          const toast: OmnipresentToast = {
            id: `voice-end-${voiceTargetId || Date.now()}`,
            title: isRegistered ? `📞 Llamada de Voz Finalizada con Aura IA: ${patient}` : `📞 🟠 PROSPECTO NUEVO (VOZ): ${patient}`,
            message: voiceSummary,
            type: 'voice',
            patientName: patient,
            phone: payload.phone || '',
            folio,
            isRegistered,
            consultationReason: payload.consultationReason || 'Solicitud de Cita Médica por Voz',
            urgencyLevel: payload.urgencyLevel || 'Urgente',
            timestamp: time,
            url: voiceUrl
          }
          return [toast, ...prev].slice(0, 5)
        })

        triggerNativePush(
          isRegistered ? `🟢 PACIENTE REGISTRADO: ${patient} (${folio})` : `🟠 PROSPECTO NUEVO: ${patient}`,
          `📌 Motivo: Solicitud de Cita Médica\n⚠️ Acción Requerida: Confirmar fecha/horario de atención disponible.`,
          voiceUrl
        )
      }
    }

    // Escuchar en el canal omnicanal
    const omniChannel = supabase
      .channel('chat_omnichannel_sync')
      .on('broadcast', { event: 'incoming_patient_message' }, ({ payload }) => handleIncomingMessage(payload))
      .on('broadcast', { event: 'voice_call_event' }, ({ payload }) => handleVoiceEvent(payload))
      .subscribe()

    // Escuchar en el canal de notificaciones generales de la doctora
    const notifChannel = supabase
      .channel('header_notifications_realtime')
      .on('broadcast', { event: 'doctor_notification' }, ({ payload }) => handleIncomingMessage(payload))
      .subscribe()

    return () => {
      supabase.removeChannel(omniChannel)
      supabase.removeChannel(notifChannel)
    }
  }, [playTone, supabase])

  return (
    <>
      {/* Banner de Solicitud de Permiso Push para la Dra. Aura */}
      {showPermissionPrompt && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92vw] sm:w-[480px] bg-[#0c1322] border-2 border-amber-400 text-white rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-6 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black tracking-wide text-amber-300 uppercase">
                Activar Alertas Push 24/7 en este Dispositivo
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Permite las notificaciones del navegador para recibir avisos sonoros instantáneos cuando un paciente escriba o llame, incluso si tienes el panel minimizado o vas en camino.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleRequestPushPermission}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
                >
                  Permitir Notificaciones
                </button>
                <button
                  onClick={() => setShowPermissionPrompt(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Más tarde
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPermissionPrompt(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stack de Toasts Flotantes Omnipresentes en la Parte Superior (Z-Index Máximo y Sin Recortes) */}
      <div className="fixed top-20 right-3 sm:right-6 z-[9999] flex flex-col gap-3 w-[94vw] sm:w-[440px] max-w-[440px] pointer-events-none overflow-visible">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto overflow-visible bg-[#0a1122]/98 border-2 border-amber-400 text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-in slide-in-from-top-4 fade-in duration-300 transition-all hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  t.type === 'voice'
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  {t.type === 'voice' ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-white truncate">{t.title}</span>
                    <span className="text-[10px] text-amber-300 font-mono shrink-0">{t.timestamp}</span>
                  </div>

                  {/* Clasificación Obligatoria: Paciente Registrado vs Prospecto Nuevo */}
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {t.isRegistered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-black text-[10px]">
                        🟢 PACIENTE REGISTRADO {t.folio ? `(${t.folio})` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/50 text-amber-300 font-black text-[10px]">
                        🟠 PROSPECTO NUEVO {t.phone ? `(${t.phone})` : ''}
                      </span>
                    )}
                  </div>

                  {/* Metadatos Estrictos de Triaje: Paciente/Prospecto, Motivo y Urgencia con Semaforización */}
                  <div className="mt-2.5 space-y-1 text-xs">
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-white/10 space-y-1.5">
                      <p className="text-slate-200">
                        👤 <strong>Nombre:</strong> <span className="text-white font-bold">{t.patientName}</span>
                      </p>
                      {t.phone && (
                        <p className="text-slate-300">
                          📱 <strong>Teléfono:</strong> <span className="text-amber-300 font-mono font-bold">{t.phone}</span>
                        </p>
                      )}
                      <p className="text-slate-300">
                        🎯 <strong>Motivo:</strong> <span className="text-white font-medium">{t.consultationReason || 'Consulta Dental'}</span>
                      </p>
                      <div className="text-[11px] flex items-center gap-1.5 pt-0.5">
                        <span className="text-slate-400 font-bold">🚨 Clasificación:</span>
                        <span className={`px-2.5 py-0.5 rounded-md font-black text-[10px] uppercase ${
                          t.urgencyLevel === 'Urgente'
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 animate-pulse'
                            : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                        }`}>
                          {t.urgencyLevel === 'Urgente' ? '🔴 Urgencia Médica' : '🟢 Consulta / Cita'}
                        </span>
                      </div>
                      {t.message && (
                        <p className="text-slate-300 text-[11px] pt-2 border-t border-white/10 italic leading-snug">
                          &ldquo;{t.message}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissAlert(t.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0 cursor-pointer transition-colors"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Acciones Expresas: Confirmar Lectura o Ver en Chat (Sin Recorte Lateral ni Inferior) */}
            <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between gap-3 overflow-visible">
              <button
                type="button"
                onClick={() => {
                  dismissAlert(t.id)
                  playTone('message')
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                ✓ Confirmar Lectura
              </button>

              <button
                type="button"
                onClick={() => {
                  dismissAlert(t.id, t.url || '/dashboard/chat')
                }}
                className="px-3 py-2 rounded-xl text-amber-300 hover:text-white hover:bg-amber-400/20 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Ver en Chat</span>
                <span className="text-sm">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
