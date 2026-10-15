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
  Wallet,
  Repeat,
  ShieldCheck,
  CheckCircle,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function FinanzasPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [savingTransaction, setSavingTransaction] = useState(false)
  const [modalType, setModalType] = useState<'cobro' | 'trueque' | 'egreso'>('cobro')

  // Formulario de Transacción
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    paymentMethod: 'Efectivo',
    patientName: '',
    // Campos específicos para Trueque / Intercambio Profesional
    barterServiceReceived: 'Desarrollo Web & Software Clínico',
    barterCounterpartName: '',
    barterCommercialValue: '',
    barterInvoiceTaxRef: '',
  })

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

  // Cálculos contables
  // Los verdaderos cobros en líquido
  const liquidIncome = transactions
    .filter((t) => (t.type === 'income' || !t.type) && t.payment_method !== 'Trueque / Intercambio Profesional')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

  // Los intercambios de servicios (trueque)
  const barterTotal = transactions
    .filter((t) => t.payment_method === 'Trueque / Intercambio Profesional' && (t.type === 'income' || t.type === 'barter_in'))
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

  // Egresos líquidos (excluyendo el egreso compensatorio del trueque para cálculo de caja real)
  const liquidExpense = transactions
    .filter((t) => t.type === 'expense' && t.payment_method !== 'Trueque / Intercambio Profesional')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

  // Balance Neto Líquido en Caja (No se infla ni desbalancea con los trueques)
  const netLiquidBalance = liquidIncome - liquidExpense

  const handleOpenModal = (type: 'cobro' | 'trueque' | 'egreso' = 'cobro') => {
    setModalType(type)
    setFormData({
      amount: '',
      description: type === 'trueque' ? 'Tratamiento Dental en Trueque Profesional' : '',
      paymentMethod: type === 'trueque' ? 'Trueque / Intercambio Profesional' : 'Efectivo',
      patientName: '',
      barterServiceReceived: 'Desarrollo Web & Plataforma CRM',
      barterCounterpartName: '',
      barterCommercialValue: '',
      barterInvoiceTaxRef: '',
    })
    setIsModalOpen(true)
  }

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingTransaction(true)

    try {
      const { data: defaultTenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle()

      if (modalType === 'trueque') {
        const val = parseFloat(formData.barterCommercialValue || formData.amount) || 0
        const counterpart = formData.barterCounterpartName.trim() || formData.patientName.trim() || 'Profesional Aliado'
        const service = formData.barterServiceReceived.trim() || 'Servicios Profesionales Externos'

        // Registro doble de partida contable (Ingreso por Odontología + Egreso por Servicio Recibido)
        const incomeEntry: any = {
          amount: val,
          type: 'barter_in',
          status: 'Liquidado en Especie',
          payment_method: 'Trueque / Intercambio Profesional',
          description: `Ingreso Valuado: ${formData.description || 'Tratamiento Dental'} (Intercambio con ${counterpart} por: ${service})`,
        }

        const expenseEntry: any = {
          amount: val,
          type: 'barter_out',
          status: 'Devengado en Especie',
          payment_method: 'Trueque / Intercambio Profesional',
          description: `Gasto Compensado: Servicios de ${service} prestados por ${counterpart} (Compensación 1:1 sin salida de caja líquida)`,
        }

        if (defaultTenant?.id) {
          incomeEntry.tenant_id = defaultTenant.id
          expenseEntry.tenant_id = defaultTenant.id
        }

        await supabase.from('payments').insert([incomeEntry, expenseEntry])
      } else {
        const val = parseFloat(formData.amount) || 0
        const entry: any = {
          amount: val,
          type: modalType === 'egreso' ? 'expense' : 'income',
          status: 'completed',
          payment_method: formData.paymentMethod,
          description: formData.description || (modalType === 'egreso' ? 'Gasto de Insumos / Clínica' : 'Cobro de Consulta / Tratamiento'),
        }

        if (defaultTenant?.id) entry.tenant_id = defaultTenant.id
        await supabase.from('payments').insert([entry])
      }

      setIsModalOpen(false)
      fetchTransactions()
    } catch (err: any) {
      console.error('Error al guardar movimiento financiero:', err)
      alert(err?.message || 'Error al guardar la transacción')
    } finally {
      setSavingTransaction(false)
    }
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Caja &amp; Tesorería Oficial
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Dra. Aura Estudillo • Céd. Prof. 8492019
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Módulo Financiero &amp; Arqueo de Caja</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Control de ingresos líquidos, gastos clínicos y registro contable de Trueques / Intercambios Profesionales.
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

          {/* Botón Trueque / Intercambio */}
          <button
            type="button"
            onClick={() => handleOpenModal('trueque')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-colors shadow-2xs"
          >
            <Repeat className="w-4 h-4 text-purple-600" />
            + Registrar Trueque
          </button>

          {/* Botón Cobro / Egreso Estándar */}
          <button
            type="button"
            onClick={() => handleOpenModal('cobro')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            + Registrar Cobro / Gasto
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero con Fallback en Cero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Líquidos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos Líquidos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${liquidIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Entradas reales a cuenta y efectivo</span>
        </div>

        {/* Egresos Líquidos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Egresos / Gastos</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            ${liquidExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Compras de insumos y laboratorio</span>
        </div>

        {/* Módulo Trueque / Intercambios Devengados */}
        <div className="bg-white p-5 rounded-2xl border border-purple-200/80 shadow-2xs bg-gradient-to-br from-white to-purple-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Trueques Profesionales</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-950">
            ${barterTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-purple-700/80 mt-1 block">Valor comercial compensado 1:1</span>
        </div>

        {/* Balance Líquido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Caja Líquida Real</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black ${netLiquidBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            ${netLiquidBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Fondo líquido disponible en banco</span>
        </div>
      </div>

      {/* Historial de Movimientos de Caja */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Libro Diario de Transacciones &amp; Partidas Dobles</h2>
            <p className="text-xs text-slate-400">Incluye cobros ordinarios e intercambios en especie auditados.</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {transactions.length} registros
          </span>
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
              No hay transacciones registradas todavía. Puedes registrar cobros en efectivo, terminal bancaria o trueques de servicios profesionales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Folio / Fecha</th>
                  <th className="px-6 py-3.5">Concepto Contable</th>
                  <th className="px-6 py-3.5">Método / Naturaleza</th>
                  <th className="px-6 py-3.5">Monto Valuado</th>
                  <th className="px-6 py-3.5">Efecto en Caja</th>
                  <th className="px-6 py-3.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx) => {
                  const isBarter = trx.payment_method === 'Trueque / Intercambio Profesional' || trx.type === 'barter_in' || trx.type === 'barter_out'

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 block">{trx.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(trx.created_at).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{trx.description || 'Movimiento de Odontología'}</p>
                        {isBarter && (
                          <span className="text-[10px] text-purple-700 font-medium flex items-center gap-1 mt-0.5">
                            <Repeat className="w-3 h-3 text-purple-500" />
                            Compensación en especie sin impacto a liquidez
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isBarter ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                            <Repeat className="w-3 h-3" />
                            Trueque Profesional
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">
                            {trx.payment_method || 'Terminal / Efectivo'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ${Number(trx.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        {isBarter ? (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Neutral ($0.00 neto)
                          </span>
                        ) : trx.type === 'expense' ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            - Salida Líquida
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            + Entrada Líquida
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {trx.status || 'Liquidado'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Registrar Cobro o Trueque Profesional */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-slate-900 animate-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-slate-100">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
                Exclusivo Dra. Aura Estudillo
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {modalType === 'trueque'
                  ? 'Registro de Trueque / Intercambio Profesional'
                  : modalType === 'egreso'
                  ? 'Registrar Egreso / Insumos de Clínica'
                  : 'Registrar Cobro Dental Ordinario'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {modalType === 'trueque'
                  ? 'Acredita el valor dental como ingreso y asienta el gasto por el servicio recibido en partida doble sin alterar la caja líquida.'
                  : 'Ingreso directo al libro contable oficial de Audenti.'}
              </p>
            </div>

            {/* Pestañas de tipo de movimiento */}
            <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalType('cobro')}
                className={`py-2 rounded-lg transition ${
                  modalType === 'cobro' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Cobro Líquido
              </button>
              <button
                type="button"
                onClick={() => setModalType('trueque')}
                className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                  modalType === 'trueque' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:text-purple-900'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                Trueque Pro
              </button>
              <button
                type="button"
                onClick={() => setModalType('egreso')}
                className={`py-2 rounded-lg transition ${
                  modalType === 'egreso' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Egreso Insumo
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
              {modalType === 'trueque' ? (
                <>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
                    <strong>Mecánica Contable Automática:</strong> El sistema creará un ingreso por el valor del procedimiento dental y un egreso simultáneo por el servicio profesional prestado, manteniendo el balance de inventario de insumos sin tocar el flujo de efectivo.
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Profesional / Empresa Aliada *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Ing. Carlos Valencia / Agencia Web"
                      value={formData.barterCounterpartName}
                      onChange={(e) => setFormData({ ...formData, barterCounterpartName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Servicio Profesional Recibido *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Desarrollo Web, Servicios Legales, Marketing o Arquitectura"
                      value={formData.barterServiceReceived}
                      onChange={(e) => setFormData({ ...formData, barterServiceReceived: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Valor Comercial Equivalente ($ MXN) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ej. 15000"
                        value={formData.barterCommercialValue}
                        onChange={(e) => setFormData({ ...formData, barterCommercialValue: e.target.value, amount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Procedimiento Dental Otorgado
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. 4 Carillas Cerámicas E.Max"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Monto ($ MXN) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ej. 2500"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Método de Pago
                      </label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                      >
                        <option value="Efectivo">Efectivo en Caja</option>
                        <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                        <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                        <option value="Transferencia SPEI">Transferencia SPEI</option>
                        <option value="Trueque / Intercambio Profesional">Trueque / Intercambio Profesional</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Descripción o Concepto
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Limpieza ultrasónica y resina estética"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTransaction}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 ${
                    modalType === 'trueque'
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                  }`}
                >
                  {savingTransaction ? (
                    'Procesando en Supabase...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {modalType === 'trueque' ? 'Asentar Trueque Contable' : 'Guardar en Libro Diario'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
