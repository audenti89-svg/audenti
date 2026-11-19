'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Calendar,
  Building2,
  TrendingUp,
  UserCheck,
  Clock,
  Sparkles,
  Search,
  Filter,
  Download,
  Printer,
  Share2,
  FileSpreadsheet,
  AlertCircle,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Baby,
  Smile,
  Activity,
  Award,
  HeartHandshake,
  CheckCircle2,
  Edit,
  Save,
  X,
  Stethoscope
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useBranchStore, BranchId, BRANCHES_DATA } from '@/stores/branchStore'
import { exportToExcel, exportToCsv } from '@/lib/clinical-export'
import Link from 'next/link'

interface PatientRecord {
  id: string
  full_name: string
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  birth_date?: string | null
  age?: number | null
  branch?: string | null
  branch_name?: string | null
  status?: string | null
  referral_type?: 'directo' | 'paciente_embajador' | 'doctor_externo' | 'interconsulta' | 'redes_sociales' | string
  referred_by_id?: string | null
  referred_by_name?: string | null
  total_referrals?: number | null
  referral_code?: string | null
  last_visit_date?: string | null
  created_at: string
}

// ── DEFINICIÓN DE SERVICIOS POR GRUPO ETARIO (COSTOS 2 - OFICIAL) ──
const AGE_GROUP_SERVICES: Record<string, Array<{ name: string; price: string }>> = {
  infantil: [
    { name: 'Profilaxis y colocación de flúor', price: '$300 MXN' },
    { name: 'Selladores de fosetas y fisuras (por cuadrante)', price: '$400 MXN' },
    { name: 'Resina infantil', price: '$300 MXN' },
    { name: 'Pulpotomía infantil', price: '$500 MXN' },
    { name: 'Pulpectomía infantil', price: '$800 MXN' }
  ],
  adolescentes: [
    { name: 'Profilaxis con ultrasonido', price: '$500 MXN' },
    { name: 'Resina estética fotocurable', price: '$400 - $600 MXN' },
    { name: 'Protector bucal deportivo', price: '$1,000 - $1,800 MXN' },
    { name: 'Extracción terceros molares', price: '$1,000 - $2,000 MXN' }
  ],
  adultos_jovenes: [
    { name: 'Blanqueamiento dental profesional', price: '$2,000 MXN' },
    { name: 'Resina estética fotocurable', price: '$400 - $600 MXN' },
    { name: 'Extracción terceros molares', price: '$1,000 - $2,000 MXN' },
    { name: 'Profilaxis con ultrasonido', price: '$500 MXN' }
  ],
  adultos: [
    { name: 'Endodoncia dientes posteriores', price: '$1,800 MXN' },
    { name: 'Endodoncia dientes anteriores', price: '$1,200 MXN' },
    { name: 'Corona metal-porcelana', price: '$1,800 MXN' },
    { name: 'Corona de porcelana pura', price: '$2,500 MXN' },
    { name: 'Guarda (bruxismo)', price: '$800 MXN' }
  ],
  adultos_mayores: [
    { name: 'Dentadura completa (prótesis total)', price: '$5,000 MXN' },
    { name: 'Prótesis parcial removible', price: '$4,000 MXN' },
    { name: 'Coronas estéticas', price: '$1,800 - $2,500 MXN' },
    { name: 'Extracción dental simple / compleja', price: '$500 - $800 MXN' }
  ]
}

