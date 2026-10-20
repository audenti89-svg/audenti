'use client'

import { useState, useEffect } from 'react'
import {
  User,
  Award,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  FileBadge,
  Sparkles,
  Printer,
  FileText,
  Building,
  GraduationCap
} from 'lucide-react'
import Image from 'next/image'

export default function DoctorProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    fullName: 'Dra. Aura Estudillo',
    title: 'Dirección General & Clínica',
    specialty: 'Cirujano Dentista / Especialista en Odontología Integral',
    license: '8492019',
    secondaryLicense: 'E-551982',
    university: 'Universidad Nacional Autónoma de México (UNAM)',
    phone: '5522427769',
    email: 'contacto@audenti.com',
    secondaryEmail: 'audenti89@gmail.com',
    address: 'Sucursal Balbuena (Matriz) & Sucursal Chalma de Guadalupe',
    bio: 'Especialista en rehabilitación oral, estética dental y cirugía menor con más de 12 años de trayectoria clínica bajo estrictas normas de bioseguridad NOM-004-SSA3.',
    workingHours: 'Lunes a Sábado de 09:00 a 19:30 hrs',
    avatarUrl: '/images/dra-aura-estudillo.png',
    letterheadEnabled: true,
    printerDefault: 'letter'
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/settings/profile')
        if (res.ok) {
          const data = await res.json()
          if (data?.profile) {
            setForm(prev => ({ ...prev, ...data.profile }))
          }
        }
      } catch (err) {
        console.warn('Error cargando perfil:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert('No se pudo guardar el perfil.')
      }
    } catch {
      alert('Error al conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Identidad Profesional &amp; Membrete
            </span>
            <span className="text-xs font-semibold text-slate-400">Audenti Clinical</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Editar Perfil de la Doctora
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personaliza tus datos médicos, cédula profesional, bio y configuración de impresión para recetas y presupuestos oficiales.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">¡Perfil Guardado!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-amber-400" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tarjeta de Resumen Visual */}
        <div className="bg-gradient-to-r from-[#111c38] to-[#1c2c54] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-md shrink-0 bg-slate-900">
            <Image
              src={form.avatarUrl || '/images/dra-aura-estudillo.png'}
              alt={form.fullName}
              fill
              className="object-cover"
              sizes="112px"
              priority
            />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>{form.title}</span>
            </div>
            <h2 className="text-2xl font-black text-white">{form.fullName}</h2>
            <p className="text-xs text-amber-200 font-medium">{form.specialty}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-[11px] text-slate-300">
              <span className="font-mono bg-white/10 px-2.5 py-0.5 rounded-lg">Céd. Prof. {form.license}</span>
              <span>•</span>
              <span className="font-mono bg-white/10 px-2.5 py-0.5 rounded-lg">Tel: {form.phone}</span>
            </div>
          </div>
        </div>

        {/* Bloque 1: Información Profesional */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Datos Médicos &amp; Acreditaciones Oficiales</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nombre Completo Oficial</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Cargo / Dirección</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Especialidad Clínica</label>
              <input
                type="text"
                value={form.specialty}
                onChange={e => setForm({ ...form, specialty: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Universidad de Egreso</label>
              <input
                type="text"
                value={form.university}
                onChange={e => setForm({ ...form, university: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Cédula Profesional Principal (SSA / SEP)</label>
              <input
                type="text"
                required
                value={form.license}
                onChange={e => setForm({ ...form, license: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Cédula de Especialidad / Registro SSA</label>
              <input
                type="text"
                value={form.secondaryLicense}
                onChange={e => setForm({ ...form, secondaryLicense: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Extracto / Resumen Curricular</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
        </div>

        {/* Bloque 2: Contacto y Ubicación */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Phone className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Contacto Clínico &amp; Horarios</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Teléfono Principal de la Doctora (WhatsApp)</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
                placeholder="5522427769"
              />
              <p className="text-[10px] text-slate-400 mt-1">Este número es el utilizado por el sistema para vincular WhatsApp Directo y avisos de triaje.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Correo Electrónico de Contacto</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Sedes Clínicas Asignadas</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Horario Habitual de Consulta</label>
              <input
                type="text"
                value={form.workingHours}
                onChange={e => setForm({ ...form, workingHours: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bloque 3: Preferencias de Impresión y Membretado */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Printer className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Configuración de Impresión &amp; Papelería Oficial</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.letterheadEnabled}
                  onChange={e => setForm({ ...form, letterheadEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                />
                <span className="font-bold text-slate-900">Imprimir Encabezado y Logotipo en Hojas Blancas</span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6.5">
                Si desmarcas esta opción, el sistema ocultará el encabezado corporativo para que puedas imprimir sobre hojas que <strong>ya vienen pre-membretadas de imprenta</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-bold uppercase text-slate-600">Formato de Papel Predeterminado</label>
              <select
                value={form.printerDefault}
                onChange={e => setForm({ ...form, printerDefault: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
              >
                <option value="letter">Tamaño Carta (216 x 279 mm) — Estándar</option>
                <option value="half_letter">Media Carta / Cuartilla (140 x 216 mm) — Recetario</option>
                <option value="a4">Tamaño A4 (210 x 297 mm)</option>
                <option value="a2">Tamaño A2 (Planos / Posters de Ortodoncia)</option>
                <option value="80mm">Impresora Térmica 80 mm (Ticket Recibo/Cita)</option>
                <option value="58mm">Impresora Térmica 58 mm (Miniprinter)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Guardar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">¡Perfil Guardado con Éxito!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-amber-400" />
                <span>{saving ? 'Guardando...' : 'Guardar Información de la Doctora'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
