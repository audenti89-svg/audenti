'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Smile,
  Layers,
  Activity,
  Zap,
  ArrowUpRight,
  Star,
  Menu,
  X
} from 'lucide-react'
import { AudentiLogo } from '@/components/ui/AudentiLogo'
import { AuthModal } from '@/components/auth/AuthModal'

// ASSETS OFICIALES OBLIGATORIOS
const ASSETS = {
  after: 'https://media.kolpusites.com/dental_ad/1.webp',     // Clean cast
  before: 'https://media.kolpusites.com/dental_ad/2.webp',    // Stained cast
  interior: 'https://media.kolpusites.com/dental_ad/3.webp',  // Clinic interior
  portraits: [
    'https://media.kolpusites.com/dental_ad/4.webp',
    'https://media.kolpusites.com/dental_ad/5.webp',
    'https://media.kolpusites.com/dental_ad/6.webp',
    'https://media.kolpusites.com/dental_ad/7.webp',
  ],
}

export default function LandingPage() {
  // Modal de Login / Registro
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ESTADO DEL COMPARADOR BEFORE / AFTER CON requestAnimationFrame
  const [splitPercent, setSplitPercent] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [isOverText, setIsOverText] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number | null>(null)

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
    setMobileMenuOpen(false)
  }

  // Actualizar posición de la barra con rAF para 60fps sin stutter
  const updateSplit = useCallback((clientX: number) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const offsetX = clientX - rect.left
    const rawPct = (offsetX / rect.width) * 100
    const clamped = Math.max(5, Math.min(95, rawPct))

    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      setSplitPercent(clamped)
    })
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateSplit(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    updateSplit(e.clientX)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSplitPercent((prev) => Math.max(5, prev - 4))
    } else if (e.key === 'ArrowRight') {
      setSplitPercent((prev) => Math.min(95, prev + 4))
    }
  }

  // Carrusel de Especialistas
  const teamCarouselRef = useRef<HTMLDivElement>(null)
  const scrollTeam = (direction: 'left' | 'right') => {
    if (!teamCarouselRef.current) return
    const scrollAmount = 340
    teamCarouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  // Estado del Formulario de Reserva
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    service: 'Blanqueamiento Dental LED',
    preferredTime: 'Matutino (09:00 - 14:00)',
    notes: '',
  })
  const [bookingSent, setBookingSent] = useState(false)

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setBookingSent(true)
    setTimeout(() => {
      setBookingSent(false)
      setBookingForm({
        name: '',
        phone: '',
        email: '',
        service: 'Blanqueamiento Dental LED',
        preferredTime: 'Matutino (09:00 - 14:00)',
        notes: '',
      })
    }, 4500)
  }

  const specialists = [
    {
      name: 'Dra. Aura Estudillo',
      title: 'Directora Médica & Especialista en Estética Oral',
      reg: 'Céd. Prof. 8492019',
      image: ASSETS.portraits[0],
      focus: 'Diseño de Sonrisas, Carillas y Cirugía Reconstructiva',
      experience: '14+ años de excelencia clínica',
    },
    {
      name: 'Dr. Alejandro Ramírez',
      title: 'Cirujano Maxilofacial & Especialista en Implantes',
      reg: 'Céd. Prof. 9102834',
      image: ASSETS.portraits[1],
      focus: 'Implantología Oseointegrada & Regeneración Ósea',
      experience: '11+ años en quirófano dental',
    },
    {
      name: 'Dra. Sofía Gutiérrez',
      title: 'Ortodoncista & Especialista en Alineadores',
      reg: 'Céd. Prof. 7481920',
      image: ASSETS.portraits[2],
      focus: 'Alineación Invisible, Autoligado Pasivo & ATM',
      experience: '9+ años perfeccionando oclusiones',
    },
    {
      name: 'Dr. Mateo Morales',
      title: 'Endodoncista Clínico & Microscopía',
      reg: 'Céd. Prof. 8392011',
      image: ASSETS.portraits[3],
      focus: 'Instrumentación Mecanizada & Salvamento Dental',
      experience: '8+ años en microcirugía endodóntica',
    },
  ]

  const treatments = [
    {
      title: 'Diseño de Sonrisa Digital (DSD)',
      category: 'Estética de Alta Gama',
      desc: 'Simulación tridimensional y carillas ultrafinas de disilicato de litio E.Max para una armonía facial milimétrica.',
      icon: Smile,
      duration: '2 - 3 citas',
      guarantee: 'Certificación de laboratorio ProArt',
    },
    {
      title: 'Alineación Invisible & Ortodoncia',
      category: 'Ortodoncia Preventiva y Correctiva',
      desc: 'Planes computarizados con alineadores invisibles de memoria elástica y microtornillos para corrección sin brackets.',
      icon: Zap,
      duration: '6 - 14 meses',
      guarantee: 'Escaneo intraoral 3D incluido',
    },
    {
      title: 'Implantología Guiada por Computadora',
      category: 'Cirugía & Rehabilitación',
      desc: 'Fijaciones de titanio grado quirúrgico con coronas de zirconio monolítico y regeneración tisular con PRF.',
      icon: Activity,
      duration: 'Plan quirúrgico guiado',
      guarantee: 'Garantía biológica de oseointegración',
    },
    {
      title: 'Endodoncia Mecanizada Biocerámica',
      category: 'Conservación & Salud Pulpar',
      desc: 'Terapia de conductos con limas rotatorias de níquel-titanio, sellado biocerámico biocompatible y microscopía.',
      icon: Stethoscope,
      duration: 'Sesión única (90% de casos)',
      guarantee: 'Cero dolor transoperatorio',
    },
    {
      title: 'Profilaxis Profunda & Terapia Periodontal',
      category: 'Prevención e Higiene',
      desc: 'Detartraje ultrasónico piezoeléctrico no invasivo, pulido de esmalte y remoción de biofilm bacteriano.',
      icon: ShieldCheck,
      duration: '45 minutos',
      guarantee: 'Salud gingival recuperada',
    },
    {
      title: 'Rehabilitación Integral & Zirconio CAD/CAM',
      category: 'Prótesis & Oclusión',
      desc: 'Incrustaciones estéticas Onlay/Overlay y puentes cerámicos fresados por robótica dental de máxima resistencia.',
      icon: Layers,
      duration: '2 citas',
      guarantee: 'Ajuste marginal de 20 micras',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-slate-900 font-sans antialiased overflow-x-hidden selection:bg-amber-400 selection:text-slate-950">
      
      {/* ======================================================== */}
      {/* 1. NAVBAR MINIMALISTA FLOTANTE */}
      {/* ======================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F6F6F6]/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 lg:px-12 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <AudentiLogo size={38} doctorName="Dra. Aura Estudillo" />
          </Link>

          {/* Menú Desktop */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <a href="#hero" className="hover:text-slate-900 transition-colors">Estudio</a>
            <a href="#about" className="hover:text-slate-900 transition-colors">Nosotros</a>
            <a href="#tratamientos" className="hover:text-slate-900 transition-colors">Tratamientos</a>
            <a href="#equipo" className="hover:text-slate-900 transition-colors">Especialistas</a>
            <a href="#contacto" className="hover:text-slate-900 transition-colors">Ubicación</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openAuth('login')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 hover:border-slate-900 bg-white text-xs font-bold text-slate-800 transition-all shadow-2xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Acceso Clínico
            </button>
            <a
              href="#reservar"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-all shadow-xs"
            >
              Agendar Cita
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </a>
            {/* Botón Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Drawer móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-3 border-t border-slate-200 mt-3 space-y-2 text-center text-xs font-bold uppercase tracking-wider text-slate-700 animate-in fade-in duration-150">
            <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="block py-2">Estudio</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2">Nosotros</a>
            <a href="#tratamientos" onClick={() => setMobileMenuOpen(false)} className="block py-2">Tratamientos</a>
            <a href="#equipo" onClick={() => setMobileMenuOpen(false)} className="block py-2">Especialistas</a>
            <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="block py-2">Ubicación</a>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. HERO INTERACTIVO BEFORE / AFTER (100svh) */}
      {/* Inspirado en Lumen Dental Studio con rAF + Slider de Precisión */}
      {/* ======================================================== */}
      <section
        id="hero"
        ref={heroRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative w-full h-[100svh] min-h-[640px] select-none touch-none outline-none overflow-hidden bg-slate-950 cursor-ew-resize pt-16"
        aria-label="Comparador interactivo de moldes dentales antes y después"
      >
        {/* CAPA 1: AFTER (Clean cast - 1.webp) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <img
            src={ASSETS.after}
            alt="Molde dental después del tratamiento de estética dental de alta precisión"
            className="w-full h-full object-cover object-center pointer-events-none"
            draggable={false}
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-slate-950/30 pointer-events-none" />
        </div>

        {/* CAPA 2: BEFORE (Stained cast - 2.webp) recortada con splitPercent */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${splitPercent}%` }}
        >
          <div
            className="relative h-full"
            style={{ width: heroRef.current ? `${heroRef.current.clientWidth}px` : '100vw' }}
          >
            <img
              src={ASSETS.before}
              alt="Molde dental antes del tratamiento clínico"
              className="w-full h-full object-cover object-center pointer-events-none"
              draggable={false}
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-transparent to-slate-950/40 pointer-events-none" />
          </div>
        </div>

        {/* LÍNEA DIVISORIA DRAGGABLE */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none flex items-center justify-center -translate-x-1/2"
          style={{ left: `${splitPercent}%` }}
        >
          {/* Línea vertical */}
          <div className="w-[2px] h-full bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />

          {/* Manija táctil central */}
          <div className="absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 text-slate-900 border-2 border-slate-900/10 shadow-2xl flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing backdrop-blur-md transition-transform active:scale-110">
            <div className="flex items-center gap-0.5 text-xs font-bold">
              <ChevronLeft className="w-3.5 h-3.5" />
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* ETIQUETAS FLOTANTES BEFORE / AFTER */}
        <div className="absolute top-24 left-6 z-20 pointer-events-none">
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-slate-900/70 text-slate-300 backdrop-blur-md border border-white/10">
            Fase 01 • Estado Inicial
          </span>
        </div>
        <div className="absolute top-24 right-6 z-20 pointer-events-none text-right">
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-400/90 text-slate-950 backdrop-blur-md border border-amber-300 font-bold">
            Fase 02 • Escaneo &amp; Perfeccionamiento
          </span>
        </div>

        {/* PÍLDORAS FLOTANTES DE ESTADÍSTICAS */}
        <div
          className={`absolute bottom-32 sm:bottom-28 left-6 sm:left-12 z-20 space-y-2 pointer-events-auto transition-opacity duration-300 ${
            isOverText ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setIsOverText(true)}
          onMouseLeave={() => setIsOverText(false)}
        >
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/15 text-white max-w-xs shadow-2xl">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-hanken">07 tonos</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">más blancos</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Tecnología de fotoactivación dental LED que preserva íntegramente la microestructura del esmalte.
            </p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/15 text-white max-w-xs shadow-2xl">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-hanken">4,200+</span>
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">sonrisas</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Casos rehabilitados exitosamente en la sede matriz Balbuena y franquicias de la Dra. Aura Estudillo.
            </p>
          </div>
        </div>

        {/* HERO TITLE & CALL TO ACTION */}
        <div
          className={`absolute bottom-8 right-6 sm:right-12 z-20 text-right pointer-events-auto max-w-xl transition-opacity duration-300 ${
            isOverText ? 'opacity-30' : 'opacity-100'
          }`}
          onMouseEnter={() => setIsOverText(true)}
          onMouseLeave={() => setIsOverText(false)}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Lumen Clinical Aesthetics • Audenti Pro
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] font-hanken">
            La arquitectura de tu mejor sonrisa.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2.5 max-w-md ml-auto leading-relaxed">
            Odontología de alta precisión, biocompatibilidad suiza y escaneo 3D bajo la dirección médica de la Dra. Aura Estudillo (Céd. Prof. 8492019).
          </p>

          <div className="flex items-center justify-end gap-3 mt-4">
            <a
              href="#reservar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Reservar Valoración
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#about"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all"
            >
              Conocer Estudio
            </a>
          </div>
        </div>

        {/* Hint de Interacción */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-950/60 backdrop-blur-xs px-3 py-1 rounded-full border border-white/10">
            ← Arrastra la barra para comparar resultados →
          </span>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. MARQUEE EDITORIAL CONTINUO EN BUCLE */}
      {/* ======================================================== */}
      <div className="w-full bg-slate-900 text-white border-y border-slate-800 py-3.5 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-xs font-bold uppercase tracking-widest flex items-center gap-8">
          <span className="flex items-center gap-2 text-amber-400">★ AUDENTI CLINICAL STUDIO</span>
          <span>• ESCANEO INTRAORAL 3D</span>
          <span>• CIRUGÍA GUIADA POR COMPUTADORA</span>
          <span>• BIOCOMPATIBILIDAD GRADO QUIRÚRGICO</span>
          <span className="flex items-center gap-2 text-amber-400">★ DRA. AURA ESTUDILLO (CÉD. 8492019)</span>
          <span>• REHABILITACIÓN ORAL ZIRCONIO</span>
          <span>• ORTODONCIA INVISIBLE</span>
          <span>• SEDE MATRIZ JARDÍN BALBUENA CDMX</span>
          <span className="flex items-center gap-2 text-amber-400">★ AUDENTI CLINICAL STUDIO</span>
          <span>• ESCANEO INTRAORAL 3D</span>
          <span>• CIRUGÍA GUIADA POR COMPUTADORA</span>
          <span>• BIOCOMPATIBILIDAD GRADO QUIRÚRGICO</span>
          <span className="flex items-center gap-2 text-amber-400">★ DRA. AURA ESTUDILLO (CÉD. 8492019)</span>
          <span>• REHABILITACIÓN ORAL ZIRCONIO</span>
          <span>• ORTODONCIA INVISIBLE</span>
          <span>• SEDE MATRIZ JARDÍN BALBUENA CDMX</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SECCIÓN ABOUT: MISIÓN & INSTALACIONES CLÍNICAS */}
      {/* ======================================================== */}
      <section id="about" className="py-20 lg:py-28 px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5 text-amber-700" />
              Filosofía Clínica &amp; Excelencia
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] font-hanken">
              Donde la ciencia biomédica se encuentra con el arte dental.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              En Audenti Studio, bajo el liderazgo de la <strong>Dra. Aura Estudillo</strong>, concebimos cada tratamiento como una obra personalizada. No creemos en soluciones estándar: combinamos tomografía Cone Beam de haz cónico, planificación virtual 3D y materiales cerámicos alemanes para devolver función masticatoria y armonía estética con mínima invasión.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                <span className="text-2xl font-black text-slate-900 font-hanken">100%</span>
                <p className="text-xs font-bold text-slate-700">Esterilización Hospitalaria</p>
                <p className="text-[11px] text-slate-500">Autoclaves clase B y trazabilidad de instrumental médico.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                <span className="text-2xl font-black text-slate-900 font-hanken">20 µm</span>
                <p className="text-xs font-bold text-slate-700">Ajuste de Precisión</p>
                <p className="text-[11px] text-slate-500">Margen microscópico que evita filtraciones bacterianas.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="#reservar"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
              >
                Conocer Instalaciones
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </a>
              <span className="text-xs text-slate-500 font-semibold">• Sede Balbuena &amp; Franquicias</span>
            </div>
          </div>

          {/* Imagen de la Clínica (Interior 3.webp) */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 shadow-2xl bg-slate-900 aspect-4/3">
              <img
                src={ASSETS.interior}
                alt="Instalaciones del consultorio y gabinete dental de la Dra. Aura Estudillo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white p-4 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Gabinete Clínico Sede Matriz</p>
                <p className="text-xs text-slate-300 mt-0.5">Sillones Sirona ergonométricos con cámara intraoral y radiovisiografía digital inmediata.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. SECCIÓN TRATAMIENTOS: CUADRÍCULA EDITORIAL LIMPIA */}
      {/* ======================================================== */}
      <section id="tratamientos" className="py-20 bg-white border-y border-slate-200/80 px-4 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Catálogo de Especialidades Odontológicas
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mt-3 font-hanken">
                Precisión que transforma vidas.
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Tratamientos avalados por la Asociación Dental Mexicana (ADM) y diseñados bajo normas oficiales NOM-013-SSA2 para una salud bucodental de clase mundial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {treatments.map((t, idx) => {
              const Icon = t.icon
              return (
                <div
                  key={idx}
                  className="bg-[#F6F6F6] hover:bg-white p-6 rounded-3xl border border-slate-200/80 hover:border-amber-400/80 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-amber-400 text-slate-900 flex items-center justify-center border border-slate-200 group-hover:border-amber-400 transition-colors shadow-2xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      {t.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Tiempo estimado:</span>
                      <strong className="text-slate-800">{t.duration}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Garantía clínica:</span>
                      <strong className="text-slate-800">{t.guarantee}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. MEET THE TEAM: CARRUSEL DE ESPECIALISTAS */}
      {/* ======================================================== */}
      <section id="equipo" className="py-20 lg:py-28 px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cuerpo Médico Acreditado
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1 font-hanken">
              Especialistas con vocación de arte.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTeam('left')}
              className="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTeam('right')}
              className="p-3 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carrusel con desplazamiento horizontal suave */}
        <div
          ref={teamCarouselRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth"
        >
          {specialists.map((doc, idx) => (
            <div
              key={idx}
              className="shrink-0 w-[280px] sm:w-[320px] bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl transition-all snap-start flex flex-col justify-between"
            >
              <div className="relative aspect-3/4 overflow-hidden bg-slate-100">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-amber-300 text-[10px] font-bold border border-white/10 font-mono">
                  {doc.reg}
                </div>
              </div>

              <div className="p-5 space-y-2">
                <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                <p className="text-xs font-semibold text-amber-700">{doc.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{doc.focus}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{doc.experience}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. BOOK ONLINE & MAPA CONCEPTUAL ESTILIZADO */}
      {/* ======================================================== */}
      <section id="reservar" className="py-20 bg-slate-900 text-white px-4 sm:px-8 lg:px-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Formulario de Reserva */}
          <div className="lg:col-span-6 bg-slate-950/70 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Agenda de Consulta Presencial
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 font-hanken">
                Agenda tu diagnóstico de alta precisión.
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Recibirás confirmación directa por WhatsApp y correo electrónico con las indicaciones previas para tu consulta.
              </p>
            </div>

            {bookingSent ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in zoom-in-95">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">¡Solicitud recibida con éxito!</h3>
                <p className="text-xs text-slate-300">
                  Nuestro equipo de recepción en Balbuena se pondrá en contacto contigo para confirmar el horario exacto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Carolina Martínez Soto"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Teléfono Móvil (WhatsApp) *
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="+52 55..."
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="paciente@correo.com"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Tratamiento de Interés
                    </label>
                    <select
                      value={bookingForm.service}
                      onChange={(e) => setBookingForm({ ...bookingForm, service: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="Diseño de Sonrisa Digital">Diseño de Sonrisa Digital</option>
                      <option value="Blanqueamiento Dental LED">Blanqueamiento Dental LED</option>
                      <option value="Alineadores Invisibles">Alineadores Invisibles</option>
                      <option value="Implante Dental">Implante Dental de Titanio</option>
                      <option value="Profilaxis & Limpieza">Profilaxis &amp; Limpieza Ultrasónica</option>
                      <option value="Valoración General">Valoración Diagnóstica Integral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Horario Preferente
                    </label>
                    <select
                      value={bookingForm.preferredTime}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferredTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="Matutino (09:00 - 14:00)">Matutino (09:00 - 14:00)</option>
                      <option value="Vespertino (14:00 - 19:30)">Vespertino (14:00 - 19:30)</option>
                      <option value="Sábado (09:00 - 15:00)">Sábado (09:00 - 15:00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Observaciones o Motivo de Consulta
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe si tienes alguna molestia, dolor o tratamiento previo..."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  Confirmar Solicitud de Cita
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Mapa Conceptual Estilizado en CSS Puro & Sedes */}
          <div id="contacto" className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Red Clínica &amp; Cobertura
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 font-hanken">
                Ubicaciones Estratégicas CDMX
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Instalaciones certificadas con fácil acceso, estacionamiento y tecnología interconectada por Audenti Cloud.
              </p>
            </div>

            {/* Mapa visual conceptual estilizado */}
            <div className="relative rounded-3xl bg-slate-950 border border-slate-800 p-6 h-64 overflow-hidden flex flex-col justify-between shadow-2xl">
              {/* Grilla de radar / mapa */}
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

              {/* Punto Balbuena (Matriz) */}
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-white">Sede Matriz — Jardín Balbuena</h4>
                  <p className="text-[11px] text-slate-400">Av. del Taller &amp; Retorno 12, Venustiano Carranza</p>
                </div>
              </div>

              {/* Punto Guadalupe Chalma */}
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-blue-400 ring-4 ring-blue-400/20" />
                <div>
                  <h4 className="text-xs font-bold text-white">Sede Norte — Guadalupe Chalma</h4>
                  <p className="text-[11px] text-slate-400">Av. Morelos 144, Gustavo A. Madero</p>
                </div>
              </div>

              {/* Punto Roma */}
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                <div>
                  <h4 className="text-xs font-bold text-white">Sede Poniente — Colonia Roma Norte</h4>
                  <p className="text-[11px] text-slate-400">Álvaro Obregón 180, Cuauhtémoc (Próxima Apertura)</p>
                </div>
              </div>

              <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Teléfono directo: <strong>+52 55 5764 8810</strong></span>
                <span className="text-amber-400 font-bold">Lunes a Sábado</span>
              </div>
            </div>

            {/* Portal Institucional Banner */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">¿Eres odontólogo o personal de Audenti?</p>
                <p className="text-[11px] text-slate-400">Accede a la plataforma para expedientes, odontograma e IA.</p>
              </div>
              <button
                onClick={() => openAuth('login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                Ingresar al Sistema
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. FOOTER MONUMENTAL CON WORDMARK EDITORIAL */}
      {/* ======================================================== */}
      <footer className="bg-slate-950 text-slate-400 px-4 sm:px-8 lg:px-12 pt-16 pb-12 border-t border-slate-800 space-y-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          <div className="md:col-span-5 space-y-4">
            <AudentiLogo size={42} doctorName="Dra. Aura Estudillo" />
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Plataforma odontológica integral y estudio de estética dental de alta precisión. Innovación biomédica, bioseguridad quirúrgica y calidez humana.
            </p>
            <p className="text-xs text-slate-500 font-mono">
              Dirección Médica Oficial • Cédula Profesional 8492019
            </p>
          </div>

          <div className="md:col-span-2 space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Tratamientos</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#tratamientos" className="hover:text-white transition-colors">Diseño de Sonrisa</a></li>
              <li><a href="#tratamientos" className="hover:text-white transition-colors">Alineadores 3D</a></li>
              <li><a href="#tratamientos" className="hover:text-white transition-colors">Implantes Titanio</a></li>
              <li><a href="#tratamientos" className="hover:text-white transition-colors">Profilaxis LED</a></li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-2 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Estudio</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#about" className="hover:text-white transition-colors">Filosofía</a></li>
              <li><a href="#equipo" className="hover:text-white transition-colors">Especialistas</a></li>
              <li><a href="#contacto" className="hover:text-white transition-colors">Sedes CDMX</a></li>
              <li><a href="#reservar" className="hover:text-white transition-colors">Citas Online</a></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Atención &amp; Contacto</h4>
            <p className="text-slate-400">Sede Matriz Balbuena: Av. del Taller &amp; Retorno 12, CDMX</p>
            <p className="text-amber-400 font-bold">Tel: +52 55 5764 8810</p>
            <button
              onClick={() => openAuth('login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs hover:bg-slate-800 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Portal de Especialistas
            </button>
          </div>
        </div>

        {/* Monumental Wordmark adaptado */}
        <div className="max-w-7xl mx-auto border-t border-slate-800/80 pt-10 text-center">
          <span className="font-hanken font-black text-5xl sm:text-7xl lg:text-9xl text-slate-800/50 tracking-tighter uppercase select-none block leading-none">
            AUDENTI
          </span>
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 mt-6 gap-3">
            <p>© 2026 Audenti — DentalCloud Pro. Dra. Aura Estudillo. Todos los derechos reservados.</p>
            <p>Diseño Editorial &amp; Arquitectura Clínica</p>
          </div>
        </div>
      </footer>

      {/* Modal Flotante de Acceso Clínico */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  )
}
