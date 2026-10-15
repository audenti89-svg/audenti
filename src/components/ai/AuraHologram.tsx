'use client'

import React, { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'

interface AuraHologramProps {
  isActive?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AuraHologram({ isActive = true, className = '', size = 'md' }: AuraHologramProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoError, setVideoError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return

    if (isActive) {
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback a imagen estática o autoplay silenciado
          if (videoRef.current) videoRef.current.muted = true
        })
      }
    } else {
      videoRef.current.pause()
    }
  }, [isActive])

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-24 h-24 sm:w-28 sm:h-28'
  }

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      {/* Resplandor Holográfico Cian/Ámbar */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/30 via-amber-400/20 to-blue-600/30 blur-md animate-pulse pointer-events-none" />

      {/* Anillo de energía rotativo */}
      <div className="absolute -inset-1 rounded-full border border-cyan-400/30 border-t-cyan-300 border-r-amber-400/40 animate-spin [animation-duration:8s] pointer-events-none" />

      {/* Contenedor del Holograma con máscara circular y blend mode */}
      <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950/80 border border-cyan-400/40 shadow-inner flex items-center justify-center">
        {!videoError ? (
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setVideoError(true)}
            onLoadedData={() => setIsLoaded(true)}
            className="w-full h-full object-cover object-center filter contrast-110 saturate-110 mix-blend-screen scale-110"
          >
            <source src="/images/aura-ai-hologram.webm" type="video/webm" />
            <source src="/images/aura-ai-hologram.mp4" type="video/mp4" />
          </video>
        ) : null}

        {/* Fallback de Avatar Holográfico Transparente */}
        {(videoError || !isLoaded) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/images/aura-ai-avatar-transp.png"
              alt="Aura AI"
              fill
              sizes="64px"
              className="object-cover object-top scale-115 filter contrast-105"
            />
          </div>
        )}

        {/* Overlay de líneas de escaneo holográfico sutil */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent bg-[length:100%_4px] pointer-events-none" />
      </div>

      {/* Indicador de transmisión activa */}
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full shadow-xs">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
      </span>
    </div>
  )
}
