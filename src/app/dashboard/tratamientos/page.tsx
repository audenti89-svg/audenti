'use client'

import { useState } from 'react'
import {
  Stethoscope,
  Plus,
  Search,
  Clock,
  Sparkles,
  Tag,
  CheckCircle2,
  SlidersHorizontal,
  Baby,
  Smile,
  ShieldCheck,
  FileText
} from 'lucide-react'

interface TreatmentItem {
  id: string
  code: string
  name: string
  category: string
  price: number
  priceDisplay: string
  costEstimate: number
  durationMin: number
  commissionPct: number
  description: string
  active: boolean
  isPediatric?: boolean
}

export default function TratamientosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCat, setSelectedCat] = useState('all')

  // CATÁLOGO CLÍNICO OFICIAL DE PRECIOS - AUDENTI (DRA. AURA ESTUDILLO)
  // Basado estrictamente en Documentos/Costos/Costos 2.html
  const treatments: TreatmentItem[] = [
    // ── ADULTOS Y GENERAL ──
    {
      id: 'tx-1',
      code: 'TX-CONS-01',
      name: 'Consulta Odontológica General',
      category: 'Diagnóstico & Prevención',
      price: 300,
      priceDisplay: '$300 MXN',
      costEstimate: 50,
      durationMin: 30,
      commissionPct: 10,
      description: 'Valoración diagnóstica inicial, historia clínica estomatológica y plan de tratamiento integral.',
      active: true,
    },
    {
      id: 'tx-2',
      code: 'TX-PREV-01',
      name: 'Profilaxis con Ultrasonido',
      category: 'Diagnóstico & Prevención',
      price: 500,
      priceDisplay: '$500 MXN',
      costEstimate: 80,
      durationMin: 45,
      commissionPct: 10,
      description: 'Detartraje ultrasónico supragingival y pulido profiláctico dental con pasta fluorada.',
      active: true,
    },
    {
      id: 'tx-3',
      code: 'TX-OPER-01',
      name: 'Resina Estética Fotocurable',
      category: 'Operatoria & Estética',
      price: 500,
      priceDisplay: '$400 - $600 MXN',
      costEstimate: 120,
      durationMin: 45,
      commissionPct: 10,
      description: 'Restauración dental estética con resina compuesta de alta resistencia ($400 a $600 según cavidad).',
      active: true,
    },
    {
      id: 'tx-4',
      code: 'TX-ENDO-01',
      name: 'Endodoncia Dientes Posteriores',
      category: 'Endodoncia',
      price: 1800,
      priceDisplay: '$1,800 MXN',
      costEstimate: 350,
      durationMin: 75,
      commissionPct: 12,
      description: 'Tratamiento biomecánico y obturación tridimensional de conductos en molares y premolares.',
      active: true,
    },
    {
      id: 'tx-5',
      code: 'TX-ENDO-02',
      name: 'Endodoncia Dientes Anteriores',
      category: 'Endodoncia',
      price: 1200,
      priceDisplay: '$1,200 MXN',
      costEstimate: 250,
      durationMin: 60,
      commissionPct: 12,
      description: 'Terapia de conducto radicular en dientes unirradiculares (incisivos y caninos).',
      active: true,
    },
    {
      id: 'tx-6',
      code: 'TX-CIRU-01',
      name: 'Extracción Terceros Molares',
      category: 'Cirugía & Exodoncia',
      price: 1500,
      priceDisplay: '$1,000 - $2,000 MXN',
      costEstimate: 300,
      durationMin: 60,
      commissionPct: 15,
      description: 'Cirugía de muela del juicio ($1,000 a $2,000 según grado de inclusión, erupción o retención ósea).',
      active: true,
    },
    {
      id: 'tx-7',
      code: 'TX-CIRU-02',
      name: 'Extracción Dental',
      category: 'Cirugía & Exodoncia',
      price: 650,
      priceDisplay: '$500 - $800 MXN',
      costEstimate: 120,
      durationMin: 45,
      commissionPct: 10,
      description: 'Exodoncia de órgano dentario simple o con osteotomía leve ($500 a $800 según complejidad).',
      active: true,
    },
    {
      id: 'tx-8',
      code: 'TX-PROT-01',
      name: 'Corona Metal-Porcelana',
      category: 'Prótesis & Rehabilitación',
      price: 1800,
      priceDisplay: '$1,800 MXN',
      costEstimate: 500,
      durationMin: 60,
      commissionPct: 10,
      description: 'Prótesis dental fija con cofia metálica colada y recubrimiento de porcelana de alta estética.',
      active: true,
    },
    {
      id: 'tx-9',
      code: 'TX-PROT-02',
      name: 'Corona Porcelana',
      category: 'Prótesis & Rehabilitación',
      price: 2500,
      priceDisplay: '$2,500 MXN',
      costEstimate: 700,
      durationMin: 60,
      commissionPct: 10,
      description: 'Rehabilitación protésica estética libre de metal con máxima translucidez y biocompatibilidad.',
      active: true,
    },
    {
      id: 'tx-10',
      code: 'TX-PROT-03',
      name: 'Dentadura Completa',
      category: 'Prótesis & Rehabilitación',
      price: 5000,
      priceDisplay: '$5,000 MXN',
      costEstimate: 1400,
      durationMin: 60,
      commissionPct: 10,
      description: 'Prótesis total removible mucosoportada superior o inferior ajustada a la oclusión del paciente.',
      active: true,
    },
    {
      id: 'tx-11',
      code: 'TX-PROT-04',
      name: 'Prótesis Parcial Removible',
      category: 'Prótesis & Rehabilitación',
      price: 4000,
      priceDisplay: '$4,000 MXN',
      costEstimate: 1100,
      durationMin: 60,
      commissionPct: 10,
      description: 'Estructura protésica removible metálica o de acrílico para reemplazo de órganos ausentes.',
      active: true,
    },
    {
      id: 'tx-12',
      code: 'TX-FERU-01',
      name: 'Guarda (Bruxismo)',
      category: 'Férulas & Protectores',
      price: 800,
      priceDisplay: '$800 MXN',
      costEstimate: 200,
      durationMin: 30,
      commissionPct: 10,
      description: 'Férula oclusal mio-relajante rígida o semirrígida para control y protección del bruxismo.',
      active: true,
    },
    {
      id: 'tx-13',
      code: 'TX-ESTE-01',
      name: 'Blanqueamiento Dental',
      category: 'Operatoria & Estética',
      price: 2000,
      priceDisplay: '$2,000 MXN',
      costEstimate: 400,
      durationMin: 60,
      commissionPct: 10,
      description: 'Aclaramiento dental profesional en clínica con agente clareador fotoactivado.',
      active: true,
    },
    {
      id: 'tx-14',
      code: 'TX-FERU-02',
      name: 'Protector Bucal Deportivo',
      category: 'Férulas & Protectores',
      price: 1400,
      priceDisplay: '$1,000 - $1,800 MXN',
      costEstimate: 300,
      durationMin: 30,
      commissionPct: 10,
      description: 'Protector bucal atlético termoformado personalizado para protección deportiva contra impactos.',
      active: true,
    },

    // ── NIÑOS (ODONTOPEDIATRÍA) ──
    {
      id: 'tx-15',
      code: 'TX-PEDI-01',
      name: 'Profilaxis y Colocación de Flúor (Niños)',
      category: 'Odontopediatría (Niños)',
      price: 300,
      priceDisplay: '$300 MXN',
      costEstimate: 60,
      durationMin: 30,
      commissionPct: 10,
      description: 'Limpieza dental profiláctica infantil y barniz o gel fluorado preventivo contra caries.',
      active: true,
      isPediatric: true
    },
    {
      id: 'tx-16',
      code: 'TX-PEDI-02',
      name: 'Selladores de Fosetas y Fisuras (por cuadrante)',
      category: 'Odontopediatría (Niños)',
      price: 400,
      priceDisplay: '$400 MXN',
      costEstimate: 80,
      durationMin: 30,
      commissionPct: 10,
      description: 'Aplicación de sellador resinoso preventivo en fosetas y fisuras anatómicas por cuadrante infantil.',
      active: true,
      isPediatric: true
    },
    {
      id: 'tx-17',
      code: 'TX-PEDI-03',
      name: 'Resina Infantil',
      category: 'Odontopediatría (Niños)',
      price: 300,
      priceDisplay: '$300 MXN',
      costEstimate: 70,
      durationMin: 30,
      commissionPct: 10,
      description: 'Restauración estética con composite fotocurable en dientes temporales de niños.',
      active: true,
      isPediatric: true
    },
    {
      id: 'tx-18',
      code: 'TX-PEDI-04',
      name: 'Pulpotomía Infantil',
      category: 'Odontopediatría (Niños)',
      price: 500,
      priceDisplay: '$500 MXN',
      costEstimate: 120,
      durationMin: 45,
      commissionPct: 12,
      description: 'Terapia pulpar coronaria conservadora en molares infantiles temporales.',
      active: true,
      isPediatric: true
    },
    {
      id: 'tx-19',
      code: 'TX-PEDI-05',
      name: 'Pulpectomía Infantil',
      category: 'Odontopediatría (Niños)',
      price: 800,
      priceDisplay: '$800 MXN',
      costEstimate: 180,
      durationMin: 45,
      commissionPct: 12,
      description: 'Tratamiento de conductos completo en órganos dentales temporales infantiles.',
      active: true,
      isPediatric: true
    }
  ]

  const categories = [
    'all',
    'Diagnóstico & Prevención',
    'Operatoria & Estética',
    'Endodoncia',
    'Cirugía & Exodoncia',
    'Prótesis & Rehabilitación',
    'Férulas & Protectores',
    'Odontopediatría (Niños)'
  ]

  const filtered = treatments.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = selectedCat === 'all' || t.category === selectedCat
    return matchesSearch && matchesCat
  })

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Catálogo Clínico Oficial
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {treatments.length} Servicios Actualizados
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Tratamientos &amp; Lista de Precios</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aranceles clínicos oficiales de la Dra. Aura Estudillo (Sucursal Balbuena &amp; Sucursal Chalma de Guadalupe).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar procedimiento o código..."
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 text-xs border border-slate-200/80 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400 w-64 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Filtros de Categoría */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              selectedCat === cat
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat === 'all' ? 'Todos los Servicios (19)' : cat}
          </button>
        ))}
      </div>

      {/* Grid de Tratamientos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {t.code}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  t.isPediatric
                    ? 'bg-purple-100 text-purple-900 border-purple-200'
                    : 'bg-amber-100 text-amber-900 border-amber-200'
                }`}>
                  {t.category}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{t.name}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Arancel Paciente</span>
                  <span className="text-xl font-black text-slate-900">{t.priceDisplay}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Comisión Dr.</span>
                  <span className="text-sm font-bold text-amber-700">{t.commissionPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> {t.durationMin} min
                </span>
                <span>Costo insumo: ~${t.costEstimate} MXN</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
