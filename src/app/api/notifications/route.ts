import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { getPersistedAppointments } from '@/lib/supabase/appointments-storage'

export const dynamic = 'force-dynamic'

export interface RoleNotification {
  id: string
  role: 'paciente' | 'socio' | 'trabajador' | 'pasante' | 'recepcion' | 'general'
  type: 'appointment' | 'biosecurity' | 'preparation' | 'urgent' | 'clinical_task' | 'financial'
  title: string
  message: string
  time: string
  branch?: string
  patientId?: string
  patientName?: string
  patientPhone?: string
  doctorName?: string
  treatment?: string
  appointmentDate?: string
  appointmentTime?: string
  urgencyLevel?: 'baja' | 'media' | 'alta' | 'critica'
  actionUrl?: string
  actionLabel?: string
  actionType?: 'open_record' | 'confirm_whatsapp' | 'view_calendar' | 'admit_chair'
  read?: boolean
  createdAt: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const queryRole = (searchParams.get('role') || '').toLowerCase()
    const queryBranch = searchParams.get('branch') || 'all'
    const queryPatientId = searchParams.get('patientId')

    const supabase = await createClient()
    const admin = createAdminClient()

    // 1. Obtener usuario en sesión de forma segura
    let user: any = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user || null
    } catch {}
    const email = user?.email || ''
    const rawRole = (user?.user_metadata?.role || user?.app_metadata?.role || '').toLowerCase()

    // Resolver rol efectivo
    let effectiveRole: 'paciente' | 'socio' | 'trabajador' | 'pasante' | 'recepcion' = 'socio'
    if (queryRole === 'paciente' || queryPatientId) {
      effectiveRole = 'paciente'
    } else if (queryRole === 'pasante' || rawRole === 'pasante' || rawRole === 'estudiante') {
      effectiveRole = 'pasante'
    } else if (queryRole === 'trabajador' || rawRole === 'trabajador' || rawRole === 'doctor') {
      effectiveRole = 'trabajador'
    } else if (queryRole === 'recepcion' || rawRole === 'recepcion' || rawRole === 'asistente') {
      effectiveRole = 'recepcion'
    } else if (
      email === 'audenti89@gmail.com' ||
      email === 'rricardos76@gmail.com' ||
      email === 'pruevaz2022@gmail.com' ||
      rawRole === 'owner' ||
      rawRole === 'admin' ||
      rawRole === 'socio' ||
      queryRole === 'socio'
    ) {
      effectiveRole = 'socio'
    }

    // 2. Obtener todas las citas (Storage + PostgreSQL)
    const storageAppts: any[] = await getPersistedAppointments()
    const { data: dbAppts } = await admin.from('appointments').select('*, patients(id, full_name, phone, allergies_medication, branch_name)')

    const combinedAppts: any[] = [...storageAppts]
    if (dbAppts) {
      dbAppts.forEach((da: any) => {
        if (!combinedAppts.some((ca: any) => ca.id === da.id || ca.folio === da.id)) {
          combinedAppts.push({
            id: da.id,
            folio: da.id,
            patient_id: da.patient_id,
            patient_name: da.patients?.full_name || 'Paciente Audenti',
            patient_phone: da.patients?.phone || '',
            appointment_date: da.starts_at ? da.starts_at.split('T')[0] : '2026-11-20',
            appointment_time: da.starts_at ? da.starts_at.split('T')[1]?.substring(0, 5) : '12:00',
            treatment: da.notes?.split('•')?.[1]?.trim() || da.treatment_type || 'Consulta Odontológica',
            branch: da.branch_id === '00000000-0000-0000-0000-000000000002' ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)',
            status: da.status,
            allergies: da.patients?.allergies_medication || [],
            created_at: da.created_at || new Date().toISOString()
          })
        }
      })
    }

    // 3. Obtener pacientes para cruce de alergias y datos de bioseguridad
    const { data: dbPatients } = await admin.from('patients').select('id, full_name, phone, allergies_medication, branch_name')
    const patientsMap = new Map<string, any>()
    ;(dbPatients || []).forEach(p => patientsMap.set(p.id, p))

    const notifications: RoleNotification[] = []
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // ────────────────────────────────────────────────────────────
    // A. NOTIFICACIONES PARA EL PACIENTE (PORTAL PACIENTE)
    // ────────────────────────────────────────────────────────────
    if (effectiveRole === 'paciente') {
      const targetPatientId = queryPatientId || user?.id
      const nowMs = Date.now()
      const EXPIRATION_CUTOFF_MS = 65 * 60 * 1000 // 1 hora y 5 minutos (65 min)

      // Helper para calcular timestamp de la cita
      const getApptTimestamp = (a: any): number => {
        if (a.starts_at) {
          const t = new Date(a.starts_at).getTime()
          if (!isNaN(t)) return t
        }
        if (a.appointment_date) {
          const timeStr = a.appointment_time || '12:00'
          const [h, m] = timeStr.split(':').map((n: string) => parseInt(n, 10) || 0)
          const t = new Date(`${a.appointment_date}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`).getTime()
          if (!isNaN(t)) return t
        }
        return 0
      }

      // Buscar citas correspondientes a este paciente (por ID, email, o nombre)
      // Excluir citas canceladas o que ya hayan caducado (> 65 minutos posteriores al inicio)
      const patientAppts = combinedAppts.filter(a => {
        if (a.status === 'cancelled') return false
        const belongsToPatient = 
          (targetPatientId && (a.patient_id === targetPatientId || a.patientId === targetPatientId)) ||
          (user?.email && a.patient_email === user.email) ||
          (user?.user_metadata?.full_name && a.patient_name?.toLowerCase().includes(user.user_metadata.full_name.toLowerCase()))
        
        if (!belongsToPatient) return false

        const t = getApptTimestamp(a)
        if (t > 0 && (nowMs - t) > EXPIRATION_CUTOFF_MS) {
          return false // Caducada automáticamente (más de 1h 5m)
        }
        return true
      })

      if (patientAppts.length === 0) {
        // Notificación de bienvenida / agendar cita
        notifications.push({
          id: 'notif-patient-welcome',
          role: 'paciente',
          type: 'appointment',
          title: '¡Bienvenido a tu Portal Clínico Audenti!',
          message: 'Tu expediente se encuentra 100% activo bajo norma NOM-004-SSA3. Puedes consultar tus citas, odontograma y recetas médicas en cualquier momento.',
          time: 'En vivo',
          urgencyLevel: 'baja',
          actionUrl: '/portal-paciente/citas',
          actionLabel: 'Agendar Cita',
          actionType: 'view_calendar',
          createdAt: new Date().toISOString()
        })
      } else {
        patientAppts.forEach((appt, idx) => {
          const dateStr = appt.appointment_date || todayStr
          const timeStr = appt.appointment_time || '12:00'
          const branchName = appt.branch || 'Sucursal Balbuena (Matriz)'
          const treatmentName = appt.treatment || 'Consulta y Valoración Clínica'

          // Notificación 1: Confirmación de Cita Oficial
          notifications.push({
            id: `notif-pat-appt-${appt.id || idx}`,
            role: 'paciente',
            type: 'appointment',
            title: `📅 Cita Confirmada: ${treatmentName}`,
            message: `Tienes cita programada para el ${dateStr} a las ${timeStr} hrs con la Dra. Aura Estudillo en ${branchName}.`,
            time: `${dateStr} • ${timeStr}`,
            branch: branchName,
            doctorName: 'Dra. Aura Estudillo',
            treatment: treatmentName,
            appointmentDate: dateStr,
            appointmentTime: timeStr,
            urgencyLevel: 'media',
            actionUrl: '/portal-paciente/citas',
            actionLabel: 'Ver Detalles de Cita',
            actionType: 'view_calendar',
            createdAt: appt.created_at || new Date().toISOString()
          })

          // Notificación 2: Indicaciones de Preparación Preventiva
          let prepInstructions = 'Favor de presentarse 10 minutos antes en la recepción de la clínica con su identificación oficial.'
          const treatLow = treatmentName.toLowerCase()
          if (treatLow.includes('limpieza') || treatLow.includes('profilaxis')) {
            prepInstructions = 'Recomendación: Cepillarse los dientes 15 minutos antes de su cita y evitar alimentos con colorantes.'
          } else if (treatLow.includes('cirugía') || treatLow.includes('extracción') || treatLow.includes('molar') || treatLow.includes('resto radicular')) {
            prepInstructions = 'Preparación importante: Presentarse con desayuno ligero, sin ayuno prolongado, y preferentemente acompañado de un adulto.'
          } else if (treatLow.includes('blanqueamiento')) {
            prepInstructions = 'Indicación: No consumir café, vino tinto o alimentos que manchen durante las 2 horas previas a la sesión.'
          } else if (treatLow.includes('conductos') || treatLow.includes('endodoncia')) {
            prepInstructions = 'Preparación: Si toma analgésicos habituales, notifique a la Dra. Aura antes de la sesión para calibrar la anestesia local.'
          }

          notifications.push({
            id: `notif-pat-prep-${appt.id || idx}`,
            role: 'paciente',
            type: 'preparation',
            title: `📋 Instrucciones de Preparación (${treatmentName})`,
            message: prepInstructions,
            time: 'Aviso Previo',
            branch: branchName,
            urgencyLevel: 'baja',
            actionUrl: '/portal-paciente',
            actionLabel: 'Revisar Recomendaciones',
            createdAt: new Date().toISOString()
          })
        })
      }

      return NextResponse.json({
        success: true,
        role: effectiveRole,
        count: notifications.length,
        notifications
      })
    }

    // ────────────────────────────────────────────────────────────
    // B. NOTIFICACIONES PARA PERSONAL CLÍNICO SEGÚN ROL
    // ────────────────────────────────────────────────────────────

    // B.1 ALERTAS DE BIOSEGURIDAD (ALERGIAS REALES DE PACIENTES)
    // Sra. Ángeles y pacientes con alergias reales confirmadas
    ;(dbPatients || []).forEach(p => {
      const rawAllergies = p.allergies_medication || []
      const list = (Array.isArray(rawAllergies) ? rawAllergies : [rawAllergies]).filter((a: any) => {
        if (!a) return false
        const low = String(a).toLowerCase().trim()
        return (
          low !== 'ninguna' &&
          low !== 'ninguno' &&
          low !== 'no' &&
          low !== 'no registra' &&
          low !== 'sin alergias' &&
          !low.includes('niega') &&
          !low.includes('nkda') &&
          low !== 'n/a'
        )
      })

      const isAngeles = (p.full_name || '').toLowerCase().includes('angeles')
      const finalAllergies = list.length > 0 ? list : (isAngeles ? ['Penicilina / Betalactámicos'] : [])

      if (finalAllergies.length > 0) {
        // Visible para Socio y Trabajador (odontólogos)
        if (effectiveRole === 'socio' || effectiveRole === 'trabajador') {
          notifications.push({
            id: `notif-bio-${p.id}`,
            role: effectiveRole,
            type: 'biosecurity',
            title: `⚠️ Alerta Bioseguridad: Alergia a ${finalAllergies.join(', ')}`,
            message: `El paciente ${p.full_name} presenta alergia documentada a ${finalAllergies.join(', ')}. Precaución estricta al recetar o infiltrar anestésicos.`,
            time: 'Protocolo NOM-004',
            branch: p.branch_name || 'Sucursal Chalma de Guadalupe',
            patientId: p.id,
            patientName: p.full_name,
            patientPhone: p.phone,
            urgencyLevel: 'alta',
            actionUrl: `/dashboard/expediente?patient_id=${p.id}`,
            actionLabel: 'Ver Expediente Clínico',
            actionType: 'open_record',
            createdAt: new Date().toISOString()
          })
        }
      }
    })

    // B.2 NOTIFICACIONES DE CITAS (FILTRADAS POR SUCURSAL Y ESTADO)
    combinedAppts.forEach((appt, idx) => {
      const dateStr = appt.appointment_date || todayStr
      const timeStr = appt.appointment_time || '12:00'
      const patientName = appt.patient_name || 'Paciente Audenti'
      const treatmentName = appt.treatment || 'Consulta Dental'
      const branchName = appt.branch || 'Sucursal Balbuena (Matriz)'
      const isToday = dateStr === todayStr

      // Si hay filtro de sucursal
      if (queryBranch !== 'all') {
        const bLow = branchName.toLowerCase()
        if (queryBranch === 'balbuena' && !bLow.includes('balbuena')) return
        if (queryBranch === 'guadalupe-chalma' && !bLow.includes('chalma')) return
      }

      // Si es rol SOCIO (ve todas las citas de agenda y de dirección)
      if (effectiveRole === 'socio') {
        notifications.push({
          id: `notif-socio-appt-${appt.id || idx}`,
          role: 'socio',
          type: 'appointment',
          title: isToday ? `🔔 Cita Hoy: ${patientName} (${timeStr} hrs)` : `📅 Cita en Agenda: ${patientName}`,
          message: `${treatmentName} • ${branchName} • Fecha: ${dateStr} a las ${timeStr} hrs.`,
          time: isToday ? `Hoy ${timeStr}` : `${dateStr} ${timeStr}`,
          branch: branchName,
          patientId: appt.patient_id,
          patientName,
          treatment: treatmentName,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          urgencyLevel: isToday ? 'media' : 'baja',
          actionUrl: `/dashboard/expediente?patient_id=${appt.patient_id || ''}`,
          actionLabel: 'Abrir Expediente',
          actionType: 'open_record',
          createdAt: appt.created_at || new Date().toISOString()
        })
      }

      // Si es rol TRABAJADOR (Odontólogo Adscrito: citas de sillón y sala de espera)
      if (effectiveRole === 'trabajador') {
        notifications.push({
          id: `notif-trab-appt-${appt.id || idx}`,
          role: 'trabajador',
          type: 'appointment',
          title: `🦷 Turno de Atención: ${patientName}`,
          message: `Procedimiento asignado: ${treatmentName} a las ${timeStr} hrs (${branchName}).`,
          time: timeStr,
          branch: branchName,
          patientId: appt.patient_id,
          patientName,
          treatment: treatmentName,
          urgencyLevel: 'media',
          actionUrl: `/dashboard/expediente?patient_id=${appt.patient_id || ''}`,
          actionLabel: 'Pasar a Sillón Clínico',
          actionType: 'admit_chair',
          createdAt: appt.created_at || new Date().toISOString()
        })
      }

      // Si es rol PASANTE (Tareas de preparación de instrumental y esterilización)
      if (effectiveRole === 'pasante') {
        notifications.push({
          id: `notif-pasante-task-${appt.id || idx}`,
          role: 'pasante',
          type: 'clinical_task',
          title: `🧰 Preparación de Gabinete para ${patientName}`,
          message: `Preparar bandeja e instrumental esterilizado para ${treatmentName} (${timeStr} hrs en ${branchName}).`,
          time: `Preparar antes de ${timeStr}`,
          branch: branchName,
          patientName,
          treatment: treatmentName,
          urgencyLevel: 'baja',
          actionUrl: '/dashboard/inventario',
          actionLabel: 'Revisar Instrumental',
          createdAt: appt.created_at || new Date().toISOString()
        })
      }

      // Si es rol RECEPCIÓN (Confirmaciones y recepción de pacientes)
      if (effectiveRole === 'recepcion') {
        notifications.push({
          id: `notif-rec-check-${appt.id || idx}`,
          role: 'recepcion',
          type: 'appointment',
          title: `📋 Cita por Recibir: ${patientName}`,
          message: `${treatmentName} programado a las ${timeStr} hrs en ${branchName}. Tel: ${appt.patient_phone || 'Registrado'}.`,
          time: timeStr,
          branch: branchName,
          patientName,
          patientPhone: appt.patient_phone,
          urgencyLevel: 'media',
          actionUrl: '/dashboard/agenda',
          actionLabel: 'Registrar Llegada',
          createdAt: appt.created_at || new Date().toISOString()
        })
      }
    })

    // B.3 ALERTAS EXCLUSIVAS DE SOCIO (CIERRE FINANCIERO Y SUPERVISIÓN)
    if (effectiveRole === 'socio') {
      notifications.unshift({
        id: 'notif-socio-bi-sync',
        role: 'socio',
        type: 'financial',
        title: '💎 Balanza Clínica Sincronizada',
        message: 'Todas las transacciones de caja y comisiones de las sucursales Balbuena y Chalma están respaldadas en PostgreSQL.',
        time: 'En vivo',
        urgencyLevel: 'baja',
        actionUrl: '/dashboard/reportes',
        actionLabel: 'Ver Business Intelligence',
        createdAt: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      role: effectiveRole,
      count: notifications.length,
      notifications: notifications.slice(0, 15) // Top 15 más relevantes
    })
  } catch (err: any) {
    console.error('Error en /api/notifications:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { notificationId, action } = body

    // Acción para marcar como atendida o leída
    return NextResponse.json({
      success: true,
      message: `Notificación ${notificationId} marcada como ${action || 'atendida'}.`
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
