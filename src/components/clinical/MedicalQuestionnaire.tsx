'use client'

import React, { useState } from 'react'
import {
  PhoneCall,
  Pill,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Baby,
  Cigarette,
  GlassWater,
  Sparkles,
  Activity,
  Flame
} from 'lucide-react'

export interface QuestionnaireData {
  // Personal
  emergency_contact_name: string
  emergency_contact_phone: string
  blood_type: string
  // Medical
  allergies: string[]
  allergy_input: string
  chronic_diseases: string[]
  disease_input: string
  current_medications: string[]
  medication_input: string
  previous_surgeries: string[]
  surgery_input: string
  // Habits
  pregnancy: boolean
  smoker: boolean
  alcohol_use: string
  // Routing
  chief_complaint: string
  pain_level: number
  assigned_specialty: string
  triage_notes: string
}

const SPECIALTIES = [
  { value: 'prevention',      label: 'Prevención General' },
  { value: 'endodontics',     label: 'Endodoncia' },
  { value: 'periodontics',    label: 'Periodoncia' },
  { value: 'orthodontics',    label: 'Ortodoncia' },
  { value: 'implantology',    label: 'Implantología' },
  { value: 'oral_surgery',    label: 'Cirugía Oral' },
  { value: 'pediatric',       label: 'Odontopediatría' },
  { value: 'aesthetic',       label: 'Estética Dental' },
  { value: 'prosthodontics',  label: 'Prótesis Dental' },
]

function TagInput({
  label, tags, inputKey, data, setData, placeholder
}: {
  label: string; tags: string[]; inputKey: string; data: QuestionnaireData;
  setData: React.Dispatch<React.SetStateAction<QuestionnaireData>>; placeholder: string
}) {
  const [localInput, setLocalInput] = useState('')

  const handleAdd = () => {
    const val = localInput.trim()
    if (val && !tags.includes(val)) {
      setData(prev => ({
        ...prev,
        [inputKey]: '',
        [tagsKeyFromInputKey(inputKey)]: [...tags, val]
      }))
      setLocalInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (indexToRemove: number) => {
    const targetKey = tagsKeyFromInputKey(inputKey)
    setData(prev => ({
      ...prev,
      [targetKey]: tags.filter((_, i) => i !== indexToRemove)
    }))
  }

  function tagsKeyFromInputKey(k: string): keyof QuestionnaireData {
    if (k === 'allergy_input') return 'allergies'
    if (k === 'disease_input') return 'chronic_diseases'
    if (k === 'medication_input') return 'current_medications'
    if (k === 'surgery_input') return 'previous_surgeries'
    return 'allergies'
  }

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300">
        {label}
      </label>
      <div className="min-h-[48px] p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-amber-400/40 focus-within:border-amber-400/70 transition-all shadow-inner">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs font-bold shadow-xs"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="text-amber-400/70 hover:text-rose-400 font-black ml-1 transition-colors cursor-pointer"
              title="Eliminar etiqueta"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAdd}
          placeholder={tags.length === 0 ? placeholder : 'Escribe y Enter...'}
          className="flex-1 min-w-32 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden"
        />
      </div>
      <p className="text-[10px] text-slate-400">Escribe y presiona Enter o cambia de campo para agregar etiqueta médica</p>
    </div>
  )
}

