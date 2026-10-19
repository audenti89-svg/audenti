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
import { QRCodeSVG } from 'qrcode.react'

export default function WhatsAppSettingsPage() {
  const [phoneNumber, setPhoneNumber] = useState('525522427769')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [chatwootWebhookUrl, setChatwootWebhookUrl] = useState('')
  const [metaAccessToken, setMetaAccessToken] = useState('')
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('audenti_secure_token')
  const [chatbotEnabled, setChatbotEnabled] = useState(true)
  const [chatbotMode, setChatbotMode] = useState<'autonomous' | 'suggestion' | 'disabled'>('autonomous')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Estado de WAHA QR (DeskcommCRM Adapter)
  const [wahaQr, setWahaQr] = useState<string | null>(null)
  const [wahaStatus, setWahaStatus] = useState<string>('DISCONNECTED')
  const [wahaLoading, setWahaLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Cargar configuración guardada y generar QR automáticamente
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const res = await fetch('/api/settings/whatsapp')
        if (res.ok) {
          const json = await res.json()
          if (json.settings) {
            setPhoneNumber(json.settings.phone_number || '525522427769')
            setPhoneNumberId(json.settings.phone_number_id || '')
            setWabaId(json.settings.waba_id || '')
            setChatwootWebhookUrl(json.settings.chatwoot_webhook_url || '')
            setMetaAccessToken(json.settings.meta_access_token || '')
            setWebhookVerifyToken(json.settings.webhook_verify_token || 'audenti_secure_token')
            setChatbotEnabled(json.settings.chatbot_enabled !== undefined ? json.settings.chatbot_enabled : true)
            setChatbotMode(json.settings.chatbot_mode || 'autonomous')
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
    handleLoadWahaQr()
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
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          chatwoot_webhook_url: chatwootWebhookUrl,
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
          phone_number_id: phoneNumberId,
          meta_access_token: metaAccessToken,
          webhook_verify_token: webhookVerifyToken
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerificationResult({ success: true, message: data.message })
      } else {
        setVerificationResult({ success: false, message: data.error || 'No se pudo verificar la conexión con Meta.' })
      }
    } catch (e: any) {
      setVerificationResult({ success: false, message: e.message || 'Error de red al verificar conexión.' })
    } finally {
      setVerifying(false)
    }
  }

  // Cargar QR de WhatsApp Web WAHA (DeskcommCRM Adapter)
  const handleLoadWahaQr = async () => {
    setWahaLoading(true)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_qr' })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setWahaQr(data.qr || null)
        setWahaStatus(data.status || 'SCAN_QR_CODE')
        if (data.connected || data.status === 'WORKING') {
          setWahaStatus('WORKING')
        }
      }
    } catch (e: any) {
      console.warn('Error obteniendo QR WAHA:', e)
    } finally {
      setWahaLoading(false)
    }
  }

  // Sondeo de estado cuando el QR está activo esperando escaneo
  useEffect(() => {
    if (wahaStatus === 'SCAN_QR_CODE') {
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/settings/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_qr' })
          })
          const data = await res.json()
          if (data.status === 'WORKING' || data.connected) {
            setWahaStatus('WORKING')
            setWahaQr(null)
            clearInterval(interval)
          }
        } catch {}
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [wahaStatus])

  const handleSimulateConnected = () => {
    setWahaStatus('WORKING')
    setWahaQr(null)
  }

  const handleLogoutWaha = async () => {
    setWahaLoading(true)
    try {
      await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout_waha' })
      })
      setWahaQr(null)
      setWahaStatus('DISCONNECTED')
    } catch (e) {
      console.warn('Error desconectando WAHA:', e)
    } finally {
      setWahaLoading(false)
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
              Meta Cloud API &amp; Chatbot Aura AI
            </span>
            <span className="text-slate-400 text-xs">• Sin requerir edición de código</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            Configuración WhatsApp &amp; Chatbot Multi-Canal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administra el número oficial de atención de la Dra. Aura Estudillo, credenciales de Meta y comportamiento del chatbot clínico en Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0F172A] text-white text-xs font-bold shadow-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            {chatbotEnabled ? 'Chatbot Activo 24/7' : 'Chatbot Pausado'}
          </span>
        </div>
      </div>

      {/* MÓDULO DE VINCULACIÓN POR CÓDIGO QR (WAHA / DESKCOMMCRM ADAPTER) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Vinculación de WhatsApp Web por Código QR (WAHA)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                  DeskcommCRM Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Escanea el código QR desde tu celular (Dispositivos Vinculados) para habilitar mensajería bidireccional instantánea.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              wahaStatus === 'WORKING'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : wahaStatus === 'SCAN_QR_CODE'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                wahaStatus === 'WORKING' ? 'bg-emerald-500 animate-pulse' : wahaStatus === 'SCAN_QR_CODE' ? 'bg-amber-500 animate-ping' : 'bg-slate-400'
              }`} />
              {wahaStatus === 'WORKING' ? 'Sesión Conectada' : wahaStatus === 'SCAN_QR_CODE' ? 'Esperando Escaneo' : 'Desconectado'}
            </span>
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Pasos para conectar:</h4>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Abre <strong>WhatsApp</strong> en el teléfono oficial de la Dra. Aura Estudillo.</li>
              <li>Toca <strong>Menú</strong> (Android) o <strong>Configuración</strong> (iPhone) y selecciona <strong>Dispositivos Vinculados</strong>.</li>
              <li>Presiona <strong>Vincular un Dispositivo</strong> y apunta la cámara hacia el código QR mostrado a la derecha.</li>
              <li>Audenti comenzará a recibir y contestar mensajes automáticamente con Aura IA.</li>
            </ol>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleLoadWahaQr}
                disabled={wahaLoading}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {wahaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                <span>{wahaQr ? 'Actualizar Código QR' : 'Generar Código QR de Vinculación'}</span>
              </button>

              {wahaStatus === 'WORKING' && (
                <button
                  type="button"
                  onClick={handleLogoutWaha}
                  disabled={wahaLoading}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer"
                >
                  Desvincular Sesión
                </button>
              )}
            </div>
          </div>

          <div className="w-64 h-64 p-4 rounded-2xl bg-slate-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-center shadow-inner shrink-0">
            {wahaQr ? (
              <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 flex flex-col items-center">
                <QRCodeSVG value={wahaQr} size={180} level="M" />
                <span className="text-[10px] text-slate-500 font-mono mt-2 animate-pulse">Escanea desde WhatsApp</span>
              </div>
            ) : (
              <div className="space-y-2 text-slate-400">
                <QrCode className="w-12 h-12 mx-auto stroke-1" />
                <p className="text-xs font-medium">Haz clic en &ldquo;Generar Código QR&rdquo; para vincular</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulario Principal */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* PANEL 1: CREDENCIALES DE META WHATSAPP */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Parámetros de Integración Meta Developers</h3>
                <p className="text-xs text-slate-500">Credenciales del número telefónico y API Cloud de Meta</p>
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
                  <p className="text-xs font-bold text-emerald-900">Configuración guardada exitosamente en Supabase</p>
                  <p className="text-[11px] text-emerald-700">Las nuevas credenciales y parámetros de IA ya están enlazados con Audenti CRM.</p>
                </div>
              </div>
            )}

            {verificationResult && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in duration-200 ${
                verificationResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                {verificationResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />}
                <p className="text-xs font-bold">{verificationResult.message}</p>
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
                  Número de WhatsApp Business Oficial (phone_number)
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="ej. 525522427769"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Formato internacional con lada sin signos (ej. 525522427769 para México).
                </p>
              </div>

              {/* 2. Meta Phone Number ID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  Meta Phone Number ID (phone_number_id)
                </label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="ej. 109823471092837"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Identificador del número de teléfono en Meta Developer Console (WhatsApp API Setup).
                </p>
              </div>

              {/* 3. WABA ID (WhatsApp Business Account ID) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="ej. 892716382910293"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Identificador de la cuenta comercial de WhatsApp (WABA) en Meta Business Manager.
                </p>
              </div>

              {/* 4. Chatwoot Webhook URL para Pruebas Activas */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  URL de Webhook de Chatwoot (Pruebas de Mensajería)
                </label>
                <input
                  type="url"
                  value={chatwootWebhookUrl}
                  onChange={(e) => setChatwootWebhookUrl(e.target.value)}
                  placeholder="https://chatwoot.tu-dominio.com/webhooks/whatsapp"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Endpoint de sincronización bidireccional con Chatwoot para pruebas activas de mensajería.
                </p>
              </div>

              {/* 3. Meta Permanent Access Token */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" />
                  Meta Permanent Token (meta_access_token)
                </label>
                <input
                  type="password"
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  placeholder="EAABw..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Token generado para el usuario del sistema con permisos `whatsapp_business_messaging`.
                </p>
              </div>

              {/* 4. Webhook Verify Token */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Webhook Verify Token (webhook_verify_token)
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
                    className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Generar Nuevo
                  </button>
                </div>
              </div>
            </div>

            {/* Bloque Informativo de URL de Webhook para Meta Developers */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>URL Oficial del Webhook para Meta Developers:</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-emerald-200 font-mono text-xs">
                <code className="text-emerald-800 font-bold select-all break-all">
                  https://audenti.vercel.app/api/webhook/whatsapp
                </code>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">POST &amp; GET verify</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Copia y pega esta URL en tu panel de Meta Developers bajo el producto WhatsApp &gt; Configuración &gt; URL de devolución de llamada.
              </p>
            </div>
          </div>
        </div>

        {/* PANEL 2: PANEL DE CONTROL DEL CHATBOT (AURA AI SETTINGS) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Panel de Control del Chatbot (Aura AI Settings)</h3>
                <p className="text-xs text-slate-500">Comportamiento del asistente de triaje y respuesta automática</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Switch ON/OFF */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Respuesta Automática del Chatbot</h4>
                <p className="text-[11px] text-slate-500">Activa o pausa la respuesta autónoma de Aura IA en canales de mensajería.</p>
              </div>
              <button
                type="button"
                onClick={() => setChatbotEnabled(!chatbotEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  chatbotEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    chatbotEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Selector de Comportamiento */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Modo de Operación del Asistente Aura IA
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setChatbotMode('autonomous')}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    chatbotMode === 'autonomous'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <span>🤖</span> Autónomo (24/7)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Responde al paciente, clasifica triage y escala urgencias de inmediato.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setChatbotMode('suggestion')}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    chatbotMode === 'suggestion'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 ring-1 ring-amber-300'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <span>💡</span> Sugerencia a Doctora
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Genera borradores en /dashboard/chat para que la doctora apruebe antes de enviar.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setChatbotMode('disabled')}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    chatbotMode === 'disabled'
                      ? 'bg-rose-50 border-rose-400 text-rose-950 ring-1 ring-rose-300'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <span>⏸️</span> Desactivado
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Atención 100% manual por la Dra. Aura Estudillo sin intervención de IA.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Footer con Acciones */}
          <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleVerifyConnection}
              disabled={verifying}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {verifying ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
              <span>Verificar Webhook y Token</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
