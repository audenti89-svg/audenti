'use client'

import { useState, useEffect } from 'react'

// Canal options con íconos SVG
const CHANNEL_OPTIONS = [
  {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Vi un video en TikTok',
    color: 'border-slate-800 bg-slate-900 text-white',
    selectedRing: 'ring-slate-800',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.2 8.2 0 004.79 1.53V6.84a4.85 4.85 0 01-1.02-.15z"/>
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Vi una publicación o Reel',
    color: 'border-pink-500 bg-gradient-to-br from-pink-500 to-purple-600 text-white',
    selectedRing: 'ring-pink-500',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Vi un video o anuncio',
    color: 'border-red-600 bg-red-600 text-white',
    selectedRing: 'ring-red-500',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Vi una publicación o anuncio',
    color: 'border-blue-600 bg-blue-600 text-white',
    selectedRing: 'ring-blue-500',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'referral',
    label: 'Me recomendaron',
    description: 'Un amigo o familiar me refirió',
    color: 'border-amber-400 bg-amber-400 text-slate-950',
    selectedRing: 'ring-amber-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
  },
  {
    id: 'qr',
    label: 'Código QR',
    description: 'Escaneé un código QR',
    color: 'border-emerald-500 bg-emerald-500 text-white',
    selectedRing: 'ring-emerald-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x={3} y={3} width={7} height={7} rx={1}/>
        <rect x={14} y={3} width={7} height={7} rx={1}/>
        <rect x={3} y={14} width={7} height={7} rx={1}/>
        <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 17h0M17 14h0"/>
      </svg>
    ),
  },
  {
    id: 'directo',
    label: 'Pasé por aquí',
    description: 'Vi la clínica directamente',
    color: 'border-slate-300 bg-slate-100 text-slate-800',
    selectedRing: 'ring-slate-400',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'otro',
    label: 'Otro medio',
    description: 'Por un medio diferente',
    color: 'border-slate-200 bg-white text-slate-600',
    selectedRing: 'ring-slate-300',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx={12} cy={12} r={10}/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
        <line x1={12} y1={17} x2={12.01} y2={17}/>
      </svg>
    ),
  },
]

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────
interface AcquisitionChannelSelectorProps {
  value: string
  onChange: (channel: string) => void
  label?: string
}

// ────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────
export function AcquisitionChannelSelector({
  value,
  onChange,
  label = '¿Cómo nos conociste?',
}: AcquisitionChannelSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CHANNEL_OPTIONS.map(ch => {
          const selected = value === ch.id
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onChange(ch.id)}
              className={`
                relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center
                transition-all duration-150 cursor-pointer
                ${selected
                  ? `${ch.color} ${ch.selectedRing} ring-2 ring-offset-1 shadow-md scale-105`
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
              aria-pressed={selected}
              title={ch.description}
            >
              {ch.icon}
              <span className="text-[11px] font-bold leading-tight">{ch.label}</span>
              {selected && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
      {value && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <span className="text-emerald-600">✓</span>
          {CHANNEL_OPTIONS.find(c => c.id === value)?.description}
        </p>
      )}
    </div>
  )
}
