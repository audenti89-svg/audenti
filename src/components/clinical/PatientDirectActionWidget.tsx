'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserCheck,
  Activity,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
  Volume2,
  Calendar,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { formatWhatsAppUrl } from '@/lib/whatsapp-link'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export interface PatientDirectActionWidgetProps {
  patient: {
    id: string
    full_name: string
    phone?: string | null
    allergies_medication?: string[] | string | null
    medical_conditions?: string[] | string | null
  }
  compact?: boolean
  onAppointmentStatusChange?: (status: string) => void
}

export function PatientDirectActionWidget({
  patient,
  compact = false,
  onAppointmentStatusChange
}: PatientDirectActionWidgetProps) {
  const router = useRouter()
  const supabase = createClient()
  const { playTone } = useNotificationSound()

  const [activeAppointment, setActiveAppointment] = useState<any>(null)
  const [loadingAppt, setLoadingAppt] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Cargar la cita más relevante de hoy o reciente para este paciente
  const fetchPatientAppointment = async () => {
    if (!patient?.id) return
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const cleanPhone = (patient.phone || '').replace(/\D/g, '').slice(-10)

      // Buscar cita por patient_id o por teléfono
      let query = supabase
        .from('appointments')
        .select('*')
        .or(`patient_id.eq.${patient.id}${cleanPhone ? `,phone.ilike.%${cleanPhone}%` : ''}`)
        .order('date', { ascending: false })
        .limit(5)

      const { data, error } = await query
      if (error) throw error

      if (data && data.length > 0) {
        // Priorizar cita de hoy o activa ('in_chair', 'in_waiting', 'scheduled')
        const todayOrActive = data.find(a => 
          (a.date && a.date.startsWith(todayStr)) ||
          ['in_chair', 'in_waiting', 'scheduled'].includes(a.status)
        ) || data[0]

        setActiveAppointment(todayOrActive)
      } else {
        setActiveAppointment(null)
      }
    } catch (err) {
      console.warn('[DirectActionWidget] Error al buscar cita activa:', err)
      setActiveAppointment(null)
    } finally {
      setLoadingAppt(false)
    }
  }

  useEffect(() => {
    fetchPatientAppointment()

    const handleRefresh = () => fetchPatientAppointment()
    window.addEventListener('audenti_appointment_refresh', handleRefresh)
    return () => {
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
    }
  }, [patient?.id, patient?.phone])

  const handleCallToChair = (patientName: string) => {
    playTone('arrival')
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Paciente ${patientName}, favor de pasar al gabinete de la Doctora Aura Estudillo.`)
      utterance.lang = 'es-MX'
      utterance.rate = 0.95
      window.speechSynthesis.speak(utterance)
    }
  }

  // 1. "Registrar Llegada" -> EN_ESPERA (in_waiting)
  const handleRegisterArrival = async () => {
    setUpdating(true)
    playTone('arrival')

    try {
      let apptId = activeAppointment?.id
      if (!apptId) {
        // Crear cita inmediata si no existe una registrada
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        const { data: newAppt } = await supabase
          .from('appointments')
          .insert({
            patient_id: patient.id,
            patient_name: patient.full_name,
            phone: patient.phone || '',
            date: todayStr,
            time: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            treatment: 'Consulta Odontológica General',
            status: 'in_waiting',
            doctor: 'Dra. Aura Estudillo',
            notes: `Llegada registrada desde Perfil (${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
          })
          .select()
          .single()
        apptId = newAppt?.id
      } else {
        await supabase
          .from('appointments')
          .update({
            status: 'in_waiting',
            notes: `${activeAppointment.notes ? activeAppointment.notes + ' | ' : ''}[ESTADO]: Llegada registrada desde Perfil (${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
          })
          .eq('id', apptId)
      }

      setActiveAppointment((prev: any) => ({ ...(prev || {}), status: 'in_waiting' }))
      handleCallToChair(patient.full_name)
      window.dispatchEvent(new Event('audenti_appointment_refresh'))
      if (onAppointmentStatusChange) onAppointmentStatusChange('in_waiting')
    } catch (err) {
      console.warn('Error al registrar llegada:', err)
    } finally {
      setUpdating(false)
    }
  }

  // 2. "Pasar a Sillón" -> EN_SILLON (in_chair)
  const handlePassToChair = async () => {
    setUpdating(true)
    playTone('arrival')

    try {
      let apptId = activeAppointment?.id
      if (!apptId) {
        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        const { data: newAppt } = await supabase
          .from('appointments')
          .insert({
            patient_id: patient.id,
            patient_name: patient.full_name,
            phone: patient.phone || '',
            date: todayStr,
            time: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            treatment: 'Consulta Odontológica General',
            status: 'in_chair',
            doctor: 'Dra. Aura Estudillo',
            notes: `En sillón directo desde Perfil (${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
          })
          .select()
          .single()
        apptId = newAppt?.id
      } else {
        await supabase
          .from('appointments')
          .update({
            status: 'in_chair',
            notes: `${activeAppointment.notes ? activeAppointment.notes + ' | ' : ''}[ESTADO]: En sillón con la Dra. Aura Estudillo (${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
          })
          .eq('id', apptId)
      }

      setActiveAppointment((prev: any) => ({ ...(prev || {}), status: 'in_chair' }))
      window.dispatchEvent(new Event('audenti_appointment_refresh'))
      if (onAppointmentStatusChange) onAppointmentStatusChange('in_chair')
      router.push(`/dashboard/expediente?patient_id=${patient.id}&alert=biosecurity`)
    } catch (err) {
      console.warn('Error al pasar a sillón:', err)
    } finally {
      setUpdating(false)
    }
  }

  // 3. "Concluir / Atendido" -> ATENDIDO + NAVEGACIÓN A CAJA (Checkout Inmediato)
  const handleConcludeAndCheckout = async () => {
    setUpdating(true)
    playTone('message')

    try {
      const apptId = activeAppointment?.id || `app-${Date.now()}`
      if (activeAppointment?.id) {
        await supabase
          .from('appointments')
          .update({
            status: 'completed',
            notes: `${activeAppointment.notes ? activeAppointment.notes + ' | ' : ''}[ESTADO]: Procedimiento atendido. Trasladado a Caja (${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})`
          })
          .eq('id', activeAppointment.id)
      }

      setActiveAppointment((prev: any) => ({ ...(prev || {}), status: 'completed' }))
      window.dispatchEvent(new Event('audenti_appointment_refresh'))
      if (onAppointmentStatusChange) onAppointmentStatusChange('completed')

      // Navegar a Finanzas con los parámetros exactos para abrir el modal de Cobro en Caja
      const patientQuery = encodeURIComponent(patient.full_name)
      const treatmentQuery = encodeURIComponent(activeAppointment?.treatment || 'Tratamiento Odontológico Integral')
      router.push(`/dashboard/finanzas?action=checkout&appointment_id=${apptId}&patient=${patientQuery}&treatment=${treatmentQuery}&patient_id=${patient.id}`)
    } catch (err) {
      console.warn('Error al concluir y cobrar:', err)
    } finally {
      setUpdating(false)
    }
  }

  const currentStatus = activeAppointment?.status || 'no_appointment'
  const cleanPhone = (patient.phone || '').replace(/\D/g, '').slice(-10)

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {currentStatus === 'scheduled' && (
          <button
            type="button"
            onClick={handleRegisterArrival}
            disabled={updating}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-2xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Registrar llegada en recepción"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Llegada</span>
          </button>
        )}

        {currentStatus !== 'in_chair' ? (
          <button
            type="button"
            onClick={handlePassToChair}
            disabled={updating}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Pasar paciente al sillón y abrir expediente"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{currentStatus === 'completed' ? 'Reabrir Sillón' : 'Pasar a Sillón'}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px] uppercase animate-pulse">
            ⚡ En Sillón
          </span>
        )}

        {currentStatus !== 'completed' && (
          <button
            type="button"
            onClick={handleConcludeAndCheckout}
            disabled={updating}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Concluir procedimiento y abrir Cobro en Caja"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cobrar / Atendido</span>
          </button>
        )}

        <a
          href={formatWhatsAppUrl(
            cleanPhone || patient.phone,
            `Hola ${patient.full_name}, te saluda la Dra. Aura Estudillo de Audenti respecto a tu cita.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] shadow-2xs transition-transform active:scale-95"
          title={`Abrir WhatsApp con ${patient.full_name}`}
        >
          <MessageSquare className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>
    )
  }

  // Vista completa tipo Banner Operativo para Expediente Clínico
  return (
    <div className="bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
          currentStatus === 'in_chair'
            ? 'bg-emerald-500 text-white animate-pulse'
            : currentStatus === 'in_waiting'
            ? 'bg-amber-500 text-slate-950'
            : currentStatus === 'completed'
            ? 'bg-blue-500 text-white'
            : 'bg-slate-800 text-slate-300 border border-slate-700'
        }`}>
          {currentStatus === 'in_chair' ? <Activity className="w-6 h-6" /> :
           currentStatus === 'in_waiting' ? <Clock className="w-6 h-6" /> :
           currentStatus === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
           <Calendar className="w-6 h-6" />}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              currentStatus === 'in_chair'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : currentStatus === 'in_waiting'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : currentStatus === 'completed'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {currentStatus === 'in_chair' ? '⚡ EN SILLÓN AHORA' :
               currentStatus === 'in_waiting' ? '⏳ EN SALA DE ESPERA' :
               currentStatus === 'completed' ? '✓ PROCEDIMIENTO CONCLUIDO' :
               '📅 OPERACIÓN DEL DÍA'}
            </span>
            {activeAppointment?.treatment && (
              <span className="text-xs text-slate-300 font-semibold">
                • {activeAppointment.treatment}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentStatus === 'in_chair'
              ? 'Paciente en procedimiento activo con la Dra. Aura Estudillo. Al finalizar, concluye para liquidar en Caja.'
              : currentStatus === 'in_waiting'
              ? 'Paciente esperando en recepción. Listo para pasar a sillón dental.'
              : currentStatus === 'completed'
              ? 'Tratamiento atendido. Registrado en el sistema contable.'
              : 'Gestión directa del estado clínico sin salir del expediente.'}
          </p>
        </div>
      </div>

      {/* Botonera de Acciones Directas */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
        {currentStatus === 'in_waiting' && (
          <button
            type="button"
            onClick={() => handleCallToChair(patient.full_name)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Llamar al paciente por altavoz"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Llamar Altavoz
          </button>
        )}

        {currentStatus === 'scheduled' && (
          <button
            type="button"
            onClick={handleRegisterArrival}
            disabled={updating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Registrar Llegada
          </button>
        )}

        {currentStatus !== 'in_chair' ? (
          <button
            type="button"
            onClick={handlePassToChair}
            disabled={updating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Cambiar estado a En Sillón"
          >
            <Activity className="w-3.5 h-3.5" />
            {currentStatus === 'completed' ? 'Reabrir a Sillón' : 'Pasar a Sillón'}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Atendiendo en Sillón
          </span>
        )}

        {currentStatus !== 'completed' && (
          <button
            type="button"
            onClick={handleConcludeAndCheckout}
            disabled={updating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Concluir tratamiento y cobrar en Caja"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Concluir / Atendido (Cobrar)
          </button>
        )}

        <a
          href={formatWhatsAppUrl(
            cleanPhone || patient.phone,
            `Hola ${patient.full_name}, te saluda la Dra. Aura Estudillo de Audenti Clinical respecto a tu atención médica.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
          title={`Abrir WhatsApp con ${patient.full_name}`}
        >
          <MessageSquare className="w-3.5 h-3.5 fill-current" />
          <span>WhatsApp Directo</span>
        </a>
      </div>
    </div>
  )
}
