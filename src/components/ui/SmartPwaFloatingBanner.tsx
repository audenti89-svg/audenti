'use client'

import { useState } from 'react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { AudentiLogo } from '@/components/ui/AudentiLogo'
import {
  Download,
  X,
  Smartphone,
  Monitor,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Share2
} from 'lucide-react'

export function SmartPwaFloatingBanner() {
  const { isInstallable, isStandalone, promptInstall, dismissPrompt } = usePwaInstall()
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [showAndroidGuide, setShowAndroidGuide] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)

  // Si ya está en modo Standalone (instalada), no renderizar absolutamente nada
  if (isStandalone) {
    return null
  }

  // Si no está lista o fue descartada, no mostrar
  if (!isInstallable && !showIosGuide && !showAndroidGuide) {
    return null
  }

  const handleInstallClick = async () => {
    const res = await promptInstall()
    if (res.outcome === 'accepted') {
      setInstallSuccess(true)
      setTimeout(() => {
        dismissPrompt()
      }, 3000)
    } else if (res.outcome === 'manual_guide') {
      // Detectar si es iOS o Android
      if (typeof window !== 'undefined') {
        const ua = navigator.userAgent.toLowerCase()
        if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
          setShowIosGuide(true)
        } else {
          setShowAndroidGuide(true)
        }
      } else {
        setShowIosGuide(true)
      }
    }
  }

  return (
    <>
      {/* Toast Flotante Inteligente en esquina inferior derecha */}
      <aside
        aria-label="Instalación de Aplicación PWA"
        className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto print:hidden"
      >
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border-2 border-amber-400/80 shadow-2xl p-4.5 space-y-3.5 relative overflow-hidden">
          {/* Glow de acento */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* Botón de cerrar / descartar */}
          <button
            onClick={dismissPrompt}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Descartar por ahora"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Encabezado con Isotipo */}
          <div className="flex items-start gap-3 pr-6">
            <AudentiLogo variant="icon" size={42} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-white block">
                  Instalar Audenti Pro
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-amber-300/90 font-medium mt-0.5">
                Dra. Aura Estudillo • Clínica Oficial
              </p>
            </div>
          </div>

          {/* Mensaje principal */}
          {installSuccess ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>¡Aplicación instalada con éxito en tu dispositivo!</span>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              Instala la aplicación en tu celular, tablet o PC para acceso rápido sin barras de navegador, alertas sonoras y soporte offline.
            </p>
          )}

          {/* Botones de acción */}
          {!installSuccess && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Instalar Ahora
              </button>

              <button
                onClick={dismissPrompt}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
              >
                Más tarde
              </button>
            </div>
          )}

          {/* Badges de soporte */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3 text-slate-400" /> Windows / Mac
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-slate-400" /> iOS &amp; Android
            </span>
            <button
              onClick={() => setShowIosGuide(true)}
              className="text-amber-400 hover:underline"
            >
              ¿Cómo en iOS?
            </button>
          </div>
        </div>
      </aside>

      {/* Modal Guía Rápida para iOS Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 text-white shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <AudentiLogo variant="icon" size={38} />
              <div>
                <h3 className="text-sm font-bold">Instalar en iPhone o iPad</h3>
                <p className="text-[11px] text-slate-400">Pasos sencillos para Safari</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra de Safari.</span>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <span>Pulsa <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo!</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Guía Rápida para Android (Chrome, Edge, Samsung Internet) */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 text-white shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <AudentiLogo variant="icon" size={38} />
              <div>
                <h3 className="text-sm font-bold">Instalar en Android</h3>
                <p className="text-[11px] text-slate-400">Pasos sencillos para Chrome / Edge</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>Toca el menú de <strong>tres puntos (⋮)</strong> en la esquina superior derecha del navegador.</span>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/60">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <span>Confirma tocando <strong>"Instalar"</strong>. El icono de Audenti aparecerá en tus aplicaciones.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default SmartPwaFloatingBanner
