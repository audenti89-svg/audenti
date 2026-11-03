import { create } from 'zustand'

export type BranchId = 'balbuena' | 'guadalupe-chalma'

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

export const useBranchStore = create<BranchStore>((set, get) => ({
  currentBranchId: 'balbuena',
  setBranchId: (id) => set({ currentBranchId: id }),
  getCurrentBranch: () => BRANCHES_DATA[get().currentBranchId] || BRANCHES_DATA.balbuena,
}))
