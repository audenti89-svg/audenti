'use client'

import React from 'react'
import Image from 'next/image'

interface AuraHologramProps {
  isActive?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AuraHologram({ isActive = true, className = '', size = 'md' }: AuraHologramProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-13 h-13 sm:w-15 sm:h-15',
    lg: 'w-20 h-20 sm:w-24 sm:h-24'
  }

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      {/* Resplandor Holográfico Dorado / Cian de Alta Gama */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/40 via-cyan-400/20 to-amber-500/40 blur-md animate-pulse pointer-events-none" />

      {/* Anillo de energía rotativo dorado */}
      <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-300/80 border-b-cyan-400/40 animate-spin [animation-duration:6s] pointer-events-none shadow-sm" />

      {/* Contenedor circular con fondo Charcoal/Azul Marino Profundo (#0B0F19) */}
      <div className="relative w-full h-full rounded-full overflow-hidden bg-[#0B0F19] border-2 border-amber-400/80 shadow-2xl flex items-center justify-center">
        {/* Imagen Oficial Recortada de Aura AI */}
        <div className="relative w-full h-full">
          <Image
            src="/images/aura-ai-avatar-transp.png"
            alt="Aura AI — Dra. Aura Estudillo"
            fill
            sizes="80px"
            priority
            className="object-cover object-top scale-110 filter contrast-110 drop-shadow-[0_2px_8px_rgba(251,191,36,0.25)]"
          />
        </div>

        {/* Líneas de escaneo holográfico sutil */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent bg-[length:100%_4px] pointer-events-none" />
      </div>

      {/* Indicador de transmisión activa */}
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0B0F19] rounded-full shadow-sm">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
      </span>
    </div>
  )
}
