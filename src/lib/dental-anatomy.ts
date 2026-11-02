/**
 * Catálogo Anatómico Dental Audenti Cloud Pro (2027)
 * Estandarización Universal (UNS 1-32) y FDI (11-48)
 * Basado en OrganUI BodyParts3D FMA 4.3
 */

export interface ToothTaxonomy {
  universal: number
  fdi: number
  name: string
  arch: 'upper' | 'lower'
  quadrant: 1 | 2 | 3 | 4
  side: 'right' | 'left'
  kind: string
  isAnterior: boolean
  organUiMeshName: string
  description: string
}

export const TOOTH_CATALOG_LIST: ToothTaxonomy[] = [
  // --- MAXILAR SUPERIOR DERECHO (Cuadrante 1 FDI) ---
  {
    universal: 1,
    fdi: 18,
    name: 'Tercer Molar Superior Derecho (Cordal)',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Tercer Molar',
    isAnterior: false,
    organUiMeshName: 'upper-right-third-molar',
    description: 'Tercer molar superior derecho. Pieza cordal posterior para trituración.'
  },
  {
    universal: 2,
    fdi: 17,
    name: 'Segundo Molar Superior Derecho',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Segundo Molar',
    isAnterior: false,
    organUiMeshName: 'upper-right-second-molar',
    description: 'Segundo molar superior derecho con 4 cúspides y 3 raíces anatómicas.'
  },
  {
    universal: 3,
    fdi: 16,
    name: 'Primer Molar Superior Derecho',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Primer Molar',
    isAnterior: false,
    organUiMeshName: 'upper-right-first-molar',
    description: 'Primer molar superior derecho permanente (llave de oclusión molar de Angle).'
  },
  {
    universal: 4,
    fdi: 15,
    name: 'Segundo Premolar Superior Derecho',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Segundo Premolar',
    isAnterior: false,
    organUiMeshName: 'upper-right-second-premolar',
    description: 'Segundo premolar superior derecho bicuspídeo de soporte oclusal.'
  },
  {
    universal: 5,
    fdi: 14,
    name: 'Primer Premolar Superior Derecho',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Primer Premolar',
    isAnterior: false,
    organUiMeshName: 'upper-right-first-premolar',
    description: 'Primer premolar superior derecho con dos raíces y dos cúspides nítidas.'
  },
  {
    universal: 6,
    fdi: 13,
    name: 'Canino Superior Derecho',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Canino',
    isAnterior: true,
    organUiMeshName: 'upper-right-canine',
    description: 'Canino superior derecho. Guía canina y raíz más larga de la arcada.'
  },
  {
    universal: 7,
    fdi: 12,
    name: 'Incisivo Lateral Superior Derecho',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Incisivo Lateral',
    isAnterior: true,
    organUiMeshName: 'upper-right-lateral-incisor',
    description: 'Incisivo lateral superior derecho de corte estético anterior.'
  },
  {
    universal: 8,
    fdi: 11,
    name: 'Incisivo Central Superior Derecho',
    arch: 'upper',
    quadrant: 1,
    side: 'right',
    kind: 'Incisivo Central',
    isAnterior: true,
    organUiMeshName: 'upper-right-central-incisor',
    description: 'Incisivo central superior derecho. Pieza protagónica de la sonrisa.'
  },

  // --- MAXILAR SUPERIOR IZQUIERDO (Cuadrante 2 FDI) ---
  {
    universal: 9,
    fdi: 21,
    name: 'Incisivo Central Superior Izquierdo',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Incisivo Central',
    isAnterior: true,
    organUiMeshName: 'upper-left-central-incisor',
    description: 'Incisivo central superior izquierdo. Pieza protagónica de la sonrisa.'
  },
  {
    universal: 10,
    fdi: 22,
    name: 'Incisivo Lateral Superior Izquierdo',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Incisivo Lateral',
    isAnterior: true,
    organUiMeshName: 'upper-left-lateral-incisor',
    description: 'Incisivo lateral superior izquierdo de corte estético anterior.'
  },
  {
    universal: 11,
    fdi: 23,
    name: 'Canino Superior Izquierdo',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Canino',
    isAnterior: true,
    organUiMeshName: 'upper-left-canine',
    description: 'Canino superior izquierdo. Guía canina y desoclusión lateral.'
  },
  {
    universal: 12,
    fdi: 24,
    name: 'Primer Premolar Superior Izquierdo',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Primer Premolar',
    isAnterior: false,
    organUiMeshName: 'upper-left-first-premolar',
    description: 'Primer premolar superior izquierdo con cúspide vestibular y palatina.'
  },
  {
    universal: 13,
    fdi: 25,
    name: 'Segundo Premolar Superior Izquierdo',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Segundo Premolar',
    isAnterior: false,
    organUiMeshName: 'upper-left-second-premolar',
    description: 'Segundo premolar superior izquierdo con surco de desarrollo central.'
  },
  {
    universal: 14,
    fdi: 26,
    name: 'Primer Molar Superior Izquierdo',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Primer Molar',
    isAnterior: false,
    organUiMeshName: 'upper-left-first-molar',
    description: 'Primer molar superior izquierdo con tubérculo de Carabelli.'
  },
  {
    universal: 15,
    fdi: 27,
    name: 'Segundo Molar Superior Izquierdo',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Segundo Molar',
    isAnterior: false,
    organUiMeshName: 'upper-left-second-molar',
    description: 'Segundo molar superior izquierdo con cara oclusal romboidal.'
  },
  {
    universal: 16,
    fdi: 28,
    name: 'Tercer Molar Superior Izquierdo (Cordal)',
    arch: 'upper',
    quadrant: 2,
    side: 'left',
    kind: 'Tercer Molar',
    isAnterior: false,
    organUiMeshName: 'upper-left-third-molar',
    description: 'Tercer molar superior izquierdo cordal.'
  },

  // --- MANDÍBULA INFERIOR IZQUIERDA (Cuadrante 3 FDI) ---
  {
    universal: 17,
    fdi: 38,
    name: 'Tercer Molar Inferior Izquierdo (Cordal)',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Tercer Molar',
    isAnterior: false,
    organUiMeshName: 'lower-left-third-molar',
    description: 'Tercer molar inferior izquierdo. Frecuentemente evaluado para exodoncia quirúrgica.'
  },
  {
    universal: 18,
    fdi: 37,
    name: 'Segundo Molar Inferior Izquierdo',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Segundo Molar',
    isAnterior: false,
    organUiMeshName: 'lower-left-second-molar',
    description: 'Segundo molar inferior izquierdo con patrón oclusal en cruz (+).'
  },
  {
    universal: 19,
    fdi: 36,
    name: 'Primer Molar Inferior Izquierdo',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Primer Molar',
    isAnterior: false,
    organUiMeshName: 'lower-left-first-molar',
    description: 'Primer molar inferior izquierdo con 5 cúspides y dos raíces divergentes.'
  },
  {
    universal: 20,
    fdi: 35,
    name: 'Segundo Premolar Inferior Izquierdo',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Segundo Premolar',
    isAnterior: false,
    organUiMeshName: 'lower-left-second-premolar',
    description: 'Segundo premolar inferior izquierdo frecuentemente tricuspídeo en Y.'
  },
  {
    universal: 21,
    fdi: 34,
    name: 'Primer Premolar Inferior Izquierdo',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Primer Premolar',
    isAnterior: false,
    organUiMeshName: 'lower-left-first-premolar',
    description: 'Primer premolar inferior izquierdo con cúspide lingual rudimentaria.'
  },
  {
    universal: 22,
    fdi: 33,
    name: 'Canino Inferior Izquierdo',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Canino',
    isAnterior: true,
    organUiMeshName: 'lower-left-canine',
    description: 'Canino inferior izquierdo con vertiente mesial incisal suave.'
  },
  {
    universal: 23,
    fdi: 32,
    name: 'Incisivo Lateral Inferior Izquierdo',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Incisivo Lateral',
    isAnterior: true,
    organUiMeshName: 'lower-left-lateral-incisor',
    description: 'Incisivo lateral inferior izquierdo ligeramente más amplio que el central.'
  },
  {
    universal: 24,
    fdi: 31,
    name: 'Incisivo Central Inferior Izquierdo',
    arch: 'lower',
    quadrant: 3,
    side: 'left',
    kind: 'Incisivo Central',
    isAnterior: true,
    organUiMeshName: 'lower-left-central-incisor',
    description: 'Incisivo central inferior izquierdo. Pieza más pequeña y simétrica del cuerpo humano.'
  },

  // --- MANDÍBULA INFERIOR DERECHA (Cuadrante 4 FDI) ---
  {
    universal: 25,
    fdi: 41,
    name: 'Incisivo Central Inferior Derecho',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Incisivo Central',
    isAnterior: true,
    organUiMeshName: 'lower-right-central-incisor',
    description: 'Incisivo central inferior derecho. Pieza más pequeña y simétrica del cuerpo humano.'
  },
  {
    universal: 26,
    fdi: 42,
    name: 'Incisivo Lateral Inferior Derecho',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Incisivo Lateral',
    isAnterior: true,
    organUiMeshName: 'lower-right-lateral-incisor',
    description: 'Incisivo lateral inferior derecho.'
  },
  {
    universal: 27,
    fdi: 43,
    name: 'Canino Inferior Derecho',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Canino',
    isAnterior: true,
    organUiMeshName: 'lower-right-canine',
    description: 'Canino inferior derecho para desoclusión y guía de caninos.'
  },
  {
    universal: 28,
    fdi: 44,
    name: 'Primer Premolar Inferior Derecho',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Primer Premolar',
    isAnterior: false,
    organUiMeshName: 'lower-right-first-premolar',
    description: 'Primer premolar inferior derecho.'
  },
  {
    universal: 29,
    fdi: 45,
    name: 'Segundo Premolar Inferior Derecho',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Segundo Premolar',
    isAnterior: false,
    organUiMeshName: 'lower-right-second-premolar',
    description: 'Segundo premolar inferior derecho.'
  },
  {
    universal: 30,
    fdi: 46,
    name: 'Primer Molar Inferior Derecho',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Primer Molar',
    isAnterior: false,
    organUiMeshName: 'lower-right-first-molar',
    description: 'Primer molar inferior derecho con 5 cúspides prominentes.'
  },
  {
    universal: 31,
    fdi: 47,
    name: 'Segundo Molar Inferior Derecho',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Segundo Molar',
    isAnterior: false,
    organUiMeshName: 'lower-right-second-molar',
    description: 'Segundo molar inferior derecho.'
  },
  {
    universal: 32,
    fdi: 48,
    name: 'Tercer Molar Inferior Derecho (Cordal)',
    arch: 'lower',
    quadrant: 4,
    side: 'right',
    kind: 'Tercer Molar',
    isAnterior: false,
    organUiMeshName: 'lower-right-third-molar',
    description: 'Tercer molar inferior derecho cordal.'
  }
]

