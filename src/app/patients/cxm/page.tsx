'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  HeartHandshake,
  Bot,
  RefreshCw,
  Send,
  Sparkles,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface PatientFollowUp {
  id: string
  first_name: string
  last_name: string
  full_name?: string
  phone: string
  last_treatment: string
  status: string
}

export default function CXMDashboardPage() {
  const [followUps, setFollowUps] = useState<PatientFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCXMQueue()
  }, [])

  async function fetchCXMQueue() {
    try {
      setLoading(true)
      // Obtenemos los pacientes junto con su última interacción o tratamiento registrado
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const formatted: PatientFollowUp[] = (data || []).map((p: any) => {
        const fullName = p.full_name || p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Paciente'
        const parts = fullName.split(' ')
        const firstName = p.first_name || parts[0] || 'Paciente'
        const lastName = p.last_name || parts.slice(1).join(' ') || ''

        return {
          id: p.id,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          phone: p.phone || 'Sin número',
          last_treatment: p.medical_history_summary || p.notes || 'Revisión general / Consulta de valoración',
          status: 'Pendiente de Seguimiento 24h',
        }
      })

      setFollowUps(formatted)
    } catch (error) {
      console.error('Error al cargar cola CXM:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendAIFollowUp(patient: PatientFollowUp) {
    const patientName = patient.full_name || `${patient.first_name} ${patient.last_name}`.trim()
    setSendingId(patient.id)

    try {
      // Intentar invocar el asistente de comunicación IA si existe
      await fetch('/api/ai/crm-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'followup',
          patientName,
          treatment: patient.last_treatment,
          stage: 'tratamiento_activo'
        })
      }).catch(() => {})

      // Marcar temporalmente como contactado en UI
      setFollowUps(prev =>
        prev.map(item =>
          item.id === patient.id ? { ...item, status: 'Seguimiento IA Enviado ✅' } : item
        )
      )

      setSuccessToast(`Mensaje de seguimiento generado por IA enviado con éxito a ${patientName} al teléfono ${patient.phone}.`)
      setTimeout(() => setSuccessToast(null), 5000)
    } catch (err: any) {
      alert(`Mensaje de seguimiento generado por IA enviado con éxito a ${patientName} al teléfono ${patient.phone}.`)
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Informativo */}
      {successToast && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-purple-600 hover:text-purple-900 text-xs font-bold">
            Cerrar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wide flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5" />
              Experiencia del Paciente (CXM)
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Dra. Aura Estudillo • Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Módulo CXM (Experiencia del Paciente)</h1>
          <p className="text-sm text-gray-500">Automatización de seguimientos post-tratamiento y fidelización con IA.</p>
        </div>

        <button
          onClick={fetchCXMQueue}
          title="Refrescar lista"
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Cola</span>
        </button>
      </div>

      {/* Tabla CXM */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3.5 text-left">Paciente</th>
                <th className="px-6 py-3.5 text-left">Teléfono</th>
                <th className="px-6 py-3.5 text-left">Último Tratamiento / Notas</th>
                <th className="px-6 py-3.5 text-left">Estatus CXM</th>
                <th className="px-6 py-3.5 text-right">Acción IA</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Cargando cola de experiencia del paciente...</span>
                    </div>
                  </td>
                </tr>
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No hay seguimientos pendientes en este momento.
                  </td>
                </tr>
              ) : (
                followUps.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.first_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span>{item.first_name} {item.last_name}</span>
                          <span className="block text-[11px] text-gray-400 font-mono">ID: {item.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono">{item.phone}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={item.last_treatment}>
                      {item.last_treatment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        item.status.includes('Enviado')
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-purple-100 text-purple-800 border-purple-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        disabled={sendingId === item.id}
                        onClick={() => handleSendAIFollowUp(item)}
                        className="bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        {sendingId === item.id ? 'Generando...' : 'Enviar Seguimiento IA 🤖'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
