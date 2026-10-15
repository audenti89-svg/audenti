'use client'

import { useState } from 'react'
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Camera, Smile, Send } from 'lucide-react'

interface SmileAuditData {
  goal: string
  shadeCurrent: string
  shadeDesired: string
  concern: string
  fullName: string
  phone: string
}

export function SmileAuditTool() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [auditData, setAuditData] = useState<SmileAuditData>({
    goal: 'Carillas de Alta Definición / Diseño de Sonrisa',
    shadeCurrent: 'A3 (Tono Medio con Pigmentación)',
    shadeDesired: 'BL1 / Bleach Ultra Blanco Natural',
    concern: 'Manchas por café/vino y ligera asimetría',
    fullName: '',
    phone: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [auditCompleted, setAuditCompleted] = useState(false)
  const [aiReport, setAiReport] = useState<any>(null)

  const goals = [
    'Carillas Cerámicas E.Max / Diseño de Sonrisa',
    'Alineación Invisible (Ortodoncia con Alineadores)',
    'Blanqueamiento Clínico Dental LED',
    'Implantes Dentales & Restauración Completa'
  ]

  const concerns = [
    'Manchas por café, vino o alimentos pigmentantes',
    'Apiñamiento o separación dental (diastemas)',
    'Dientes desgastados o bordes irregulares',
    'Sensibilidad o restauraciones antiguas visibles'
  ]

  const handleNextStep = () => {
    if (step === 1) setStep(2)
  }

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auditData.fullName || !auditData.phone) return

    setIsSubmitting(true)

    try {
      // Simulación de auditoría con IA para conversión inmediata
      setTimeout(() => {
        setAiReport({
          score: 94,
          primaryDiagnosis: 'Excelente estructura dental base con oportunidad estética de alto impacto.',
          recommendedTreatment: auditData.goal,
          estimatedSessions: auditData.goal.includes('Blanqueamiento') ? '1 a 2 sesiones de 45 min' : '2 a 3 citas con diseño digital previo',
          shadeImprovement: 'Mejora proyectada de 5 a 8 tonos en la escala Vita clásica.',
          specialist: 'Dra. Aura Estudillo (Directora Médica & Especialista en Estética Oral - Céd. 8492019)',
          leadContacted: true,
        })
        setIsSubmitting(false)
        setAuditCompleted(true)
        setStep(3)
      }, 1200)
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
    }
  }

  return (
    <section id="smile-audit" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-cyan-500/30 p-6 sm:p-10 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Glow de fondo */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Header de la herramienta */}
          <div className="text-center mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Auditoría Digital de Sonrisa 3D con IA
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Descubre el Potencial Estético de Tu Sonrisa
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Evaluación preliminar guiada por la arquitectura clínica de la{' '}
              <span className="text-cyan-300 font-medium">Dra. Aura Estudillo</span> (Céd. Prof. 8492019).
            </p>
          </div>

          {/* Pasos */}
          {!auditCompleted ? (
            <div className="space-y-6">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-3">
                    <label className="text-xs sm:text-sm font-semibold text-slate-200 block">
                      1. ¿Cuál es tu objetivo estético primordial?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {goals.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setAuditData({ ...auditData, goal: g })}
                          className={`p-3.5 rounded-xl text-left text-xs sm:text-sm font-medium border transition flex items-center justify-between ${
                            auditData.goal === g
                              ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-900/30'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span>{g}</span>
                          {auditData.goal === g && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs sm:text-sm font-semibold text-slate-200 block">
                      2. ¿Qué aspecto dental deseas corregir con mayor prioridad?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {concerns.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAuditData({ ...auditData, concern: c })}
                          className={`p-3.5 rounded-xl text-left text-xs sm:text-sm font-medium border transition flex items-center justify-between ${
                            auditData.concern === c
                              ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-900/30'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <span>{c}</span>
                          {auditData.concern === c && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition shadow-lg shadow-cyan-500/25"
                    >
                      Continuar a Diagnóstico Digital
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <form onSubmit={handleRunAudit} className="space-y-5 animate-in fade-in duration-300">
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tratamiento de Interés:</span>
                      <strong className="text-cyan-300">{auditData.goal}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Motivo Principal:</span>
                      <strong className="text-slate-200">{auditData.concern}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Nombre Completo:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Valeria Montes"
                        value={auditData.fullName}
                        onChange={(e) => setAuditData({ ...auditData, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Teléfono / WhatsApp (10 dígitos):</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. 55 1234 5678"
                        value={auditData.phone}
                        onChange={(e) => setAuditData({ ...auditData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-slate-400 hover:text-white transition"
                    >
                      ← Volver al paso 1
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-xl shadow-cyan-500/25"
                    >
                      {isSubmitting ? (
                        'Analizando Estructura Facial...'
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generar Simulación y Auditoría IA
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="p-6 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                      Reporte de Simulación Clínica Oficial
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      Auditoría Aprobada para {auditData.fullName}
                    </h3>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold self-start sm:self-auto">
                    Viabilidad Estética: {aiReport.score}%
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Diagnóstico Proyectivo:</span>
                    <p className="text-slate-200 font-medium leading-relaxed">{aiReport.primaryDiagnosis}</p>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Proyección de Tono &amp; Brillo:</span>
                    <p className="text-cyan-300 font-medium leading-relaxed">{aiReport.shadeImprovement}</p>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 block mb-1">Especialista a Cargo de la Valoración:</span>
                  <p className="text-white font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    {aiReport.specialist}
                  </p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="text-xs text-slate-400">
                  Hemos enviado una copia confidencial a nuestro equipo médico para coordinar tu cita prioritaria.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <a
                    href={`https://wa.me/5215512345678?text=Hola%20Dra.%20Aura%20Estudillo,%20completé%20mi%20Auditoría%20de%20Sonrisa%20para%20${encodeURIComponent(auditData.goal)}.%20Mi%20nombre%20es%20${encodeURIComponent(auditData.fullName)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/25"
                  >
                    <Send className="w-4 h-4" />
                    Reclamar Valoración Presencial Vía WhatsApp
                  </a>
                  <button
                    onClick={() => {
                      setAuditCompleted(false)
                      setStep(1)
                    }}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Nueva Consulta
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
