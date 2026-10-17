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
  AlertCircle,
  Building2
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useBranchStore, BranchId, BRANCHES_DATA } from '@/stores/branchStore'

interface QuickRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (patient: any) => void
  onPatientCreated?: () => void
}

export function QuickRegisterModal({ isOpen, onClose, onSuccess, onPatientCreated }: QuickRegisterModalProps) {
  const supabase = createClient()
  const { currentBranchId } = useBranchStore()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    birthYear: '',
    phone: '',
    email: '',
    selectedBranchId: currentBranchId,
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    medicalConditions: '',
  })

  // Sincronizar con la sucursal activa al abrir
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, selectedBranchId: currentBranchId }))
    }
  }, [isOpen, currentBranchId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Obtener o resolver tenant_id dinámicamente según la sucursal seleccionada
      const { data: defaultTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle()
      
      // Buscar sucursal en BD por nombre o slug
      const branchMeta = BRANCHES_DATA[formData.selectedBranchId as BranchId] || BRANCHES_DATA.balbuena
      const { data: matchedBranch } = await supabase
        .from('branches')
        .select('id, tenant_id')
        .ilike('name', `%${formData.selectedBranchId.replace('-', ' ')}%`)
        .limit(1)
        .maybeSingle()

      const resolvedTenantId = matchedBranch?.tenant_id || defaultTenant?.id || null
      const resolvedBranchId = matchedBranch?.id || null

      const parsedAge = formData.age ? parseInt(formData.age, 10) : (formData.birthYear ? new Date().getFullYear() - parseInt(formData.birthYear, 10) : null)

      // Payload exacto según directriz de mapeo dinámico:
      const patientPayload: any = {
        full_name: formData.fullName.trim(),
        age: parsedAge,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        // Inyección dinámica de tenant_id y branch_id según sucursal elegida en el UI
        tenant_id: resolvedTenantId,
        branch_id: resolvedBranchId,
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

      // Si no hay tenant_id por configuración en BD, no enviar campo nulo si tiene restricción
      if (!patientPayload.tenant_id) delete patientPayload.tenant_id
      if (!patientPayload.branch_id) delete patientPayload.branch_id

      const { data, error } = await supabase
        .from('patients')
        .insert(patientPayload)
        .select()
        .single()

      if (error) throw error

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('audenti_patient_created', { detail: data }))
        window.dispatchEvent(new CustomEvent('audenti_appointment_refresh'))
      }

      if (onSuccess) onSuccess(data)
      if (onPatientCreated) onPatientCreated()
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

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              Sucursal / Sede Asignada (Inyección de Tenant) *
            </label>
            <select
              value={formData.selectedBranchId}
              onChange={e => setFormData({ ...formData, selectedBranchId: e.target.value as BranchId })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all cursor-pointer"
            >
              <option value="balbuena">Sucursal Balbuena (Matriz) — Dra. Aura Estudillo</option>
              <option value="guadalupe-chalma">Sucursal Guadalupe Chalma — Dr. Ramírez López</option>
              <option value="colonia-roma">Sucursal Colonia Roma — Próxima Apertura</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase text-slate-600">
                  Edad Cumplida *
                </label>
                {(parseInt(formData.age, 10) >= 50 || (formData.birthYear && new Date().getFullYear() - parseInt(formData.birthYear, 10) >= 50)) && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Modo Accesibilidad 50+ Activo
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max="120"
                required
                placeholder="Ej. 54"
                value={formData.age}
                onChange={e => {
                  const val = e.target.value
                  setFormData({
                    ...formData,
                    age: val,
                    birthYear: val ? String(new Date().getFullYear() - parseInt(val, 10)) : ''
                  })
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Año de Nacimiento
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                placeholder="Ej. 1972"
                value={formData.birthYear}
                onChange={e => {
                  const val = e.target.value
                  setFormData({
                    ...formData,
                    birthYear: val,
                    age: val ? String(new Date().getFullYear() - parseInt(val, 10)) : formData.age
                  })
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all"
              />
            </div>
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
