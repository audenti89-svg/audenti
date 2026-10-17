'use client'

import React, { useEffect, useState, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Plus, DollarSign, Receipt, AlertCircle, RefreshCw, FileText } from 'lucide-react'
import Link from 'next/link'

interface FinancialRecord {
  id: string
  concept: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: string
  created_at: string
}

export default function PatientFinancesPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Manejo compatible de params en Next.js App Router (síncrono o Promise vía React.use)
  const resolvedParams = typeof (params as any)?.then === 'function' ? use(params as Promise<{ id: string }>) : (params as { id: string })
  const patientId = resolvedParams.id

  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [newConcept, setNewConcept] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [patientName, setPatientName] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    if (patientId) {
      fetchPatientInfo()
      fetchFinances()
    }
  }, [patientId])

  async function fetchPatientInfo() {
    try {
      const { data } = await supabase
        .from('patients')
        .select('full_name, name, phone')
        .eq('id', patientId)
        .maybeSingle()

      if (data) {
        setPatientName(data.full_name || data.name || data.phone || 'Paciente')
      }
    } catch {
      // Ignorar si falla lectura de nombre
    }
  }

  async function fetchFinances() {
    try {
      setLoading(true)
      // 1. Intentar consultar 'patient_financial_ledger'
      const { data, error } = await supabase
        .from('patient_financial_ledger')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const mapped: FinancialRecord[] = data.map((d: any) => ({
          id: d.id,
          concept: d.concept || 'Tratamiento Odontológico',
          total_amount: Number(d.total_amount ?? d.amount ?? 0),
          paid_amount: Number(d.paid_amount ?? 0),
          balance_due: Number(d.balance_due ?? (Number(d.total_amount ?? d.amount ?? 0) - Number(d.paid_amount ?? 0))),
          status: d.status || (Number(d.paid_amount ?? 0) >= Number(d.total_amount ?? d.amount ?? 0) ? 'Paid' : 'Pending'),
          created_at: d.created_at || new Date().toISOString()
        }))
        setRecords(mapped)
        return
      }

      // 2. Fallback a tabla 'payments' si patient_financial_ledger no existe aún
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      if (!paymentsError && paymentsData) {
        const mapped: FinancialRecord[] = paymentsData.map((p: any) => ({
          id: p.id,
          concept: p.description || p.concept || 'Servicio Odontológico',
          total_amount: Number(p.amount ?? 0),
          paid_amount: Number(p.amount ?? 0),
          balance_due: 0,
          status: 'Paid',
          created_at: p.created_at || new Date().toISOString()
        }))
        setRecords(mapped)
      } else {
        setRecords([])
      }
    } catch (error) {
      console.error('Error al cargar registros financieros:', error)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCharge(e: React.FormEvent) {
    e.preventDefault()
    if (!newConcept || !newAmount || submitting) return

    setSubmitting(true)
    const numericAmount = parseFloat(newAmount)

    try {
      // 1. Intentar inserción en 'patient_financial_ledger'
      const { error: ledgerError } = await supabase
        .from('patient_financial_ledger')
        .insert([
          {
            patient_id: patientId,
            concept: newConcept.trim(),
            total_amount: numericAmount,
            paid_amount: 0.00,
            balance_due: numericAmount,
            status: 'Pending'
          }
        ])

      if (ledgerError) {
        // Fallback a payments si ledger no está migrada
        console.warn('Fallback a payments:', ledgerError.message)
        await supabase.from('payments').insert([
          {
            patient_id: patientId,
            description: newConcept.trim(),
            amount: numericAmount,
            payment_method: 'Pendiente',
            status: 'pending'
          }
        ])
      }

      setNewConcept('')
      setNewAmount('')
      await fetchFinances()
    } catch (error) {
      console.error('Error al registrar cargo:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const totalDebt = records.reduce((acc, curr) => acc + (curr.balance_due || 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Navegación y Encabezado */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 font-semibold mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a CRM de Pacientes
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estado de Cuenta Financiero</h1>
            <p className="text-sm text-gray-500">
              Control de adeudos, cargos y pagos {patientName ? `para ${patientName}` : 'del paciente'}.
            </p>
          </div>
          <div className="bg-teal-50 border border-teal-200 px-4 py-2.5 rounded-xl shadow-xs">
            <span className="text-xs text-teal-700 block font-semibold uppercase tracking-wider">Saldo Pendiente Total</span>
            <span className="text-2xl font-black text-teal-900">${totalDebt.toFixed(2)} MXN</span>
          </div>
        </div>
      </div>

      {/* Formulario de Nuevo Cargo */}
      <form onSubmit={handleAddCharge} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 md:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Concepto de Tratamiento / Servicio
          </label>
          <input
            type="text"
            placeholder="Ej. Resina oclusal / Limpieza dental"
            value={newConcept}
            onChange={(e) => setNewConcept(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            required
          />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Monto Total ($ MXN)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-5 py-2 rounded-lg text-sm font-semibold transition h-[40px] inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {submitting ? 'Guardando...' : 'Agregar Cargo'}
        </button>
      </form>

      {/* Listado de Transacciones */}
      <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-600" />
            Historial de Transacciones y Cobros
          </h2>
          <button
            onClick={fetchFinances}
            title="Refrescar transacciones"
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-500 hover:text-gray-900 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Concepto</th>
                <th className="px-6 py-3 text-left">Total</th>
                <th className="px-6 py-3 text-left">Pagado</th>
                <th className="px-6 py-3 text-left">Saldo Pendiente</th>
                <th className="px-6 py-3 text-left">Estatus</th>
                <th className="px-6 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Cargando transacciones financieras...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No hay registros financieros para este paciente.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{rec.concept}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono">${rec.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium font-mono">${rec.paid_amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium font-mono">${rec.balance_due.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full border ${
                        rec.status === 'Paid'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                      }`}>
                        {rec.status === 'Paid' ? 'Liquidado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-500 font-mono">
                      {new Date(rec.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
