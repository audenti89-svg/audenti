'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  RotateCcw,
  Layers,
  Sparkles,
  Info,
  X,
  Save,
  Check,
  Activity,
  ShieldCheck,
  Hash,
  Database,
  Sliders
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TOOTH_BY_FDI,
  TOOTH_BY_UNIVERSAL,
  INTERPROXIMAL_CONTACTS,
  ORGANUI_MESH_TO_NUMBERS,
  ToothTaxonomy
} from '@/lib/dental-anatomy'

export type SurfaceCondition =
  | 'sano'
  | 'caries'
  | 'resina'
  | 'amalgama'
  | 'sellador'
  | 'fractura'
  | 'incrustacion'

export type ToothWholeCondition =
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
  selectedToothNum?: number // Representado en FDI (11-48)
  onSelectTooth?: (toothNum: number) => void
  teethState?: Record<number, any>
  patientId?: string
  patientName?: string
  doctorRole?: string
  branch?: string
  onUpdateToothSurfaces?: (toothNum: number, surfaces: Partial<ToothSurfaces>, wholeCondition?: ToothWholeCondition) => void
  onAddTreatment?: (treatment: {
    toothNumber: number
    toothUniversal: number
    specialty: string
    procedure: string
    surfaces: string[]
    notes: string
    estimatedCost: number
    condition?: ToothWholeCondition
  }) => void
  className?: string
}

