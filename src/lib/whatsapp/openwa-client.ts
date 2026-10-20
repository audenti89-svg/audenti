/**
 * OpenWA Client Adapter for Audenti CRM
 * Connects the CRM to the OpenWA local gateway (Port 2785)
 */

export interface OpenWAConfig {
  baseUrl: string;
  apiKey: string;
}

export class OpenWAClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config?: Partial<OpenWAConfig>) {
    this.baseUrl = (config?.baseUrl || process.env.OPENWA_BASE_URL || 'http://localhost:2785').replace(/\/$/, '');
    this.apiKey = config?.apiKey || process.env.OPENWA_API_KEY || '';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenWA API Error: ${response.status} - ${error}`);
    }
    return response.json();
  }

  async sendText(sessionId: string, chatId: string, text: string): Promise<boolean> {
    try {
      const cleanChatId = chatId.includes('@') ? chatId : `${chatId.replace(/\D/g, '')}@c.us`;
      // OpenWA standard endpoint is /api/sessions/{sessionId}/messages/send-text
      await this.request(`/api/sessions/${sessionId}/messages/send-text`, {
        method: 'POST',
        body: JSON.stringify({
          chatId: cleanChatId,
          text: text,
        }),
      });
      return true;
    } catch (err) {
      console.error('[OpenWA Client] SendText Error:', err);
      // Fallback try to /messages/send
      try {
        const cleanChatId = chatId.includes('@') ? chatId : `${chatId.replace(/\D/g, '')}@c.us`;
        await this.request(`/api/sessions/${sessionId}/messages/send`, {
          method: 'POST',
          body: JSON.stringify({
            chatId: cleanChatId,
            text: text,
          }),
        });
        return true;
      } catch (fallbackErr) {
        console.error('[OpenWA Client] Fallback SendText Error:', fallbackErr);
        return false;
      }
    }
  }

  async getSessionStatus(sessionId: string) {
    try {
      return await this.request(`/api/sessions/${sessionId}`);
    } catch (err) {
      console.error('[OpenWA Client] SessionStatus Error:', err);
      return null;
    }
  }

  async getSessionQR(sessionId: string) {
    try {
      return await this.request(`/api/sessions/${sessionId}/qr`);
    } catch (err) {
      console.error('[OpenWA Client] SessionQR Error:', err);
      return null;
    }
  }

  async createSession(sessionId: string) {
    try {
      return await this.request(`/api/sessions`, {
        method: 'POST',
        body: JSON.stringify({ name: sessionId })
      });
    } catch (err) {
      console.error('[OpenWA Client] CreateSession Error:', err);
      return null;
    }
  }
}

export const openWAClient = new OpenWAClient();
