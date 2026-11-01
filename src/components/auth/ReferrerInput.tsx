'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, QrCode, Search, UserCheck, Heart, Sparkles, X, Check } from 'lucide-react'

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────
interface ReferrerOption {
  id: string
  full_name: string
  referral_code: string
  branch_name: string
  total_referrals: number
}

interface ReferrerInputProps {
  referrerCode: string
  referrerName: string
  referrerId?: string
  relationshipType?: string
  onCodeChange: (code: string) => void
  onNameChange: (name: string) => void
  onIdChange?: (id: string) => void
  onRelationshipChange?: (rel: string) => void
}

const RELATIONSHIPS = [
  { id: 'otro', label: 'Recomendación / Amigo' },
  { id: 'conyuge', label: 'Cónyuge / Pareja' },
  { id: 'hijo', label: 'Hijo / Hija' },
  { id: 'madre', label: 'Madre' },
  { id: 'padre', label: 'Padre' },
  { id: 'hermano', label: 'Hermano / Hermana' },
  { id: 'primo', label: 'Primo / Prima' },
  { id: 'abuelo', label: 'Abuelo / Abuela' },
]

// ────────────────────────────────────────────────────────────
// Componente con Autocompletado y Red Familiar
// ────────────────────────────────────────────────────────────
export function ReferrerInput({
  referrerCode,
  referrerName,
  referrerId = '',
  relationshipType = 'otro',
  onCodeChange,
  onNameChange,
  onIdChange,
  onRelationshipChange,
}: ReferrerInputProps) {
  const [mode, setMode] = useState<'code' | 'name'>('name')
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<ReferrerOption[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<ReferrerOption | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar en la lista de pacientes existentes con debounce
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoadingSearch(true)
      try {
        const res = await fetch(`/api/attribution/search-referrers?q=${encodeURIComponent(searchTerm.trim())}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.referrers)) {
            setSuggestions(json.referrers)
            setShowDropdown(true)
          }
        }
      } catch (err) {
        console.warn('Error en búsqueda de referidores:', err)
      } finally {
        setLoadingSearch(false)
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Seleccionar paciente del autocompletado
  const handleSelectPatient = (p: ReferrerOption) => {
    setSelectedPatient(p)
    onNameChange(p.full_name)
    onCodeChange(p.referral_code)
    if (onIdChange) onIdChange(p.id)
    setShowDropdown(false)
    setSearchTerm(p.full_name)
  }

  // Limpiar selección
  const handleClearSelection = () => {
    setSelectedPatient(null)
    onNameChange('')
    onCodeChange('')
    if (onIdChange) onIdChange('')
    setSearchTerm('')
    setShowDropdown(false)
  }

  return (
    <div className="space-y-3" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-600" />
          ¿Quién te recomendó? <span className="text-slate-400 normal-case font-normal">(Opcional)</span>
        </label>
        
        {/* Selector de modo de captura */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onClick={() => { setMode('name'); setShowDropdown(false); }}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mode === 'name' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Search className="w-3 h-3 inline mr-1" />
            Buscar Paciente
          </button>
          <button
            type="button"
            onClick={() => { setMode('code'); setShowDropdown(false); }}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mode === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <QrCode className="w-3 h-3 inline mr-1" />
            Código AUD
          </button>
        </div>
      </div>

      {/* Si ya hay un paciente seleccionado con autocompletado */}
      {selectedPatient ? (
        <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{selectedPatient.full_name}</p>
              <div className="flex items-center gap-2 text-[10px] text-amber-900">
                <span className="font-mono font-bold bg-white/70 px-1.5 py-0.2 rounded border border-amber-200">
                  {selectedPatient.referral_code}
                </span>
                <span className="truncate">• {selectedPatient.branch_name}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-1 rounded-lg hover:bg-amber-200/50 text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            title="Quitar referidor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : mode === 'name' ? (
        /* Modo 1: Autocompletado de pacientes existentes */
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                onNameChange(e.target.value)
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true)
              }}
              placeholder="Escribe el nombre o apellido de quien te invitó..."
              className="w-full pl-9 pr-9 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-slate-300"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            {loadingSearch && (
              <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin absolute right-3 top-4" />
            )}
          </div>

          {/* Menú de sugerencias en tiempo real */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto z-50 py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                Pacientes Registrados en Audenti
              </div>
              {suggestions.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className="p-2.5 hover:bg-amber-50/70 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{p.full_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Código: <strong className="text-amber-800">{p.referral_code}</strong> • {p.branch_name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Vincular
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Modo 2: Código Directo AUD-XXXX */
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <span className="font-mono font-bold text-xs text-amber-700">AUD-</span>
          </span>
          <input
            type="text"
            value={referrerCode.replace(/^AUD-/i, '')}
            onChange={e => onCodeChange(e.target.value ? `AUD-${e.target.value.toUpperCase()}` : '')}
            placeholder="XXXX1234"
            maxLength={12}
            className="w-full pl-12 pr-4 py-3 text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-slate-300"
          />
          {referrerCode && (
            <span className="absolute inset-y-0 right-3 flex items-center text-emerald-500 text-xs font-bold">
              ✓
            </span>
          )}
        </div>
      )}

      {/* Selector de Parentesco / Vínculo Familiar si hay referidor */}
      {(selectedPatient || referrerName.trim() || referrerCode.trim()) && onRelationshipChange && (
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            Vínculo o Parentesco Familiar
          </label>
          <select
            value={relationshipType}
            onChange={e => onRelationshipChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer text-slate-800 font-medium"
          >
            {RELATIONSHIPS.map(rel => (
              <option key={rel.id} value={rel.id}>{rel.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400">
            Se registrará en el árbol familiar de la clínica para agrupar beneficios y citas conjuntas.
          </p>
        </div>
      )}

      {/* Nota de Atribución Pendiente si no se especifica */}
      {!selectedPatient && !referrerName.trim() && !referrerCode.trim() && (
        <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          💡 <strong className="text-slate-600">¿No tienes el código o quién te invitó?</strong> Puedes dejar este campo vacío. Tu expediente se registrará con estado <span className="font-semibold text-amber-700">"Atribución Pendiente"</span> y en recepción validaremos tu origen al asistir a tu cita vespertina (4:00 PM a 9:00 PM o domingos).
        </p>
      )}
    </div>
  )
}