// Colores clínicos oficiales para render 3D
const CONDITION_COLORS: Record<string, number> = {
  sano: 0xfcfbfa,
  caries: 0xef4444,
  resina: 0x3b82f6,
  obturado: 0x3b82f6,
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

export function Dental3DViewer({
  selectedToothNum,
  onSelectTooth,
  teethState,
  patientId,
  patientName = 'Paciente General',
  doctorRole = 'socio',
  branch = 'Sucursal Balbuena (Matriz)',
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
  const [numberingSystem, setNumberingSystem] = useState<'both' | 'fdi' | 'universal'>('both')
  const [showGums, setShowGums] = useState(true)
  const [showBone, setShowBone] = useState(false)
  const [loadingModel, setLoadingModel] = useState(true)

  const [hoveredInfo, setHoveredInfo] = useState<{
    fdi?: number
    universal?: number
    isInterproximal?: boolean
    pairFdi?: [number, number]
    pairUniversal?: [number, number]
    name: string
  } | null>(null)

  // ESTADO DE LA VENTANA FLOTANTE MODO CRISTAL (GLASSMORPHISM)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    toothFdi: number
    toothUniversal: number
    taxonomy?: ToothTaxonomy
    isInterproximal: boolean
    pairFdi?: [number, number]
    pairUniversal?: [number, number]
    activeSurfaces: ToothSurfaces
    selectedCondition: ToothWholeCondition
    notes: string
    estimatedCost: number
    specialty: string
    procedure: string
  } | null>(null)
  const [isPersistingSupabase, setIsPersistingSupabase] = useState(false)
  const [saveSuccessNotification, setSaveSuccessNotification] = useState(false)

  // 1. Abrir Modal Cristal para diente o contacto interproximal
  const handleOpenCrystalModal = useCallback(
    (toothFdi: number, isInterproximal = false, pairFdi?: [number, number]) => {
      const taxonomy = TOOTH_BY_FDI[toothFdi]
      const toothUniversal = taxonomy?.universal || 0
      const toothInfo = teethState?.[toothFdi]

      const surfaces: ToothSurfaces = toothInfo?.surfaces || {
        vestibular: 'sano',
        lingual: 'sano',
        mesial: 'sano',
        distal: 'sano',
        oclusal: 'sano'
      }

      let pairUniversal: [number, number] | undefined
      if (pairFdi) {
        pairUniversal = [
          TOOTH_BY_FDI[pairFdi[0]]?.universal || 0,
          TOOTH_BY_FDI[pairFdi[1]]?.universal || 0
        ]
      }

      setModalData({
        toothFdi,
        toothUniversal,
        taxonomy,
        isInterproximal,
        pairFdi,
        pairUniversal,
        activeSurfaces: { ...surfaces },
        selectedCondition: (toothInfo?.wholeCondition as ToothWholeCondition) || 'caries',
        notes: isInterproximal && pairFdi
          ? `Tratamiento interproximal de punto de contacto entre piezas #${pairFdi[0]} (UNS #${pairUniversal?.[0]}) y #${pairFdi[1]} (UNS #${pairUniversal?.[1]}).`
          : `Tratamiento clínico en pieza FDI #${toothFdi} (Universal #${toothUniversal}) — ${taxonomy?.name}.`,
        estimatedCost: 950,
        specialty: 'operatoria',
        procedure: isInterproximal
          ? 'Restauración Resina Interproximal Clase II (Matriz & Cuña)'
          : 'Restauración Estética de Resina Nanohíbrida'
      })
      setModalOpen(true)
    },
    [teethState]
  )

  // 2. Inicialización de la Escena Three.js con OrganUI teeth.glb
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 700
    const height = container.clientHeight || 560

    // Escena con Fondo Holográfico Quirúrgico Profundo
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040711) // Fondo médico futurista oscuro
    sceneRef.current = scene

    // Cámara con ángulo frontal-oclusal
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50)
    camera.position.set(0, 0.35, 3.2)
    cameraRef.current = camera

    // Renderizador WebGL de alta precisión
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
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
    controls.target.set(0, -0.55, 0.55) // Centro dental anatómico
    controls.update()
    controlsRef.current = controls

    // ILUMINACIÓN MULTIDIRECCIONAL HOLOGRÁFICA
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.95)
    scene.add(ambientLight)

    // Luz Principal Frontal de Estudio
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.7)
    mainLight.position.set(3, 5, 5)
    scene.add(mainLight)

    // Luz Suave de Relleno Azul
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9)
    fillLight.position.set(-4, -2, 4)
    scene.add(fillLight)

    // Luz Rim Holográfica Cian Neón (Borde de Silueta Dental)
    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.6)
    cyanRim.position.set(0, 4, -4)
    scene.add(cyanRim)

    // Luz Rim Dorada Audenti
    const goldRim = new THREE.DirectionalLight(0xfbbf24, 0.9)
    goldRim.position.set(0, -5, 2)
    scene.add(goldRim)

    // Luz Intraoral para iluminar caras linguales y palatinas
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

            const match = ORGANUI_MESH_TO_NUMBERS[child.name]
            if (match) {
              const { fdi, universal } = match
              map.set(fdi, child)
              child.userData = {
                fdi,
                universal,
                name: TOOTH_BY_FDI[fdi]?.name || `Pieza #${fdi}`
              }

              // Material esmalte de alta fidelidad
              child.material = new THREE.MeshStandardMaterial({
                color: 0xfcfbfa,
                roughness: 0.18,
                metalness: 0.05
              })

              const box = new THREE.Box3().setFromObject(child)
              const center = new THREE.Vector3()
              box.getCenter(center)
              toothCenters.set(fdi, center)
            } else if (child.name.includes('gum')) {
              gumsList.push(child)
              child.material = new THREE.MeshStandardMaterial({
                color: 0xd9777f,
                roughness: 0.55,
                metalness: 0.02,
                transparent: true,
                opacity: 0.88
              })
            } else if (child.name.includes('maxilla') || child.name.includes('mandible')) {
              boneList.push(child)
              child.material = new THREE.MeshStandardMaterial({
                color: 0xcbd5e1,
                roughness: 0.8,
                transparent: true,
                opacity: 0.35
              })
              child.visible = false
            }
          }
        })

        // Generar terceros molares cordales (18, 28, 38, 48) para completar 32 piezas permanentes
        const wisdomPairs: [number, number, number, number][] = [
          [17, 18, 1, 1],   // Upper Right Cordal (FDI 18, UNS 1)
          [27, 28, 16, 1],  // Upper Left Cordal (FDI 28, UNS 16)
          [37, 38, 17, -1], // Lower Left Cordal (FDI 38, UNS 17)
          [47, 48, 32, -1]  // Lower Right Cordal (FDI 48, UNS 32)
        ]
        wisdomPairs.forEach(([sourceFdi, targetFdi, targetUniversal, dir]) => {
          const sourceMesh = map.get(sourceFdi)
          if (sourceMesh) {
            const clone = sourceMesh.clone()
            clone.name = `Tooth_${targetFdi}`
            clone.userData = {
              fdi: targetFdi,
              universal: targetUniversal,
              name: TOOTH_BY_FDI[targetFdi]?.name
            }
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

        // CREAR NODOS INTERPROXIMALES GLOWING CON NUMERACIÓN DUAL
        const interMap = new Map<string, THREE.Mesh>()
        const sphereGeo = new THREE.SphereGeometry(0.042, 16, 16)
        const contactMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          transparent: true,
          opacity: 0.85
        })

        INTERPROXIMAL_CONTACTS.forEach((contact) => {
          const [t1, t2] = contact.fdiPair
          const p1 = toothCenters.get(t1)
          const p2 = toothCenters.get(t2)
          if (p1 && p2) {
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
            const contactNode = new THREE.Mesh(sphereGeo, contactMat.clone())
            contactNode.position.copy(mid)
            contactNode.userData = {
              isInterproximal: true,
              pairFdi: contact.fdiPair,
              pairUniversal: contact.universalPair,
              label: contact.label,
              name: contact.label
            }
            scene.add(contactNode)
            interMap.set(contact.key, contactNode)
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
            pairFdi: hit.userData.pairFdi,
            pairUniversal: hit.userData.pairUniversal,
            name: hit.userData.name
          })
        } else if (hit.userData?.fdi) {
          setHoveredInfo({
            fdi: hit.userData.fdi,
            universal: hit.userData.universal,
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
          const pairFdi = hit.userData.pairFdi as [number, number]
          if (onSelectTooth) onSelectTooth(pairFdi[0])
          handleOpenCrystalModal(pairFdi[0], true, pairFdi)
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

    const clock = new THREE.Clock()
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Efecto pulsante holográfico para contactos interproximales
      interproximalMeshesRef.current.forEach((mesh) => {
        const scale = 1 + 0.18 * Math.sin(elapsedTime * 3.6)
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

  // 3. Resaltado 3D según Patología y Selección
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
          mat.color.setHex(0xf59e0b) // Dorado Audenti para selección activa
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

  // Guardar Cambios con Persistencia en Supabase
  const handleSaveModalData = async () => {
    if (!modalData) return

    const {
      toothFdi,
      toothUniversal,
      isInterproximal,
      pairFdi,
      pairUniversal,
      activeSurfaces,
      selectedCondition,
      notes,
      estimatedCost,
      specialty,
      procedure
    } = modalData

    setIsPersistingSupabase(true)

    // Extraer caras tratadas
    const treatedFaces = Object.entries(activeSurfaces)
      .filter(([_, cond]) => cond !== 'sano')
      .map(([face]) => face)

    // 1. Notificar actualización de caras a Odontogram local
    if (onUpdateToothSurfaces) {
      onUpdateToothSurfaces(toothFdi, activeSurfaces, selectedCondition)

      if (isInterproximal && pairFdi) {
        const otherTooth = pairFdi[0] === toothFdi ? pairFdi[1] : pairFdi[0]
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
        toothNumber: toothFdi,
        toothUniversal,
        specialty,
        procedure: isInterproximal && pairFdi ? `${procedure} (#${pairFdi[0]} ↔ #${pairFdi[1]})` : procedure,
        surfaces: treatedFaces.length > 0 ? treatedFaces : ['corona_completa'],
        notes,
        estimatedCost,
        condition: selectedCondition
      })
    }

    // 3. PERSISTENCIA DIRECTA EN SUPABASE VÍA API
    if (patientId) {
      try {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi,
            toothUniversal,
            surfaces: activeSurfaces,
            condition: selectedCondition,
            procedure,
            specialty,
            notes,
            estimatedCost,
            isInterproximal,
            pairFdi,
            pairUniversal,
            doctorRole,
            branch,
            fullTeethState: teethState
          })
        })
      } catch (err) {
        console.warn('Error al persistir en Supabase desde Ventana Cristal:', err)
      }
    }

    setIsPersistingSupabase(false)
    setSaveSuccessNotification(true)
    setTimeout(() => {
      setSaveSuccessNotification(false)
      setModalOpen(false)
    }, 1200)
  }

  const toggleModalSurface = (face: keyof ToothSurfaces) => {
    if (!modalData) return
    const current = modalData.activeSurfaces[face]
    const nextCondition: SurfaceCondition =
      current === 'sano' ? 'caries' : current === 'caries' ? 'resina' : 'sano'

    setModalData({
      ...modalData,
      activeSurfaces: {
        ...modalData.activeSurfaces,
        [face]: nextCondition
      }
    })
  }

  return (
    <div className={cn('relative w-full h-[600px] rounded-3xl bg-[#040711] border border-slate-800 shadow-2xl overflow-hidden flex flex-col', className)}>
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
            Maxilar Superior
          </button>
          <button
            type="button"
            onClick={() => setActiveArch('lower')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeArch === 'lower' ? 'bg-amber-400 text-slate-950 font-black shadow-md' : 'text-slate-300 hover:text-white'
            )}
          >
            Mandíbula Inferior
          </button>
        </div>

        {/* Modos de Renderizado, Nomenclatura y Shading */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Conmutador Nomenclatura (Universal vs FDI vs Dual) */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-xl">
            <button
              type="button"
              onClick={() => setNumberingSystem('both')}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1',
                numberingSystem === 'both' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
              )}
              title="Mostrar Universal (1-32) y FDI (11-48)"
            >
              <Hash className="w-3 h-3" />
              <span>UNS + FDI</span>
            </button>
            <button
              type="button"
              onClick={() => setNumberingSystem('universal')}
              className={cn(
                'px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer',
                numberingSystem === 'universal' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
              )}
              title="Sistema Universal Americano (1 a 32)"
            >
              UNS (1-32)
            </button>
            <button
              type="button"
              onClick={() => setNumberingSystem('fdi')}
              className={cn(
                'px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer',
                numberingSystem === 'fdi' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
              )}
              title="Federación Dental Internacional (11 a 48)"
            >
              FDI (11-48)
            </button>
          </div>

          {/* Toggles Encías / Hueso */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/80 shadow-xl">
            <button
              type="button"
              onClick={() => setShowGums(!showGums)}
              className={cn(
                'px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer',
                showGums ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : 'text-slate-400 hover:text-white'
              )}
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

      {/* OVERLAY DE CARGA */}
      {loadingModel && (
        <div className="absolute inset-0 z-30 bg-[#040711]/95 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-white">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold tracking-wide text-amber-300">
            Cargando arcada dental 3D anatómica (OrganUI BodyParts3D)...
          </p>
          <span className="text-xs text-slate-400">Indexando mallas Universal 1–32 y FDI 11–48</span>
        </div>
      )}

      {/* BADGE INFORMATIVO EN VIVO (CON NUMERACIÓN UNIVERSAL Y FDI) */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        {hoveredInfo ? (
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-amber-400/60 text-white shadow-2xl flex items-center gap-3 animate-in fade-in duration-150">
            {hoveredInfo.isInterproximal ? (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/30">
                ↔
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="px-2 py-1 rounded-xl bg-cyan-500 text-slate-950 font-black text-[11px] shadow-xs">
                  UNS #{hoveredInfo.universal}
                </div>
                <div className="px-2 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] shadow-xs">
                  FDI #{hoveredInfo.fdi}
                </div>
              </div>
            )}
            <div>
              <span className="text-xs font-bold block text-slate-100">
                {hoveredInfo.name}
              </span>
              <span className="text-[10px] text-amber-300 font-semibold block">
                {hoveredInfo.isInterproximal
                  ? 'Clic para abrir la Ventana Cristal y registrar patología de contacto compartida'
                  : 'Clic para abrir la Ventana Cristal en Modo Glassmorphism'}
              </span>
            </div>
          </div>
        ) : (
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Rotación 360° • Zoom • Clic en cualquier pieza o esfera interproximal para abrir la <strong>Ventana Cristal</strong>
            </span>
          </div>
        )}
      </div>

      {/* BADGE DE RENDIMIENTO & SUPABASE */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md">
        <Database className="w-3.5 h-3.5 text-cyan-300" />
        <span>OrganUI 3D • Supabase Sync • 26 Puntos Interproximales</span>
      </div>

      {/* =========================================================================
          VENTANA FLOTANTE EN MODO CRISTAL (GLASSMORPHISM)
          ========================================================================= */}
      {modalOpen && modalData && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[92%] overflow-y-auto bg-slate-900/90 backdrop-blur-2xl border-2 border-amber-400/60 shadow-[0_0_60px_rgba(245,158,11,0.25)] rounded-3xl p-6 text-white space-y-5">
            {/* Overlay de Notificación de Guardado */}
            {saveSuccessNotification && (
              <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center gap-3 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white">¡Historial Clínico Actualizado!</h4>
                <p className="text-xs text-slate-300 text-center max-w-xs">
                  Diagnóstico, desglose de caras y evolución persistidos en Supabase y expediente del paciente.
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
                  <div className="flex flex-col gap-1 items-center">
                    <span className="px-2.5 py-1 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs shadow-xs">
                      UNS #{modalData.toothUniversal}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                      FDI #{modalData.toothFdi}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {modalData.isInterproximal ? 'Contacto Interproximal' : 'Ventana Cristal 3D'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {modalData.taxonomy?.arch === 'upper' ? 'Maxilar Superior' : 'Mandíbula Inferior'} • Cuad. {modalData.taxonomy?.quadrant || 1}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {modalData.isInterproximal && modalData.pairFdi
                      ? `Punto de Contacto: FDI #${modalData.pairFdi[0]} ↔ #${modalData.pairFdi[1]} (UNS #${modalData.pairUniversal?.[0]} ↔ #${modalData.pairUniversal?.[1]})`
                      : modalData.taxonomy?.name || `Pieza Dental #${modalData.toothFdi}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Expediente: <strong className="text-slate-200">{patientName}</strong> • Sucursal: <strong className="text-amber-300">{branch}</strong>
                  </p>
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
                  <span>Desglose Anatómico de 5 Caras Dentales</span>
                </label>
                <span className="text-[10px] text-slate-400">Clic en cada cara para alternar patología</span>
              </div>

              {/* Matriz Visual de las 5 Caras (Cruz Anatómica) */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center gap-1.5">
                {/* Bucal / Vestibular (Superior) */}
                <button
                  type="button"
                  onClick={() => toggleModalSurface('vestibular')}
                  className={cn(
                    'w-40 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5',
                    modalData.activeSurfaces.vestibular === 'caries'
                      ? 'bg-rose-500/30 text-rose-300 border-rose-500/80 shadow-xs shadow-rose-500/30 font-black'
                      : modalData.activeSurfaces.vestibular === 'resina'
                      ? 'bg-blue-500/30 text-blue-300 border-blue-500/80 shadow-xs shadow-blue-500/30 font-black'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  )}
                >
                  <span>Bucal / Vestibular</span>
                  <span className="text-[10px] uppercase opacity-75">[{modalData.activeSurfaces.vestibular}]</span>
                </button>

                {/* Mesial - Oclusal/Incisal - Distal */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleModalSurface('mesial')}
                    className={cn(
                      'w-28 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center',
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
                      'w-36 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center',
                      modalData.activeSurfaces.oclusal === 'caries'
                        ? 'bg-rose-500/40 text-rose-200 border-rose-400 shadow-md shadow-rose-500/40 font-black'
                        : modalData.activeSurfaces.oclusal === 'resina'
                        ? 'bg-blue-500/40 text-blue-200 border-blue-400 shadow-md shadow-blue-500/40 font-black'
                        : 'bg-amber-400/20 text-amber-200 border-amber-400/50 hover:bg-amber-400/30'
                    )}
                  >
                    <span className="text-amber-300 font-black">
                      {modalData.taxonomy?.isAnterior ? 'Incisal' : 'Oclusal'}
                    </span>
                    <span className="text-[10px] uppercase opacity-80">[{modalData.activeSurfaces.oclusal}]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleModalSurface('distal')}
                    className={cn(
                      'w-28 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center',
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
                    'w-40 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5',
                    modalData.activeSurfaces.lingual === 'caries'
                      ? 'bg-rose-500/30 text-rose-300 border-rose-500/80 shadow-xs shadow-rose-500/30 font-black'
                      : modalData.activeSurfaces.lingual === 'resina'
                      ? 'bg-blue-500/30 text-blue-300 border-blue-500/80 shadow-xs shadow-blue-500/30 font-black'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  )}
                >
                  <span>{modalData.toothFdi <= 28 ? 'Palatino' : 'Lingual'}</span>
                  <span className="text-[10px] uppercase opacity-75">[{modalData.activeSurfaces.lingual}]</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: DIAGNÓSTICO / TRATAMIENTO */}
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
                    onClick={() => setModalData({ ...modalData, selectedCondition: item.id as ToothWholeCondition })}
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
                  placeholder="Detalles del procedimiento clínico..."
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

            {/* BOTONES DE ACCIÓN Y PERSISTENCIA */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Rol: <strong>{doctorRole.toUpperCase()}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isPersistingSupabase}
                  onClick={handleSaveModalData}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isPersistingSupabase ? 'Guardando en Supabase...' : 'Aplicar & Guardar en Supabase'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
