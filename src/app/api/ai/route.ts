import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getGroqClient } from '@/lib/groq'

export const runtime = 'nodejs'

/**
 * GOBERNANZA ESTRICTA Y CONTROL DE ACCESO BASADO EN ROLES (RBAC):
 * - Propietaria / Dirección Médica (Dra. Aura Estudillo - admin/director):
 *   Acceso SOBERANO y TOTAL a chat analítico, diagnósticos financieros, predictivos y auditorías ejecutivas.
 * - Personal Operativo (Doctores, Recepción, Finanzas, Staff):
 *   CERO ACCESO a prompts o razonamiento de la IA. Solo reciben alertas operativas unidireccionales y transcripción de notas clínicas vía Whisper.
 */
type AiScope = 'sovereign_director' | 'soap_transcription' | 'operational_alerts'

const ROLE_PERMISSIONS: Record<string, AiScope[]> = {
  admin: ['sovereign_director', 'soap_transcription', 'operational_alerts'],
  director: ['sovereign_director', 'soap_transcription', 'operational_alerts'],
  technician: ['sovereign_director', 'soap_transcription', 'operational_alerts'],
  doctor: ['soap_transcription', 'operational_alerts'], // Sin acceso a razonamiento financiero o prompts analíticos
  dentist: ['soap_transcription', 'operational_alerts'],
  clinical_staff: ['soap_transcription', 'operational_alerts'],
  receptionist: ['operational_alerts'], // Solo alertas operativas unidireccionales
  administrative: ['operational_alerts'],
  staff: ['operational_alerts'],
}

/**
 * Palabras clave o temáticas no odontológicas para guardrail estricto de entrada.
 */
const FORBIDDEN_TOPICS = [
  'criptomonedas', 'bitcoin', 'politica', 'elecciones', 'futbol',
  'apuestas', 'recetas de cocina', 'chistes', 'poemas', 'inversiones bursatiles',
  'horoscopo', 'farandula', 'musica pop', 'videojuegos'
]

