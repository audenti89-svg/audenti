'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ArrowDown, ArrowUp, CheckCircle2, Lock } from 'lucide-react';

// Coordenadas relativas en porcentaje (%) sobre el modelo anatómico 3D de arcada superior
// pointerPos: posición exterior desde donde apunta la flecha hacia el diente
const UPPER_TEETH: { num: number; label: string; pointerLeft: string; pointerTop: string; targetLeft: string; targetTop: string; direction: 'top' | 'bottom' | 'left' | 'right' }[] = [
  { num: 18, label: '3er Molar Der.', pointerLeft: '4%', pointerTop: '80%', targetLeft: '17%', targetTop: '77%', direction: 'right' },
  { num: 17, label: '2do Molar Der.', pointerLeft: '6%', pointerTop: '64%', targetLeft: '19%', targetTop: '64%', direction: 'right' },
  { num: 16, label: '1er Molar Der.', pointerLeft: '9%', pointerTop: '48%', targetLeft: '22%', targetTop: '49%', direction: 'right' },
  { num: 15, label: '2do Premolar Der.', pointerLeft: '14%', pointerTop: '34%', targetLeft: '27%', targetTop: '38%', direction: 'right' },
  { num: 14, label: '1er Premolar Der.', pointerLeft: '20%', pointerTop: '20%', targetLeft: '33%', targetTop: '27%', direction: 'bottom' },
  { num: 13, label: 'Canino Der.', pointerLeft: '28%', pointerTop: '8%', targetLeft: '39%', targetTop: '18%', direction: 'bottom' },
  { num: 12, label: 'Incisivo Lat. Der.', pointerLeft: '37%', pointerTop: '4%', targetLeft: '44%', targetTop: '14%', direction: 'bottom' },
  { num: 11, label: 'Incisivo Central Der.', pointerLeft: '45%', pointerTop: '2%', targetLeft: '48%', targetTop: '12%', direction: 'bottom' },

  { num: 21, label: 'Incisivo Central Izq.', pointerLeft: '55%', pointerTop: '2%', targetLeft: '52%', targetTop: '12%', direction: 'bottom' },
  { num: 22, label: 'Incisivo Lat. Izq.', pointerLeft: '63%', pointerTop: '4%', targetLeft: '57%', targetTop: '14%', direction: 'bottom' },
  { num: 23, label: 'Canino Izq.', pointerLeft: '72%', pointerTop: '8%', targetLeft: '62%', targetTop: '18%', direction: 'bottom' },
  { num: 24, label: '1er Premolar Izq.', pointerLeft: '80%', pointerTop: '20%', targetLeft: '68%', targetTop: '27%', direction: 'bottom' },
  { num: 25, label: '2do Premolar Izq.', pointerLeft: '86%', pointerTop: '34%', targetLeft: '74%', targetTop: '38%', direction: 'left' },
  { num: 26, label: '1er Molar Izq.', pointerLeft: '91%', pointerTop: '48%', targetLeft: '79%', targetTop: '49%', direction: 'left' },
  { num: 27, label: '2do Molar Izq.', pointerLeft: '94%', pointerTop: '64%', targetLeft: '82%', targetTop: '64%', direction: 'left' },
  { num: 28, label: '3er Molar Izq.', pointerLeft: '96%', pointerTop: '80%', targetLeft: '84%', targetTop: '77%', direction: 'left' },
];

