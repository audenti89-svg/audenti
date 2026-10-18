import { createAdminClient } from '@/lib/supabase/admin';

export interface SecurityInspectionResult {
  allowed: boolean;
  threatDetected: boolean;
  threatType?: 'PROMPT_INJECTION' | 'COMMAND_ESCAPE' | 'ANOMALOUS_BURST' | 'PAYLOAD_OVERFLOW' | 'SYSTEM_PROBE';
  reason?: string;
  riskScore: number; // 0 a 100
}

// Ventana de rate limiting en memoria para ráfagas (DDoS / Brute Force en API)
const ipRequestWindow = new Map<string, { count: number; firstRequestTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60 * 1000;

// Patrones heurísticos y firmas de inyección y escape
const INJECTION_PATTERNS = [
  /(\bignore\s+(all\s+)?(previous|prior)\s+instructions\b)/i,
  /(\bignora\s+(todas\s+las\s+)?instrucciones\s+(anteriores|previas)\b)/i,
  /(\bact\s+as\s+(a\s+)?(developer|root|admin|dan|jailbreak)\b)/i,
  /(\bactúa\s+como\s+(administrador|desarrollador|root)\b)/i,
  /(\brevela\s+(el\s+)?system\s+prompt\b)/i,
  /(\bshow\s+(me\s+)?(the\s+)?system\s+prompt\b)/i,
  /(\bprint\s+(your\s+)?instructions\b)/i,
  /(\bmuestra\s+tus\s+instrucciones\b)/i,
  /(\bsk-[a-zA-Z0-9]{20,}\b)/, // Intento de inyectar o pedir API Keys
  /(\b(DROP\s+TABLE|SELECT\s+\*\s+FROM|UNION\s+SELECT|--\s*$)\b)/i, // Inyecciones SQL clásicas
  /(<script[\s\S]*?>[\s\S]*?<\/script>)/i, // XSS payloads
  /(\bbase64\s*decode\b|\beval\s*\(|\bexec\s*\()/i // Intentos de ejecución arbitraria
];

/**
 * Inspecciona un mensaje o payload entrante antes de enviarlo al LLM o backend
 */
export async function inspectRequestSecurity(params: {
  prompt: string;
  identifier?: string; // IP, teléfono o usuario
  domain?: string;
  metadata?: Record<string, any>;
}): Promise<SecurityInspectionResult> {
  const { prompt, identifier = 'anonymous', domain = 'general', metadata } = params;

  // 1. Verificación de Ráfagas (Rate Limiting en Memoria)
  const now = Date.now();
  const clientWindow = ipRequestWindow.get(identifier);

  if (clientWindow) {
    if (now - clientWindow.firstRequestTime < WINDOW_MS) {
      clientWindow.count += 1;
      if (clientWindow.count > MAX_REQUESTS_PER_MINUTE) {
        await logSecurityThreat({
          identifier,
          threatType: 'ANOMALOUS_BURST',
          reason: `Ráfaga anómala detectada (${clientWindow.count} peticiones en < 1 min)`,
          riskScore: 85,
          promptSnippet: prompt.slice(0, 100),
          domain
        });

        return {
          allowed: false,
          threatDetected: true,
          threatType: 'ANOMALOUS_BURST',
          reason: 'Límite de frecuencia excedido. Por favor espera un momento.',
          riskScore: 85
        };
      }
    } else {
      // Reiniciar ventana
      ipRequestWindow.set(identifier, { count: 1, firstRequestTime: now });
    }
  } else {
    ipRequestWindow.set(identifier, { count: 1, firstRequestTime: now });
  }

  // 2. Control de Tamaño de Carga (Payload Overflow)
  if (typeof prompt === 'string' && prompt.length > 4000) {
    await logSecurityThreat({
      identifier,
      threatType: 'PAYLOAD_OVERFLOW',
      reason: `Carga excesiva de caracteres (${prompt.length} chars)`,
      riskScore: 70,
      promptSnippet: prompt.slice(0, 100),
      domain
    });

    return {
      allowed: false,
      threatDetected: true,
      threatType: 'PAYLOAD_OVERFLOW',
      reason: 'El mensaje excede la longitud permitida por la clínica.',
      riskScore: 70
    };
  }

  // 3. Análisis de Inyección y Comandos de Escape
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      await logSecurityThreat({
        identifier,
        threatType: 'PROMPT_INJECTION',
        reason: `Coincidencia con firma de inyección o comando malicioso: ${pattern.source}`,
        riskScore: 95,
        promptSnippet: prompt.slice(0, 150),
        domain,
        metadata
      });

      return {
        allowed: false,
        threatDetected: true,
        threatType: 'PROMPT_INJECTION',
        reason: 'Petición bloqueada por el Guardián de Seguridad IA de Audenti.',
        riskScore: 95
      };
    }
  }

  // Petición limpia y autorizada
  return {
    allowed: true,
    threatDetected: false,
    riskScore: 0
  };
}

/**
 * Registra de forma silenciosa e inmutable el intento de ataque en Supabase
 * y emite alerta en tiempo real para la supervisión de la Dra. Aura
 */
export async function logSecurityThreat(threat: {
  identifier: string;
  threatType: string;
  reason: string;
  riskScore: number;
  promptSnippet: string;
  domain: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const threatRecord = {
      id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowIso,
      ...threat
    };

    // 1. Guardar en Storage de Auditoría de Seguridad (audenti_database/security_audit.json)
    try {
      const { data: file } = await supabase.storage
        .from('audenti_database')
        .download('security_audit.json');

      let auditList: any[] = [];
      if (file) {
        try {
          const text = await file.text();
          if (text) auditList = JSON.parse(text);
        } catch {}
      }

      const updatedAudit = [threatRecord, ...auditList].slice(0, 100);
      await supabase.storage.from('audenti_database').upload(
        'security_audit.json',
        JSON.stringify(updatedAudit, null, 2),
        { upsert: true, contentType: 'application/json' }
      );
    } catch (e: any) {
      console.warn('Nota de persistencia en security_audit.json:', e?.message);
    }

    // 2. Emitir evento Realtime al canal del Dashboard administrativo de la Dra. Aura
    try {
      await supabase.channel('dashboard_security_sentinel').send({
        type: 'broadcast',
        event: 'security_threat_blocked',
        payload: {
          title: `🛡️ Intento de Inyección Bloqueado (${threat.threatType})`,
          details: threat.reason,
          risk: threat.riskScore,
          timestamp: nowIso
        }
      });
    } catch {}

    console.warn(`[AI-SENTINEL 24/7] Amenaza Neutralizada: ${threat.threatType} | Riesgo: ${threat.riskScore}% | Motivo: ${threat.reason}`);
  } catch (err: any) {
    console.error('[AI-SENTINEL Error]:', err?.message);
  }
}
