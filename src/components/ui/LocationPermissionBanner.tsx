'use client'

import { useState, useEffect } from 'react'
import { MapPin, Navigation, ShieldCheck, X, CheckCircle, ArrowRight } from 'lucide-react'

export function LocationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [detectedZone, setDetectedZone] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('audenti_geo_consented')
      const storedZone = localStorage.getItem('audenti_user_zone')
      if (storedZone) setDetectedZone(storedZone)
      if (!stored) {
        // Mostrar después de 3 segundos para una experiencia elegante
        const t = setTimeout(() => setShowBanner(true), 2800)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [])

  const handleRequestLocation = () => {
    setLocationStatus('requesting')

    if (!('geolocation' in navigator)) {
      setLocationStatus('denied')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        try {
          // Guardar en localStorage
          localStorage.setItem('audenti_geo_consented', 'true')
          localStorage.setItem('audenti_user_coords', JSON.stringify({ lat: latitude, lng: longitude, accuracy }))

          // Consultar matriz con la API de geolocalización
          const res = await fetch('/api/geolocation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'calculate_matrix',
              patientLat: latitude,
              patientLng: longitude
            })
          })
          const data = await res.json()
          if (data?.success && data?.closestBranch) {
            setDetectedZone(data.closestBranch.name)
            localStorage.setItem('audenti_user_zone', data.closestBranch.name)
          }

          setLocationStatus('granted')
          setTimeout(() => setShowBanner(false), 2400)
        } catch (e) {
          setLocationStatus('granted')
          setTimeout(() => setShowBanner(false), 1500)
        }
      },
      (err) => {
        console.warn('Ubicación denegada o no disponible:', err)
        localStorage.setItem('audenti_geo_consented', 'denied')
        setLocationStatus('denied')
        setTimeout(() => setShowBanner(false), 2000)
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem('audenti_geo_consented', 'dismissed')
    } catch {}
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-white relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          title="Omitir por ahora"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30">
                Logística Clínica Activa
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">
              Optimiza tu experiencia en Audenti
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compartir tu ubicación permite a la IA sugerirte la sede dental más cercana, calcular tiempos de traslado en tiempo real y evitar viajes innecesarios ante una urgencia.
            </p>
          </div>
        </div>

        {/* Estado de permiso */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Datos protegidos y cifrados</span>
          </div>

          {locationStatus === 'granted' ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Sede vinculada: {detectedZone || 'CDMX'}</span>
            </div>
          ) : locationStatus === 'denied' ? (
            <span className="text-xs text-slate-400">Sin acceso GPS</span>
          ) : (
            <button
              onClick={handleRequestLocation}
              disabled={locationStatus === 'requesting'}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-60"
            >
              <MapPin className="w-3.5 h-3.5" />
              {locationStatus === 'requesting' ? 'Obteniendo...' : 'Permitir Ubicación'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
