'use client'

import { useState } from 'react'
import { Users, QrCode, ChevronDown } from 'lucide-react'

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────
interface ReferrerInputProps {
  referrerCode: string
  referrerName: string
  onCodeChange: (code: string) => void
  onNameChange: (name: string) => void
}

// ────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────
export function ReferrerInput({
  referrerCode,
  referrerName,
  onCodeChange,
  onNameChange,
}: ReferrerInputProps) {
  const [mode, setMode] = useState<'code' | 'name'>('code')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          ¿Quién te recomendó? <span className="text-slate-400 normal-case font-normal">(opcional)</span>
        </label>
        {/* Selector de modo */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mode === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <QrCode className="w-3 h-3 inline mr-1" />
            Código AUD
          </button>
          <button
            type="button"
            onClick={() => setMode('name')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mode === 'name' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            Nombre
          </button>
        </div>
      </div>

      {mode === 'code' ? (
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
      ) : (
        <input
          type="text"
          value={referrerName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Nombre completo de quien te recomendó"
          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-slate-300"
        />
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Si tienes el código único (ej. <code className="bg-amber-50 text-amber-800 px-1 rounded font-mono">AUD-ABC12345</code>) de
        quien te refirió, úsalo para que ambos acumulen beneficios.
      </p>
    </div>
  )
}