const LOWER_TEETH: { num: number; label: string; pointerLeft: string; pointerTop: string; targetLeft: string; targetTop: string; direction: 'top' | 'bottom' | 'left' | 'right' }[] = [
  { num: 48, label: '3er Molar Der.', pointerLeft: '5%', pointerTop: '22%', targetLeft: '18%', targetTop: '27%', direction: 'right' },
  { num: 47, label: '2do Molar Der.', pointerLeft: '8%', pointerTop: '36%', targetLeft: '21%', targetTop: '39%', direction: 'right' },
  { num: 46, label: '1er Molar Der.', pointerLeft: '12%', pointerTop: '50%', targetLeft: '25%', targetTop: '51%', direction: 'right' },
  { num: 45, label: '2do Premolar Der.', pointerLeft: '18%', pointerTop: '64%', targetLeft: '31%', targetTop: '63%', direction: 'right' },
  { num: 44, label: '1er Premolar Der.', pointerLeft: '24%', pointerTop: '76%', targetLeft: '37%', targetTop: '73%', direction: 'top' },
  { num: 43, label: 'Canino Der.', pointerLeft: '31%', pointerTop: '88%', targetLeft: '42%', targetTop: '81%', direction: 'top' },
  { num: 42, label: 'Incisivo Lat. Der.', pointerLeft: '39%', pointerTop: '94%', targetLeft: '46%', targetTop: '86%', direction: 'top' },
  { num: 41, label: 'Incisivo Central Der.', pointerLeft: '46%', pointerTop: '96%', targetLeft: '48%', targetTop: '88%', direction: 'top' },

  { num: 31, label: 'Incisivo Central Izq.', pointerLeft: '54%', pointerTop: '96%', targetLeft: '52%', targetTop: '88%', direction: 'top' },
  { num: 32, label: 'Incisivo Lat. Izq.', pointerLeft: '61%', pointerTop: '94%', targetLeft: '55%', targetTop: '86%', direction: 'top' },
  { num: 33, label: 'Canino Izq.', pointerLeft: '69%', pointerTop: '88%', targetLeft: '60%', targetTop: '81%', direction: 'top' },
  { num: 34, label: '1er Premolar Izq.', pointerLeft: '76%', pointerTop: '76%', targetLeft: '65%', targetTop: '73%', direction: 'top' },
  { num: 35, label: '2do Premolar Izq.', pointerLeft: '82%', pointerTop: '64%', targetLeft: '71%', targetTop: '63%', direction: 'left' },
  { num: 36, label: '1er Molar Izq.', pointerLeft: '88%', pointerTop: '50%', targetLeft: '77%', targetTop: '51%', direction: 'left' },
  { num: 37, label: '2do Molar Izq.', pointerLeft: '92%', pointerTop: '36%', targetLeft: '81%', targetTop: '39%', direction: 'left' },
  { num: 38, label: '3er Molar Izq.', pointerLeft: '95%', pointerTop: '22%', targetLeft: '84%', targetTop: '27%', direction: 'left' },
];

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
  // LÓGICA DE DERECHOS: MODO 100% SOLO LECTURA.
  // La boca 3D se mantiene despejada y sin círculos que tapen los dientes.
  // Sólo los dientes con tratamiento registrado por la Dra. Aura muestran su puntero activo.
  return (
    <div className="bg-[#121824] border border-gray-800 rounded-2xl p-6 text-white shadow-xl space-y-6">
      {/* Encabezado con Identificación Estricta de Sede */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-yellow-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Mi Odontograma 3D Personal
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
              <Lock className="w-3 h-3 text-amber-400" /> Solo Lectura
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Visualización anatómica limpia. Haz clic en los indicadores perimétricos para consultar el historial clínico de cada pieza.
          </p>
        </div>
        <span className="text-xs bg-amber-400/15 text-amber-300 px-3.5 py-1.5 rounded-xl border border-amber-400/40 font-bold">
          Sede Asignada: {patientData.branch_name}
        </span>
      </div>

      {/* Grid de Modelos Anatómicos 3D con Boca Despejada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Arcada Superior (3D) */}
        <div className="bg-[#0A0F1D] border border-gray-800 rounded-2xl p-5 text-center relative overflow-hidden shadow-inner">
          <span className="text-xs uppercase tracking-wider text-gray-300 font-bold block mb-4">
            Maxilar Superior (Arcada Arriba)
          </span>

          <div className="relative inline-block w-full max-w-[380px] p-2">
            {/* Imagen Anatómica 3D 100% Despejada Sin Círculos Encimados */}
            <img
              src="/images/upper-arch.png"
              alt="Arcada Superior 3D"
              className="w-full h-auto mx-auto object-contain block select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            />

            {/* Punteros / Flechas Finas Externas que apuntan desde afuera sin tapar */}
            {UPPER_TEETH.map((tooth) => {
              const diag = diagnosisMap[tooth.num];
              const isSelected = selectedTooth === tooth.num;
              const hasTreatment = diag?.condition && diag.condition !== 'healthy';

              return (
                <div
                  key={tooth.num}
                  style={{ top: tooth.pointerTop, left: tooth.pointerLeft }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTooth(tooth.num)}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border shadow-md',
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-yellow-300 ring-2 ring-amber-400/60 scale-110 z-30 font-black'
                        : hasTreatment
                        ? 'bg-blue-600/90 text-white border-blue-400 hover:bg-blue-500 hover:scale-105'
                        : 'bg-slate-900/80 text-gray-400 border-gray-700/80 hover:text-white hover:border-gray-500'
                    )}
                    title={`Pieza #${tooth.num} - ${tooth.label}`}
                  >
                    <span>{tooth.num}</span>
                    {hasTreatment && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
                    )}
                  </button>

                  {/* Tooltip Detallado al Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-40 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-slate-950 text-white border border-gray-700 text-[11px] px-2.5 py-1 rounded-lg shadow-2xl flex items-center gap-1.5">
                      <strong className="text-amber-400">Pieza #{tooth.num}</strong>
                      <span className="text-gray-400">•</span>
                      <span>{hasTreatment ? diag.label : 'Sin tratamiento (Al natural)'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mandíbula Inferior (3D) */}
        <div className="bg-[#0A0F1D] border border-gray-800 rounded-2xl p-5 text-center relative overflow-hidden shadow-inner">
          <span className="text-xs uppercase tracking-wider text-gray-300 font-bold block mb-4">
            Mandíbula (Arcada Abajo)
          </span>

          <div className="relative inline-block w-full max-w-[380px] p-2">
            {/* Imagen Anatómica 3D 100% Despejada Sin Círculos Encimados */}
            <img
              src="/images/lower-arch.png"
              alt="Mandíbula Inferior 3D"
              className="w-full h-auto mx-auto object-contain block select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            />

            {/* Punteros / Flechas Finas Externas */}
            {LOWER_TEETH.map((tooth) => {
              const diag = diagnosisMap[tooth.num];
              const isSelected = selectedTooth === tooth.num;
              const hasTreatment = diag?.condition && diag.condition !== 'healthy';

              return (
                <div
                  key={tooth.num}
                  style={{ top: tooth.pointerTop, left: tooth.pointerLeft }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTooth(tooth.num)}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border shadow-md',
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-yellow-300 ring-2 ring-amber-400/60 scale-110 z-30 font-black'
                        : hasTreatment
                        ? 'bg-blue-600/90 text-white border-blue-400 hover:bg-blue-500 hover:scale-105'
                        : 'bg-slate-900/80 text-gray-400 border-gray-700/80 hover:text-white hover:border-gray-500'
                    )}
                    title={`Pieza #${tooth.num} - ${tooth.label}`}
                  >
                    <span>{tooth.num}</span>
                    {hasTreatment && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
                    )}
                  </button>

                  {/* Tooltip Detallado al Hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-40 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-slate-950 text-white border border-gray-700 text-[11px] px-2.5 py-1 rounded-lg shadow-2xl flex items-center gap-1.5">
                      <strong className="text-amber-400">Pieza #{tooth.num}</strong>
                      <span className="text-gray-400">•</span>
                      <span>{hasTreatment ? diag.label : 'Sin tratamiento (Al natural)'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leyenda Explicativa de Solo Lectura */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-gray-400 border-t border-gray-800/80">
        <span className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-gray-700 text-[10px] text-gray-300 font-bold">11</span>
          Pieza sin tratamiento (Diente al natural)
        </span>
        <span className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-600 text-white border border-blue-400 text-[10px] font-bold">36</span>
          Tratamiento Clínico Registrado por Dra. Aura
        </span>
        <span className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 border border-yellow-300 text-[10px] font-black">16</span>
          Pieza Seleccionada en Consulta
        </span>
      </div>
    </div>
  );
}
