/**
 * =====================================================================
 * AUDENTI CLOUD PRO (2027) - SISTEMA INMUNOLÓGICO Y CIBERSEGURIDAD IA
 * Escudo Anti-Hackeo, Rate Limiting Avanzado y Detección Heurística WAF
 * Arquitecto: Ricardo Sánchez
 * =====================================================================
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

interface RateLimitBucket {
  tokens: number
  lastRefill: number
}

// Almacén en memoria volátil de alta velocidad para rate limiting
const ipRateLimitStore = new Map<string, RateLimitBucket>()

// Patrones maliciosos heurísticos
const MALICIOUS_PATTERNS = [
  // SQL Injection
  /(\bunion\b\s+select\b)/i,
  /(\bselect\b.+\bfrom\b.+\binformation_schema\b)/i,
  /(\bdrop\b\s+table\b)/i,
  /(\binsert\b\s+into\b.+\bvalues\b)/i,
  /('|\%27)\s*or\s*('|\%27)?\d+('|\%27)?\s*=\s*('|\%27)?\d+/i,
  /(\b(sleep|pg_sleep|benchmark)\s*\()/i,
  /(\-\-|\#|\/\*)/,

  // Path Traversal
  /(\.\.\/|\.\.\\)/,
  /(\/etc\/passwd|\/proc\/self)/i,

  // XSS
  /<script\b[^>]*>/i,
  /javascript:[^"]*/i,
  /onerror\s*=/i,
  /onload\s*=/i,

  // Scanners comunes
  /(\.env|\.git\/|\/wp-admin|\/phpmyadmin|\/actuator)/i
]

export class ImmuneSystem {
  /**
   * 1. Rate Limiting Avanzado con algoritmo Token Bucket
   */
  static checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()

    // Definir cuota según criticidad de la ruta
    let maxTokens = 120
    let refillRatePerMs = 120 / 60000 // 120 por minuto

    if (pathname.startsWith('/auth') || pathname.startsWith('/api/invite') || pathname.startsWith('/invite')) {
      maxTokens = 20
      refillRatePerMs = 20 / 60000 // 20 por minuto en autenticación/invitaciones
    } else if (pathname.startsWith('/api/ai')) {
      maxTokens = 35
      refillRatePerMs = 35 / 60000 // 35 por minuto en IA
    }

    const key = `${ip}:${pathname.split('/')[1] || 'root'}`
    let bucket = ipRateLimitStore.get(key)

    if (!bucket) {
      bucket = { tokens: maxTokens - 1, lastRefill: now }
      ipRateLimitStore.set(key, bucket)
      return { allowed: true }
    }

    // Rellenar tokens según tiempo transcurrido
    const elapsed = now - bucket.lastRefill
    const newTokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRatePerMs)

    if (newTokens < 1) {
      const waitSeconds = Math.ceil((1 - newTokens) / (refillRatePerMs * 1000))
      return { allowed: false, retryAfter: Math.max(waitSeconds, 2) }
    }

    bucket.tokens = newTokens - 1
    bucket.lastRefill = now
    ipRateLimitStore.set(key, bucket)
    return { allowed: true }
  }

  /**
   * 2. Escudo Heurístico Web (WAF) contra inyecciones y scanners
   */
  static detectMaliciousPayload(request: NextRequest): { isMalicious: boolean; threatType?: string; sample?: string } {
    const url = request.nextUrl.toString()
    const search = request.nextUrl.search
    const pathname = request.nextUrl.pathname

    const toInspect = `${pathname} ${search}`

    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(toInspect)) {
        let threatType = 'web_attack'
        if (pattern.source.includes('union') || pattern.source.includes('drop') || pattern.source.includes('sleep')) {
          threatType = 'sql_injection'
        } else if (pattern.source.includes('\\.\\.')) {
          threatType = 'path_traversal'
        } else if (pattern.source.includes('script') || pattern.source.includes('onerror')) {
          threatType = 'xss'
        } else if (pattern.source.includes('env') || pattern.source.includes('wp-admin')) {
          threatType = 'vulnerability_scanner'
        }

        return {
          isMalicious: true,
          threatType,
          sample: toInspect.slice(0, 150)
        }
      }
    }

    return { isMalicious: false }
  }

  /**
   * 3. Registro Asíncrono de Amenazas en Supabase
   */
  static async logThreat(
    threatType: string,
    ip: string,
    endpoint: string,
    payloadSample: string,
    userAgent?: string
  ) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysxcjrxuakfqzzseiaiy.supabase.co'
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Wdm8x6QfGCWQNKqwLRejXA__r5Cg13m'

      const supabase = createServerClient(url, key, { cookies: { getAll: () => [], setAll: () => {} } })

      await supabase.from('security_threat_logs').insert({
        threat_type: threatType,
        severity: threatType === 'sql_injection' ? 'CRITICAL' : 'HIGH',
        ip_address: ip,
        endpoint,
        payload_sample: payloadSample,
        user_agent: userAgent?.slice(0, 200) || null,
        blocked: true,
        metadata: { timestamp: new Date().toISOString() }
      })
    } catch {
      // Falla silenciosa para no degradar el flujo principal
    }
  }

  /**
   * 4. Inspección Perimetral Principal
   */
  static inspect(request: NextRequest): NextResponse | null {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    const pathname = request.nextUrl.pathname
    const userAgent = request.headers.get('user-agent') || ''

    // A. Detección WAF
    const threat = this.detectMaliciousPayload(request)
    if (threat.isMalicious) {
      console.warn(`[ImmuneSystem SHIELD] Ataque bloqueado (${threat.threatType}) desde ${ip} en ${pathname}`)

      // Registrar en background
      this.logThreat(threat.threatType!, ip, pathname, threat.sample || '', userAgent).catch(() => {})

      return new NextResponse(
        JSON.stringify({
          error: 'Acceso Bloqueado por el Sistema Inmunológico de Audenti',
          reason: 'Detección de payload no autorizado o anomalía de seguridad.',
          incident_id: `SEC_${Date.now()}`
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'X-Audenti-Shield': 'BLOCKED' }
        }
      )
    }

    // B. Rate Limiting
    const rateLimit = this.checkRateLimit(ip, pathname)
    if (!rateLimit.allowed) {
      console.warn(`[ImmuneSystem RATE-LIMIT] Exceso de tasa desde ${ip} en ${pathname}`)

      this.logThreat('rate_limit', ip, pathname, `Ruta: ${pathname}`, userAgent).catch(() => {})

      return new NextResponse(
        JSON.stringify({
          error: 'Límite de peticiones alcanzado.',
          message: 'Por seguridad del sistema, por favor espera antes de volver a intentar.',
          retry_after_seconds: rateLimit.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter || 60),
            'X-Audenti-Shield': 'RATE_LIMITED'
          }
        }
      )
    }

    // Petición limpia
    return null
  }
}
