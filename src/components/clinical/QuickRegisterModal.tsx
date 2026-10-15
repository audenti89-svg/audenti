'use client'

import { useState, useEffect } from 'react'
import {
  X,
  UserCheck,
  Phone,
  Mail,
  ShieldCheck,
  HeartPulse,
  Save,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface QuickRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (patient: any) => void
}

export function QuickRegisterModal({ isOpen, onClose, onSuccess }: QuickRegisterModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    medicalConditions: '',
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { data: defaultTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle()
      const { data: defaultBranch } = await supabase.from('branches').select('id').limit(1).maybeSingle()

      const patientPayload: any = {
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        emergency_contact_name: formData.emergencyContact.trim() || null,
        emergency_contact_phone: formData.emergencyPhone.trim() || null,
        allergies_medication: formData.allergies
          ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        medical_conditions: formData.medicalConditions
          ? formData.medicalConditions.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        onboarding_completed: true,
      }

      if (defaultTenant?.id) patientPayload.tenant_id = defaultTenant.id
      if (defaultBranch?.id) patientPayload.branch_id = defaultBranch.id

      const { data, error } = await supabase
        .from('patients')
        .insert(patientPayload)
        .select()
        .single()

      if (error) throw error

      if (onSuccess) onSuccess(data)
      onClose()
    } catch (err: any) {
      console.error('Error al registrar paciente rápido:', err)
      setErrorMsg(err?.message || 'Error al guardar el paciente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal flotante */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-6 sm:p-8 text-slate-900 z-10 animate-in zoom-in-95 fade-in">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Recepción &amp; Gabinete
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Dra. Aura Estudillo • Céd. 8492019
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#202D4C]">Alta Clínica Rápida de Paciente</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra los datos vitales para crear el expediente digital de inmediato en Supabase.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Nombre Completo Real *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Roberto Sánchez Gómez"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Teléfono Celular *
              </label>
              <input
                type="tel"
                required
                placeholder="55 1234 5678"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="paciente@correo.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Contacto de Emergencia
              </label>
              <input
                type="text"
                placeholder="Familiar cercano"
                value={formData.emergencyContact}
                onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Teléfono de Emergencia
              </label>
              <input
                type="tel"
                placeholder="Número de urgencia"
                value={formData.emergencyPhone}
                onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Alergias o Contraindicaciones
            </label>
            <input
              type="text"
              placeholder="Ej. Penicilina, Lidocaína o Ninguna"
              value={formData.allergies}
              onChange={e => setFormData({ ...formData, allergies: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Guardando en Supabase...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Registrar Paciente y Crear Expediente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
