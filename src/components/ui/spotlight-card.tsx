'use client'

import React, { useRef, useState, useEffect } from 'react'

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  /**
   * Tono HSL de la luz (0-360).
   * 40-45 = Dorado / Ámbar característico de Audenti
   */
  hue?: number
  /**
   * Radio del resplandor en píxeles. Por defecto 320px
   */
  size?: number
  /**
   * Opacidad máxima del resplandor (0.0 a 1.0)
   */
  spotlightOpacity?: number
  /**
   * Si debe iluminar el borde con el gradiente
   */
  borderGlow?: boolean
}

export function SpotlightCard({
  children,
  className = '',
  hue = 43, // Tono ámbar/dorado de la marca Audenti
  size = 360,
  spotlightOpacity = 0.65,
  borderGlow = true,
  style = {},
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`)
    card.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`)
  }

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsHovered(true)
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`)
    card.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`)
  }

  const handlePointerLeave = () => {
    setIsHovered(false)
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`group/spotlight relative overflow-hidden isolate ${className}`}
      style={{
        '--spotlight-hue': hue,
        '--spotlight-size': `${size}px`,
        '--spotlight-x': '50%',
        '--spotlight-y': '50%',
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      {/* 1. Capa de resplandor ambiental de fondo que sigue al cursor */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-200 ease-out"
        style={{
          opacity: isHovered ? spotlightOpacity : 0.15,
          background: `radial-gradient(var(--spotlight-size) circle at var(--spotlight-x) var(--spotlight-y), hsl(var(--spotlight-hue) 100% 55% / 0.5), transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* 2. Capa de borde iluminado que reacciona a la posición del cursor */}
      {borderGlow && (
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-200 ease-out"
          style={{
            opacity: isHovered ? 1 : 0.25,
            padding: '2px',
            background: `radial-gradient(var(--spotlight-size) circle at var(--spotlight-x) var(--spotlight-y), hsl(var(--spotlight-hue) 100% 65% / 0.95), transparent 60%)`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
          aria-hidden="true"
        />
      )}

      {/* 3. Contenido real de la tarjeta */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}
