/**
 * securityInterceptor.ts
 *
 * Attaches security headers to every outbound API request:
 *
 *  X-Trace-Id       — cryptographically-random UUID per request (distributed tracing)
 *  X-Session-Id     — UUID stable for the browser tab session (sessionStorage)
 *  X-Client-UA      — User-Agent string
 *  X-Client-TZ      — IANA timezone (e.g. "America/New_York")
 *  X-Client-Lang    — Browser language tag (e.g. "en-US")
 *  X-Client-Screen  — Viewport + colour depth (e.g. "1920x1080@24")
 *  X-Client-Platform— OS/platform hint
 *  X-Client-FP      — SHA-256 fingerprint of the stable signals above
 *
 * The backend can use these to:
 *   • Correlate log lines across services via Trace-Id
 *   • Detect session-hijacking when signals change mid-session
 *   • Build anomaly-detection models (timezone/language/screen drift)
 */

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

// ---------------------------------------------------------------------------
// Session ID — stable for the lifetime of the browser tab
// ---------------------------------------------------------------------------
const SESSION_STORAGE_KEY = 'sc_session_id'

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

// ---------------------------------------------------------------------------
// Browser signals
// ---------------------------------------------------------------------------

interface ClientSignals {
  ua: string
  tz: string
  lang: string
  screen: string
  platform: string
}

function collectSignals(): ClientSignals {
  const nav = navigator

  // Prefer the modern UserAgentData API where available
  const platform =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nav as any).userAgentData?.platform ?? nav.platform ?? 'unknown'

  const screen = `${window.screen.width}x${window.screen.height}@${window.screen.colorDepth}`

  return {
    ua: nav.userAgent,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: nav.language,
    screen,
    platform,
  }
}

// ---------------------------------------------------------------------------
// SHA-256 fingerprint  (SubtleCrypto — available in all modern browsers)
// Result is cached since signals are stable within a session.
// ---------------------------------------------------------------------------

let _cachedFP: string | null = null

async function buildFingerprint(signals: ClientSignals): Promise<string> {
  if (_cachedFP) return _cachedFP

  const raw = [
    signals.ua,
    signals.tz,
    signals.lang,
    signals.screen,
    signals.platform,
  ].join('|')

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(raw)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    _cachedFP = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // SubtleCrypto not available (e.g. insecure context) — fall back to length-bounded raw
    _cachedFP = btoa(raw).slice(0, 64)
  }

  return _cachedFP
}

// ---------------------------------------------------------------------------
// Axios interceptor factory
// ---------------------------------------------------------------------------

export function applySecurityInterceptor(client: AxiosInstance): void {
  const sessionId = getOrCreateSessionId()
  const signals = collectSignals()

  // Pre-warm the fingerprint so the first request doesn't have to await it
  buildFingerprint(signals).catch(() => {})

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
      const traceId = crypto.randomUUID()
      const fingerprint = await buildFingerprint(signals)

      config.headers = config.headers ?? {}
      config.headers['X-Trace-Id']        = traceId
      config.headers['X-Session-Id']      = sessionId
      config.headers['X-Client-UA']       = signals.ua
      config.headers['X-Client-TZ']       = signals.tz
      config.headers['X-Client-Lang']     = signals.lang
      config.headers['X-Client-Screen']   = signals.screen
      config.headers['X-Client-Platform'] = signals.platform
      config.headers['X-Client-FP']       = fingerprint

      return config
    },
  )
}
