'use client'

import { useState } from 'react'
import {
  Calendar,
  UserPlus,
  FolderOpen,
  Receipt,
  BarChart3,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function QuickActions() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchExpediente = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/pacientes?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/dashboard/expediente')
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">

        {/* Acción 1: Ver Agenda */}
        <Link
          href="/dashboard/agenda"
          className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-900">Ver Agenda</span>
            <span className="block text-[11px] text-slate-500 truncate">Semana &amp; horarios</span>
          </div>
        </Link>

        {/* Acción 2: + Registrar Paciente */}
        <Link
          href="/onboarding"
          className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-sm transition-all text-left border border-amber-300"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-900/10 flex items-center justify-center text-slate-950">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold leading-tight">+ Registrar Paciente</span>
            <span className="block text-[11px] text-slate-800/80 truncate">Alta clínica rápida</span>
          </div>
        </Link>

        {/* Acción 3: Abrir Expediente con búsqueda directa */}
        <form
          onSubmit={handleSearchExpediente}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 focus-within:ring-2 focus-within:ring-amber-400 focus-within:bg-white transition-all"
        >
          <FolderOpen className="w-5 h-5 text-slate-500 shrink-0 ml-1" />
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Abrir Expediente</label>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Folio o nombre..."
              className="w-full bg-transparent text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <button type="submit" className="p-1 text-slate-400 hover:text-slate-700">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Acción 4: Cobro / Gasto */}
        <Link
          href="/dashboard/finanzas"
          className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-900">Cobro / Gasto</span>
            <span className="block text-[11px] text-slate-500 truncate">Caja &amp; tesorería</span>
          </div>
        </Link>

        {/* Acción 5: Seguimiento y Reportes */}
        <Link
          href="/dashboard/reportes"
          className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-900">Seguimiento</span>
            <span className="block text-[11px] text-slate-500 truncate">Reportes del mes</span>
          </div>
        </Link>
      </div>
    </section>
  )
}
