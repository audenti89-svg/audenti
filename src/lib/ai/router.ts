import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { buildDynamicConciergePrompt } from './prompts/conciergePrompt';
import { conciergeChatTools, executeConciergeTool } from './tools/schedulingTools';

// Adaptador de compatibilidad para Google GenAI (SDK @google/genai moderno)
export class GoogleGenerativeAI {
  private client: GoogleGenAI;
  constructor(apiKey?: string) {
    this.client = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || '' });
  }

  getGenerativeModel({ model }: { model: string }) {
    return {
      generateContent: async (contents: Array<string | any>) => {
        const textParts = contents
          .filter(Boolean)
          .map(c => (typeof c === 'string' ? c : JSON.stringify(c)))
          .join('\n\n');
        
        const res = await this.client.models.generateContent({
          model,
          contents: textParts
        });
        return {
          response: {
            text: () => res.text || ''
          }
        };
      }
    };
  }
}

// Inicialización segura de SDKs con validación de entorno
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export type AITaskDomain = 'clinical' | 'patient_chat' | 'finance' | 'bi' | 'scheduling';
export type AITaskType = AITaskDomain;

// Helper para invocar 9router Local Gateway (http://127.0.0.1:20128/v1)
async function call9Router(params: {
  model?: string;
  prompt: string;
  systemPrompt?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
}): Promise<string | null> {
  const AI_ROUTER_BASE_URL = process.env.AI_ROUTER_BASE_URL || 'http://127.0.0.1:20128/v1';
  const AUDENTI_AI_API_KEY = process.env.AUDENTI_AI_API_KEY || 'sk-623d95255f395c93-6seidp-2a0b79ba';
  const model = params.model || process.env.AI_MODEL_CLINICAL || 'kr/claude-sonnet-4.5';

  try {
    const messages = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    if (params.history && params.history.length > 0) {
      messages.push(...params.history);
    }
    messages.push({ role: 'user', content: params.prompt });

    const res = await fetch(`${AI_ROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUDENTI_AI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: params.temperature ?? 0.2,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (err: any) {
    console.warn(`[9Router Engine] No disponible en ${AI_ROUTER_BASE_URL}:`, err.message);
  }
  return null;
}

// Helper para invocar el nodo local de Ollama (http://localhost:11434)
async function callOllamaLocal(params: {
  model?: string;
  prompt: string;
  systemPrompt?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
}): Promise<string | null> {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
  const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '3da15b5f10f74515af889f550d63d947.Ug_qwkUIFI_1r4gond_4IY-T';
  const model = params.model || process.env.OLLAMA_MODEL || 'llama3';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (OLLAMA_API_KEY) {
    headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
  }

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: params.systemPrompt || 'Eres el motor de Inteligencia Artificial Clínica Local de Audenti Odontología para la Dra. Aura Estudillo (NOM-004-SSA3).'
      }
    ];

    if (Array.isArray(params.history)) {
      for (const h of params.history) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content)
        });
      }
    }

    messages.push({ role: 'user', content: params.prompt });

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { temperature: params.temperature ?? 0.2 }
      }),
      signal: AbortSignal.timeout(15000) // 15s timeout
    });

    if (res.ok) {
      const data = await res.json();
      return data.message?.content || data.response || null;
    }
  } catch (err: any) {
    console.warn(`[Ollama Local Engine] No disponible en ${OLLAMA_BASE_URL}:`, err.message);
  }
  return null;
}

export interface AIRequestOptions {
  domain: AITaskDomain;
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextData?: any;
  userContext?: any;
}

export interface AIResponse {
  success: boolean;
  domain?: AITaskDomain;
  result: any;
  provider: string;
  executionTimeMs: number;
  error?: string;
  triageCategory?: string;
  appointmentCreated?: boolean;
}

export async function executeAIAgent(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();
  const { domain, prompt, systemPrompt, jsonMode, history = [], contextData } = options;

  // Si existe contexto adicional estructurado, lo anexamos al prompt para enriquecer la inferencia
  const contextString = contextData
    ? `\n\n[Contexto Adjunto]:\n${typeof contextData === 'object' ? JSON.stringify(contextData, null, 2) : contextData}`
    : '';
  const effectivePrompt = `${prompt}${contextString}`;

  try {
    // ==========================================
    // 1. DOMINIO CLINICO & TRIAJE SENSIBLE (9ROUTER DEV -> OLLAMA LOCAL -> NUBE PRODUCCION)
    // ==========================================
    if (domain === 'clinical') {
      // Nivel 1 (Desarrollo): Si 9Router esta activo en la maquina del programador
      if (process.env.NODE_ENV !== 'production' || process.env.AI_ROUTER_BASE_URL) {
        try {
          const routerResult = await call9Router({
            prompt: effectivePrompt,
            systemPrompt: systemPrompt || 'Eres un asistente clinico experto apoyando a personal medico odontologico de la Dra. Aura Estudillo bajo norma NOM-004-SSA3.',
            history,
            temperature: 0.2
          });

          if (routerResult) {
            return {
              success: true,
              domain,
              result: routerResult,
              provider: '9router-gateway/claude-sonnet-4.5',
              executionTimeMs: Date.now() - startTime
            };
          }
        } catch {}
      }

      // Nivel 2: Servidor local de Ollama (si la clinica tiene servidor dedicado on-premise)
      const localResult = await callOllamaLocal({
        prompt: effectivePrompt,
        systemPrompt: systemPrompt || 'Eres un asistente clinico experto apoyando a personal medico odontologico de la Dra. Aura Estudillo bajo norma NOM-004-SSA3.',
        history,
        temperature: 0.2
      });

      if (localResult) {
        return {
          success: true,
          domain,
          result: localResult,
          provider: 'ollama-local/llama3',
          executionTimeMs: Date.now() - startTime
        };
      }

      // Nivel 3 (Entrega al Cliente / Produccion Autonoma en Nube):
      // Intento con Anthropic Cloud oficial si existe API Key
      if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '') {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            system: systemPrompt || 'Eres un asistente clinico experto apoyando a personal medico odontologico de la Dra. Aura Estudillo.',
            messages: [
              ...history.map(h => ({ role: h.role, content: h.content })),
              { role: 'user', content: effectivePrompt }
            ]
          });

          const textContent = response.content.find(c => c.type === 'text');
          if (textContent && textContent.text) {
            return {
              success: true,
              domain,
              result: textContent.text,
              provider: 'anthropic/claude-3.5-sonnet',
              executionTimeMs: Date.now() - startTime
            };
          }
        } catch (anthropicError: any) {
          console.warn('[AI Router] Anthropic fallo. Conmutando a fallback de alta velocidad...', anthropicError.message);
        }
      }

      // Nivel 4 (Nube Produccion Resiliente): Groq Cloud LLM
      try {
        const fallbackRes = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt || 'Eres un asistente clinico experto odontologico de Audenti Dental Studio bajo norma NOM-004-SSA3.' },
            ...history,
            { role: 'user', content: effectivePrompt }
          ],
          temperature: 0.2
        });

        return {
          success: true,
          domain,
          result: fallbackRes.choices[0]?.message?.content || '',
          provider: 'groq/clinical-cloud-production',
          executionTimeMs: Date.now() - startTime
        };
      } catch (groqErr: any) {
        console.warn('[AI Router] Groq clinico no disponible. Conmutando a Gemini Cloud...', groqErr.message);
      }

      // Nivel 5 (Respaldo Maximo Nube): Google Gemini Cloud
      try {
        const geminiModel = googleAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const geminiRes = await geminiModel.generateContent([
          systemPrompt || 'Eres un asistente clinico odontologico de Audenti Dental Studio.',
          effectivePrompt
        ]);

        return {
          success: true,
          domain,
          result: geminiRes.response.text(),
          provider: 'google/gemini-clinical-cloud',
          executionTimeMs: Date.now() - startTime
        };
      } catch (finalErr: any) {
        console.error('[AI Router Error Fatal] Ningun proveedor clinico respondio:', finalErr.message);
        return {
          success: false,
          domain,
          result: '',
          error: 'Servicio clinico temporalmente saturado. Reintente en un momento.',
          provider: 'none',
          executionTimeMs: Date.now() - startTime
        };
      }
    }

    // ==========================================
    // 2. DOMINIO CHAT DE PACIENTES (<300ms objetivo en Groq con Function Calling & Concierge)
    // ==========================================
    if (domain === 'patient_chat') {
      const dynamicSystemPrompt = systemPrompt || buildDynamicConciergePrompt({
        doctorBranch: contextData?.doctorBranch || contextData?.clinicName,
        patientLocation: contextData?.patientLocation,
        isAfterHours: contextData?.isAfterHours
      });

      // Detección estricta de urgencia o dolor agudo en el mensaje del usuario
      const painOrEmergencyRegex = /(?:dolor|duele|muela|aguanto|urgente|urgencia|emergencia|sangr|hinchad|inflamad|infecci|ca[ií]da|golpe|quebr|fractur|absceso|pus)/i;
      const isUrgent = painOrEmergencyRegex.test(effectivePrompt);

      // Extracción de nombre y teléfono del prompt o historial
      const fullContextText = `${effectivePrompt} ${history.map(h => h.content).join(' ')}`;
      const phoneMatch = fullContextText.match(/\b\d{10}\b/) || fullContextText.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
      const extractedPhone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : (contextData?.phone || 'No provisto');

      const nameMatch = fullContextText.match(/(?:me llamo|mi nombre es|soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,25}(?:\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,25})?)/i) ||
                         fullContextText.match(/\b([A-ZÁÉÍÓÚ][a-zñáéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-zñáéíóú]+)?)\b/);
      const extractedName = contextData?.patientName || (nameMatch ? nameMatch[1].trim() : 'Paciente');

      const conversationMessages: any[] = [
        { role: 'system', content: dynamicSystemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: effectivePrompt }
      ];

      try {
        // Si el usuario reporta dolor o urgencia, forzar tool_choice a escalateEmergencyTriage
        const toolChoice = isUrgent
          ? { type: 'function' as const, function: { name: 'escalateEmergencyTriage' } }
          : 'auto';

        // Invocación a Groq con Function Calling / Tools activas
        const chatRes = await groq.chat.completions.create({
          model: 'openai/gpt-oss-20b',
          messages: conversationMessages,
          tools: conciergeChatTools,
          tool_choice: toolChoice,
          max_tokens: 450,
          temperature: 0.3
        });

        const responseMessage = chatRes.choices[0]?.message;

        // Si el modelo decide invocar herramientas para consultar Supabase
        if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
          conversationMessages.push(responseMessage);

          for (const toolCall of responseMessage.tool_calls) {
            const fnName = toolCall.function.name;
            let fnArgs: Record<string, any> = {};
            try {
              fnArgs = JSON.parse(toolCall.function.arguments || '{}');
            } catch {
              fnArgs = {};
            }

            // Inyectar contexto si falta en argumentos
            if (!fnArgs.phone || fnArgs.phone === 'No provisto') fnArgs.phone = extractedPhone;
            if (!fnArgs.patientName || fnArgs.patientName === 'Paciente Urgencia') fnArgs.patientName = extractedName;
            if (contextData?.userZone && !fnArgs.userZone) fnArgs.userZone = contextData.userZone;
            if (fnName === 'escalateEmergencyTriage' && !fnArgs.symptoms) {
              fnArgs.symptoms = effectivePrompt;
            }

            // Ejecución contra la base de datos Supabase
            const toolOutput = await executeConciergeTool(fnName, fnArgs);

            conversationMessages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: fnName,
              content: JSON.stringify(toolOutput)
            });
          }

          // Si fue urgencia, aplicar la respuesta clínica oficial estricta sin alucinaciones
          const hasEmergencyEscalation = responseMessage.tool_calls.some(
            tc => tc.function.name === 'escalateEmergencyTriage'
          );

          if (hasEmergencyEscalation) {
            const officialEmergencyResponse = `${extractedName}, he activado la alerta de emergencia en la pantalla de la Dra. Aura Estudillo. Tus datos y tu caso ya están en su panel para que evalúe recibirte de inmediato. En un momento la doctora autorizará la atención.`;
            return {
              success: true,
              domain,
              result: officialEmergencyResponse,
              triageCategory: 'urgency_pain',
              appointmentCreated: false,
              provider: 'groq/patient-chat-emergency-direct',
              executionTimeMs: Date.now() - startTime
            };
          }

          // Segunda pasada para generar la respuesta contextual final con los datos reales para citas no urgentes
          const secondTurn = await groq.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: conversationMessages,
            max_tokens: 450,
            temperature: 0.5
          });

          // Función auxiliar para limpiar Markdown crudo agresivo (###, ---, etc.)
          const cleanText = (txt: string) => {
            if (!txt) return '';
            return txt
              .replace(/^---+$/gm, '')
              .replace(/^[#]+\s+/gm, '')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
          };

          const rawReply = secondTurn.choices[0]?.message?.content || '';
          const cleanedReply = cleanText(rawReply);

          const hasCreatedAppointment = responseMessage.tool_calls.some(
            tc => tc.function.name === 'createAppointment'
          );

          return {
            success: true,
            domain,
            result: cleanedReply,
            appointmentCreated: hasCreatedAppointment,
            provider: 'groq/patient-chat-concierge-tools',
            executionTimeMs: Date.now() - startTime
          };
        }

        // Si el usuario reportó dolor/urgencia pero el modelo no ejecutó la tool por alguna razón, ejecutarla programáticamente de inmediato
        if (isUrgent) {
          await executeConciergeTool('escalateEmergencyTriage', {
            symptoms: effectivePrompt,
            patientName: extractedName,
            phone: extractedPhone,
            painLevel: 'severo',
            targetBranch: contextData?.doctorBranch || 'Sede Balbuena'
          });

          const directUrgentReply = `${extractedName}, he activado la alerta de emergencia en la pantalla de la Dra. Aura Estudillo. Tus datos y tu caso ya están en su panel para que evalúe recibirte de inmediato. En un momento la doctora autorizará la atención.`;

          return {
            success: true,
            domain,
            result: directUrgentReply,
            triageCategory: 'urgency_pain',
            provider: 'groq/patient-chat-urgent-enforced',
            executionTimeMs: Date.now() - startTime
          };
        }

        const rawContent = responseMessage?.content || '';
        const cleanReply = rawContent
          .replace(/^---+$/gm, '')
          .replace(/^[#]+\s+/gm, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        return {
          success: true,
          domain,
          result: cleanReply,
          provider: 'groq/patient-chat-concierge',
          executionTimeMs: Date.now() - startTime
        };
      } catch (chatError: any) {
        console.warn('[AI Router Warning] Falló motor principal de chat de pacientes. Activando fallback ultra-rápido...', chatError.message);
        
        try {
          if (isUrgent) {
            await executeConciergeTool('escalateEmergencyTriage', {
              symptoms: effectivePrompt,
              patientName: extractedName,
              phone: extractedPhone,
              painLevel: 'severo',
              targetBranch: contextData?.doctorBranch || 'Sede Balbuena'
            });

            return {
              success: true,
              domain,
              result: `${extractedName}, he activado la alerta de emergencia en la pantalla de la Dra. Aura Estudillo. Tus datos y tu caso ya están en su panel para que evalúe recibirte de inmediato. En un momento la doctora autorizará la atención.`,
              triageCategory: 'urgency_pain',
              provider: 'groq/patient-chat-emergency-failover',
              executionTimeMs: Date.now() - startTime
            };
          }

          // Fallback a modelo secundario ultra-rápido en Groq sin tools para garantizar respuesta humana 100% garantizada
          const fallbackRes = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            messages: [
              {
                role: 'system',
                content: 'Eres Aura AI, la asistente de la clínica dental Audenti de la Dra. Aura Estudillo (Cédula 8492019). Responde con cordialidad, calidez médica y claridad en español de México en texto plano. Tu labor es saludar cordialmente, orientar sobre salud bucal y tomar solicitudes. TIENES ESTRICTAMENTE PROHIBIDO dar precios o cotizaciones numéricas, y NUNCA debes confirmar fechas ni horas de cita por tu cuenta; siempre aclara que le avisarás a la Dra. Aura Estudillo para que ella evalúe su agenda y le confirme la cita directamente vía WhatsApp. Si reportan dolor o urgencia, avísales que su caso ya fue notificado a la doctora para contactarlos de inmediato y recomiéndales no automedicarse.'
              },
              ...history.map(h => ({ role: h.role, content: h.content })),
              { role: 'user', content: effectivePrompt }
            ],
            max_tokens: 400,
            temperature: 0.5
          });

          const rawFallback = fallbackRes.choices[0]?.message?.content || '¡Hola! Con gusto te atiendo en Audenti. ¿Qué día y horario te acomodaría mejor para tu valoración con la Dra. Aura Estudillo?';
          const cleanFallback = rawFallback
            .replace(/^---+$/gm, '')
            .replace(/^[#]+\s+/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          return {
            success: true,
            domain,
            result: cleanFallback,
            provider: 'groq/patient-chat-fallback',
            executionTimeMs: Date.now() - startTime
          };
        } catch (secondaryError: any) {
          console.error('[AI Router Error] Fallback de chat secundario también falló:', secondaryError.message);
          return {
            success: true,
            domain,
            result: '¡Hola! Con mucho gusto te atendemos en la clínica dental Audenti de la Dra. Aura Estudillo. Nuestro horario es de Lunes a Sábado de 09:00 a 19:30 hrs en nuestras sedes Balbuena y Chalma de Guadalupe. ¿Qué día o procedimiento tienes en mente?',
            provider: 'audenti/concierge-resilience-fallback',
            executionTimeMs: Date.now() - startTime
          };
        }
      }
    }

    // ==========================================
    // 3. DOMINIO FINANCIERO (Estructuración JSON estricta)
    // ==========================================
    if (domain === 'finance') {
      const financeRes = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt || 'Eres un analista financiero experto en clínicas dentales. Devuelve estrictamente un objeto JSON válido con los balances y métricas.' },
          { role: 'user', content: effectivePrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });

      let parsedResult;
      try {
        parsedResult = JSON.parse(financeRes.choices[0]?.message?.content || '{}');
      } catch (e) {
        parsedResult = { raw: financeRes.choices[0]?.message?.content };
      }

      return {
        success: true,
        domain,
        result: parsedResult,
        provider: 'groq/finance-json',
        executionTimeMs: Date.now() - startTime
      };
    }

    // ==========================================
    // 4. DOMINIO BUSINESS INTELLIGENCE (Google Gemini 1.5 Pro)
    // ==========================================
    if (domain === 'bi') {
      try {
        const model = googleAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent([
          systemPrompt || 'Analiza los datos ejecutivos y métricas clínicas de Audenti:',
          effectivePrompt
        ]);
        const responseText = result.response.text();

        return {
          success: true,
          domain,
          result: responseText,
          provider: 'google/gemini-1.5-pro',
          executionTimeMs: Date.now() - startTime
        };
      } catch (geminiError: any) {
        console.warn('[AI Router] Gemini BI falló. Conmutando a Groq analítico...', geminiError.message);
        
        const fallbackBI = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Fallback analítico BI de Audenti.' },
            { role: 'user', content: effectivePrompt }
          ]
        });

        return {
          success: true,
          domain,
          result: fallbackBI.choices[0]?.message?.content || '',
          provider: 'groq/fallback-bi',
          executionTimeMs: Date.now() - startTime
        };
      }
    }

    // ==========================================
    // 5. DOMINIO SCHEDULING (Function Calling / Citas)
    // ==========================================
    if (domain === 'scheduling') {
      try {
        const conversationMessages: any[] = [
          { role: 'system', content: systemPrompt || 'Asistente de agendamiento y citas dentales de la clínica Audenti.' },
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: effectivePrompt }
        ];

        const schedRes = await groq.chat.completions.create({
          model: 'openai/gpt-oss-20b',
          messages: conversationMessages,
          tools: conciergeChatTools,
          tool_choice: 'auto',
          temperature: 0.2
        });

        const respMsg = schedRes.choices[0]?.message;

        if (respMsg?.tool_calls && respMsg.tool_calls.length > 0) {
          conversationMessages.push(respMsg);
          for (const tc of respMsg.tool_calls) {
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(tc.function.arguments || '{}'); } catch {}
            const toolRes = await executeConciergeTool(tc.function.name, parsedArgs);
            conversationMessages.push({
              tool_call_id: tc.id,
              role: 'tool',
              name: tc.function.name,
              content: JSON.stringify(toolRes)
            });
          }

          const secondTurn = await groq.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: conversationMessages,
            temperature: 0.2
          });

          return {
            success: true,
            domain,
            result: secondTurn.choices[0]?.message?.content || '',
            provider: 'groq/scheduling-tools',
            executionTimeMs: Date.now() - startTime
          };
        }

        return {
          success: true,
          domain,
          result: respMsg?.content || '',
          provider: 'groq/scheduling',
          executionTimeMs: Date.now() - startTime
        };
      } catch (schedErr: any) {
        console.error('[Scheduling Error]:', schedErr.message);
        throw schedErr;
      }
    }

    throw new Error(`Dominio de IA no reconocido: ${domain}`);

  } catch (error: any) {
    console.error(`[AI Router Critical Error] Dominio: ${domain}`, error);
    return {
      success: false,
      domain,
      result: null,
      provider: 'none',
      executionTimeMs: Date.now() - startTime,
      error: error.message || 'Error desconocido en el enrutador de IA'
    };
  }
}

/**
 * Función de compatibilidad para llamadas legadas (routeAITask)
 */
export async function routeAITask(taskType: AITaskDomain, payload: any) {
  const prompt = payload.prompt || payload.clinicalText || payload.userMessage || 'Procesar requerimiento';
  const domain = taskType as AITaskDomain;
  const res = await executeAIAgent({
    domain,
    prompt,
    contextData: payload.dataContext
  });

  return {
    success: res.success,
    domain: res.domain,
    taskType: res.domain,
    model: res.provider,
    result: typeof res.result === 'string' ? res.result : (res.result?.analysis || res.result?.result || JSON.stringify(res.result)),
    content: typeof res.result === 'string' ? res.result : (res.result?.analysis || res.result?.content || JSON.stringify(res.result)),
    executionTimeMs: res.executionTimeMs,
    latencyMs: res.executionTimeMs,
    error: res.error
  };
}
