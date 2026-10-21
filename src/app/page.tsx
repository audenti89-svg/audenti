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
  X,
  Coffee,
  Wine
} from 'lucide-react'
import { AudentiLogo } from '@/components/ui/AudentiLogo'
import { AuthModal } from '@/components/auth/AuthModal'
import { QRCodeSVG } from 'qrcode.react'
import { SmileAuditTool } from '@/components/landing/SmileAuditTool'
import { SeniorAccessibilityBanner } from '@/components/ui/SeniorAccessibilityBanner'
import { UnifiedCommunicationWidget } from '@/components/chat/UnifiedCommunicationWidget'

// ASSETS OFICIALES OBLIGATORIOS
const ASSETS = {
  after: 'https://media.kolpusites.com/dental_ad/1.webp',     // Clean cast
  before: 'https://media.kolpusites.com/dental_ad/2.webp',    // Stained cast
  interior: 'https://media.kolpusites.com/dental_ad/3.webp',  // Clinic interior
  floatingFood: '/images/floating-food-veo.png',              // Comida flotante Veo 3 (cazuela de guisado, plato gourmet, café y vino)
  draAuraQuirifano: '/images/dra-aura-estudillo.jpg',         // Cirujana en quirófano con luz azul, cofia, filipina y gafas
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

  // ESTADO DEL COMPARADOR BEFORE / AFTER CON HOVER TRACKING AUTOMÁTICO
  // Cuando el cursor está a la izquierda (0%), la máscara de dientes sucios es 0% (se ven 100% blancos).
  // A medida que se mueve hacia la derecha, se revela progresivamente la capa de dientes sucios.
  const [splitPercent, setSplitPercent] = useState(0)
  const [isOverText, setIsOverText] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafId = useRef<number | null>(null)

  // Referencias para manejo táctil no invasivo (Liberar scroll vertical en móviles)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const isHorizontalGesture = useRef<boolean | null>(null)

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
    setMobileMenuOpen(false)
  }

  // Actualizar posición del revelado automáticamente con el cursor / touch mediante rAF
  const updateSplit = useCallback((clientX: number) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const offsetX = clientX - rect.left
    const rawPct = (offsetX / rect.width) * 100
    // Totalmente a la izquierda = 0% sucio (100% blanco)
    // Hacia la derecha = se expande la capa de dientes sucios (hasta 100%)
    const clamped = Math.max(0, Math.min(100, rawPct))

    if (rafId.current) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      setSplitPercent(clamped)
    })
  }, [])

  const handlePointerMove = (e: React.PointerEvent) => {
    // Si es evento de puntero tipo mouse/pen o arrastre libre
    if (e.pointerType !== 'touch') {
      updateSplit(e.clientX)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') {
      updateSplit(e.clientX)
    }
  }

  // GESTOS TÁCTILES MÓVILES OPTIMIZADOS (LIBERA SCROLL VERTICAL)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    isHorizontalGesture.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch || !touchStartPos.current) return

    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y)

    // Si aún no hemos determinado la intención del gesto
    if (isHorizontalGesture.current === null) {
      if (deltaX > 8 && deltaX > deltaY) {
        // Gesto horizontal claro del comparador
        isHorizontalGesture.current = true
      } else if (deltaY > 8) {
        // Gesto vertical para scrollear la página hacia abajo
        isHorizontalGesture.current = false
      }
    }

    // Solo actualizamos el slider si es un gesto deliberadamente horizontal
    if (isHorizontalGesture.current === true) {
      updateSplit(touch.clientX)
    }
  }

  const handleTouchEnd = () => {
    touchStartPos.current = null
    isHorizontalGesture.current = null
  }

  // CANVAS DE PARTÍCULAS INTERACTIVAS (COMIDA QUE SE CONSUME -> FORMACIÓN DINÁMICA DE PLACA EN DIENTES)
  useEffect(() => {
    const canvas = particleCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Fuentes de emisión de partículas (posiciones relativas armonizadas de los alimentos flotantes)
    // Cazuela (extremo izq), Café espresso (inferior izq despejado), Plato gourmet (superior der), Vino (inferior der)
    const foodSources = [
      { xPct: 0.10, yPct: 0.28, color: '#9a3412', name: 'Guisado' }, // pimentón / salsa oscura
      { xPct: 0.88, yPct: 0.22, color: '#7c2d12', name: 'Gourmet' }, // reducción de carne
      { xPct: 0.14, yPct: 0.78, color: '#b45309', name: 'Espresso' }, // taza de café desplazada a la izquierda
      { xPct: 0.88, yPct: 0.75, color: '#881337', name: 'Vino' }, // taninos de vino tinto
    ]

    const PARTICLE_COUNT = 55
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, idx) => {
      const src = foodSources[idx % foodSources.length]
      return {
        srcIdx: idx % foodSources.length,
        x: src.xPct * width + (Math.random() - 0.5) * 60,
        y: src.yPct * height + (Math.random() - 0.5) * 60,
        targetX: width * 0.5 + (Math.random() - 0.5) * 180, // centro de los dientes
        targetY: height * 0.52 + (Math.random() - 0.5) * 140,
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.008,
        size: Math.random() * 2.8 + 1.2,
        color: src.color,
        seed: Math.random() * 100,
      }
    })

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // splitPercent (0 a 100):
      // 0 = Dientes 100% limpios (comida intacta, sin partículas)
      // 100 = Dientes completamente sucios (comida consumida, flujo máximo de placa hacia dientes)
      const stainFactor = splitPercent / 100 // 0 a 1
      const currentSplitX = (splitPercent / 100) * width

      // Solo si el usuario desliza hacia la derecha (consumiendo comida) las partículas viajan
      if (stainFactor > 0.05) {
        particles.forEach((p) => {
          p.seed += 0.03
          p.progress += p.speed * (0.6 + stainFactor * 1.2)
          if (p.progress > 1) {
            p.progress = 0
            const src = foodSources[p.srcIdx]
            p.x = src.xPct * width + (Math.random() - 0.5) * 40
            p.y = src.yPct * height + (Math.random() - 0.5) * 40
          }

          const src = foodSources[p.srcIdx]
          const startX = src.xPct * width
          const startY = src.yPct * height
          // Curva suave hacia los dientes centrales
          const currentX = startX + (p.targetX - startX) * p.progress + Math.sin(p.seed) * 15
          const currentY = startY + (p.targetY - startY) * p.progress + Math.cos(p.seed) * 15

          // Verificar si cruza la frontera de los dientes BEFORE o AFTER
          const isInBeforeSide = currentX <= currentSplitX

          ctx.save()
          if (isInBeforeSide) {
            // Se adhiere y tiñe el esmalte en la zona BEFORE
            const opacity = Math.min(1, stainFactor * 1.2) * (0.4 + Math.sin(p.progress * Math.PI) * 0.6)
            ctx.globalAlpha = opacity
            ctx.fillStyle = p.color
            ctx.shadowBlur = 6
            ctx.shadowColor = p.color
            ctx.beginPath()
            ctx.arc(currentX, currentY, p.size, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // Escudo de repelencia y desinfección en la zona AFTER (dientes limpios)
            ctx.globalAlpha = 0.15 * (1 - p.progress)
            ctx.fillStyle = '#38bdf8'
            ctx.shadowBlur = 8
            ctx.shadowColor = '#38bdf8'
            ctx.beginPath()
            ctx.arc(currentX, currentY, p.size * 0.6, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.restore()
        })
      }

      animFrame = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', handleResize)
    }
  }, [splitPercent])

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

  // EQUIPO CLÍNICO OFICIAL - ASIGNACIÓN FIJA DE DATOS E IMÁGENES
  const specialists = [
    {
      name: 'Dra. Aura Estudillo',
      title: 'Directora Médica & Especialista en Estética Oral',
      reg: 'Céd. Prof. 8492019',
      image: ASSETS.draAuraQuirifano, // Cirujana en quirófano con luz azul, cofia, filipina y gafas
      hoverImage: ASSETS.portraits[0], // Retrato sonriente de alta resolución
      focus: 'Diseño de Sonrisas, Carillas Cerámicas y Cirugía Reconstructiva',
      experience: '14+ años de excelencia clínica',
    },
    {
      name: 'Dr. Alejandro Ramírez',
      title: 'Cirujano Maxilofacial & Especialista en Implantes',
      reg: 'Céd. Prof. 9102834',
      image: ASSETS.portraits[1], // Retrato formal masculino con bata blanca
      hoverImage: ASSETS.portraits[3], // Retrato alterno con sonrisa clínica
      focus: 'Implantología Oseointegrada & Regeneración Tisular Guiada',
      experience: '11+ años en quirófano dental',
    },
    {
      name: 'Dra. Sofía Gutiérrez',
      title: 'Ortodoncista & Especialista en Alineadores',
      reg: 'Céd. Prof. 7481920',
      image: ASSETS.portraits[2], // Retrato formal de especialista femenina con bata blanca
      hoverImage: ASSETS.portraits[0], // Retrato alterno con sonrisa clínica
      focus: 'Alineación Invisible, Autoligado Pasivo & Armonización Facial',
      experience: '9+ años perfeccionando oclusiones',
    },
    {
      name: 'Dr. Mateo Morales',
      title: 'Endodoncista Clínico & Microscopía',
      reg: 'Céd. Prof. 8392011',
      image: ASSETS.portraits[3], // Retrato formal de especialista masculino con bata blanca
      hoverImage: ASSETS.portraits[1], // Retrato alterno con sonrisa clínica
      focus: 'Instrumentación Mecanizada, Sellado Biocerámico & Microcirugía',
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
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-amber-400 selection:text-slate-950">
      
      {/* ======================================================== */}
      {/* 1. NAVBAR MINIMALISTA FLOTANTE */}
      {/* ======================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-8 lg:px-12 py-2.5 sm:py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Link href="/" className="hover:opacity-90 transition-opacity shrink-0">
            <AudentiLogo size={32} doctorName="Dra. Aura Estudillo" />
          </Link>

          {/* Menú Desktop */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#hero" className="hover:text-amber-400 transition-colors">Estudio</a>
            <a href="#about" className="hover:text-amber-400 transition-colors">Nosotros</a>
            <a href="#tratamientos" className="hover:text-amber-400 transition-colors">Tratamientos</a>
            <a href="#equipo" className="hover:text-amber-400 transition-colors">Especialistas</a>
            <a href="#contacto" className="hover:text-amber-400 transition-colors">Ubicación</a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Acceso Clínico (Visible en sm y superiores) */}
            <button
              onClick={() => openAuth('login')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-700 hover:border-amber-400 bg-slate-900 text-xs font-bold text-slate-200 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Acceso Clínico</span>
            </button>

            {/* Botón Principal Agendar Cita */}
            <a
              href="#reservar"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-xs font-bold text-slate-950 transition-all shadow-xs whitespace-nowrap font-hanken"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-950" />
              <span>Agendar</span>
            </a>

            {/* Botón Menú Móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
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
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => openAuth('login')}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Acceso Clínico Especialistas
              </button>
            </div>
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative w-full min-h-[110svh] select-none touch-pan-y outline-none overflow-hidden bg-slate-950 cursor-crosshair pt-28 pb-32 md:pb-48 md:pt-24 flex flex-col justify-center md:block"
        aria-label="Comparador interactivo de moldes dentales con seguimiento de cursor y táctil"
      >
        {/* ======================================================== */}
        {/* FONDO DESKTOP & MÓVIL: COMIDA FLOTANTE VEO 3 CON CONSUMO DINÁMICO */}
        {/* ======================================================== */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 overflow-hidden transition-all duration-300 ease-out"
          style={{
            opacity: Math.max(0.04, 0.65 - (splitPercent / 100) * 0.58),
            filter: `blur(${(splitPercent / 100) * 2}px)`,
            transform: `scale(${1 - (splitPercent / 100) * 0.05})`,
          }}
        >
          {/* Imagen cinematográfica Veo 3 de alimentos gourmet flotantes */}
          <img
            src={ASSETS.floatingFood}
            alt="Alimentos pigmentantes flotantes: cazuela de guisado, plato gourmet, café y vino tinto"
            className="w-full h-full object-cover md:object-cover object-center mix-blend-screen select-none"
            draggable={false}
          />

          {/* Insignias sutiles contextuales de pigmentos (visibles en desktop y tablet) */}
          <div className="hidden sm:flex absolute top-28 left-[6%] sm:left-[10%] items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-amber-500/30 text-amber-200 text-[10px] font-mono tracking-widest uppercase shadow-xl select-none">
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Taninos &amp; Café</span>
          </div>

          <div className="hidden sm:flex absolute top-36 right-[6%] sm:right-[12%] items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-rose-500/30 text-rose-200 text-[10px] font-mono tracking-widest uppercase shadow-xl select-none">
            <Wine className="w-3.5 h-3.5 text-rose-400" />
            <span>Cromógenos &amp; Vino</span>
          </div>
        </div>

        {/* Indicador Único y Limpio del consumo alimenticio dinámico (Solo Desktop para no encimar en móvil) */}
        {splitPercent > 5 && (
          <div className="hidden md:block absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-300">
            <span className="px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-950/90 text-amber-300 backdrop-blur-md border border-amber-500/40 shadow-lg whitespace-nowrap">
              🍽️ PLACA &amp; PIGMENTACIÓN — NIVEL ACTIVO {Math.round(splitPercent)}%
            </span>
          </div>
        )}

        {/* CANVAS DE PARTÍCULAS DINÁMICAS (Flujo hacia BEFORE / Repelencia en AFTER) */}
        <canvas
          ref={particleCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* ======================================================== */}
        {/* CAPA DE FONDOS DENTALES EN DESKTOP (Full-Screen) */}
        {/* ======================================================== */}
        <div className="hidden md:block absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          {/* AFTER (Clean cast - 1.webp) */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={ASSETS.after}
              alt="Molde dental después del tratamiento de estética dental de alta precisión"
              className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto h-auto max-h-[62vh] max-w-[85vw] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-none transition-transform duration-700 z-20"
              draggable={false}
            />
          </div>

          {/* BEFORE (Stained cast - 2.webp - Recortado nítido con clip-path exacto) */}
          <div
            className="absolute inset-0 w-full h-full overflow-hidden z-20 transition-[clip-path] duration-75 ease-out"
            style={{ clipPath: `inset(0 calc(100% - ${splitPercent}%) 0 0)` }}
          >
            <img
              src={ASSETS.before}
              alt="Molde dental antes del tratamiento clínico"
              className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto h-auto max-h-[62vh] max-w-[85vw] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-none transition-transform duration-700"
              draggable={false}
            />
          </div>

          {/* LÍNEA DIVISORIA Y MANIJA INTERACTIVA (DESKTOP) */}
          {splitPercent > 0 && splitPercent < 100 && (
            <div
              className="absolute inset-y-0 z-30 pointer-events-none transition-[left] duration-75 ease-out"
              style={{ left: `${splitPercent}%` }}
            >
              {/* Línea luminosa */}
              <div className="w-[2px] h-full -ml-[1px] bg-gradient-to-b from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              {/* Botón interactivo central con flechas */}
              <div className="absolute top-[46%] -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-950/95 border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center justify-center text-amber-400 backdrop-blur-md">
                <ChevronLeft className="w-3.5 h-3.5 -mr-1.5" />
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Viñeta de degradado suave full-width (NO se corta por el slider) */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70 pointer-events-none z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80 pointer-events-none z-10" />
        </div>
        {/* ETIQUETAS FLOTANTES BEFORE / AFTER (Desktop) */}
        <div className="hidden md:block absolute top-24 left-6 z-20 pointer-events-none">
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-slate-900/70 text-slate-300 backdrop-blur-md border border-white/10">
            Fase 01 • Estado Inicial
          </span>
        </div>
        <div className="hidden md:block absolute top-24 right-6 z-20 pointer-events-none text-right">
          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-400/90 text-slate-950 backdrop-blur-md border border-amber-300 font-bold">
            Fase 02 • Escaneo &amp; Perfeccionamiento
          </span>
        </div>

        {/* ======================================================== */}
        {/* ESTRUCTURA MÓVIL SECUENCIAL Y FLUIDA (block md:hidden) */}
        {/* ======================================================== */}
        <div className="md:hidden relative z-20 px-4 flex flex-col gap-4 w-full max-w-lg mx-auto">
          {/* 1° Titular y Descripción */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Lumen Clinical Aesthetics • Audenti Pro
            </div>
            
            {/* Indicador móvil limpio */}
            {splitPercent > 5 && (
              <div className="pt-1">
                <span className="inline-block px-3 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-950/90 text-amber-300 border border-amber-500/40">
                  🍽️ Placa activa: {Math.round(splitPercent)}%
                </span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight font-hanken">
              La arquitectura de tu mejor sonrisa.
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              Odontología de alta precisión, biocompatibilidad suiza y escaneo 3D con la Dra. Aura Estudillo (Céd. Prof. 8492019).
            </p>
          </div>

          {/* 2° Botones de Acción */}
          <div className="flex items-center justify-center gap-2">
            <a
              href="#reservar"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg transition-all active:scale-95"
            >
              Reservar Cita
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="#about"
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all"
            >
              Conocer Estudio
            </a>
          </div>

          {/* 3° Área del Modelo Dental Interactivo con Comida Veo 3 Visible */}
          <div className="relative w-full h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-slate-950 my-4 mb-6">
            {/* FONDO DE COMIDA VEO 3 CLARAMENTE VISIBLE */}
            <div
              className="absolute inset-0 pointer-events-none z-10 overflow-hidden transition-all duration-300 ease-out"
              style={{
                opacity: Math.max(0.25, 0.85 - (splitPercent / 100) * 0.65),
              }}
            >
              <img
                src={ASSETS.floatingFood}
                alt="Alimentos pigmentantes flotantes"
                className="w-full h-full object-cover object-center select-none"
              />
              <div className="absolute inset-0 bg-slate-950/30" />
            </div>

            {/* Capa After (Dientes Blancos) */}
            <div className="absolute inset-0 w-full h-full overflow-hidden z-20">
              <img
                src={ASSETS.after}
                alt="Dientes blancos después"
                className="w-full h-full object-cover object-[center_35%] scale-105 pointer-events-none mix-blend-screen"
              />
            </div>

            {/* Capa Before interactiva (Dientes Manchados) */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-75 ease-out z-20"
              style={{ width: `${splitPercent}%` }}
            >
              <div
                className="relative h-full"
                style={{ width: heroRef.current ? `${heroRef.current.clientWidth - 32}px` : '92vw' }}
              >
                <img
                  src={ASSETS.before}
                  alt="Dientes manchados antes"
                  className="w-full h-full object-cover object-[center_35%] scale-105 pointer-events-none mix-blend-screen"
                />
              </div>
            </div>

            {/* Badges de fase en móvil */}
            <div className="absolute top-3 left-3 z-30 pointer-events-none">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950/85 text-slate-200 border border-white/20 shadow-md">
                Antes
              </span>
            </div>
            <div className="absolute top-3 right-3 z-30 pointer-events-none">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-300 shadow-md">
                Después
              </span>
            </div>
          </div>

          {/* 4° Píldoras de Estadísticas Debajo de la Dentadura */}
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <div className="p-3 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/15 text-white shadow-xl">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-amber-400 font-hanken">07 tonos</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                Más blancos con tecnología LED.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/15 text-white shadow-xl">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-amber-400 font-hanken">4,200+</span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                Sonrisas perfeccionadas.
              </p>
            </div>
          </div>

          {/* 5° Hint de Interacción Táctil */}
          <div className="text-center pt-1 pb-2">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-900/80 backdrop-blur-xs px-3.5 py-1 rounded-full border border-white/10 shadow-lg inline-block">
              ← Desliza tu dedo en la imagen para ver el cambio →
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DESKTOP: PÍLDORAS Y HERO CALL TO ACTION (md:block) */}
        {/* ======================================================== */}
        <div
          className={`hidden md:block absolute bottom-32 sm:bottom-28 left-6 sm:left-12 z-20 space-y-2 pointer-events-auto transition-opacity duration-300 ${
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

        {/* HERO TITLE & CALL TO ACTION (Desktop) */}
        <div
          className={`hidden md:block absolute bottom-8 right-6 sm:right-12 z-20 text-right pointer-events-auto max-w-xl transition-opacity duration-300 ${
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

        {/* Hint de Interacción en Desktop */}
        <div className="hidden md:block absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center px-4 w-full max-w-sm">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-950/70 backdrop-blur-xs px-3.5 py-1 rounded-full border border-white/10 shadow-lg inline-block">
            ← Desplaza el cursor o desliza tu dedo para revelar el cambio →
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
      <section id="about" className="py-24 lg:py-32 px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
              Filosofía Clínica &amp; Excelencia
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white tracking-tighter leading-[1.1] font-hanken">
              Donde la ciencia biomédica se encuentra con el arte dental.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              En Audenti Studio, bajo el liderazgo de la <strong className="text-white">Dra. Aura Estudillo</strong>, concebimos cada tratamiento como una obra personalizada. No creemos en soluciones estándar: combinamos tomografía Cone Beam de haz cónico, planificación virtual 3D y materiales cerámicos alemanes para devolver función masticatoria y armonía estética con mínima invasión.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-2xs space-y-1">
                <span className="text-2xl font-black text-amber-400 font-hanken">100%</span>
                <p className="text-xs font-bold text-slate-200">Esterilización Hospitalaria</p>
                <p className="text-[11px] text-slate-400">Autoclaves clase B y trazabilidad de instrumental médico.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 shadow-2xs space-y-1">
                <span className="text-2xl font-black text-amber-400 font-hanken">20 µm</span>
                <p className="text-xs font-bold text-slate-200">Ajuste de Precisión</p>
                <p className="text-[11px] text-slate-400">Margen microscópico que evita filtraciones bacterianas.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <a
                href="#reservar"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-xs"
              >
                Conocer Instalaciones
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </a>
              <span className="text-xs text-slate-400 font-semibold">• Sede Balbuena &amp; Franquicias</span>
            </div>
          </div>

          {/* Imagen de la Clínica (Interior 3.webp) */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-900 aspect-4/3">
              <img
                src={ASSETS.interior}
                alt="Instalaciones del consultorio y gabinete dental de la Dra. Aura Estudillo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white p-4 rounded-2xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800">
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
      <section id="tratamientos" className="py-24 bg-slate-900/50 backdrop-blur-sm border-y border-slate-800/40 px-4 sm:px-8 lg:px-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                Catálogo de Especialidades Odontológicas
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white tracking-tighter mt-3 font-hanken leading-tight">
                Precisión que transforma vidas.
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed font-medium">
              Tratamientos avalados por la Asociación Dental Mexicana (ADM) y diseñados bajo normas oficiales NOM-013-SSA2 para una salud bucodental de clase mundial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {treatments.map((t, idx) => {
              const Icon = t.icon
              return (
                <div
                  key={idx}
                  className="bg-[#0B0F19] hover:bg-slate-900/90 p-6 rounded-3xl border border-slate-800 hover:border-amber-400/80 shadow-2xs hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 group-hover:bg-amber-400 text-amber-400 group-hover:text-slate-950 flex items-center justify-center border border-slate-800 group-hover:border-amber-400 transition-colors shadow-2xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      {t.category}
                    </span>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {t.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Tiempo estimado:</span>
                      <strong className="text-slate-200">{t.duration}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Garantía clínica:</span>
                      <strong className="text-slate-200">{t.guarantee}</strong>
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
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Cuerpo Médico Acreditado
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 font-hanken">
              Especialistas con vocación de arte.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollTeam('left')}
              className="p-3 rounded-full bg-[#111827] border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors shadow-2xs cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTeam('right')}
              className="p-3 rounded-full bg-[#111827] border border-slate-800 hover:bg-slate-800 text-slate-200 transition-colors shadow-2xs cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenedor Responsivo: Grid en pantallas grandes (sin cortes laterales) y carrusel fluido con scroll-snap en móvil */}
        <div
          ref={teamCarouselRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
        >
          {specialists.map((doc, idx) => {
            const isDirector = idx === 0;
            return (
              <div
                key={idx}
                className={`w-full bg-[#111827] rounded-3xl border overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group ${
                  isDirector
                    ? 'border-amber-400/80 ring-2 ring-amber-400/20 shadow-amber-400/10'
                    : 'border-slate-800 hover:border-amber-400/50'
                }`}
              >
                {/* Imagen Fija del Especialista */}
                <div className="relative aspect-3/4 overflow-hidden bg-slate-900">
                  <img
                    src={doc.image}
                    alt={doc.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  
                  {/* Badge de Dirección Médica para Dra. Aura */}
                  {isDirector && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg z-10 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-slate-950" />
                      <span>Directora Médica</span>
                    </div>
                  )}

                  {/* Badge de Cédula Profesional */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#0B0F19]/90 backdrop-blur-md text-amber-300 text-[10px] font-bold border border-amber-400/30 font-mono shadow-md z-10">
                    {doc.reg}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className={`text-base font-bold transition-colors ${
                    isDirector ? 'text-amber-400' : 'text-white group-hover:text-amber-400'
                  }`}>
                    {doc.name}
                  </h3>
                  <p className="text-xs font-semibold text-amber-400 leading-snug">{doc.title}</p>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{doc.focus}</p>
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{doc.experience}</span>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Herramienta Interactiva de Conversión / Auditoría Digital de Sonrisa */}
      <SmileAuditTool />

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

        {/* Tarjeta QR con Psicología Inversa para PWA / Mobile Instant Access */}
        <div className="max-w-xl mx-auto my-6 p-6 sm:p-8 rounded-3xl bg-slate-900/90 border-2 border-amber-400/80 shadow-2xl text-center space-y-4 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest">
            Acceso Inmediato PWA
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white font-hanken tracking-tight">
            NO ESCANEES ESTE CÓDIGO QR ⛔
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            A menos que quieras agendar citas en 3 segundos, recibir recordatorios de control clínico en tu celular y acceder a beneficios exclusivos en tu tratamiento.
          </p>

          <div className="p-3.5 bg-white rounded-2xl inline-block border-2 border-amber-400 shadow-xl transition-transform hover:scale-105 duration-300">
            <QRCodeSVG
              value="https://audenti.vercel.app"
              size={160}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "https://media.kolpusites.com/dental_ad/1.webp",
                x: undefined,
                y: undefined,
                height: 32,
                width: 32,
                excavate: true,
              }}
            />
          </div>

          <p className="text-[11px] sm:text-xs text-amber-300/90 font-bold tracking-wide">
            App Web Cero Instalación — Escanea para agregar a tu Pantalla de Inicio.
          </p>
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

      {/* Ecosistema Maestro Unificado de Comunicación Flotante (Voz Aura IA Streaming + Chat Directo) */}
      <UnifiedCommunicationWidget />

      {/* Banner y Control de Modo Accesibilidad 50+ */}
      <SeniorAccessibilityBanner />
    </div>
  )
}
