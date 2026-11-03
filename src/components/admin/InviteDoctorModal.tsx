'use client'

import { useState } from 'react'
import {
  X,
  UserPlus,
  Copy,
  Check,
  Building2,
  Briefcase,
  Mail,
  User,
  ExternalLink,
  ShieldAlert
} from 'lucide-react'

interface InviteDoctorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const BRANCHES = [
  { id: 'balbuena', name: 'Sucursal Balbuena (Matriz)' },
  { id: 'guadalupe-chalma', name: 'Sucursal Chalma de Guadalupe' }
]

export function InviteDoctorModal({ isOpen, onClose, onSuccess }: InviteDoctorModalProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'socio' | 'trabajador'>('trabajador')
  const [branchId, setBranchId] = useState('balbuena')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const selectedBranch = BRANCHES.find(b => b.id === branchId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setGeneratedUrl('')

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role,
          branch_id: branchId,
          branch_name: selectedBranch?.name
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al generar la invitación')
      }

      setGeneratedUrl(data.invitation_url)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar enlace de invitación')
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
    setEmail('')
    setFullName('')
    setRole('trabajador')
    setGeneratedUrl('')
    setErrorMsg('')
    setCopied(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-[#202D4C] to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Invitar a Odontólogo / Colega</h2>
              <p className="text-xs text-slate-300">Genera un enlace exclusivo de acceso institucional</p>
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
            /* Vista de Enlace Generado */
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                ¡Enlace de Invitación Exclusivo Creado!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Comparte este enlace directamente con el especialista para que cree su cuenta médica con los permisos asignados.
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
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
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
                  Generar otra invitación
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
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Institucional del Odontólogo *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@ejemplo.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo del Colega *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Roberto Sánchez (Ortodoncia)"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Selector de Rol: Socio vs Trabajador */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Tipo de Rol Médico y Permisos *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setRole('trabajador')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'trabajador'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Trabajador</span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        Clínico
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Acceso exclusivo a su agenda vespertina, pacientes y expedientes. Sin acceso a finanzas o BI.
                    </p>
                  </div>

                  <div
                    onClick={() => setRole('socio')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'socio'
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Socio</span>
                      <span className="text-[10px] font-semibold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                        Dirección
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Acceso completo a reportes financieros, métricas de BI, gestión de sucursal y supervisión de agenda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selector de Sucursal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sucursal Asignada *
                </label>
                <div className="relative">
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Generando Enlace...' : 'Generar Enlace Privado de Invitación'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