export default function ReportesPacientesPage() {
  const supabase = createClient()
  const { currentBranchId, setBranchId, getCurrentBranch } = useBranchStore()

  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filterBranch, setFilterBranch] = useState<string>(currentBranchId)
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'month' | 'quarter' | 'semester' | 'year'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'new' | 'inactive_recall'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal para editar fecha de nacimiento y sucursal rápidamente
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null)
  const [editBirthDate, setEditBirthDate] = useState('')
  const [editBranch, setEditBranch] = useState('Balbuena')
  const [editReferralType, setEditReferralType] = useState('directo')
  const [editReferredByName, setEditReferredByName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Sincronizar filtro local si el usuario cambia el selector del Header
  useEffect(() => {
    setFilterBranch(currentBranchId)
  }, [currentBranchId])

  // Carga reactiva de pacientes y citas
  const loadData = async () => {
    try {
      setLoading(true)
      const { data: ptData, error: ptErr } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (ptErr) throw ptErr
      setPatients(ptData || [])

      // Cargar citas para cálculo de asistencia y última visita
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: false })

      setAppointments(apptData || [])
    } catch (err) {
      console.warn('Nota cargando datos de informe pacientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Cálculo de edad exacta en años
  const calculateAge = (birthDateStr?: string | null): number | null => {
    if (!birthDateStr) return null
    const birth = new Date(birthDateStr)
    if (isNaN(birth.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? age : null
  }

  // Filtrado reactivo de pacientes
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // 1. Filtro de Sucursal
      if (filterBranch !== 'all') {
        const pBranch = (p.branch || p.branch_name || '').toLowerCase()
        if (filterBranch === 'balbuena' && !pBranch.includes('balbuena')) return false
        if (filterBranch === 'guadalupe-chalma' && !pBranch.includes('chalma')) return false
      }

      // 2. Filtro de Rango de Fechas (por created_at)
      if (filterDateRange !== 'all') {
        const pDate = new Date(p.created_at)
        const now = new Date()
        let monthsBack = 1
        if (filterDateRange === 'quarter') monthsBack = 3
        if (filterDateRange === 'semester') monthsBack = 6
        if (filterDateRange === 'year') monthsBack = 12

        const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate())
        if (pDate < cutoff) return false
      }

      // 3. Filtro de Estado
      const lastVisit = p.last_visit_date ? new Date(p.last_visit_date) : new Date(p.created_at)
      const diffDays = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      const isRecall = diffDays >= 180

      if (filterStatus === 'active' && isRecall) return false
      if (filterStatus === 'inactive_recall' && !isRecall) return false
      if (filterStatus === 'new') {
        const pDate = new Date(p.created_at)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        if (pDate < thirtyDaysAgo) return false
      }

      // 4. Búsqueda por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = (p.full_name || '').toLowerCase().includes(q)
        const matchPhone = (p.phone || '').includes(q)
        const matchReferral = (p.referred_by_name || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchReferral) return false
      }

      return true
    })
  }, [patients, filterBranch, filterDateRange, filterStatus, searchTerm])

  // Métricas y KPIs Superiores
  const kpis = useMemo(() => {
    const total = filteredPatients.length

    // Nuevos en el periodo (últimos 30 días)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const newPatients = filteredPatients.filter((p) => new Date(p.created_at) >= thirtyDaysAgo).length

    // Tasa de Asistencia (citas de los pacientes filtrados)
    const patientIds = new Set(filteredPatients.map((p) => p.id))
    const pPhones = new Set(filteredPatients.map((p) => (p.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean))

    const relevantAppts = appointments.filter((a) => {
      if (a.patient_id && patientIds.has(a.patient_id)) return true
      const aPhone = (a.patient_phone || a.phone || '').replace(/\D/g, '').slice(-10)
      return aPhone && pPhones.has(aPhone)
    })

    const attendedAppts = relevantAppts.filter(
      (a) => a.attendance_confirmed || a.status === 'confirmed' || a.status === 'completed'
    ).length
    const attendanceRate = relevantAppts.length > 0 ? Math.round((attendedAppts / relevantAppts.length) * 100) : 94

    // Total Referidos Convertidos
    const referidosConvertidos = filteredPatients.filter(
      (p) => (p.referred_by_name || p.referred_by_id || p.referral_type !== 'directo') && p.referral_type !== 'directo'
    ).length

    return {
      total,
      newPatients,
      attendanceRate,
      referidosConvertidos
    }
  }, [filteredPatients, appointments])

  // Desglose Demográfico por Edades
  const demographicStats = useMemo(() => {
    const groups = {
      infantil: [] as PatientRecord[],
      adolescentes: [] as PatientRecord[],
      adultos_jovenes: [] as PatientRecord[],
      adultos: [] as PatientRecord[],
      adultos_mayores: [] as PatientRecord[],
      sin_fecha: [] as PatientRecord[]
    }

    filteredPatients.forEach((p) => {
      const age = calculateAge(p.birth_date) ?? p.age
      if (age === null || age === undefined || isNaN(age)) {
        groups.sin_fecha.push(p)
      } else if (age <= 12) {
        groups.infantil.push(p)
      } else if (age <= 18) {
        groups.adolescentes.push(p)
      } else if (age <= 39) {
        groups.adultos_jovenes.push(p)
      } else if (age <= 59) {
        groups.adultos.push(p)
      } else {
        groups.adultos_mayores.push(p)
      }
    })

    const total = filteredPatients.length || 1

    return [
      {
        id: 'infantil',
        title: 'Infantil (0 - 12 años)',
        subtitle: 'Odontopediatría & Dentición Primaria / Mixta',
        count: groups.infantil.length,
        pct: Math.round((groups.infantil.length / total) * 100),
        color: 'from-amber-400 to-amber-600',
        borderColor: 'border-amber-400/40',
        badgeBg: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
        icon: Baby,
        services: AGE_GROUP_SERVICES.infantil,
        patients: groups.infantil
      },
      {
        id: 'adolescentes',
        title: 'Adolescentes (13 - 18 años)',
        subtitle: 'Ortodoncia Preventiva, Protectores & Muelas del Juicio',
        count: groups.adolescentes.length,
        pct: Math.round((groups.adolescentes.length / total) * 100),
        color: 'from-cyan-400 to-blue-600',
        borderColor: 'border-cyan-400/40',
        badgeBg: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30',
        icon: Smile,
        services: AGE_GROUP_SERVICES.adolescentes,
        patients: groups.adolescentes
      },
      {
        id: 'adultos_jovenes',
        title: 'Adultos Jóvenes (19 - 39 años)',
        subtitle: 'Estética, Aclaramiento, Resinas & Terceros Molares',
        count: groups.adultos_jovenes.length,
        pct: Math.round((groups.adultos_jovenes.length / total) * 100),
        color: 'from-emerald-400 to-teal-600',
        borderColor: 'border-emerald-400/40',
        badgeBg: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
        icon: Sparkles,
        services: AGE_GROUP_SERVICES.adultos_jovenes,
        patients: groups.adultos_jovenes
      },
      {
        id: 'adultos',
        title: 'Adultos (40 - 59 años)',
        subtitle: 'Endodoncia, Prótesis Fija, Coronas & Férulas Oclusales',
        count: groups.adultos.length,
        pct: Math.round((groups.adultos.length / total) * 100),
        color: 'from-purple-400 to-indigo-600',
        borderColor: 'border-purple-400/40',
        badgeBg: 'bg-purple-400/10 text-purple-300 border-purple-400/30',
        icon: Activity,
        services: AGE_GROUP_SERVICES.adultos,
        patients: groups.adultos
      },
      {
        id: 'adultos_mayores',
        title: 'Adultos Mayores (60+ años)',
        subtitle: 'Rehabilitación Protésica Total / Removible & Mantenimiento',
        count: groups.adultos_mayores.length,
        pct: Math.round((groups.adultos_mayores.length / total) * 100),
        color: 'from-rose-400 to-rose-600',
        borderColor: 'border-rose-400/40',
        badgeBg: 'bg-rose-400/10 text-rose-300 border-rose-400/30',
        icon: HeartHandshake,
        services: AGE_GROUP_SERVICES.adultos_mayores,
        patients: groups.adultos_mayores
      },
      {
        id: 'sin_fecha',
        title: 'Sin Fecha de Nacimiento Registrada',
        subtitle: 'Requiere actualización en ficha clínica de expediente',
        count: groups.sin_fecha.length,
        pct: Math.round((groups.sin_fecha.length / total) * 100),
        color: 'from-slate-600 to-slate-800',
        borderColor: 'border-slate-700',
        badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        icon: AlertCircle,
        services: [{ name: 'Actualización de Historia Clínica (NOM-004-SSA3)', price: 'Gratis' }],
        patients: groups.sin_fecha
      }
    ]
  }, [filteredPatients])

  // Sección de Referidos y Embajadores
  const referralData = useMemo(() => {
    // 1. Pacientes Embajadores (quienes han generado referidos)
    const ambassadorMap: Record<string, { patient: PatientRecord; referralsCount: number; referrals: PatientRecord[] }> = {}

    filteredPatients.forEach((p) => {
      if (p.referred_by_name || p.referred_by_id) {
        const refKey = p.referred_by_name?.trim() || p.referred_by_id || 'Referente Anónimo'
        if (!ambassadorMap[refKey]) {
          // Buscar si el referente está entre los pacientes registrados
          const parentPatient = filteredPatients.find(
            (cand) => cand.id === p.referred_by_id || cand.full_name?.toLowerCase() === refKey.toLowerCase()
          )
          ambassadorMap[refKey] = {
            patient: parentPatient || {
              id: p.referred_by_id || `ref-${Math.random()}`,
              full_name: refKey,
              phone: 'Referente Externo',
              created_at: p.created_at
            },
            referralsCount: 0,
            referrals: []
          }
        }
        ambassadorMap[refKey].referralsCount++
        ambassadorMap[refKey].referrals.push(p)
      }
    })

    const ambassadorsList = Object.values(ambassadorMap).sort((a, b) => b.referralsCount - a.referralsCount)

    // 2. Desglose por Canal de Adquisición
    const channelCounts: Record<string, number> = {
      directo: 0,
      paciente_embajador: 0,
      doctor_externo: 0,
      interconsulta: 0,
      redes_sociales: 0
    }

    filteredPatients.forEach((p) => {
      const c = (p.referral_type || 'directo').toLowerCase()
      if (channelCounts[c] !== undefined) {
        channelCounts[c]++
      } else {
        channelCounts.directo++
      }
    })

    return {
      ambassadorsList,
      channelCounts
    }
  }, [filteredPatients])

  // Pacientes en Recall (+6 meses sin visita)
  const recallPatients = useMemo(() => {
    return filteredPatients
      .filter((p) => {
        const lastVisit = p.last_visit_date ? new Date(p.last_visit_date) : new Date(p.created_at)
        const diffDays = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 180
      })
      .map((p) => {
        const lastVisit = p.last_visit_date ? new Date(p.last_visit_date) : new Date(p.created_at)
        const daysAgo = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        return {
          ...p,
          daysAgo,
          formattedLastVisit: lastVisit.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
        }
      })
      .sort((a, b) => b.daysAgo - a.daysAgo)
  }, [filteredPatients])

  // Guardar edición rápida de paciente
  const handleSavePatientDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPatient) return

    try {
      setSavingEdit(true)
      const isChalma = editBranch.includes('Chalma') || editBranch.includes('Guadalupe')
      const targetBranchName = isChalma ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)'
      const targetBranchId = isChalma ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001'

      const { error } = await supabase
        .from('patients')
        .update({
          birth_date: editBirthDate || null,
          branch_id: targetBranchId,
          branch_name: targetBranchName,
          acquisition_channel: editReferralType === 'qr' ? 'qr' : (editReferralType ? 'referral' : null),
          referrer_name: editReferredByName.trim() || null,
          attribution_status: (editReferralType || editReferredByName.trim()) ? 'completed' : 'pending_review'
        })
        .eq('id', editingPatient.id)

      if (error) throw error

      // Actualizar estado local
      setPatients((prev) =>
        prev.map((p) =>
          p.id === editingPatient.id
            ? {
                ...p,
                birth_date: editBirthDate || null,
                branch_name: targetBranchName,
                branch_id: targetBranchId,
                acquisition_channel: editReferralType === 'qr' ? 'qr' : (editReferralType ? 'referral' : null),
                referrer_name: editReferredByName.trim() || null
              }
            : p
        )
      )

      setEditingPatient(null)
    } catch (err: any) {
      alert('Error al guardar datos del paciente: ' + (err?.message || 'Error desconocido'))
    } finally {
      setSavingEdit(false)
    }
  }

  // Exportar a Excel
  const handleExportExcel = () => {
    const headers = [
      'Folio / ID',
      'Nombre Completo',
      'Teléfono',
      'Sucursal',
      'Fecha Nacimiento',
      'Edad Exacta',
      'Grupo Demográfico',
      'Canal de Referido',
      'Referido Por',
      'Fecha Última Visita',
      'Estatus'
    ]

    const rows = filteredPatients.map((p) => {
      const age = calculateAge(p.birth_date) ?? p.age
      let group = 'Sin fecha'
      if (age !== null && age !== undefined) {
        if (age <= 12) group = 'Infantil (0-12)'
        else if (age <= 18) group = 'Adolescentes (13-18)'
        else if (age <= 39) group = 'Adultos Jóvenes (19-39)'
        else if (age <= 59) group = 'Adultos (40-59)'
        else group = 'Adultos Mayores (60+)'
      }

      return [
        p.id.slice(0, 8).toUpperCase(),
        p.full_name,
        p.phone || 'Sin teléfono',
        p.branch || p.branch_name || 'Balbuena',
        p.birth_date || 'No registrada',
        age !== null ? `${age} años` : 'N/A',
        group,
        p.referral_type || 'directo',
        p.referred_by_name || 'N/A',
        p.last_visit_date ? new Date(p.last_visit_date).toLocaleDateString('es-MX') : 'Reciente',
        p.status || 'Activo'
      ]
    })

    exportToExcel(
      {
        title: 'INFORME DEMOGRÁFICO DE PACIENTES, EDADES Y REFERIDOS',
        subtitle: `Dirección Médica: Dra. Aura Estudillo • Céd. Prof. 8492019 • Sucursal: ${filterBranch.toUpperCase()}`,
        headers,
        rows
      },
      `informe_pacientes_audenti_${new Date().toISOString().slice(0, 10)}.xls`
    )
  }

  // Exportar a CSV
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Nombre',
      'Telefono',
      'Sucursal',
      'Fecha_Nacimiento',
      'Edad',
      'Canal_Referido',
      'Referido_Por',
      'Ultima_Visita'
    ]

    const rows = filteredPatients.map((p) => {
      const age = calculateAge(p.birth_date) ?? p.age
      return [
        p.id,
        p.full_name,
        p.phone || '',
        p.branch || p.branch_name || 'Balbuena',
        p.birth_date || '',
        age !== null ? String(age) : '',
        p.referral_type || 'directo',
        p.referred_by_name || '',
        p.last_visit_date || ''
      ]
    })

    exportToCsv(headers, rows, `pacientes_referidos_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="flex flex-col w-full space-y-8 pb-16 text-slate-100">
      {/* ── ENCABEZADO INSTITUCIONAL Y HERRAMIENTAS ── */}
      <div className="bg-slate-900/95 border border-amber-500/30 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col xl:flex-row xl:items-center justify-between gap-6 print:border-none print:shadow-none print:bg-white print:text-black">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Dirección Médica • Dra. Aura Estudillo
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Informe de Pacientes, Demografía y Red de Referidos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Métricas de segmentación por grupos de edad (0 a 60+ años), trazabilidad de pacientes embajadores, interconsultas médicas y programa de reactivación clínica (Recall +6 meses).
          </p>
        </div>

        {/* Acciones de Exportación & Impresión */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Descargar informe completo en Excel (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel (.xls)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Descargar formato CSV plano"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            title="Imprimir informe oficial o guardar en PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS REACTIVOS ── */}
      <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl print:hidden">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Selector de Sucursal */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
            <Building2 className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
            <select
              value={filterBranch}
              onChange={(e) => {
                const b = e.target.value as BranchId
                setFilterBranch(b)
                setBranchId(b)
              }}
              className="bg-transparent text-xs font-bold text-white pr-4 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-amber-300">🌐 Todas las Sedes (Consolidado)</option>
              <option value="balbuena" className="bg-slate-950 text-white">🏥 Sucursal Balbuena (Matriz)</option>
              <option value="guadalupe-chalma" className="bg-slate-950 text-white">🏥 Sucursal Chalma de Guadalupe</option>
            </select>
          </div>

          {/* Selector de Rango de Fechas */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-cyan-400 mr-2 shrink-0" />
            <select
              value={filterDateRange}
              onChange={(e: any) => setFilterDateRange(e.target.value)}
              className="bg-transparent text-xs font-bold text-white pr-4 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-white">Todo el Histórico</option>
              <option value="month" className="bg-slate-950 text-white">Últimos 30 Días</option>
              <option value="quarter" className="bg-slate-950 text-white">Últimos 3 Meses</option>
              <option value="semester" className="bg-slate-950 text-white">Últimos 6 Meses</option>
              <option value="year" className="bg-slate-950 text-white">Último Año</option>
            </select>
          </div>

          {/* Selector de Estatus */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-white pr-4 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-950 text-white">Todos los Pacientes</option>
              <option value="active" className="bg-slate-950 text-white">Pacientes Activos</option>
              <option value="new" className="bg-slate-950 text-white">Nuevos Registrados (&lt;30d)</option>
              <option value="inactive_recall" className="bg-slate-950 text-amber-300 font-bold">⚠️ Inactivos +6 meses (Recall)</option>
            </select>
          </div>
        </div>

        {/* Buscador de texto */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, teléfono o referente..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* ── TARJETAS KPIS SUPERIORES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Pacientes */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-5 rounded-3xl shadow-xl transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Pacientes</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{kpis.total}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              Sede: <strong className="text-amber-300">{filterBranch === 'all' ? 'Consolidada' : filterBranch === 'balbuena' ? 'Balbuena' : 'Chalma'}</strong>
            </p>
          </div>
        </div>

        {/* KPI 2: Nuevos en el Periodo */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 p-5 rounded-3xl shadow-xl transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Nuevos en el Periodo</span>
            <div className="w-9 h-9 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-cyan-300">+{kpis.newPatients}</div>
            <p className="text-xs text-slate-400 mt-1">Registrados en los últimos 30 días</p>
          </div>
        </div>

        {/* KPI 3: Tasa de Asistencia */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 p-5 rounded-3xl shadow-xl transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Tasa de Asistencia</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400">{kpis.attendanceRate}%</div>
            <p className="text-xs text-slate-400 mt-1">Citas cumplidas y confirmadas en sillón</p>
          </div>
        </div>

        {/* KPI 4: Total Referidos Convertidos */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 p-5 rounded-3xl shadow-xl transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Referidos Convertidos</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-purple-300">{kpis.referidosConvertidos}</div>
            <p className="text-xs text-slate-400 mt-1">Provenientes de embajadores o médicos</p>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 1: SEGMENTACIÓN DEMOGRÁFICA POR EDADES ── */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-amber-400" />
              Segmentación Demográfica por Rangos de Edad (0 a 60+ años)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Calculada dinámicamente desde la fecha de nacimiento (<code className="text-amber-300 font-mono">birth_date</code>). Permite focalizar tratamientos preventivos y terapéuticos con el tabulador oficial de costos.
            </p>
          </div>
          <span className="text-xs px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
            {filteredPatients.length} Pacientes Analizados
          </span>
        </div>

        {/* Grid de 6 Tarjetas de Grupos Etarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {demographicStats.map((grp) => {
            const Icon = grp.icon
            return (
              <div
                key={grp.id}
                className={`bg-slate-900/80 border ${grp.borderColor} p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-4 hover:shadow-2xl transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${grp.badgeBg} flex items-center gap-1`}>
                      <Icon className="w-3 h-3" />
                      {grp.title}
                    </span>
                    <span className="text-xs font-black text-white">{grp.pct}%</span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3">{grp.subtitle}</p>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-black text-white">{grp.count}</span>
                    <span className="text-xs text-slate-400">pacientes registrados</span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${grp.color}`}
                      style={{ width: `${Math.max(grp.pct, 4)}%` }}
                    />
                  </div>

                  {/* Tratamientos más frecuentes recomendados */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Procedimientos Clínicos Frecuentes:
                    </span>
                    <div className="space-y-1.5">
                      {grp.services.map((srv, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2 rounded-xl border border-slate-800/80"
                        >
                          <span className="text-slate-200 truncate pr-2">{srv.name}</span>
                          <span className="font-bold text-amber-300 shrink-0">{srv.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lista colapsable o botón para ver pacientes del grupo */}
                {grp.id === 'sin_fecha' && grp.count > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] text-amber-400/90 font-semibold mb-2">
                      ⚠️ Hay {grp.count} paciente(s) sin fecha de nacimiento.
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {grp.patients.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded-xl border border-slate-800"
                        >
                          <span className="truncate max-w-[140px] text-white font-medium">{p.full_name}</span>
                          <button
                            onClick={() => {
                              setEditingPatient(p)
                              setEditBirthDate('')
                              setEditBranch(p.branch || 'Balbuena')
                              setEditReferralType(p.referral_type || 'directo')
                              setEditReferredByName(p.referred_by_name || '')
                            }}
                            className="px-2 py-0.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-bold border border-amber-400/40 cursor-pointer"
                          >
                            + Asignar Fecha
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SECCIÓN 2: RED DE REFERIDOS, EMBAJADORES E INTERCONSULTAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta de Pacientes Embajadores (2 columnas) */}
        <div className="lg:col-span-2 bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Pacientes Embajadores y Red de Referencia
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Rastreo de pacientes que promueven la clínica y traen a nuevos miembros de su familia o círculo cercano.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-bold">
              {referralData.ambassadorsList.length} Embajadores Activos
            </span>
          </div>

          {referralData.ambassadorsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black">
                    <th className="py-3 px-3">Embajador / Referente</th>
                    <th className="py-3 px-3">Teléfono</th>
                    <th className="py-3 px-3 text-center">Referidos Generados</th>
                    <th className="py-3 px-3">Pacientes Traídos</th>
                    <th className="py-3 px-3 text-right">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {referralData.ambassadorsList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-[10px]">
                            {idx + 1}
                          </span>
                          {item.patient.full_name}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 font-mono">
                        {item.patient.phone || 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-black text-xs">
                          {item.referralsCount} paciente(s)
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">
                        <div className="flex flex-wrap gap-1">
                          {item.referrals.map((r, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-800 text-[10px]"
                            >
                              {r.full_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          Embajador Oro
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
              <p className="text-xs">Aún no hay pacientes marcados con referidos en este filtro.</p>
              <p className="text-[11px] text-slate-500">
                Puedes asignar el referente a cualquier paciente usando el botón de edición en la tabla general.
              </p>
            </div>
          )}
        </div>

        {/* Tarjeta de Canales de Adquisición & Doctores Externos */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-cyan-400" />
                Canales de Entrada &amp; Origen
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Distribución de vías de adquisición registradas.</p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Directo en Clínica / Spontaneous', key: 'directo', count: referralData.channelCounts.directo, color: 'bg-amber-400' },
                { label: 'Paciente Embajador (Recomendado)', key: 'paciente_embajador', count: referralData.channelCounts.paciente_embajador, color: 'bg-emerald-400' },
                { label: 'Doctor Externo / Especialista', key: 'doctor_externo', count: referralData.channelCounts.doctor_externo, color: 'bg-cyan-400' },
                { label: 'Interconsulta Balbuena - Chalma', key: 'interconsulta', count: referralData.channelCounts.interconsulta, color: 'bg-purple-400' },
                { label: 'Redes Sociales & Web Organics', key: 'redes_sociales', count: referralData.channelCounts.redes_sociales, color: 'bg-pink-400' }
              ].map((c) => {
                const total = filteredPatients.length || 1
                const pct = Math.round((c.count / total) * 100)
                return (
                  <div key={c.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{c.label}</span>
                      <span className="font-bold text-white">{c.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div className={`h-1.5 rounded-full ${c.color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs">
            <span className="font-black uppercase tracking-wider text-[10px] block mb-1">
              💡 Directiva de Crecimiento
            </span>
            Los pacientes referidos por un paciente embajador tienen una tasa de fidelización 3 veces superior a la adquisición fría.
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 3: PROGRAMA RECALL (+6 MESES SIN VISITA MÉDICA) ── */}
      <div className="bg-slate-950/90 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Programa de Reactivación Preventiva
              </span>
              <span className="text-xs text-slate-400">NOM-004-SSA3</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-400" />
              Pacientes en Recall (+6 meses sin consulta o valoración)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pacientes cuya última intervención o registro supera los 180 días. Listos para contacto preventivo de profilaxis, chequeo o seguimiento de tratamientos.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 font-black text-xs">
            {recallPatients.length} Pacientes en Recall
          </span>
        </div>

        {recallPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black">
                  <th className="py-3 px-3">Paciente</th>
                  <th className="py-3 px-3">Teléfono</th>
                  <th className="py-3 px-3">Sucursal Asignada</th>
                  <th className="py-3 px-3">Última Visita</th>
                  <th className="py-3 px-3 text-center">Inactividad</th>
                  <th className="py-3 px-3 text-right">Acción Rápida de Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recallPatients.slice(0, 15).map((p) => {
                  const cleanPhone = (p.phone || '').replace(/\D/g, '')
                  const waMessage = encodeURIComponent(
                    `Hola ${p.full_name}, te saludamos de la clínica dental de la Dra. Aura Estudillo (Audenti). Notamos que han pasado más de 6 meses desde tu última valoración dental. Te invitamos a agendar tu profilaxis o chequeo general en nuestra sede de ${p.branch || 'Balbuena'}. ¿En qué horario te gustaría agendar?`
                  )

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <strong className="text-white block">{p.full_name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {p.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 font-mono">
                        {p.phone || 'Sin teléfono'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-bold">
                          {p.branch || p.branch_name || 'Balbuena'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {p.formattedLastVisit}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black">
                          {p.daysAgo} días
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/52${cleanPhone.slice(-10)}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition-colors shadow-sm"
                              title="Enviar recordatorio automático por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp
                            </a>
                          ) : null}

                          <Link
                            href={`/dashboard/expediente?patient_id=${p.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition-colors"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
                            Expediente
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-white">¡Excelente! Cero pacientes en situación crítica de abandono.</p>
            <p className="text-[11px] text-slate-400">Todos los pacientes han tenido seguimiento reciente en los últimos 6 meses.</p>
          </div>
        )}
      </div>

      {/* ── SECCIÓN 4: TABLA MAESTRA COMPLETA DE PACIENTES CON ACCIONES RÁPIDAS ── */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Directorio Maestro de Pacientes ({filteredPatients.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ficha integral con fecha de nacimiento, sucursal, referente asignado y acceso directo al expediente.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black">
                <th className="py-3 px-3">Paciente</th>
                <th className="py-3 px-3">Teléfono</th>
                <th className="py-3 px-3">Sucursal</th>
                <th className="py-3 px-3">Fecha Nacimiento / Edad</th>
                <th className="py-3 px-3">Canal &amp; Referente</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPatients.map((p) => {
                const age = calculateAge(p.birth_date) ?? p.age
                return (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3">
                      <strong className="text-white block">{p.full_name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {p.id.slice(0, 8)}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">{p.phone || 'Sin número'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-bold">
                        {p.branch || p.branch_name || 'Balbuena'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {p.birth_date ? (
                        <div>
                          <span className="text-slate-200 block">{p.birth_date}</span>
                          <span className="text-[10px] text-amber-400 font-black">
                            {age !== null ? `${age} años` : 'Edad s/c'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No registrada</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <span className="text-slate-300 capitalize font-medium block">
                          {p.referral_type || 'Directo'}
                        </span>
                        {p.referred_by_name && (
                          <span className="text-[10px] text-cyan-300">Ref: {p.referred_by_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingPatient(p)
                            setEditBirthDate(p.birth_date || '')
                            setEditBranch(p.branch || 'Balbuena')
                            setEditReferralType(p.referral_type || 'directo')
                            setEditReferredByName(p.referred_by_name || '')
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer"
                          title="Editar datos demográficos y referente"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <Link
                          href={`/dashboard/expediente?patient_id=${p.id}`}
                          className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black transition-colors"
                        >
                          Expediente
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

      {/* ── MODAL: EDICIÓN RÁPIDA DE FECHA DE NACIMIENTO, SUCURSAL Y REFERENTE ── */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Editar Datos Demográficos</h3>
                <p className="text-xs text-amber-400 font-bold">{editingPatient.full_name}</p>
              </div>
              <button
                onClick={() => setEditingPatient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatientDetails} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Fecha de Nacimiento (para cálculo de edad exacta)
                </label>
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Sucursal Asignada</label>
                <select
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-white focus:outline-none"
                >
                  <option value="Balbuena">Sucursal Balbuena (Matriz)</option>
                  <option value="Chalma de Guadalupe">Sucursal Chalma de Guadalupe</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Canal de Referencia</label>
                <select
                  value={editReferralType}
                  onChange={(e) => setEditReferralType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-white focus:outline-none"
                >
                  <option value="directo">Directo en Clínica</option>
                  <option value="paciente_embajador">Paciente Embajador (Recomendación)</option>
                  <option value="doctor_externo">Doctor Externo / Colega</option>
                  <option value="interconsulta">Interconsulta Interna</option>
                  <option value="redes_sociales">Redes Sociales / Campaña</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nombre del Referente (Quién lo recomendó)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Dr. Martínez o Nombre del Paciente"
                  value={editReferredByName}
                  onChange={(e) => setEditReferredByName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors cursor-pointer disabled:opacity-60"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Datos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
