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
  AlertCircle,
  Box,
  X
} from 'lucide-react'
import { Dental3DViewer } from '@/components/clinical/Dental3DViewer'
import { TOOTH_BY_FDI } from '@/lib/dental-anatomy'

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
export const SURFACE_COLORS: Record<SurfaceCondition, { fill: string; stroke: string; label: string }> = {
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

export interface OdontogramProps {
  patientId?: string
  patientName?: string
  doctorName?: string
  doctorRole?: string
  branch?: string
  onHistoryUpdated?: () => void
}

export function Odontogram({
  patientId,
  patientName = 'Paciente General',
  doctorName = 'Dra. Aura Estudillo',
  doctorRole = 'socio',
  branch = 'Sucursal Balbuena (Matriz)',
  onHistoryUpdated
}: OdontogramProps = {}) {
  const [teeth, setTeeth] = useState<Record<number, ToothState>>(initTeethRecord)
  const [selectedToothNum, setSelectedToothNum] = useState<number>(16)
  const [dentition, setDentition] = useState<'adult' | 'pediatric'>('adult')
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
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

  // Modal Flotante Modo Cristal para Vista 2D (Glassmorphism)
  const [modal2DOpen, setModal2DOpen] = useState(false)
  const [modal2DTool, setModal2DTool] = useState<SurfaceCondition>('caries')
  const [modal2DSpecialty, setModal2DSpecialty] = useState<DentalSpecialty>('operatoria')
  const [modal2DNotes, setModal2DNotes] = useState('')
  const [modal2DCost, setModal2DCost] = useState(850)
  const [isPersisting2D, setIsPersisting2D] = useState(false)
  const [save2DSuccess, setSave2DSuccess] = useState(false)

  const handleOpen2DModalForTooth = (num: number) => {
    setSelectedToothNum(num)
    const t = teeth[num]
    const tax = TOOTH_BY_FDI[num]
    setModal2DNotes(t?.notes || `Tratamiento en pieza FDI #${num} (Universal #${tax?.universal || '?'}) — ${tax?.name || 'Órgano Dentario'}`)
    setModal2DCost(850)
    setModal2DOpen(true)
  }

  const handleClose2DModal = () => {
    setModal2DOpen(false)
  }

  const handleApplyFaceCondition2D = async (face: keyof ToothSurfaces, conditionToApply?: SurfaceCondition) => {
    const cond = conditionToApply || modal2DTool
    const curr = teeth[selectedToothNum] || {
      number: selectedToothNum,
      wholeCondition: 'sano',
      surfaces: { vestibular: 'sano', lingual: 'sano', mesial: 'sano', distal: 'sano', oclusal: 'sano' },
      notes: ''
    }
    const updatedSurfaces: ToothSurfaces = {
      ...curr.surfaces,
      [face]: cond
    }

    setTeeth(prev => ({
      ...prev,
      [selectedToothNum]: {
        ...curr,
        surfaces: updatedSurfaces
      }
    }))

    if (patientId) {
      try {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: selectedToothNum,
            toothUniversal: TOOTH_BY_FDI[selectedToothNum]?.universal || 0,
            surfaces: updatedSurfaces,
            condition: curr.wholeCondition,
            procedure: `Ajuste en cara ${face.toUpperCase()} (${cond})`,
            specialty: modal2DSpecialty,
            notes: modal2DNotes,
            estimatedCost: modal2DCost,
            doctorName,
            doctorRole,
            branch
          })
        })
        if (onHistoryUpdated) {
          onHistoryUpdated()
        }
      } catch (err) {
        console.warn('Error al persistir ajuste de cara:', err)
      }
    }
  }

  const handleLinkProcedure2D = async (proc: { name: string; cost: number; condition: ToothWholeCondition }) => {
    setIsPersisting2D(true)
    const curr = teeth[selectedToothNum] || {
      number: selectedToothNum,
      wholeCondition: 'sano',
      surfaces: { vestibular: 'sano', lingual: 'sano', mesial: 'sano', distal: 'sano', oclusal: 'sano' },
      notes: ''
    }
    const updatedSurfaces = { ...curr.surfaces }
    if (proc.condition === 'sano' && proc.name.includes('Resina')) {
      if (proc.name.includes('1 Cara')) updatedSurfaces.oclusal = 'resina'
      else if (proc.name.includes('2 Caras')) { updatedSurfaces.oclusal = 'resina'; updatedSurfaces.mesial = 'resina' }
      else if (proc.name.includes('3+ Caras')) { updatedSurfaces.oclusal = 'resina'; updatedSurfaces.mesial = 'resina'; updatedSurfaces.distal = 'resina' }
    }

    const updatedCondition = proc.condition !== 'sano' ? proc.condition : curr.wholeCondition

    setTeeth(prev => ({
      ...prev,
      [selectedToothNum]: {
        ...curr,
        surfaces: updatedSurfaces,
        wholeCondition: updatedCondition
      }
    }))

    const treatedFaces = Object.entries(updatedSurfaces).filter(([_, c]) => c !== 'sano').map(([f]) => f)

    const newTreatment: LinkedTreatment = {
      id: `treat-${Date.now()}-${Math.random()}`,
      toothNumber: selectedToothNum,
      specialty: modal2DSpecialty,
      procedure: proc.name,
      surfaces: treatedFaces.join(', ') || 'General',
      notes: modal2DNotes || `Procedimiento vinculado: ${proc.name}`,
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
      doctor: doctorName,
      procedure: proc.name,
      surfaces: treatedFaces.join(', ') || 'General',
      status: 'En Proceso',
      notes: modal2DNotes || `Procedimiento registrado para pieza #${selectedToothNum}`
    }
    setEvolutionHistory(prev => [newEvo, ...prev])

    if (patientId) {
      try {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: selectedToothNum,
            toothUniversal: TOOTH_BY_FDI[selectedToothNum]?.universal || 0,
            surfaces: updatedSurfaces,
            condition: updatedCondition,
            procedure: proc.name,
            specialty: modal2DSpecialty,
            notes: modal2DNotes || `Tratamiento registrado en pieza #${selectedToothNum}`,
            estimatedCost: proc.cost,
            doctorName,
            doctorRole,
            branch
          })
        })
        if (onHistoryUpdated) {
          onHistoryUpdated()
        }
      } catch (err) {
        console.warn('Error al persistir procedimiento en Supabase:', err)
      }
    }

    setIsPersisting2D(false)
    setSave2DSuccess(true)
    setTimeout(() => setSave2DSuccess(false), 1800)
  }

  const handleSaveModal2DData = async () => {
    setIsPersisting2D(true)
    const curr = teeth[selectedToothNum]
    if (patientId) {
      try {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: selectedToothNum,
            toothUniversal: TOOTH_BY_FDI[selectedToothNum]?.universal || 0,
            surfaces: curr.surfaces,
            condition: curr.wholeCondition,
            procedure: `Actualización clínica de pieza #${selectedToothNum}`,
            specialty: modal2DSpecialty,
            notes: modal2DNotes,
            estimatedCost: modal2DCost,
            doctorName,
            doctorRole,
            branch,
            fullTeethState: teeth
          })
        })
        if (onHistoryUpdated) {
          onHistoryUpdated()
        }
      } catch (err) {
        console.warn('Error al guardar en Supabase:', err)
      }
    }
    setIsPersisting2D(false)
    setSave2DSuccess(true)
    setTimeout(() => {
      setSave2DSuccess(false)
      setModal2DOpen(false)
    }, 1200)
  }

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

  // Cargar odontograma específico del paciente desde Supabase si se proporciona patientId
  useEffect(() => {
    if (!patientId) return
    const fetchPatientOdontogram = async () => {
      try {
        const res = await fetch(`/api/clinical/odontogram?patientId=${patientId}`)
        if (res.ok) {
          const json = await res.json()
          if (json.data?.teeth) {
            setTeeth(json.data.teeth)
          }
          if (json.data?.evolution && json.data.evolution.length > 0) {
            setEvolutionHistory(json.data.evolution)
          }
        }
      } catch (err) {
        console.warn('Error fetching patient odontogram from Supabase:', err)
      }
    }
    fetchPatientOdontogram()
  }, [patientId])

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

  // Sincronización desde la Ventana Cristal 3D
  const handleUpdateToothSurfacesFrom3D = (
    toothNum: number,
    surfaces: Partial<ToothSurfaces>,
    wholeCondition?: ToothWholeCondition | string
  ) => {
    setTeeth(prev => {
      const current = prev[toothNum] || {
        number: toothNum,
        wholeCondition: 'sano',
        surfaces: { vestibular: 'sano', lingual: 'sano', mesial: 'sano', distal: 'sano', oclusal: 'sano' },
        notes: ''
      }
      return {
        ...prev,
        [toothNum]: {
          ...current,
          surfaces: { ...current.surfaces, ...surfaces },
          wholeCondition: (wholeCondition as ToothWholeCondition) || current.wholeCondition
        }
      }
    })
  }

  const handleAddTreatmentFrom3D = (treatment: {
    toothNumber: number
    specialty: string
    procedure: string
    surfaces: string[]
    notes: string
    estimatedCost: number
    condition?: any
  }) => {
    const newTreatment: LinkedTreatment = {
      id: `treat-${Date.now()}-${Math.random()}`,
      toothNumber: treatment.toothNumber,
      specialty: (treatment.specialty as any) || 'operatoria',
      procedure: treatment.procedure,
      surfaces: treatment.surfaces.join(', '),
      notes: treatment.notes,
      estimatedCost: treatment.estimatedCost
    }
    setLinkedTreatments(prev => [...prev, newTreatment])

    const nowStr = new Intl.DateTimeFormat('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date())

    const newEvo: ClinicalEvolutionEntry = {
      id: `evo-${Date.now()}`,
      toothNumber: treatment.toothNumber,
      date: nowStr,
      doctor: 'Dra. Aura Estudillo',
      procedure: treatment.procedure,
      surfaces: treatment.surfaces.join(', '),
      status: 'En Proceso',
      notes: treatment.notes || `Procedimiento registrado desde visor 3D para pieza #${treatment.toothNumber}`
    }
    setEvolutionHistory(prev => [newEvo, ...prev])

    if (treatment.condition && treatment.condition !== 'sano') {
      setTeeth(prev => ({
        ...prev,
        [treatment.toothNumber]: {
          ...prev[treatment.toothNumber],
          wholeCondition: treatment.condition as any
        }
      }))
    }
  }

  // Guardar Odontograma de forma persistente (LocalStorage + Supabase)
  const handleSaveOdontogram = async () => {
    try {
      localStorage.setItem('audenti_odontogram_data', JSON.stringify({
        teeth,
        treatments: linkedTreatments,
        evolution: evolutionHistory,
        updatedAt: new Date().toISOString()
      }))

      if (patientId) {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: selectedToothNum,
            surfaces: selectedTooth.surfaces,
            condition: selectedTooth.wholeCondition,
            procedure: 'Consolidación de Odontograma General',
            specialty: activeSpecialty,
            notes: selectedTooth.notes || 'Actualización y guardado general de ficha clínica',
            estimatedCost: totalBudget,
            doctorRole,
            branch,
            fullTeethState: teeth
          })
        })
      }

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
          {/* Conmutador 2D / 3D */}
          <div className="flex p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                viewMode === '3d'
                  ? 'bg-slate-950 text-amber-400 shadow-md font-black ring-2 ring-amber-400/50'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="Arcada Dental 3D OrganUI BodyParts3D con Detección Interproximal"
            >
              <Box className="w-4 h-4 text-amber-400" />
              <span>Visor 3D OrganUI</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === '2d' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Diagrama 2D
            </button>
          </div>

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

      {/* Paleta de Caras y Condiciones (Solo visible en Modo 2D) */}
      {viewMode === '2d' && (
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
      )}

      {/* Visualizador 3D Dental o Diagrama 2D */}
      {viewMode === '3d' ? (
        <div className="px-6 py-2">
          <Dental3DViewer
            selectedToothNum={selectedToothNum}
            onSelectTooth={setSelectedToothNum}
            teethState={teeth}
            patientId={patientId}
            patientName={patientName}
            doctorName={doctorName}
            doctorRole={doctorRole}
            branch={branch}
            onUpdateToothSurfaces={handleUpdateToothSurfacesFrom3D}
            onAddTreatment={handleAddTreatmentFrom3D}
            onHistoryUpdated={onHistoryUpdated}
          />
        </div>
      ) : (
      /* Diagrama Odontológico Completo (Superior e Inferior) */
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
                    onSelectTooth={handleOpen2DModalForTooth}
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
                    onSelectTooth={handleOpen2DModalForTooth}
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
                    onSelectTooth={handleOpen2DModalForTooth}
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
                    onSelectTooth={handleOpen2DModalForTooth}
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
                    onSelectTooth={handleOpen2DModalForTooth}
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
                    onSelectTooth={handleOpen2DModalForTooth}
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
                    onSelectTooth={handleOpen2DModalForTooth}
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
                    onSelectTooth={handleOpen2DModalForTooth}
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

      )}

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

      {/* =========================================================================
          VENTANA FLOTANTE MODO CRISTAL (GLASSMORPHISM) PARA SELECCIÓN EN 2D
      ========================================================================= */}
      {modal2DOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[94%] overflow-y-auto bg-slate-900/90 backdrop-blur-2xl border-2 border-amber-400/60 shadow-[0_0_60px_rgba(245,158,11,0.25)] rounded-3xl p-5 sm:p-6 text-white space-y-5">
            {/* Notificación de Sincronización en Supabase */}
            {save2DSuccess && (
              <div className="absolute top-4 right-16 z-50 px-4 py-2 rounded-xl bg-emerald-500/95 text-white text-xs font-black shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Sincronizado en Supabase y Expediente</span>
              </div>
            )}

            {/* ENCABEZADO CON IDENTIFICACIÓN DUAL */}
            {(() => {
              const tax = TOOTH_BY_FDI[selectedToothNum]
              const curr = teeth[selectedToothNum] || { wholeCondition: 'sano', surfaces: { vestibular: 'sano', lingual: 'sano', mesial: 'sano', distal: 'sano', oclusal: 'sano' } }
              const isLower = selectedToothNum >= 31 && selectedToothNum <= 48
              return (
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-700/80">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="px-2.5 py-0.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs shadow-xs">
                        UNS #{tax?.universal || '?'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                        FDI #{selectedToothNum}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          Ventana Cristal Anatómica
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {isLower ? 'Mandíbula Inferior' : 'Maxilar Superior'} • Cuadrante {tax?.quadrant || 1} FDI
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {curr.wholeCondition.toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white mt-0.5">
                        {tax?.name || `Pieza Dental #${selectedToothNum}`}
                      </h3>

                      <p className="text-xs text-slate-400">
                        Expediente: <strong className="text-slate-200">{patientName}</strong> • Sucursal: <strong className="text-amber-300">{branch}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose2DModal}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Cerrar ventana cristal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )
            })()}

            {/* CUERPO PRINCIPAL: 2 COLUMNAS (5 CARAS ANATÓMICAS + ESPECIALIDADES) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* COLUMNA IZQUIERDA: ZOOM ANATÓMICO DE 5 CARAS */}
              <div className="lg:col-span-6 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Desglose Anatómico de 5 Caras
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Clic en cara para aplicar</span>
                </div>

                {/* Paleta rápida de condiciones activas */}
                <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800">
                  {(['caries', 'resina', 'amalgama', 'sellador', 'fractura', 'incrustacion', 'sano'] as SurfaceCondition[]).map(cond => {
                    const info = SURFACE_COLORS[cond]
                    const isActive = modal2DTool === cond
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setModal2DTool(cond)}
                        className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1',
                          isActive
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                            : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: info.fill, borderColor: info.stroke }} />
                        <span>{info.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Las 5 Caras Anatómicas con Tarjetas Detalladas */}
                <div className="space-y-2">
                  {(() => {
                    const tax = TOOTH_BY_FDI[selectedToothNum]
                    const curr = teeth[selectedToothNum] || { surfaces: { vestibular: 'sano', lingual: 'sano', mesial: 'sano', distal: 'sano', oclusal: 'sano' } }
                    return [
                      { key: 'vestibular' as const, label: 'Vestibular / Bucal', sub: selectedToothNum >= 31 && selectedToothNum <= 48 ? 'Inferior (Labial)' : 'Superior (Labial)' },
                      { key: 'oclusal' as const, label: tax?.isAnterior ? 'Incisal' : 'Oclusal', sub: tax?.isAnterior ? 'Borde de corte incisal' : 'Superficie masticatoria' },
                      { key: 'mesial' as const, label: 'Mesial', sub: 'Hacia línea media dental' },
                      { key: 'distal' as const, label: 'Distal', sub: 'Hacia zona posterior' },
                      { key: 'lingual' as const, label: selectedToothNum >= 31 && selectedToothNum <= 48 ? 'Lingual' : 'Palatino', sub: selectedToothNum >= 31 && selectedToothNum <= 48 ? 'Hacia lengua' : 'Hacia paladar' }
                    ].map(face => {
                      const currentCond = curr.surfaces[face.key]
                      const info = SURFACE_COLORS[currentCond]
                      return (
                        <div
                          key={face.key}
                          onClick={() => handleApplyFaceCondition2D(face.key)}
                          className={cn(
                            'p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none',
                            currentCond !== 'sano'
                              ? 'bg-slate-900 border-amber-400/80 shadow-xs shadow-amber-500/10'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border shadow-2xs shrink-0"
                              style={{ backgroundColor: info.fill, borderColor: info.stroke }}
                            />
                            <div>
                              <span className="text-xs font-bold text-white block">{face.label}</span>
                              <span className="text-[10px] text-slate-400 block">{face.sub}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-[10px] font-black uppercase px-2 py-0.5 rounded-md',
                              currentCond === 'sano' ? 'bg-slate-800 text-slate-400' : 'bg-amber-400 text-slate-950 font-black'
                            )}>
                              {info.label}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* COLUMNA DERECHA: ESPECIALIDADES & CATÁLOGO */}
              <div className="lg:col-span-6 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Especialidades &amp; Procedimientos
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">Autoguardado en Supabase</span>
                  </div>

                  {/* Tabs de Especialidades */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-3">
                    {(['operatoria', 'endodoncia', 'periodoncia', 'implantes', 'ortodoncia', 'cirugia'] as DentalSpecialty[]).map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => setModal2DSpecialty(spec)}
                        className={cn(
                          'py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer text-center',
                          modal2DSpecialty === spec
                            ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        )}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>

                  {/* Procedimientos vinculables */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {TREATMENT_CATALOG[modal2DSpecialty].map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 hover:border-amber-400/60 transition-colors flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div>
                          <span className="text-xs font-bold text-white block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-xs font-black text-emerald-400 font-mono block mt-0.5">
                            ${item.cost.toLocaleString('es-MX')} MXN
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLinkProcedure2D(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                          title="Vincular a esta pieza y sincronizar con Supabase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Vincular</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NOTAS Y PRESUPUESTO */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Notas Clínicas</label>
                      <input
                        type="text"
                        value={modal2DNotes}
                        onChange={(e) => setModal2DNotes(e.target.value)}
                        placeholder="Observación clínica..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Costo ($MXN)</label>
                      <input
                        type="number"
                        value={modal2DCost}
                        onChange={(e) => setModal2DCost(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold focus:outline-hidden focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE PIE DE MODAL */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Profesional: <strong>{doctorName}</strong> ({doctorRole.toUpperCase()}) • Supabase Live Sync</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose2DModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={handleSaveModal2DData}
                  disabled={isPersisting2D}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isPersisting2D ? 'Guardando en Supabase...' : 'Guardar en Expediente & Supabase'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
