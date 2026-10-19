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

// Lista de sucursales disponibles para la selección del paciente con UUIDs de tenant:
export const BRANCHES = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Sucursal Valbuena (Matriz)' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Sucursal Chalma de Guadalupe' }
];
export const branches = BRANCHES; // Compatibilidad

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
    phone: '',
    tenant_id: BRANCHES[0].id, // Sede por defecto
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    medicalConditions: '',
    birthYear: '',
    email: '',
    referralSource: 'Recomendación de familiar o amigo',
    referredBy: '',
    selectedBranchId: currentBranchId,
  })

  // Sincronizar con la sucursal activa al abrir
  useEffect(() => {
    if (isOpen) {
      if (currentBranchId === 'guadalupe-chalma') {
        setFormData(prev => ({ ...prev, tenant_id: BRANCHES[1].id, selectedBranchId: currentBranchId }))
      } else {
        setFormData(prev => ({ ...prev, tenant_id: BRANCHES[0].id, selectedBranchId: currentBranchId }))
      }
    }
  }, [isOpen, currentBranchId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const parsedAge = formData.age
        ? parseInt(formData.age, 10)
        : (formData.birthYear ? new Date().getFullYear() - parseInt(formData.birthYear, 10) : 30)

      // Payload con tenant_id dinámico según la sucursal seleccionada
      const patientData: any = {
        full_name: formData.fullName.trim(),
        age: parsedAge,
        phone: formData.phone.trim(),
        tenant_id: formData.tenant_id, // UUID correspondiente a Balbuena, Roma, etc.
        emergency_contact_name: formData.emergencyContact.trim() || null,
        emergency_contact_phone: formData.emergencyPhone.trim() || null,
        emergency_phone: formData.emergencyPhone.trim() || null,
        allergies: formData.allergies ? [formData.allergies.trim()] : [],
        allergies_medication: formData.allergies
          ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        medical_conditions: formData.medicalConditions
          ? formData.medicalConditions.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        referral_source: formData.referralSource,
        source_channel: formData.referralSource,
        referred_by: formData.referralSource === 'Boca en Boca / Familiar' || formData.referralSource === 'Recomendación de familiar o amigo' ? formData.referredBy.trim() : null,
        onboarding_completed: true,
      }

      if (formData.email.trim()) {
        patientData.email = formData.email.trim()
      }

      // Inserción en Supabase
      let { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single()

      // Si falla por restricción de clave foránea en tenant_id inexistente, obtener el tenant existente de la BD
      if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
        const { data: realTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle()
        if (realTenant?.id) {
          patientData.tenant_id = realTenant.id
          const retry = await supabase
            .from('patients')
            .insert([patientData])
            .select()
            .single()
          data = retry.data
          error = retry.error
        }
      }

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

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              Sede o Sucursal Más Cercana *
            </label>
            <select
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
              required
            >
              {BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona la clínica a la que deseas acudir para que la Dra. Aura reciba tu expediente en la sede correspondiente.
            </p>
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

          {/* Captura de Origen y Redes Sociales */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                ¿Cómo te enteraste de nosotros? (Canal de Captación) *
              </label>
              <select
                value={formData.referralSource}
                onChange={e => setFormData({ ...formData, referralSource: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C] focus:bg-white transition-all cursor-pointer"
                required
              >
                <option value="Boca en Boca / Familiar">Boca en Boca / Familiar</option>
                <option value="WhatsApp Directo">WhatsApp Directo</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {formData.referralSource === 'Boca en Boca / Familiar' && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-[11px] font-bold uppercase text-amber-700 mb-1">
                  ¿Quién te recomendó? (Nombre del paciente o referente) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María de los Ángeles Sánchez Rivera"
                  value={formData.referredBy}
                  onChange={e => setFormData({ ...formData, referredBy: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50/50 border border-amber-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>
            )}
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
