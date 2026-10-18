'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Info, Sparkles } from 'lucide-react';

// Coordenadas relativas en porcentaje (%) sobre el modelo anatómico 3D de arcada superior
const UPPER_TEETH_COORDS: Record<number, { top: string; left: string; label: string }> = {
  18: { top: '78%', left: '16%', label: '3er Molar Superior Der.' },
  17: { top: '65%', left: '18%', label: '2do Molar Superior Der.' },
  16: { top: '51%', left: '21%', label: '1er Molar Superior Der.' },
  15: { top: '39%', left: '26%', label: '2do Premolar Superior Der.' },
  14: { top: '28%', left: '32%', label: '1er Premolar Superior Der.' },
  13: { top: '19%', left: '38%', label: 'Canino Superior Der.' },
  12: { top: '14%', left: '44%', label: 'Incisivo Lateral Der.' },
  11: { top: '12%', left: '49%', label: 'Incisivo Central Der.' },

  21: { top: '12%', left: '53%', label: 'Incisivo Central Izq.' },
  22: { top: '14%', left: '58%', label: 'Incisivo Lateral Izq.' },
  23: { top: '19%', left: '64%', label: 'Canino Superior Izq.' },
  24: { top: '28%', left: '70%', label: '1er Premolar Superior Izq.' },
  25: { top: '39%', left: '76%', label: '2do Premolar Superior Izq.' },
  26: { top: '51%', left: '81%', label: '1er Molar Superior Izq.' },
  27: { top: '65%', left: '84%', label: '2do Molar Superior Izq.' },
  28: { top: '78%', left: '86%', label: '3er Molar Superior Izq.' },
};

// Coordenadas relativas en porcentaje (%) sobre el modelo anatómico 3D de mandíbula inferior
const LOWER_TEETH_COORDS: Record<number, { top: string; left: string; label: string }> = {
  48: { top: '26%', left: '17%', label: '3er Molar Inferior Der.' },
  47: { top: '38%', left: '20%', label: '2do Molar Inferior Der.' },
  46: { top: '50%', left: '24%', label: '1er Molar Inferior Der.' },
  45: { top: '62%', left: '30%', label: '2do Premolar Inferior Der.' },
  44: { top: '72%', left: '36%', label: '1er Premolar Inferior Der.' },
  43: { top: '80%', left: '41%', label: 'Canino Inferior Der.' },
  42: { top: '85%', left: '46%', label: 'Incisivo Lateral Der.' },
  41: { top: '87%', left: '49%', label: 'Incisivo Central Der.' },

  31: { top: '87%', left: '53%', label: 'Incisivo Central Izq.' },
  32: { top: '85%', left: '56%', label: 'Incisivo Lateral Izq.' },
  33: { top: '80%', left: '61%', label: 'Canino Inferior Izq.' },
  34: { top: '72%', left: '66%', label: '1er Premolar Inferior Izq.' },
  35: { top: '62%', left: '72%', label: '2do Premolar Inferior Izq.' },
  36: { top: '50%', left: '78%', label: '1er Molar Inferior Izq.' },
  37: { top: '38%', left: '82%', label: '2do Molar Inferior Izq.' },
  38: { top: '26%', left: '85%', label: '3er Molar Inferior Izq.' },
};

interface PatientOdontogramProps {
  patientData: {
    branch_name: string;
    [key: string]: any;
  };
  selectedTooth: number;
  setSelectedTooth: (tooth: number) => void;
  diagnosisMap?: Record<number, any>;
}

