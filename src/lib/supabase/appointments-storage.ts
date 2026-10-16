import { createAdminClient } from '@/lib/supabase/admin'
import { PersistentAppointment } from '@/app/api/appointments/route'

const STORAGE_BUCKET = 'audenti_database'
const APPOINTMENTS_FILE = 'appointments.json'

/**
 * Carga la lista persistente de citas directamente desde Supabase Storage.
 * Si la memoria global está vacía (por reinicio de servidor o despliegue), la inicializa con los datos de Supabase.
 */
export async function getPersistedAppointments(): Promise<PersistentAppointment[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(APPOINTMENTS_FILE)

    if (error) {
      // Si el archivo aún no existe en el bucket, retornamos la memoria o array vacío
      return globalThis.__audenti_appointments || []
    }

    const text = await data.text()
    if (!text || text.trim() === '') {
      return globalThis.__audenti_appointments || []
    }

    const parsed: PersistentAppointment[] = JSON.parse(text)
    if (Array.isArray(parsed)) {
      // Sincronizar memoria en caliente
      globalThis.__audenti_appointments = parsed
      return parsed
    }

    return globalThis.__audenti_appointments || []
  } catch (err: any) {
    console.warn('Nota en getPersistedAppointments (Supabase Storage):', err?.message)
    return globalThis.__audenti_appointments || []
  }
}

/**
 * Guarda y respalda permanentemente la lista de citas en Supabase Storage.
 */
export async function savePersistedAppointments(list: PersistentAppointment[]): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const jsonStr = JSON.stringify(list, null, 2)

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(APPOINTMENTS_FILE, jsonStr, {
      upsert: true,
      contentType: 'application/json'
    })

    if (error) {
      console.warn('Error al guardar citas en Supabase Storage:', error.message)
      return false
    }

    return true
  } catch (err: any) {
    console.warn('Excepción en savePersistedAppointments:', err?.message)
    return false
  }
}
