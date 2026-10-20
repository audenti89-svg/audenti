'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Printer,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  ChevronLeft,
  QrCode,
  ShieldCheck,
  Stethoscope,
  Building2,
  Clock,
  Sparkles,
  Copy,
  Receipt,
  FileCheck,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react'
import { useBranchStore } from '@/stores/branchStore'
import { AudentiLogo } from '@/components/ui/AudentiLogo'

export interface PrescriptionItem {
  medication: string
  dose: string
  frequency: string
  duration: string
  indication: string
}

export interface BudgetProcedure {
  code: string
  description: string
  tooth?: string
  qty: number
  unitPrice: number
  discountPct: number
  total: number
}

// Catálogo Oficial de Procedimientos de Audenti
const CLINIC_CATALOG: { code: string; name: string; price: number }[] = [
  { code: 'VAL-00', name: 'Valoración Inicial & Diagnóstico Integral', price: 500 },
  { code: 'PRO-01', name: 'Profilaxis & Limpieza Ultrasónica con Cavitrón', price: 900 },
  { code: 'RES-01', name: 'Resina Estética Nanohíbrida 1 Superficie', price: 1100 },
  { code: 'RES-02', name: 'Resina Estética Compleja 2 o más Superficies', price: 1600 },
  { code: 'RES-04', name: 'Reconstrucción de Muñón con Poste de Fibra de Vidrio', price: 1600 },
  { code: 'END-01', name: 'Endodoncia Unirradicular Rotatoria', price: 2800 },
  { code: 'END-02', name: 'Endodoncia Birradicular Rotatoria', price: 3400 },
  { code: 'END-03', name: 'Endodoncia Multirradicular (Molares)', price: 3800 },
  { code: 'CIR-01', name: 'Extracción Simple de Pieza Dental', price: 1200 },
  { code: 'CIR-03', name: 'Cirugía de Tercer Molar (Muela del Juicio Impactada)', price: 3500 },
  { code: 'BLA-01', name: 'Blanqueamiento Dental Láser Led en Consultorio', price: 3200 },
  { code: 'COR-01', name: 'Corona de Metal-Porcelana', price: 3900 },
  { code: 'COR-02', name: 'Corona de Zirconio Monolítico Translúcido CAD/CAM', price: 5200 },
  { code: 'IMP-01', name: 'Implante Dental Titanio Grado Médico', price: 14000 },
  { code: 'ORT-01', name: 'Tratamiento de Ortodoncia Autoligado (Enganche)', price: 4500 }
]

const PRESET_PRESCRIPTIONS: Record<string, PrescriptionItem[]> = {
  'Post-Cirugía / Extracción': [
    { medication: 'Ketorolaco Trometamina', dose: '10 mg', frequency: 'Cada 8 horas', duration: '3 días', indication: 'Tomar después de los alimentos. Para dolor agudo.' },
    { medication: 'Amoxicilina / Ácido Clavulánico', dose: '500/125 mg', frequency: 'Cada 8 horas', duration: '7 días', indication: 'Antibiótico de amplio espectro. Completar ciclo.' },
    { medication: 'Clorhexidina al 0.12% colutorio', dose: '15 ml', frequency: 'Cada 12 horas', duration: '5 días', indication: 'Enjuagar suavemente sin escupir con fuerza.' },
  ],
  'Endodoncia / Pulpectomía': [
    { medication: 'Ibuprofeno', dose: '600 mg', frequency: 'Cada 8 horas', duration: '4 días', indication: 'Antiinflamatorio no esteroideo para control periapical.' },
    { medication: 'Paracetamol', dose: '500 mg', frequency: 'Cada 6 horas (en caso de dolor rescate)', duration: '3 días', indication: 'Analgésico coadyuvante.' },
  ],
  'Profilaxis / Periodoncia': [
    { medication: 'Gel de Perio-Kin (Clorhexidina 0.20%)', dose: 'Aplicación tópica', frequency: 'Cada 12 horas', duration: '7 días', indication: 'Aplicar suavemente con hisopo sobre el margen gingival.' },
  ],
}