// Índices rápidos por FDI y por Universal
export const TOOTH_BY_FDI: Record<number, ToothTaxonomy> = {}
export const TOOTH_BY_UNIVERSAL: Record<number, ToothTaxonomy> = {}
export const MESH_NAME_TO_TOOTH: Record<string, ToothTaxonomy> = {}

TOOTH_CATALOG_LIST.forEach((t) => {
  TOOTH_BY_FDI[t.fdi] = t
  TOOTH_BY_UNIVERSAL[t.universal] = t
  MESH_NAME_TO_TOOTH[t.organUiMeshName] = t
})

// Mapeo entre mallas nativas de OrganUI teeth.glb y numeraciones
export const ORGANUI_MESH_TO_NUMBERS: Record<string, { fdi: number; universal: number }> = {
  'upper-right-central-incisor': { fdi: 11, universal: 8 },
  'upper-right-lateral-incisor': { fdi: 12, universal: 7 },
  'upper-right-canine': { fdi: 13, universal: 6 },
  'upper-right-first-premolar': { fdi: 14, universal: 5 },
  'upper-right-second-premolar': { fdi: 15, universal: 4 },
  'upper-right-first-molar': { fdi: 16, universal: 3 },
  'upper-right-second-molar': { fdi: 17, universal: 2 },
  'upper-left-central-incisor': { fdi: 21, universal: 9 },
  'upper-left-lateral-incisor': { fdi: 22, universal: 10 },
  'upper-left-canine': { fdi: 23, universal: 11 },
  'upper-left-first-premolar': { fdi: 24, universal: 12 },
  'upper-left-second-premolar': { fdi: 25, universal: 13 },
  'upper-left-first-molar': { fdi: 26, universal: 14 },
  'upper-left-second-molar': { fdi: 27, universal: 15 },
  'lower-left-central-incisor': { fdi: 31, universal: 24 },
  'lower-left-lateral-incisor': { fdi: 32, universal: 23 },
  'lower-left-canine': { fdi: 33, universal: 22 },
  'lower-left-first-premolar': { fdi: 34, universal: 21 },
  'lower-left-second-premolar': { fdi: 35, universal: 20 },
  'lower-left-first-molar': { fdi: 36, universal: 19 },
  'lower-left-second-molar': { fdi: 37, universal: 18 },
  'lower-right-central-incisor': { fdi: 41, universal: 25 },
  'lower-right-lateral-incisor': { fdi: 42, universal: 26 },
  'lower-right-canine': { fdi: 43, universal: 27 },
  'lower-right-first-premolar': { fdi: 44, universal: 28 },
  'lower-right-second-premolar': { fdi: 45, universal: 29 },
  'lower-right-first-molar': { fdi: 46, universal: 30 },
  'lower-right-second-molar': { fdi: 47, universal: 31 }
}

