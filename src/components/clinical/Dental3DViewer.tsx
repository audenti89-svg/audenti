'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  RotateCcw,
  Eye,
  Layers,
  Sparkles,
  Box,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Save,
  Check,
  Activity,
  FileText,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Tipos clínicos para odontograma
export type SurfaceCondition =
  | 'sano'
  | 'caries'
  | 'resina'
  | 'amalgama'
  | 'sellador'
  | 'fractura'
  | 'incrustacion'

export type ToothCondition =
  | 'sano'
  | 'caries'
  | 'obturado'
  | 'corona'
  | 'endodoncia'
  | 'implante'
  | 'ausente'
  | 'extraccion_indicada'
  | 'protesis'
  | 'sellador'
  | 'fractura'

export interface ToothSurfaces {
  vestibular: SurfaceCondition
  lingual: SurfaceCondition
  mesial: SurfaceCondition
  distal: SurfaceCondition
  oclusal: SurfaceCondition
}

export interface Dental3DViewerProps {
  selectedToothNum?: number
  onSelectTooth?: (toothNum: number) => void
  teethState?: Record<number, any>
  onUpdateToothSurfaces?: (toothNum: number, surfaces: Partial<ToothSurfaces>, wholeCondition?: ToothCondition) => void
  onAddTreatment?: (treatment: {
    toothNumber: number
    specialty: string
    procedure: string
    surfaces: string[]
    notes: string
    estimatedCost: number
    condition?: ToothCondition
  }) => void
  className?: string
}

// Colores clínicos oficiales por patología
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
  ausente: 0x1e293b,
  extraccion_indicada: 0xd97706
}

// Catálogo de Nombres Anatómicos FDI
const FDI_NAMES: Record<number, { name: string; arch: string; isAnterior: boolean }> = {
  11: { name: 'Incisivo Central Superior Derecho', arch: 'Maxilar Superior - Cuad. 1', isAnterior: true },
  12: { name: 'Incisivo Lateral Superior Derecho', arch: 'Maxilar Superior - Cuad. 1', isAnterior: true },
  13: { name: 'Canino Superior Derecho', arch: 'Maxilar Superior - Cuad. 1', isAnterior: true },
  14: { name: 'Primer Premolar Superior Derecho', arch: 'Maxilar Superior - Cuad. 1', isAnterior: false },
  15: { name: 'Segundo Premolar Superior Derecho', arch: 'Maxilar Superior - Cuad. 1', isAnterior: false },
  16: { name: 'Primer Molar Superior Derecho', arch: 'Maxilar Superior - Cuad. 1', isAnterior: false },
  17: { name: 'Segundo Molar Superior Derecho', arch: 'Maxilar Superior - Cuad. 1', isAnterior: false },
  18: { name: 'Tercer Molar Superior Derecho (Cordal)', arch: 'Maxilar Superior - Cuad. 1', isAnterior: false },

  21: { name: 'Incisivo Central Superior Izquierdo', arch: 'Maxilar Superior - Cuad. 2', isAnterior: true },
  22: { name: 'Incisivo Lateral Superior Izquierdo', arch: 'Maxilar Superior - Cuad. 2', isAnterior: true },
  23: { name: 'Canino Superior Izquierdo', arch: 'Maxilar Superior - Cuad. 2', isAnterior: true },
  24: { name: 'Primer Premolar Superior Izquierdo', arch: 'Maxilar Superior - Cuad. 2', isAnterior: false },
  25: { name: 'Segundo Premolar Superior Izquierdo', arch: 'Maxilar Superior - Cuad. 2', isAnterior: false },
  26: { name: 'Primer Molar Superior Izquierdo', arch: 'Maxilar Superior - Cuad. 2', isAnterior: false },
  27: { name: 'Segundo Molar Superior Izquierdo', arch: 'Maxilar Superior - Cuad. 2', isAnterior: false },
  28: { name: 'Tercer Molar Superior Izquierdo (Cordal)', arch: 'Maxilar Superior - Cuad. 2', isAnterior: false },

  31: { name: 'Incisivo Central Inferior Izquierdo', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: true },
  32: { name: 'Incisivo Lateral Inferior Izquierdo', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: true },
  33: { name: 'Canino Inferior Izquierdo', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: true },
  34: { name: 'Primer Premolar Inferior Izquierdo', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: false },
  35: { name: 'Segundo Premolar Inferior Izquierdo', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: false },
  36: { name: 'Primer Molar Inferior Izquierdo', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: false },
  37: { name: 'Segundo Molar Inferior Izquierdo', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: false },
  38: { name: 'Tercer Molar Inferior Izquierdo (Cordal)', arch: 'Mandíbula Inferior - Cuad. 3', isAnterior: false },

  41: { name: 'Incisivo Central Inferior Derecho', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: true },
  42: { name: 'Incisivo Lateral Inferior Derecho', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: true },
  43: { name: 'Canino Inferior Derecho', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: true },
  44: { name: 'Primer Premolar Inferior Derecho', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: false },
  45: { name: 'Segundo Premolar Inferior Derecho', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: false },
  46: { name: 'Primer Molar Inferior Derecho', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: false },
  47: { name: 'Segundo Molar Inferior Derecho', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: false },
  48: { name: 'Tercer Molar Inferior Derecho (Cordal)', arch: 'Mandíbula Inferior - Cuad. 4', isAnterior: false }
}

