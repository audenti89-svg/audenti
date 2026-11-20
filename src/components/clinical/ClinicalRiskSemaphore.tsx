'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Activity,
  Zap,
  Info,
  CheckCircle2,
  HeartPulse,
  Flame,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type RiskLevel = 'verde' | 'amarillo' | 'naranja' | 'rojo' | 'azul';

export interface ClinicalRiskSemaphoreProps {
  allergies?: string[] | string | null;
  hasNoAllergies?: boolean;
  allergyNotes?: string | null;
  hasPainOrEmergency?: boolean;
  hasStructuralRisk?: boolean;
  hasNerveInvolvement?: boolean;
  compact?: boolean;
  className?: string;
}

export function ClinicalRiskSemaphore({
  allergies,
  hasNoAllergies = false,
  allergyNotes,
  hasPainOrEmergency = false,
  hasStructuralRisk = false,
  hasNerveInvolvement = false,
  compact = false,
  className
}: ClinicalRiskSemaphoreProps) {
  // Normalizar lista de alergias
  const allergiesList: string[] = Array.isArray(allergies)
    ? allergies
    : typeof allergies === 'string' && allergies.trim()
    ? allergies.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  const rawLower = (Array.isArray(allergies) ? allergies.join(' ') : String(allergies || '')).toLowerCase();
  const notesLower = String(allergyNotes || '').toLowerCase();

  // Detección de gravedad de alergias y riesgos
  const isPenicillinOrAnesthetic =
    rawLower.includes('penicil') ||
    rawLower.includes('amoxicil') ||
    rawLower.includes('lidocain') ||
    rawLower.includes('anestes') ||
    rawLower.includes('latex') ||
    notesLower.includes('penicil') ||
    notesLower.includes('anafil');

  const isNsaidOrModerate =
    rawLower.includes('aspirin') ||
    rawLower.includes('ibuprofen') ||
    rawLower.includes('ketorolac') ||
    rawLower.includes('naproxen') ||
    rawLower.includes('sulfas');

  // Evaluación del Semáforo Clínico (NOM-004-SSA3)
  let level: RiskLevel = 'verde';
  let title = 'Sin Alergias Reportadas';
  let description = 'Paciente sin alergias medicamentosas conocidas ni factores de riesgo agudo.';
  let badgeText = 'Seguro • Sin Alergias';

  if (isPenicillinOrAnesthetic || hasPainOrEmergency) {
    level = 'rojo';
    title = isPenicillinOrAnesthetic
      ? '¡ALERTA CRÍTICA: Alergia a Betalactámicos / Anestésico!'
      : '¡URGENCIA ACTIVA: Dolor Agudo / Infección!';
    description = isPenicillinOrAnesthetic
      ? 'Prohibida la administración de penicilinas, amoxicilina o anestésicos con el alérgeno detectado.'
      : 'Paciente con dolor dental severo o proceso infeccioso activo que requiere atención inmediata.';
    badgeText = 'Riesgo Crítico';
  } else if (isNsaidOrModerate || hasStructuralRisk) {
    level = 'naranja';
    title = isNsaidOrModerate
      ? 'Precaución: Alergia a Medicamentos (AINEs / Sulfas)'
      : 'Riesgo Estructural Dental / Periodontal';
    description = isNsaidOrModerate
      ? 'Ajustar prescripción analgésica alternativa (evitar AINEs reportados).'
      : 'Pieza con destrucción coronal mayor al 60% o pérdida ósea severa.';
    badgeText = 'Riesgo Moderado';
  } else if (hasNerveInvolvement) {
    level = 'azul';
    title = 'Compromiso de Inervación / Sistema Nervioso';
    description = 'Presencia de parestesia, dolor urente o afectación en ramas trigeminales (V1, V2, V3).';
    badgeText = 'Inervación Nerviosa';
  } else if (allergiesList.length > 0 && !hasNoAllergies) {
    level = 'amarillo';
    title = 'Alergias Leves / Factores de Precaución';
    description = `Alergias reportadas: ${allergiesList.join(', ')}. Verificar antes de anestesiar.`;
    badgeText = 'Precaución Leve';
  }

  // Estilos visuales por código de color
  const levelStyles: Record<RiskLevel, {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ReactNode;
    ring: string;
  }> = {
    verde: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/40',
      text: 'text-emerald-200',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      ring: 'ring-emerald-400/20',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    },
    amarillo: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/40',
      text: 'text-amber-200',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      ring: 'ring-amber-400/20',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
    },
    naranja: {
      bg: 'bg-orange-950/50',
      border: 'border-orange-500/50',
      text: 'text-orange-200',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-300',
      ring: 'ring-orange-400/20',
      icon: <AlertOctagon className="w-4 h-4 text-orange-400" />
    },
    rojo: {
      bg: 'bg-rose-950/60',
      border: 'border-rose-500/60',
      text: 'text-rose-100',
      badgeBg: 'bg-rose-500/25',
      badgeText: 'text-rose-300',
      ring: 'ring-rose-500/40',
      icon: <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
    },
    azul: {
      bg: 'bg-cyan-950/40',
      border: 'border-cyan-500/40',
      text: 'text-cyan-200',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300',
      ring: 'ring-cyan-400/20',
      icon: <Zap className="w-4 h-4 text-cyan-400" />
    }
  };

  const currentStyle = levelStyles[level];

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all',
          currentStyle.bg,
          currentStyle.border,
          currentStyle.text,
          className
        )}
      >
        {currentStyle.icon}
        <span className="font-black text-[11px] tracking-wide">{badgeText}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-3.5 rounded-2xl border backdrop-blur-xl transition-all shadow-md relative overflow-hidden',
        currentStyle.bg,
        currentStyle.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className={cn('p-2 rounded-xl border mt-0.5 shadow-sm', currentStyle.badgeBg, currentStyle.border)}>
            {currentStyle.icon}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider', currentStyle.badgeBg, currentStyle.badgeText, currentStyle.border)}>
                {badgeText}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Semáforo Bioseguridad NOM-004
              </span>
            </div>
            <h4 className="text-xs font-black text-white leading-tight">
              {title}
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              {description}
            </p>
          </div>
        </div>

        {/* Indicador de 5 colores visual */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shrink-0">
          {(['verde', 'amarillo', 'naranja', 'rojo', 'azul'] as RiskLevel[]).map((clr) => (
            <span
              key={clr}
              className={cn(
                'w-2 h-2 rounded-full transition-transform',
                clr === level ? 'scale-125 ring-2 shadow-sm' : 'opacity-30',
                clr === 'verde' && 'bg-emerald-400 ring-emerald-300',
                clr === 'amarillo' && 'bg-amber-400 ring-amber-300',
                clr === 'naranja' && 'bg-orange-400 ring-orange-300',
                clr === 'rojo' && 'bg-rose-500 ring-rose-400',
                clr === 'azul' && 'bg-cyan-400 ring-cyan-300'
              )}
              title={`Nivel ${clr.toUpperCase()}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
