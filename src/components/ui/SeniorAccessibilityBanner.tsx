'use client'

import React from 'react'
import Link from 'next/link'
import { Calendar, Eye, Phone, CheckCircle2, ChevronRight, X } from 'lucide-react'
import { useAccessibility } from '@/context/AccessibilityContext'

export function SeniorAccessibilityBanner() {
  const { isSeniorMode, toggleSeniorMode } = useAccessibility()

  if (!isSeniorMode) {
    return (
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={toggleSeniorMode}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-amber-300 text-xs font-bold shadow-xl border border-amber-400/40 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          title="Activar vista simplificada con letras grandes y contraste alto"
        >
          <Eye className="w-4 h-4 text-amber-400" />
          <span>Vista Accesible (Letra Grande)</span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-5 bg-amber-400 text-slate-950 shadow-2xl border-t-4 border-slate-950 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center md:text-left">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            <Eye className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight text-slate-950 uppercase">
                Modo Accesibilidad Activo
              </span>
              <span className="bg-slate-950 text-amber-300 text-[11px] font-extrabold px-2 py-0.5 rounded-md">
                50+ Años
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              Botones gigantes y acceso telefónico prioritario con la Dra. Aura Estudillo.
            </p>
          </div>
        </div>

        {/* 3 Botones Gigantes Claros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
          <Link
            href="/dashboard/agenda"
            className="min-h-[56px] px-6 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <Calendar className="w-5 h-5 text-amber-400" />
            <span>Reservar Cita</span>
          </Link>

          <Link
            href="/dashboard/pacientes"
            className="min-h-[56px] px-6 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 border-2 border-slate-950 shadow-lg transition active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Ver Mis Citas</span>
          </Link>

          <a
            href="tel:5512345678"
            className="min-h-[56px] px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <Phone className="w-5 h-5 text-white animate-pulse" />
            <span>Contactar por Teléfono</span>
          </a>
        </div>

        {/* Botón para alternar / cerrar */}
        <button
          onClick={toggleSeniorMode}
          className="p-2 text-slate-900 hover:bg-amber-500/50 rounded-xl transition font-bold text-xs flex items-center gap-1 shrink-0"
          title="Desactivar modo accesible"
        >
          <X className="w-5 h-5" />
          <span className="hidden lg:inline text-xs">Cerrar modo</span>
        </button>
      </div>
    </div>
  )
}