// Mapeo entre nombres de mallas en OrganUI teeth.glb y numeración FDI
const MESH_TO_FDI: Record<string, number> = {
  'upper-right-central-incisor': 11,
  'upper-right-lateral-incisor': 12,
  'upper-right-canine': 13,
  'upper-right-first-premolar': 14,
  'upper-right-second-premolar': 15,
  'upper-right-first-molar': 16,
  'upper-right-second-molar': 17,
  'upper-left-central-incisor': 21,
  'upper-left-lateral-incisor': 22,
  'upper-left-canine': 23,
  'upper-left-first-premolar': 24,
  'upper-left-second-premolar': 25,
  'upper-left-first-molar': 26,
  'upper-left-second-molar': 27,
  'lower-left-central-incisor': 31,
  'lower-left-lateral-incisor': 32,
  'lower-left-canine': 33,
  'lower-left-first-premolar': 34,
  'lower-left-second-premolar': 35,
  'lower-left-first-molar': 36,
  'lower-left-second-molar': 37,
  'lower-right-central-incisor': 41,
  'lower-right-lateral-incisor': 42,
  'lower-right-canine': 43,
  'lower-right-first-premolar': 44,
  'lower-right-second-premolar': 45,
  'lower-right-first-molar': 46,
  'lower-right-second-molar': 47
}

// Pares interproximales anatómicos (contacto dental contiguo)
const INTERPROXIMAL_PAIRS: [number, number][] = [
  // Arcada Superior Derecha
  [18, 17], [17, 16], [16, 15], [15, 14], [14, 13], [13, 12], [12, 11],
  // Línea Media Superior
  [11, 21],
  // Arcada Superior Izquierda
  [21, 22], [22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28],
  // Arcada Inferior Derecha
  [48, 47], [47, 46], [46, 45], [45, 44], [44, 43], [43, 42], [42, 41],
  // Línea Media Inferior
  [41, 31],
  // Arcada Inferior Izquierda
  [31, 32], [32, 33], [33, 34], [34, 35], [35, 36], [36, 37], [37, 38]
]

