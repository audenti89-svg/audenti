'use client'

import React from 'react'

interface AudentiLogoProps {
  className?: string
  size?: number
  variant?: 'full' | 'icon' | 'badge'
  showSubtitle?: boolean
  doctorName?: string
}

export function AudentiLogo({
  className = '',
  size = 40,
  variant = 'full',
  showSubtitle = true,
  doctorName = 'Dra. Aura Estudillo',
}: AudentiLogoProps) {
  // Isotipo SVG: Diente blanco brillante y estilizado con corona superior elegante, curva sonriente sutil y destello estelar en fondo circular ámbar/dorado con aro azul noche
  const IconSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
    >
      <defs>
        <linearGradient id="audentiGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="toothShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="80%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <filter id="audentiGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Círculo contenedor con anillo exterior */}
      <circle cx="50" cy="50" r="47" fill="url(#audentiGoldGrad)" stroke="#202D4C" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="43" fill="#202D4C" />
      <circle cx="50" cy="50" r="41" fill="url(#audentiGoldGrad)" opacity="0.15" />

      {/* Diente estilizado anatómico con sonrisa */}
      <path
        d="M32 36C32 26 39 23 44 24C48 24.8 49 27.5 50 27.5C51 27.5 52 24.8 56 24C61 23 68 26 68 36C68 47 62 55 59 66C57.5 71 56 77 53.5 77C51 77 50.5 69 49.5 69C48.5 69 48 77 45.5 77C43 77 41.5 71 40 66C37 55 32 47 32 36Z"
        fill="url(#toothShine)"
        filter="url(#audentiGlow)"
      />

      {/* Curva sonriente sutil en el tercio medio */}
      <path
        d="M40 44C44 48 56 48 60 44"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Destello estelar de brillo (Sparkle 1 superior derecho) */}
      <path
        d="M66 22L67.5 27L72.5 28.5L67.5 30L66 35L64.5 30L59.5 28.5L64.5 27L66 22Z"
        fill="#FFFFFF"
      />
      {/* Destello estelar pequeño (Sparkle 2 inferior izquierdo) */}
      <path
        d="M30 52L31 55L34 56L31 57L30 60L29 57L26 56L29 55L30 52Z"
        fill="#FDE68A"
      />
    </svg>
  )

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{IconSvg}</div>
  }

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-3 group ${className}`}>
      {IconSvg}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="font-black tracking-tight text-base sm:text-xl text-white group-hover:text-amber-300 transition-colors leading-none">
            AUDENTI
          </span>
          <span className="text-[9px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 uppercase tracking-wider shrink-0">
            CLINICAL
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] sm:text-[10px] text-amber-300/90 font-bold tracking-wider uppercase mt-0.5 truncate max-w-[120px] sm:max-w-none">
            {doctorName}
          </span>
        )}
      </div>
    </div>
  )
}
