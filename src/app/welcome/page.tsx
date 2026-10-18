'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AudentiLogo } from '@/components/ui/AudentiLogo'
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
  Star
} from 'lucide-react'
import { SeniorAccessibilityBanner } from '@/components/ui/SeniorAccessibilityBanner'

export default function LandingPresentationPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [activeBranchTab, setActiveBranchTab] = useState<'balbuena' | 'guadalupe' | 'roma'>('balbuena')

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setIsInstallable(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar en iPhone/iPad: toca el botón Compartir y elige "Agregar a pantalla de inicio".\nEn Windows/Mac/Android: presiona el icono de instalación en la barra superior del navegador.')
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  // 1. Especialidades Odontológicas
  const specialties = [
    {
      title: 'Odontología Preventiva & Profilaxis',
      desc: 'Detartraje ultrasónico de alta precisión, profilaxis profunda, selladores de fosetas y fisuras, y diseño de planes de mantenimiento preventivo para niños y adultos.',
      icon: Smile,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      tag: 'Cuidado Primario',
    },
    {
      title: 'Ortodoncia Avanzada & Ortopedia Maxilar',
      desc: 'Alineación dental de vanguardia: sistemas de autoligado estético y metálico, microtornillos de anclaje esqueletal, ortopedia funcional y ortodoncia invisible con alineadores transparentes.',
      icon: Zap,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      tag: 'Estética & Oclusión',
    },
    {
      title: 'Endodoncia Mecanizada Rotatoria',
      desc: 'Tratamientos de conductos en una sola cita con instrumentación reciprocante, irrigación ultrasónica pasiva y obturación tridimensional biocerámica para salvar piezas comprometidas.',
      icon: Stethoscope,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      tag: 'Conservación Dental',
    },
    {
      title: 'Rehabilitación Oral & Prótesis Fija / Removible',
      desc: 'Coronas y carillas de zirconio monolítico translúcido y disilicato de litio E.Max, incrustaciones estéticas inlay/onlay y prótesis sobre implantes con ajuste micrométrico.',
      icon: Layers,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      tag: 'Restauración Estética',
    },
    {
      title: 'Cirugía Bucal & Implantología Dental',
      desc: 'Extracción atraumática de terceros molares retenidos, injertos óseos y membranas de fibrina rica en plaquetas (PRF), y colocación guiada de implantes oseointegrados de titanio.',
      icon: Activity,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      tag: 'Alta Especialidad',
    },
  ]

  // 2. Sedes de la Clínica
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

  // 3. Pilares Tecnológicos
  const techFeatures = [
    {
      title: 'Agenda Médica Inteligente estilo Google Calendar',
      desc: 'Control multidireccional por sillón o especialista, semáforo de puntualidad de sala y alertas sonoras de recepción en tiempo real vía Web Audio API.',
      icon: Calendar,
      color: 'text-blue-400',
    },
    {
      title: 'Expediente & Odontograma FDI Interactivo',
      desc: 'Mapeo anatómico digital de 5 caras por pieza dental, registro inmediato de hallazgos patológicos, notas SOAP y cuestionario clínico de triaje normativo SSA.',
      icon: FileText,
      color: 'text-emerald-400',
    },
    {
      title: 'Papelería Membretada con QR y Doble Copia',
      desc: 'Generación instantánea de recetas con posología predefinida, presupuestos arancelarios y consentimientos informados impresos en 2 copias con verificación QR inmutable.',
      icon: Printer,
      color: 'text-amber-400',
    },
    {
      title: 'Comunicación Omnicanal & Núcleo Familiar',
      desc: 'Canales internos segmentados por roles y mensajería a pacientes con árbol genealógico de referidos y envíos grupales directos a todo el núcleo familiar.',
      icon: MessageSquare,
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      
      {/* 1. NAVBAR INSTITUCIONAL */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b1120]/90 border-b border-slate-800/80 px-6 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/welcome" className="hover:opacity-90 transition-opacity">
            <AudentiLogo size={42} doctorName="Dra. Aura Estudillo" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#filosofia" className="hover:text-amber-400 transition-colors">¿Quiénes Somos?</a>
            <a href="#especialidades" className="hover:text-amber-400 transition-colors">Especialidades</a>
            <a href="#sucursales" className="hover:text-amber-400 transition-colors">Sucursales</a>
            <a href="#tecnologia" className="hover:text-amber-400 transition-colors">Portal PWA</a>
            <a href="#franquicias" className="hover:text-amber-400 transition-colors">Franquicias</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleInstallClick}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Instalar PWA
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              Acceso al Sistema
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative px-6 lg:px-12 pt-20 pb-28 overflow-hidden border-b border-slate-800">
        {/* Luces y degradados de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-7 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Centro Odontológico de Excelencia &amp; Plataforma SaaS Multi-Sede
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Clínica Dental &amp; Plataforma Tecnológica de Vanguardia <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
              Dra. Aura Estudillo
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Excelencia en salud bucal, odontología integral y especializada con tecnología de punta y atención personalizada para toda la familia.
            Coordinación clínica omnicanal, historia digital inmutable y bioseguridad certificada en cada sede.
          </p>

          {/* Botones CTA Principales */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-400/20 transition-all hover:scale-105 active:scale-95"
            >
              Acceder al Sistema / Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 shadow-lg transition-all hover:border-slate-600"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              Instalar Aplicación PWA
            </button>
          </div>

          {/* Badges de Compatibilidad Universal */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400 border-t border-slate-800/80 max-w-2xl mx-auto">
            <span className="flex items-center gap-2 font-medium">
              <Monitor className="w-4 h-4 text-emerald-400" /> Windows / macOS / Linux (App de Escritorio)
            </span>
            <span className="flex items-center gap-2 font-medium">
              <Smartphone className="w-4 h-4 text-emerald-400" /> iOS &amp; Android PWA
            </span>
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Norma Oficial SSA / COFEPRIS
            </span>
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN: ¿QUIÉNES SOMOS & NUESTRA FILOSOFÍA? */}
      <section id="filosofia" className="px-6 lg:px-12 py-24 max-w-7xl mx-auto w-full border-b border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Tarjeta de Presentación de la Doctora */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/80 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-amber-400 text-slate-950 font-black text-3xl flex items-center justify-center shadow-lg">
                AE
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Dra. Aura Estudillo</h3>
                <p className="text-xs font-bold text-amber-400 mt-0.5">Cirujano Dentista • Dirección General</p>
                <p className="text-[11px] font-mono text-slate-400">Cédula Profesional: 8492019</p>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300 leading-relaxed">
              <p>
                Lidera una práctica clínica enfocada en la <strong>humanización de la odontología</strong>, combinando diagnósticos de máxima precisión biológica con las tecnologías digitales más avanzadas de México.
              </p>
              <p>
                Bajo su dirección, la red integra protocolos estrictos de esterilización hospitalaria, manejo del dolor mínimamente invasivo y un seguimiento estrecho del núcleo familiar del paciente.
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

          {/* Filosofía y Pilares */}
          <div className="lg:col-span-7 space-y-6">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
              Nuestra Filosofía de Trabajo
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Odontología basada en evidencia, empatía y bioseguridad absoluta
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Entendemos que acudir al dentista no debe ser una experiencia traumática. Diseñamos cada procedimiento bajo tres pilares fundamentales:
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Bioseguridad Grado Hospitalario</h4>
                  <p className="text-xs text-slate-400 mt-1">Esterilización de instrumental en autoclave de calor húmedo con testigos biológicos y desinfección rigurosa de superficies entre cada turno.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Confort del Paciente &amp; Odontología Sin Dolor</h4>
                  <p className="text-xs text-slate-400 mt-1">Técnicas anestésicas computarizadas y tópicas previas, ambientes climatizados y atención relajada pensada para niños y adultos con fobia dental.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Prevención y Conservación Dental</h4>
                  <p className="text-xs text-slate-400 mt-1">Nuestra primera opción siempre será salvar tu órgano dental natural mediante técnicas reconstructivas y endodoncia de alta resolución.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SECCIÓN: ESPECIALIDADES ODONTOLÓGICAS OFRECIDAS */}
      <section id="especialidades" className="px-6 lg:px-12 py-24 max-w-7xl mx-auto w-full border-b border-slate-800 space-y-12">
        <div className="text-center space-y-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
            Servicios Clínicos Especializados
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Cobertura Integral de Todas las Áreas Odontológicas
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Desde la profilaxis preventiva hasta cirugías e implantes de alta complejidad, todo bajo el mismo techo y expediente digital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialties.map((spec) => {
            const Icon = spec.icon
            return (
              <div
                key={spec.title}
                className="bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6 space-y-4 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${spec.color}`}>
                      {spec.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {spec.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {spec.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Atención en sillón estéril</span>
                  <Link href="/dashboard" className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
                    Ver agenda <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 5. SECCIÓN: UBICACIÓN, SUCURSALES Y EXPANSIÓN (FRANQUICIAS) */}
      <section id="sucursales" className="px-6 lg:px-12 py-24 bg-slate-950/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
              Red de Atención &amp; Franquicias
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Nuestras Sedes Clínicas en la Ciudad de México
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              Ubicaciones estratégicas con sillones de alta tecnología y conmutación reactiva de expedientes.
            </p>
          </div>

          {/* Selector de Sucursales Interactivo */}
          <div className="flex justify-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveBranchTab('balbuena')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeBranchTab === 'balbuena'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              Balbuena (Matriz)
            </button>
            <button
              onClick={() => setActiveBranchTab('guadalupe')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeBranchTab === 'guadalupe'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              Guadalupe Chalma
            </button>
            <button
              onClick={() => setActiveBranchTab('roma')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeBranchTab === 'roma'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              Colonia Roma (Próximamente)
            </button>
          </div>

          {/* Ficha de la Sucursal Seleccionada */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-4xl mx-auto space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                  {branchesData[activeBranchTab].badge}
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {branchesData[activeBranchTab].name}
                </h3>
                <p className="text-xs font-semibold text-amber-400">
                  {branchesData[activeBranchTab].doctor}
                </p>
              </div>

              <a
                href={branchesData[activeBranchTab].mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors self-start sm:self-auto"
              >
                <MapPin className="w-4 h-4 text-amber-400" />
                Ver en Google Maps
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Dirección</span>
                    <span>{branchesData[activeBranchTab].address}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Teléfono de Citas</span>
                    <span className="font-bold text-white">{branchesData[activeBranchTab].phone}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Horario de Atención</span>
                    <span>{branchesData[activeBranchTab].hours}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Equipamiento de Sede</span>
                    <span>{branchesData[activeBranchTab].facilities}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MODELO DE FRANQUICIAS & EXPANSIÓN */}
          <div id="franquicias" className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-blue-500/10 border border-amber-500/30 rounded-3xl p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-widest">
                Modelo de Negocio
              </span>
              <h3 className="text-xl font-bold text-white">¿Te interesa abrir una franquicia DentalCloud?</h3>
              <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                Integra nuestro modelo clínico llave en mano: software SaaS multi-tenant con RLS en Supabase, manuales operativos, odontología digital y licenciamiento oficial bajo la marca de la Dra. Aura Estudillo.
              </p>
            </div>
            <Link
              href="/dashboard/configuracion"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shrink-0 shadow-lg transition-all active:scale-95"
            >
              Conocer Modelo de Franquicia
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* 6. SECCIÓN: PORTAL DE ACCESO TECNOLÓGICO (PWA & WEB APP) */}
      <section id="tecnologia" className="px-6 lg:px-12 py-24 max-w-7xl mx-auto w-full border-b border-slate-800 space-y-12">
        <div className="text-center space-y-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
            Experiencia Digital para Pacientes y Doctores
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Portal Clínico Cloud &amp; App Instalable (PWA)
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Tanto los pacientes como el personal médico cuentan con herramientas autónomas en tiempo real.
          </p>
        </div>

        {/* 4 Tarjetas de capacidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {techFeatures.map((tf) => {
            const Icon = tf.icon
            return (
              <div key={tf.title} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-3">
                <div className={`w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center ${tf.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">{tf.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{tf.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Portal de Acceso Seguro por Roles */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-4xl mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white">Inicio de Sesión Seguro por Roles</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Acceso diferenciado para Dirección General, Doctores Especialistas, Recepción y Pacientes mediante autenticación Supabase con encriptación TLS 1.3.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
            >
              Portal del Paciente
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
            >
              Recepción &amp; Caja
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              Dirección &amp; Especialistas (Dra. Aura)
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FOOTER INSTITUCIONAL */}
      <footer className="mt-auto px-6 lg:px-12 py-12 bg-[#080d19] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-sm">
                DC
              </div>
              <div>
                <p className="font-bold text-slate-200">DENTALCLOUD PRO</p>
                <p className="text-[11px] text-slate-500">Dirección General y Clínica de la Dra. Aura Estudillo • Céd. Prof. 8492019</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-slate-400">
              <a href="#filosofia" className="hover:text-amber-400 transition-colors">Nosotros</a>
              <a href="#especialidades" className="hover:text-amber-400 transition-colors">Especialidades</a>
              <a href="#sucursales" className="hover:text-amber-400 transition-colors">Sedes</a>
              <Link href="/dashboard" className="hover:text-amber-400 transition-colors">Dashboard</Link>
              <Link href="/dashboard/patients/AUD-4422/print" className="hover:text-amber-400 transition-colors">Papelería Oficial</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>
              &copy; 2026 DentalCloud Pro. Todos los derechos reservados. Registrado bajo normas sanitarias COFEPRIS y SSA.
            </p>
            <p className="text-slate-600">
              Desarrollado con Next.js App Router, Turbopack, Tailwind CSS y Supabase Relational RLS.
            </p>
          </div>
        </div>
      </footer>

      {/* Banner de Accesibilidad Senior (Modo 50+) */}
      <SeniorAccessibilityBanner />
    </div>
  )
}
