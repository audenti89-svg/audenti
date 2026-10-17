'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Users,
  Search,
  UserPlus,
  RefreshCw,
  FolderOpen,
  CalendarPlus,
  Printer,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'

interface Patient {
  id: string
  first_name?: string
  last_name?: string
  full_name?: string
  name?: string
  email?: string
  phone: string
  created_at: string
  onboarding_completed?: boolean
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchPatients()
  }, [])

  async function fetchPatients() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setPatients(data)
    } catch (error) {
      console.error('Error al cargar pacientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPatientFullName = (p: Patient) => {
    if (p.full_name) return p.full_name
    if (p.name) return p.name
    const combined = `${p.first_name || ''} ${p.last_name || ''}`.trim()
    return combined || 'Paciente Registrado'
  }

  const filteredPatients = patients.filter((p) => {
    const fullName = getPatientFullName(p).toLowerCase()
    const term = searchTerm.toLowerCase()
    const phone = p.phone || ''
    const email = (p.email || '').toLowerCase()
    return fullName.includes(term) || phone.includes(term) || email.includes(term)
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado del Módulo CRM */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 uppercase tracking-wide">
              CRM Clínico 360°
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Dra. Aura Estudillo • Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CRM de Pacientes</h1>
          <p className="text-sm text-gray-500">Expedientes únicos, historial y seguimiento clínico.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPatients}
            title="Refrescar directorio"
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="relative w-full md:w-1/3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
        />
      </div>

      {/* Tabla de Listado */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo Electrónico</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Alta</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Cargando expedientes desde Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <p className="font-medium text-gray-700 mb-1">No se encontraron pacientes registrados.</p>
                    <p className="text-xs text-gray-400">Pulsa "+ Nuevo Paciente" para crear un expediente.</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const fullName = getPatientFullName(patient)
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span>{fullName}</span>
                            <span className="block text-[11px] text-gray-400 font-mono">ID: {patient.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono">{patient.phone || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{patient.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                        {patient.created_at ? new Date(patient.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-flex items-center gap-3">
                          <Link
                            href={`/dashboard/expediente`}
                            className="text-teal-600 hover:text-teal-900 font-semibold inline-flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            Ver Expediente 360°
                          </Link>
                          <Link
                            href={`/dashboard/patients/${patient.id}/print`}
                            className="text-gray-500 hover:text-gray-800"
                            title="Imprimir Receta o Presupuesto"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro Rápido */}
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
