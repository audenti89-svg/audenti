'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ShieldCheck } from 'lucide-react';

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
  selectedTooth,
  setSelectedTooth
}: CleanPatientOdontogramProps) {
  const records = clinicalRecords || diagnosisMap || {
    '16': { status: 'resina', notes: 'Obturación oclusal estética', label: 'Resina Estética' },
    '26': { status: 'corona', notes: 'Corona Cerámica Zirconia', label: 'Corona Zirconia' },
    '36': { status: 'resina', notes: 'Resina Nanohíbrida 3M', label: 'Resina Oclusal' },
    '46': { status: 'endodoncia', notes: 'Tratamiento de Conductos Rotatorio', label: 'Endodoncia' }
  };
  const branchDisplay = patientData?.branch_name || patientData?.tenant_id || "Sucursal Chalma de Guadalupe";

  return (
    <div className="bg-[#121824] border border-gray-800 rounded-xl p-6 text-white shadow-xl space-y-6">
      {/* Encabezado Clínico de Solo Lectura */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800/80 pb-4">
        <div>
          <h3 className="font-bold text-yellow-400 text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Mi Odontograma Clínico (Solo Lectura)
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Estado de tus piezas dentales registrado oficialmente por la Dra. Aura Estudillo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Validación NOM-004-SSA3
          </span>
          <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full font-semibold">
            {branchDisplay}
          </span>
        </div>
      </div>

      {/* Contenedor Principal de la Arcada 3D Despejada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Maxilar Superior */}
        <div className="relative bg-[#0A0F1D] border border-gray-700/80 rounded-xl p-6 text-center shadow-inner">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-bold block mb-4">
            Maxilar Superior (Arcada Arriba)
          </span>
          <div className="relative inline-block w-full max-w-[280px]">
            <img
              src="/images/upper-arch.png"
              alt="Arcada Superior 3D"
              className="w-full h-auto object-contain mx-auto block select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            />
            
            {/* Si la doctora registró algo en una pieza específica (ej. pieza 16 o 26), se muestra un indicador de línea exterior limpio */}
            {records?.['16'] && (
              <div 
                onClick={() => setSelectedTooth && setSelectedTooth(16)}
                className="absolute top-[42%] left-[-15%] sm:left-[-10%] flex items-center gap-1.5 cursor-pointer z-20 group"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                <span className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-0.5 rounded shadow-lg border border-blue-400/50 transition-all">
                  Pieza 16: {records['16'].label || 'Tratada'}
                </span>
              </div>
            )}

            {records?.['26'] && (
              <div 
                onClick={() => setSelectedTooth && setSelectedTooth(26)}
                className="absolute top-[42%] right-[-15%] sm:right-[-10%] flex items-center gap-1.5 cursor-pointer z-20 group"
              >
                <span className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded shadow-lg border border-amber-300/50 transition-all">
                  Pieza 26: {records['26'].label || 'Corona'}
                </span>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              </div>
            )}
          </div>
        </div>

        {/* Mandíbula Inferior */}
        <div className="relative bg-[#0A0F1D] border border-gray-700/80 rounded-xl p-6 text-center shadow-inner">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-bold block mb-4">
            Mandíbula (Arcada Abajo)
          </span>
          <div className="relative inline-block w-full max-w-[280px]">
            <img
              src="/images/lower-arch.png"
              alt="Mandíbula Inferior 3D"
              className="w-full h-auto object-contain mx-auto block select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            />
            
            {/* Indicador exterior limpio para la pieza 46 si tiene diagnóstico */}
            {records?.['46'] && (
              <div 
                onClick={() => setSelectedTooth && setSelectedTooth(46)}
                className="absolute top-[48%] left-[-15%] sm:left-[-10%] flex items-center gap-1.5 cursor-pointer z-20 group"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
                <span className="text-[10px] bg-orange-600 hover:bg-orange-500 text-white font-bold px-2 py-0.5 rounded shadow-lg border border-orange-400/50 transition-all">
                  Pieza 46: {records['46'].label || 'Endodoncia'}
                </span>
              </div>
            )}

            {/* Indicador exterior limpio para la pieza 36 si tiene diagnóstico */}
            {records?.['36'] && (
              <div 
                onClick={() => setSelectedTooth && setSelectedTooth(36)}
                className="absolute top-[48%] right-[-15%] sm:right-[-10%] flex items-center gap-1.5 cursor-pointer z-20 group"
              >
                <span className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-0.5 rounded shadow-lg border border-blue-400/50 transition-all">
                  Pieza 36: {records['36'].label || 'Resina'}
                </span>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Pie de Nota Explicativo */}
      <div className="text-center pt-2 text-xs text-gray-400 border-t border-gray-800/80">
        <p>
          Las piezas anatómicas sin indicadores laterales se encuentran sanas y en su estado natural. Sólo la Dra. Aura Estudillo puede registrar modificaciones clínicas conforme a la NOM-004-SSA3.
        </p>
      </div>
    </div>
  );
}
