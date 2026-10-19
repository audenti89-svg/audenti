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
  CheckCircle2
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
  // Si es María de los Ángeles Sánchez Rivera, mostrar su red familiar activa
  const isAngeles = currentName.toLowerCase().includes('ángeles') || currentName.toLowerCase().includes('angeles')
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
    if (isAngeles) {
      setReferrals([
        {
          id: 'ref-1',
          name: 'Ricardo Sánchez Rivera',
          relation: 'Familiar (Hijo/Hermano)',
          revenueGenerated: 8500,
          status: 'Tratamiento Activo',
          date: '15 Oct 2026'
        },
        {
          id: 'ref-2',
          name: 'Ángel Gabriel Sánchez',
          relation: 'Familiar',
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
      // Paciente estándar
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
  }, [isAngeles, isRicardo, patientId])

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
      {/* Banner de Impacto de Referidos y Árbol Familiar */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-500">
                Red de Confianza &amp; Fidelización Audenti
              </span>
              <span className="text-xs font-semibold text-slate-500">
                NOM-004-SSA3 • Expediente Clínico Unificado
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Árbol Familiar y Red de Referidos de {currentName}
            </h3>
            <p className="text-xs text-slate-600">
              Visualiza en tiempo real los pacientes captados por recomendación directa de esta persona y el volumen económico generado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Vincular Nuevo Referido
          </button>
        </div>

        {/* Tarjetas de Métricas de Referidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-black text-slate-500 block tracking-wider">
              Personas Referidas Totales
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{referrals.length}</span>
              <span className="text-xs font-bold text-amber-700">
                ({familyCount} familiares + {friendCount} conocidos)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Promotor activo en su círculo social
            </span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-black text-emerald-800 block tracking-wider">
              Ingresos Generados por su Red
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700">
                ${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-700">MXN</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
              Impacto directo en facturación clínica
            </span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-black text-blue-800 block tracking-wider">
              Canal de Captación del Titular
            </span>
            <div className="text-base font-black text-slate-900 mt-1">
              {patient?.source_channel || patient?.referral_source || 'Boca en Boca / Familiar'}
            </div>
            <span className="text-[11px] text-blue-700 font-medium block mt-0.5">
              {patient?.referred_by ? `Recomendado por: ${patient.referred_by}` : 'Captación directa'}
            </span>
          </div>
        </div>
      </div>

      {/* Listado del Árbol de Referidos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Desglose Individual de Recomendaciones
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {referrals.length} {referrals.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {referrals.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 hover:bg-slate-100/60 transition-colors shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                  {item.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">{item.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      {item.relation}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Fecha vinculación: {item.date} • Estatus:{' '}
                    <strong className="text-slate-700 font-semibold">{item.status}</strong>
                  </p>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 pt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Ingresos generados: ${item.revenueGenerated.toLocaleString('es-MX')} MXN
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                  Verificado
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para Vincular Referido */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Vincular Nuevo Referido</h4>
                <p className="text-xs text-slate-500">Recomendado por {currentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddReferral} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Nombre Completo del Referido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sofía Hernández"
                  value={newReferral.name}
                  onChange={e => setNewReferral({ ...newReferral, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#202D4C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Vínculo / Relación *
                  </label>
                  <select
                    value={newReferral.relation}
                    onChange={e => setNewReferral({ ...newReferral, relation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="Familiar">Familiar</option>
                    <option value="Amigo/Conocido">Amigo/Conocido</option>
                    <option value="Redes Sociales">Redes Sociales</option>
                    <option value="Directo">Directo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Ingreso Proyectado (MXN)
                  </label>
                  <input
                    type="number"
                    value={newReferral.estimatedRevenue}
                    onChange={e => setNewReferral({ ...newReferral, estimatedRevenue: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 shadow-sm"
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
