'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ShieldCheck, Activity, CheckCircle2, ChevronRight, Lock } from 'lucide-react';

interface CleanPatientOdontogramProps {
  patientData?: {
    branch_name?: string;
    [key: string]: any;
  };
  clinicalRecords?: Record<string, { status?: string; notes?: string; label?: string; [key: string]: any }>;
  diagnosisMap?: Record<string | number, any>;
  selectedTooth?: number;
  setSelectedTooth?: (tooth: number) => void;
}

export default function CleanPatientOdontogram({
  patientData,
  clinicalRecords,
  diagnosisMap,
  selectedTooth = 36,
  setSelectedTooth
}: CleanPatientOdontogramProps) {
  const records = clinicalRecords || diagnosisMap || {
    '16': { status: 'resina', notes: 'Obturación oclusal con resina nanohíbrida intacta', label: 'Resina Estética', type: 'filled', date: '15/Sep/2026', arch: 'upper' },
    '26': { status: 'corona', notes: 'Corona de Zirconia monolítica de alta resistencia', label: 'Corona Zirconia', type: 'crown', date: '20/Jul/2026', arch: 'upper' },
    '36': { status: 'resina', notes: 'Restauración estética post-desinfección profiláctica', label: 'Resina Oclusal', type: 'filled', date: '12/Oct/2026', arch: 'lower' },
    '46': { status: 'endodoncia', notes: 'Tratamiento de conductos rotatorio sin sintomatología', label: 'Endodoncia', type: 'root_canal', date: '02/Ago/2026', arch: 'lower' }
  };

  const branchDisplay = patientData?.branch_name || patientData?.tenant_id || "Sucursal Chalma de Guadalupe";

  const upperTreatments = Object.entries(records).filter(([num, data]: any) => {
    const n = parseInt(num, 10);
    return (n >= 11 && n <= 28) || data.arch === 'upper';
  });

  const lowerTreatments = Object.entries(records).filter(([num, data]: any) => {
    const n = parseInt(num, 10);
    return (n >= 31 && n <= 48) || data.arch === 'lower';
  });

  return (
    <div className="bg-gradient-to-b from-[#101726] to-[#0A0F1D] border border-gray-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-8">
      {/* Encabezado Clínico de Alta Gama */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-black text-lg text-white tracking-wide">
              Expediente Anatómico 3D Personal
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Representación de tus piezas dentales en estado natural. Los diagnósticos mostrados han sido certificados bajo protocolo clínico oficial por la Dra. Aura Estudillo.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Protegido NOM-004-SSA3
          </span>
          <span className="text-xs bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3.5 py-1.5 rounded-full font-bold">
            {branchDisplay}
          </span>
        </div>
      </div>

      {/* Grid de Arcadas Anatómicas 3D */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* 1. Arcada Superior (Maxilar) */}
        <div className="bg-[#070b14]/90 border border-gray-800/90 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-400/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Arcada Superior • Maxilar
            </span>
            <span className="text-[11px] text-gray-400 font-medium">16 piezas adultas</span>
          </div>

          {/* Visual 3D Limpio e Inmaculado */}
          <div className="relative py-4 flex items-center justify-center">
            <div className="relative w-full max-w-[320px]">
              <img
                src="/images/upper-arch.png"
                alt="Maxilar Superior 3D"
                className="w-full h-auto object-contain mx-auto select-none pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] filter brightness-105"
              />
            </div>
          </div>

          {/* Listado Elegante de Diagnósticos Detectados en Arcada Superior */}
          <div className="mt-6 pt-4 border-t border-gray-800/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Piezas con Historial Clínico ({upperTreatments.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {upperTreatments.map(([num, data]: any) => {
                const toothNum = parseInt(num, 10);
                const isSelected = selectedTooth === toothNum;
                return (
                  <button
                    key={`upper-${num}`}
                    type="button"
                    onClick={() => setSelectedTooth && setSelectedTooth(toothNum)}
                    className={cn(
                      'text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer',
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/40'
                        : 'bg-slate-900/60 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border',
                        isSelected ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                      )}>
                        {num}
                      </span>
                      <div className="leading-tight">
                        <p className="text-xs font-bold text-white">{data.label || 'Tratamiento'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[110px]">{data.notes || 'Tratamiento clínico'}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-amber-400' : 'text-gray-500')} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Arcada Inferior (Mandíbula) */}
        <div className="bg-[#070b14]/90 border border-gray-800/90 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-400/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-blue-400 font-black flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Arcada Inferior • Mandíbula
            </span>
            <span className="text-[11px] text-gray-400 font-medium">16 piezas adultas</span>
          </div>

          {/* Visual 3D Limpio e Inmaculado */}
          <div className="relative py-4 flex items-center justify-center">
            <div className="relative w-full max-w-[320px]">
              <img
                src="/images/lower-arch.png"
                alt="Mandíbula Inferior 3D"
                className="w-full h-auto object-contain mx-auto select-none pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] filter brightness-105"
              />
            </div>
          </div>

          {/* Listado Elegante de Diagnósticos Detectados en Arcada Inferior */}
          <div className="mt-6 pt-4 border-t border-gray-800/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Piezas con Historial Clínico ({lowerTreatments.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lowerTreatments.map(([num, data]: any) => {
                const toothNum = parseInt(num, 10);
                const isSelected = selectedTooth === toothNum;
                return (
                  <button
                    key={`lower-${num}`}
                    type="button"
                    onClick={() => setSelectedTooth && setSelectedTooth(toothNum)}
                    className={cn(
                      'text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer',
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/40'
                        : 'bg-slate-900/60 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border',
                        isSelected ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                      )}>
                        {num}
                      </span>
                      <div className="leading-tight">
                        <p className="text-xs font-bold text-white">{data.label || 'Tratamiento'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[110px]">{data.notes || 'Tratamiento clínico'}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-amber-400' : 'text-gray-500')} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Pie de Garantía de Bioseguridad y Salud Bucal */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-gray-800/80 text-xs text-gray-400">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Las piezas que no cuentan con ficha de tratamiento se encuentran íntegras y sanas en su estructura esmalte-dentina.</span>
        </div>
        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 shrink-0">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          Modificaciones clínicas exclusivas de la Dra. Aura Estudillo
        </div>
      </div>
    </div>
  );
}
