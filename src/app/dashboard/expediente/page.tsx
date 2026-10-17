'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Edit,
  Cake,
  Phone,
  Mail,
  Home,
  Users,
  Share2,
  CheckCircle2,
  Printer,
  UserPlus,
  RefreshCw,
  Search,
  Save,
  X
} from 'lucide-react'
import { Odontogram } from '@/components/clinical/Odontogram'
import { FamilyNucleusManager } from '@/components/clinical/FamilyNucleusManager'
import { MedicalQuestionnaire } from '@/components/clinical/MedicalQuestionnaire'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'

export default function ExpedientePage() {
  const supabase = createClient()
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  // Modal para editar ficha
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    emergencyContact: '',
    emergencyPhone: '',
    allergies: '',
    medicalConditions: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const list = data || []
      setPatients(list)
      if (list.length > 0) {
        setSelectedPatient(list[0])
        initEditForm(list[0])
      } else {
        setSelectedPatient(null)
      }
    } catch (err) {
      console.warn('Nota en expediente:', err)
      setPatients([])
      setSelectedPatient(null)
    } finally {
      setLoading(false)
    }
  }

  const initEditForm = (p: any) => {
    setEditForm({
      fullName: p.full_name || '',
      phone: p.phone || '',
      email: p.email || '',
      emergencyContact: p.emergency_contact_name || '',
      emergencyPhone: p.emergency_contact_phone || '',
      allergies: Array.isArray(p.allergies_medication) ? p.allergies_medication.join(', ') : '',
      medicalConditions: Array.isArray(p.medical_conditions) ? p.medical_conditions.join(', ') : '',
    })
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const handleSelectPatient = (id: string) => {
    const p = patients.find(item => item.id === id)
    if (p) {
      setSelectedPatient(p)
      initEditForm(p)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    setSavingEdit(true)
    try {
      const { data, error } = await supabase
        .from('patients')
        .update({
          full_name: editForm.fullName.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim() || null,
          emergency_contact_name: editForm.emergencyContact.trim() || null,
          emergency_contact_phone: editForm.emergencyPhone.trim() || null,
          allergies_medication: editForm.allergies
            ? editForm.allergies.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          medical_conditions: editForm.medicalConditions
            ? editForm.medicalConditions.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        })
        .eq('id', selectedPatient.id)
        .select()
        .single()

      if (error) throw error

      setSelectedPatient(data)
      setPatients(prev => prev.map(item => (item.id === data.id ? data : item)))
      setIsEditing(false)
    } catch (err: any) {
      console.error('Error al editar ficha:', err)
      alert('Error al guardar los cambios de la ficha médica.')
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Sincronizando expedientes clínicos desde Supabase...</p>
      </div>
    )
  }

  if (!selectedPatient) {
    return (
      <div className="flex flex-col w-full space-y-6 pb-12">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Expediente Clínico Digital
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Expediente Clínico</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dra. Aura Estudillo • Céd. Prof. 8492019</p>
          </div>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Registrar Paciente (Alta Rápida)
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Base de Expedientes Lista y en Blanco</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            No hay ningún paciente registrado todavía. Al dar de alta un paciente con el botón superior o cuando completen su onboarding post-login, se desplegará su ficha médica, odontograma interactivo y cuestionario de salud.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              Dar de alta primer paciente ahora
            </button>
          </div>
        </div>

        <QuickRegisterModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onPatientCreated={() => {
            setIsRegisterOpen(false)
            fetchPatients()
          }}
        />
      </div>
    )
  }

  const initials = (selectedPatient.full_name || 'Paciente')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header con Selector de Pacientes y Botones Funcionales */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Expediente Clínico Digital
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Dra. Aura Estudillo • Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedPatient.full_name}</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Folio #{selectedPatient.id.slice(0, 8).toUpperCase()} • Registrado el{' '}
            {new Date(selectedPatient.created_at || Date.now()).toLocaleDateString('es-MX')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de paciente si hay más de 1 */}
          {patients.length > 1 && (
            <select
              value={selectedPatient.id}
              onChange={(e) => handleSelectPatient(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          )}

          <Link
            href={`/dashboard/patients/${selectedPatient.id}/print`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Imprimir Receta / Presupuesto
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200 shadow-2xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Resumen Clínico
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <Edit className="w-4 h-4 text-amber-400" />
            Editar Ficha
          </button>
        </div>
      </div>

      {/* Grid Superior: Ficha del Paciente y Odontograma */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos del Paciente */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-xs">
                {initials}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{selectedPatient.full_name}</h2>
                <p className="text-[11px] text-slate-500 font-mono">ID: {selectedPatient.id.slice(0, 8)}</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {selectedPatient.onboarding_completed ? 'Bioseguridad Verificada' : 'Onboarding Pendiente'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-1 border-t border-slate-100">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Teléfono</span>
                  <p className="text-slate-800 font-medium">{selectedPatient.phone || 'No registrado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Correo Electrónico</span>
                  <p className="text-slate-800 font-medium">{selectedPatient.email || 'No registrado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Contacto de Emergencia</span>
                  <p className="text-slate-800 font-medium">
                    {selectedPatient.emergency_contact_name || 'No asignado'} • {selectedPatient.emergency_contact_phone || 'Sin tel.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Odontograma Vectorial Interactivo */}
        <div className="lg:col-span-2">
          <Odontogram />
        </div>
      </div>

      {/* Modal Funcional: Editar Ficha */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            onClick={() => setIsEditing(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-slate-900 z-10 animate-in zoom-in-95">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-[#202D4C] mb-1">Editar Ficha del Paciente</h2>
            <p className="text-xs text-slate-500 mb-4">Actualiza los datos clínicos en la base de datos de Supabase.</p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Contacto Emergencia</label>
                  <input
                    type="text"
                    value={editForm.emergencyContact}
                    onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tel. Emergencia</label>
                  <input
                    type="tel"
                    value={editForm.emergencyPhone}
                    onChange={e => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Alergias a Medicamentos</label>
                <input
                  type="text"
                  value={editForm.allergies}
                  onChange={e => setEditForm({ ...editForm, allergies: e.target.value })}
                  placeholder="Ej. Penicilina, Lidocaína"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {savingEdit ? 'Guardando cambios...' : 'Guardar Cambios en Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
