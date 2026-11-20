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
    address: 'Sede Matriz — Jardín Balbuena & Sede Norte — Chalma de Guadalupe',
    doctorInCharge: 'Dra. Aura Estudillo (Dirección General)',
    phone: 'Atención Digital vía App Web',
    statusBadge: 'Red Integral • Todas las Sedes',
  },
  balbuena: {
    id: 'balbuena',
    name: 'Sede Matriz — Jardín Balbuena',
    code: 'DCL-BLB-01',
    address: 'Sede Matriz — Jardín Balbuena',
    doctorInCharge: 'Dra. Aura Estudillo (Céd. Prof. 8492019)',
    phone: 'Atención Digital vía App Web',
    statusBadge: 'Operativa • Sede Matriz Principal',
  },
  'guadalupe-chalma': {
    id: 'guadalupe-chalma',
    name: 'Sede Norte — Chalma de Guadalupe',
    code: 'DCL-CHM-02',
    address: 'Sede Norte — Chalma de Guadalupe',
    doctorInCharge: 'Dra. Aura Estudillo (Céd. Prof. 8492019)',
    phone: 'Atención Digital vía App Web',
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
