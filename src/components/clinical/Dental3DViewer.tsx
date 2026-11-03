'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  Plus,
  CheckCircle2,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TOOTH_BY_FDI,
  INTERPROXIMAL_CONTACTS,
  ORGANUI_MESH_TO_NUMBERS,
  ToothTaxonomy
} from '@/lib/dental-anatomy'
import {
  TREATMENT_CATALOG,
  SURFACE_COLORS,
  DentalSpecialty,
  SurfaceCondition,
  ToothWholeCondition,
  ToothSurfaces
} from '@/components/clinical/Odontogram'

export interface Dental3DViewerProps {
  selectedToothNum?: number // Representado en FDI (11-48)
  onSelectTooth?: (toothNum: number) => void
  teethState?: Record<number, any>
  patientId?: string
  patientName?: string
  doctorName?: string
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
  onHistoryUpdated?: () => void
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
  doctorName = 'Dra. Aura Estudillo',
  doctorRole = 'socio',
  branch = 'Sucursal Balbuena (Matriz)',
  onUpdateToothSurfaces,
  onAddTreatment,
  onHistoryUpdated,
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
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSpecialty, setModalSpecialty] = useState<DentalSpecialty>('operatoria')
  const [modalActiveTool, setModalActiveTool] = useState<SurfaceCondition>('caries')
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

  // 1. Abrir Modal Cristal para diente o contacto interproximal con enfoque y atenuación de fondo
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

      // Enfoque visual de cámara hacia la pieza seleccionada
      const mesh = teethMeshesRef.current.get(toothFdi)
      if (mesh && controlsRef.current && cameraRef.current) {
        const box = new THREE.Box3().setFromObject(mesh)
        const center = new THREE.Vector3()
        box.getCenter(center)

        controlsRef.current.target.set(center.x, center.y, center.z)
        cameraRef.current.position.set(center.x, center.y + 0.35, center.z + 1.25)
        controlsRef.current.update()
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
          ? `Punto de contacto entre piezas FDI #${pairFdi[0]} (UNS #${pairUniversal?.[0]}) y FDI #${pairFdi[1]} (UNS #${pairUniversal?.[1]}).`
          : `Tratamiento en pieza FDI #${toothFdi} (Universal #${toothUniversal}) — ${taxonomy?.name}.`,
        estimatedCost: 850,
        specialty: 'operatoria',
        procedure: isInterproximal
          ? 'Resina Estética 2 Caras (MO / DO)'
          : 'Resina Estética 1 Cara (Oclusal/Vestibular)'
      })
      setModalOpen(true)
    },
    [teethState]
  )

  // Cerrar modal y restablecer cámara general
  const handleCloseModal = () => {
    setModalOpen(false)
    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.set(0, -0.55, 0.55)
      cameraRef.current.position.set(0, 0.35, 3.2)
      controlsRef.current.update()
    }
  }

  // 2. Inicialización de la Escena Three.js con OrganUI teeth.glb
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 700
    const height = container.clientHeight || 580

    // Escena con Fondo Holográfico Quirúrgico Profundo
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040711)
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
    controls.minDistance = 1.1
    controls.target.set(0, -0.55, 0.55)
    controls.update()
    controlsRef.current = controls

    // ILUMINACIÓN MULTIDIRECCIONAL HOLOGRÁFICA
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.95)
    scene.add(ambientLight)

    // Luz Principal Quirúrgica
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.7)
    mainLight.position.set(3, 5, 5)
    scene.add(mainLight)

    // Luz Suave de Relleno Azul
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9)
    fillLight.position.set(-4, -2, 4)
    scene.add(fillLight)

    // Luz Rim Holográfica Cian Neón
    const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.6)
    cyanRim.position.set(0, 4, -4)
    scene.add(cyanRim)

    // Luz Rim Dorada Audenti
    const goldRim = new THREE.DirectionalLight(0xfbbf24, 0.9)
    goldRim.position.set(0, -5, 2)
    scene.add(goldRim)

    // Luz Intraoral
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

        // Terceros molares cordales (18, 28, 38, 48)
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

        // NODOS INTERPROXIMALES GLOWING
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

  // 3. ENFOQUE Y ATENUACIÓN DINÁMICA DEL MODELO 3D (REQUERIMIENTO DIRECTIVA 1)
  useEffect(() => {
    const activeTargetFdi = modalData?.toothFdi || selectedToothNum
    const activePairFdi = modalData?.pairFdi

    teethMeshesRef.current.forEach((mesh, fdi) => {
      const isSelected =
        activeTargetFdi === fdi ||
        (activePairFdi && (activePairFdi[0] === fdi || activePairFdi[1] === fdi))
      const toothState = teethState?.[fdi]
      const condition = toothState?.wholeCondition || 'sano'
      const isAbsent = condition === 'ausente'

      const mat = mesh.material as THREE.MeshStandardMaterial
      if (!mat) return

      if (renderMode === 'xray') {
        mat.transparent = true
        mat.wireframe = true
        if (activeTargetFdi) {
          mat.opacity = isSelected ? 0.95 : 0.18 // Atenuado en Rayos X
          mat.color.setHex(isSelected ? 0xf59e0b : 0x1e293b)
        } else {
          mat.opacity = 0.4
          mat.color.setHex(0x38bdf8)
        }
      } else {
        mat.wireframe = false

        // ATENUACIÓN DINÁMICA: Si hay una pieza seleccionada, atenuar el resto del modelo 3D
        if (activeTargetFdi) {
          if (isSelected) {
            mat.transparent = false
            mat.opacity = 1.0
            mat.color.setHex(0xf59e0b) // Resalte dorado Audenti
            mat.roughness = 0.12
            mesh.scale.set(1.18, 1.18, 1.18)
          } else {
            mat.transparent = true
            mat.opacity = 0.22 // Atenuado de fondo
            mat.color.setHex(0x334155) // Tono neutro apagado
            mat.roughness = 0.65
            mesh.scale.set(1.0, 1.0, 1.0)
          }
        } else {
          // Vista general sin atenuación
          mat.transparent = isAbsent
          mat.opacity = isAbsent ? 0.22 : 1.0
          const hex = CONDITION_COLORS[condition] || 0xfcfbfa
          mat.color.setHex(hex)
          mat.roughness = condition === 'sano' ? 0.2 : 0.4
          mesh.scale.set(1.0, 1.0, 1.0)
        }
      }
    })
  }, [selectedToothNum, modalData, teethState, renderMode])

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

  // APLICAR CONDICIÓN A UNA CARA Y AUTO-SINCRONIZAR CON SUPABASE
  const handleApplyFaceCondition = async (face: keyof ToothSurfaces, conditionToApply?: SurfaceCondition) => {
    if (!modalData) return

    const cond = conditionToApply || modalActiveTool
    const updatedSurfaces: ToothSurfaces = {
      ...modalData.activeSurfaces,
      [face]: cond
    }

    setModalData({
      ...modalData,
      activeSurfaces: updatedSurfaces
    })

    if (onUpdateToothSurfaces) {
      onUpdateToothSurfaces(modalData.toothFdi, updatedSurfaces, modalData.selectedCondition)
    }

    // Auto-sincronización con Supabase en segundo plano
    if (patientId) {
      try {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: modalData.toothFdi,
            toothUniversal: modalData.toothUniversal,
            surfaces: updatedSurfaces,
            condition: modalData.selectedCondition,
            procedure: `Ajuste clínico en cara ${face.toUpperCase()} (${cond})`,
            specialty: modalSpecialty,
            notes: modalData.notes,
            estimatedCost: modalData.estimatedCost,
            doctorRole,
            branch
          })
        })
      } catch (err) {
        console.warn('Auto-sync Supabase aviso:', err)
      }
    }
  }

  // VINCULAR TRATAMIENTO DEL CATÁLOGO DIRECTO A LA PIEZA (IDÉNTICO A IMAGEN 3)
  const handleLinkProcedure = async (procedureItem: { name: string; cost: number; condition: ToothWholeCondition }) => {
    if (!modalData) return

    setIsPersistingSupabase(true)

    // Ajustar caras según el procedimiento
    const updatedSurfaces = { ...modalData.activeSurfaces }
    if (procedureItem.condition === 'sano' && procedureItem.name.includes('Resina')) {
      if (procedureItem.name.includes('1 Cara')) {
        updatedSurfaces.oclusal = 'resina'
      } else if (procedureItem.name.includes('2 Caras')) {
        updatedSurfaces.oclusal = 'resina'
        updatedSurfaces.mesial = 'resina'
      } else if (procedureItem.name.includes('3+ Caras')) {
        updatedSurfaces.oclusal = 'resina'
        updatedSurfaces.mesial = 'resina'
        updatedSurfaces.distal = 'resina'
      }
    }

    const updatedCondition = procedureItem.condition !== 'sano' ? procedureItem.condition : modalData.selectedCondition

    setModalData({
      ...modalData,
      selectedCondition: updatedCondition,
      activeSurfaces: updatedSurfaces,
      procedure: procedureItem.name,
      estimatedCost: procedureItem.cost,
      specialty: modalSpecialty
    })

    // 1. Notificar a Odontogram
    if (onUpdateToothSurfaces) {
      onUpdateToothSurfaces(modalData.toothFdi, updatedSurfaces, updatedCondition)
    }

    if (onAddTreatment) {
      const treatedFaces = Object.entries(updatedSurfaces)
        .filter(([_, c]) => c !== 'sano')
        .map(([f]) => f)

      onAddTreatment({
        toothNumber: modalData.toothFdi,
        toothUniversal: modalData.toothUniversal,
        specialty: modalSpecialty,
        procedure: procedureItem.name,
        surfaces: treatedFaces.length > 0 ? treatedFaces : ['oclusal'],
        notes: `Vinculado desde Ventana Cristal: ${procedureItem.name}`,
        estimatedCost: procedureItem.cost,
        condition: updatedCondition
      })
    }

    // 2. Persistir directamente en Supabase
    if (patientId) {
      try {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: modalData.toothFdi,
            toothUniversal: modalData.toothUniversal,
            surfaces: updatedSurfaces,
            condition: updatedCondition,
            procedure: procedureItem.name,
            specialty: modalSpecialty,
            notes: modalData.notes,
            estimatedCost: procedureItem.cost,
            doctorName,
            doctorRole,
            branch
          })
        })
        if (onHistoryUpdated) {
          onHistoryUpdated()
        }
      } catch (err) {
        console.warn('Error al vincular en Supabase:', err)
      }
    }

    setIsPersistingSupabase(false)
    setSaveSuccessNotification(true)
    setTimeout(() => setSaveSuccessNotification(false), 1800)
  }

  // Guardar Cambios Finales
  const handleSaveModalData = async () => {
    if (!modalData) return

    setIsPersistingSupabase(true)

    const treatedFaces = Object.entries(modalData.activeSurfaces)
      .filter(([_, cond]) => cond !== 'sano')
      .map(([face]) => face)

    if (onUpdateToothSurfaces) {
      onUpdateToothSurfaces(modalData.toothFdi, modalData.activeSurfaces, modalData.selectedCondition)
    }

    if (onAddTreatment) {
      onAddTreatment({
        toothNumber: modalData.toothFdi,
        toothUniversal: modalData.toothUniversal,
        specialty: modalData.specialty,
        procedure: modalData.procedure,
        surfaces: treatedFaces.length > 0 ? treatedFaces : ['corona_completa'],
        notes: modalData.notes,
        estimatedCost: modalData.estimatedCost,
        condition: modalData.selectedCondition
      })
    }

    if (patientId) {
      try {
        await fetch('/api/clinical/odontogram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName,
            toothFdi: modalData.toothFdi,
            toothUniversal: modalData.toothUniversal,
            surfaces: modalData.activeSurfaces,
            condition: modalData.selectedCondition,
            procedure: modalData.procedure,
            specialty: modalData.specialty,
            notes: modalData.notes,
            estimatedCost: modalData.estimatedCost,
            doctorName,
            doctorRole,
            branch,
            fullTeethState: teethState
          })
        })
        if (onHistoryUpdated) {
          onHistoryUpdated()
        }
      } catch (err) {
        console.warn('Error al guardar en Supabase:', err)
      }
    }

    setIsPersistingSupabase(false)
    setSaveSuccessNotification(true)
    setTimeout(() => {
      setSaveSuccessNotification(false)
      handleCloseModal()
    }, 1200)
  }

  return (
    <>
      <div className={cn('relative w-full h-[620px] rounded-3xl bg-[#040711] border border-slate-800 shadow-2xl overflow-hidden flex flex-col', className)}>
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

        {/* Nomenclatura, Shading y Vistas */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
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
            >
              UNS
            </button>
            <button
              type="button"
              onClick={() => setNumberingSystem('fdi')}
              className={cn(
                'px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer',
                numberingSystem === 'fdi' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
              )}
            >
              FDI
            </button>
          </div>

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
          <span className="text-xs text-slate-400">Optimizando mallas y coordenadas FDI 11–48 y UNS 1–32</span>
        </div>
      )}

      {/* BADGE INFORMATIVO EN VIVO */}
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
                  : 'Clic para enfocar pieza, atenuar fondo y abrir la Ventana Cristal'}
              </span>
            </div>
          </div>
        ) : (
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Rotación 360° • Zoom • Clic en cualquier pieza o esfera interproximal para enfocar y abrir la <strong>Ventana Cristal</strong>
            </span>
          </div>
        )}
      </div>

      {/* BADGE DE RENDIMIENTO & SUPABASE */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shadow-md">
        <Database className="w-3.5 h-3.5 text-cyan-300" />
        <span>OrganUI 3D • Supabase Sync • 26 Puntos Interproximales</span>
      </div>
    </div>

    {/* =========================================================================
        MODAL FLOTANTE EN MODO CRISTAL (GLASSMORPHISM) - FUERA DE CONTENEDORES
        Teletransportado con React Portal directamente a document.body
        ========================================================================= */}
    {mounted && typeof document !== 'undefined' && modalOpen && modalData && createPortal(
      <div
        className="fixed inset-0 z-50 w-screen h-screen bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        onClick={handleCloseModal}
      >
        <div
          className="relative max-w-6xl w-[92vw] h-[88vh] bg-slate-950/95 backdrop-blur-2xl border border-amber-500/50 shadow-2xl rounded-2xl p-6 overflow-y-auto text-white flex flex-col justify-between space-y-5 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
            {/* Notificación de Guardado / Sincronización en Supabase */}
            {saveSuccessNotification && (
              <div className="absolute top-4 right-16 z-50 px-4 py-2 rounded-xl bg-emerald-500/95 text-white text-xs font-black shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Sincronizado en Supabase y Expediente</span>
              </div>
            )}

            {/* ENCABEZADO CON IDENTIFICACIÓN DUAL UNS / FDI */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                {modalData.isInterproximal ? (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    ↔
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 items-center">
                    <span className="px-2.5 py-0.5 rounded-xl bg-cyan-400 text-slate-950 font-black text-xs shadow-xs">
                      UNS #{modalData.toothUniversal}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                      FDI #{modalData.toothFdi}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {modalData.isInterproximal ? 'Contacto Interproximal' : 'Ventana Cristal 3D'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {modalData.taxonomy?.arch === 'upper' ? 'Maxilar Superior' : 'Mandíbula Inferior'} • Cuadrante {modalData.taxonomy?.quadrant || 1} FDI
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {modalData.selectedCondition.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white mt-0.5">
                    {modalData.isInterproximal && modalData.pairFdi
                      ? `Punto de Contacto: FDI #${modalData.pairFdi[0]} ↔ #${modalData.pairFdi[1]} (UNS #${modalData.pairUniversal?.[0]} ↔ #${modalData.pairUniversal?.[1]})`
                      : modalData.taxonomy?.name || `Pieza Dental #${modalData.toothFdi}`}
                  </h3>

                  <p className="text-xs text-slate-400">
                    Expediente: <strong className="text-slate-200">{patientName}</strong> • Sucursal: <strong className="text-amber-300">{branch}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar y restablecer arcada"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENIDO PRINCIPAL: 2 COLUMNAS (DESGLOSE 5 CARAS + ESPECIALIDADES / PROCEDIMIENTOS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* COLUMNA IZQUIERDA: ZOOM ANATÓMICO DE 5 CARAS (IDÉNTICO A CONCEPTO IMAGEN 2) */}
              <div className="lg:col-span-6 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Desglose Anatómico de 5 Caras
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Clic en cara para aplicar</span>
                </div>

                {/* Paleta rápida de condiciones activas */}
                <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800">
                  {(['caries', 'resina', 'amalgama', 'sellador', 'fractura', 'incrustacion', 'sano'] as SurfaceCondition[]).map(cond => {
                    const info = SURFACE_COLORS[cond]
                    const isActive = modalActiveTool === cond
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setModalActiveTool(cond)}
                        className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1',
                          isActive
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                            : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: info.fill, borderColor: info.stroke }} />
                        <span>{info.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>

                {/* CRUCETA ANATÓMICA GEOMÉTRICA INTERACTIVA DE 5 CARAS */}
                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3 flex flex-col items-center justify-center relative shadow-inner">
                  <div className="w-full flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-mono uppercase text-slate-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Cruceta Anatómica Clínica</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-black">
                      1-Clic: Aplicar {SURFACE_COLORS[modalActiveTool].label.split(' ')[0]}
                    </span>
                  </div>

                  <svg viewBox="0 0 200 200" className="w-44 h-44 drop-shadow-[0_0_20px_rgba(56,189,248,0.2)] select-none">
                    {/* Fondo oscuro contenedor */}
                    <rect x="10" y="10" width="180" height="180" rx="16" fill="#020617" stroke="#334155" strokeWidth="2" />

                    {/* Bucal / Vestibular (Arriba) */}
                    <polygon
                      points="20,20 180,20 135,65 65,65"
                      fill={SURFACE_COLORS[modalData.activeSurfaces.vestibular].fill}
                      stroke={SURFACE_COLORS[modalData.activeSurfaces.vestibular].stroke}
                      strokeWidth="2.5"
                      className="cursor-pointer hover:brightness-125 transition-all"
                      onClick={() => handleApplyFaceCondition('vestibular')}
                    />
                    <text
                      x="100"
                      y="46"
                      textAnchor="middle"
                      fill={modalData.activeSurfaces.vestibular === 'sano' ? '#0f172a' : '#ffffff'}
                      fontSize="9.5"
                      fontWeight="900"
                      pointerEvents="none"
                      letterSpacing="0.5"
                    >
                      ▲ VESTIBULAR
                    </text>

                    {/* Lingual / Palatino (Abajo) */}
                    <polygon
                      points="65,135 135,135 180,180 20,180"
                      fill={SURFACE_COLORS[modalData.activeSurfaces.lingual].fill}
                      stroke={SURFACE_COLORS[modalData.activeSurfaces.lingual].stroke}
                      strokeWidth="2.5"
                      className="cursor-pointer hover:brightness-125 transition-all"
                      onClick={() => handleApplyFaceCondition('lingual')}
                    />
                    <text
                      x="100"
                      y="162"
                      textAnchor="middle"
                      fill={modalData.activeSurfaces.lingual === 'sano' ? '#0f172a' : '#ffffff'}
                      fontSize="9.5"
                      fontWeight="900"
                      pointerEvents="none"
                      letterSpacing="0.5"
                    >
                      ▼ {modalData.toothFdi >= 31 && modalData.toothFdi <= 48 ? 'LINGUAL' : 'PALATINO'}
                    </text>

                    {/* Mesial (Izquierda) */}
                    <polygon
                      points="20,20 65,65 65,135 20,180"
                      fill={SURFACE_COLORS[modalData.activeSurfaces.mesial].fill}
                      stroke={SURFACE_COLORS[modalData.activeSurfaces.mesial].stroke}
                      strokeWidth="2.5"
                      className="cursor-pointer hover:brightness-125 transition-all"
                      onClick={() => handleApplyFaceCondition('mesial')}
                    />
                    <text
                      x="44"
                      y="104"
                      textAnchor="middle"
                      fill={modalData.activeSurfaces.mesial === 'sano' ? '#0f172a' : '#ffffff'}
                      fontSize="9.5"
                      fontWeight="900"
                      pointerEvents="none"
                      transform="rotate(-90 44 104)"
                      letterSpacing="0.5"
                    >
                      ◀ MESIAL
                    </text>

                    {/* Distal (Derecha) */}
                    <polygon
                      points="135,65 180,20 180,180 135,135"
                      fill={SURFACE_COLORS[modalData.activeSurfaces.distal].fill}
                      stroke={SURFACE_COLORS[modalData.activeSurfaces.distal].stroke}
                      strokeWidth="2.5"
                      className="cursor-pointer hover:brightness-125 transition-all"
                      onClick={() => handleApplyFaceCondition('distal')}
                    />
                    <text
                      x="156"
                      y="104"
                      textAnchor="middle"
                      fill={modalData.activeSurfaces.distal === 'sano' ? '#0f172a' : '#ffffff'}
                      fontSize="9.5"
                      fontWeight="900"
                      pointerEvents="none"
                      transform="rotate(90 156 104)"
                      letterSpacing="0.5"
                    >
                      DISTAL ▶
                    </text>

                    {/* Oclusal / Incisal (Centro) */}
                    <rect
                      x="65"
                      y="65"
                      width="70"
                      height="70"
                      rx="8"
                      fill={SURFACE_COLORS[modalData.activeSurfaces.oclusal].fill}
                      stroke={SURFACE_COLORS[modalData.activeSurfaces.oclusal].stroke}
                      strokeWidth="3"
                      className="cursor-pointer hover:brightness-125 transition-all"
                      onClick={() => handleApplyFaceCondition('oclusal')}
                    />
                    <text
                      x="100"
                      y="98"
                      textAnchor="middle"
                      fill={modalData.activeSurfaces.oclusal === 'sano' ? '#0f172a' : '#ffffff'}
                      fontSize="9.5"
                      fontWeight="900"
                      pointerEvents="none"
                    >
                      ⬢ {modalData.taxonomy?.isAnterior ? 'INCISAL' : 'OCLUSAL'}
                    </text>
                    <text
                      x="100"
                      y="111"
                      textAnchor="middle"
                      fill={modalData.activeSurfaces.oclusal === 'sano' ? '#475569' : '#fef08a'}
                      fontSize="7.5"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      CENTRO
                    </text>
                  </svg>
                </div>

                {/* TARJETAS ESTILIZADAS CON ICONOS DIRECCIONALES (5 CARAS) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      key: 'oclusal' as const,
                      icon: '⬢',
                      iconColor: 'text-amber-400',
                      label: modalData.taxonomy?.isAnterior ? 'Incisal / Oclusal' : 'Oclusal',
                      sub: modalData.taxonomy?.isAnterior ? 'Borde incisal' : 'Masticatoria'
                    },
                    {
                      key: 'vestibular' as const,
                      icon: '▲',
                      iconColor: 'text-cyan-400',
                      label: 'Bucal / Vestibular',
                      sub: modalData.toothFdi >= 31 && modalData.toothFdi <= 48 ? 'Inferior (Labial)' : 'Superior (Labial)'
                    },
                    {
                      key: 'lingual' as const,
                      icon: '▼',
                      iconColor: 'text-purple-400',
                      label: modalData.toothFdi >= 31 && modalData.toothFdi <= 48 ? 'Lingual' : 'Palatino',
                      sub: modalData.toothFdi >= 31 && modalData.toothFdi <= 48 ? 'Hacia lengua' : 'Hacia paladar'
                    },
                    {
                      key: 'mesial' as const,
                      icon: '◀',
                      iconColor: 'text-emerald-400',
                      label: 'Mesial',
                      sub: 'Hacia línea media'
                    },
                    {
                      key: 'distal' as const,
                      icon: '▶',
                      iconColor: 'text-rose-400',
                      label: 'Distal',
                      sub: 'Hacia posterior'
                    }
                  ].map(face => {
                    const currentCond = modalData.activeSurfaces[face.key]
                    const info = SURFACE_COLORS[currentCond]
                    return (
                      <div
                        key={face.key}
                        onClick={() => handleApplyFaceCondition(face.key)}
                        className={cn(
                          'p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none hover:scale-[1.01] active:scale-[0.99]',
                          currentCond !== 'sano'
                            ? 'bg-slate-900 border-amber-400/80 shadow-xs shadow-amber-500/10'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                            <span className={cn('text-xs font-black', face.iconColor)}>{face.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate leading-tight">{face.label}</span>
                            <span className="text-[9.5px] text-slate-400 block truncate">{face.sub}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full border shadow-2xs shrink-0"
                            style={{ backgroundColor: info.fill, borderColor: info.stroke }}
                          />
                          <span className={cn(
                            'text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md',
                            currentCond === 'sano' ? 'bg-slate-800 text-slate-400' : 'bg-amber-400 text-slate-950'
                          )}>
                            {info.label.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* COLUMNA DERECHA: CATÁLOGO POR ESPECIALIDAD & VINCULACIÓN (IDÉNTICO A IMAGEN 2 Y 3) */}
              <div className="lg:col-span-6 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      Especialidades &amp; Procedimientos
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">Autoguardado en Supabase</span>
                  </div>

                  {/* Selector Rápido de Tratamientos Clave (Composite, Crown, Root Canal, Extraction) */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/80 mb-2.5 overflow-x-auto">
                    <span className="text-[10px] font-black uppercase text-amber-300 px-1.5 shrink-0">Tratamientos:</span>
                    {[
                      { label: 'Composite', spec: 'operatoria' as DentalSpecialty },
                      { label: 'Crown', spec: 'implantes' as DentalSpecialty },
                      { label: 'Root Canal', spec: 'endodoncia' as DentalSpecialty },
                      { label: 'Extraction', spec: 'cirugia' as DentalSpecialty }
                    ].map(btn => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setModalSpecialty(btn.spec)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0',
                          modalSpecialty === btn.spec
                            ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-300'
                            : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700'
                        )}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Tabs de Especialidades Odontológicas */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-3">
                    {(['operatoria', 'endodoncia', 'periodoncia', 'implantes', 'ortodoncia', 'cirugia'] as DentalSpecialty[]).map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => setModalSpecialty(spec)}
                        className={cn(
                          'py-1.5 px-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer text-center',
                          modalSpecialty === spec
                            ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        )}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>

                  {/* Listado de Procedimientos Vinculables (Estilo Tarjetas Imagen 3) */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {TREATMENT_CATALOG[modalSpecialty].map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 hover:border-amber-400/60 transition-colors flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div>
                          <span className="text-xs font-bold text-white block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-xs font-black text-emerald-400 font-mono block mt-0.5">
                            ${item.cost.toLocaleString('es-MX')} MXN
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLinkProcedure(item)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap shadow-sm active:scale-95"
                          title="Vincular a esta pieza y sincronizar con Supabase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Vincular</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* NOTAS Y PRESUPUESTO */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Notas Clínicas</label>
                      <input
                        type="text"
                        value={modalData.notes}
                        onChange={(e) => setModalData({ ...modalData, notes: e.target.value })}
                        placeholder="Observación clínica..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Costo ($MXN)</label>
                      <input
                        type="number"
                        value={modalData.estimatedCost}
                        onChange={(e) => setModalData({ ...modalData, estimatedCost: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold focus:outline-hidden focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTONES DE PIE DE MODAL */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Rol: <strong>{doctorRole.toUpperCase()}</strong> • Supabase Live Sync</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  disabled={isPersistingSupabase}
                  onClick={handleSaveModalData}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isPersistingSupabase ? 'Guardando en Supabase...' : 'Guardar en Expediente & Supabase'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
