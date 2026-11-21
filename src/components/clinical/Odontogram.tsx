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
  Box
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
  | 'resto_radicular'
  | 'tratamiento_conductos'
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

// Catálogo de Tratamientos Oficiales (Costos 2.html - Dra. Aura Estudillo)
export const TREATMENT_CATALOG: Record<DentalSpecialty, Array<{ name: string; cost: number; condition: ToothWholeCondition }>> = {
  operatoria: [
    { name: 'Diente Ausente (Registro Clínico / Agenesia)', cost: 0, condition: 'ausente' },
    { name: 'Diagnóstico de Resto Radicular', cost: 0, condition: 'resto_radicular' },
    { name: 'Resina Estética Fotocurable ($400 - $600)', cost: 500, condition: 'sano' },
    { name: 'Blanqueamiento Dental Profesional', cost: 2000, condition: 'sano' },
    { name: 'Selladores de Fosetas y Fisuras (por cuadrante)', cost: 400, condition: 'sano' },
    { name: 'Resina Infantil (Dientes Temporales)', cost: 300, condition: 'sano' },
  ],
  endodoncia: [
    { name: 'Tratamiento de Conductos (Dientes Anteriores)', cost: 1200, condition: 'tratamiento_conductos' },
    { name: 'Tratamiento de Conductos (Dientes Posteriores / Molares)', cost: 1800, condition: 'tratamiento_conductos' },
    { name: 'Retratamiento de Conductos Radiculares', cost: 2200, condition: 'tratamiento_conductos' },
    { name: 'Pulpotomía Infantil', cost: 500, condition: 'tratamiento_conductos' },
    { name: 'Pulpectomía Infantil', cost: 800, condition: 'tratamiento_conductos' },
  ],
  cirugia: [
    { name: 'Extracción de Resto Radicular ($650 - $950)', cost: 750, condition: 'resto_radicular' },
    { name: 'Cirugía de Resto Radicular Complejo', cost: 1200, condition: 'resto_radicular' },
    { name: 'Extracción Dental / Pieza Ausente ($500 - $800)', cost: 650, condition: 'ausente' },
    { name: 'Extracción Terceros Molares ($1,000 - $2,000)', cost: 1500, condition: 'extraccion_indicada' },
  ],
  implantes: [
    { name: 'Fijación de Implante Titanio Quirúrgico', cost: 9500, condition: 'implante' },
    { name: 'Pilar Transepitelial / Aditamento Protésico', cost: 1800, condition: 'implante' },
    { name: 'Corona sobre Implante (Zirconia / Porcelana)', cost: 4500, condition: 'corona' },
    { name: 'Corona Metal-Porcelana', cost: 1800, condition: 'corona' },
    { name: 'Corona Porcelana Pura', cost: 2500, condition: 'corona' },
    { name: 'Dentadura Completa (Placa Total Acrílica)', cost: 5000, condition: 'protesis' },
    { name: 'Prótesis Parcial Removible (Bilateral)', cost: 4000, condition: 'protesis' },
    { name: 'Guarda Oclusal / Férula Miorrelajante (Bruxismo)', cost: 800, condition: 'protesis' },
  ],
  ortodoncia: [
    { name: 'Guarda (Bruxismo) Acrílica Termocurada', cost: 800, condition: 'bracket' },
    { name: 'Protector Bucal Deportivo ($1,000 - $1,800)', cost: 1400, condition: 'bracket' },
    { name: 'Retenedor Essix / Placa de Alineación', cost: 1200, condition: 'bracket' },
  ],
  periodoncia: [
    { name: 'Consulta Odontológica General', cost: 300, condition: 'sano' },
    { name: 'Profilaxis con Ultrasonido', cost: 500, condition: 'sano' },
    { name: 'Profilaxis y Colocación de Flúor (Niños)', cost: 300, condition: 'sano' },
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

const ALL_FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  48, 47, 46, 45, 44, 43, 42, 41
]

function initTeethRecord(): Record<number, ToothState> {
  const rec: Record<number, ToothState> = {}
  ALL_FDI_TEETH.forEach(num => {
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

export interface OdontogramProps {
  patientId?: string
  patientName?: string
  doctorName?: string
  doctorRole?: string
  branch?: string
  initialMouthMode?: 'limpio_primera_vez' | 'trabajada_previa'
  onHistoryUpdated?: () => void
}

export function Odontogram({
  patientId,
  patientName = 'Paciente General',
  doctorName = 'Dra. Aura Estudillo',
  doctorRole = 'socio',
  branch = 'Sucursal Balbuena (Matriz)',
  initialMouthMode = 'trabajada_previa',
  onHistoryUpdated
}: OdontogramProps = {}) {
  const [teeth, setTeeth] = useState<Record<number, ToothState>>(initTeethRecord)
  const [selectedToothNum, setSelectedToothNum] = useState<number>(16)
  const [activeSpecialty, setActiveSpecialty] = useState<DentalSpecialty>('operatoria')
  const [linkedTreatments, setLinkedTreatments] = useState<LinkedTreatment[]>([])
  const [evolutionHistory, setEvolutionHistory] = useState<ClinicalEvolutionEntry[]>([])
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Cargar estado inicial limpio o persistido por paciente
  useEffect(() => {
    try {
      if (!patientId) {
        setTeeth(initTeethRecord())
        setLinkedTreatments([])
        setEvolutionHistory([])
        return
      }
      const storageKey = `audenti_odontogram_${patientId}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.teeth) setTeeth(parsed.teeth)
        if (parsed.treatments) setLinkedTreatments(parsed.treatments)
        if (parsed.evolution) setEvolutionHistory(parsed.evolution)
      } else {
        setTeeth(initTeethRecord())
        setLinkedTreatments([])
        setEvolutionHistory([])
      }
    } catch {}
  }, [patientId])

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
      doctor: doctorName,
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

  // Asignar diagnóstico clínico directo a la pieza seleccionada (Ausente, Resto Radicular, Tratamiento de Conductos)
  const handleApplyQuickConditionFromOdontogram = (
    cond: ToothWholeCondition,
    procedureName: string,
    cost: number = 0,
    specialtyName: DentalSpecialty = 'operatoria'
  ) => {
    const toothNum = selectedToothNum
    const current = teeth[toothNum] || {
      number: toothNum,
      wholeCondition: 'sano',
      surfaces: { vestibular: 'sano', lingual: 'sano', mesial: 'sano', distal: 'sano', oclusal: 'sano' },
      notes: ''
    }

    const updatedSurfaces: ToothSurfaces = cond === 'ausente'
      ? { vestibular: 'sano', lingual: 'sano', mesial: 'sano', distal: 'sano', oclusal: 'sano' }
      : current.surfaces

    setTeeth(prev => ({
      ...prev,
      [toothNum]: {
        ...current,
        wholeCondition: cond,
        surfaces: updatedSurfaces
      }
    }))

    if (cond !== 'sano') {
      handleAddTreatmentFrom3D({
        toothNumber: toothNum,
        specialty: specialtyName,
        procedure: procedureName,
        surfaces: [cond === 'ausente' ? 'Pieza Completa' : (cond === 'resto_radicular' ? 'Conducto / Raíz' : 'Conductometría')],
        notes: `Condición asignada: ${procedureName}`,
        estimatedCost: cost,
        condition: cond
      })
    }
  }

  // Guardar Odontograma de forma persistente (LocalStorage + Supabase)
  const handleSaveOdontogram = async () => {
    try {
      const payload = {
        teeth,
        treatments: linkedTreatments,
        evolution: evolutionHistory,
        updatedAt: new Date().toISOString()
      }
      if (patientId) {
        localStorage.setItem(`audenti_odontogram_${patientId}`, JSON.stringify(payload))
      }
      localStorage.setItem('audenti_odontogram_data', JSON.stringify(payload))

      if (patientId) {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: selectedToothNum,
            toothUniversal: TOOTH_BY_FDI[selectedToothNum]?.universal || 0,
            surfaces: selectedTooth.surfaces,
            condition: selectedTooth.wholeCondition,
            procedure: 'Consolidación de Odontograma General 3D',
            specialty: activeSpecialty,
            notes: selectedTooth.notes || 'Actualización y guardado general de ficha clínica',
            estimatedCost: totalBudget,
            doctorName,
            doctorRole,
            branch,
            fullTeethState: teeth
          })
        })
        if (onHistoryUpdated) {
          onHistoryUpdated()
        }
      }

      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch {}
  }

  const totalBudget = linkedTreatments.reduce((acc, t) => acc + t.estimatedCost, 0)

  return (
    <div className="bg-slate-950/80 rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col space-y-4 text-white">
      {/* Encabezado Superior */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs flex items-center gap-1">
              <Box className="w-3.5 h-3.5" />
              <span>Visor 3D OrganUI Holográfico (2027)</span>
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Dra. Aura Estudillo • Odontología &amp; Alta Especialidad
            </span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">
            Odontograma 3D Clínico &amp; Ventana Cristal
          </h2>
          <p className="text-xs text-slate-400">
            Haz clic en cualquier pieza dental o zona interproximal del modelo 3D para abrir la <strong>Ventana Cristal</strong> con el desglose anatómico de 5 caras y vinculación de tratamientos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSaveOdontogram}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>{savedSuccess ? '¡Expediente Guardado!' : 'Guardar Expediente & Supabase'}</span>
          </button>
        </div>
      </div>

      {/* BARRA DE ACCIÓN RÁPIDA NOM-004: AUSENTE, RESTO RADICULAR, TRATAMIENTO DE CONDUCTOS */}
      <div className="mx-3 sm:mx-5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-md">
            #{selectedToothNum}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">
                {TOOTH_BY_FDI[selectedToothNum]?.name || `Pieza #${selectedToothNum}`}
              </span>
              <span className={cn(
                "text-[10px] font-black uppercase px-2 py-0.5 rounded-md border",
                selectedTooth?.wholeCondition === 'ausente' ? 'bg-slate-800 text-slate-300 border-slate-700' :
                selectedTooth?.wholeCondition === 'resto_radicular' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' :
                (selectedTooth?.wholeCondition === 'tratamiento_conductos' || selectedTooth?.wholeCondition === 'endodoncia') ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              )}>
                {selectedTooth?.wholeCondition === 'tratamiento_conductos' || selectedTooth?.wholeCondition === 'endodoncia' ? 'Tratamiento de Conductos' :
                 selectedTooth?.wholeCondition === 'resto_radicular' ? 'Resto Radicular' :
                 selectedTooth?.wholeCondition === 'ausente' ? 'Ausente' :
                 (selectedTooth?.wholeCondition || 'SANO').toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Aplica diagnóstico con 1 clic:
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyQuickConditionFromOdontogram('ausente', 'Pieza Ausente', 0)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border",
              selectedTooth?.wholeCondition === 'ausente'
                ? "bg-slate-700 text-white border-slate-400 shadow-md ring-1 ring-slate-300"
                : "bg-slate-950/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800"
            )}
            title="Marcar pieza como ausente (diente extraído o agenesia)"
          >
            <span>🚫</span>
            <span>Ausente</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyQuickConditionFromOdontogram('resto_radicular', 'Extracción de Resto Radicular', 750, 'cirugia')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border",
              selectedTooth?.wholeCondition === 'resto_radicular'
                ? "bg-rose-600 text-white border-rose-300 shadow-md shadow-rose-600/30 ring-1 ring-rose-300"
                : "bg-slate-950/80 text-rose-300 border-rose-500/30 hover:border-rose-400 hover:bg-rose-950/40"
            )}
            title="Marcar como resto radicular (corona destruida, raíz remanente)"
          >
            <span>⚠️</span>
            <span>Resto Radicular</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyQuickConditionFromOdontogram('tratamiento_conductos', 'Tratamiento de Conductos (Endodoncia)', 1800, 'endodoncia')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border",
              selectedTooth?.wholeCondition === 'tratamiento_conductos' || selectedTooth?.wholeCondition === 'endodoncia'
                ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30 ring-1 ring-amber-200"
                : "bg-slate-950/80 text-amber-300 border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/40"
            )}
            title="Marcar con tratamiento de conductos (endodoncia)"
          >
            <span>⚡</span>
            <span>Tratamiento de Conductos</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyQuickConditionFromOdontogram('sano', 'Pieza Sana', 0)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Restablecer Sano
          </button>
        </div>
      </div>

      {/* Visualizador 3D Holográfico Único y Exclusivo */}
      <div className="px-3 sm:px-5 py-1">
        <Dental3DViewer
          selectedToothNum={selectedToothNum}
          onSelectTooth={setSelectedToothNum}
          teethState={teeth}
          patientId={patientId}
          patientName={patientName}
          doctorName={doctorName}
          doctorRole={doctorRole}
          branch={branch}
          initialMouthMode={initialMouthMode}
          onUpdateToothSurfaces={handleUpdateToothSurfacesFrom3D}
          onAddTreatment={handleAddTreatmentFrom3D}
          onHistoryUpdated={onHistoryUpdated}
          className="h-[680px] sm:h-[720px]"
        />
      </div>

      {/* SECCIÓN RESUMEN CLÍNICO: TRATAMIENTOS VINCULADOS & PRESUPUESTO */}
      <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-900/50 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Tratamientos Vinculados al Expediente ({linkedTreatments.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Consolidación en tiempo real sincronizada con Supabase para {patientName}.
            </p>
          </div>
          <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
            Presupuesto Total: ${totalBudget.toLocaleString('es-MX')} MXN
          </span>
        </div>

        {linkedTreatments.length === 0 ? (
          <div className="p-6 text-center bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
            Selecciona cualquier pieza en el Visor 3D superior y haz clic en <strong>+ Vincular</strong> dentro de la Ventana Cristal para añadir tratamientos al presupuesto y expediente del paciente.
          </div>
        ) : (
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
              {linkedTreatments.map(t => (
                <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs">
                      #{t.toothNumber}
                    </span>
                    <div>
                      <span className="font-bold text-white block">{t.procedure}</span>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {t.specialty} • Caras: <strong className="text-slate-200">{t.surfaces}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ${t.estimatedCost.toLocaleString('es-MX')} MXN
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTreatment(t.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
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
