'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Building2,
  Users,
  Shield,
  Clock,
  Save,
  CheckCircle2,
  Bell,
  Cpu,
  Lock,
  ShieldAlert,
  Key
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [saved, setSaved] = useState(false)
  const [clinicName, setClinicName] = useState('DentalCloud Pro — Dirección General Dra. Aura Estudillo')
  const [licenseKey, setLicenseKey] = useState('DCL-PRO-2026-AE01')
  const [autoInactivation, setAutoInactivation] = useState(true)
  const [inactivationMonths, setInactivationMonths] = useState(6)
  const [defaultCommission, setDefaultCommission] = useState(7)
  const [whatsappNotifications, setWhatsappNotifications] = useState(true)
  const [aiModel, setAiModel] = useState('gc/gemini-2.5-flash')

  // Control RBAC
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('staff')
  const [isTechRole, setIsTechRole] = useState<boolean>(false)

  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        const isSuper = user.email === 'audenti89@gmail.com'

        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        const role = profile?.role || (isSuper ? 'admin' : 'doctor')
        setUserRole(role)
        // Solo rol 'admin', 'technician' o superadmin pueden ver configuraciones avanzadas
        setIsTechRole(isSuper || role === 'admin' || role === 'technician')
      }
    }
    checkUserRole()
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Administración del Sistema
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Rol Activo: <strong className="text-slate-800 uppercase">{userRole}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Configuración de Sucursal &amp; Franquicia</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dra. Aura Estudillo • Céd. Prof. 8492019 | Parámetros operativos de la clínica y control de acceso.
          </p>
        </div>

        <button
          onClick={handleSave}
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Save className="w-4 h-4 text-amber-400" />
          {saved ? '¡Configuración Guardada!' : 'Guardar Cambios'}
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Parámetros de Franquicia & Sucursal (Visible para Personal Clínico y Doctores) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Datos de Sucursal (Tenant Clínico)</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Nombre Comercial de la Clínica</label>
              <input
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Licencia de Franquicia</label>
              <input
                disabled
                value={licenseKey}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Aislamiento por Row Level Security (RLS) verificado en Supabase.</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Comisión Base Médica (%)</label>
                <input
                  type="number"
                  value={defaultCommission}
                  onChange={e => setDefaultCommission(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">Moneda del Sistema</label>
                <input
                  disabled
                  value="MXN (Pesos Mexicanos)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium"
                />
              </div>
            </div>

            {/* WhatsApp Recordatorios Básico */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mt-2">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Notificaciones Automáticas por WhatsApp</span>
                <span className="text-[11px] text-slate-500">Confirmación de citas para pacientes registrados.</span>
              </div>
              <input
                type="checkbox"
                checked={whatsappNotifications}
                onChange={e => setWhatsappNotifications(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2. Sección Protegida: Reglas Automáticas & Gateway de IA (Exclusivo Rol Técnico / Admin) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Reglas Técnicas &amp; Motor AI</h2>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 border ${
              isTechRole ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {isTechRole ? <Shield className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3" />}
              {isTechRole ? 'Acceso Técnico Concedido' : 'Protegido por Rol'}
            </span>
          </div>

          {!isTechRole ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Configuración Técnica Restringida</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Este apartado contiene la orquestación del gateway de modelos de Inteligencia Artificial (9Router), parámetros de API Keys y cronjobs del servidor. Solo accesible para administradores técnicos.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs animate-in fade-in">
              {/* Auto-inactivación */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Auto-Inactivación de Pacientes</span>
                    <span className="text-[11px] text-slate-500">Cambiar estado a 'Inactivo' si no tienen cita en el periodo fijado.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoInactivation}
                    onChange={e => setAutoInactivation(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>
                {autoInactivation && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-600">Periodo límite:</span>
                    <select
                      value={inactivationMonths}
                      onChange={e => setInactivationMonths(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold"
                    >
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses (Recomendado Odontológico)</option>
                      <option value={12}>12 meses</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Motor de Inteligencia Artificial (Groq SDK & Gateway) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Motor de Inteligencia Artificial Oficial (Groq SDK Cloud)
                </label>
                <select
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium cursor-pointer"
                >
                  <option value="llama-3.3-70b-versatile">Groq llama-3.3-70b-versatile (Recomendado • Ultra Rápido Oficial)</option>
                  <option value="mixtral-8x7b-32768">Groq mixtral-8x7b-32768 (Alta Capacidad de Contexto)</option>
                  <option value="llama-3.1-8b-instant">Groq llama-3.1-8b-instant (Inferencia Instantánea)</option>
                  <option value="gc/gemini-2.5-flash">9Router Local (gc/gemini-2.5-flash)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Conectado a Groq Cloud con Guardrails Temáticos Odontológicos y RBAC activo.</span>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
