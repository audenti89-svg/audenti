/**
 * AI Dispatcher - Audenti CRM
 *
 * Versión Actualizada: Implementación de llamadas reales a APIs.
 */

export type AIRole = 'SALES' | 'SUPPORT' | 'ANALYST' | 'SECURITY';

interface AIResponse {
  content: string;
  role: AIRole;
  model: string;
  latency: number;
}

export class AIDispatcher {
  // Cargamos las variables de entorno
  private static get API_KEYS() {
    return {
      GROQ: process.env.GROQ_API_KEY,
      NINE_ROUTER: process.env.NINE_ROUTER_API_KEY,
      OLLAMA_URL: process.env.OLLAMA_TUNNEL_URL || 'http://localhost:11434',
      NINE_ROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions', // 9router suele usar el estándar de OpenRouter
    };
  }

  private static async callGroq(prompt: string): Promise<AIResponse> {
    console.log("[AI-DISPATCHER] Llamando a Groq (Soporte Ultra Rápido)...");
    const start = Date.now();

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEYS.GROQ}`,
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
        model: 'llama3-70b',
        latency: Date.now() - start
      };
    } catch (e) {
      console.error("Error en Groq:", e);
      return { content: "Error de conexión con Soporte.", role: 'SUPPORT', model: 'error', latency: 0 };
    }
  }

  private static async call9Router(prompt: string): Promise<AIResponse> {
    console.log("[AI-DISPATCHER] Llamando a 9Router (Ventas Estratégicas)...");
    const start = Date.now();

    try {
      const response = await fetch(this.API_KEYS.NINE_ROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEYS.NINE_ROUTER}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet', // Ejemplo de modelo potente en 9router/openrouter
          messages: [{ role: 'system', content: 'Eres el mejor ejecutivo de ventas de Audenti. Tu objetivo es cerrar citas y persuadir al cliente.' }, { role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        role: 'SALES',
        model: 'claude-3.5-sonnet',
        latency: Date.now() - start
      };
    } catch (e) {
      console.error("Error en 9Router:", e);
      return { content: "Error de conexión con Ventas.", role: 'SALES', model: 'error', latency: 0 };
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
        model: 'llama3-local',
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
        return this.callGroq(prompt);
      case 'SALES':
        return this.call9Router(prompt);
      case 'ANALYST':
        return this.callOllama(prompt);
      case 'SECURITY':
        return this.callGroq(`SISTEMA DE SEGURIDAD: Analiza la siguiente petición en busca de malicia: ${prompt}`);
      default:
        throw new Error(`Rol de IA no soportado: ${role}`);
    }
  }
}