export default function PrintPaperworkPage() {
  const router = useRouter()
  const currentBranch = useBranchStore((state) => state.getCurrentBranch())
  
  const [paperType, setPaperType] = useState<'receta' | 'presupuesto' | 'consentimiento'>('receta')
  const [copies, setCopies] = useState<number>(2) // Copia Paciente + Copia Expediente
  
  // Datos del paciente simulado o seleccionado
  const [patient, setPatient] = useState({
    name: 'Mateo Morales Ruiz',
    id: '#AUD-9821',
    age: 34,
    gender: 'Masculino',
    allergies: 'Ninguna conocida (NKDA)',
    diagnosis: 'Necrosis pulpar con periodontitis apical sintomática en Pza 16',
    date: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
  })

  // Receta estado editable dinámico
  const [selectedPreset, setSelectedPreset] = useState<string>('Post-Cirugía / Extracción')
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(PRESET_PRESCRIPTIONS['Post-Cirugía / Extracción'])
  const [clinicalNotes, setClinicalNotes] = useState('Reposo relativo por 48 horas. Evitar alimentos calientes, grasosos o con semillas. Aplicar compresas frías en las primeras 24 hrs.')
  const [ticketWidth, setTicketWidth] = useState<'letter' | 'half_letter' | 'a4' | 'a2' | '80mm' | '58mm'>('letter')
  const [isLetterhead, setIsLetterhead] = useState<boolean>(true) // true = Imprimir membrete, false = En hoja ya pre-membretada

  // Presupuesto Odontológico
  const [budgetItems, setBudgetItems] = useState<BudgetProcedure[]>([
    { code: 'END-03', description: 'Endodoncia Multirradicular (Molares)', tooth: 'Pza 16', qty: 1, unitPrice: 3800, discountPct: 0, total: 3800 },
    { code: 'RES-04', description: 'Reconstrucción de Muñón con Poste de Fibra de Vidrio', tooth: 'Pza 16', qty: 1, unitPrice: 1600, discountPct: 10, total: 1440 },
    { code: 'COR-02', description: 'Corona de Zirconio Monolítico Translúcido CAD/CAM', tooth: 'Pza 16', qty: 1, unitPrice: 5200, discountPct: 0, total: 5200 },
    { code: 'PRO-01', description: 'Profilaxis & Limpieza Ultrasónica con Cavitrón', tooth: 'Boca completa', qty: 1, unitPrice: 900, discountPct: 0, total: 900 },
  ])

  // Manejo de edición de medicamentos
  const handleUpdateMedication = (index: number, field: keyof PrescriptionItem, value: string) => {
    setPrescriptions(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleAddMedication = () => {
    setPrescriptions(prev => [
      ...prev,
      { medication: '', dose: '', frequency: '', duration: '', indication: '' }
    ])
  }

  const handleRemoveMedication = (index: number) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== index))
  }

  // Manejo de presupuesto por catálogo de servicios
  const handleAddBudgetItem = (serviceCode: string) => {
    const service = CLINIC_CATALOG.find(c => c.code === serviceCode)
    if (!service) return
    const newItem: BudgetProcedure = {
      code: service.code,
      description: service.name,
      tooth: 'Pza / Zona',
      qty: 1,
      unitPrice: service.price,
      discountPct: 0,
      total: service.price
    }
    setBudgetItems(prev => [...prev, newItem])
  }

  const handleRemoveBudgetItem = (index: number) => {
    setBudgetItems(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = budgetItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0)
  const totalBudget = budgetItems.reduce((acc, item) => acc + item.total, 0)
  const totalSavings = subtotal - totalBudget

  const handleApplyPreset = (presetName: string) => {
    setSelectedPreset(presetName)
    setPrescriptions(PRESET_PRESCRIPTIONS[presetName] || [])
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-16">
      
      {/* Barra Superior de Control (NO visible en impresión) */}
      <div className="print:hidden bg-white border border-slate-200/80 rounded-2xl p-5 mb-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
                Papelería Médica Oficial
              </span>
              <span className="text-xs text-slate-500">• {currentBranch.name}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              Generador de Documentos Clínicos &amp; Recetas
            </h1>
          </div>
        </div>

        {/* Tipo de Documento */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setPaperType('receta')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperType === 'receta'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Receta Médica
            </button>
            <button
              onClick={() => setPaperType('presupuesto')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperType === 'presupuesto'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Presupuesto Dental
            </button>
            <button
              onClick={() => setPaperType('consentimiento')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperType === 'consentimiento'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Consentimiento Informado
            </button>
          </div>

          {/* Formato de Papel Multi-Tamaño */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Papel:</span>
            <select
              value={ticketWidth}
              onChange={(e) => setTicketWidth(e.target.value as any)}
              className="bg-white px-2.5 py-1.5 rounded-lg font-bold text-slate-900 border border-slate-200 shadow-2xs outline-none cursor-pointer"
            >
              <option value="letter">Carta Oficial (216x279 mm)</option>
              <option value="half_letter">Media Carta (140x216 mm) - Recetario</option>
              <option value="a4">Tamaño A4 (210x297 mm)</option>
              <option value="a2">Tamaño A2 (Planos/Póster 420x594 mm)</option>
              <option value="80mm">Térmica 80 mm (Ticket)</option>
              <option value="58mm">Térmica 58 mm (Miniprinter)</option>
            </select>
          </div>

          {/* Toggle de Membretado Oficial vs Hoja Pre-membretada */}
          <button
            type="button"
            onClick={() => setIsLetterhead(!isLetterhead)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isLetterhead
                ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
            title="Activa o desactiva el membrete impreso para hojas que ya vienen membretadas de imprenta"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{isLetterhead ? 'Con Membrete Oficial' : 'Hoja Pre-Membretada'}</span>
          </button>

          {/* Selector de Copias */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Copias:</span>
            <select
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value={1}>1 (Solo Paciente)</option>
              <option value={2}>2 (Paciente + Expediente)</option>
            </select>
          </div>

          {/* Botón Imprimir */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Imprimir Documento
          </button>
        </div>
      </div>

      {/* Editor Interactivo Superior para la Doctora (NO visible al imprimir) */}
      <div className="print:hidden bg-slate-900 text-white rounded-2xl p-5 mb-6 border border-slate-800 space-y-4">
        {paperType === 'receta' && (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Medicamentos de la Receta (Ajuste Libre y Personalizado)
                </h3>
                <p className="text-xs text-slate-400">
                  La doctora puede escribir cualquier medicamento libremente, dosis y horarios según lo que requiera recetar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMedication}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Medicamento
              </button>
            </div>

            <div className="space-y-3">
              {prescriptions.map((med, idx) => (
                <div key={idx} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Medicamento / Sustancia</label>
                    <input
                      value={med.medication}
                      onChange={e => handleUpdateMedication(idx, 'medication', e.target.value)}
                      placeholder="Ej. Ketorolaco, Ibuprofeno..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Dosis</label>
                    <input
                      value={med.dose}
                      onChange={e => handleUpdateMedication(idx, 'dose', e.target.value)}
                      placeholder="Ej. 10 mg, 500 mg..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Frecuencia</label>
                    <input
                      value={med.frequency}
                      onChange={e => handleUpdateMedication(idx, 'frequency', e.target.value)}
                      placeholder="Ej. Cada 8 hrs..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Duración</label>
                    <input
                      value={med.duration}
                      onChange={e => handleUpdateMedication(idx, 'duration', e.target.value)}
                      placeholder="Ej. 3 días, 7 días..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Indicación</label>
                      <input
                        value={med.indication}
                        onChange={e => handleUpdateMedication(idx, 'indication', e.target.value)}
                        placeholder="Ej. Tomar con alimentos..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(idx)}
                      className="p-1.5 mt-4 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
                      title="Eliminar medicamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {paperType === 'presupuesto' && (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Procedimientos Clínicos de la Doctora (Selección desde Catálogo Oficial)
                </h3>
                <p className="text-xs text-slate-400">
                  Selecciona estrictamente dentro de los tratamientos que la doctora ofrece en Audenti.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddBudgetItem(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="bg-slate-800 text-white border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>+ Seleccionar Servicio del Catálogo...</option>
                  {CLINIC_CATALOG.map(s => (
                    <option key={s.code} value={s.code}>{s.name} — ${s.price.toLocaleString('es-MX')} MXN</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {budgetItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-amber-400 font-bold">{item.code}</span>
                    <span className="font-bold text-white">{item.description}</span>
                    <span className="text-[11px] text-slate-400">({item.tooth})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-mono font-bold">${item.total.toLocaleString('es-MX')} MXN</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBudgetItem(idx)}
                      className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600 transition-colors"
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

      {/* Selector de Plantillas Rápidas (Solo para recetas en pantalla) */}
      {paperType === 'receta' && (
        <div className="print:hidden bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">Plantillas Farmacológicas Preconfiguradas</p>
              <p className="text-[11px] text-blue-700">Carga en 1 clic combinaciones de analgésicos, antibióticos y colutorios aprobados.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(PRESET_PRESCRIPTIONS).map((name) => (
              <button
                key={name}
                onClick={() => handleApplyPreset(name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedPreset === name
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-blue-900 border border-blue-200 hover:bg-blue-100/50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ÁREA DE IMPRESIÓN (Multi-Copia si copies === 2) */}
      <div className="flex flex-col gap-8 print:gap-0 print:block">
        {Array.from({ length: copies }).map((_, copyIndex) => {
          const isExpedienteCopy = copyIndex === 1
          const copyLabel = isExpedienteCopy ? 'COPIA PARA EXPEDIENTE CLÍNICO' : 'ORIGINAL PARA EL PACIENTE'

          return (
            <div
              key={copyIndex}
              className={`bg-white rounded-2xl border border-slate-200/90 shadow-md p-8 md:p-12 mx-auto w-full text-slate-900 relative print:border-none print:shadow-none print:m-0 print:w-full transition-all duration-300 ${
                ticketWidth === '80mm'
                  ? 'max-w-[80mm] print:max-w-[80mm] p-4 text-xs font-mono'
                  : ticketWidth === 'half_letter'
                  ? 'max-w-2xl print:max-w-none p-6 text-xs'
                  : 'max-w-4xl print:max-w-none print:p-8'
              } ${
                copyIndex > 0 ? 'print:break-before-page mt-8 print:mt-0' : ''
              }`}
              style={{ minHeight: ticketWidth === '80mm' ? 'auto' : '270mm' }}
            >
              {/* Marca de agua de copia */}
              <div className="absolute top-4 right-8 text-[11px] font-mono tracking-widest text-slate-400 font-bold uppercase print:text-slate-500">
                [{copyLabel}]
              </div>

              {/* ENCABEZADO MEMBRETADO CORPORATIVO (Se oculta si la doctora usa hojas ya pre-membretadas de imprenta) */}
              {isLetterhead ? (
                <header className="border-b-2 border-slate-900 pb-6 mb-6">
                  <div className="flex items-start justify-between gap-6">
                    {/* Identidad de la Clínica Oficial AUDENTI */}
                    <div className="flex items-center gap-4">
                      <AudentiLogo size={58} variant="icon" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black text-slate-950 tracking-tight">AUDENTI CLINICAL</h2>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950 uppercase tracking-widest">
                            OFICIAL
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                          Clínica de Especialidades Odontológicas &amp; Cirugía Maxilofacial
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {currentBranch.name} • {currentBranch.code}
                          </span>
                          <span>•</span>
                          <span>Tel: {currentBranch.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Datos Profesionales de la Dra. Aura Estudillo */}
                    <div className="text-right shrink-0">
                      <h3 className="text-base font-bold text-slate-950">Dra. Aura Estudillo</h3>
                      <p className="text-xs font-semibold text-amber-700">Cirujana Dentista &amp; Odontología Estética</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">Cédula Profesional: 8492019</p>
                      <p className="text-[10px] text-slate-400 font-mono">Reg. SSA / COFEPRIS: 24-DF-0921-A</p>
                    </div>
                  </div>
                </header>
              ) : (
                <div className="h-28 print:h-28 flex items-center justify-center border border-dashed border-slate-300 rounded-xl mb-6 text-slate-400 text-xs print:border-none print:text-transparent">
                  [Espacio reservado para el membrete oficial pre-impreso de la clínica]
                </div>
              )}

              {/* FICHA TÉCNICA DEL PACIENTE */}
              <section className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Paciente: </span>
                    <span className="font-bold text-slate-900 block">{patient.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Folio / Edad: </span>
                    <span className="font-semibold text-slate-800 block">{patient.id} • {patient.age} años</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Fecha: </span>
                    <span className="font-semibold text-slate-800 block">{patient.date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase">Alergias: </span>
                    <span className="font-bold text-slate-800 block">{patient.allergies}</span>
                  </div>
                </div>
              </section>

              {/* CUERPO 1: RECETA MÉDICA CON AUTO-AJUSTE DINÁMICO */}
              {paperType === 'receta' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <span className="text-xl font-serif font-black text-slate-950 italic">Rx /</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Prescripción Farmacológica</span>
                  </div>

                  <div className="space-y-3">
                    {prescriptions.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white break-inside-avoid">
                        <div className="flex items-baseline justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-black text-slate-900">{item.medication || 'Medicamento prescrito'}</span>
                            {item.dose && (
                              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {item.dose}
                              </span>
                            )}
                          </div>
                          {item.duration && <span className="text-xs font-bold text-slate-700">Por {item.duration}</span>}
                        </div>
                        {item.frequency && (
                          <p className="text-xs font-semibold text-slate-800 ml-7">
                            • Posología: <strong>{item.frequency}</strong>
                          </p>
                        )}
                        {item.indication && (
                          <p className="text-[11px] text-slate-500 ml-7 italic mt-0.5">
                            Indicación: {item.indication}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Indicaciones Generales */}
                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/80 break-inside-avoid">
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide mb-1">
                      Cuidados &amp; Recomendaciones Clínicas
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {clinicalNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* CUERPO 2: PRESUPUESTO FORMAL ODONTOLÓGICO */}
              {paperType === 'presupuesto' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Presupuesto Detallado de Tratamiento Dental
                    </h3>
                    <span className="text-xs text-slate-500">Validez del presupuesto: 30 días naturales</span>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-300 text-[11px] font-bold uppercase text-slate-500">
                        <th className="py-2.5">Código</th>
                        <th className="py-2.5">Procedimiento / Fase Clínica</th>
                        <th className="py-2.5 text-center">Unidad</th>
                        <th className="py-2.5 text-right">Precio Unit.</th>
                        <th className="py-2.5 text-right">Desc.</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budgetItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-3 font-mono font-bold text-slate-500">{item.code}</td>
                          <td className="py-3">
                            <span className="font-bold text-slate-900 block">{item.description}</span>
                            {item.tooth && <span className="text-[10px] text-amber-700 font-semibold">{item.tooth}</span>}
                          </td>
                          <td className="py-3 text-center font-bold text-slate-700">{item.qty}</td>
                          <td className="py-3 text-right text-slate-600">${item.unitPrice.toLocaleString('es-MX')}</td>
                          <td className="py-3 text-right text-emerald-600 font-bold">{item.discountPct > 0 ? `${item.discountPct}%` : '-'}</td>
                          <td className="py-3 text-right font-black text-slate-900">${item.total.toLocaleString('es-MX')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Resumen Financiero */}
                  <div className="flex justify-end pt-3 border-t border-slate-300">
                    <div className="w-72 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal Arancelario:</span>
                        <span>${subtotal.toLocaleString('es-MX')} MXN</span>
                      </div>
                      {totalSavings > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Descuento de Franquicia:</span>
                          <span>-${totalSavings.toLocaleString('es-MX')} MXN</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-900">
                        <span>Inversión Total:</span>
                        <span>${totalBudget.toLocaleString('es-MX')} MXN</span>
                      </div>
                      <p className="text-[10px] text-slate-400 text-right pt-0.5">
                        * Aceptamos pagos diferidos a 3, 6 y 12 MSI con tarjetas participantes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CUERPO 3: CONSENTIMIENTO INFORMADO */}
              {paperType === 'consentimiento' && (
                <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Consentimiento Informado para Tratamiento Dental
                    </h3>
                  </div>

                  <p>
                    Por medio del presente documento, yo <strong>{patient.name}</strong>, en pleno uso de mis facultades mentales,
                    hago constar que he sido ampliamente informado(a) por el profesional <strong>{currentBranch.doctorInCharge}</strong> sobre
                    la naturaleza, objetivos, beneficios esperados, riesgos potenciales y alternativas del tratamiento propuesto para <strong>{patient.diagnosis}</strong>.
                  </p>

                  <p>
                    Se me ha explicado con claridad que la práctica odontológica y quirúrgica no es una ciencia exacta y que, a pesar
                    de la diligencia profesional y los estándares de esterilización, pueden presentarse imprevistos como inflamación,
                    hematomas, molestia temporal, o necesidad de procedimientos complementarios.
                  </p>

                  <p>
                    Me comprometo a seguir estrictamente las indicaciones de higiene, posología de medicamentos y cuidados posoperatorios
                    prescritos, así como a acudir a las citas de control y revisión periódicas.
                  </p>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600">
                    Otorgo mi libre y voluntario consentimiento para que se realicen los procedimientos clínicos y toma de radiografías/fotografías diagnósticas necesarias.
                  </div>
                </div>
              )}

              {/* PIE DE PÁGINA MEMBRETADO CON FIRMAS Y CÓDIGO QR */}
              <footer className="mt-16 pt-8 border-t-2 border-slate-900 print:mt-12 break-inside-avoid">
                <div className="grid grid-cols-3 gap-6 items-end">
                  {/* Firma del Médico */}
                  <div className="text-center space-y-1">
                    <div className="h-14 border-b border-slate-400 flex items-end justify-center pb-1">
                      <span className="text-xs font-serif italic text-slate-600 font-bold">Firma Autógrafa &amp; Sello</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1">Dra. Aura Estudillo</p>
                    <p className="text-[10px] text-slate-500">C.D. Especialista • Céd. Prof. 8492019</p>
                  </div>

                  {/* Firma del Paciente / Tutor */}
                  <div className="text-center space-y-1">
                    <div className="h-14 border-b border-slate-400 flex items-end justify-center pb-1">
                      <span className="text-xs font-serif italic text-slate-600 font-bold">Acepto Conformidad</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1">{patient.name}</p>
                    <p className="text-[10px] text-slate-500">Firma del Paciente o Tutor Legal</p>
                  </div>

                  {/* Verificación QR COFEPRIS / Validador */}
                  <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <QrCode className="w-12 h-12 text-slate-900 mb-1" />
                    <span className="text-[9px] font-mono font-bold text-slate-600 block uppercase">
                      ID: {patient.id}-2026-VAL
                    </span>
                    <span className="text-[8px] text-slate-400">Verificación Digital Inmutable</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 mt-8">
                  DentalCloud Pro • Dirección General y Clínica de la Dra. Aura Estudillo • Sede: {currentBranch.name} • {currentBranch.address}
                </div>
              </footer>
            </div>
          )
        })}
      </div>

    </div>
  )
}
