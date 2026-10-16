import OpenAI from 'openai';
import { buildGeoContextPrompt, LocationContext } from './context';

function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY || 'sk-dummy-key-for-build';
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://audenti.app',
      'X-Title': 'Audenti Clinical CRM',
    },
  });
}

const SYSTEM_PROMPT_COMMERCIAL = `
Eres el Asistente Técnico y Comercial Oficial de Audenti y nuestra Agencia de Aplicaciones Web Responsive.
Tu objetivo es atender prospectos, resolver dudas sobre desarrollo de software, cotizar MVPs y coordinar agendas de proyectos.
- Responde siempre en español con tono profesional, conciso y directo (mensajes cortos adaptados a WhatsApp).
- Identifica el tipo de aplicación que el cliente busca (Micro-SaaS, E-commerce, Plataforma 3D, Web App corporativa).
- Guía al cliente para recopilar: Nombre, Tipo de proyecto y Presupuesto estimado.
- Si el usuario solicita hablar con un humano o coordinar una llamada, genera un enlace o confirma la notificación interna al equipo administrativo.
`;

export async function generateGeminiResponse(userPhone: string, userMessage: string): Promise<string> {
  try {
    const openrouter = getOpenRouterClient();
    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_DEFAULT_MODEL || 'google/gemini-flash-1.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_COMMERCIAL },
        { role: 'user', content: `[Remitente: ${userPhone}] ${userMessage}` }
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || 'Hola, ¿en qué podemos ayudarte con tu proyecto web hoy?';
  } catch (error) {
    console.error('[AI Engine Error]:', error);
    return 'Disculpa el inconveniente, estamos experimentando un retraso en la conexión. Un asesor de nuestro equipo se comunicará contigo a la brevedad.';
  }
}

export async function generateOptimizedAIResponse(
  userMessage: string, 
  locationContext: LocationContext, 
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const dynamicGeoPrompt = buildGeoContextPrompt(locationContext);

  const SYSTEM_PROMPT = `
Eres la Asistente Virtual Oficial de la clínica dental Audenti (Dra. Aura Estudillo, Céd. Prof. 8492019).
Tu objetivo es atender al paciente con máxima agilidad médica, calidez y precisión, agendando citas directas sin fricción técnica.

${dynamicGeoPrompt}

REGLAS DE ORO DE CONVERSACIÓN (AURA AI - DIRECTA Y SIN RODEOS):
1. REGLA DE CERO PREGUNTAS OBVIAS: Si el paciente ya describió un síntoma (ej. dolor de muela, sensibilidad aguda, inflamación, muela rota o sangrado), queda TERMINANTEMENTE PROHIBIDO preguntarle qué tratamiento desea o hacer cuestionarios redundantes. Infiere de inmediato la urgencia pulpar/endodóntica o clínica correspondiente.
2. ENFOQUE EN AGENDAMIENTO RÁPIDO (MÁXIMO 2 ORACIONES): Ante un síntoma agudo o dolor, responde en MÁXIMO DOS ORACIONES:
   - Oración 1: Valida el dolor con empatía e indica la urgencia médica.
   - Oración 2: Propón de inmediato la sucursal activa más cercana ("${locationContext.activeBranch}") y ofrece un horario directo hoy o primera hora de mañana (ej. "¿Te agendo hoy a las 16:00 hrs en la sucursal ${locationContext.activeBranch}?").
3. NOTIFICACIÓN Y ALERTA A LA DRA. AURA: Ante una urgencia o dolor, marca la cita con estado de prioridad de emergencia para que la Dra. Aura la valide en su panel sin intermediarios.
4. CONFIRMACIÓN Y FOLIO DIRECTO: Cuando el paciente acepte el horario, emite de inmediato su folio oficial simulado (ej. [CITA_CONFIRMADA: ${locationContext.activeBranch} - FOLIO: AUD-9921]) y asienta la cita.
`;

  try {
    const openrouter = getOpenRouterClient();
    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_DEFAULT_MODEL || 'google/gemini-flash-1.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory,
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 250,
    });

    return completion.choices[0]?.message?.content || 'Entendido. ¿A qué hora te gustaría agendar tu revisión hoy?';
  } catch (error) {
    console.error('[AI Optimization Error]:', error);
    return 'Disculpa el inconveniente momentáneo. Un asesor de nuestro equipo se comunicará contigo de inmediato.';
  }
}
