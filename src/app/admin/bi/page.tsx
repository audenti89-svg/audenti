'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Users,
  DollarSign,
  AlertTriangle,
  Receipt,
  TrendingUp,
  RefreshCw,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'

interface BIData {
  totalPatients: number
  totalRevenue: number
  pendingBalance: number
  lowStockItems: number
}

export default function BIDashboardPage() {
  const [metrics, setMetrics] = useState<BIData>({
    totalPatients: 0,
    totalRevenue: 0,
    pendingBalance: 0,
    lowStockItems: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchBIMetrics()
  }, [])

  async function fetchBIMetrics() {
    try {
      setLoading(true)

      // 1. Total de Pacientes
      let patientCount = 0
      const { count: pCount, error: pErr } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })

      if (!pErr && typeof pCount === 'number') {
        patientCount = pCount
      }

      // 2. Transacciones Financieras para calcular ingresos y adeudos
      let totalRevenue = 0
      let pendingBalance = 0

      // Intentar leer patient_financial_ledger
      const { data: financialData, error: finErr } = await supabase
        .from('patient_financial_ledger')
        .select('paid_amount, balance_due, total_amount')

      if (!finErr && financialData && financialData.length > 0) {
        totalRevenue = financialData.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0)
        pendingBalance = financialData.reduce((acc, curr) => acc + (Number(curr.balance_due) || 0), 0)
      } else {
        // Fallback a tabla payments si patient_financial_ledger está vacía
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount, status')

        if (paymentsData && paymentsData.length > 0) {
          totalRevenue = paymentsData
            .filter((p) => p.status === 'completed' || p.status === 'Paid')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

          pendingBalance = paymentsData
            .filter((p) => p.status === 'pending' || p.status === 'Pending')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
        }
      }

      // 3. Insumos con stock bajo
      let lowStockItems = 0
      const { count: stockCount, error: stockErr } = await supabase
        .from('clinic_inventory')
        .select('*', { count: 'exact', head: true })
        .filter('stock_quantity', 'lte', 5)

      if (!stockErr && typeof stockCount === 'number') {
        lowStockItems = stockCount
      }

      setMetrics({
        totalPatients: patientCount || 0,
        totalRevenue,
        pendingBalance,
        lowStockItems: lowStockItems || 0,
      })
    } catch (error) {
      console.error('Error al cargar métricas BI:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wide">
              Módulo Ejecutivo BI
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Dra. Aura Estudillo • Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Business Intelligence (BI) &amp; Analítica</h1>
          <p className="text-sm text-gray-500">Métricas clave y rendimiento financiero de la clínica en tiempo real.</p>
        </div>

        <button
          onClick={fetchBIMetrics}
          title="Refrescar métricas"
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Calculando analíticas del sistema con Supabase...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tarjeta 1: Pacientes */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Pacientes</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mt-2">{metrics.totalPatients}</div>
            <span className="text-xs text-teal-600 font-semibold mt-1 block">Expedientes Únicos Activos</span>
          </div>

          {/* Tarjeta 2: Ingresos */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Ingresos Cobrados</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-green-600 mt-2">${metrics.totalRevenue.toFixed(2)}</div>
            <span className="text-xs text-gray-400 mt-1 block font-mono">MXN acumulados en caja</span>
          </div>

          {/* Tarjeta 3: Adeudos */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Cuentas por Cobrar</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-red-600 mt-2">${metrics.pendingBalance.toFixed(2)}</div>
            <span className="text-xs text-gray-400 mt-1 block font-mono">MXN pendientes de pago</span>
          </div>

          {/* Tarjeta 4: Alertas de Inventario */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Stock Crítico / Bajo</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-600 mt-2">{metrics.lowStockItems}</div>
            <span className="text-xs text-amber-600 font-semibold mt-1 block">Requieren reabastecimiento</span>
          </div>
        </div>
      )}
    </div>
  )
}
