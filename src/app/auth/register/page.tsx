'use client'

import React from 'react'
import Link from 'next/link'
import { Lock, ShieldAlert, ArrowRight, Building2, UserCheck, Stethoscope } from 'lucide-react'

export default function RegisterDisabledPage() {
  return (
    <div className="w-full max-w-lg mx-auto bg-slate-950/95 border-2 border-amber-500/40 p-8 sm:p-10 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.15)] text-center text-white backdrop-blur-2xl space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border-2 border-amber-400/60 mx-auto flex items-center justify-center text-amber-300 shadow-xl shadow-amber-500/20">
        <Lock className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-400 border border-amber-400/30">
          <ShieldAlert className="w-3.5 h-3.5" />
          Directiva de Seguridad NOM-004-SSA3
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Registro Público Deshabilitado
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
          Por disposición de seguridad clínica y protección de datos médicos, el registro público en línea para pacientes se encuentra temporalmente suspendido.
        </p>
      </div>

      {/* INFORMACIÓN INSTITUCIONAL DE SUCURSALES ACTIVAS */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
          Apertura de Expedientes y Valoración Presencial:
        </span>
        <p className="text-xs text-slate-300 leading-relaxed">
          Nuevos expedientes son creados de forma personalizada por el equipo clínico en recepción durante la primera valoración odontológica en cualquiera de nuestras sedes:
        </p>
        
        <div className="space-y-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-slate-200">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>Sucursal Balbuena (Matriz):</strong> Av. del Taller & Retorno 12, CDMX</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span><strong>Sucursal Chalma de Guadalupe:</strong> Av. Guadalupe Victoria 45, CDMX</span>
          </div>
        </div>
      </div>

      {/* ACCESO EXCLUSIVO PERSONAL CLÍNICO */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
          <Stethoscope className="w-4 h-4 shrink-0" />
          <span>¿Eres Doctor, Socio, Pasante o Administrador?</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          Si ya cuentas con usuario creado por la Dirección Médica (Dra. Aura Estudillo), inicia sesión con tus credenciales institucionales o Google OAuth.
        </p>
        <div className="pt-2">
          <Link
            href="/auth/login"
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <span>Iniciar Sesión en Portal Médico</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <Link href="/" className="hover:text-amber-400 transition-colors font-medium">
          ← Volver al Portal Principal
        </Link>
        <span className="font-semibold text-slate-500">Dra. Aura Estudillo • Céd. Prof. 8492019</span>
      </div>
    </div>
  )
}
