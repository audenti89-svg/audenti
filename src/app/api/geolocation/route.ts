import { NextResponse } from 'next/server'
import { BRANCHES_DATA, BranchId } from '@/stores/branchStore'

export const runtime = 'nodejs'

export interface DoctorActiveLocation {
  branchId: BranchId
  branchName: string
  address: string
  lat: number
  lng: number
  status: 'en_gabinete' | 'en_quirofano' | 'en_traslado' | 'disponible_emergencia'
  lastUpdated: string
}

export interface PatientLocation {
  lat: number
  lng: number
  zoneName?: string
  accuracy?: number
  timestamp?: string
}

// Coordenadas geográficas oficiales de las sedes de Audenti en CDMX
export const BRANCH_COORDINATES: Record<string, { lat: number; lng: number; name: string; address: string }> = {
  balbuena: {
    lat: 19.4187,
    lng: -99.1124,
    name: 'Sucursal Balbuena (Matriz)',
    address: 'Av. del Taller & Retorno 12, Jardín Balbuena, CDMX'
  },
  'guadalupe-chalma': {
    lat: 19.5312,
    lng: -99.1458,
    name: 'Sucursal Guadalupe Chalma',
    address: 'Av. Guadalupe Victoria 45, Gustavo A. Madero, CDMX'
  },
  'colonia-roma': {
    lat: 19.4162,
    lng: -99.1628,
    name: 'Sucursal Colonia Roma',
    address: 'Álvaro Obregón 180, Col. Roma Norte, Cuauhtémoc, CDMX'
  }
}

// Almacén global para la ubicación activa de la Dra. Aura
declare global {
  var __audenti_doctor_location: DoctorActiveLocation | undefined
}

if (!globalThis.__audenti_doctor_location) {
  globalThis.__audenti_doctor_location = {
    branchId: 'balbuena',
    branchName: BRANCH_COORDINATES.balbuena.name,
    address: BRANCH_COORDINATES.balbuena.address,
    lat: BRANCH_COORDINATES.balbuena.lat,
    lng: BRANCH_COORDINATES.balbuena.lng,
    status: 'en_gabinete',
    lastUpdated: new Date().toISOString()
  }
}

// Fórmula de Haversine para cálculo de distancia en kilómetros
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

// Estimación de tiempo en vehículo según tráfico promedio de CDMX (20 km/h en ciudad)
export function estimateTravelTimeMinutes(km: number): number {
  const avgSpeedKmH = 22
  const hours = km / avgSpeedKmH
  const minutes = Math.round(hours * 60) + 5 // +5 min por estacionamiento/acceso
  return Math.max(8, minutes)
}

export async function GET() {
  const doctorLoc = globalThis.__audenti_doctor_location!
  return NextResponse.json({
    success: true,
    doctorLocation: doctorLoc,
    branches: BRANCH_COORDINATES,
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, branchId, lat, lng, status } = body

    if (action === 'update_doctor_location') {
      const selectedBranch = BRANCH_COORDINATES[branchId] || BRANCH_COORDINATES.balbuena
      globalThis.__audenti_doctor_location = {
        branchId: branchId in BRANCH_COORDINATES ? (branchId as BranchId) : 'balbuena',
        branchName: selectedBranch.name,
        address: selectedBranch.address,
        lat: lat || selectedBranch.lat,
        lng: lng || selectedBranch.lng,
        status: status || 'en_gabinete',
        lastUpdated: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        updatedLocation: globalThis.__audenti_doctor_location
      })
    }

    if (action === 'calculate_matrix') {
      const { patientLat, patientLng } = body
      if (!patientLat || !patientLng) {
        return NextResponse.json({ error: 'patientLat y patientLng requeridos' }, { status: 400 })
      }

      const doctorLoc = globalThis.__audenti_doctor_location!
      const distanceToDoctor = calculateDistanceKm(patientLat, patientLng, doctorLoc.lat, doctorLoc.lng)
      const travelTimeToDoctor = estimateTravelTimeMinutes(distanceToDoctor)

      // Matriz de todas las sedes
      const branchDistances = Object.entries(BRANCH_COORDINATES).map(([key, info]) => {
        const dist = calculateDistanceKm(patientLat, patientLng, info.lat, info.lng)
        const time = estimateTravelTimeMinutes(dist)
        return {
          branchId: key,
          name: info.name,
          address: info.address,
          distanceKm: dist,
          travelTimeMinutes: time,
          isDoctorPresent: doctorLoc.branchId === key
        }
      })

      branchDistances.sort((a, b) => a.distanceKm - b.distanceKm)
      const closestBranch = branchDistances[0]

      return NextResponse.json({
        success: true,
        doctorLocation: doctorLoc,
        distanceToDoctorKm: distanceToDoctor,
        travelTimeToDoctorMinutes: travelTimeToDoctor,
        closestBranch,
        allBranches: branchDistances,
        trafficAlert: distanceToDoctor > 15 ? 'Distancia considerable: considere tiempos de traslado en horario pico.' : 'Ubicación óptima y cercana a la Dra. Aura.'
      })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
