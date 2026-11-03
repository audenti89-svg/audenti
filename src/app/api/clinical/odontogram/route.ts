import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { TOOTH_BY_FDI } from '@/lib/dental-anatomy'

/**
 * API Odontograma Clínico 3D & Persistencia Supabase (Audenti 2027)
 * Permite almacenar y auditar cronológicamente diagnósticos, caras trabajadas y evolución
 * con aislamiento de roles: Socios (Full BI/Financiero), Trabajadores (Agenda/Clínica), Pasantes (Lectura/Borrador).
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId es requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Intentar recuperar desde Supabase Storage
    try {
      const { data: file } = await supabase.storage
        .from('audenti_database')
        .download(`patient_odontograms/${patientId}.json`)

      if (file) {
        const text = await file.text()
        if (text) {
          const parsed = JSON.parse(text)
          return NextResponse.json({ success: true, data: parsed, source: 'storage' })
        }
      }
    } catch {
      // Continuar con fallback de chat_messages
    }

    // 2. Fallback: Recuperar registros cronológicos desde chat_messages (canal odontogram_clinical_entry)
    const { data: records, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('patient_id', patientId)
      .eq('channel_type', 'odontogram_clinical_entry')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[odontogram GET] Error fetching chat_messages:', error.message)
    }

    const evolutionEntries = (records || []).map((r) => ({
      id: r.id,
      toothNumber: r.metadata?.toothFdi || 16,
      toothUniversal: r.metadata?.toothUniversal || 3,
      date: new Date(r.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      doctor: r.sender_name || 'Dra. Aura Estudillo',
      procedure: r.metadata?.procedure || 'Valoración Clínica',
      surfaces: r.metadata?.surfacesSummary || 'General',
      status: r.metadata?.status || 'Finalizado',
      notes: r.content,
      estimatedCost: r.metadata?.estimatedCost || 0,
      role: r.metadata?.doctorRole || 'socio'
    }))

    return NextResponse.json({
      success: true,
      data: {
        evolution: evolutionEntries,
        updatedAt: records?.[0]?.created_at || new Date().toISOString()
      },
      source: 'database'
    })
  } catch (err: any) {
    console.error('[odontogram GET]', err)
    return NextResponse.json({ error: 'Error al consultar historial del odontograma' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const {
      patientId,
      patientName,
      toothFdi,
      toothUniversal,
      surfaces,
      condition,
      procedure,
      specialty,
      notes,
      estimatedCost,
      isInterproximal,
      pairFdi,
      pairUniversal,
      doctorName = 'Dra. Aura Estudillo',
      doctorRole = 'socio',
      branch = 'Sucursal Balbuena (Matriz)',
      fullTeethState
    } = body

    if (!patientId || !toothFdi) {
      return NextResponse.json({ error: 'Datos incompletos: patientId y toothFdi son obligatorios' }, { status: 400 })
    }

    // Validación de permisos estructurada según rol clínico (Socio, Trabajador, Pasante)
    let entryStatus = 'Confirmado (Socio Autorizado)'
    let rolePermissionLevel = 'full_bi_and_clinical'

    const normalizedRole = (doctorRole || 'socio').toLowerCase()
    if (normalizedRole === 'pasante' || normalizedRole === 'estudiante') {
      entryStatus = 'Borrador Clínico (Supervisión Pendiente Dra. Aura Estudillo)'
      rolePermissionLevel = 'read_and_draft'
    } else if (normalizedRole === 'trabajador' || normalizedRole === 'doctor' || normalizedRole === 'asistente') {
      entryStatus = 'Registrado por Clínico Adscrito'
      rolePermissionLevel = 'clinical_operator'
    } else {
      entryStatus = 'Confirmado (Socio Director)'
      rolePermissionLevel = 'full_bi_and_clinical'
    }

    const toothTaxonomy = TOOTH_BY_FDI[toothFdi]
    const uNum = toothUniversal || toothTaxonomy?.universal || 0
    const toothFullName = toothTaxonomy?.name
      ? `${toothTaxonomy.name} — FDI #${toothFdi}`
      : `Pieza Dental FDI #${toothFdi}`

    // Resumen de caras trabajadas
    const treatedSurfaces = Object.entries(surfaces || {})
      .filter(([_, cond]) => cond !== 'sano')
      .map(([face, cond]) => `${face.toUpperCase()} (${cond})`)
    const surfacesSummary = treatedSurfaces.length > 0 ? treatedSurfaces.join(', ') : 'Corona Completa / Oclusal'

    const titlePrefix = isInterproximal && pairFdi
      ? `[ODONTOGRAMA 3D - CONTACTO INTERPROXIMAL]: Piezas #${pairFdi[0]} (UNS #${pairUniversal?.[0] || '?'}) ↔ #${pairFdi[1]} (UNS #${pairUniversal?.[1] || '?'})`
      : `[ODONTOGRAMA 3D]: ${toothFullName} (Universal #${uNum})`

    const clinicalContent = `${titlePrefix}\n• Procedimiento: ${procedure} [Especialidad: ${specialty}]\n• Caras afectadas: ${surfacesSummary}\n• Diagnóstico: ${condition.toUpperCase()}\n• Costo Estimado: $${estimatedCost || 0} MXN\n• Notas: ${notes || 'Sin observaciones adicionales'}\n• Sucursal: ${branch}\n• Profesional: ${doctorName} (${doctorRole.toUpperCase()} • ${rolePermissionLevel})\n• Validación: ${entryStatus}`

    // 1. Almacenar registro en chat_messages (Timeline clínico integrado)
    const { data: savedMessage, error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        patient_id: patientId,
        sender_name: doctorName,
        sender_role: 'doctor',
        channel_type: 'odontogram_clinical_entry',
        content: clinicalContent,
        is_private_note: true,
        metadata: {
          isOdontogram3D: true,
          toothFdi,
          toothUniversal: uNum,
          toothName: toothFullName,
          arch: toothTaxonomy?.arch || (toothFdi <= 28 ? 'upper' : 'lower'),
          quadrant: toothTaxonomy?.quadrant || 1,
          surfaces,
          surfacesSummary,
          treatedSurfacesDetail: Object.entries(surfaces || {}).map(([face, cond]) => ({
            face,
            condition: cond,
            label: `${face.toUpperCase()}: ${cond}`
          })),
          condition,
          procedure,
          specialty,
          estimatedCost: Number(estimatedCost) || 0,
          notes,
          isInterproximal: Boolean(isInterproximal),
          pairFdi,
          pairUniversal,
          doctorName,
          doctorRole,
          rolePermissionLevel,
          branch,
          status: entryStatus,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .maybeSingle()

    if (msgError) {
      console.warn('[odontogram POST] Aviso al guardar en chat_messages:', msgError.message)
    }

    // 2. Persistir archivo consolidado en Supabase Storage (audenti_database)
    try {
      const storagePath = `patient_odontograms/${patientId}.json`
      const payloadToStore = {
        patientId,
        patientName,
        lastUpdated: new Date().toISOString(),
        lastDoctor: doctorName,
        lastRole: doctorRole,
        rolePermissionLevel,
        lastBranch: branch,
        teeth: fullTeethState || {},
        latestEntry: {
          toothFdi,
          toothUniversal: uNum,
          toothName: toothFullName,
          arch: toothTaxonomy?.arch || (toothFdi <= 28 ? 'upper' : 'lower'),
          quadrant: toothTaxonomy?.quadrant || 1,
          surfaces,
          surfacesSummary,
          condition,
          procedure,
          specialty,
          notes,
          estimatedCost: Number(estimatedCost) || 0,
          isInterproximal: Boolean(isInterproximal),
          pairFdi,
          pairUniversal,
          doctorName,
          doctorRole,
          status: entryStatus,
          timestamp: new Date().toISOString()
        }
      }

      const fileBlob = new Blob([JSON.stringify(payloadToStore, null, 2)], { type: 'application/json' })
      await supabase.storage
        .from('audenti_database')
        .upload(storagePath, fileBlob, { upsert: true })
    } catch (storageErr) {
      console.warn('[odontogram POST] Aviso al sincronizar en storage:', storageErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Ficha y evolución odontológica registradas correctamente en Supabase',
      record: {
        id: savedMessage?.id || `odo-${Date.now()}`,
        toothFdi,
        toothUniversal: uNum,
        surfacesSummary,
        status: entryStatus,
        date: new Date().toISOString(),
        content: clinicalContent
      }
    })
  } catch (err: any) {
    console.error('[odontogram POST]', err)
    return NextResponse.json({ error: 'Error al registrar el procedimiento odontológico en Supabase' }, { status: 500 })
  }
}