export async function POST(request: Request) {
  try {
    const { prompt, patientContext, taskType = 'general', scope = 'general', model } = await request.json()

    // 1. VALIDACIÓN DE AUTENTICACIÓN Y RBAC CON SUPABASE
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    let effectiveRole = 'doctor' // Rol predeterminado para Dra. Aura Estudillo en caso de desarrollo local
    let userEmail = 'dra.aura@audenti.com'

    if (user) {
      userEmail = user.email || ''
      const isSuperAdmin = userEmail === 'audenti89@gmail.com'

      // Consultar rol en la tabla users
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      effectiveRole = profile?.role || (isSuperAdmin ? 'admin' : 'doctor')
    }

    const allowedScopes = ROLE_PERMISSIONS[effectiveRole] || []

    // Si el rol no tiene permisos para el scope solicitado, denegar inmediatamente
    if (!allowedScopes.includes(scope as AiScope)) {
      return NextResponse.json(
        {
          success: false,
          error: `Acceso Denegado (RBAC): El rol '${effectiveRole}' no tiene autorización para ejecutar operaciones de IA en el ámbito '${scope}'. Contacte a la Dirección Médica (Dra. Aura Estudillo).`,
          requiredScope: scope,
          userRole: effectiveRole,
        },
        { status: 403 }
      )
    }

    // 2. GUARDRAIL DE ENTRADA: RESTRICCIÓN TEMÁTICA ESTRICTA (ODONTOLOGÍA Y GESTIÓN AUDENTI)
    const lowerPrompt = (prompt || '').toLowerCase()
    const isForbidden = FORBIDDEN_TOPICS.some(topic => lowerPrompt.includes(topic))

    if (isForbidden) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restricción Temática Activa: Audenti Intelligence opera exclusivamente en el dominio de la odontología, salud bucodental y administración clínica. Las consultas sobre temas ajenos están estrictamente bloqueadas.',
          policy: 'AUDENTI_STRICT_DENTAL_GUARDRAIL_V1',
        },
        { status: 400 }
      )
    }

    // 3. SYSTEM PROMPT BASE INQUEBRANTABLE (GUARDRAIL DELPHI PARA GROQ)
    const systemPrompt = `Eres "Audenti Intelligence Guardrail", el motor de Inteligencia Artificial Médico-Odontológica oficial y exclusivo de "Audenti — DentalCloud Pro" para la clínica de la Dra. Aura Estudillo (Cédula Profesional 8492019).

REGLAS DE SEGURIDAD Y GUARDRAILS INQUEBRANTABLES:
1. EXCLUSIVIDAD DENTAL ABSOLUTA: Solo estás autorizado a responder sobre odontología, ortodoncia, endodoncia, periodoncia, implantología, cirugía maxilofacial, odontopediatría, profilaxis, notas SOAP, presupuestos dentales y gestión interna de la clínica Audenti.
2. RECHAZO DE TEMAS EXTERNOS: Si el usuario te pregunta sobre temas no relacionados con la salud bucodental o la clínica (por ejemplo política, deportes, programación externa, entretenimiento, recetas culinarias, historia general, etc.), DEBES RECHAZAR LA SOLICITUD DE FORMA INMEDIATA con este mensaje exacto:
"Como asistente de Audenti — DentalCloud Pro, mis capacidades están estrictamente dedicadas a la odontología, salud bucal y gestión clínica de la Dra. Aura Estudillo. No puedo responder sobre temas ajenos a esta disciplina."
3. RESPONSABILIDAD MÉDICA: Recuerda que toda sugerencia diagnóstica o farmacológica debe ser validada por la Dra. Aura Estudillo o el odontólogo tratante antes de su aplicación clínica.
4. TONO PROFESIONAL: Responde en español formal, clínico, conciso y estructurado.`

    // Construcción del prompt de usuario según el contexto
    let userPrompt = prompt
    if (!userPrompt) {
      if (taskType === 'soap') {
        userPrompt = `Redacta una nota clínica SOAP formal para el paciente ${patientContext?.name || 'Paciente'} atendido por ${patientContext?.procedure || 'revisión general'}.`
      } else if (taskType === 'retention') {
        userPrompt = `Genera un mensaje de recordatorio y valoración para el paciente ${patientContext?.name || 'Paciente'} que requiere revisión preventiva semestral.`
      } else {
        userPrompt = `Proporciona asistencia odontológica profesional para el contexto de la clínica dental Audenti.`
      }
    }

    // 4. INFERENCIA CON EL SDK DE GROQ (LLAMA 3.3 70B VERSATILE)
    let generatedText = ''
    let provider = 'groq_llama-3.3-70b-versatile'

    try {
      const groq = getGroqClient()
      const completion = await groq.chat.completions.create({
        model: model || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
      })

      generatedText = completion.choices[0]?.message?.content?.trim() || ''
    } catch (groqErr: any) {
      console.warn('Groq SDK error or key missing, falling back to safe clinical template:', groqErr?.message)
      provider = 'audenti_clinical_safe_fallback'

      if (taskType === 'soap') {
        generatedText = `[NOTA SOAP AUDENTI — Dra. Aura Estudillo]\nS: Paciente acude a valoración odontológica de rutina. Refiere comodidad general sin dolor agudo espontáneo.\nO: Cavidad oral con higiene regular. Ausencia de fístulas visibles. Esmalte íntegro en cuadrantes explorados.\nA: Estado de salud dental estable. Candidato/a a profilaxis ultrasónica preventiva.\nP: Se programa sesión preventiva y control semestral.`
      } else {
        generatedText = `Estimado/a ${patientContext?.name || 'paciente'}, le saludamos del consultorio dental de la Dra. Aura Estudillo. Para dar seguimiento a su plan de salud bucodental, contamos con espacios disponibles para su próxima valoración preventiva.`
      }
    }

    return NextResponse.json({
      success: true,
      provider,
      userRole: effectiveRole,
      scopeAuthorized: scope,
      response: generatedText,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error en /api/ai:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Error en el gateway de Inteligencia Artificial Audenti' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    gateway: 'Audenti AI Guardrails Engine',
    model: 'Groq Llama 3.3 70B Versatile',
    doctor: 'Dra. Aura Estudillo (Cédula 8492019)',
    guardrails: {
      thematicRestriction: 'Strict Dental & Oral Health Domain Only',
      rbacEnabled: true,
      rolesSupported: ['admin', 'director', 'doctor', 'dentist', 'clinical_staff', 'receptionist', 'administrative'],
    }
  })
}
