import React, { useState, useEffect, useRef } from 'react';
import { AIRole } from '@/lib/ai/ai-dispatcher';
import { Shield, UserCheck, Headphones, BarChart3, Send, Bot, RefreshCw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  aiRole?: AIRole;
  model?: string;
}

const ROLES_CONFIG = {
  SALES: {
    name: 'Ejecutivo de Ventas',
    icon: UserCheck,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500',
    description: 'Especialista en cotizaciones, cierre de presupuestos y promociones de tratamientos.'
  },
  SUPPORT: {
    name: 'Soporte Técnico',
    icon: Headphones,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    description: 'Atención a dudas de la plataforma, horarios, confirmación y estatus de citas.'
  },
  ANALYST: {
    name: 'Analista Interno',
    icon: BarChart3,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    description: 'Auditoría de expedientes clínicos, alergias, antecedentes y métricas de pacientes.'
  },
  SECURITY: {
    name: 'Guardaespaldas IA',
    icon: Shield,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    description: 'Inspección de ciberseguridad, detección de inyecciones y auditoría perimetral.'
  },
};

export const AIEmployeeHub = () => {
  const [activeRole, setActiveRole] = useState<AIRole>('SALES');
  
  // Historiales de chat independientes por cada empleado
  const [chatsByRole, setChatsByRole] = useState<Record<AIRole, Message[]>>({
    SALES: [],
    SUPPORT: [],
    ANALYST: [],
    SECURITY: [],
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentMessages = chatsByRole[activeRole] || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatsByRole, activeRole, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const targetRole = activeRole;
    setInput('');

    const userMsg: Message = { role: 'user', content: currentInput, timestamp: new Date() };

    // Agregar mensaje del usuario a la bandeja del rol actual
    setChatsByRole(prev => ({
      ...prev,
      [targetRole]: [...(prev[targetRole] || []), userMsg]
    }));

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentInput, role: targetRole }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const response = json.data;
        const aiMsg: Message = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          aiRole: response.role || targetRole,
          model: response.model
        };
        setChatsByRole(prev => ({
          ...prev,
          [targetRole]: [...(prev[targetRole] || []), aiMsg]
        }));
      } else {
        throw new Error(json.error || 'Respuesta inválida');
      }
    } catch (error: any) {
      console.warn("Error en comunicación con agente:", error);
      const fallbackMsg: Message = {
        role: 'assistant',
        content: `Error al conectar con ${ROLES_CONFIG[targetRole].name}. Por favor intenta de nuevo.`,
        timestamp: new Date(),
        aiRole: targetRole,
      };
      setChatsByRole(prev => ({
        ...prev,
        [targetRole]: [...(prev[targetRole] || []), fallbackMsg]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setChatsByRole(prev => ({
      ...prev,
      [activeRole]: []
    }));
  };

  return (
    <div className="flex h-[620px] w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
      {/* Sidebar de Empleados */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Oficina de Empleados IA</h3>
          {Object.entries(ROLES_CONFIG).map(([roleKey, config]) => {
            const RoleIcon = config.icon;
            const isSelected = activeRole === roleKey;
            return (
              <button
                key={roleKey}
                onClick={() => setActiveRole(roleKey as AIRole)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  isSelected
                  ? `${config.bg} ${config.border} border-2 shadow-sm`
                  : 'hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${config.color} bg-white shadow-sm`}>
                  <RoleIcon size={18} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isSelected ? config.color : 'text-slate-700'}`}>
                    {config.name}
                  </p>
                  <p className="text-[11px] text-slate-400">Activo</p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleClearHistory}
          className="flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/50 transition-colors"
        >
          <RefreshCw size={13} /> Limpiar chat actual
        </button>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header del Chat */}
        <div className={`p-4 border-b flex justify-between items-center ${ROLES_CONFIG[activeRole].bg}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${ROLES_CONFIG[activeRole].color} bg-white shadow-sm`}>
              <Bot size={22} />
            </div>
            <div>
              <h2 className={`font-bold ${ROLES_CONFIG[activeRole].color}`}>{ROLES_CONFIG[activeRole].name}</h2>
              <p className="text-xs text-slate-500">{ROLES_CONFIG[activeRole].description}</p>
            </div>
          </div>
          <span className="text-[11px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
            En línea
          </span>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {currentMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className={`p-4 rounded-full ${ROLES_CONFIG[activeRole].bg} mb-4`}>
                <Bot size={44} className={ROLES_CONFIG[activeRole].color} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Oficina de {ROLES_CONFIG[activeRole].name}</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {ROLES_CONFIG[activeRole].description}
              </p>
            </div>
          )}

          {currentMessages.map((msg, idx) => {
            const roleConf = ROLES_CONFIG[msg.aiRole || activeRole];
            return (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl ${
                  msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                  : `bg-white border ${roleConf.border} rounded-tl-none shadow-sm`
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {msg.role === 'assistant' && <Bot size={13} className={roleConf.color} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      {msg.role === 'user' ? 'Tú' : roleConf.name}
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  {msg.model && (
                    <p className="text-[9px] text-right mt-1.5 opacity-40 font-mono">{msg.model}</p>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm animate-pulse">
                <div className="flex items-center gap-2">
                  <Bot size={14} className={ROLES_CONFIG[activeRole].color} />
                  <span className="text-xs text-slate-400 font-medium">Procesando solicitud...</span>
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
              placeholder={`Escribe a ${ROLES_CONFIG[activeRole].name}...`}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2 text-slate-700 outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