export function MedicalQuestionnaire({ onComplete }: { onComplete?: (data: QuestionnaireData) => void }) {
  const [section, setSection] = useState(0)
  const [savedNotice, setSavedNotice] = useState(false)
  const [data, setData] = useState<QuestionnaireData>({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_type: 'O+',
    allergies: ['Penicilina', 'AINEs'],
    allergy_input: '',
    chronic_diseases: ['Hipertensión Arterial (Controlada)'],
    disease_input: '',
    current_medications: ['Losartán 50mg / 24h'],
    medication_input: '',
    previous_surgeries: ['Apendicectomía (2018)'],
    surgery_input: '',
    pregnancy: false,
    smoker: false,
    alcohol_use: 'none',
    chief_complaint: 'Molestia y sensibilidad pulsátil en molar superior derecho al ingerir alimentos fríos o calientes.',
    pain_level: 6,
    assigned_specialty: 'endodontics',
    triage_notes: 'Paciente refiere dolor pulsátil con compromiso oclusomesial. Requiere valoración radiográfica.',
  })

  const sections = [
    { title: 'Contacto', icon: PhoneCall },
    { title: 'Alergias', icon: Pill },
    { title: 'Padecimientos', icon: HeartPulse },
    { title: 'Hábitos', icon: ShieldCheck },
    { title: 'Motivo & Triaje', icon: Stethoscope },
  ]

  // Auto-enrutamiento de especialidad según motivo de consulta
  function suggestSpecialty(complaint: string): string {
    const c = complaint.toLowerCase()
    if (c.includes('bracket') || c.includes('ortodo') || c.includes('alineador') || c.includes('chueco')) return 'orthodontics'
    if (c.includes('implante') || c.includes('ausente') || c.includes('tornillo')) return 'implantology'
    if (c.includes('dolor') || c.includes('nervio') || c.includes('pulsatil') || c.includes('endodon')) return 'endodontics'
    if (c.includes('encía') || c.includes('sangra') || c.includes('sarro') || c.includes('movilidad')) return 'periodontics'
    if (c.includes('niño') || c.includes('infantil') || c.includes('hijo')) return 'pediatric'
    if (c.includes('blanqueamiento') || c.includes('estética') || c.includes('carilla') || c.includes('mancha')) return 'aesthetic'
    if (c.includes('extracción') || c.includes('muela del juicio') || c.includes('tercer molar') || c.includes('cirugia')) return 'oral_surgery'
    if (c.includes('prótesis') || c.includes('dentadura') || c.includes('corona') || c.includes('puente')) return 'prosthodontics'
    return 'prevention'
  }

  function handleComplaintChange(val: string) {
    setData(prev => ({ ...prev, chief_complaint: val, assigned_specialty: suggestSpecialty(val) }))
  }

  function handleSubmit() {
    onComplete?.(data)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 3000)
  }

  // Helper para clasificar la escala de dolor
  const getPainLevelBadge = (level: number) => {
    if (level === 0) {
      return { text: '0 / 10 • Sin Dolor', color: 'bg-slate-800 text-slate-300 border-slate-700' }
    }
    if (level <= 3) {
      return { text: `${level} / 10 • Leve / Tolerable`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
    }
    if (level <= 6) {
      return { text: `${level} / 10 • Moderado`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
    }
    return { text: `${level} / 10 • Severo / Urgencia`, color: 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse' }
  }

  const painBadge = getPainLevelBadge(data.pain_level)

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/30 text-slate-100 rounded-2xl shadow-xl overflow-hidden relative">
      {/* Resplandor ambiental sutil */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER PANORÁMICO Y PESTAÑAS DE NAVEGACIÓN SUPERIOR CON SCROLL CÓMODO */}
      <div className="bg-slate-950/80 border-b border-amber-500/20 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-sm shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                Cuestionario de Admisión &amp; Triaje
              </h2>
              <p className="text-[11px] text-slate-400">
                Historia clínica, antecedentes sistémicos y clasificación de motivo
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30 self-start sm:self-auto">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            NOM-004-SSA3 Clínico
          </span>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN (Contacto, Alergias, Padecimientos, Hábitos, Motivo & Triaje) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-slate-950">
          {sections.map((s, i) => {
            const Icon = s.icon
            const isCurrent = section === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSection(i)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/25 ring-1 ring-amber-300'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{s.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL DE CONTENIDO */}
      <div className="p-5 sm:p-6 space-y-6 text-slate-100">
        {/* SECCIÓN 0: CONTACTO DE EMERGENCIA Y GRUPO SANGUÍNEO */}
        {section === 0 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1.5">
                  Nombre del Contacto de Emergencia
                </label>
                <input
                  value={data.emergency_contact_name}
                  onChange={e => setData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  placeholder="María González (madre / cónyuge)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1.5">
                  Teléfono de Emergencia
                </label>
                <input
                  value={data.emergency_contact_phone}
                  onChange={e => setData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  placeholder="+52 55 9988 7766"
                  type="tel"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Grupo Sanguíneo &amp; Factor Rh
              </label>
              <div className="flex flex-wrap gap-2">
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Desconocido'].map(bt => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, blood_type: bt }))}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      data.blood_type === bt
                        ? 'border-amber-400 bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 1: ALERGIAS Y MEDICAMENTOS ACTUALES */}
        {section === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/60 text-xs text-rose-200 flex items-start gap-3 shadow-md shadow-rose-950/30">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5 animate-pulse" />
              <div className="leading-relaxed">
                <strong className="text-white block font-black">Alerta Médica de Farmacovigilancia:</strong>
                Registra con exactitud cualquier hipersensibilidad a anestésicos locales (ej. Lidocaína con vasoconstrictor), látex, sulfas o antibióticos para prevenir complicaciones en gabinete.
              </div>
            </div>

            <TagInput
              label="Alergias Farmacológicas &amp; Materiales"
              tags={data.allergies}
              inputKey="allergy_input"
              data={data}
              setData={setData}
              placeholder="Penicilina, Látex, Ibuprofeno..."
            />

            <TagInput
              label="Medicamentos en Uso Regular"
              tags={data.current_medications}
              inputKey="medication_input"
              data={data}
              setData={setData}
              placeholder="Losartán 50mg, Metformina, Aspirina..."
            />
          </div>
        )}

        {/* SECCIÓN 2: PADECIMIENTOS SISTÉMICOS Y ANTECEDENTES */}
        {section === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <TagInput
              label="Padecimientos Sistémicos Crónicos"
              tags={data.chronic_diseases}
              inputKey="disease_input"
              data={data}
              setData={setData}
              placeholder="Diabetes Mellitus, HTA, Marcapasos, Asma..."
            />

            <TagInput
              label="Cirugías Dentales o Generales Previas"
              tags={data.previous_surgeries}
              inputKey="surgery_input"
              data={data}
              setData={setData}
              placeholder="Extracción de terceros molares, Apendicectomía..."
            />
          </div>
        )}

        {/* SECCIÓN 3: HÁBITOS DE VIDA Y FACTORES DE RIESGO */}
        {section === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setData(prev => ({ ...prev, pregnancy: !prev.pregnancy }))}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  data.pregnancy
                    ? 'border-amber-400/80 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/40'
                    : 'border-slate-800 bg-slate-950/70 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    data.pregnancy ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-amber-400'
                  }`}>
                    <Baby className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Embarazo Actual</span>
                    <span className="text-[11px] text-slate-400">Contraindicación relativa para rayos X</span>
                  </div>
                </div>

                <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-black ${
                  data.pregnancy
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'border-slate-700 bg-slate-900 text-transparent'
                }`}>
                  ✓
                </span>
              </button>

              <button
                type="button"
                onClick={() => setData(prev => ({ ...prev, smoker: !prev.smoker }))}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  data.smoker
                    ? 'border-amber-400/80 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/40'
                    : 'border-slate-800 bg-slate-950/70 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    data.smoker ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                  }`}>
                    <Cigarette className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Tabaquismo Activo</span>
                    <span className="text-[11px] text-slate-400">Riesgo en cicatrización e implantes</span>
                  </div>
                </div>

                <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-black ${
                  data.smoker
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'border-slate-700 bg-slate-900 text-transparent'
                }`}>
                  ✓
                </span>
              </button>
            </div>

            {/* Consumo de Alcohol */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <GlassWater className="w-4 h-4 text-cyan-400" />
                <span>Consumo de Bebidas Alcohólicas</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'none', label: 'No Consume' },
                  { id: 'occasional', label: 'Ocasional (Social)' },
                  { id: 'moderate', label: 'Moderado (1-2 / sem)' },
                  { id: 'frequent', label: 'Frecuente (Diario)' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, alcohol_use: item.id }))}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      data.alcohol_use === item.id
                        ? 'border-amber-400 bg-amber-400 text-slate-950 font-black shadow-md'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 4: MOTIVO DE CONSULTA & TRIAJE CLÍNICO */}
        {section === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Motivo Principal de Consulta (Triaje Inteligente)</span>
              </label>
              <textarea
                value={data.chief_complaint}
                onChange={e => handleComplaintChange(e.target.value)}
                rows={3}
                placeholder="Describe la molestia del paciente: dolor agudo, sangrado gingival, revisión preventiva, fractura o estética..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 resize-none transition-all shadow-inner leading-relaxed"
              />
            </div>

            {/* ESCALA DE DOLOR CLÍNICA (0 A 10) CON INDICADOR DINÁMICO */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Escala de Dolor Percibido</span>
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-black border tracking-wide transition-all ${painBadge.color}`}>
                  {painBadge.text}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={data.pain_level}
                onChange={e => setData(prev => ({ ...prev, pain_level: Number(e.target.value) }))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-hidden"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                <span>0 • Asintomático</span>
                <span>5 • Dolor Moderado</span>
                <span className="text-rose-400 font-black">10 • Dolor Incontrolable</span>
              </div>
            </div>

            {/* ESPECIALIDAD ODONTOLÓGICA ASIGNADA */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Especialidad Odontológica Asignada
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {SPECIALTIES.map(s => {
                  const isSelected = data.assigned_specialty === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setData(prev => ({ ...prev, assigned_specialty: s.value }))}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-amber-400 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25 ring-1 ring-amber-300'
                          : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{s.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0 ml-1.5" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* NOTAS DE TRIAJE ADICIONALES */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1.5">
                Notas Clínicas de Triaje Médico
              </label>
              <input
                value={data.triage_notes}
                onChange={e => setData(prev => ({ ...prev, triage_notes: e.target.value }))}
                placeholder="Observaciones de ingreso, urgencia o prioridad asignada..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all shadow-inner"
              />
            </div>
          </div>
        )}

        {/* NAVEGACIÓN Y ACCIONES DEL FOOTER */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 gap-3">
          <button
            type="button"
            onClick={() => setSection(s => Math.max(0, s - 1))}
            disabled={section === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ¡Cuestionario guardado!
              </span>
            )}

            {section < sections.length - 1 ? (
              <button
                type="button"
                onClick={() => setSection(s => s + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>Guardar en Expediente</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