export default function PatientOdontogram({
  patientData,
  selectedTooth,
  setSelectedTooth,
  diagnosisMap = {}
}: PatientOdontogramProps) {
  return (
    <div className="bg-[#121824] border border-gray-800 rounded-xl p-6 text-white shadow-xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800/80 pb-4">
        <div>
          <h3 className="font-bold text-base text-yellow-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Mi Odontograma 3D Personal
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Haz clic en una pieza sobre el modelo anatómico para consultar su estado clínico.
          </p>
        </div>
        <span className="text-xs bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30 font-semibold">
          Sede: {patientData.branch_name}
        </span>
      </div>

      {/* Grid de Modelos Anatómicos 3D */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Contenedor de la Arcada Superior (3D) */}
        <div className="text-center bg-[#0d1322] border border-gray-800 rounded-2xl p-4">
          <span className="text-xs uppercase tracking-wider text-gray-300 font-bold block mb-3">
            Maxilar Superior (Arcada Arriba)
          </span>
          <div className="relative inline-block bg-[#0A0F1D] border border-gray-700/80 rounded-xl p-3 shadow-inner max-w-full">
            {/* Imagen del modelo anatómico superior */}
            <img
              src="/images/upper-arch.png"
              alt="Arcada Superior 3D"
              className="w-[320px] max-w-full h-auto mx-auto object-contain block select-none pointer-events-none"
            />

            {/* Zonas Hotspot con Resplandor Luminoso (Glow) sin números fijos tapa-vistas */}
            {Object.entries(UPPER_TEETH_COORDS).map(([numStr, coords]) => {
              const toothNum = parseInt(numStr, 10);
              const isSelected = selectedTooth === toothNum;
              const hasTreatment = diagnosisMap[toothNum]?.condition && diagnosisMap[toothNum]?.condition !== 'healthy';

              return (
                <div
                  key={toothNum}
                  style={{ top: coords.top, left: coords.left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTooth(toothNum)}
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center',
                      isSelected
                        ? 'bg-amber-400/50 border-2 border-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.9)] scale-125 z-30'
                        : hasTreatment
                        ? 'bg-blue-500/25 border border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.7)] hover:bg-blue-500/50 hover:scale-115'
                        : 'bg-emerald-500/20 border border-emerald-400/70 shadow-[0_0_10px_rgba(16,185,129,0.6)] hover:bg-emerald-500/40 hover:scale-115'
                    )}
                    aria-label={`Pieza #${toothNum} - ${coords.label}`}
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full transition-all',
                        isSelected
                          ? 'bg-amber-300 shadow-[0_0_8px_#fde047]'
                          : hasTreatment
                          ? 'bg-blue-300/80'
                          : 'bg-emerald-300/80'
                      )}
                    />
                  </button>

                  {/* Tooltip flotante al pasar el cursor (hover) */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-40 whitespace-nowrap animate-in fade-in zoom-in-90 duration-150">
                    <div className="bg-slate-900/95 text-white border border-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1.5">
                      <span className="text-amber-400">Pieza #{toothNum}</span>
                      <span className="text-gray-400 font-normal">|</span>
                      <span className="text-gray-300">{coords.label.split(' ')[0]}</span>
                    </div>
                    <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-gray-700 rotate-45 -mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contenedor de la Mandíbula Inferior (3D) */}
        <div className="text-center bg-[#0d1322] border border-gray-800 rounded-2xl p-4">
          <span className="text-xs uppercase tracking-wider text-gray-300 font-bold block mb-3">
            Mandíbula (Arcada Abajo)
          </span>
          <div className="relative inline-block bg-[#0A0F1D] border border-gray-700/80 rounded-xl p-3 shadow-inner max-w-full">
            {/* Imagen del modelo anatómico inferior */}
            <img
              src="/images/lower-arch.png"
              alt="Mandíbula Inferior 3D"
              className="w-[320px] max-w-full h-auto mx-auto object-contain block select-none pointer-events-none"
            />

            {/* Zonas Hotspot con Resplandor Luminoso (Glow) sin números fijos tapa-vistas */}
            {Object.entries(LOWER_TEETH_COORDS).map(([numStr, coords]) => {
              const toothNum = parseInt(numStr, 10);
              const isSelected = selectedTooth === toothNum;
              const hasTreatment = diagnosisMap[toothNum]?.condition && diagnosisMap[toothNum]?.condition !== 'healthy';

              return (
                <div
                  key={toothNum}
                  style={{ top: coords.top, left: coords.left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTooth(toothNum)}
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center',
                      isSelected
                        ? 'bg-amber-400/50 border-2 border-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.9)] scale-125 z-30'
                        : hasTreatment
                        ? 'bg-blue-500/25 border border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.7)] hover:bg-blue-500/50 hover:scale-115'
                        : 'bg-emerald-500/20 border border-emerald-400/70 shadow-[0_0_10px_rgba(16,185,129,0.6)] hover:bg-emerald-500/40 hover:scale-115'
                    )}
                    aria-label={`Pieza #${toothNum} - ${coords.label}`}
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full transition-all',
                        isSelected
                          ? 'bg-amber-300 shadow-[0_0_8px_#fde047]'
                          : hasTreatment
                          ? 'bg-blue-300/80'
                          : 'bg-emerald-300/80'
                      )}
                    />
                  </button>

                  {/* Tooltip flotante al pasar el cursor (hover) */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-40 whitespace-nowrap animate-in fade-in zoom-in-90 duration-150">
                    <div className="bg-slate-900/95 text-white border border-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1.5">
                      <span className="text-amber-400">Pieza #{toothNum}</span>
                      <span className="text-gray-400 font-normal">|</span>
                      <span className="text-gray-300">{coords.label.split(' ')[0]}</span>
                    </div>
                    <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-gray-700 rotate-45 -mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda de Referencia */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] text-gray-400 border-t border-gray-800/80">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400 inline-block" />
          Pieza Sana
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400 inline-block" />
          Tratamiento Realizado (Resina / Corona / Endodoncia)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-300 inline-block" />
          Pieza Seleccionada
        </span>
      </div>
    </div>
  );
}
