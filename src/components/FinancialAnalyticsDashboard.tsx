'use client';

import React from 'react';

export function FinancialAnalyticsDashboard() {
  return (
    <div className="space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Auditoría Financiera & Inteligencia de Negocio</h2>
          <p className="text-sm text-neutral-400">Control de ingresos, canales de adquisición y análisis de red de referidos.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-medium">Periodo: Actual</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl">
          <span className="text-xs text-neutral-400 block mb-1">Ingresos Totales (Efectivo)</span>
          <span className="text-2xl font-bold text-green-400">$142,500 MXN</span>
          <span className="text-xs text-green-500 block mt-2">+12% vs mes anterior</span>
        </div>
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl">
          <span className="text-xs text-neutral-400 block mb-1">Transacciones por Trueque</span>
          <span className="text-2xl font-bold text-yellow-400">4 Servicios</span>
          <span className="text-xs text-neutral-400 block mt-2">Acuerdos familiares registrados</span>
        </div>
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl">
          <span className="text-xs text-neutral-400 block mb-1">Top Recomendador</span>
          <span className="text-xl font-bold text-cyan-400">Sra. Ángeles</span>
          <span className="text-xs text-neutral-400 block mt-2">14 referidos activos en red</span>
        </div>
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl">
          <span className="text-xs text-neutral-400 block mb-1">Canal Líder de Adquisición</span>
          <span className="text-xl font-bold text-purple-400">Red Familias (48%)</span>
          <span className="text-xs text-neutral-400 block mt-2">Seguido de QR y Redes</span>
        </div>
      </div>

      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">Desglose de Rentabilidad por Tratamiento</h3>
        <div className="space-y-3">
          {[
            { name: 'Implantes Dentales', revenue: '$65,000 MXN', margin: 'Alto', share: '45%' },
            { name: 'Ortodoncia Invisible', revenue: '$42,000 MXN', margin: 'Alto', share: '30%' },
            { name: 'Limpieza / Profilaxis', revenue: '$18,500 MXN', margin: 'Medio', share: '15%' },
            { name: 'Blanqueamiento LED', revenue: '$17,000 MXN', margin: 'Medio', share: '10%' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg">
              <div>
                <span className="font-medium block">{item.name}</span>
                <span className="text-xs text-neutral-400">Margen comercial: {item.margin}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-green-400 block">{item.revenue}</span>
                <span className="text-xs text-neutral-500">{item.share} del total</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
