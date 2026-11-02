/**
 * =====================================================================
 * AUDENTI CLOUD PRO (2027) - ARQUITECTURA ELEPHANT-GOLDFISH (EGM)
 * Patrón de Concurrencia y Sincronización en Tiempo Real
 * Arquitecto: Ricardo Sánchez
 * =====================================================================
 *
 * - "Goldfish" (Memoria Efímera / Ultra-Rápida):
 *   Estado en memoria de latencia cero, actualizaciones optimistas inmediatas
 *   en la UI y capacidad de rollback instantáneo ante colisiones.
 *
 * - "Elephant" (Persistencia Robusta / Ledger Inmutable):
 *   Persistencia transaccional ACID en Supabase/PostgreSQL, control de versiones
 *   concurrente (OCC) y registro de auditoría inmutable de citas clínicas.
 */

import { createClient } from '@/utils/supabase/client'

export interface ConcurrencyEntity {
  id: string
  version?: number
  concurrency_token?: string
  last_modified_by?: string
  updated_at?: string
}

export interface AppointmentSlot {
  id: string
  patient_id: string
  doctor_id: string
  branch_id: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  version: number
  concurrency_token: string
}

export interface ConcurrencyResult<T> {
  success: boolean
  data?: T
  error?: string
  conflict?: boolean
  rollbackRequired?: boolean
}

/**
 * ---------------------------------------------------------------------
 * 1. ELEPHANT GUARD: Validador de Horarios de Operación 2027
 * ---------------------------------------------------------------------
 * - Lunes a Sábado: 16:00 a 21:00 (Turno Vespertino Estricto)
 * - Domingos: Habilitado según disponibilidad
 * - Turnos Matutinos: ESTRICTAMENTE BLOQUEADOS
 */
export function validate2027SchedulePolicy(dateStr: string, timeStr: string): { valid: boolean; error?: string } {
  // En noviembre y diciembre de 2026 rige el horario normal completo (08:00 a 21:00 hrs)
  if (dateStr < '2027-01-01') {
    const [hour] = timeStr.split(':').map(Number)
    if (hour < 8 || hour > 21) {
      return {
        valid: false,
        error: 'Horario normal 2026: Las consultas se realizan entre las 08:00 y las 21:00 hrs.'
      }
    }
    return { valid: true }
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  const dateObj = new Date(year, month - 1, day)
  const dayOfWeek = dateObj.getDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  // Regla 2027: Turno matutino totalmente bloqueado (antes de las 16:00 hrs)
  if (hour < 16) {
    return {
      valid: false,
      error: 'Política 2027: El turno matutino está estrictamente bloqueado. Las citas solo se permiten de 4:00 PM a 9:00 PM (Lunes a Sábado) o Domingos según disponibilidad.'
    }
  }

  // Lunes a Sábado: franja 16:00 a 21:00
  if (dayOfWeek >= 1 && dayOfWeek <= 6) {
    if (hour > 21 || (hour === 21 && minute > 0)) {
      return {
        valid: false,
        error: 'Política 2027: El turno vespertino concluye a las 9:00 PM.'
      }
    }
  }

  return { valid: true }
}

/**
 * ---------------------------------------------------------------------
 * 2. ELEPHANT: Ejecutor con Control de Concurrencia Optimista (OCC)
 * ---------------------------------------------------------------------
 */
export async function executeElephantOCC<T extends ConcurrencyEntity>(
  table: string,
  recordId: string,
  currentVersion: number,
  updates: Partial<T>,
  userId?: string
): Promise<ConcurrencyResult<T>> {
  const supabase = createClient()

  try {
    const nextVersion = currentVersion + 1
    const nextToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // Intentar actualización atómica verificando que la versión coincida con la que tiene el cliente
    const { data, error } = await supabase
      .from(table)
      .update({
        ...updates,
        version: nextVersion,
        concurrency_token: nextToken,
        last_modified_by: userId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('version', currentVersion)
      .select()
      .maybeSingle()

    if (error) {
      console.error(`[Elephant OCC] Error en tabla ${table}:`, error)
      return { success: false, error: error.message }
    }

    // Si data es null, significa que otro usuario modificó el registro primero (conflicto de concurrencia)
    if (!data) {
      return {
        success: false,
        conflict: true,
        rollbackRequired: true,
        error: 'Conflicto de concurrencia (Elephant): El registro fue modificado por otro colega o proceso. Por favor recarga para ver el estado actual.'
      }
    }

    return { success: true, data: data as T }
  } catch (err: any) {
    console.error('[Elephant OCC] Excepción:', err)
    return { success: false, error: err?.message || 'Error de persistencia Elephant' }
  }
}

/**
 * ---------------------------------------------------------------------
 * 3. GOLDFISH: Cache Efímero y Sincronizador en Tiempo Real
 * ---------------------------------------------------------------------
 */
type Listener<T> = (data: T) => void

export class GoldfishMemoryStore<T extends { id: string }> {
  private cache: Map<string, T> = new Map()
  private listeners: Set<Listener<T[]>> = new Set()
  private subscriptionChannel: any = null

  constructor(private tableName: string) {}

  /**
   * Obtiene todos los elementos en memoria Goldfish (latencia 0ms)
   */
  getAll(): T[] {
    return Array.from(this.cache.values())
  }

  get(id: string): T | undefined {
    return this.cache.get(id)
  }

  /**
   * Actualización optimista inmediata en memoria Goldfish
   */
  setOptimistic(item: T) {
    this.cache.set(item.id, item)
    this.notify()
  }

  /**
   * Revertir cambio si Elephant detecta conflicto o fallo
   */
  rollback(id: string, previousItem?: T) {
    if (previousItem) {
      this.cache.set(id, previousItem)
    } else {
      this.cache.delete(id)
    }
    this.notify()
  }

  /**
   * Inicializar con datos de Supabase (Elephant)
   */
  hydrate(items: T[]) {
    this.cache.clear()
    items.forEach(it => this.cache.set(it.id, it))
    this.notify()
  }

  subscribe(listener: Listener<T[]>): () => void {
    this.listeners.add(listener)
    listener(this.getAll())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const all = this.getAll()
    this.listeners.forEach(l => l(all))
  }

  /**
   * Conectar con Supabase Realtime para mantener el Goldfish vivo
   */
  connectRealtime() {
    if (this.subscriptionChannel) return

    const supabase = createClient()
    this.subscriptionChannel = supabase
      .channel(`goldfish_${this.tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.tableName },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            this.setOptimistic(payload.new as T)
          } else if (payload.eventType === 'DELETE') {
            this.rollback(payload.old.id)
          }
        }
      )
      .subscribe()
  }

  disconnectRealtime() {
    if (this.subscriptionChannel) {
      const supabase = createClient()
      supabase.removeChannel(this.subscriptionChannel)
      this.subscriptionChannel = null
    }
  }
}
