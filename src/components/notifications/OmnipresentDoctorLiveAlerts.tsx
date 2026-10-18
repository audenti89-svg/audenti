'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing, MessageSquare, Phone, X, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export interface OmnipresentToast {
  id: string
  title: string
  message: string
  type: 'chat' | 'voice' | 'emergency' | 'general'
  patientName?: string
  timestamp: string
  url?: string
}

export function OmnipresentDoctorLiveAlerts() {
  const [toasts, setToasts] = useState<OmnipresentToast[]>([])
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const { playTone } = useNotificationSound()
  const supabase = createClient()

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
    const handleIncomingMessage = (payload: any) => {
      if (!payload) return
      playTone('arrival')

      const sender = payload.senderName || payload.patient_name || 'Paciente'
      const content = payload.content || payload.message || 'Nuevo mensaje'
      const time = payload.timestamp || payload.time || new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date())

      const newToast: OmnipresentToast = {
        id: `toast-${Date.now()}-${Math.random()}`,
        title: `💬 Mensaje de ${sender}`,
        message: content,
        type: 'chat',
        patientName: sender,
        timestamp: time,
        url: '/dashboard/chat'
      }

      setToasts(prev => [newToast, ...prev].slice(0, 4))
      triggerNativePush(`💬 Mensaje de ${sender}`, content, '/dashboard/chat')

      // Auto-remover a los 10 segundos
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id))
      }, 10000)
    }

    const handleVoiceEvent = (payload: any) => {
      if (!payload) return
      const patient = payload.patientName || 'Paciente'
      const time = payload.timestamp || 'Ahora'

      if (payload.status === 'active') {
        playTone('arrival')
        // Alerta sonora sutil de inicio
        triggerNativePush(`📞 Llamada de Voz en Curso`, `${patient} está hablando con Aura IA.`, '/dashboard/chat')
      } else if (payload.status === 'ended') {
        playTone('arrival')
        const toast: OmnipresentToast = {
          id: `voice-end-${Date.now()}`,
          title: `📞 Llamada de Voz Finalizada con Aura IA`,
          message: payload.summary || `Solicitud de Cita Médica • Fecha/Horario por confirmar`,
          type: 'voice',
          patientName: patient,
          timestamp: time,
          url: '/dashboard/chat'
        }
        setToasts(prev => [toast, ...prev].slice(0, 3))
        triggerNativePush(`👤 Paciente: ${patient} (Registrado)`, `📌 Motivo: Solicitud de Cita Médica\n⚠️ Acción Requerida: Confirmar fecha/horario de atención disponible.`, '/dashboard/chat')
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, 15000)
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

      {/* Stack de Toasts Flotantes Omnipresentes en la Parte Superior */}
      <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#0a1122]/95 border-2 border-amber-400/90 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 fade-in duration-300 transition-all hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  t.type === 'voice'
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  {t.type === 'voice' ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{t.title}</span>
                    <span className="text-[10px] text-amber-300 font-mono">{t.timestamp}</span>
                  </div>
                  {t.type === 'voice' ? (
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="bg-slate-900/80 p-2 rounded-xl border border-white/10 space-y-1">
                        <p className="text-amber-300 font-bold">
                          👤 Paciente: <span className="text-white">{t.patientName || 'Ricardo Sánchez'}</span> <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">(Registrado)</span>
                        </p>
                        <p className="text-slate-300">
                          📌 Motivo: <span className="text-white font-medium">Solicitud de Cita Médica</span>
                        </p>
                        <p className="text-amber-400 font-semibold text-[11px] flex items-center gap-1">
                          ⚠️ Acción Requerida: Confirmar fecha/horario disponible
                        </p>
                        {t.message && !t.message.includes('Solicitud de Cita') && (
                          <p className="text-slate-400 text-[10px] pt-1 border-t border-white/10 italic">
                            &ldquo;{t.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 mt-1 font-medium leading-snug line-clamp-2">
                      &ldquo;{t.message}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Audenti 24/7 Live Sync</span>
              <a
                href={t.url || '/dashboard/chat'}
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline"
              >
                Ver en Chat Omnicanal →
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
