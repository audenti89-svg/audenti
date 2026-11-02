'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  ShieldCheck,
  Save,
  CheckCircle2,
  Trash2,
  Plus,
  Layers,
  Activity,
  FileText,
  DollarSign,
  AlertCircle
} from 'lucide-react'

export type DentalSpecialty = 'operatoria' | 'endodoncia' | 'ortodoncia' | 'implantes' | 'periodoncia' | 'cirugia'

export type SurfaceCondition =
  | 'sano'
  | 'caries'
  | 'resina'
  | 'amalgama'
  | 'sellador'
  | 'fractura'
  | 'incrustacion'

export type ToothWholeCondition =
  | 'sano'
  | 'ausente'
  | 'endodoncia'
  | 'corona'
  | 'implante'
  | 'puente'
  | 'extraccion_indicada'
  | 'bracket'
  | 'protesis'

export interface ToothSurfaces {
  vestibular: SurfaceCondition
  lingual: SurfaceCondition
  mesial: SurfaceCondition
  distal: SurfaceCondition
  oclusal: SurfaceCondition
}

export interface ClinicalEvolutionEntry {
  id: string
  toothNumber: number
  date: string
  doctor: string
  procedure: string
  surfaces: string
  status: 'Diagnóstico' | 'En Proceso' | 'Finalizado' | 'En Observación'
  notes: string
}

export interface LinkedTreatment {
  id: string
  toothNumber: number
  specialty: DentalSpecialty
  procedure: string
  surfaces: string
  notes: string
  estimatedCost: number
}

export interface ToothState {
  number: number
  wholeCondition: ToothWholeCondition
  surfaces: ToothSurfaces
  notes: string
  specialty?: DentalSpecialty
}

// Catálogo de Tratamientos Específicos por Especialidad
export const TREATMENT_CATALOG: Record<DentalSpecialty, Array<{ name: string; cost: number; condition: ToothWholeCondition }>> = {
  operatoria: [
    { name: 'Resina Estética 1 Cara (Oclusal/Vestibular)', cost: 850, condition: 'sano' },
    { name: 'Resina Estética 2 Caras (MO / DO)', cost: 1100, condition: 'sano' },
    { name: 'Resina Estética Compleja 3+ Caras (MOD)', cost: 1400, condition: 'sano' },
    { name: 'Incrustación Estética Cerámica / E-Max', cost: 3500, condition: 'corona' },
    { name: 'Sellador de Fosetas y Fisuras Preventivo', cost: 450, condition: 'sano' },
  ],
  endodoncia: [
    { name: 'Tratamiento de Conductos Unirradicular', cost: 2800, condition: 'endodoncia' },
    { name: 'Tratamiento de Conductos Birradicular', cost: 3400, condition: 'endodoncia' },
    { name: 'Tratamiento de Conductos Molar (Rotatorio)', cost: 4200, condition: 'endodoncia' },
    { name: 'Poste de Fibra de Vidrio + Reconstrucción', cost: 1950, condition: 'endodoncia' },
    { name: 'Retratamiento Endodóntico Complejo', cost: 4800, condition: 'endodoncia' },
  ],
  ortodoncia: [
    { name: 'Cementado de Bracket Individual', cost: 600, condition: 'bracket' },
    { name: 'Colocación de Tubo Molar / Banda', cost: 750, condition: 'bracket' },
    { name: 'Alineador Transparente (Fase Activa)', cost: 2500, condition: 'bracket' },
    { name: 'Retenedor Fijo Lingual de Alambre Trenzado', cost: 1800, condition: 'bracket' },
  ],
  implantes: [
    { name: 'Fase Quirúrgica: Implante Oseointegrado Titanio', cost: 14500, condition: 'implante' },
    { name: 'Pilar Transepitelial & Tornillo Clínico', cost: 3200, condition: 'implante' },
    { name: 'Corona de Zirconia Atornillada sobre Implante', cost: 7500, condition: 'corona' },
    { name: 'Regeneración Ósea Guiada + Membrana PRF', cost: 4500, condition: 'implante' },
  ],
  cirugia: [
    { name: 'Extracción Simple de Órgano Dentario', cost: 950, condition: 'extraccion_indicada' },
    { name: 'Cirugía de Tercer Molar Incluido / Retenido', cost: 3200, condition: 'extraccion_indicada' },
    { name: 'Alveoloplastía & Regularización Ósea', cost: 1800, condition: 'extraccion_indicada' },
  ],
  periodoncia: [
    { name: 'Raspado y Alisado Radicular por Cuadrante', cost: 1200, condition: 'sano' },
    { name: 'Fisioterapia Oral & Profilaxis Ultrasónica Profunda', cost: 800, condition: 'sano' },
  ]
}

