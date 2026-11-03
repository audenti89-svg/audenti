'use client'

import { useState } from 'react'
import {
  X,
  GraduationCap,
  Copy,
  Check,
  Building2,
  Calendar,
  Mail,
  User,
  Clock,
  ShieldCheck
} from 'lucide-react'

interface QuickStudentPassModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const BRANCHES = [
  { id: 'balbuena', name: 'Sucursal Balbuena (Matriz)' },
  { id: 'guadalupe-chalma', name: 'Sucursal Chalma de Guadalupe' }
]

export function QuickStudentPassModal({ isOpen, onClose, onSuccess }: QuickStudentPassModalProps) {
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [university, setUniversity] = useState('Facultad de Odontología — UNAM')
  const [branchId, setBranchId] = useState('balbuena')
  const [durationMonths, setDurationMonths] = useState(6)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [expiresDate, setExpiresDate] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const selectedBranch = BRANCHES.find(b => b.id === branchId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setGeneratedUrl('')

    try {
      const res = await fetch('/api/admin/student-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: studentName.trim(),
          student_email: studentEmail.trim().toLowerCase(),
          university: university.trim(),
          branch_id: branchId,
          branch_name: selectedBranch?.name,
          duration_months: durationMonths
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al generar el pase de estudiante')
      }

      setGeneratedUrl(data.access_url)
      setExpiresDate(new Date(data.expires_at).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))

      if (onSuccess) onSuccess()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el pase de estudiante')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!generatedUrl) return
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setStudentName('')
    setStudentEmail('')
    setGeneratedUrl('')
    setExpiresDate('')
    setErrorMsg('')
    setCopied(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-[#173832] to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Pase Temporal para Estudiante / Servicio Social</h2>
              <p className="text-xs text-slate-300">Acceso clínico de solo lectura con vigencia programada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {generatedUrl ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                ¡Pase Temporal Generado con Éxito!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Válido hasta el <strong>{expiresDate}</strong> ({durationMonths} meses). El estudiante tendrá solo lectura clínica de su sucursal.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-left">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="w-full bg-transparent text-xs text-slate-700 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Generar otro pase
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo del Pasante / Estudiante *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ej. Sofía Hernández Rosas"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Institucional o Académico *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="estudiante@unam.mx"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Universidad / Instituto
                  </label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="UNAM / IPN / UAM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duración del Pase
                  </label>
                  <div className="relative">
                    <select
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(Number(e.target.value))}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value={1}>1 mes (Práctica de observación)</option>
                      <option value={3}>3 meses (Rotación clínica)</option>
                      <option value={6}>6 meses (Servicio Social Estándar)</option>
                      <option value={12}>12 meses (Ciclo completo)</option>
                    </select>
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sucursal Clínica Asignada *
                </label>
                <div className="relative">
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  El pasante tendrá <strong>acceso exclusivo de solo lectura</strong> a pacientes y expedientes clínicos de su sucursal. Los módulos de finanzas, reportes y caja estarán estrictamente deshabilitados.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Generando Pase...' : 'Generar Pase Temporal de Servicio Social'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
