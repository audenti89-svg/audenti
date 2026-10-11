'use client'

import {
  Building2,
  Search,
  ShieldCheck,
  Bell,
  HelpCircle,
  User,
  ChevronDown,
  Sparkles,
  MapPin,
  Menu
} from 'lucide-react'
import { useBranchStore, BranchId, BRANCHES_DATA } from '@/stores/branchStore'
import { useNotificationSound } from '@/hooks/useNotificationSound'

export interface HeaderProps {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { currentBranchId, setBranchId, getCurrentBranch } = useBranchStore()
  const currentBranch = getCurrentBranch()
  const { playTone } = useNotificationSound()

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value as BranchId
    setBranchId(newId)
    playTone('arrival')
  }

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-20 bg-white/85 backdrop-blur-md border-b border-slate-200/80 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-xs">
      {/* Botón hamburguesa en móvil + Selector de Sucursal Reactivo */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Abrir Menú Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative flex items-center bg-slate-50 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 hover:border-amber-400 transition-colors shadow-2xs max-w-[200px] sm:max-w-none">
          <Building2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
          <select
            value={currentBranchId}
            onChange={handleBranchChange}
            className="bg-transparent text-xs font-bold text-slate-900 pr-7 appearance-none focus:outline-none cursor-pointer"
          >
            <option value="balbuena">Sucursal Balbuena (Matriz) — Dra. Aura Estudillo</option>
            <option value="guadalupe-chalma">Sucursal Guadalupe Chalma — Dr. Ramírez López</option>
            <option value="colonia-roma">Próximamente: Sucursal Colonia Roma</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-slate-400" />
        </div>

        {/* Badge Dinámico de Estado de la Sucursal */}
        <div className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
          currentBranch.isUpcoming
            ? 'bg-purple-50 text-purple-900 border-purple-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            currentBranch.isUpcoming ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
          }`} />
          <span className="text-[11px] font-bold">{currentBranch.statusBadge}</span>
        </div>
      </div>

      {/* Buscador global (Oculto en móvil pequeño) */}
      <div className="hidden md:block flex-1 max-w-lg mx-4 lg:mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={`Buscar en ${currentBranch.name}... (⌘K)`}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 text-slate-900 text-xs border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Controles de Perfil y Notificaciones */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <div className="hidden sm:flex relative items-center bg-slate-100/70 px-2.5 py-1.5 rounded-xl border border-slate-200/50">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600 mr-1.5 shrink-0" />
          <select className="bg-transparent text-[11px] font-bold text-slate-700 pr-4 appearance-none focus:outline-none cursor-pointer">
            <option>Rol: Director Médico</option>
            <option>Rol: Especialista</option>
            <option>Rol: Recepción / Caja</option>
            <option>Rol: Asistente Dental</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1 pointer-events-none text-slate-400" />
        </div>

        <button
          type="button"
          onClick={() => playTone('message')}
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          title="Notificaciones de sucursal"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <button
          type="button"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  )
}
