'use client'

import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  Smartphone,
  Hash,
  ExternalLink,
  QrCode,
  Radio,
  RefreshCw,
  Info
} from 'lucide-react'

export default function WhatsAppSettingsPage() {
  const [phoneNumber, setPhoneNumber] = useState('525522427769')
  const [wabaId, setWabaId] = useState('')
  const [metaAccessToken, setMetaAccessToken] = useState('')
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('audenti_secure_token')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Cargar configuración guardada
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const res = await fetch('/api/settings/whatsapp')
        if (res.ok) {
          const json = await res.json()
          if (json.settings) {
            setPhoneNumber(json.settings.phone_number || '525522427769')
            setWabaId(json.settings.waba_id || '')
            setMetaAccessToken(json.settings.meta_access_token || '')
            setWebhookVerifyToken(json.settings.webhook_verify_token || 'audenti_secure_token')
            setLastUpdated(json.settings.last_updated)
          }
        }
      } catch (err: any) {
        console.warn('Error cargando ajustes de WhatsApp:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          waba_id: wabaId,
          meta_access_token: metaAccessToken,
          webhook_verify_token: webhookVerifyToken
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSaveSuccess(true)
        setLastUpdated(new Date().toISOString())
        setTimeout(() => setSaveSuccess(false), 4000)
      } else {
        setErrorMessage(data.error || 'Ocurrió un detalle al guardar en Supabase.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Meta Cloud API &amp; Pasarela QR
            </span>
            <span className="text-slate-400 text-xs">• Sin requerir edición de código</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            Configuración de WhatsApp Business
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administra el número oficial de atención de la Dra. Aura Estudillo, credenciales de Meta y tokens de webhook sincronizados con Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0F172A] text-white text-xs font-bold shadow-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Canal WhatsApp Activo
          </span>
        </div>
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Parámetros de Conexión Oficial</h3>
                <p className="text-xs text-slate-500">Credenciales del número telefónico y API de Meta Developers</p>
              </div>
            </div>
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 font-mono">
                Última sincronización: {new Date(lastUpdated).toLocaleDateString('es-MX')} {new Date(lastUpdated).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Mensajes de Estado */}
            {saveSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">Configuración guardada exitosamente</p>
                  <p className="text-[11px] text-emerald-700">Las nuevas credenciales ya están enlazadas con el asistente de triaje Aura IA en Supabase.</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-center gap-3 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <p className="text-xs font-bold text-rose-800">{errorMessage}</p>
              </div>
            )}

            {/* Grid de Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Número Oficial de WhatsApp */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  Número Oficial de WhatsApp Business
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="ej. 525522427769"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Formato internacional con lada sin signos (ej. 52 para México seguido de 10 dígitos: 525522427769).
                </p>
              </div>

              {/* 2. WhatsApp Business Account ID (WABA ID) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="ej. 109823471092837"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Identificador de cuenta de WhatsApp Business o ID de número de teléfono en Meta Developer Console.
                </p>
              </div>

              {/* 3. Meta Permanent Access Token */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" />
                  Meta Access Token (Token Permanente de Sistema)
                </label>
                <input
                  type="password"
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  placeholder="EAABw..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Token generado para el usuario del sistema con permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
                </p>
              </div>

              {/* 4. Webhook Verify Token */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Webhook Verify Token (Token de Validación)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={webhookVerifyToken}
                    onChange={(e) => setWebhookVerifyToken(e.target.value)}
                    placeholder="audenti_secure_token"
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setWebhookVerifyToken(`audenti_${Math.random().toString(36).substring(2, 10)}`)}
                    className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Generar Nuevo
                  </button>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
                  <p><strong>URL de Webhook oficial para Meta Developers:</strong></p>
                  <code className="text-emerald-700 font-mono font-bold select-all bg-emerald-50 px-2 py-0.5 rounded">
                    https://audenti-dra-aura-estudillo.vercel.app/api/webhook/whatsapp
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Footer con Botón de Guardado */}
          <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Protección y almacenamiento seguro en Supabase Database.</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración en Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
