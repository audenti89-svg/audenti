import { create } from 'zustand'

export type BranchId = 'all' | 'balbuena' | 'guadalupe-chalma'

export interface BranchInfo {
  id: BranchId
  name: string
  code: string
  address: string
  doctorInCharge: string
  phone: string
  isUpcoming?: boolean
  statusBadge: string
}

export const BRANCHES_DATA: Record<BranchId, BranchInfo> = {
  all: {
    id: 'all',
    name: 'Todas las Sedes (Consolidado)',
    code: 'DCL-ALL-00',
    address: 'Sucursal Balbuena & Sucursal Chalma de Guadalupe',
    doctorInCharge: 'Dra. Aura Estudillo (Dirección General)',
    phone: '+52 55 2242 7769',
    statusBadge: 'Red Integral • Todas las Sedes',
  },
  balbuena: {
    id: 'balbuena',
    name: 'Sucursal Balbuena (Matriz)',
    code: 'DCL-BLB-01',
    address: 'Av. del Taller & Retorno 12, Jardín Balbuena, CDMX',
    doctorInCharge: 'Dra. Aura Estudillo (Céd. Prof. 8492019)',
    phone: '+52 55 5764 8810',
    statusBadge: 'Operativa • Sede Matriz Principal',
  },
  'guadalupe-chalma': {
    id: 'guadalupe-chalma',
    name: 'Sucursal Chalma de Guadalupe',
    code: 'DCL-CHM-02',
    address: 'Av. Guadalupe Victoria 45, Gustavo A. Madero, CDMX',
    doctorInCharge: 'Dra. Aura Estudillo (Céd. Prof. 8492019)',
    phone: '+52 55 5389 1204',
    statusBadge: 'Operativa • Franquicia Clínica',
  },
}

interface BranchStore {
  currentBranchId: BranchId
  setBranchId: (id: BranchId) => void
  getCurrentBranch: () => BranchInfo
}

export const useBranchStore = create<BranchStore>((set, get) => {
  let initialBranch: BranchId = 'all'
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('audenti_active_branch') as BranchId
      if (saved && (saved === 'all' || saved === 'balbuena' || saved === 'guadalupe-chalma')) {
        initialBranch = saved
      }
    } catch {}
  }

  return {
    currentBranchId: initialBranch,
    setBranchId: (id) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('audenti_active_branch', id)
          window.dispatchEvent(new CustomEvent('audenti_branch_changed', { detail: { branchId: id } }))
        } catch {}
      }
      set({ currentBranchId: id })
    },
    getCurrentBranch: () => BRANCHES_DATA[get().currentBranchId] || BRANCHES_DATA.all,
  }
})
