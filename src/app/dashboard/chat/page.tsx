'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import {
  MessageSquare,
  Users,
  ShieldCheck,
  Radio,
  Share2
} from 'lucide-react'

export default function ComunicacionPage() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Omni-Canal Clínico
            </span>
            <span className="text-slate-500 text-xs">• Sincronización Realtime Activa</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Comunicación Omni-Canal &amp; Redes Familiares</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Canales segmentados para el equipo médico y mensajería en cascada para pacientes y grupos familiares.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Canal Clínico Conectado
          </span>
        </div>
      </div>

      {/* Componente Central de Mensajería Omni-Canal */}
      <ChatInterface />
    </div>
  )
}
