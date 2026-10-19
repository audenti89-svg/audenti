'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Phone,
  ShieldCheck,
  AlertCircle,
  Minimize2,
  Maximize2,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PatientDirectMessage {
  id: string;
  senderName: string;
  senderRole: 'doctor' | 'patient' | 'staff' | 'ai';
  content: string;
  timestamp: string;
  isDoctor: boolean;
}

interface PatientDirectChatWidgetProps {
  patient: {
    id?: string;
    full_name?: string;
    phone?: string;
    branch_name?: string;
    tenant_id?: string;
  };
}

export function PatientDirectChatWidget({ patient }: PatientDirectChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<PatientDirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const { playTone } = useNotificationSound();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const patientId = patient?.id || '72d77609-2035-477b-a1e3-f6ddc52818b1'; // Ricardo Sanchez default
  const patientName = patient?.full_name || 'Ricardo Sánchez';
  const branchName = patient?.branch_name || 'Sucursal Chalma de Guadalupe';

  // 1. Cargar historial del chat del paciente desde /api/chat y Storage
  const loadChatHistory = async () => {
    try {
      // Intento 1: API de servidor segura con privilegios completos
      const res = await fetch(`/api/chat?patientId=${patientId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.messages && json.messages.length > 0) {
          setMessages(json.messages);
          // Si el último mensaje es de la doctora y el chat no está abierto, marcar como no leído
          const lastMsg = json.messages[json.messages.length - 1];
          if (lastMsg?.isDoctor && !isOpen) {
            setUnreadCount(1);
          }
          return;
        }
      }

      // Intento 2: Descarga directa de Storage
      const { data: file } = await supabase.storage
        .from('audenti_database')
        .download('chat_omnichannel.json');

      if (file) {
        const text = await file.text();
        if (text && text.trim()) {
          const allChats = JSON.parse(text);
          const patientChat = allChats[patientId] || [];
          if (patientChat.length > 0) {
            setMessages(patientChat);
            const lastMsg = patientChat[patientChat.length - 1];
            if (lastMsg?.isDoctor && !isOpen) {
              setUnreadCount(1);
            }
            return;
          }
        }
      }

      // Sin mensajes previos
      setMessages([]);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, [patientId]);

  // 2. Suscripción Realtime bidireccional (Canal del paciente y omnicanal)
  useEffect(() => {
    const channelName = `patient_chat_${patientId}`;
    const handleClinicMessage = (payload: any) => {
      if (!payload) return;
      const targetId = payload.targetPatientId || payload.patientId || payload.conversation_id;
      const isForMe = !targetId || targetId === patientId || String(targetId) === String(patientId);
      const isFromClinic = payload.senderRole === 'doctor' || payload.senderRole === 'assistant' || payload.senderRole === 'ai' || payload.isDoctor;

      if (isForMe && isFromClinic) {
        playTone('arrival');
        setMessages(prev => {
          const exists = prev.some(m => m.id === payload.id);
          if (exists) return prev;
          return [...prev, {
            id: payload.id || `msg-${Date.now()}`,
            senderName: payload.senderName || 'Dra. Aura Estudillo',
            senderRole: payload.senderRole || 'doctor',
            content: payload.content || '',
            timestamp: payload.timestamp || payload.time || 'Ahora',
            isDoctor: Boolean(payload.isDoctor || payload.senderRole === 'doctor')
          }];
        });
        if (!isOpen) {
          setUnreadCount(c => c + 1);
        }
      }
    };

    const chatChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'doctor_reply' }, ({ payload }) => handleClinicMessage(payload))
      .on('broadcast', { event: 'chatwoot_message_created' }, ({ payload }) => handleClinicMessage(payload))
      .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => handleClinicMessage(payload))
      .subscribe();

    // Escucha en el canal global de omnicanal
    const globalChannel = supabase
      .channel('chat_omnichannel_sync')
      .on('broadcast', { event: 'sync_patient_message' }, ({ payload }) => handleClinicMessage(payload))
      .on('broadcast', { event: 'chatwoot_message_created' }, ({ payload }) => handleClinicMessage(payload))
      .on('broadcast', { event: 'doctor_reply' }, ({ payload }) => handleClinicMessage(payload))
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [patientId, isOpen, playTone, supabase]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // 3. Enviar mensaje del paciente hacia la Dra. Aura y recepción
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    const nowFormatted = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    const newMsg: PatientDirectMessage = {
      id: `msg-${Date.now()}`,
      senderName: patientName,
      senderRole: 'patient',
      content: messageText,
      timestamp: nowFormatted,
      isDoctor: false
    };

    setMessages(prev => [...prev, newMsg]);

    try {
      // A. Persistir vía /api/chat
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          message: newMsg
        })
      });

      // B. Disparar Eventos Realtime hacia el Dashboard y Header de la Dra. Aura
      await supabase.channel('chat_omnichannel_sync').send({
        type: 'broadcast',
        event: 'incoming_patient_message',
        payload: {
          targetPatientId: patientId,
          ...newMsg
        }
      });

      await supabase.channel('header_notifications_realtime').send({
        type: 'broadcast',
        event: 'doctor_notification',
        payload: {
          id: `notif-${Date.now()}`,
          title: `💬 Mensaje de ${patientName}`,
          message: messageText,
          type: 'general',
          patient_name: patientName,
          time: nowFormatted,
          branch: branchName
        }
      });

      await supabase.channel('dashboard_page_realtime').send({
        type: 'broadcast',
        event: 'doctor_notification',
        payload: {
          id: `toast-${Date.now()}`,
          title: `💬 Mensaje de ${patientName}`,
          message: `${messageText} • ${branchName}`,
          type: 'appointment',
          time: nowFormatted,
          branch: branchName
        }
      });
    } catch (err: any) {
      console.error('Error enviando mensaje de paciente:', err?.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Botón Flotante en la esquina inferior derecha con badge de Mensaje Nuevo */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {unreadCount > 0 && (
            <div className="bg-rose-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 animate-bounce border-2 border-white">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Mensaje nuevo de la Dra. Aura</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group border-2 border-yellow-200"
            title="Chat Directo con la Clínica Audenti"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-slate-950" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <span className="text-xs uppercase tracking-wider block font-black">Chat con la Doctora</span>
              <span className="text-[10px] text-slate-900/80 font-bold">Dra. Aura Estudillo en línea</span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-pulse hidden sm:block" />
          </button>
        </div>
      )}

      {/* Ventana Modal de Chat Flotante */}
      {isOpen && (
        <div
          className={cn(
            'fixed right-4 sm:right-6 z-50 bg-[#0d1322] border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 backdrop-blur-xl',
            isMinimized
              ? 'bottom-6 w-80 h-16'
              : 'bottom-4 sm:bottom-6 w-[calc(100vw-32px)] sm:w-[400px] h-[560px] max-h-[85vh]'
          )}
        >
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-[#121824] via-[#1a2336] to-[#121824] p-4 border-b border-gray-800 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold text-sm">
                  AE
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#121824]" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white">Dra. Aura Estudillo</h4>
                  <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">Médico</span>
                </div>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Atención en Vivo • {branchName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-gray-400">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                title={isMinimized ? 'Maximizar' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                title="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Notificación de Protocolo Clínico */}
              <div className="bg-amber-400/10 border-b border-amber-400/20 px-4 py-2 flex items-center gap-2 text-amber-300 text-[11px] shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Canal protegido bajo confidencialidad médica (NOM-004-SSA3).</span>
              </div>

              {/* Contenedor de Mensajes */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#080d18]/60">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    Inicia una conversación con la clínica. La Dra. Aura y recepción responderán de inmediato.
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col max-w-[85%]',
                        msg.isDoctor ? 'items-start mr-auto' : 'items-end ml-auto'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-gray-400">
                          {msg.isDoctor ? 'Dra. Aura Estudillo' : 'Tú'}
                        </span>
                        <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                      </div>
                      <div
                        className={cn(
                          'p-3.5 rounded-2xl text-xs leading-relaxed shadow-md',
                          msg.isDoctor
                            ? 'bg-[#162032] border border-blue-500/30 text-white rounded-tl-xs'
                            : 'bg-amber-400 text-slate-950 font-medium rounded-tr-xs'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra de Entrada de Texto */}
              <form onSubmit={handleSendMessage} className="p-3 bg-[#121824] border-t border-gray-800 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Escribe un mensaje para la Dra. Aura..."
                  className="flex-1 bg-slate-900 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-bold transition-all cursor-pointer shadow-md"
                  title="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
