'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { InternalMessagingCenter } from '@/components/InternalMessagingCenter'
import {
  MessageSquare,
  Users,
  ShieldCheck,
  Radio,
  Share2,
  Megaphone,
  Cpu,
  Layers
} from 'lucide-react'

export default function ComunicacionUnifiedPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'circulars'>('chat')

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wide">
              Omni-Canal Clínico &amp; OpenWA Gateway
            </span>
            <span className="text-slate-500 text-xs">• Sincronización Realtime Activa</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Comunicación Omni-Canal &amp; Directrices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Canales centralizados de WhatsApp (OpenWA / Zernio / Meta), mensajería familiar en cascada y emisión de directivas de la Dra. Aura Estudillo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Pasarela OpenWA &amp; WhatsApp Conectada
          </span>
        </div>
      </div>

      {/* Selector de Pestañas de Comunicación */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/70">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-600" />
          <span>Chat Omni-Canal &amp; Redes Familiares</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('circulars')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'circulars'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-4 h-4 text-purple-600" />
          <span>Emisión de Directrices al Personal</span>
        </button>
      </div>

      {/* Renderizado de Módulo */}
      {activeTab === 'chat' ? (
        <ChatInterface />
      ) : (
        <InternalMessagingCenter />
      )}
    </div>
  )
}
