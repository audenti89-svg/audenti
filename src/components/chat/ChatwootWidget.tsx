'use client'

import { useEffect } from 'react'

interface ChatwootSettings {
  position?: 'left' | 'right'
  type?: 'standard' | 'expanded_bubble'
  launcherTitle?: string
  showPopoutButton?: boolean
  hideMessageBubble?: boolean
}

declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void
    }
    $chatwoot?: {
      setCustomAttributes: (attributes: Record<string, any>) => void
      setUser: (identifier: string, user: Record<string, any>) => void
      toggle: () => void
      isOpen: () => boolean
    }
  }
}

export function ChatwootWidget() {
  useEffect(() => {
    // Configuración visual nativa de Chatwoot adaptada a la estética Audenti
    window.chatwootSettings = {
      position: 'right',
      type: 'standard',
      launcherTitle: 'Chat Clínico Audenti',
      showPopoutButton: true,
      hideMessageBubble: false,
    }

    // Solo inicializar si se ha configurado un WEBSITE_TOKEN real de producción
    const WEBSITE_TOKEN = process.env.NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN
    if (!WEBSITE_TOKEN) {
      // Si no hay token configurado en .env, omitir la inyección del script para evitar errores de origen/frame
      return
    }

    const BASE_URL = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || 'https://app.chatwoot.com'

    // Evitar inyecciones duplicadas
    if (document.getElementById('chatwoot-wjs')) return

    const script = document.createElement('script')
    script.id = 'chatwoot-wjs'
    script.src = `${BASE_URL}/packs/js/sdk.js`
    script.defer = true
    script.async = true

    script.onload = () => {
      try {
        if (window.chatwootSDK) {
          window.chatwootSDK.run({
            websiteToken: WEBSITE_TOKEN,
            baseUrl: BASE_URL,
          })
          console.log('[Chatwoot] Plugin Web inicializado con éxito.')
        }
      } catch (err) {
        console.warn('[Chatwoot] Error inicializando SDK:', err)
      }
    }

    script.onerror = () => {
      console.warn('[Chatwoot] El script SDK de Chatwoot no pudo ser cargado remotamente.')
    }

    document.head.appendChild(script)

    return () => {
      // Limpieza preventiva si se desmonta
    }
  }, [])

  return null
}
