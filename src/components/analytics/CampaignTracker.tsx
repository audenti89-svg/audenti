'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function Tracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const keys = ['ref', 'canal', 'qr', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    let found = false
    const attributionData: Record<string, string> = {}

    keys.forEach(key => {
      const val = searchParams.get(key)
      if (val) {
        found = true
        attributionData[key] = val
        sessionStorage.setItem(`audenti_${key}`, val)
      }
    })

    if (found) {
      // Guardar también en cookie de 30 días para preservar a través de OAuth redirects
      try {
        const serialized = encodeURIComponent(JSON.stringify(attributionData))
        document.cookie = `audenti_attr=${serialized}; path=/; max-age=2592000; SameSite=Lax`
      } catch {}
    }
  }, [searchParams])

  return null
}

export function CampaignTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}
