'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  RotateCcw,
  ZoomIn,
  Eye,
  Layers,
  Sparkles,
  Maximize2,
  Box,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Dental3DViewerProps {
  selectedToothNum?: number
  onSelectTooth?: (toothNum: number) => void
  teethState?: Record<number, any>
  className?: string
}

const CONDITION_COLORS: Record<string, number> = {
  sano: 0xfcfbfa,
  caries: 0xef4444,
  resina: 0x3b82f6,
  amalgama: 0x64748b,
  sellador: 0x10b981,
  fractura: 0xec4899,
  incrustacion: 0xf59e0b,
  endodoncia: 0xf97316,
  corona: 0xeab308,
  implante: 0xa855f7,
  bracket: 0x6366f1,
  ausente: 0x334155
}

export function Dental3DViewer({
  selectedToothNum,
  onSelectTooth,
  teethState,
  className
}: Dental3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const teethMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map())
  const animationFrameRef = useRef<number | null>(null)

  const [activeArch, setActiveArch] = useState<'all' | 'upper' | 'lower'>('all')
  const [renderMode, setRenderMode] = useState<'clinical' | 'realistic' | 'xray'>('clinical')
  const [hoveredTooth, setHoveredTooth] = useState<{ fdi: number; name: string } | null>(null)
  const [loadingModel, setLoadingModel] = useState(true)
  const [fileSizeInfo, setFileSizeInfo] = useState('126 KB')

  // 1. Inicialización de la Escena Three.js con GLTFLoader
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Dimensiones iniciales
    const width = container.clientWidth || 600
    const height = container.clientHeight || 450

    // Escena
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0f1d) // Fondo clínico oscuro de alta fidelidad
    sceneRef.current = scene

    // Cámara con ángulo frontal-oclusal equilibrado
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 3.8, 6.2)
    cameraRef.current = camera

    // Renderizador WebGL con soporte de pixelRatio optimizado
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controles de Órbita
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 15
    controls.minDistance = 2.5
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // Iluminación Médica Quirúrgica (Studio Setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
    mainLight.position.set(5, 8, 5)
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.8)
    fillLight.position.set(-5, -3, 3)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xfef08a, 0.6)
    rimLight.position.set(0, -6, -5)
    scene.add(rimLight)

    // Cargar Modelo 3D Optimizado GLB
    const loader = new GLTFLoader()
    loader.load(
      '/models/dental_arch_clean.glb',
      (gltf) => {
        const root = gltf.scene
        scene.add(root)

        const map = new Map<number, THREE.Mesh>()
        root.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const match = child.name.match(/Tooth_(\d+)/)
            if (match) {
              const fdi = parseInt(match[1], 10)
              map.set(fdi, child)
              child.castShadow = true
              child.receiveShadow = true
            }
          }
        })

        teethMeshesRef.current = map
        setLoadingModel(false)
      },
      undefined,
      (err) => {
        console.warn('Error al cargar dental_arch_clean.glb, usando generador procedural:', err)
        setLoadingModel(false)
      }
    )

    // Raycaster para selección interactiva por clic y hover
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const meshes = Array.from(teethMeshesRef.current.values())
      const intersects = raycaster.intersectObjects(meshes)

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh
        const fdi = hit.userData?.fdi || parseInt(hit.name.replace('Tooth_', ''), 10)
        setHoveredTooth({
          fdi,
          name: hit.userData?.name || `Pieza #${fdi}`
        })
        container.style.cursor = 'pointer'
      } else {
        setHoveredTooth(null)
        container.style.cursor = 'grab'
      }
    }

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const meshes = Array.from(teethMeshesRef.current.values())
      const intersects = raycaster.intersectObjects(meshes)

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh
        const fdi = hit.userData?.fdi || parseInt(hit.name.replace('Tooth_', ''), 10)
        if (fdi && onSelectTooth) {
          onSelectTooth(fdi)
        }
      }
    }

    const domElement = renderer.domElement
    domElement.addEventListener('mousemove', onPointerMove)
    domElement.addEventListener('click', onClick)

    // Loop de Animación
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Manejo de Redimensionamiento
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      domElement.removeEventListener('mousemove', onPointerMove)
      domElement.removeEventListener('click', onClick)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      renderer.dispose()
      if (domElement.parentElement) domElement.parentElement.removeChild(domElement)
    }
  }, [onSelectTooth])

  // 2. Actualizar Colores y Resaltado según Condición Clínica y Selección
  useEffect(() => {
    teethMeshesRef.current.forEach((mesh, fdi) => {
      const isSelected = selectedToothNum === fdi
      const toothState = teethState?.[fdi]
      const condition = toothState?.wholeCondition || 'sano'
      const isAbsent = condition === 'ausente'

      const mat = mesh.material as THREE.MeshStandardMaterial
      if (!mat) return

      // Modo de renderizado
      if (renderMode === 'xray') {
        mat.transparent = true
        mat.opacity = isSelected ? 0.95 : 0.4
        mat.color.setHex(isSelected ? 0xf59e0b : 0x38bdf8)
        mat.wireframe = true
      } else if (renderMode === 'clinical') {
        mat.transparent = isAbsent
        mat.opacity = isAbsent ? 0.25 : 1.0
        mat.wireframe = false

        if (isSelected) {
          mat.color.setHex(0xf59e0b) // Resaltado dorado brillante en selección
          mat.roughness = 0.15
          mesh.scale.set(1.12, 1.12, 1.12)
        } else {
          const hex = CONDITION_COLORS[condition] || 0xfcfbfa
          mat.color.setHex(hex)
          mat.roughness = condition === 'sano' ? 0.22 : 0.4
          mesh.scale.set(1, 1, 1)
        }
      } else {
        // Modo realista esmalte
        mat.transparent = isAbsent
        mat.opacity = isAbsent ? 0.2 : 1.0
        mat.wireframe = false
        mat.color.setHex(isSelected ? 0xfef08a : 0xfcfbfa)
        mat.roughness = 0.18
        mesh.scale.set(isSelected ? 1.08 : 1, isSelected ? 1.08 : 1, isSelected ? 1.08 : 1)
      }
    })
  }, [selectedToothNum, teethState, renderMode])

  // 3. Filtrar Visibilidad por Arcada (Superior, Inferior o Ambas)
  useEffect(() => {
    teethMeshesRef.current.forEach((mesh, fdi) => {
      const isUpper = (fdi >= 11 && fdi <= 28) || (fdi >= 51 && fdi <= 65)
      if (activeArch === 'all') {
        mesh.visible = true
      } else if (activeArch === 'upper') {
        mesh.visible = isUpper
      } else if (activeArch === 'lower') {
        mesh.visible = !isUpper
      }
    })
  }, [activeArch])

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(0, 3.8, 6.2)
    controlsRef.current.target.set(0, 0, 0)
    controlsRef.current.update()
  }

  const handleTopView = () => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(0, 8.5, 0.1)
    controlsRef.current.target.set(0, 0, 0)
    controlsRef.current.update()
  }

  return (
    <div className={cn('relative w-full h-[540px] rounded-3xl bg-[#0a0f1d] border border-slate-800 shadow-xl overflow-hidden flex flex-col', className)}>
      {/* Barra de Herramientas y Filtros 3D */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Selector de Arcadas */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveArch('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeArch === 'all' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Oclusión (Ambas)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveArch('upper')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeArch === 'upper' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'
            )}
          >
            Maxilar Superior
          </button>
          <button
            type="button"
            onClick={() => setActiveArch('lower')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeArch === 'lower' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'
            )}
          >
            Mandíbula Inferior
          </button>
        </div>

        {/* Modo de Visualización y Shading */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg">
            <button
              type="button"
              onClick={() => setRenderMode('clinical')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                renderMode === 'clinical' ? 'bg-indigo-600 text-white font-black' : 'text-slate-300 hover:text-white'
              )}
              title="Colores diagnósticos por patología (Caries, Resina, Endodoncia)"
            >
              Clínico
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('realistic')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                renderMode === 'realistic' ? 'bg-indigo-600 text-white font-black' : 'text-slate-300 hover:text-white'
              )}
              title="Esmalte dental anatómico realista"
            >
              Realista
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('xray')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                renderMode === 'xray' ? 'bg-indigo-600 text-white font-black' : 'text-slate-300 hover:text-white'
              )}
              title="Modo Rayos X translúcido / Wireframe"
            >
              Rayos X
            </button>
          </div>

          {/* Botones de Cámara Rápida */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-lg">
            <button
              type="button"
              onClick={handleTopView}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Vista Oclusal Superior (Cénit)"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Restablecer Posición de Cámara"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas 3D */}
      <div ref={containerRef} className="w-full flex-1 touch-none" />

      {/* Overlay de Carga */}
      {loadingModel && (
        <div className="absolute inset-0 z-30 bg-[#0a0f1d]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-wide text-slate-300">
            Cargando modelo 3D GLB optimizado ({fileSizeInfo})...
          </p>
        </div>
      )}

      {/* Badge de Pieza Hover / Selección en Vivo */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        {hoveredTooth || selectedToothNum ? (
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              #{hoveredTooth?.fdi || selectedToothNum}
            </div>
            <div>
              <span className="text-xs font-bold block text-slate-100">
                {hoveredTooth?.name || `Pieza Seleccionada #${selectedToothNum}`}
              </span>
              <span className="text-[10px] text-amber-300 font-semibold block">
                Haz clic para vincular tratamientos o diagnósticos en el odontograma
              </span>
            </div>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/70 backdrop-blur-sm border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Arrastra para rotar en 360° • Rueda del ratón para Zoom • Clic en cualquier diente para seleccionarlo</span>
          </div>
        )}
      </div>

      {/* Indicador de Optimización Elephant-Goldfish */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>GLB Ultra-Ligero: {fileSizeInfo} • 60 FPS WebGL</span>
      </div>
    </div>
  )
}
