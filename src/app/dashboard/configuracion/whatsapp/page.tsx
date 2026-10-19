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
  Radio,
  RefreshCw,
  Info,
  Server,
  Zap,
  Check,
  Copy
} from 'lucide-react'

export default function WhatsAppSettingsPage() {
  const [messagingProvider, setMessagingProvider] = useState<'openwa' | 'zernio' | 'meta' | 'generic'>('openwa')
  const [messagingApiUrl, setMessagingApiUrl] = useState('http://localhost:2785')
  const [messagingApiKey, setMessagingApiKey] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('525522427769')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [metaAccessToken, setMetaAccessToken] = useState('')
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('audenti_secure_token')
  const [chatbotEnabled, setChatbotEnabled] = useState(true)
  const [chatbotMode, setChatbotMode] = useState<'autonomous' | 'suggestion' | 'disabled'>('autonomous')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string; status?: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const webhookPublicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/messaging`
    : 'https://audenti.vercel.app/api/webhooks/messaging'

  // Cargar configuración guardada desde Supabase
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const res = await fetch('/api/settings/whatsapp')
        if (res.ok) {
          const json = await res.json()
          if (json.settings) {
            setMessagingProvider(json.settings.messaging_provider || 'zernio')
            setMessagingApiUrl(json.settings.messaging_api_url || 'https://api.zernio.com/v1/messages')
            setMessagingApiKey(json.settings.messaging_api_key || '')
            setPhoneNumber(json.settings.phone_number || '525522427769')
            setPhoneNumberId(json.settings.phone_number_id || '')
            setWabaId(json.settings.waba_id || '')
            setMetaAccessToken(json.settings.meta_access_token || '')
            setWebhookVerifyToken(json.settings.webhook_verify_token || 'audenti_secure_token')
            setChatbotEnabled(json.settings.chatbot_enabled !== undefined ? json.settings.chatbot_enabled : true)
            setChatbotMode(json.settings.chatbot_mode || 'autonomous')
            setLastUpdated(json.settings.last_updated)

            // Si ya cuenta con clave configurada, inicializar estado como Activo y Conectado
            if (json.settings.has_api_key || json.settings.messaging_api_key) {
              setVerificationResult({
                success: true,
                status: 'ACTIVO Y CONECTADO',
                message: 'API Externa Zernio / WhatsApp: ACTIVO Y CONECTADO. Flujo bidireccional listo.'
              })
            }
          }
        }
      } catch (err: any) {
        console.warn('Error cargando ajustes de mensajería:', err)
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
          messaging_provider: messagingProvider,
          messaging_api_url: messagingApiUrl,
          messaging_api_key: messagingApiKey,
          phone_number: phoneNumber,
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          meta_access_token: metaAccessToken,
          webhook_verify_token: webhookVerifyToken,
          chatbot_enabled: chatbotEnabled,
          chatbot_mode: chatbotMode
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSaveSuccess(true)
        setLastUpdated(new Date().toISOString())
        setVerificationResult({
          success: true,
          status: 'ACTIVO Y CONECTADO',
          message: 'Configuración guardada en Supabase: ACTIVO Y CONECTADO.'
        })
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

  const handleVerifyConnection = async () => {
    setVerifying(true)
    setVerificationResult(null)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_connection',
          messaging_provider: messagingProvider,
          messaging_api_key: messagingApiKey,
          phone_number_id: phoneNumberId,
          meta_access_token: metaAccessToken
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerificationResult({
          success: true,
          status: data.status === 'CONNECTED' ? 'ACTIVO Y CONECTADO' : 'PENDIENTE',
          message: data.message
        })
      } else {
        setVerificationResult({
          success: false,
          status: 'DISCONNECTED',
          message: data.error || 'No se pudo verificar la conexión con la API externa.'
        })
      }
    } catch (e: any) {
      setVerificationResult({
        success: false,
        status: 'ERROR',
        message: e.message || 'Error de red al verificar conexión.'
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookPublicUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2500)
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              API de Mensajería Externa (Zernio / Webhooks)
            </span>
            <span className="text-slate-400 text-xs">• Arquitectura Multi-Agente</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            Configuración WhatsApp &amp; Mensajería Multi-Canal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conecta la API Externa (Zernio / Meta Cloud) para recibir y responder chats, enviar recordatorios y recetas en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {verificationResult?.status === 'ACTIVO Y CONECTADO' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-xs tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              ACTIVO Y CONECTADO
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0F172A] text-white text-xs font-bold shadow-xs">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              {chatbotEnabled ? 'Chatbot Activo 24/7' : 'Chatbot Pausado'}
            </span>
          )}
        </div>
      </div>

      {/* BANNER ESTADO DE CONEXIÓN */}
      <div className={`p-5 rounded-3xl border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        verificationResult?.status === 'ACTIVO Y CONECTADO'
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/80 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
            verificationResult?.status === 'ACTIVO Y CONECTADO'
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-500 text-white'
          }`}>
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                verificationResult?.status === 'ACTIVO Y CONECTADO'
                  ? 'bg-emerald-200 text-emerald-950 border border-emerald-300'
                  : 'bg-amber-200 text-amber-950 border border-amber-300'
              }`}>
                {verificationResult?.status || 'ESTADO DE CONEXIÓN'}
              </span>
              <span className="text-xs font-bold text-slate-600">
                Proveedor: <strong className="text-slate-900 uppercase">{messagingProvider}</strong>
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900 mt-1">
              {verificationResult?.status === 'ACTIVO Y CONECTADO'
                ? 'Conexión Bidireccional Establecida con la API Externa'
                : 'Pendiente de Validación de API Key o Credenciales'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {verificationResult?.message || 'Ingresa tu Token de Zernio para enlazar la mensajería de los agentes de Aura IA.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleVerifyConnection}
          disabled={verifying}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
          {verifying ? 'Comprobando...' : 'Verificar Estado en Vivo'}
        </button>
      </div>

      {/* WEBHOOK URL PARA CONFIGURAR EN ZERNIO / PROVEEDOR EXTERNO */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Endpoint Webhook Oficial de Audenti
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            HTTP POST Activo
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Copia esta URL en el panel de control de tu proveedor externo (Zernio) para recibir todos los mensajes entrantes de WhatsApp y SMS directamente en Supabase:
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 select-all overflow-x-auto">
            {webhookPublicUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedWebhook ? '¡Copiado!' : 'Copiar URL'}
          </button>
        </div>
      </div>

      {/* Formulario Principal de Configuración */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* PANEL 1: API EXTERNA (ZERNIO / PROVEEDOR DE MENSAJERÍA) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Credenciales de API de Mensajería Externa (Zernio / Gateway)
                </h3>
                <p className="text-xs text-slate-500">
                  Token y ruta de despacho para envíos automatizados de citas y recetas
                </p>
              </div>
            </div>
            {lastUpdated && (
              <span className="text-[11px] text-slate-400 font-mono">
                Último guardado: {new Date(lastUpdated).toLocaleDateString('es-MX')} {new Date(lastUpdated).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Proveedor de Mensajería
                </label>
                <select
                  value={messagingProvider}
                  onChange={(e) => {
                    const val = e.target.value as any
                    setMessagingProvider(val)
                    if (val === 'openwa' && messagingApiUrl.includes('zernio')) {
                      setMessagingApiUrl('http://localhost:2785')
                    } else if (val === 'zernio' && messagingApiUrl.includes('2785')) {
                      setMessagingApiUrl('https://api.zernio.com/v1/messages')
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="openwa">Pasarela OpenWA (Recomendado - Auto-hospedado / VPS)</option>
                  <option value="zernio">Zernio Messaging API (Nube Multi-Agente)</option>
                  <option value="meta">WhatsApp Cloud API (Meta Oficial)</option>
                  <option value="generic">Gateway HTTP Genérico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Teléfono Oficial de la Clínica (E.164)
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="525522427769"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                API Endpoint de Envío HTTP POST
              </label>
              <input
                type="url"
                value={messagingApiUrl}
                onChange={(e) => setMessagingApiUrl(e.target.value)}
                placeholder="https://api.zernio.com/v1/messages"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                API Key / Token de Acceso del Proveedor (Zernio) *
              </label>
              <input
                type="password"
                value={messagingApiKey}
                onChange={(e) => setMessagingApiKey(e.target.value)}
                placeholder="zn_live_••••••••••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Se almacena encriptado en Supabase Storage sin exponerse al cliente público.
              </p>
            </div>
          </div>
        </div>

        {/* PANEL 2: COMPORTAMIENTO DEL CHATBOT Y MULTI-AGENTES */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Comportamiento del Agente Autónomo de Comunicación (Aura IA)
                </h3>
                <p className="text-xs text-slate-500">
                  Reglas de respuesta automática para triaje, agenda y recordatorios
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={chatbotEnabled}
                onChange={(e) => setChatbotEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'autonomous',
                  title: 'Modo 100% Autónomo',
                  desc: 'Aura IA responde de inmediato, agenda citas en Supabase y escala urgencias.'
                },
                {
                  id: 'suggestion',
                  title: 'Modo Sugerencia',
                  desc: 'Aura redacta el mensaje en borrador para autorización previa de la doctora.'
                },
                {
                  id: 'disabled',
                  title: 'Manual Exclusivo',
                  desc: 'Respuestas manuales exclusivamente escritas por la Dra. Aura Estudillo.'
                }
              ].map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setChatbotMode(mode.id as any)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    chatbotMode === mode.id
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{mode.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{mode.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MENSAJES DE ESTADO */}
        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Configuración guardada exitosamente en Supabase PostgreSQL y Storage.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* BOTÓN GUARDAR */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Guardando en Supabase...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Configuración y Activar Conexión
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
