import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPersistedAppointments, savePersistedAppointments } from '@/lib/supabase/appointments-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_TENANT_ID = 'c62fc15b-bf68-4101-881d-fdd9258fce1f'
const BRANCH_BALBUENA_ID = '00000000-0000-0000-0000-000000000001'
const BRANCH_CHALMA_ID = '00000000-0000-0000-0000-000000000002'
const DEFAULT_DOCTOR_ID = '5e8853ee-b813-4a1b-aafd-48b3d20ec1e3' // Dra. Aura Estudillo

// ────────────────────────────────────────────────────────────
// GET: Listar transacciones financieras de Supabase
// ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patient_id')
    const branch = searchParams.get('branch')

    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (patientId) {
      query = query.eq('patient_id', patientId)
    }

    if (branch && branch !== 'all') {
      if (branch.toLowerCase().includes('chalma')) {
        query = query.eq('branch_id', BRANCH_CHALMA_ID)
      } else {
        query = query.eq('branch_id', BRANCH_BALBUENA_ID)
      }
    }

    const { data, error } = await query

    if (error) {
      console.warn('Error leyendo transacciones:', error.message)
      return NextResponse.json({ success: true, transactions: [] })
    }

    return NextResponse.json({ success: true, transactions: data || [] })
  } catch (err: any) {
    console.error('Excepción en GET /api/finances/transactions:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ────────────────────────────────────────────────────────────
// POST: Registrar un movimiento financiero (Cobro, Egreso, Trueque)
// ────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      amount,
      type = 'income',
      description = '',
      notes = '',
      payment_method = 'cash',
      patient_id = null,
      patient_name = '',
      branch_name = 'Sucursal Balbuena (Matriz)',
      appointment_id = null,
      doctor_commission = 0
    } = body

    // 1. Sanitizar y validar monto
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || '0').replace(/[^0-9.]/g, ''))
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: 'El monto debe ser una cifra numérica mayor a cero.' }, { status: 400 })
    }

    // 2. Normalizar canal de pago acorde a check constraint de Supabase
    let safePaymentMethod = 'cash'
    const pmLower = String(payment_method || '').toLowerCase()
    if (pmLower.includes('tarjeta') || pmLower.includes('card')) {
      safePaymentMethod = 'card'
    } else if (pmLower.includes('transfer') || pmLower.includes('spei')) {
      safePaymentMethod = 'transfer'
    } else if (pmLower.includes('efectivo') || pmLower.includes('cash')) {
      safePaymentMethod = 'cash'
    } else {
      safePaymentMethod = 'other'
    }

    // 3. Normalizar sucursal y IDs relacionales
    const isChalma = branch_name.toLowerCase().includes('chalma') || branch_name.toLowerCase().includes('guadalupe')
    const finalBranchId = isChalma ? BRANCH_CHALMA_ID : BRANCH_BALBUENA_ID
    const finalBranchName = isChalma ? 'Sucursal Chalma de Guadalupe' : 'Sucursal Balbuena (Matriz)'

    // Resolver patient_id si no fue enviado pero viene el nombre
    let resolvedPatientId = patient_id
    if (!resolvedPatientId && patient_name && patient_name.trim()) {
      try {
        const { data: pMatch } = await supabase
          .from('patients')
          .select('id')
          .ilike('full_name', `%${patient_name.trim()}%`)
          .limit(1)
          .maybeSingle()
        if (pMatch?.id) {
          resolvedPatientId = pMatch.id
        }
      } catch {}
    }

    // 4. Preparar registro de transacción
    const finalNotes = (notes || description || (type === 'expense' ? 'Egreso operativo' : 'Cobro de consulta / tratamiento')).trim()

    const newTx: any = {
      tenant_id: DEFAULT_TENANT_ID,
      branch_id: finalBranchId,
      branch_name: finalBranchName,
      patient_id: resolvedPatientId || null,
      doctor_id: DEFAULT_DOCTOR_ID,
      appointment_id: null,
      type: (type === 'expense' || type === 'barter_out') ? 'expense' : 'income',
      amount: numAmount,
      doctor_commission: Number(doctor_commission) || 0,
      payment_method: safePaymentMethod,
      status: 'completed',
      notes: finalNotes
    }

    const { data: insertedTx, error: txError } = await supabase
      .from('transactions')
      .insert(newTx)
      .select()
      .single()

    if (txError) {
      console.error('Error insertando transacción:', txError)
      return NextResponse.json({ success: false, error: txError.message }, { status: 500 })
    }

    // 5. Si es un ingreso atribuido a un paciente, actualizar su total_spent y last_visit_at
    if (resolvedPatientId && newTx.type === 'income') {
      try {
        const { data: currentP } = await supabase
          .from('patients')
          .select('total_spent')
          .eq('id', resolvedPatientId)
          .single()

        const currentSpent = Number(currentP?.total_spent) || 0
        const updatedSpent = Math.round((currentSpent + numAmount) * 100) / 100

        await supabase
          .from('patients')
          .update({
            total_spent: updatedSpent,
            last_visit_at: new Date().toISOString()
          })
          .eq('id', resolvedPatientId)
      } catch (pUpdateErr) {
        console.warn('Nota actualizando total_spent del paciente:', pUpdateErr)
      }
    }

    // 6. Si provenía de un checkout de cita, marcar la cita como completada en storage y base de datos
    if (appointment_id) {
      try {
        const appts = await getPersistedAppointments()
        const updatedAppts = appts.map((a: any) => {
          if (a.id === appointment_id || a.folio === appointment_id) {
            return {
              ...a,
              status: 'completed',
              notes: `${a.notes || ''} | [COBRO]: Liquidado en caja ($${numAmount} MXN - ${safePaymentMethod})`
            }
          }
          return a
        })
        await savePersistedAppointments(updatedAppts)
      } catch (apptErr) {
        console.warn('Nota actualizando cita en storage:', apptErr)
      }
    }

    return NextResponse.json({ success: true, transaction: insertedTx })
  } catch (err: any) {
    console.error('Excepción en POST /api/finances/transactions:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
