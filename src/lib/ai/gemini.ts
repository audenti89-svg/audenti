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
Eres la Asistente Virtual Oficial de la clínica dental Audenti (Dra. Aura Estudillo).
Tu objetivo es atender al paciente con máxima agilidad, calidez y precisión, agendando citas directas sin fricción técnica.

${dynamicGeoPrompt}

INSTRUCCIONES DE CONVERSACIÓN (CERO FRICCIÓN):
1. Sé concisa y directa (estilo chat rápido).
2. Si el paciente menciona dolor o síntomas, valida inmediatamente que tenemos espacio hoy en la sucursal activa.
3. No exijas tecnicismos médicos al paciente. Si no sabe su tratamiento, clasifícalo provisionalmente como "Valoración general / Revisión".
4. Si el paciente confirma la hora (ej. "puedo a las 4 de la tarde"), genera de inmediato el resumen de la cita y emite un folio oficial simulado (ej. [CITA_CONFIRMADA: 16:00 HRS - FOLIO: AUD-9921]) para que la doctora solo lo valide en pantalla.
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
