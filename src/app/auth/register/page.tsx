'use client';

import React from 'react';
import Link from 'next/link';
import {
  Lock,
  ShieldAlert,
  ArrowRight,
  Building2,
  UserCheck,
  Stethoscope,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { AudentiLogo } from '@/components/ui/AudentiLogo';

export default function RegisterHubPage() {
  return (
    <div className="w-full max-w-lg mx-auto bg-slate-950/95 border-2 border-amber-500/40 p-6 sm:p-10 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.15)] text-center text-white backdrop-blur-2xl space-y-6">
      {/* LOGO */}
      <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border-2 border-amber-400/60 mx-auto flex items-center justify-center text-amber-300 shadow-xl shadow-amber-500/20 overflow-hidden">
        <AudentiLogo size={36} className="w-9 h-9 text-amber-400" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-400 border border-amber-400/30">
          <ShieldAlert className="w-3.5 h-3.5" />
          Directiva de Acceso &amp; Seguridad Audenti 2027
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Activación y Acceso a Cuentas
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
          Plataforma clínica integral para pacientes y personal médico de Sucursal Balbuena y Sucursal Chalma de Guadalupe.
        </p>
      </div>

      {/* TARJETA 1: PACIENTES DADOS DE ALTA EN CLÍNICA (ACTIVAR CUENTA) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-amber-500/10 border-2 border-amber-500/50 text-left space-y-2.5 shadow-lg shadow-amber-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>¿Eres Paciente de Audenti?</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
            Primer Acceso
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed">
          Si ya fuiste atendido o recepción abrió tu expediente en Balbuena o Chalma, activa tu cuenta con tu correo registrado para definir tu contraseña inicial y consultar tu odontograma y recetas sin duplicar datos.
        </p>

        <div className="pt-1.5 flex flex-col sm:flex-row items-center gap-2">
          <Link
            href="/portal/login?mode=activate"
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrarme / Activar Cuenta</span>
          </Link>
          <Link
            href="/portal/login"
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </Link>
        </div>
      </div>

      {/* TARJETA 2: PERSONAL CLÍNICO INTERNO (DOCTORES / COLABORADORES) */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
          <Stethoscope className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Acceso Exclusivo • Personal Médico y Staff</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Las cuentas para Doctores, Especialistas, Socios, Pasantes y Administradores son generadas internamente por la Dirección Médica (Dra. Aura Estudillo).
        </p>
        <div className="pt-1">
          <Link
            href="/auth/login"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Acceso al Portal Médico Institucional</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* INFORMACIÓN DE SEDES OFICIALES */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-left space-y-1.5 text-xs">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
          Sedes Clínicas Oficiales:
        </span>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span><strong>Balbuena (Matriz):</strong> Av. del Taller &amp; Retorno 12</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span><strong>Chalma:</strong> Av. Guadalupe Victoria 45</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <Link href="/" className="hover:text-amber-400 transition-colors font-medium">
          ← Volver al Inicio
        </Link>
        <span className="font-semibold text-slate-500">Dra. Aura Estudillo • Céd. Prof. 8492019</span>
      </div>
    </div>
  );
}