// Colores de condiciones de superficie
const SURFACE_COLORS: Record<SurfaceCondition, { fill: string; stroke: string; label: string }> = {
  sano:         { fill: '#ffffff', stroke: '#cbd5e1', label: 'Sano' },
  caries:       { fill: '#ef4444', stroke: '#b91c1c', label: 'Caries (Rojo)' },
  resina:       { fill: '#3b82f6', stroke: '#1d4ed8', label: 'Resina (Azul)' },
  amalgama:     { fill: '#64748b', stroke: '#334155', label: 'Amalgama (Gris)' },
  sellador:     { fill: '#10b981', stroke: '#047857', label: 'Sellador (Verde)' },
  fractura:     { fill: '#ec4899', stroke: '#be185d', label: 'Fractura (Rosa)' },
  incrustacion: { fill: '#f59e0b', stroke: '#b45309', label: 'Incrustación (Ámbar)' },
}

// Cuadrantes FDI Adulto
const ADULT_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft:  [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft:  [31, 32, 33, 34, 35, 36, 37, 38],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
}

// Cuadrantes FDI Pediátrico
const PEDIATRIC_TEETH = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft:  [61, 62, 63, 64, 65],
  lowerLeft:  [71, 72, 73, 74, 75],
  lowerRight: [85, 84, 83, 82, 81],
}

function initTeethRecord(): Record<number, ToothState> {
  const allTeeth = [
    ...ADULT_TEETH.upperRight, ...ADULT_TEETH.upperLeft,
    ...ADULT_TEETH.lowerLeft,  ...ADULT_TEETH.lowerRight,
    ...PEDIATRIC_TEETH.upperRight, ...PEDIATRIC_TEETH.upperLeft,
    ...PEDIATRIC_TEETH.lowerLeft,  ...PEDIATRIC_TEETH.lowerRight,
  ]
  const rec: Record<number, ToothState> = {}
  allTeeth.forEach(num => {
    rec[num] = {
      number: num,
      wholeCondition: 'sano',
      surfaces: {
        vestibular: 'sano',
        lingual: 'sano',
        mesial: 'sano',
        distal: 'sano',
        oclusal: 'sano'
      },
      notes: ''
    }
  })
  return rec
}

interface AnatomicalToothFaceProps {
  number: number
  state: ToothState
  isSelected: boolean
  activeSurfaceCondition: SurfaceCondition
  onSelectTooth: (num: number) => void
  onSurfaceClick: (surface: keyof ToothSurfaces) => void
}

/**
 * Representación anatómica clásica FDI de 5 caras:
 * - Vestibular (Arriba en superior, abajo en inferior)
 * - Lingual/Palatino (Abajo en superior, arriba en inferior)
 * - Mesial (hacia línea media)
 * - Distal (hacia los lados)
 * - Oclusal (Centro)
 */
