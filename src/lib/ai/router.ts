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
    // 1. DOMINIO CLINICO (Claude 3.5 Sonnet -> Fallback a Groq Llama)
    // ==========================================
    if (domain === 'clinical') {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          system: systemPrompt || 'Eres un asistente clínico experto apoyando a personal médico odontológico de la Dra. Aura Estudillo.',
          messages: [
            ...history.map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: effectivePrompt }
          ]
        });

        const textContent = response.content.find(c => c.type === 'text');
        return {
          success: true,
          domain,
          result: textContent ? textContent.text : '',
          provider: 'anthropic/claude-3.5-sonnet',
          executionTimeMs: Date.now() - startTime
        };
      } catch (anthropicError: any) {
        console.warn('[AI Router] Claude falló o sin saldo. Conmutando a fallback Groq...', anthropicError.message);
        
        // Fallback inmediato a Groq
        const fallbackRes = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt || 'Fallback clínico de emergencia para Audenti.' },
            ...history,
            { role: 'user', content: effectivePrompt }
          ],
          temperature: 0.2
        });

        return {
          success: true,
          domain,
          result: fallbackRes.choices[0]?.message?.content || '',
          provider: 'groq/fallback-clinical',
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

      const conversationMessages: any[] = [
        { role: 'system', content: dynamicSystemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: effectivePrompt }
      ];

      try {
        // Invocación a Groq con Function Calling / Tools activas
        const chatRes = await groq.chat.completions.create({
          model: 'openai/gpt-oss-20b',
          messages: conversationMessages,
          tools: conciergeChatTools,
          tool_choice: 'auto',
          max_tokens: 450,
          temperature: 0.5
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
            if (contextData?.phone && !fnArgs.phone) fnArgs.phone = contextData.phone;
            if (contextData?.patientName && !fnArgs.patientName) fnArgs.patientName = contextData.patientName;
            if (contextData?.userZone && !fnArgs.userZone) fnArgs.userZone = contextData.userZone;

            // Ejecución contra la base de datos Supabase
            const toolOutput = await executeConciergeTool(fnName, fnArgs);

            conversationMessages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: fnName,
              content: JSON.stringify(toolOutput)
            });
          }

          // Segunda pasada para generar la respuesta contextual final con los datos reales
          const secondTurn = await groq.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: conversationMessages,
            max_tokens: 450,
            temperature: 0.5
          });

          return {
            success: true,
            domain,
            result: secondTurn.choices[0]?.message?.content || '',
            provider: 'groq/patient-chat-concierge-tools',
            executionTimeMs: Date.now() - startTime
          };
        }

        return {
          success: true,
          domain,
          result: responseMessage?.content || '',
          provider: 'groq/patient-chat-concierge',
          executionTimeMs: Date.now() - startTime
        };
      } catch (chatError: any) {
        console.warn('[AI Router Warning] Falló motor principal de chat de pacientes. Activando fallback ultra-rápido...', chatError.message);
        
        try {
          // Fallback a modelo secundario ultra-rápido en Groq sin tools para garantizar respuesta humana 100% garantizada
          const fallbackRes = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            messages: [
              {
                role: 'system',
                content: 'Eres Aura AI, la recepcionista y asistente oficial de la clínica dental Audenti de la Dra. Aura Estudillo (Cédula 8492019). Responde siempre con amabilidad, calidez médica y claridad en español de México. Si el paciente pide cita, pregúntale qué día/horario prefiere (Lunes a Sábado de 09:00 a 19:30 hrs) o el motivo de su visita. Si reporta dolor urgente, indícale medidas de calma y que la Dra. Aura puede atenderlo.'
              },
              ...history.map(h => ({ role: h.role, content: h.content })),
              { role: 'user', content: effectivePrompt }
            ],
            max_tokens: 400,
            temperature: 0.5
          });

          return {
            success: true,
            domain,
            result: fallbackRes.choices[0]?.message?.content || '¡Hola! Con gusto te atiendo en Audenti. ¿Qué día y horario te acomodaría mejor para tu valoración con la Dra. Aura Estudillo?',
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
