'use client';

import React, { useEffect } from 'react';
import { AudentiLogo } from '@/components/ui/AudentiLogo';
import { RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function PortalPacienteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PortalPaciente Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between p-6">
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <AudentiLogo size={28} doctorName="Dra. Aura Estudillo" />
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400 text-slate-950">
          Portal Pacientes
        </span>
      </header>

      <main className="max-w-md mx-auto w-full py-8 space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border border-amber-400/40 text-amber-300 mx-auto flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">
            Tu Expediente Está Seguro
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Hubo una interrupción temporal al sincronizar la sesión médica. Tus datos clínicos y citas se encuentran resguardados bajo la norma NOM-004-SSA3.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                // Limpiar cualquier fragmento residual problemático
                if (window.location.hash) {
                  window.location.hash = '';
                }
              }
              reset();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recargar Mi Expediente</span>
          </button>

          <Link
            href="/portal-paciente"
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Ir al Inicio del Portal</span>
          </Link>
        </div>
      </main>

      <footer className="text-center text-[10px] text-slate-500 py-4">
        Audenti Clinical Pro 2027 • Dra. Aura Estudillo • Céd. Prof. 8492019
      </footer>
    </div>
  );
}
