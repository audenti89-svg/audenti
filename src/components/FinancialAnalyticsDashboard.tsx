'use client';

import React from 'react';
import { TrendingUp, Repeat, Users, Share2, Award, ArrowUpRight, ShieldCheck, DollarSign } from 'lucide-react';

export function FinancialAnalyticsDashboard() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 uppercase tracking-wide">
            Auditoría Avanzada de Rentabilidad &amp; Trueques
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
            Inteligencia de Negocio &amp; Canales de Adquisición
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Desglose de liquidez vs compensaciones en especie y rendimiento de la red familiar de la Dra. Aura Estudillo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            Ejercicio Fiscal: 2026 (En Tiempo Real)
          </span>
        </div>
      </div>

      {/* Grid de Métricas Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos Efectivo / Banco</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-slate-900">$142,500 <span className="text-xs font-normal text-slate-500">MXN</span></span>
          <span className="text-xs text-emerald-600 font-bold block mt-1">+12% vs mes anterior</span>
        </div>

        <div className="p-5 bg-white border border-purple-200/80 rounded-2xl shadow-2xs bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Servicios en Trueque</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-purple-950">4 Acuerdos</span>
          <span className="text-xs text-purple-700 font-medium block mt-1">Software CRM &amp; Servicios Legales</span>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Recomendador</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-bold text-slate-900">Sra. Ángeles</span>
          <span className="text-xs text-amber-600 font-bold block mt-1">14 referidos activos en red</span>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Canal Líder Adquisición</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl font-bold text-slate-900">Red Familias (48%)</span>
          <span className="text-xs text-blue-600 font-medium block mt-1">Seguido de Códigos QR y Web</span>
        </div>
      </div>

      {/* Desglose de Rentabilidad por Tratamiento */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Desglose de Rentabilidad Clínica por Tratamiento</h3>
            <p className="text-xs text-slate-400">Margen operativo y participación porcentual en los ingresos</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Margen Promedio: 68%
          </span>
        </div>

        <div className="space-y-3">
          {[
            { name: 'Implantes Dentales & Cirugía Guiada', revenue: '$65,000 MXN', margin: 'Alto (72%)', share: '45%' },
            { name: 'Ortodoncia Invisible & Alineadores', revenue: '$42,000 MXN', margin: 'Alto (68%)', share: '30%' },
            { name: 'Limpieza / Profilaxis Ultrasónica', revenue: '$18,500 MXN', margin: 'Medio (58%)', share: '15%' },
            { name: 'Blanqueamiento LED & Estética Dental', revenue: '$17,000 MXN', margin: 'Medio (62%)', share: '10%' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl hover:bg-slate-100/70 transition-colors">
              <div>
                <span className="font-bold text-xs text-slate-900 block">{item.name}</span>
                <span className="text-[11px] text-slate-500">Margen comercial: <strong className="text-slate-700">{item.margin}</strong></span>
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
