'use client'

import { useState, useEffect } from 'react'

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 1. Detectar si la app YA está corriendo como Standalone (instalada)
    const checkStandalone = () => {
      const isStandaloneMode =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')

      setIsStandalone(Boolean(isStandaloneMode))
      return isStandaloneMode
    }

    const alreadyInstalled = checkStandalone()

    // 2. Verificar preferencia de descarte temporal en localStorage
    if (typeof window !== 'undefined') {
      const dismissedUntil = localStorage.getItem('pwa_prompt_dismissed_until')
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true)
      }
    }

    // Si ya está instalada, no escuchar ni mostrar prompt
    if (alreadyInstalled) {
      setIsInstallable(false)
      return
    }

    // 3. Revisar si el evento ya fue capturado tempranamente por el script del head
    if (typeof window !== 'undefined' && (window as any).__pwaDeferredPrompt) {
      setDeferredPrompt((window as any).__pwaDeferredPrompt)
      setIsInstallable(true)
    }

    // 4. Capturar evento nativo `beforeinstallprompt` (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      ;(window as any).__pwaDeferredPrompt = e
      setIsInstallable(true)
    }

    const handlePromptReady = () => {
      if ((window as any).__pwaDeferredPrompt) {
        setDeferredPrompt((window as any).__pwaDeferredPrompt)
        setIsInstallable(true)
      }
    }

    // 5. Capturar cuando el usuario completa la instalación
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      ;(window as any).__pwaDeferredPrompt = null
      if (typeof window !== 'undefined') {
        localStorage.setItem('pwa_installed_confirmed', 'true')
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('pwa-prompt-ready', handlePromptReady)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Listener para cambios de display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true)
        setIsInstallable(false)
      }
    }
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('pwa-prompt-ready', handlePromptReady)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange)
      }
    }
  }, [])

  // Disparar instalación
  const promptInstall = async () => {
    if (!deferredPrompt) {
      // Instrucción visual para navegadores sin prompt automático (iOS Safari / Firefox)
      return { outcome: 'manual_guide' as const }
    }

    deferredPrompt.prompt()
    const choiceResult = await deferredPrompt.userChoice
    if (choiceResult.outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
    return choiceResult
  }

  // Ocultar temporalmente (24 horas)
  const dismissPrompt = () => {
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      const oneDayAhead = Date.now() + 24 * 60 * 60 * 1000
      localStorage.setItem('pwa_prompt_dismissed_until', String(oneDayAhead))
    }
  }

  return {
    isInstallable: isInstallable && !isStandalone && !isDismissed,
    isStandalone,
    promptInstall,
    dismissPrompt,
  }
}
