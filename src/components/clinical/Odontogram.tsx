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
    { name: 'Composite / Resina Estética 1 Cara (Oclusal/Vestibular)', cost: 850, condition: 'sano' },
    { name: 'Composite / Resina Estética 2 Caras (MO / DO)', cost: 1100, condition: 'sano' },
    { name: 'Composite / Resina Estética Compleja 3+ Caras (MOD)', cost: 1400, condition: 'sano' },
    { name: 'Crown / Incrustación Estética Cerámica / E-Max', cost: 3500, condition: 'corona' },
    { name: 'Sellador de Fosetas y Fisuras Preventivo', cost: 450, condition: 'sano' },
  ],
  endodoncia: [
    { name: 'Root Canal / Endodoncia Unirradicular', cost: 2800, condition: 'endodoncia' },
    { name: 'Root Canal / Endodoncia Birradicular', cost: 3400, condition: 'endodoncia' },
    { name: 'Root Canal / Endodoncia Molar Rotatorio', cost: 4200, condition: 'endodoncia' },
    { name: 'Poste de Fibra de Vidrio + Reconstrucción', cost: 1950, condition: 'endodoncia' },
    { name: 'Retratamiento Endodóntico Complejo', cost: 4800, condition: 'endodoncia' },
  ],
  cirugia: [
    { name: 'Extraction / Extracción Simple de Órgano Dentario', cost: 950, condition: 'extraccion_indicada' },
    { name: 'Extraction / Cirugía de Tercer Molar Incluido / Retenido', cost: 3200, condition: 'extraccion_indicada' },
    { name: 'Alveoloplastía & Regularización Ósea', cost: 1800, condition: 'extraccion_indicada' },
  ],
  implantes: [
    { name: 'Crown / Corona de Zirconia Atornillada sobre Implante', cost: 7500, condition: 'corona' },
    { name: 'Fase Quirúrgica: Implante Oseointegrado Titanio', cost: 14500, condition: 'implante' },
    { name: 'Pilar Transepitelial & Tornillo Clínico', cost: 3200, condition: 'implante' },
    { name: 'Regeneración Ósea Guiada + Membrana PRF', cost: 4500, condition: 'implante' },
  ],
  ortodoncia: [
    { name: 'Cementado de Bracket Individual', cost: 600, condition: 'bracket' },
    { name: 'Colocación de Tubo Molar / Banda', cost: 750, condition: 'bracket' },
    { name: 'Alineador Transparente (Fase Activa)', cost: 2500, condition: 'bracket' },
    { name: 'Retenedor Fijo Lingual de Alambre Trenzado', cost: 1800, condition: 'bracket' },
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
  const [activeSpecialty, setActiveSpecialty] = useState<DentalSpecialty>('operatoria')
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
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col space-y-4">
      {/* Encabezado Superior */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs flex items-center gap-1">
              <Box className="w-3.5 h-3.5" />
              <span>Visor 3D OrganUI Holográfico (2027)</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Dra. Aura Estudillo • Odontología &amp; Alta Especialidad
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Odontograma 3D Clínico &amp; Ventana Cristal
          </h2>
          <p className="text-xs text-slate-500">
            Haz clic en cualquier pieza dental o zona interproximal del modelo 3D para abrir la <strong>Ventana Cristal</strong> con el desglose anatómico de 5 caras y vinculación de tratamientos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSaveOdontogram}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{savedSuccess ? '¡Expediente Guardado!' : 'Guardar Expediente & Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Visualizador 3D Holográfico Único y Exclusivo */}
      <div className="px-4 sm:px-6 py-2">
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
          className="h-[680px] sm:h-[720px]"
        />
      </div>

      {/* SECCIÓN RESUMEN CLÍNICO: TRATAMIENTOS VINCULADOS & PRESUPUESTO */}
      <div className="p-6 border-t border-slate-200 bg-slate-50/70 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Tratamientos Vinculados al Expediente ({linkedTreatments.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidación en tiempo real sincronizada con Supabase para {patientName}.
            </p>
          </div>
          <span className="text-sm font-black text-emerald-700 font-mono bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            Presupuesto Total: ${totalBudget.toLocaleString('es-MX')} MXN
          </span>
        </div>

        {linkedTreatments.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
            Selecciona cualquier pieza en el Visor 3D superior y haz clic en <strong>+ Vincular</strong> dentro de la Ventana Cristal para añadir tratamientos al presupuesto y expediente del paciente.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {linkedTreatments.map(t => (
                <div key={t.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-950 font-black flex items-center justify-center shrink-0 shadow-2xs">
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
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      ${t.estimatedCost.toLocaleString('es-MX')} MXN
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTreatment(t.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
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
