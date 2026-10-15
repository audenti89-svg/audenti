'use client'

import { useState, useEffect } from 'react'
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  CreditCard,
  Banknote,
  Receipt,
  Download,
  Plus,
  RefreshCw,
  Wallet
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.warn('Nota en pagos (tabla limpia para producción):', err)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const totalIncome = transactions
    .filter((t) => t.type === 'income' || !t.type)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

  const netBalance = totalIncome - totalExpense

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
            Caja &amp; Tesorería Oficial
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Módulo Financiero &amp; Arqueo de Caja</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dra. Aura Estudillo • Céd. Prof. 8492019 | Control de ingresos, comisiones, pagos de pacientes y cortes de caja.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchTransactions}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Sincronizar caja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href="/api/export?format=excel"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200 shadow-2xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar Excel
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            + Registrar Cobro / Egreso
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero con Fallback en Cero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Cobros aplicados en la plataforma</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Egresos / Gastos</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Insumos y laboratorio clínico</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Balance Neto en Caja</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black ${netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            ${netBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Fondo líquido disponible</span>
        </div>
      </div>

      {/* Historial de Movimientos de Caja */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Libro Diario de Transacciones</h2>
          <span className="text-xs text-slate-400">{transactions.length} registros</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Cargando libro contable de Supabase...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Caja limpia para el inicio de operaciones</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay transacciones registradas todavía. Los cobros de tratamientos y liquidaciones de pacientes se reflejarán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Folio / Fecha</th>
                  <th className="px-6 py-3">Concepto</th>
                  <th className="px-6 py-3">Método de Pago</th>
                  <th className="px-6 py-3">Monto</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-slate-900 block">{trx.id.slice(0, 8)}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(trx.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {trx.description || 'Cobro Odontológico'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {trx.payment_method || 'Terminal / Efectivo'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ${Number(trx.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {trx.status || 'Liquidado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
