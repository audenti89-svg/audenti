import { useState } from 'react';
import type { AITaskType } from '@/lib/ai/router';

interface UseAIAgentProps {
  domain: AITaskType;
}

export function useAIAgent({ domain }: UseAIAgentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const runAgent = async (prompt: string, contextData?: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, prompt, contextData }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Error al comunicarse con el Agente de IA.');
      }

      setData(json.result);
      return json.result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { runAgent, loading, error, data };
}
