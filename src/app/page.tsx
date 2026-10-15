'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  FileText,
  Activity,
  Users,
  MessageSquare,
  ShieldCheck,
  Building2,
  Sparkles,
  Download,
  Smartphone,
  Monitor,
  Printer,
  ChevronRight,
  CheckCircle2,
  QrCode,
  HeartHandshake,
  Stethoscope,
  ArrowRight,
  TrendingUp,
  Cpu,
  Smile,
  Zap,
  MapPin,
  Phone,
  Clock,
  Award,
  Lock,
  ChevronDown,
  Layers,
  Star,
  Copy,
  Check,
  Share2,
  X,
  Menu
} from 'lucide-react'
import { AudentiLogo } from '@/components/ui/AudentiLogo'
import { QRCodeSVG } from 'qrcode.react'
import { useIsMobile } from '@/hooks/useIsMobile'

// ==========================================
// 1. COMPONENTE BANNER FLOTANTE PWA CON EVENTO REAL
// ==========================================
export function FloatingPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)

  useEffect(() => {
    // 1. Verificar si ya está instalado en modo Standalone
    const checkStandalone = () => {
      const isStandalone =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      return Boolean(isStandalone)
    }

    if (checkStandalone()) {
      setIsVisible(false)
      return
    }

    // 2. Verificar descarte reciente en sesión
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed')
      if (dismissed === 'true') {
        return
      }
    }

    // 3. Listener nativo para navegadores que emiten beforeinstallprompt (Chrome, Edge, Android)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!checkStandalone()) {
        setIsVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Fallback visible en escritorio/móvil si no está en modo standalone para asegurar que el usuario siempre lo vea
    const timer = setTimeout(() => {
      if (!checkStandalone()) {
        setIsVisible(true)
      }
    }, 1200)

    const handleAppInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(timer)
    }
  }, [])

  if (!isVisible) return null

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setInstallSuccess(true)
        setTimeout(() => setIsVisible(false), 3000)
      }
      setDeferredPrompt(null)
    } else {
      // Instrucción amigable si el navegador no soporta el prompt directo
      alert('📱 Para instalar en iOS: toca el botón "Compartir" en Safari y selecciona "Agregar a pantalla de inicio".\n💻 En Chrome/Edge: haz clic en el icono de instalación (⊞) en la barra de direcciones.')
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa_prompt_dismissed', 'true')
    }
  }

  return (
    <aside
      aria-label="Instalación de Aplicación PWA"
      className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4.5 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-5 duration-300 print:hidden pointer-events-auto"
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Cerrar por ahora"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <AudentiLogo variant="icon" size={42} />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-tight text-white block">
              Instalar DentalCloud Pro
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-amber-300 font-medium mt-0.5">
            Dra. Aura Estudillo • Clínica Oficial
          </p>
        </div>
      </div>

      {installSuccess ? (
        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>¡Aplicación instalada con éxito en tu dispositivo!</span>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
            Instala la aplicación en tu celular, tablet o PC para acceso directo sin barras de navegador, alertas y trabajo offline.
          </p>

          <div className="flex items-center gap-2 pt-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Instalar Ahora
            </button>

            <button
              onClick={handleDismiss}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              Más tarde
            </button>
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2.5 mt-3 border-t border-slate-800">
        <span className="flex items-center gap-1">
          <Monitor className="w-3 h-3 text-slate-400" /> Windows / Mac / Linux
        </span>
        <span className="flex items-center gap-1">
          <Smartphone className="w-3 h-3 text-slate-400" /> iOS / Android PWA
        </span>
      </div>
    </aside>
  )
}

// ==========================================
// 2. COMPONENTE TARJETA QR CON LOGO AUDENTI
// ==========================================
export function AudentiQRCodeCard() {
  const [copied, setCopied] = useState(false)
  const currentUrl = 'https://audenti-dra-aura-estudillo.vercel.app/'

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Audenti — Dra. Aura Estudillo',
        text: 'Escanea o ingresa para agendar o acceder a la app de la Dra. Aura Estudillo:',
        url: currentUrl,
      }).catch(() => {})
    } else {
      handleCopy()
    }
  }

  return (
    <div className="bg-slate-900/90 border-2 border-amber-400/80 rounded-3xl p-5 sm:p-8 max-w-xl mx-auto shadow-2xl relative overflow-hidden text-center space-y-4 sm:space-y-6 modal-landscape-scroll">
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Código QR Institucional Oficial
        </div>
        <h3 className="text-2xl font-black text-white tracking-tight">
          Acceso Rápido &amp; Red de Referidos
        </h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
          Escanea para compartir o instalar la app de la <strong>Dra. Aura Estudillo</strong> de forma instantánea en cualquier smartphone o tablet.
        </p>
      </div>

      {/* Código QR Dinámico con Isotipo Central */}
      <div className="p-4 bg-white rounded-3xl border-4 border-amber-400 inline-block shadow-2xl relative group mx-auto">
        <div className="relative inline-flex items-center justify-center p-2">
          <QRCodeSVG
            value={currentUrl}
            size={210}
            level="H"
            includeMargin={true}
            bgColor="#FFFFFF"
            fgColor="#0F172A"
          />

          {/* Contenedor blanco flotante en el centro del QR con isotipo Audenti */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 border-2 border-amber-400 shadow-xl flex items-center justify-center">
              <AudentiLogo variant="icon" size={44} />
            </div>
          </div>
        </div>
      </div>

      {/* URL de Acceso Directo */}
      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs flex items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">URL de Acceso Universal</span>
          <span className="font-mono font-bold text-amber-300 truncate block text-[11px]">{currentUrl}</span>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
        >
          <Share2 className="w-4 h-4" />
          Compartir Ficha &amp; QR
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
        >
          Ingresar al Sistema
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// ==========================================
// 3. LANDING PAGE PRINCIPAL (src/app/page.tsx)
// ==========================================
export default function LandingPage() {
  const [activeBranchTab, setActiveBranchTab] = useState<'balbuena' | 'guadalupe' | 'roma'>('balbuena')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  const specialties = [
    {
      title: 'Odontología Preventiva & Profilaxis',
      desc: 'Detartraje ultrasónico de alta precisión, profilaxis profunda, selladores de fosetas y fisuras, y diseño de planes preventivos.',
      icon: Smile,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      tag: 'Cuidado Primario',
    },
    {
      title: 'Ortodoncia Avanzada & Ortopedia Maxilar',
      desc: 'Sistemas de autoligado estético y metálico, microtornillos de anclaje, ortopedia funcional y alineadores invisibles transparentes.',
      icon: Zap,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      tag: 'Estética & Oclusión',
    },
    {
      title: 'Endodoncia Mecanizada Rotatoria',
      desc: 'Tratamientos de conductos con instrumentación reciprocante, irrigación ultrasónica pasiva y obturación biocerámica.',
      icon: Stethoscope,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      tag: 'Conservación Dental',
    },
    {
      title: 'Rehabilitación Oral & Prótesis Fija / Removible',
      desc: 'Coronas y carillas de zirconio monolítico translúcido y disilicato de litio E.Max, incrustaciones estéticas y prótesis sobre implantes.',
      icon: Layers,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      tag: 'Restauración Estética',
    },
    {
      title: 'Cirugía Bucal & Implantología Dental',
      desc: 'Extracción atraumática de terceros molares, injertos óseos con fibrina rica en plaquetas (PRF) e implantes de titanio oseointegrados.',
      icon: Activity,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      tag: 'Alta Especialidad',
    },
  ]

  const branchesData = {
    balbuena: {
      name: 'Sucursal Balbuena (Sede Matriz)',
      doctor: 'Dra. Aura Estudillo — Dirección General',
      address: 'Av. del Taller & Retorno 12, Jardín Balbuena, Venustiano Carranza, CDMX',
      phone: '+52 55 5764 8810',
      hours: 'Lunes a Sábado: 09:00 - 19:30 hrs',
      facilities: '2 Gabinetes Dentales Equipados • Área de Esterilización Grado Hospitalario • Sala de Espera VIP',
      badge: 'Sede Principal Activa',
      mapUrl: 'https://maps.google.com/?q=Jardin+Balbuena+CDMX',
    },
    guadalupe: {
      name: 'Sucursal Guadalupe Chalma',
      doctor: 'Dr. Ramírez López — Especialista en Turno',
      address: 'Av. Morelos 144, Guadalupe Chalma, Gustavo A. Madero, CDMX',
      phone: '+52 55 5306 9920',
      hours: 'Lunes a Viernes: 10:00 - 18:30 hrs | Sábados: 09:00 - 15:00 hrs',
      facilities: 'Quirófano Odontológico Esterilizado • Gabinete Quirúrgico para Cirugías e Implantes',
      badge: 'Unidad Quirúrgica Activa',
      mapUrl: 'https://maps.google.com/?q=Guadalupe+Chalma+Gustavo+A+Madero',
    },
    roma: {
      name: 'Sucursal Colonia Roma',
      doctor: 'Dra. Gutiérrez Morales — Dirección Clínica Local',
      address: 'Álvaro Obregón / Insurgentes Sur, Col. Roma Norte, Cuauhtémoc, CDMX',
      phone: '+52 55 5922 4110',
      hours: 'Lunes a Sábado: 08:30 - 20:00 hrs',
      facilities: '3 Sillones Ergonómicos de Última Generación • Escáner Intraoral 3D • Centro de Estética',
      badge: 'Próxima Apertura • Preventa VIP',
      mapUrl: 'https://maps.google.com/?q=Roma+Norte+CDMX',
    },
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b1120] text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950 relative">
      
      {/* 1. NAVBAR INSTITUCIONAL */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0b1120]/90 border-b border-slate-800/80 px-4 sm:px-6 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <AudentiLogo size={isMobile ? 34 : 42} doctorName="Dra. Aura Estudillo" />
          </Link>

          {/* Menú de Navegación Escritorio */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#filosofia" className="hover:text-amber-400 transition-colors">¿Quiénes Somos?</a>
            <a href="#especialidades" className="hover:text-amber-400 transition-colors">Especialidades</a>
            <a href="#qr-section" className="hover:text-amber-400 transition-colors text-amber-300 font-bold">Código QR</a>
            <a href="#sucursales" className="hover:text-amber-400 transition-colors">Sucursales</a>
            <a href="#portal" className="hover:text-amber-400 transition-colors">Portal PWA</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <span className="hidden sm:inline">Acceso al Sistema</span>
              <span className="sm:hidden">Acceso</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>

            {/* Botón Menú Hamburguesa en Móvil */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              aria-label="Abrir Menú de Navegación"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menú Desplegable Responsivo para Teléfono */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-1 text-sm font-semibold text-slate-300">
              <a
                href="#filosofia"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                ¿Quiénes Somos?
              </a>
              <a
                href="#especialidades"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Especialidades
              </a>
              <a
                href="#qr-section"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 text-amber-300 font-bold transition-colors"
              >
                Código QR Institucional
              </a>
              <a
                href="#sucursales"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Sucursales
              </a>
              <a
                href="#portal"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-800 hover:text-amber-400 transition-colors"
              >
                Portal PWA
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative px-4 sm:px-6 lg:px-12 pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden border-b border-slate-800">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-5 sm:space-y-7 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span>Clínica Dental &amp; Plataforma Tecnológica de Vanguardia</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Excelencia en Odontología &amp; Innovación Clínica <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
              Dra. Aura Estudillo
            </span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed px-2">
            Excelencia en salud bucal, odontología integral y especializada con tecnología de punta y atención personalizada para toda la familia.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-400/20 transition-all hover:scale-105 active:scale-95"
            >
              Acceder al Sistema / Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#qr-section"
              className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700 shadow-lg transition-all"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              Ver Código QR Institucional
            </a>
          </div>


          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400 border-t border-slate-800/80 max-w-2xl mx-auto">
            <span className="flex items-center gap-2 font-medium">
              <Monitor className="w-4 h-4 text-emerald-400" /> Windows / macOS / Linux
            </span>
            <span className="flex items-center gap-2 font-medium">
              <Smartphone className="w-4 h-4 text-emerald-400" /> iOS &amp; Android PWA
            </span>
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Céd. Prof. 8492019
            </span>
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN DEDICADA: CÓDIGO QR INSTITUCIONAL CON LOGO AUDENTI */}
      <section id="qr-section" className="px-4 sm:px-6 lg:px-12 py-14 sm:py-20 lg:py-24 bg-slate-950/70 border-b border-slate-800">
        <div className="max-w-4xl mx-auto space-y-6">
          <AudentiQRCodeCard />
        </div>
      </section>

      {/* 4. ¿QUIÉNES SOMOS & FILOSOFÍA? */}
      <section id="filosofia" className="px-4 sm:px-6 lg:px-12 py-14 sm:py-20 lg:py-24 max-w-7xl mx-auto w-full border-b border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/80 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4">
              <AudentiLogo variant="icon" size={60} />
              <div>
                <h3 className="text-xl font-black text-white">Dra. Aura Estudillo</h3>
                <p className="text-xs font-bold text-amber-400 mt-0.5">Cirujano Dentista • Dirección General</p>
                <p className="text-[11px] font-mono text-slate-400">Cédula Profesional: 8492019</p>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300 leading-relaxed">
              <p>
                Lidera una práctica clínica enfocada en la <strong>humanización de la odontología</strong>, combinando diagnósticos de máxima precisión con bioseguridad certificada bajo normas COFEPRIS y SSA.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-base font-black text-white block">+12</span>
                <span className="text-[10px] text-slate-400">Años de Trayectoria</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-base font-black text-amber-400 block">+6,500</span>
                <span className="text-[10px] text-slate-400">Pacientes Atendidos</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-base font-black text-emerald-400 block">100%</span>
                <span className="text-[10px] text-slate-400">Bioseguridad SSA</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
              Nuestra Filosofía
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Odontología basada en evidencia, empatía y bioseguridad absoluta
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Prevención, estética dental avanzada, confort del paciente y bioseguridad hospitalaria en cada tratamiento.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Bioseguridad Grado Hospitalario</h4>
                  <p className="text-xs text-slate-400 mt-1">Esterilización de instrumental en autoclave con testigos biológicos y desinfección estricta.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <HeartHandshake className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Confort del Paciente &amp; Odontología Sin Dolor</h4>
                  <p className="text-xs text-slate-400 mt-1">Técnicas anestésicas computarizadas y ambientes climatizados diseñados para evitar el estrés dental.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ESPECIALIDADES */}
      <section id="especialidades" className="px-4 sm:px-6 lg:px-12 py-14 sm:py-20 lg:py-24 max-w-7xl mx-auto w-full border-b border-slate-800 space-y-8 sm:space-y-12">
        <div className="text-center space-y-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
            Servicios Clínicos
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Especialidades Odontológicas Integradas
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {specialties.map((spec) => {
            const Icon = spec.icon
            return (
              <div
                key={spec.title}
                className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4 hover:border-amber-400/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${spec.color}`}>
                    {spec.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{spec.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{spec.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. SUCURSALES */}
      <section id="sucursales" className="px-4 sm:px-6 lg:px-12 py-14 sm:py-20 lg:py-24 bg-slate-950/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-3">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
              Sedes Clínicas
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ubicaciones de la Red Dra. Aura Estudillo
            </h2>
          </div>

          <div className="flex justify-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveBranchTab('balbuena')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeBranchTab === 'balbuena' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Balbuena (Matriz)
            </button>
            <button
              onClick={() => setActiveBranchTab('guadalupe')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeBranchTab === 'guadalupe' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Guadalupe Chalma
            </button>
            <button
              onClick={() => setActiveBranchTab('roma')}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeBranchTab === 'roma' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300'
              }`}
            >
              Colonia Roma
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 max-w-4xl mx-auto space-y-4">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
              {branchesData[activeBranchTab].badge}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">{branchesData[activeBranchTab].name}</h3>
            <p className="text-xs font-semibold text-amber-400">{branchesData[activeBranchTab].doctor}</p>
            <p className="text-xs text-slate-300">{branchesData[activeBranchTab].address}</p>
            <p className="text-xs font-bold text-white">Tel: {branchesData[activeBranchTab].phone}</p>
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">{branchesData[activeBranchTab].facilities}</p>
          </div>
        </div>
      </section>

      {/* 7. PORTAL DE ACCESO TECNOLÓGICO */}
      <section id="portal" className="px-4 sm:px-6 lg:px-12 py-14 sm:py-20 lg:py-24 max-w-7xl mx-auto w-full border-b border-slate-800 space-y-8 sm:space-y-12">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">Inicio de Sesión Seguro por Roles</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Acceso diferenciado para Dirección General, Especialistas, Recepción y Pacientes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md"
            >
              Ingresar al Sistema Clínico
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="mt-auto px-6 lg:px-12 py-10 bg-[#080d19] text-xs text-slate-500 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AudentiLogo variant="icon" size={36} />
            <div>
              <p className="font-bold text-slate-200">AUDENTI CLINICAL SUITE</p>
              <p className="text-[11px] text-slate-500">Dra. Aura Estudillo • Céd. Prof. 8492019</p>
            </div>
          </div>
          <p className="text-[11px]">
            &copy; 2026 Audenti / DentalCloud Pro. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* 9. BANNER PWA FLOTANTE INTELIGENTE */}
      <FloatingPWABanner />

    </div>
  )
}
