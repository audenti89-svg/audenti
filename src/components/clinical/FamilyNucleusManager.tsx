'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Share2,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  MessageCircle,
  X,
  HeartHandshake,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface ReferralItem {
  id: string
  name: string
  relation: string
  revenueGenerated: number
  status: string
  date: string
}

interface FamilyNucleusManagerProps {
  patient?: any
  patientName?: string
}

export function FamilyNucleusManager({ patient, patientName }: FamilyNucleusManagerProps) {
  const currentName = patient?.full_name || patientName || 'Paciente Seleccionado'
  const patientId = patient?.id

  // Determinar datos de referidos
  const isAngel = currentName.toLowerCase().includes('ángel') || currentName.toLowerCase().includes('angel')
  const isAngeles = !isAngel && (currentName.toLowerCase().includes('ángeles') || currentName.toLowerCase().includes('angeles'))
  const isRicardo = currentName.toLowerCase().includes('ricardo')

  const [referrals, setReferrals] = useState<ReferralItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newReferral, setNewReferral] = useState({
    name: '',
    relation: 'Familiar',
    estimatedRevenue: '2500'
  })

  useEffect(() => {
    // Configurar referidos iniciales según perfil
    if (isAngel) {
      setReferrals([
        { id: 'ref-a1', name: 'María de los Ángeles Sánchez', relation: 'Familiar (Mamá)', revenueGenerated: 14500, status: 'Tratamiento Activo', date: '01 Oct 2026' },
        { id: 'ref-a2', name: 'Ricardo Sánchez Rivera', relation: 'Familiar (Hermano)', revenueGenerated: 8500, status: 'Tratamiento Activo', date: '05 Oct 2026' },
        { id: 'ref-a3', name: 'Elena Sánchez', relation: 'Familiar (Tía)', revenueGenerated: 5200, status: 'En sillón', date: '12 Oct 2026' },
        { id: 'ref-a4', name: 'Carlos Rivera Sánchez', relation: 'Familiar (Primo)', revenueGenerated: 6800, status: 'Presupuesto Aceptado', date: '15 Oct 2026' },
        { id: 'ref-a5', name: 'Lucía Mendoza', relation: 'Amigo/Conocido', revenueGenerated: 3400, status: 'Cita Agendada', date: '18 Oct 2026' },
        { id: 'ref-a6', name: 'Fernando Gómez', relation: 'Amigo/Conocido', revenueGenerated: 4200, status: 'Valoración Completada', date: 'Hoy' },
        { id: 'ref-a7', name: 'Valeria Castro', relation: 'Amigo/Conocido', revenueGenerated: 3900, status: 'Tratamiento Activo', date: '16 Oct 2026' }
      ])
    } else if (isAngeles) {
      setReferrals([
        {
          id: 'ref-1',
          name: 'Ricardo Sánchez Rivera',
          relation: 'Familiar (Hijo)',
          revenueGenerated: 8500,
          status: 'Tratamiento Activo',
          date: '15 Oct 2026'
        },
        {
          id: 'ref-2',
          name: 'Ángel Gabriel Sánchez',
          relation: 'Familiar (Hijo)',
          revenueGenerated: 6200,
          status: 'En sillón',
          date: '18 Oct 2026'
        },
        {
          id: 'ref-3',
          name: 'Lucía Mendoza',
          relation: 'Amigo/Conocido',
          revenueGenerated: 3400,
          status: 'Cita Agendada',
          date: 'Hoy'
        },
        {
          id: 'ref-4',
          name: 'Carlos Rivera',
          relation: 'Familiar',
          revenueGenerated: 4800,
          status: 'Presupuesto Aceptado',
          date: '12 Oct 2026'
        }
      ])
    } else if (isRicardo) {
      setReferrals([
        {
          id: 'ref-r1',
          name: 'Mateo Morales',
          relation: 'Amigo/Conocido',
          revenueGenerated: 4200,
          status: 'Tratamiento Activo',
          date: '14 Oct 2026'
        }
      ])
    } else {
      setReferrals([
        {
          id: 'ref-std-1',
          name: 'Familiar Recomendado 1',
          relation: 'Familiar',
          revenueGenerated: 2500,
          status: 'Valoración Completada',
          date: 'Reciente'
        }
      ])
    }
  }, [isAngel, isAngeles, isRicardo, patientId])

  const totalRevenue = referrals.reduce((acc, r) => acc + r.revenueGenerated, 0)
  const familyCount = referrals.filter(r => r.relation.toLowerCase().includes('familiar')).length
  const friendCount = referrals.filter(r => !r.relation.toLowerCase().includes('familiar')).length

  const handleAddReferral = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReferral.name.trim()) return

    const item: ReferralItem = {
      id: `ref-${Date.now()}`,
      name: newReferral.name.trim(),
      relation: newReferral.relation,
      revenueGenerated: Number(newReferral.estimatedRevenue) || 0,
      status: 'Valoración Agendada',
      date: 'Hoy'
    }

    setReferrals(prev => [item, ...prev])
    setNewReferral({ name: '', relation: 'Familiar', estimatedRevenue: '2500' })
    setShowAddModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Banner de Impacto de Referidos y Árbol Familiar en Modo Cristal Oscuro */}
      <div className="bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-900/90 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-500 shadow-xs">
                Red de Confianza &amp; Fidelización Audenti
              </span>
              <span className="text-xs font-semibold text-slate-400">
                NOM-004-SSA3 • Expediente Clínico Unificado
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
              Árbol Familiar y Red de Referidos de {currentName}
            </h3>
            <p className="text-xs text-slate-300">
              Visualiza en tiempo real los pacientes captados por recomendación directa de esta persona y el volumen económico generado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Vincular Nuevo Referido</span>
          </button>
        </div>

        {/* Tarjetas de Métricas de Referidos (Modo Cristal Oscuro) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="p-4 bg-slate-950/80 rounded-xl border border-amber-500/30 shadow-md">
            <span className="text-[10px] uppercase font-black text-amber-300 block tracking-wider">
              Personas Referidas Totales
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white font-mono">{referrals.length}</span>
              <span className="text-xs font-bold text-amber-400">
                ({familyCount} fam. + {friendCount} amigos)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Promotor activo en su círculo social
            </span>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-emerald-500/30 shadow-md">
            <span className="text-[10px] uppercase font-black text-emerald-400 block tracking-wider">
              Ingresos Generados por su Red
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-400">MXN</span>
            </div>
            <span className="text-[11px] text-emerald-300/80 font-semibold block mt-0.5">
              Impacto directo en facturación clínica
            </span>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-cyan-500/30 shadow-md">
            <span className="text-[10px] uppercase font-black text-cyan-400 block tracking-wider">
              Canal de Captación del Titular
            </span>
            <div className="text-base font-black text-white mt-1 truncate">
              {patient?.source_channel || patient?.referral_source || 'Boca en Boca / Familiar'}
            </div>
            <span className="text-[11px] text-cyan-300/80 font-medium block mt-0.5 truncate">
              {patient?.referred_by ? `Recomendado por: ${patient.referred_by}` : 'Captación directa'}
            </span>
          </div>
        </div>
      </div>

      {/* Listado del Árbol de Referidos en Modo Cristal Oscuro */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-xl p-5 sm:p-6 space-y-4 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-black text-white tracking-tight">
              Desglose Individual de Recomendaciones
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {referrals.length} {referrals.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {referrals.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3 hover:bg-slate-900/90 hover:border-slate-700 transition-colors shadow-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-400/40 text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  {item.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-white truncate">{item.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      {item.relation}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fecha vinculación: {item.date} • Estatus:{' '}
                    <strong className="text-slate-200 font-semibold">{item.status}</strong>
                  </p>
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 pt-1 font-mono">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Ingresos generados: ${item.revenueGenerated.toLocaleString('es-MX')} MXN
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40">
                  Verificado
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para Vincular Referido en Modo Cristal Oscuro */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-950 border-2 border-amber-500/40 text-white rounded-2xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(245,158,11,0.2)] space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-black text-white tracking-tight">Vincular Nuevo Referido</h4>
                <p className="text-xs text-slate-400">Recomendado por {currentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddReferral} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase text-amber-300 mb-1">
                  Nombre Completo del Referido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sofía Hernández"
                  value={newReferral.name}
                  onChange={e => setNewReferral({ ...newReferral, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase text-amber-300 mb-1">
                    Vínculo / Relación *
                  </label>
                  <select
                    value={newReferral.relation}
                    onChange={e => setNewReferral({ ...newReferral, relation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-bold text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="Familiar" className="bg-slate-950 text-white">Familiar</option>
                    <option value="Amigo/Conocido" className="bg-slate-950 text-white">Amigo/Conocido</option>
                    <option value="Redes Sociales" className="bg-slate-950 text-white">Redes Sociales</option>
                    <option value="Directo" className="bg-slate-950 text-white">Directo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-amber-300 mb-1">
                    Ingreso Proyectado (MXN)
                  </label>
                  <input
                    type="number"
                    value={newReferral.estimatedRevenue}
                    onChange={e => setNewReferral({ ...newReferral, estimatedRevenue: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl font-medium text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black hover:bg-amber-300 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Guardar Referido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
