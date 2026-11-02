'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Sparkles
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface WhatsAppQRModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected?: () => void
}

export function WhatsAppQRModal({ isOpen, onClose, onConnected }: WhatsAppQRModalProps) {
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('CHECKING')
  const [connected, setConnected] = useState<boolean>(false)
  const [accountPhone, setAccountPhone] = useState<string>('525522427769')
  const [countdown, setCountdown] = useState<number>(30)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchQR = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_qr' })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.connected || data.status === 'WORKING') {
          setConnected(true)
          setStatus('CONNECTED')
          setQrCode(null)
          onConnected?.()
        } else if (data.qr) {
          setConnected(false)
          setQrCode(data.qr)
          setStatus('SCAN_QR_CODE')
          setCountdown(30)
        } else {
          // Si el proveedor Zernio / OpenWA ya tiene webhook activo y no requiere escaneo en vivo
          setStatus(data.status || 'READY')
          setConnected(data.status === 'WORKING' || Boolean(data.success))
        }
      } else {
        setErrorMessage('No se pudo contactar con la pasarela de WhatsApp. Verifica los servicios en ejecución.')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error de red al consultar el código QR.')
    } finally {
      setLoading(false)
    }
  }, [onConnected])

  useEffect(() => {
    if (isOpen) {
      fetchQR()
    }
  }, [isOpen, fetchQR])

  // Contador de refresco automático
  useEffect(() => {
    if (!isOpen || connected || !qrCode) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchQR()
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen, connected, qrCode, fetchQR])

  const handleDisconnect = async () => {
    if (!confirm('¿Deseas desvincular la sesión actual de WhatsApp Business de la Dra. Aura Estudillo?')) return
    setLoading(true)
    try {
      await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout_waha' })
      })
      setConnected(false)
      setStatus('DISCONNECTED')
      await fetchQR()
    } catch {
      // Ignorar
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                  OpenWA &amp; WAHA Live
                </span>
                <span className="text-[11px] text-emerald-100">WhatsApp Business</span>
              </div>
              <h2 className="text-base font-black tracking-tight mt-0.5">
                Vincular WhatsApp Oficial de la Doctora
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Central */}
        <div className="p-6 space-y-5">
          {/* Tarjeta de Estado Actual */}
          {connected ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    WhatsApp Business Activo &amp; Conectado
                  </span>
                  <p className="text-[11px] text-emerald-700">
                    Número vinculado: <strong className="font-mono">+52 55 2242 7769</strong> (Dra. Aura Estudillo)
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                title="Desconectar sesión"
                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desvincular</span>
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Listo para escanear • Actualiza cada {countdown}s</span>
              </div>

              {/* Contenedor del Código QR */}
              <div className="flex justify-center p-4 bg-slate-50 border border-slate-200 rounded-3xl w-fit mx-auto shadow-inner relative group">
                {loading && !qrCode ? (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                    <span className="text-xs font-bold text-slate-500">Generando sesión QR...</span>
                  </div>
                ) : qrCode ? (
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                    {qrCode.startsWith('data:image') ? (
                      <img src={qrCode} alt="Código QR WhatsApp" className="w-52 h-52 object-contain" />
                    ) : (
                      <QRCodeSVG
                        value={qrCode}
                        size={210}
                        level="M"
                        includeMargin={false}
                        fgColor="#0F172A"
                      />
                    )}
                  </div>
                ) : (
                  // Fallback para vincular el número de WhatsApp oficial directamente
                  <div className="w-56 h-56 p-4 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-2xl border border-slate-200">
                    <QRCodeSVG
                      value={`https://wa.me/525522427769?text=${encodeURIComponent('Hola Dra. Aura Estudillo, confirmo vinculación con Audenti CRM')}`}
                      size={140}
                      level="M"
                      includeMargin={false}
                      fgColor="#0F172A"
                    />
                    <span className="text-[10px] font-bold text-slate-500">QR Enlace Directo Dra. Aura</span>
                  </div>
                )}
              </div>

              {/* Botón de Refrescar QR */}
              <button
                type="button"
                onClick={fetchQR}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span>Actualizar Código QR</span>
              </button>
            </div>
          )}

          {/* Instrucciones Clínicas Paso a Paso */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
              Pasos para la Dra. Aura Estudillo:
            </span>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed font-medium">
              <li>Abre <strong>WhatsApp Business</strong> en tu teléfono celular.</li>
              <li>Toca <strong>Menú (⋮)</strong> en Android o <strong>Configuración (⚙️)</strong> en iPhone.</li>
              <li>Selecciona <strong>Dispositivos vinculados</strong> y luego <strong>Vincular un dispositivo</strong>.</li>
              <li>Apunta la cámara de tu teléfono hacia el código QR en esta pantalla.</li>
            </ol>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Pie de Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encriptación de extremo a extremo garantizada</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
