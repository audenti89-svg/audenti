import React, { useState, useEffect, useRef } from 'react';
import { AIDispatcher, AIRole } from '@/lib/ai/ai-dispatcher';
import { Shield, UserCheck, Headphones, BarChart3, Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  aiRole?: AIRole;
  model?: string;
}

const ROLES_CONFIG = {
  SALES: { name: 'Ejecutivo de Ventas', icon: UserCheck, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500' },
  SUPPORT: { name: 'Soporte Técnico', icon: Headphones, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500' },
  ANALYST: { name: 'Analista Interno', icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500' },
  SECURITY: { name: 'Guardaespaldas IA', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500' },
};

export const AIEmployeeHub = () => {
  const [activeRole, setActiveRole] = useState<AIRole>('SUPPORT');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await AIDispatcher.dispatch(input, activeRole);
      const aiMsg: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        aiRole: response.role,
        model: response.model
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un error de conexión con el agente.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[600px] w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
      {/* Sidebar de Empleados */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Oficina de IA</h3>
        {Object.entries(ROLES_CONFIG).map(([roleKey, config]) => {
          const RoleIcon = config.icon;
          return (
            <button
              key={roleKey}
              onClick={() => setActiveRole(roleKey as AIRole)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                activeRole === roleKey
                ? `${config.bg} ${config.border} border-2 shadow-sm`
                : 'hover:bg-slate-100 border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-lg ${config.color} bg-white shadow-sm`}>
                <RoleIcon size={20} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${activeRole === roleKey ? config.color : 'text-slate-700'}`}>
                  {config.name}
                </p>
                <p className="text-xs text-slate-400">Activo</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header del Chat */}
        <div className={`p-4 border-b flex justify-between items-center ${ROLES_CONFIG[activeRole].bg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${ROLES_CONFIG[activeRole].color} bg-white shadow-sm`}>
              <Bot size={24} />
            </div>
            <div>
              <h2 className={`font-bold ${ROLES_CONFIG[activeRole].color}`}>{ROLES_CONFIG[activeRole].name}</h2>
              <p className="text-xs text-slate-500">En línea • Procesando en tiempo real</p>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className={`p-4 rounded-full ${ROLES_CONFIG[activeRole].bg} mb-4`}>
                <Bot size={48} className={ROLES_CONFIG[activeRole].color} />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">Hola, soy tu {ROLES_CONFIG[activeRole].name}</h3>
              <p className="text-slate-500 max-w-sm">
                Estoy listo para ayudarte con las tareas de {activeRole === 'SALES' ? 'ventas y cierre' : activeRole === 'SUPPORT' ? 'soporte técnico' : 'análisis de datos'}.
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : `bg-white border ${ROLES_CONFIG[msg.aiRole || 'SUPPORT'].border} rounded-tl-none shadow-sm`
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {msg.role === 'assistant' && <Bot size={12} className={ROLES_CONFIG[msg.aiRole || 'SUPPORT'].color} />}
                  <span className="text-[10px] font-bold uppercase opacity-60">
                    {msg.role === 'user' ? 'Tú' : ROLES_CONFIG[msg.aiRole || 'SUPPORT'].name}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                {msg.model && (
                  <p className="text-[9px] text-right mt-1 opacity-40 font-mono">{msg.model}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm animate-pulse">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input de Mensaje */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 focus-within:border-indigo-500 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Habla con el ${ROLES_CONFIG[activeRole].name}...`}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2 text-slate-700"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
