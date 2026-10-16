import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroqClient } from '@/lib/groq'

export const runtime = 'nodejs'

/**
 * Webhook Receptor Universal para Pasarela QR de WhatsApp (Evolution API, Z-API, Baileys)
 * Permite que Aura AI responda automáticamente por WhatsApp y persista la conversación en Prisma/Supabase.
 */

interface WebhookPayload {
  event?: string
  instance?: string
  data?: {
    key?: {
      remoteJid?: string
      fromMe?: boolean
      id?: string
    }
    pushName?: string
    message?: {
      conversation?: string
      extendedTextMessage?: {
        text?: string
      }
    }
    messageType?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: WebhookPayload = await req.json()

    // 1. Validar que sea un mensaje entrante (no enviado por el propio bot)
    if (body.data?.key?.fromMe) {
      return NextResponse.json({ status: 'ignored_own_message' })
    }

    const remoteJid = body.data?.key?.remoteJid || ''
    // Extraer número de teléfono (ej. 5215522427769@s.whatsapp.net -> 5522427769 o 521...)
    const rawNumber = remoteJid.replace(/@.*$/, '')
    const cleanPhone = rawNumber.replace(/^521/, '52') // Normalizar prefijo México

    if (!cleanPhone) {
      return NextResponse.json({ status: 'no_phone' })
    }

    // Extraer el texto del mensaje
    const messageText =
      body.data?.message?.conversation ||
      body.data?.message?.extendedTextMessage?.text ||
      ''

    if (!messageText.trim()) {
      return NextResponse.json({ status: 'empty_text' })
    }

    const patientName = body.data?.pushName || 'Paciente WhatsApp'

    // 2. Buscar o crear el paciente en Prisma / Supabase
    let patient = await prisma.patient.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { phone: rawNumber }, { whatsappLid: remoteJid }]
      }
    })

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name: patientName,
          phone: cleanPhone,
          whatsappLid: remoteJid,
          tags: ['whatsapp', 'nuevo_prospecto']
        }
      })
    }

    // 3. Buscar o crear la conversación activa
    let conversation = await prisma.conversation.findFirst({
      where: {
        patientId: patient.id,
        status: { in: ['OPEN', 'PENDING_HUMAN'] }
      },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 10
        }
      }
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          patientId: patient.id,
          status: 'OPEN',
          aiEnabled: true
        },
        include: {
          messages: true
        }
      })
    }

    // 4. Guardar el mensaje entrante del paciente en la BD
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'CLIENT',
        senderName: patient.name,
        content: messageText
      }
    })

    // 5. Si la IA está apagada para esta conversación (ej. Dra. Aura tomó el control manual), no responder con IA
    if (!conversation.aiEnabled || conversation.status === 'PENDING_HUMAN') {
      return NextResponse.json({ status: 'human_mode_active' })
    }

    // 6. Preparar historial para Aura AI (Llama 3.3 con Groq)
    const recentMessages = (conversation.messages || [])
      .reverse()
      .map((m) => ({
        role: m.senderType === 'CLIENT' ? ('user' as const) : ('assistant' as const),
        content: m.content
      }))

    const groq = getGroqClient()
    const systemPrompt = `Eres "Aura AI", la asistente virtual y concierge inteligente de la clínica dental "Audenti", dirigida por la Dra. Aura Estudillo (Cédula Profesional 8492019).
Estás respondiendo directamente en WHATSAPP al paciente "${patient.name}" (${cleanPhone}).

DIRECTRICES CLÍNICAS Y DE CONVERSACIÓN:
1. Respuestas breves, empáticas y cálidas, ideales para leer en WhatsApp (máximo 2 a 4 oraciones por mensaje).
2. Si el paciente pide agendar cita:
   - Ya conoces su número de WhatsApp (${cleanPhone}). NO se lo vuelvas a pedir.
   - Pregúntale cordialmente qué día y turno (matutino o vespertino) le favorece y qué tratamiento requiere (limpieza, revisión general, valoración estética).
3. Si reporta dolor severo o urgencia nocturna:
   - Actúa con contención y empatía.
   - Indícale que su caso ha sido marcado como Prioritario para la Dra. Aura Estudillo y que se le asignará el primer espacio disponible.
4. NUNCA recetes medicamentos, dosis o miligramos (ibuprofeno, paracetamol, etc.).
5. No mandes listas publicitarias ni catálogos largos no solicitados.`

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
        { role: 'user', content: messageText }
      ],
      temperature: 0.2,
      max_tokens: 300
    })

    const aiReply =
      chatCompletion.choices[0]?.message?.content?.trim() ||
      '¡Hola! He recibido tu mensaje en Audenti. En un momento te comparto los horarios disponibles con la Dra. Aura Estudillo.'

    // 7. Guardar la respuesta de Aura AI en la BD
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'AI',
        senderName: 'Aura AI',
        content: aiReply
      }
    })

    // 8. Enviar la respuesta a la pasarela QR si está configurada la URL de la pasarela
    const qrGatewayUrl = process.env.WHATSAPP_QR_GATEWAY_URL
    const qrApiKey = process.env.WHATSAPP_QR_API_KEY
    const qrInstanceName = process.env.WHATSAPP_QR_INSTANCE || 'audenti-aura'

    if (qrGatewayUrl) {
      try {
        await fetch(`${qrGatewayUrl}/message/sendText/${qrInstanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(qrApiKey ? { apikey: qrApiKey } : {})
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: aiReply
          })
        })
      } catch (sendErr) {
        console.error('Error enviando mensaje a la pasarela QR de WhatsApp:', sendErr)
      }
    }

    return NextResponse.json({
      success: true,
      reply: aiReply,
      patientId: patient.id,
      conversationId: conversation.id
    })
  } catch (error: any) {
    console.error('Error en webhook de WhatsApp QR:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Error procesando webhook' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    gateway: 'WhatsApp QR Bridge (Evolution API / Z-API / Baileys)',
    assistant: 'Aura AI',
    timestamp: new Date().toISOString()
  })
}
