'use client'

import {
  CalendarDays,
  Activity,
  CreditCard,
  FileSignature,
  Clock,
  Sparkles,
  CheckCircle2,
  Users
} from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PatientFlowTimeline } from '@/components/dashboard/PatientFlowTimeline'
import { FinanceCard } from '@/components/dashboard/FinanceCard'
import { PriorityTasksCard } from '@/components/dashboard/PriorityTasksCard'
import { QuickActions } from '@/components/dashboard/QuickActions'

import { useBranchStore } from '@/stores/branchStore'
import { DynamicQrWithLogo } from '@/components/ui/DynamicQrWithLogo'

export default function DashboardPage() {
  const currentBranch = useBranchStore((state) => state.getCurrentBranch())
  const metrics = currentBranch.dailyMetrics

  const today = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date())

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">

      {/* Welcome Banner */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold capitalize border border-slate-200/60">
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              {today}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {currentBranch.statusBadge}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Buen día, <span className="text-amber-600">{currentBranch.doctorInCharge}</span>
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Sede: <strong className="text-slate-900 font-bold">{currentBranch.name}</strong> • Jornada clínica:{' '}
            <strong className="text-slate-900 font-bold">{metrics.scheduledAppointments} pacientes programados</strong>{' '}
            ({metrics.waitingRoomCount} en recepción). Sillones e instrumental listos.
          </p>
        </div>

        {/* Resumen numérico */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/70 p-4 rounded-2xl shrink-0">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl font-bold shadow-xs">
            {metrics.scheduledAppointments}
          </div>
          <div className="flex flex-col pr-2">
            <span className="text-xs font-bold text-slate-900">Citas confirmadas</span>
            <span className="text-[11px] text-slate-500">{metrics.occupancyPct}% ocupación del día</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-amber-700">{metrics.waitingRoomCount} en espera</span>
            <span className="text-[11px] text-slate-500">Puntualidad en sala: 98%</span>
          </div>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <QuickActions />

      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          sector="calendar"
          label="Citas de Hoy"
          value={String(metrics.scheduledAppointments)}
          unit="programadas"
          lucideIcon={CalendarDays}
          badges={[
            { label: '1 en atención', color: 'gold' },
            { label: `${metrics.waitingRoomCount} en sala`, color: 'neutral' },
            { label: `${Math.max(0, metrics.scheduledAppointments - 1 - metrics.waitingRoomCount)} pendientes`, color: 'muted' },
          ]}
        />
        <KpiCard
          sector="chair"
          label="En Sillón Ahora"
          value={metrics.inChairNow.patient}
          unit={`${metrics.inChairNow.time} • ${metrics.inChairNow.procedure}`}
          lucideIcon={Activity}
          highlight
          badge={{ label: 'Activo', color: 'success', pulse: true }}
        />
        <KpiCard
          sector="finance"
          label="Caja del Turno"
          value={metrics.shiftIncome}
          unit="MXN"
          lucideIcon={CreditCard}
          progress={{ value: metrics.shiftProgressPct, max: 100, label: `Meta ${metrics.shiftTarget}` }}
        />
        <KpiCard
          sector="pending"
          label="Notas por Firmar"
          value={String(metrics.pendingSoapNotes)}
          unit="notas SOAP pendientes"
          lucideIcon={FileSignature}
          badge={{ label: 'Revisión', color: 'error' }}
          action={{ label: 'Revisar y firmar →', href: '/dashboard/expediente' }}
        />
      </section>

      {/* Main 2-column layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Patient Flow Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <PatientFlowTimeline />
        </div>

        {/* Right: Finance + Tasks + Dynamic QR (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <FinanceCard />
          <DynamicQrWithLogo
            title="Código QR Institucional • Audenti"
            subtitle="Dra. Aura Estudillo • Escanear para acceder a la PWA o referir pacientes"
            size={180}
            referralCode="AUD-AURA-BLB"
          />
          <PriorityTasksCard />
        </div>
      </section>
    </div>
  )
}
