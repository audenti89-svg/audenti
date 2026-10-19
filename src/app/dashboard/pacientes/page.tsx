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
  RefreshCw,
  MessageCircle
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { QuickRegisterModal } from '@/components/clinical/QuickRegisterModal'

export default function PacientesPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
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

    // Suscripción Realtime a inserciones y cambios en la tabla patients
    const patientChannel = supabase
      .channel('dashboard_pacientes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        () => {
          fetchPatients()
        }
      )
      .on('broadcast', { event: 'new_appointment' }, () => {
        fetchPatients()
      })
      .on('broadcast', { event: 'emergency_triage_alert' }, () => {
        fetchPatients()
      })
      .subscribe()

    const handleRefresh = () => fetchPatients()
    window.addEventListener('storage', handleRefresh)
    window.addEventListener('audenti_appointment_refresh', handleRefresh)
    window.addEventListener('audenti_emergency_refresh', handleRefresh)
    window.addEventListener('audenti_patient_created', handleRefresh)

    const interval = setInterval(fetchPatients, 3000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(patientChannel)
      window.removeEventListener('storage', handleRefresh)
      window.removeEventListener('audenti_appointment_refresh', handleRefresh)
      window.removeEventListener('audenti_emergency_refresh', handleRefresh)
      window.removeEventListener('audenti_patient_created', handleRefresh)
    }
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

  // Tab activo: lista o reporte analítico
  const [activeTab, setActiveTab] = useState<'directory' | 'analytics'>('directory')

  // Mapeo analítico de canales de adquisición
  const referralStats = patients.reduce((acc: Record<string, number>, p: any) => {
    const src = p.referral_source || 'Sin registrar'
    acc[src] = (acc[src] || 0) + 1
    return acc
  }, {})

  // Embajadores de la clínica (pacientes que más han recomendado)
  const ambassadorsMap = patients.reduce((acc: Record<string, number>, p: any) => {
    if (p.referred_by) {
      const ref = p.referred_by.trim()
      acc[ref] = (acc[ref] || 0) + 1
    }
    return acc
  }, {})

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Directorio &amp; Red de Pacientes</h1>
          <p className="text-xs text-slate-500 mt-0.5">Control de expedientes clínicos, canales de adquisición y red de embajadores familiares.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Alternar pestañas Directorio / Reporte */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'directory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Directorio ({patients.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'analytics' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 Canales &amp; Embajadores
            </button>
          </div>

          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, Teléfono, ID o Folio..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 text-xs border border-slate-200/80 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={fetchPatients}
            title="Refrescar lista"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Registrar Paciente (Alta Rápida)
          </button>
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

      {/* VISTA 1: REPORTE ANALÍTICO DE CANALES DE ADQUISICIÓN Y EMBAJADORES */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Canales de Adquisición */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm md:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-2">
                Impacto de Canales de Adquisición
              </h2>
              <p className="text-xs text-slate-500 mb-5">Medición de nuevos pacientes provenientes de redes sociales y recomendaciones.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { name: 'Recomendación de familiar o amigo', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  { name: 'YouTube', color: 'bg-red-50 text-red-800 border-red-200' },
                  { name: 'Facebook', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                  { name: 'Instagram', color: 'bg-pink-50 text-pink-800 border-pink-200' },
                  { name: 'TikTok', color: 'bg-purple-50 text-purple-800 border-purple-200' },
                  { name: 'Búsqueda en Google / Otro', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                ].map((channel) => (
                  <div key={channel.name} className={`p-4 rounded-xl border ${channel.color}`}>
                    <p className="text-[11px] font-bold uppercase leading-tight line-clamp-1">{channel.name}</p>
                    <p className="text-2xl font-black mt-2">{referralStats[channel.name] || 0}</p>
                    <p className="text-[10px] opacity-75 mt-0.5">pacientes registrados</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Embajadores de la Clínica */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-2">
                👑 Embajadores de la Clínica
              </h2>
              <p className="text-xs text-slate-500 mb-4">Pacientes y familiares que más personas han recomendado.</p>

              {Object.keys(ambassadorsMap).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Aún no hay referencias registradas. Se actualizará en cuanto los pacientes indiquen quién los recomendó.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(ambassadorsMap).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs">
                      <span className="font-bold text-slate-800">{name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                        {count} {count === 1 ? 'referido' : 'referidos'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: TABLA DE PACIENTES */}
      {activeTab === 'directory' && (
        <>
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
                La base de datos está completamente limpia y lista para producción. Los nuevos pacientes aparecerán aquí en cuanto registres un paciente o completen su bioseguridad en el portal.
              </p>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                + Registrar Primer Paciente (Alta Rápida)
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5">Paciente</th>
                      <th className="px-6 py-3.5">Edad / Modo</th>
                      <th className="px-6 py-3.5">Contacto</th>
                      <th className="px-6 py-3.5">Canal / Referido</th>
                      <th className="px-6 py-3.5">Contacto Emergencia</th>
                      <th className="px-6 py-3.5">Bioseguridad</th>
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
                            {p.age ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-900 text-xs">{p.age} años</span>
                                {Number(p.age) >= 50 && (
                                  <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Modo 50+ Senior
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">No especificada</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-800">{p.phone || 'Sin teléfono'}</p>
                            <p className="text-[11px] text-slate-500">{p.email || 'Sin correo'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {p.referral_source || 'Orgánico / Directo'}
                            </span>
                            {p.referred_by && (
                              <p className="text-[11px] text-amber-700 font-medium mt-1">
                                Ref: <strong>{p.referred_by}</strong>
                              </p>
                            )}
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
                        <div className="inline-flex items-center gap-1.5">
                          {/* Botón WhatsApp Directo Oficial (wa.me) */}
                          {p.phone && (
                            <a
                              href={`https://wa.me/521${p.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hola ${p.full_name}, te saluda la Dra. Aura Estudillo de Audenti Clinical. Me pongo en contacto contigo respecto a tu atención odontológica.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] shadow-xs transition-transform active:scale-95"
                              title={`Abrir WhatsApp directo con ${p.full_name}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              <span className="hidden xl:inline">WhatsApp</span>
                            </a>
                          )}

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
    </>
  )}

      {/* Modal Flotante de Alta Rápida de Pacientes */}
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