function AnatomicalToothSVG({
  number,
  state,
  isSelected,
  onSelectTooth,
  onSurfaceClick
}: AnatomicalToothFaceProps) {
  const isLower = (number >= 31 && number <= 48) || (number >= 71 && number <= 85)
  // Determinar orientación Mesial/Distal según cuadrante FDI
  // Cuadrante 1 y 4 (derecho del paciente): Mesial está a la izquierda de la pantalla
  // Cuadrante 2 y 3 (izquierdo del paciente): Mesial está a la derecha de la pantalla
  const isLeftOnScreen = (number >= 11 && number <= 18) || (number >= 41 && number <= 48) || (number >= 51 && number <= 55) || (number >= 81 && number <= 85)
  
  const mesialColor = SURFACE_COLORS[state.surfaces.mesial]
  const distalColor = SURFACE_COLORS[state.surfaces.distal]
  const vestibularColor = SURFACE_COLORS[state.surfaces.vestibular]
  const lingualColor = SURFACE_COLORS[state.surfaces.lingual]
  const oclusalColor = SURFACE_COLORS[state.surfaces.oclusal]

  // Indicadores de condición general
  const isMissing = state.wholeCondition === 'ausente'
  const isCrown = state.wholeCondition === 'corona'
  const isImplant = state.wholeCondition === 'implante'
  const isEndo = state.wholeCondition === 'endodoncia'
  const isBracket = state.wholeCondition === 'bracket'
  const isExtraction = state.wholeCondition === 'extraccion_indicada'

  return (
    <div
      onClick={() => onSelectTooth(number)}
      className={cn(
        'flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer select-none group',
        isSelected ? 'bg-amber-100/80 ring-2 ring-amber-500 shadow-md scale-105' : 'hover:bg-slate-100/70'
      )}
      title={`Pieza ${number} • Clic para seleccionar o marcar caras`}
    >
      {/* Número FDI */}
      {!isLower && (
        <span className={cn(
          'text-[10px] font-black',
          isSelected ? 'text-amber-950 font-black scale-110' : 'text-slate-600 group-hover:text-amber-600'
        )}>
          {number}
        </span>
      )}

      {/* Diagrama Anatómico 5 Caras */}
      <div className="relative">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          className={cn(
            'transition-transform',
            isMissing && 'opacity-30'
          )}
        >
          {/* Cara Superior (Vestibular en superior / Lingual en inferior) */}
          <polygon
            points="2,2 34,2 26,10 10,10"
            fill={!isLower ? vestibularColor.fill : lingualColor.fill}
            stroke={!isLower ? vestibularColor.stroke : lingualColor.stroke}
            strokeWidth="1.2"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTooth(number)
              onSurfaceClick(!isLower ? 'vestibular' : 'lingual')
            }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />

          {/* Cara Izquierda (Mesial o Distal según cuadrante) */}
          <polygon
            points="2,2 10,10 10,26 2,34"
            fill={isLeftOnScreen ? mesialColor.fill : distalColor.fill}
            stroke={isLeftOnScreen ? mesialColor.stroke : distalColor.stroke}
            strokeWidth="1.2"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTooth(number)
              onSurfaceClick(isLeftOnScreen ? 'mesial' : 'distal')
            }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />

          {/* Cara Derecha */}
          <polygon
            points="34,2 34,34 26,26 26,10"
            fill={isLeftOnScreen ? distalColor.fill : mesialColor.fill}
            stroke={isLeftOnScreen ? distalColor.stroke : mesialColor.stroke}
            strokeWidth="1.2"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTooth(number)
              onSurfaceClick(isLeftOnScreen ? 'distal' : 'mesial')
            }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />

          {/* Cara Inferior (Lingual en superior / Vestibular en inferior) */}
          <polygon
            points="10,26 26,26 34,34 2,34"
            fill={!isLower ? lingualColor.fill : vestibularColor.fill}
            stroke={!isLower ? lingualColor.stroke : vestibularColor.stroke}
            strokeWidth="1.2"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTooth(number)
              onSurfaceClick(!isLower ? 'lingual' : 'vestibular')
            }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />

          {/* Cara Central: Oclusal / Incisal */}
          <rect
            x="10"
            y="10"
            width="16"
            height="16"
            fill={oclusalColor.fill}
            stroke={oclusalColor.stroke}
            strokeWidth="1.2"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTooth(number)
              onSurfaceClick('oclusal')
            }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />

          {/* Simbología Médica Superpuesta */}
          {isMissing && (
            <line x1="2" y1="2" x2="34" y2="34" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {isMissing && (
            <line x1="34" y1="2" x2="2" y2="34" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {isExtraction && (
            <polygon points="18,4 32,32 4,32" fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="2 2" />
          )}
        </svg>

        {/* Badges de Especialidades Odontológicas */}
        {isEndo && (
          <span className="absolute -top-1.5 -right-1 px-1 py-0.2 text-[8px] font-black bg-orange-600 text-white rounded-full shadow-xs">
            ENDO
          </span>
        )}
        {isCrown && (
          <span className="absolute -top-1.5 -left-1 px-1 py-0.2 text-[8px] font-black bg-amber-500 text-slate-950 rounded-full shadow-xs">
            COR
          </span>
        )}
        {isImplant && (
          <span className="absolute -bottom-1.5 -right-1 px-1 py-0.2 text-[8px] font-black bg-purple-600 text-white rounded-full shadow-xs">
            IMP
          </span>
        )}
        {isBracket && (
          <span className="absolute -bottom-1.5 -left-1 px-1 py-0.2 text-[8px] font-black bg-indigo-600 text-white rounded-full shadow-xs">
            ORTO
          </span>
        )}
      </div>

      {/* Número FDI (para inferiores) */}
      {isLower && (
        <span className={cn(
          'text-[10px] font-black',
          isSelected ? 'text-amber-950 font-black scale-110' : 'text-slate-600 group-hover:text-amber-600'
        )}>
          {number}
        </span>
      )}
    </div>
  )
}

export function Odontogram() {
  const [teeth, setTeeth] = useState<Record<number, ToothState>>(initTeethRecord)
  const [selectedToothNum, setSelectedToothNum] = useState<number>(16)
  const [dentition, setDentition] = useState<'adult' | 'pediatric'>('adult')
  const [activeSpecialty, setActiveSpecialty] = useState<DentalSpecialty>('operatoria')
  const [activeSurfaceCondition, setActiveSurfaceCondition] = useState<SurfaceCondition>('caries')
  const [linkedTreatments, setLinkedTreatments] = useState<LinkedTreatment[]>([])
  const [evolutionHistory, setEvolutionHistory] = useState<ClinicalEvolutionEntry[]>([
    {
      id: 'evo-1',
      toothNumber: 16,
      date: '2026-10-20 17:30',
      doctor: 'Dra. Aura Estudillo',
      procedure: 'Diagnóstico Clínico Inicial y Mapeo 5 Caras',
      surfaces: 'Oclusal, Mesial',
      status: 'Diagnóstico',
      notes: 'Presencia de lesión cariosa oclusal profunda con compromiso hacia cresta mesial.'
    },
    {
      id: 'evo-2',
      toothNumber: 21,
      date: '2026-10-22 18:15',
      doctor: 'Dra. Aura Estudillo',
      procedure: 'Resina Estética Fotocurable 1 Cara',
      surfaces: 'Vestibular',
      status: 'Finalizado',
      notes: 'Restauración estética directa con aislamiento absoluto satisfactorio.'
    }
  ])
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Cargar estado inicial persistido si existe
  useEffect(() => {
    try {
      const stored = localStorage.getItem('audenti_odontogram_data')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.teeth) setTeeth(parsed.teeth)
        if (parsed.treatments) setLinkedTreatments(parsed.treatments)
        if (parsed.evolution) setEvolutionHistory(parsed.evolution)
      }
    } catch {}
  }, [])

  const selectedTooth = teeth[selectedToothNum] || teeth[16]

  // Cambiar condición de una cara específica
  const handleSurfaceClick = (surface: keyof ToothSurfaces) => {
    setTeeth(prev => {
      const current = prev[selectedToothNum]
      const currentSurface = current.surfaces[surface]
      // Si ya tiene la misma condición, limpiarla (sano), si no, aplicarla
      const newCond: SurfaceCondition = currentSurface === activeSurfaceCondition ? 'sano' : activeSurfaceCondition

      return {
        ...prev,
        [selectedToothNum]: {
          ...current,
          surfaces: {
            ...current.surfaces,
            [surface]: newCond
          }
        }
      }
    })
  }

  // Asignar condición global de la pieza
  const handleSetWholeCondition = (cond: ToothWholeCondition) => {
    setTeeth(prev => ({
      ...prev,
      [selectedToothNum]: {
        ...prev[selectedToothNum],
        wholeCondition: cond
      }
    }))
  }

  // Vincular tratamiento específico del catálogo a la pieza seleccionada
  const handleAddTreatment = (proc: { name: string; cost: number; condition: ToothWholeCondition }) => {
    // Caras afectadas
    const affectedSurfaces = Object.entries(selectedTooth.surfaces)
      .filter(([_, cond]) => cond !== 'sano')
      .map(([s]) => s.charAt(0).toUpperCase())
      .join('')

    const newTreatment: LinkedTreatment = {
      id: `treat-${Date.now()}-${Math.random()}`,
      toothNumber: selectedToothNum,
      specialty: activeSpecialty,
      procedure: proc.name,
      surfaces: affectedSurfaces || 'General',
      notes: selectedTooth.notes || 'Tratamiento indicado según valoración clínica',
      estimatedCost: proc.cost
    }

    setLinkedTreatments(prev => [...prev, newTreatment])

    const nowStr = new Intl.DateTimeFormat('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date())

    const newEvo: ClinicalEvolutionEntry = {
      id: `evo-${Date.now()}`,
      toothNumber: selectedToothNum,
      date: nowStr,
      doctor: 'Dra. Aura Estudillo',
      procedure: proc.name,
      surfaces: affectedSurfaces || 'General',
      status: 'En Proceso',
      notes: selectedTooth.notes || `Procedimiento indicado para pieza #${selectedToothNum}`
    }
    setEvolutionHistory(prev => [newEvo, ...prev])
    if (proc.condition !== 'sano') {
      handleSetWholeCondition(proc.condition)
    }
  }

  const handleRemoveTreatment = (id: string) => {
    setLinkedTreatments(prev => prev.filter(t => t.id !== id))
  }

  // Guardar Odontograma de forma persistente
  const handleSaveOdontogram = () => {
    try {
      localStorage.setItem('audenti_odontogram_data', JSON.stringify({
        teeth,
        treatments: linkedTreatments,
        updatedAt: new Date().toISOString()
      }))
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch {}
  }

  const totalBudget = linkedTreatments.reduce((acc, t) => acc + t.estimatedCost, 0)

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col space-y-4">
      {/* Encabezado Superior */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
              FDI Anatómico 5 Caras
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Dra. Aura Estudillo • Odontología &amp; Alta Especialidad
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Odontograma Clínico Interactivo
          </h2>
          <p className="text-xs text-slate-500">
            Haz clic en los cuadrantes de cada diente (Vestibular, Oclusal, Mesial, Distal, Lingual) para registrar caras y tratamientos vinculados.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setDentition('adult')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                dentition === 'adult' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              )}
            >
              Adulto (32 piezas)
            </button>
            <button
              type="button"
              onClick={() => setDentition('pediatric')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                dentition === 'pediatric' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              )}
            >
              Pediátrico (20 piezas)
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveOdontogram}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{savedSuccess ? '¡Odontograma Guardado!' : 'Guardar Ficha'}</span>
          </button>
        </div>
      </div>

      {/* Paleta de Caras y Condiciones */}
      <div className="px-6 py-3 bg-slate-50 border-y border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mr-1">
            Herramienta activa:
          </span>
          {(['caries', 'resina', 'amalgama', 'sellador', 'fractura', 'incrustacion'] as SurfaceCondition[]).map(cond => {
            const cInfo = SURFACE_COLORS[cond]
            return (
              <button
                key={cond}
                type="button"
                onClick={() => setActiveSurfaceCondition(cond)}
                className={cn(
                  'px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs',
                  activeSurfaceCondition === cond
                    ? 'ring-2 ring-slate-900 ring-offset-1 scale-105 font-black text-slate-900 bg-white'
                    : 'bg-white/80 text-slate-700 hover:bg-white'
                )}
              >
                <span className="w-3 h-3 rounded-md border" style={{ backgroundColor: cInfo.fill, borderColor: cInfo.stroke }} />
                <span>{cInfo.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">
            Pieza Seleccionada: <strong className="text-amber-700 font-black text-sm">#{selectedToothNum}</strong>
          </span>
        </div>
      </div>

      {/* Diagrama Odontológico Completo (Superior e Inferior) */}
      <div className="p-6 space-y-6 overflow-x-auto">
        {/* Arcada Superior */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pb-1">
            <span>Derecha del Paciente</span>
            <span className="text-amber-700 font-black">Maxilar Superior (Arcada 1 &amp; 2)</span>
            <span>Izquierda del Paciente</span>
          </div>

          <div className="flex justify-center items-center gap-1 sm:gap-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/70">
            {dentition === 'adult' ? (
              <>
                {ADULT_TEETH.upperRight.map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
                <div className="w-0.5 h-12 bg-slate-300 mx-2" />
                {ADULT_TEETH.upperLeft.map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
              </>
            ) : (
              <>
                {PEDIATRIC_TEETH.upperRight.map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
                <div className="w-0.5 h-12 bg-slate-300 mx-2" />
                {PEDIATRIC_TEETH.upperLeft.map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Línea Media */}
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t-2 border-dashed border-slate-200" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-2">
            Línea Media Oclusal
          </span>
          <div className="flex-1 border-t-2 border-dashed border-slate-200" />
        </div>

        {/* Arcada Inferior */}
        <div className="space-y-1">
          <div className="flex justify-center items-center gap-1 sm:gap-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/70">
            {dentition === 'adult' ? (
              <>
                {ADULT_TEETH.lowerRight.slice().reverse().map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
                <div className="w-0.5 h-12 bg-slate-300 mx-2" />
                {ADULT_TEETH.lowerLeft.map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
              </>
            ) : (
              <>
                {PEDIATRIC_TEETH.lowerRight.slice().reverse().map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
                <div className="w-0.5 h-12 bg-slate-300 mx-2" />
                {PEDIATRIC_TEETH.lowerLeft.map(num => (
                  <AnatomicalToothSVG
                    key={num}
                    number={num}
                    state={teeth[num]}
                    isSelected={selectedToothNum === num}
                    activeSurfaceCondition={activeSurfaceCondition}
                    onSelectTooth={setSelectedToothNum}
                    onSurfaceClick={handleSurfaceClick}
                  />
                ))}
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pt-1">
            <span>Cuadrante 4</span>
            <span className="text-amber-700 font-black">Mandíbula Inferior (Arcada 3 &amp; 4)</span>
            <span>Cuadrante 3</span>
          </div>
        </div>
      </div>

      {/* PANEL DE VINCULACIÓN DE TRATAMIENTOS POR ESPECIALIDAD */}
      <div className="p-6 border-t border-slate-200 bg-slate-50/70 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Vinculación de Tratamiento Clínico para Pieza #{selectedToothNum}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black uppercase">
                {selectedTooth.wholeCondition}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Superficies marcadas: {Object.entries(selectedTooth.surfaces).filter(([_, c]) => c !== 'sano').map(([s, c]) => `${s}: ${c}`).join(', ') || 'Todas sanas'}
            </p>
          </div>

          
        {/* DESGLOSE DETALLADO DE LAS 5 CARAS DE LA PIEZA SELECCIONADA */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Desglose Anatómico de 5 Caras — Pieza #{selectedToothNum}
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Haz clic en cualquier cara para aplicar la herramienta activa: <strong className="text-slate-900 font-bold capitalize">{SURFACE_COLORS[activeSurfaceCondition].label}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { key: 'vestibular' as const, label: 'Vestibular', sub: selectedToothNum >= 31 && selectedToothNum <= 48 ? 'Inferior (Labial)' : 'Superior (Labial)' },
              { key: 'oclusal' as const, label: 'Oclusal / Incisal', sub: 'Masticatoria / Borde' },
              { key: 'mesial' as const, label: 'Mesial', sub: 'Línea media' },
              { key: 'distal' as const, label: 'Distal', sub: 'Hacia posterior' },
              { key: 'lingual' as const, label: selectedToothNum >= 31 && selectedToothNum <= 48 ? 'Lingual' : 'Palatino', sub: selectedToothNum >= 31 && selectedToothNum <= 48 ? 'Hacia lengua' : 'Hacia paladar' },
            ].map(face => {
              const currentCond = selectedTooth.surfaces[face.key]
              const condInfo = SURFACE_COLORS[currentCond]
              return (
                <div
                  key={face.key}
                  onClick={() => handleSurfaceClick(face.key)}
                  className={cn(
                    'p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-xs select-none',
                    currentCond !== 'sano' ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-400' : 'bg-white border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{face.label}</span>
                    <span
                      className="w-3.5 h-3.5 rounded-full border shadow-2xs shrink-0"
                      style={{ backgroundColor: condInfo.fill, borderColor: condInfo.stroke }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mb-2">{face.sub}</span>
                  <span className={cn(
                    'text-[10px] font-black uppercase px-2 py-0.5 rounded-md inline-block text-center',
                    currentCond === 'sano' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-950 font-black'
                  )}>
                    {condInfo.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selector de Especialidad Odontológica */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            {(['operatoria', 'endodoncia', 'periodoncia', 'implantes', 'ortodoncia', 'cirugia'] as DentalSpecialty[]).map(spec => (
              <button
                key={spec}
                type="button"
                onClick={() => setActiveSpecialty(spec)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer',
                  activeSpecialty === spec
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Catálogo de la Especialidad Seleccionada */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TREATMENT_CATALOG[activeSpecialty].map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-amber-400 shadow-2xs flex items-center justify-between gap-3 transition-colors"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {item.name}
                </span>
                <span className="text-xs font-black text-emerald-700 font-mono mt-1 block">
                  ${item.cost.toLocaleString('es-MX')} MXN
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddTreatment(item)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Vincular</span>
              </button>
            </div>
          ))}
        </div>

        {/* Tabla de Tratamientos Vinculados y Presupuesto Dental */}
        {linkedTreatments.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs mt-4">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Tratamientos Vinculados al Expediente ({linkedTreatments.length})
                </h4>
              </div>
              <span className="text-sm font-black text-emerald-400 font-mono">
                Total Estimado: ${totalBudget.toLocaleString('es-MX')} MXN
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {linkedTreatments.map(t => (
                <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-950 font-black flex items-center justify-center shrink-0">
                      #{t.toothNumber}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 block">{t.procedure}</span>
                      <span className="text-[11px] text-slate-500 capitalize">
                        {t.specialty} • Caras: <strong className="text-slate-800">{t.surfaces}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-700">
                      ${t.estimatedCost.toLocaleString('es-MX')} MXN
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTreatment(t.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition-colors"
                      title="Eliminar del plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
