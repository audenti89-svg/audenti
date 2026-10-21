/**
 * AI Dispatcher - Audenti CRM
 *
 * Versión Final Optimizada para Vercel.
 * Integración con Agroq, Gemini y Ollama.
 */

export type AIRole = 'SALES' | 'SUPPORT' | 'ANALYST' | 'SECURITY';

interface AIResponse {
  content: string;
  role: AIRole;
  model: string;
  latency: number;
}

export class AIDispatcher {
  private static get API_KEYS() {
    return {
      AGROQ: process.env.AGROQ,
      GEMINI: process.env.GEMINI,
      OLLAMA_URL: process.env.OLLAMA_TUNNEL_URL || 'http://localhost:11434',
      OPENWA_BASE_URL: process.env.OPENWA_BASE_URL,
    };
  }

  private static async callAgroq(prompt: string): Promise<AIResponse> {
    console.log("[AI-DISPATCHER] Llamando a Agroq (Soporte)...");
    const start = Date.now();

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEYS.AGROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'system', content: 'Eres el empleado de soporte técnico de Audenti. Sé rápido, conciso y amable.' }, { role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        role: 'SUPPORT',
        model: 'agroq-llama3',
        latency: Date.now() - start
      };
    } catch (e) {
      console.error("Error en Agroq:", e);
      return { content: "Error de conexión con Soporte (Agroq).", role: 'SUPPORT', model: 'error', latency: 0 };
    }
  }

  private static async callGemini(prompt: string): Promise<AIResponse> {
    console.log("[AI-DISPATCHER] Llamando a Gemini (Ventas)...");
    const start = Date.now();

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.API_KEYS.GEMINI}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Eres el mejor ejecutivo de ventas de Audenti. Tu objetivo es cerrar citas y persuadir al cliente: ${prompt}` }] }]
        }),
      });
      const data = await response.json();
      return {
        content: data.candidates[0].content.parts[0].text,
        role: 'SALES',
        model: 'gemini-pro',
        latency: Date.now() - start
      };
    } catch (e) {
      console.error("Error en Gemini:", e);
      return { content: "Error de conexión con Ventas (Gemini).", role: 'SALES', model: 'error', latency: 0 };
    }
  }

  private static async callOllama(prompt: string): Promise<AIResponse> {
    console.log("[AI-DISPATCHER] Llamando a Ollama (Analista Local)...");
    const start = Date.now();

    try {
      const response = await fetch(`${this.API_KEYS.OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          messages: [{ role: 'system', content: 'Eres el analista de datos interno de Audenti. Manejas información confidencial con rigor.' }, { role: 'user', content: prompt }],
          stream: false
        }),
      });
      const data = await response.json();
      return {
        content: data.message.content,
        role: 'ANALYST',
        model: 'ollama-local',
        latency: Date.now() - start
      };
    } catch (e) {
      console.error("Error en Ollama:", e);
      return { content: "Error de conexión con el servidor local.", role: 'ANALYST', model: 'error', latency: 0 };
    }
  }

  public static async dispatch(prompt: string, role: AIRole): Promise<AIResponse> {
    switch (role) {
      case 'SUPPORT':
        return this.callAgroq(prompt);
      case 'SALES':
        return this.callGemini(prompt);
      case 'ANALYST':
        return this.callOllama(prompt);
      case 'SECURITY':
        return this.callAgroq(`SISTEMA de SEGURIDAD: Analiza malicia: ${prompt}`);
      default:
        throw new Error(`Rol de IA no soportado: ${role}`);
    }
  }
}
