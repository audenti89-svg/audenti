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

/**
 * Normaliza y evalúa estrictamente los 3 estados clínicos de alergias:
 * 1. VERDE: "Sin alergias confirmadas" (hasNoAllergies === true o negadas: "ninguna", "no", "negadas", "sin alergias", "sano").
 * 2. AMARILLO: "No se tiene registro de alergias" (vacío, null o pendiente de captura. NUNCA en rojo).
 * 3. ROJO: "Alergia confirmada: [detalle]" (ÚNICAMENTE si existe alérgeno real reportado y activo).
 */
export function evalAllergyStatus(
  allergies?: string[] | string | null,
  hasNoAllergies?: boolean,
  allergyNotes?: string | null
): {
  status: 'verde' | 'amarillo' | 'rojo';
  label: string;
  badgeText: string;
  description: string;
  realAllergies: string[];
} {
  const isNegation = (s: string) => {
    const low = s.toLowerCase().trim();
    return (
      low === 'ninguna' ||
      low === 'ninguno' ||
      low === 'no' ||
      low === 'no tiene' ||
      low === 'no registra' ||
      low === 'sin alergias' ||
      low === 'sin alergia' ||
      low === 'sano' ||
      low === 'desconoce' ||
      low === 'nkda' ||
      low === 'n/a' ||
      low === 'negativo' ||
      low === 'negadas' ||
      low === 'negada' ||
      low.includes('niega')
    );
  };

  const rawList: string[] = Array.isArray(allergies)
    ? allergies
    : typeof allergies === 'string' && allergies.trim()
    ? allergies.split(',').map((s) => s.trim())
    : [];

  const cleanList = rawList.map((s) => s.trim()).filter(Boolean);
  const realAllergies = cleanList.filter((s) => !isNegation(s));
  const hasExplicitNegation = cleanList.some(isNegation);

  // 1. ROJO: Únicamente cuando existe un alérgeno real confirmado
  if (realAllergies.length > 0) {
    return {
      status: 'rojo',
      label: `Alergia confirmada: ${realAllergies.join(', ')}`,
      badgeText: 'Alergia Confirmada',
      description: `Alerta médica activa: ${realAllergies.join(', ')}. Extremar precauciones antes de administrar o prescribir fármacos.`,
      realAllergies
    };
  }

  // 2. VERDE: Confirmó explícitamente que no tiene alergias
  if (hasNoAllergies === true || hasExplicitNegation) {
    return {
      status: 'verde',
      label: 'Sin alergias confirmadas',
      badgeText: 'Sin Alergias Confirmadas',
      description: 'El paciente confirmó que no presenta alergias medicamentosas conocidas.',
      realAllergies: []
    };
  }

  // 3. AMARILLO: No se tiene registro de alergias capturado (vacío, null o no confirmado)
  return {
    status: 'amarillo',
    label: 'No se tiene registro de alergias',
    badgeText: 'Registro Pendiente',
    description: 'No se tiene registro de alergias capturado en el expediente. Pendiente de confirmar en cuestionario presencial.',
    realAllergies: []
  };
}

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
  // Evaluación estricta de alergias
  const allergyEval = evalAllergyStatus(allergies, hasNoAllergies, allergyNotes);

  // Evaluación combinada del Semáforo Clínico (NOM-004-SSA3)
  let level: RiskLevel = allergyEval.status;
  let title = allergyEval.label;
  let description = allergyEval.description;
  let badgeText = allergyEval.badgeText;

  if (allergyEval.status === 'rojo') {
    level = 'rojo';
    title = `¡ALERTA MÉDICA: ${allergyEval.label}!`;
    description = allergyEval.description;
    badgeText = 'Alergia Confirmada';
  } else if (hasPainOrEmergency) {
    level = 'rojo';
    title = '¡URGENCIA ACTIVA: Dolor Agudo / Proceso Infeccioso!';
    description = 'Paciente con sintomatología dolorosa severa o absceso que requiere atención clínica prioritaria.';
    badgeText = 'Urgencia Activa';
  } else if (hasStructuralRisk) {
    level = 'naranja';
    title = 'Riesgo Estructural Dental / Periodontal';
    description = 'Pieza con destrucción coronal mayor al 60% o pérdida de soporte óseo avanzado.';
    badgeText = 'Riesgo Estructural';
  } else if (hasNerveInvolvement) {
    level = 'azul';
    title = 'Compromiso de Inervación / Sistema Nervioso';
    description = 'Presencia de parestesia, dolor urente o afectación en ramas trigeminales (V1, V2, V3).';
    badgeText = 'Inervación Nerviosa';
  } else {
    // Si no hay urgencia ni riesgo estructural ni compromiso nervioso:
    // El semáforo toma exactamente el estado de alergias: VERDE o AMARILLO (NUNCA ROJO)
    level = allergyEval.status;
    title = allergyEval.label;
    description = allergyEval.description;
    badgeText = allergyEval.badgeText;
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
