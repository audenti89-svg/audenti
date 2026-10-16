import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getNowInMexico, formatTimeInMexico } from '@/utils/timezone'

export const runtime = 'nodejs'

export interface ChatHistoryMessage {
  id: string
  sessionId: string
  sender: 'user' | 'assistant' | 'doctor'
  messageText: string
  timestamp: string // HH:mm (CDMX)
  createdAt: string // ISO string
  patientName?: string
  phone?: string
  urgencyLevel?: 'normal' | 'yellow' | 'red'
}

export interface ChatSessionSummary {
  sessionId: string
  patientName: string
  phone: string
  lastMessage: string
  lastTimestamp: string
  urgencyLevel: 'normal' | 'yellow' | 'red'
  messageCount: number
  messages: ChatHistoryMessage[]
}

// Almacén en memoria persistente en el servidor para el CRM de la Dra. Aura
declare global {
  var __audenti_chat_history: ChatHistoryMessage[] | undefined
}

if (!globalThis.__audenti_chat_history) {
  globalThis.__audenti_chat_history = []
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    const list = globalThis.__audenti_chat_history || []

    // Si se pide una sesión específica
    if (sessionId) {
      const sessionMessages = list.filter(m => m.sessionId === sessionId)
      return NextResponse.json({
        success: true,
        sessionId,
        messages: sessionMessages
      })
    }

    // Agrupar por sesiones para la lista del CRM de la Dra. Aura
    const sessionMap = new Map<string, ChatSessionSummary>()

    list.forEach(msg => {
      const existing = sessionMap.get(msg.sessionId)
      if (!existing) {
        sessionMap.set(msg.sessionId, {
          sessionId: msg.sessionId,
          patientName: msg.patientName || 'Paciente Web en Línea',
          phone: msg.phone || 'Pendiente por WhatsApp',
          lastMessage: msg.messageText,
          lastTimestamp: msg.timestamp,
          urgencyLevel: msg.urgencyLevel || 'normal',
          messageCount: 1,
          messages: [msg]
        })
      } else {
        existing.messageCount += 1
        existing.lastMessage = msg.messageText
        existing.lastTimestamp = msg.timestamp
        if (msg.patientName && existing.patientName.includes('Paciente Web')) {
          existing.patientName = msg.patientName
        }
        if (msg.phone && existing.phone.includes('Pendiente')) {
          existing.phone = msg.phone
        }
        if (msg.urgencyLevel === 'red') {
          existing.urgencyLevel = 'red'
        } else if (msg.urgencyLevel === 'yellow' && existing.urgencyLevel !== 'red') {
          existing.urgencyLevel = 'yellow'
        }
        existing.messages.push(msg)
      }
    })

    const sessions = Array.from(sessionMap.values()).reverse()

    return NextResponse.json({
      success: true,
      sessions,
      totalMessages: list.length
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      sessionId = `sess_${Date.now()}`,
      sender = 'user',
      messageText,
      patientName,
      phone,
      urgencyLevel = 'normal'
    } = body

    if (!messageText) {
      return NextResponse.json({ success: false, error: 'messageText es requerido' }, { status: 400 })
    }

    const nowMx = getNowInMexico()
    const newMsg: ChatHistoryMessage = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sessionId,
      sender,
      messageText,
      timestamp: formatTimeInMexico(nowMx),
      createdAt: new Date().toISOString(),
      patientName,
      phone,
      urgencyLevel
    }

    if (!globalThis.__audenti_chat_history) {
      globalThis.__audenti_chat_history = []
    }
    globalThis.__audenti_chat_history.push(newMsg)
    if (globalThis.__audenti_chat_history.length > 500) {
      globalThis.__audenti_chat_history.shift()
    }

    // Persistencia asíncrona en Supabase si la tabla existe o tiene permisos
    try {
      const supabase = await createClient()
      await supabase.from('chat_history').insert({
        session_id: sessionId,
        sender,
        message_text: messageText,
        patient_name: patientName || null,
        patient_phone: phone || null,
        urgency_level: urgencyLevel,
        local_timestamp: newMsg.timestamp
      })
    } catch (dbErr: any) {
      // Ignorar fallback silencioso
    }

    return NextResponse.json({
      success: true,
      message: newMsg
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