// Contactos Interproximales: pares ordenados con clave FDI y Universal
export interface InterproximalContactPoint {
  key: string
  fdiPair: [number, number]
  universalPair: [number, number]
  arch: 'upper' | 'lower'
  isMidline: boolean
  label: string
}

export const INTERPROXIMAL_CONTACTS: InterproximalContactPoint[] = [
  // Arcada Superior
  { key: '18-17', fdiPair: [18, 17], universalPair: [1, 2], arch: 'upper', isMidline: false, label: 'Contacto 18 ↔ 17 (UNS #1 ↔ #2)' },
  { key: '17-16', fdiPair: [17, 16], universalPair: [2, 3], arch: 'upper', isMidline: false, label: 'Contacto 17 ↔ 16 (UNS #2 ↔ #3)' },
  { key: '16-15', fdiPair: [16, 15], universalPair: [3, 4], arch: 'upper', isMidline: false, label: 'Contacto 16 ↔ 15 (UNS #3 ↔ #4)' },
  { key: '15-14', fdiPair: [15, 14], universalPair: [4, 5], arch: 'upper', isMidline: false, label: 'Contacto 15 ↔ 14 (UNS #4 ↔ #5)' },
  { key: '14-13', fdiPair: [14, 13], universalPair: [5, 6], arch: 'upper', isMidline: false, label: 'Contacto 14 ↔ 13 (UNS #5 ↔ #6)' },
  { key: '13-12', fdiPair: [13, 12], universalPair: [6, 7], arch: 'upper', isMidline: false, label: 'Contacto 13 ↔ 12 (UNS #6 ↔ #7)' },
  { key: '12-11', fdiPair: [12, 11], universalPair: [7, 8], arch: 'upper', isMidline: false, label: 'Contacto 12 ↔ 11 (UNS #7 ↔ #8)' },
  { key: '11-21', fdiPair: [11, 21], universalPair: [8, 9], arch: 'upper', isMidline: true, label: 'Línea Media Superior: 11 ↔ 21 (UNS #8 ↔ #9)' },
  { key: '21-22', fdiPair: [21, 22], universalPair: [9, 10], arch: 'upper', isMidline: false, label: 'Contacto 21 ↔ 22 (UNS #9 ↔ #10)' },
  { key: '22-23', fdiPair: [22, 23], universalPair: [10, 11], arch: 'upper', isMidline: false, label: 'Contacto 22 ↔ 23 (UNS #10 ↔ #11)' },
  { key: '23-24', fdiPair: [23, 24], universalPair: [11, 12], arch: 'upper', isMidline: false, label: 'Contacto 23 ↔ 24 (UNS #11 ↔ #12)' },
  { key: '24-25', fdiPair: [24, 25], universalPair: [12, 13], arch: 'upper', isMidline: false, label: 'Contacto 24 ↔ 25 (UNS #12 ↔ #13)' },
  { key: '25-26', fdiPair: [25, 26], universalPair: [13, 14], arch: 'upper', isMidline: false, label: 'Contacto 25 ↔ 26 (UNS #13 ↔ #14)' },
  { key: '26-27', fdiPair: [26, 27], universalPair: [14, 15], arch: 'upper', isMidline: false, label: 'Contacto 26 ↔ 27 (UNS #14 ↔ #15)' },
  { key: '27-28', fdiPair: [27, 28], universalPair: [15, 16], arch: 'upper', isMidline: false, label: 'Contacto 27 ↔ 28 (UNS #15 ↔ #16)' },

  // Arcada Inferior
  { key: '48-47', fdiPair: [48, 47], universalPair: [32, 31], arch: 'lower', isMidline: false, label: 'Contacto 48 ↔ 47 (UNS #32 ↔ #31)' },
  { key: '47-46', fdiPair: [47, 46], universalPair: [31, 30], arch: 'lower', isMidline: false, label: 'Contacto 47 ↔ 46 (UNS #31 ↔ #30)' },
  { key: '46-45', fdiPair: [46, 45], universalPair: [30, 29], arch: 'lower', isMidline: false, label: 'Contacto 46 ↔ 45 (UNS #30 ↔ #29)' },
  { key: '45-44', fdiPair: [45, 44], universalPair: [29, 28], arch: 'lower', isMidline: false, label: 'Contacto 45 ↔ 44 (UNS #29 ↔ #28)' },
  { key: '44-43', fdiPair: [44, 43], universalPair: [28, 27], arch: 'lower', isMidline: false, label: 'Contacto 44 ↔ 43 (UNS #28 ↔ #27)' },
  { key: '43-42', fdiPair: [43, 42], universalPair: [27, 26], arch: 'lower', isMidline: false, label: 'Contacto 43 ↔ 42 (UNS #27 ↔ #26)' },
  { key: '42-41', fdiPair: [42, 41], universalPair: [26, 25], arch: 'lower', isMidline: false, label: 'Contacto 42 ↔ 41 (UNS #26 ↔ #25)' },
  { key: '41-31', fdiPair: [41, 31], universalPair: [25, 24], arch: 'lower', isMidline: true, label: 'Línea Media Inferior: 41 ↔ 31 (UNS #25 ↔ #24)' },
  { key: '31-32', fdiPair: [31, 32], universalPair: [24, 23], arch: 'lower', isMidline: false, label: 'Contacto 31 ↔ 32 (UNS #24 ↔ #23)' },
  { key: '32-33', fdiPair: [32, 33], universalPair: [23, 22], arch: 'lower', isMidline: false, label: 'Contacto 32 ↔ 33 (UNS #23 ↔ #22)' },
  { key: '33-34', fdiPair: [33, 34], universalPair: [22, 21], arch: 'lower', isMidline: false, label: 'Contacto 33 ↔ 34 (UNS #22 ↔ #21)' },
  { key: '34-35', fdiPair: [34, 35], universalPair: [21, 20], arch: 'lower', isMidline: false, label: 'Contacto 34 ↔ 35 (UNS #21 ↔ #20)' },
  { key: '35-36', fdiPair: [35, 36], universalPair: [20, 19], arch: 'lower', isMidline: false, label: 'Contacto 35 ↔ 36 (UNS #20 ↔ #19)' },
  { key: '36-37', fdiPair: [36, 37], universalPair: [19, 18], arch: 'lower', isMidline: false, label: 'Contacto 36 ↔ 37 (UNS #19 ↔ #18)' },
  { key: '37-38', fdiPair: [37, 38], universalPair: [18, 17], arch: 'lower', isMidline: false, label: 'Contacto 37 ↔ 38 (UNS #18 ↔ #17)' }
]
