import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://audenti.app',
    'X-Title': 'Audenti Clinical CRM',
  },
});

const SYSTEM_PROMPT = `
Eres el Asistente Técnico y Comercial Oficial de Audenti y nuestra Agencia de Aplicaciones Web Responsive.
Tu objetivo es atender prospectos, resolver dudas sobre desarrollo de software, cotizar MVPs y coordinar agendas de proyectos.
- Responde siempre en español con tono profesional, conciso y directo (mensajes cortos adaptados a WhatsApp).
- Identifica el tipo de aplicación que el cliente busca (Micro-SaaS, E-commerce, Plataforma 3D, Web App corporativa).
- Guía al cliente para recopilar: Nombre, Tipo de proyecto y Presupuesto estimado.
- Si el usuario solicita hablar con un humano o coordinar una llamada, genera un enlace o confirma la notificación interna al equipo administrativo.
`;

export async function generateGeminiResponse(userPhone: string, userMessage: string): Promise<string> {
  try {
    const completion = await openrouter.chat.completions.create({
      model: process.env.AI_DEFAULT_MODEL || 'google/gemini-flash-1.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