export function Dental3DViewer({
  selectedToothNum,
  onSelectTooth,
  teethState,
  onUpdateToothSurfaces,
  onAddTreatment,
  className
}: Dental3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const teethMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map())
  const interproximalMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const gumsMeshesRef = useRef<THREE.Mesh[]>([])
  const boneMeshesRef = useRef<THREE.Mesh[]>([])
  const animationFrameRef = useRef<number | null>(null)

  const [activeArch, setActiveArch] = useState<'all' | 'upper' | 'lower'>('all')
  const [renderMode, setRenderMode] = useState<'clinical' | 'realistic' | 'xray'>('clinical')
  const [showGums, setShowGums] = useState(true)
  const [showBone, setShowBone] = useState(false)
  const [hoveredInfo, setHoveredInfo] = useState<{
    fdi?: number
    isInterproximal?: boolean
    pair?: [number, number]
    name: string
  } | null>(null)
  const [loadingModel, setLoadingModel] = useState(true)

  // ESTADO DEL MODAL CRISTAL GLASSMORPHISM
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    toothNumber: number
    isInterproximal: boolean
    pair?: [number, number]
    activeSurfaces: ToothSurfaces
    selectedCondition: ToothCondition
    notes: string
    estimatedCost: number
    specialty: string
    procedure: string
  } | null>(null)
  const [saveSuccessNotification, setSaveSuccessNotification] = useState(false)

  // 1. Abrir Modal Cristal para diente o zona interproximal
  const handleOpenCrystalModal = useCallback((toothNum: number, isInterproximal = false, pair?: [number, number]) => {
    const toothInfo = teethState?.[toothNum]
    const surfaces: ToothSurfaces = toothInfo?.surfaces || {
      vestibular: 'sano',
      lingual: 'sano',
      mesial: 'sano',
      distal: 'sano',
      oclusal: 'sano'
    }

    setModalData({
      toothNumber: toothNum,
      isInterproximal,
      pair,
      activeSurfaces: { ...surfaces },
      selectedCondition: toothInfo?.wholeCondition || 'caries',
      notes: isInterproximal && pair
        ? `Tratamiento interproximal de punto de contacto entre piezas #${pair[0]} y #${pair[1]}.`
        : `Tratamiento clínico en pieza #${toothNum}.`,
      estimatedCost: 950,
      specialty: 'operatoria',
      procedure: isInterproximal ? 'Restauración Resina Interproximal Clase II' : 'Restauración Estética con Resina Fotocurable'
    })
    setModalOpen(true)
  }, [teethState])

  // 2. Inicialización de la Escena Three.js con OrganUI teeth.glb
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 700
    const height = container.clientHeight || 540

    // Escena con Fondo Holográfico Quirúrgico Oscuro
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040711) // Fondo oscuro médico futurista profundo
    sceneRef.current = scene

    // Cámara: Posicionada para enfocar frontal y oclusalmente la arcada médica
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50)
    camera.position.set(0, 0.35, 3.2)
    cameraRef.current = camera

    // Renderizador WebGL
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controles de Órbita 360°
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxDistance = 6.5
    controls.minDistance = 1.2
    controls.target.set(0, -0.55, 0.55) // Centro anatómico dental de OrganUI
    controls.update()
    controlsRef.current = controls

    // ILUMINACIÓN HOLOGRÁFICA QUIRÚRGICA
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.95)
    scene.add(ambientLight)

    // Luz Principal Frontal
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.6)
    mainLight.position.set(3, 5, 5)
    scene.add(mainLight)

    // Luz Suave de Relleno Azul Claro
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9)
    fillLight.position.set(-4, -2, 4)
    scene.add(fillLight)

    // Luz Rim Holográfica Cian (Brillo de Borde Futurista)
    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.4)
    cyanRim.position.set(0, 4, -4)
    scene.add(cyanRim)

    // Luz Rim Dorada Audenti (Brillo de Borde Inferior)
    const goldRim = new THREE.DirectionalLight(0xfbbf24, 0.8)
    goldRim.position.set(0, -5, 2)
    scene.add(goldRim)

    // Luz Puntual Intraoral para evitar sombras negras en caras linguales/palatinas
    const intraoralLight = new THREE.PointLight(0xffffff, 1.8, 4.0)
    intraoralLight.position.set(0, -0.45, 0.35)
    scene.add(intraoralLight)

    // CARGA DEL MODELO MÉDICO ORGANUI TEETH.GLB
    const loader = new GLTFLoader()
    loader.load(
      '/models/teeth.glb',
      (gltf) => {
        const root = gltf.scene
        scene.add(root)

        const map = new Map<number, THREE.Mesh>()
        const gumsList: THREE.Mesh[] = []
        const boneList: THREE.Mesh[] = []
        const toothCenters = new Map<number, THREE.Vector3>()

        root.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true

            // Identificar dientes
            const fdi = MESH_TO_FDI[child.name]
            if (fdi) {
              map.set(fdi, child)
              child.userData = { fdi, name: FDI_NAMES[fdi]?.name || `Pieza #${fdi}` }

              // Material esmalte de alta gama
              child.material = new THREE.MeshStandardMaterial({
                color: 0xfcfbfa,
                roughness: 0.18,
                metalness: 0.05
              })

              // Calcular centro geométrico para nodos interproximales
              const box = new THREE.Box3().setFromObject(child)
              const center = new THREE.Vector3()
              box.getCenter(center)
              toothCenters.set(fdi, center)
            } else if (child.name.includes('gum')) {
              // Encías (gums)
              gumsList.push(child)
              child.material = new THREE.MeshStandardMaterial({
                color: 0xd9777f,
                roughness: 0.55,
                metalness: 0.02,
                transparent: true,
                opacity: 0.88
              })
            } else if (child.name.includes('maxilla') || child.name.includes('mandible')) {
              // Hueso maxilar y mandíbula
              boneList.push(child)
              child.material = new THREE.MeshStandardMaterial({
                color: 0xcbd5e1,
                roughness: 0.8,
                transparent: true,
                opacity: 0.35
              })
              child.visible = false // Oculto por defecto para máxima claridad dental
            }
          }
        })

        // Generar terceros molares cordales (18, 28, 38, 48) clonando el segundo molar contiguo
        const wisdomPairs: [number, number, number][] = [
          [17, 18, 1],
          [27, 28, 1],
          [37, 38, -1],
          [47, 48, -1]
        ]
        wisdomPairs.forEach(([sourceFdi, targetFdi, dir]) => {
          const sourceMesh = map.get(sourceFdi)
          if (sourceMesh) {
            const clone = sourceMesh.clone()
            clone.name = `Tooth_${targetFdi}`
            clone.userData = { fdi: targetFdi, name: FDI_NAMES[targetFdi]?.name }
            clone.position.z -= 0.22
            clone.position.y += dir * 0.03
            root.add(clone)
            map.set(targetFdi, clone)

            const box = new THREE.Box3().setFromObject(clone)
            const center = new THREE.Vector3()
            box.getCenter(center)
            toothCenters.set(targetFdi, center)
          }
        })

        // CREAR NODOS INTERPROXIMALES GLOWING (Contacto entre dientes contiguos)
        const interMap = new Map<string, THREE.Mesh>()
        const sphereGeo = new THREE.SphereGeometry(0.042, 16, 16)
        const contactMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          transparent: true,
          opacity: 0.85
        })

        INTERPROXIMAL_PAIRS.forEach(([t1, t2]) => {
          const p1 = toothCenters.get(t1)
          const p2 = toothCenters.get(t2)
          if (p1 && p2) {
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
            const contactNode = new THREE.Mesh(sphereGeo, contactMat.clone())
            contactNode.position.copy(mid)
            contactNode.userData = {
              isInterproximal: true,
              pair: [t1, t2],
              name: `Zona Interproximal #${t1} ↔ #${t2}`
            }
            scene.add(contactNode)
            interMap.set(`${t1}-${t2}`, contactNode)
          }
        })

        teethMeshesRef.current = map
        interproximalMeshesRef.current = interMap
        gumsMeshesRef.current = gumsList
        boneMeshesRef.current = boneList
        setLoadingModel(false)
      },
      undefined,
      (err) => {
        console.warn('Error al cargar OrganUI teeth.glb:', err)
        setLoadingModel(false)
      }
    )

    // RAYCASTER PARA SELECCIÓN INTERACTIVA POR HOVER Y CLIC
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const allTeeth = Array.from(teethMeshesRef.current.values())
      const allInter = Array.from(interproximalMeshesRef.current.values())
      const intersects = raycaster.intersectObjects([...allInter, ...allTeeth])

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh
        if (hit.userData?.isInterproximal) {
          setHoveredInfo({
            isInterproximal: true,
            pair: hit.userData.pair,
            name: hit.userData.name
          })
        } else if (hit.userData?.fdi) {
          setHoveredInfo({
            fdi: hit.userData.fdi,
            name: hit.userData.name
          })
        }
        container.style.cursor = 'pointer'
      } else {
        setHoveredInfo(null)
        container.style.cursor = 'grab'
      }
    }

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const allTeeth = Array.from(teethMeshesRef.current.values())
      const allInter = Array.from(interproximalMeshesRef.current.values())
      const intersects = raycaster.intersectObjects([...allInter, ...allTeeth])

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh

        if (hit.userData?.isInterproximal) {
          const [t1, t2] = hit.userData.pair
          if (onSelectTooth) onSelectTooth(t1)
          handleOpenCrystalModal(t1, true, [t1, t2])
        } else if (hit.userData?.fdi) {
          const fdi = hit.userData.fdi
          if (onSelectTooth) onSelectTooth(fdi)
          handleOpenCrystalModal(fdi, false)
        }
      }
    }

    const domElement = renderer.domElement
    domElement.addEventListener('mousemove', onPointerMove)
    domElement.addEventListener('click', onClick)

    // Animación continua y loop de render
    let clock = new THREE.Clock()
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Efecto pulsante suave para nodos interproximales (glowing hologram pulse)
      interproximalMeshesRef.current.forEach((mesh) => {
        const scale = 1 + 0.18 * Math.sin(elapsedTime * 3.5)
        mesh.scale.set(scale, scale, scale)
      })

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

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
  }, [onSelectTooth, handleOpenCrystalModal])

  // 3. Actualizar Apariencia y Colores de los Dientes según Condición y Selección
  useEffect(() => {
    teethMeshesRef.current.forEach((mesh, fdi) => {
      const isSelected = selectedToothNum === fdi
      const toothState = teethState?.[fdi]
      const condition = toothState?.wholeCondition || 'sano'
      const isAbsent = condition === 'ausente'

      const mat = mesh.material as THREE.MeshStandardMaterial
      if (!mat) return

      if (renderMode === 'xray') {
        mat.transparent = true
        mat.opacity = isSelected ? 0.95 : 0.38
        mat.color.setHex(isSelected ? 0xf59e0b : 0x38bdf8)
        mat.wireframe = true
      } else if (renderMode === 'clinical') {
        mat.transparent = isAbsent
        mat.opacity = isAbsent ? 0.22 : 1.0
        mat.wireframe = false

        if (isSelected) {
          mat.color.setHex(0xf59e0b) // Dorado brillante en selección activa
          mat.roughness = 0.15
          mesh.scale.set(1.12, 1.12, 1.12)
        } else {
          const hex = CONDITION_COLORS[condition] || 0xfcfbfa
          mat.color.setHex(hex)
          mat.roughness = condition === 'sano' ? 0.2 : 0.4
          mesh.scale.set(1, 1, 1)
        }
      } else {
        // Modo realista
        mat.transparent = isAbsent
        mat.opacity = isAbsent ? 0.2 : 1.0
        mat.wireframe = false
        mat.color.setHex(isSelected ? 0xfef08a : 0xfcfbfa)
        mat.roughness = 0.18
        mesh.scale.set(isSelected ? 1.08 : 1, isSelected ? 1.08 : 1, isSelected ? 1.08 : 1)
      }
    })
  }, [selectedToothNum, teethState, renderMode])

  // 4. Filtrar Visibilidad por Arcada
  useEffect(() => {
    teethMeshesRef.current.forEach((mesh, fdi) => {
      const isUpper = fdi >= 11 && fdi <= 28
      if (activeArch === 'all') {
        mesh.visible = true
      } else if (activeArch === 'upper') {
        mesh.visible = isUpper
      } else if (activeArch === 'lower') {
        mesh.visible = !isUpper
      }
    })

    interproximalMeshesRef.current.forEach((mesh, key) => {
      const [t1Str] = key.split('-')
      const t1 = parseInt(t1Str, 10)
      const isUpper = t1 >= 11 && t1 <= 28
      if (activeArch === 'all') {
        mesh.visible = true
      } else if (activeArch === 'upper') {
        mesh.visible = isUpper
      } else if (activeArch === 'lower') {
        mesh.visible = !isUpper
      }
    })
  }, [activeArch])

  // 5. Visibilidad de Encías y Hueso
  useEffect(() => {
    gumsMeshesRef.current.forEach((mesh) => {
      mesh.visible = showGums
    })
  }, [showGums])

  useEffect(() => {
    boneMeshesRef.current.forEach((mesh) => {
      mesh.visible = showBone
    })
  }, [showBone])

  // Controles de Cámara Rápida
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(0, 0.35, 3.2)
    controlsRef.current.target.set(0, -0.55, 0.55)
    controlsRef.current.update()
  }

  const handleUpperArchView = () => {
    if (!cameraRef.current || !controlsRef.current) return
    setActiveArch('upper')
    cameraRef.current.position.set(0, 2.6, 0.6)
    controlsRef.current.target.set(0, -0.25, 0.55)
    controlsRef.current.update()
  }

  const handleLowerArchView = () => {
    if (!cameraRef.current || !controlsRef.current) return
    setActiveArch('lower')
    cameraRef.current.position.set(0, -2.8, 0.6)
    controlsRef.current.target.set(0, -0.85, 0.55)
    controlsRef.current.update()
  }

  // Guardar Cambios desde el Modal Cristal Glassmorphism
  const handleSaveModalData = () => {
    if (!modalData) return

    const { toothNumber, isInterproximal, pair, activeSurfaces, selectedCondition, notes, estimatedCost, specialty, procedure } = modalData

    // Extraer caras tratadas
    const treatedFaces = Object.entries(activeSurfaces)
      .filter(([_, cond]) => cond !== 'sano')
      .map(([face]) => face)

    // 1. Notificar actualización de caras a Odontogram
    if (onUpdateToothSurfaces) {
      onUpdateToothSurfaces(toothNumber, activeSurfaces, selectedCondition)

      // Si es interproximal, también actualizamos la pieza adyacente
      if (isInterproximal && pair) {
        const otherTooth = pair[0] === toothNumber ? pair[1] : pair[0]
        // Marcar la cara de contacto adyacente
        const complementarySurfaces: Partial<ToothSurfaces> = {
          mesial: activeSurfaces.distal !== 'sano' ? activeSurfaces.distal : 'sano',
          distal: activeSurfaces.mesial !== 'sano' ? activeSurfaces.mesial : 'sano'
        }
        onUpdateToothSurfaces(otherTooth, complementarySurfaces, selectedCondition)
      }
    }

    // 2. Notificar nuevo tratamiento clínico vinculado
    if (onAddTreatment) {
      onAddTreatment({
        toothNumber,
        specialty,
        procedure: isInterproximal && pair ? `${procedure} (#${pair[0]} ↔ #${pair[1]})` : procedure,
        surfaces: treatedFaces.length > 0 ? treatedFaces : ['corona_completa'],
        notes,
        estimatedCost,
        condition: selectedCondition
      })
    }

    // Notificación de éxito
    setSaveSuccessNotification(true)
    setTimeout(() => {
      setSaveSuccessNotification(false)
      setModalOpen(false)
    }, 1200)
  }

  const toggleModalSurface = (face: keyof ToothSurfaces) => {
    if (!modalData) return
    const current = modalData.activeSurfaces[face]
    const nextCondition: SurfaceCondition = current === 'sano' ? 'caries' : current === 'caries' ? 'resina' : 'sano'

    setModalData({
      ...modalData,
      activeSurfaces: {
        ...modalData.activeSurfaces,
        [face]: nextCondition
      }
    })
  }

  return (
    <div className={cn('relative w-full h-[580px] rounded-3xl bg-[#040711] border border-slate-800 shadow-2xl overflow-hidden flex flex-col', className)}>
      {/* BARRA SUPERIOR DE HERRAMIENTAS HOLOGRÁFICAS */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Selector de Arcadas */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveArch('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeArch === 'all' ? 'bg-amber-400 text-slate-950 font-black shadow-md' : 'text-slate-300 hover:text-white'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Oclusión Completa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveArch('upper')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeArch === 'upper' ? 'bg-amber-400 text-slate-950 font-black shadow-md' : 'text-slate-300 hover:text-white'
            )}
          >
            Arcada Superior
          </button>
          <button
            type="button"
            onClick={() => setActiveArch('lower')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeArch === 'lower' ? 'bg-amber-400 text-slate-950 font-black shadow-md' : 'text-slate-300 hover:text-white'
            )}
          >
            Arcada Inferior
          </button>
        </div>

        {/* Modos de Renderizado e Iluminación */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Toggles de Encías y Hueso */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-xl">
            <button
              type="button"
              onClick={() => setShowGums(!showGums)}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer',
                showGums ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : 'text-slate-400 hover:text-white'
              )}
              title="Alternar visualización de encías anatómicas"
            >
              Encías
            </button>
            <button
              type="button"
              onClick={() => setShowBone(!showBone)}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer',
                showBone ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'text-slate-400 hover:text-white'
              )}
              title="Alternar estructura ósea maxilar y mandibular"
            >
              Hueso
            </button>
          </div>

          {/* Shading Clínico / Realista / Rayos X */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-xl">
            <button
              type="button"
              onClick={() => setRenderMode('clinical')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                renderMode === 'clinical' ? 'bg-indigo-600 text-white font-black' : 'text-slate-300 hover:text-white'
              )}
              title="Colores diagnósticos por patología"
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
              title="Esmalte dental realista de alta resolución"
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
              title="Modo Rayos X y malla holográfica"
            >
              Rayos X
            </button>
          </div>

          {/* Vistas Rápidas de Cámara */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-xl">
            <button
              type="button"
              onClick={handleUpperArchView}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-[10px] font-bold px-2"
              title="Vista Oclusal Superior"
            >
              Oclusal Sup.
            </button>
            <button
              type="button"
              onClick={handleLowerArchView}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-[10px] font-bold px-2"
              title="Vista Oclusal Inferior"
            >
              Oclusal Inf.
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

      {/* CANVAS WEBGL 3D */}
      <div ref={containerRef} className="w-full flex-1 touch-none" />

      {/* OVERLAY DE CARGA DE MODELO 3D */}
      {loadingModel && (
        <div className="absolute inset-0 z-30 bg-[#040711]/95 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-white">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold tracking-wide text-amber-300">
            Cargando arcada dental 3D anatómica (OrganUI BodyParts3D)...
          </p>
          <span className="text-xs text-slate-400">Optimizando mallas y coordenadas FDI 11–48</span>
        </div>
      )}

      {/* BADGE INFORMATIVO DE HOVER Y AYUDA */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        {hoveredInfo ? (
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-amber-400/50 text-white shadow-2xl flex items-center gap-3 animate-in fade-in duration-150">
            {hoveredInfo.isInterproximal ? (
              <div className="w-8 h-8 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                ↔
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                #{hoveredInfo.fdi}
              </div>
            )}
            <div>
              <span className="text-xs font-bold block text-slate-100">
                {hoveredInfo.name}
              </span>
              <span className="text-[10px] text-amber-300 font-semibold block">
                {hoveredInfo.isInterproximal
                  ? 'Clic para registrar patología de contacto o restauración compartida'
                  : 'Clic para abrir la Ventana Cristal y registrar caras o tratamientos'}
              </span>
            </div>
          </div>
        ) : (
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Rotación 360° con arrastre • Zoom con rueda • Clic en cualquier diente o punto brillante para abrir la <strong>Ventana Cristal</strong>
            </span>
          </div>
        )}
      </div>

      {/* BADGE DE RENDIMIENTO WEBGL */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>OrganUI 3D • 26 Puntos Interproximales • 60 FPS</span>
      </div>

      {/* =========================================================================
          MODAL / VENTANA FLOTANTE EN MODO CRISTAL (GLASSMORPHISM)
          ========================================================================= */}
      {modalOpen && modalData && (
        <div className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[92%] overflow-y-auto bg-slate-900/90 backdrop-blur-2xl border-2 border-amber-400/60 shadow-[0_0_50px_rgba(245,158,11,0.25)] rounded-3xl p-6 text-white space-y-5">
            {/* Notificación de Guardado Rápido */}
            {saveSuccessNotification && (
              <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center gap-3 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white">¡Actualización Guardada!</h4>
                <p className="text-xs text-slate-300">
                  Diagnóstico y caras sincronizadas en el expediente clínico y Supabase.
                </p>
              </div>
            )}

            {/* Encabezado del Modal Cristal */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                {modalData.isInterproximal ? (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    ↔
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                    #{modalData.toothNumber}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {modalData.isInterproximal ? 'Zona Interproximal' : 'Ventana Cristal 3D'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {FDI_NAMES[modalData.toothNumber]?.arch || 'Arcada Clínica'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {modalData.isInterproximal && modalData.pair
                      ? `Contacto Interproximal: Pieza #${modalData.pair[0]} ↔ #${modalData.pair[1]}`
                      : FDI_NAMES[modalData.toothNumber]?.name || `Pieza Dental #${modalData.toothNumber}`}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar ventana cristal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECCIÓN 1: DESGLOSE ANATÓMICO POR 5 CARAS DENTALES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Desglose Anatómico de 5 Caras</span>
                </label>
                <span className="text-[10px] text-slate-400">Clic en cada cara para alternar patología</span>
              </div>

              {/* Matriz Visual de las 5 Caras (Cruz Anatómica) */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center gap-1.5">
                {/* Vestibular (Superior) */}
                <button
                  type="button"
                  onClick={() => toggleModalSurface('vestibular')}
                  className={cn(
                    'w-36 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5',
                    modalData.activeSurfaces.vestibular === 'caries'
                      ? 'bg-rose-500/30 text-rose-300 border-rose-500/80 shadow-xs shadow-rose-500/30 font-black'
                      : modalData.activeSurfaces.vestibular === 'resina'
                      ? 'bg-blue-500/30 text-blue-300 border-blue-500/80 shadow-xs shadow-blue-500/30 font-black'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  )}
                >
                  <span>Vestibular (Bucal)</span>
                  <span className="text-[10px] uppercase opacity-75">[{modalData.activeSurfaces.vestibular}]</span>
                </button>

                {/* Mesial - Oclusal/Incisal - Distal */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleModalSurface('mesial')}
                    className={cn(
                      'w-28 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center',
                      modalData.activeSurfaces.mesial === 'caries'
                        ? 'bg-rose-500/30 text-rose-300 border-rose-500/80 shadow-xs shadow-rose-500/30 font-black'
                        : modalData.activeSurfaces.mesial === 'resina'
                        ? 'bg-blue-500/30 text-blue-300 border-blue-500/80 shadow-xs shadow-blue-500/30 font-black'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                    )}
                  >
                    <span>Mesial</span>
                    <span className="text-[10px] uppercase opacity-75">[{modalData.activeSurfaces.mesial}]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleModalSurface('oclusal')}
                    className={cn(
                      'w-32 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center',
                      modalData.activeSurfaces.oclusal === 'caries'
                        ? 'bg-rose-500/40 text-rose-200 border-rose-400 shadow-md shadow-rose-500/40 font-black'
                        : modalData.activeSurfaces.oclusal === 'resina'
                        ? 'bg-blue-500/40 text-blue-200 border-blue-400 shadow-md shadow-blue-500/40 font-black'
                        : 'bg-amber-400/20 text-amber-200 border-amber-400/50 hover:bg-amber-400/30'
                    )}
                  >
                    <span className="text-amber-300 font-black">
                      {FDI_NAMES[modalData.toothNumber]?.isAnterior ? 'Incisal' : 'Oclusal'}
                    </span>
                    <span className="text-[10px] uppercase opacity-80">[{modalData.activeSurfaces.oclusal}]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleModalSurface('distal')}
                    className={cn(
                      'w-28 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center',
                      modalData.activeSurfaces.distal === 'caries'
                        ? 'bg-rose-500/30 text-rose-300 border-rose-500/80 shadow-xs shadow-rose-500/30 font-black'
                        : modalData.activeSurfaces.distal === 'resina'
                        ? 'bg-blue-500/30 text-blue-300 border-blue-500/80 shadow-xs shadow-blue-500/30 font-black'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                    )}
                  >
                    <span>Distal</span>
                    <span className="text-[10px] uppercase opacity-75">[{modalData.activeSurfaces.distal}]</span>
                  </button>
                </div>

                {/* Lingual o Palatino (Inferior) */}
                <button
                  type="button"
                  onClick={() => toggleModalSurface('lingual')}
                  className={cn(
                    'w-36 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5',
                    modalData.activeSurfaces.lingual === 'caries'
                      ? 'bg-rose-500/30 text-rose-300 border-rose-500/80 shadow-xs shadow-rose-500/30 font-black'
                      : modalData.activeSurfaces.lingual === 'resina'
                      ? 'bg-blue-500/30 text-blue-300 border-blue-500/80 shadow-xs shadow-blue-500/30 font-black'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  )}
                >
                  <span>{modalData.toothNumber <= 28 ? 'Palatino' : 'Lingual'}</span>
                  <span className="text-[10px] uppercase opacity-75">[{modalData.activeSurfaces.lingual}]</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: DIAGNÓSTICO / TRATAMIENTO A APLICAR */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                Diagnóstico Principal / Tratamiento
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'caries', label: 'Caries Dental', color: 'bg-rose-500/20 text-rose-300 border-rose-500/60' },
                  { id: 'obturado', label: 'Resina / Obturación', color: 'bg-blue-500/20 text-blue-300 border-blue-500/60' },
                  { id: 'endodoncia', label: 'Endodoncia', color: 'bg-orange-500/20 text-orange-300 border-orange-500/60' },
                  { id: 'corona', label: 'Corona Zirconia', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60' },
                  { id: 'implante', label: 'Implante Titanio', color: 'bg-purple-500/20 text-purple-300 border-purple-500/60' },
                  { id: 'sellador', label: 'Sellador Fosetas', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60' },
                  { id: 'fractura', label: 'Fractura Dental', color: 'bg-pink-500/20 text-pink-300 border-pink-500/60' },
                  { id: 'ausente', label: 'Pieza Ausente', color: 'bg-slate-700/40 text-slate-300 border-slate-600' },
                  { id: 'sano', label: 'Diente Sano', color: 'bg-white/10 text-white border-white/30' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModalData({ ...modalData, selectedCondition: item.id as ToothCondition })}
                    className={cn(
                      'px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                      modalData.selectedCondition === item.id
                        ? `${item.color} ring-2 ring-amber-400 font-black scale-102 shadow-md`
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SECCIÓN 3: NOTAS CLÍNICAS Y PRESUPUESTO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Notas de Evolución Clínica
                </label>
                <input
                  type="text"
                  value={modalData.notes}
                  onChange={(e) => setModalData({ ...modalData, notes: e.target.value })}
                  placeholder="Detalles del procedimiento o cara..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Costo Estimado ($MXN)
                </label>
                <input
                  type="number"
                  value={modalData.estimatedCost}
                  onChange={(e) => setModalData({ ...modalData, estimatedCost: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-amber-300 font-bold focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveModalData}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Aplicar y Guardar en Historial</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
