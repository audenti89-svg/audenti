'use client'

import {
  FileText,
  Edit,
  Cake,
  Phone,
  Mail,
  Home,
  Users,
  Share2,
  CheckCircle2,
  Printer
} from 'lucide-react'
import { Odontogram } from '@/components/clinical/Odontogram'
import { FamilyNucleusManager } from '@/components/clinical/FamilyNucleusManager'
import { MedicalQuestionnaire } from '@/components/clinical/MedicalQuestionnaire'

export default function ExpedientePage() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Expediente Clínico Digital
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mateo Morales Ruiz</h1>
          <p className="text-xs text-slate-500 mt-0.5">Folio #AUD-4422 • 32 años • Tratamiento activo: Biopulpectomía Pza 16</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/dashboard/patients/AUD-4422/print"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Imprimir Receta / Presupuesto
          </a>
          <a
            href="/api/export?format=word"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200 shadow-2xs"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Resumen (.doc)
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Edit className="w-4 h-4 text-amber-400" />
            Editar Ficha
          </button>
        </div>
      </div>

      {/* Grid Superior: Ficha y Odontograma */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos del Paciente + QR Referido */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-xs">
                MM
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Mateo Morales Ruiz</h2>
                <p className="text-[11px] text-slate-500">Paciente activo desde Enero 2023</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Activo en Gabinete
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-1 border-t border-slate-100">
              {[
                { icon: Cake,  label: 'Fecha nac.',  value: '15 / Mar / 1994 (32 años)' },
                { icon: Phone, label: 'Teléfono',    value: '+52 55 4444 8821' },
                { icon: Mail,  label: 'Email',       value: 'mateo.morales@email.com' },
                { icon: Home,  label: 'Dirección',   value: 'Condesa, CDMX' },
                { icon: Users, label: 'Núcleo',      value: 'Familia Morales Ruiz (4 miembros)' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{item.label}</span>
                      <p className="text-slate-800 font-medium">{item.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Odontograma Vectorial Interactivo */}
        <div className="lg:col-span-2">
          <Odontogram />
        </div>
      </div>

      {/* Sección Inferior: Núcleo Familiar & Cuestionario Médico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <FamilyNucleusManager patientName="Mateo Morales Ruiz" />
        <MedicalQuestionnaire />
      </div>
    </div>
  )
}
