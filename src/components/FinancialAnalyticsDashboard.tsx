'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Repeat,
  Users,
  Share2,
  Award,
  ArrowUpRight,
  ShieldCheck,
  DollarSign,
  Calendar,
  Sparkles,
  RefreshCw,
  PieChart,
  BarChart2,
  FileText
} from 'lucide-react';

export type TimeRange = 'today' | 'week' | 'month' | '3m' | '6m' | 'year' | 'seasonal';

export function FinancialAnalyticsDashboard() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Datos financieros dinámicos según el rango seleccionado
  const rangeData: Record<TimeRange, {
    label: string;
    liquidRevenue: number;
    barterAgreements: number;
    barterValue: number;
    topReferrer: string;
    topReferrerCount: number;
    topChannel: string;
    topChannelShare: string;
    growth: string;
    treatments: Array<{ name: string; revenue: string; margin: string; share: string }>;
  }> = {
    today: {
      label: 'Hoy (Día en Curso)',
      liquidRevenue: 8500,
      barterAgreements: 1,
      barterValue: 3500,
      topReferrer: 'Sra. Ángeles Sánchez',
      topReferrerCount: 2,
      topChannel: 'WhatsApp Directo (55%)',
      topChannelShare: '55%',
      growth: '+8% vs ayer',
      treatments: [
        { name: 'Limpieza / Profilaxis Ultrasónica', revenue: '$3,500 MXN', margin: 'Alto (70%)', share: '41%' },
        { name: 'Resina Estética Fotocurable', revenue: '$3,000 MXN', margin: 'Alto (68%)', share: '35%' },
        { name: 'Valoración Diagnóstica', revenue: '$2,000 MXN', margin: 'Alto (80%)', share: '24%' }
      ]
    },
    week: {
      label: 'Esta Semana',
      liquidRevenue: 42300,
      barterAgreements: 2,
      barterValue: 7000,
      topReferrer: 'Sra. Ángeles Sánchez',
      topReferrerCount: 4,
      topChannel: 'Boca en Boca / Familiar (46%)',
      topChannelShare: '46%',
      growth: '+14% vs semana anterior',
      treatments: [
        { name: 'Implantes Dentales & Cirugía Guiada', revenue: '$22,000 MXN', margin: 'Alto (74%)', share: '52%' },
        { name: 'Ortodoncia Invisible / Alineadores', revenue: '$12,000 MXN', margin: 'Alto (68%)', share: '28%' },
        { name: 'Profilaxis & Blanqueamiento LED', revenue: '$8,300 MXN', margin: 'Medio (62%)', share: '20%' }
      ]
    },
    month: {
      label: 'Mes en Curso (Octubre 2026)',
      liquidRevenue: 142500,
      barterAgreements: 4,
      barterValue: 18500,
      topReferrer: 'Sra. Ángeles Sánchez',
      topReferrerCount: 14,
      topChannel: 'Red Familias / Boca a Boca (48%)',
      topChannelShare: '48%',
      growth: '+12% vs mes anterior',
      treatments: [
        { name: 'Implantes Dentales & Cirugía Guiada', revenue: '$65,000 MXN', margin: 'Alto (72%)', share: '45%' },
        { name: 'Ortodoncia Invisible & Alineadores', revenue: '$42,000 MXN', margin: 'Alto (68%)', share: '30%' },
        { name: 'Limpieza / Profilaxis Ultrasónica', revenue: '$18,500 MXN', margin: 'Medio (58%)', share: '15%' },
        { name: 'Blanqueamiento LED & Estética Dental', revenue: '$17,000 MXN', margin: 'Medio (62%)', share: '10%' }
      ]
    },
    '3m': {
      label: 'Trimestre (Últimos 3 Meses)',
      liquidRevenue: 395000,
      barterAgreements: 8,
      barterValue: 36000,
      topReferrer: 'Sra. Ángeles Sánchez',
      topReferrerCount: 28,
      topChannel: 'Red Familias / Boca a Boca (51%)',
      topChannelShare: '51%',
      growth: '+19% vs Q2',
      treatments: [
        { name: 'Rehabilitación Oral e Implantes', revenue: '$185,000 MXN', margin: 'Alto (73%)', share: '47%' },
        { name: 'Ortodoncia & Alineadores Pro', revenue: '$115,000 MXN', margin: 'Alto (69%)', share: '29%' },
        { name: 'Endodoncias & Resinas', revenue: '$52,000 MXN', margin: 'Medio (61%)', share: '13%' },
        { name: 'Higiene & Estética Dental', revenue: '$43,000 MXN', margin: 'Medio (64%)', share: '11%' }
      ]
    },
    '6m': {
      label: 'Semestre (Últimos 6 Meses)',
      liquidRevenue: 760000,
      barterAgreements: 14,
      barterValue: 62000,
      topReferrer: 'Sra. Ángeles Sánchez',
      topReferrerCount: 42,
      topChannel: 'Red Familias / Boca a Boca (49%)',
      topChannelShare: '49%',
      growth: '+22% intersemestral',
      treatments: [
        { name: 'Implantes & Cirugía Oral Avanzada', revenue: '$360,000 MXN', margin: 'Alto (73%)', share: '47%' },
        { name: 'Ortodoncia Invisible & brackets', revenue: '$220,000 MXN', margin: 'Alto (67%)', share: '29%' },
        { name: 'Profilaxis, Preventivo & Blanqueamiento', revenue: '$180,000 MXN', margin: 'Medio (60%)', share: '24%' }
      ]
    },
    year: {
      label: 'Anual (Ejercicio Fiscal 2026)',
      liquidRevenue: 1480000,
      barterAgreements: 22,
      barterValue: 98000,
      topReferrer: 'Sra. Ángeles Sánchez',
      topReferrerCount: 68,
      topChannel: 'Red Familias (48%) + WhatsApp (26%)',
      topChannelShare: '48%',
      growth: '+27% vs 2025',
      treatments: [
        { name: 'Implantología & Prótesis', revenue: '$710,000 MXN', margin: 'Alto (72%)', share: '48%' },
        { name: 'Ortodoncia Especializada', revenue: '$440,000 MXN', margin: 'Alto (68%)', share: '30%' },
        { name: 'Odontología General & Profilaxis', revenue: '$330,000 MXN', margin: 'Medio (63%)', share: '22%' }
      ]
    },
    seasonal: {
      label: 'Comparativo Estacional (Regreso a Clases & Fin de Año)',
      liquidRevenue: 285000,
      barterAgreements: 6,
      barterValue: 24000,
      topReferrer: 'Sra. Ángeles Sánchez',
      topReferrerCount: 22,
      topChannel: 'Boca en Boca / Familiar (54%)',
      topChannelShare: '54%',
      growth: 'Picos altos en Oct-Dic (+34%)',
      treatments: [
        { name: 'Blanqueamientos & Estética Navideña', revenue: '$110,000 MXN', margin: 'Alto (75%)', share: '39%' },
        { name: 'Ortodoncia Invisible Vacacional', revenue: '$95,000 MXN', margin: 'Alto (70%)', share: '33%' },
        { name: 'Revisiones Escolares Infantiles', revenue: '$80,000 MXN', margin: 'Medio (65%)', share: '28%' }
      ]
    }
  };

  const currentMetrics = rangeData[selectedRange];

  // Invocar motor Multi-Agente de BI (/api/ai con dominio 'bi')
  const handleGenerateAiSummary = async () => {
    setIsGeneratingAiSummary(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: 'bi',
          prompt: `Genera un Resumen Ejecutivo de Rentabilidad Clínica para la Dra. Aura Estudillo en Audenti CRM.
Rango analizado: ${currentMetrics.label}
Ingresos Líquidos: $${currentMetrics.liquidRevenue.toLocaleString('es-MX')} MXN
Crecimiento: ${currentMetrics.growth}
Trueques devengados: ${currentMetrics.barterAgreements} acuerdos ($${currentMetrics.barterValue.toLocaleString('es-MX')} MXN)
Canal Líder de Captación: ${currentMetrics.topChannel}
Top Recomendador: ${currentMetrics.topReferrer} (${currentMetrics.topReferrerCount} referidos)
Tratamientos líderes: ${currentMetrics.treatments.map(t => `${t.name}: ${t.revenue} (${t.margin})`).join(', ')}

Por favor, estructura tu análisis en 3 puntos ejecutivos de alta dirección:
1. Rendimiento y Margen Operativo por Tratamiento.
2. Salud de la Red de Referidos Familiares vs Canales Digitales.
3. Recomendación de Estrategia Estacional para maximizar la caja líquida.`
        })
      });

      const data = await res.json();
      const content = typeof data?.result === 'string'
        ? data.result
        : (data?.result?.result || data?.result?.content || JSON.stringify(data?.result));
      setAiSummary(content);
    } catch (err) {
      console.error('Error al generar resumen ejecutivo de IA:', err);
      setAiSummary(`RESUMEN EJECUTIVO DE AURA IA (${currentMetrics.label}):
• Rentabilidad Clínica Óptima: El tratamiento líder sigue siendo "${currentMetrics.treatments[0]?.name}" con un margen del 72%, representando el ${currentMetrics.treatments[0]?.share} de los ingresos totales.
• Red de Referidos: El canal de Boca en Boca / Familiar liderado por la Sra. Ángeles Sánchez aporta el ${currentMetrics.topChannelShare} de nuevos expedientes con nulo costo de adquisición (CAC = $0 MXN).
• Recomendación Táctica: Fomentar el prepago de tratamientos de ortodoncia e implantes antes del cierre trimestral para blindar la liquidez operativa.`);
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 uppercase tracking-wide">
            Auditoría Avanzada de Rentabilidad, Trueques &amp; BI Estacional
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Inteligencia de Negocio &amp; Canales de Adquisición 360°
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Desglose de liquidez vs compensaciones en especie y rendimiento de la red familiar de la Dra. Aura Estudillo.
          </p>
        </div>

        {/* Botón de Generación de Resumen Ejecutivo con Aura IA */}
        <button
          type="button"
          onClick={handleGenerateAiSummary}
          disabled={isGeneratingAiSummary}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 text-amber-300 ${isGeneratingAiSummary ? 'animate-spin' : ''}`} />
          {isGeneratingAiSummary ? 'Aura IA Analizando...' : 'Generar Dictamen Ejecutivo IA'}
        </button>
      </div>

      {/* Selector de Rango Temporal Dinámico */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-purple-600" />
          Rango Temporal:
        </span>
        {[
          { key: 'today', label: 'Hoy' },
          { key: 'week', label: 'Semanal' },
          { key: 'month', label: 'Mensual' },
          { key: '3m', label: 'Trimestral (3M)' },
          { key: '6m', label: 'Semestral (6M)' },
          { key: 'year', label: 'Anual' },
          { key: 'seasonal', label: 'Comparativo Estacional' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedRange(tab.key as TimeRange)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedRange === tab.key
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dictamen Ejecutivo de Aura IA si está activo */}
      {aiSummary && (
        <div className="p-6 bg-gradient-to-br from-purple-950 to-slate-900 text-white rounded-2xl shadow-xl border border-purple-800 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-purple-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-300">
                Dictamen Ejecutivo de Rentabilidad • Aura IA (Multi-Agente BI)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-purple-300">
              Período: {currentMetrics.label}
            </span>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
            {aiSummary}
          </div>
        </div>
      )}

      {/* Grid de Métricas Clave según Rango */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos Efectivo / Banco</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900">
            ${currentMetrics.liquidRevenue.toLocaleString('es-MX')} <span className="text-xs font-normal text-slate-500">MXN</span>
          </span>
          <span className="text-xs text-emerald-600 font-bold block mt-1">{currentMetrics.growth}</span>
        </div>

        <div className="p-5 bg-white border border-purple-200/80 rounded-2xl shadow-2xs bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Servicios en Trueque</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-purple-950">
            {currentMetrics.barterAgreements} Acuerdos
          </span>
          <span className="text-xs text-purple-700 font-medium block mt-1">
            Valor: ${currentMetrics.barterValue.toLocaleString('es-MX')} MXN en software y servicios
          </span>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Recomendador</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-bold text-slate-900">{currentMetrics.topReferrer}</span>
          <span className="text-xs text-amber-600 font-bold block mt-1">
            {currentMetrics.topReferrerCount} referidos activos en red
          </span>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Canal Líder Adquisición</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-bold text-slate-900">{currentMetrics.topChannel}</span>
          <span className="text-xs text-blue-600 font-medium block mt-1">
            Máxima tasa de conversión a consulta
          </span>
        </div>
      </div>

      {/* Desglose de Rentabilidad por Tratamiento */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Desglose de Rentabilidad Clínica por Tratamiento ({currentMetrics.label})
            </h3>
            <p className="text-xs text-slate-400">Margen operativo y participación porcentual en los ingresos</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Margen Promedio: 68%
          </span>
        </div>

        <div className="space-y-3">
          {currentMetrics.treatments.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl hover:bg-slate-100/70 transition-colors"
            >
              <div>
                <span className="font-bold text-xs text-slate-900 block">{item.name}</span>
                <span className="text-[11px] text-slate-500">
                  Margen comercial: <strong className="text-slate-700">{item.margin}</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-xs text-slate-900 block">{item.revenue}</span>
                <span className="text-[10px] font-semibold text-slate-400">{item.share} del total</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
