'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  CheckCircle2,
  UserX,
  Archive,
  Search,
  UserPlus,
  FolderOpen,
  CalendarPlus,
  MoreVertical,
  Printer,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function PacientesPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const supabase = createClient()

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (err) {
      console.error('Error al cargar pacientes reales de Supabase:', err)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const filteredPatients = patients.filter((p) => {
    const nameMatch = (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const phoneMatch = (p.phone || '').includes(searchTerm)
    const emailMatch = (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSearch = nameMatch || phoneMatch || emailMatch

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.onboarding_completed) ||
      (statusFilter === 'inactive' && !p.onboarding_completed)

    return matchesSearch && matchesStatus
  })

  const activeCount = patients.filter((p) => p.onboarding_completed).length
  const pendingCount = patients.filter((p) => !p.onboarding_completed).length

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Directorio Médico en Vivo
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Dra. Aura Estudillo • Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Directorio de Pacientes</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control de expedientes clínicos con persistencia reactiva en Supabase PostgreSQL.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo..."
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 text-xs border border-slate-200/80 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 w-64 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={fetchPatients}
            title="Refrescar lista"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            + Registrar Paciente
          </Link>
        </div>
      </div>

      {/* Filtros por Estado */}
      <div className="flex flex-wrap gap-2.5">
        {[
          { id: 'all', label: 'Todos', count: patients.length, icon: Users, color: 'text-slate-800 bg-white border-slate-200' },
          { id: 'active', label: 'Expediente Verificado', count: activeCount, icon: CheckCircle2, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
          { id: 'inactive', label: 'Onboarding Pendiente', count: pendingCount, icon: UserX, color: 'text-rose-800 bg-rose-50 border-rose-200' },
        ].map((s) => {
          const Icon = s.icon
          const isSelected = statusFilter === s.id
          return (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-2xs ${s.color} ${
                isSelected ? 'ring-2 ring-amber-400 shadow-sm' : 'hover:opacity-90'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{s.count} {s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Estado de Carga o Tabla */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Sincronizando pacientes desde Supabase PostgreSQL...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No hay pacientes registrados</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            La base de datos está completamente limpia y lista para producción. Los nuevos pacientes aparecerán aquí en cuanto inicien sesión o completen su bioseguridad en el portal.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#202D4C] text-white text-xs font-bold hover:bg-[#162139] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Dar de alta primer paciente
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Paciente</th>
                  <th className="px-6 py-3.5">Contacto</th>
                  <th className="px-6 py-3.5">Contacto Emergencia</th>
                  <th className="px-6 py-3.5">Bioseguridad</th>
                  <th className="px-6 py-3.5">Fecha Registro</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatients.map((p) => {
                  const initials = (p.full_name || 'Paciente')
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-300/50">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">{p.full_name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">ID: {p.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{p.phone || 'Sin teléfono'}</p>
                        <p className="text-[11px] text-slate-500">{p.email || 'Sin correo'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{p.emergency_contact_name || 'No asignado'}</p>
                        <p className="text-[11px] text-slate-500">{p.emergency_contact_phone || 'Sin número'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.onboarding_completed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {p.onboarding_completed ? 'Expediente Verificado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Reciente'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href="/dashboard/expediente"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Abrir Expediente Clínico"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/dashboard/patients/${p.id}/print`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                            title="Imprimir Receta / Presupuesto Membretado"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          <Link
                            href="/dashboard/agenda"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Agendar Cita"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
