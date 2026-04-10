/**
 * Letchat SDK Entry Point
 *
 * Registers a global `LetchatWidget` object and auto-mounts when the script tag
 * is detected with a `data-assistant-id` attribute.
 *
 * One-line embed:
 *   <script src="https://cdn.letchat.in/widget.js" data-assistant-id="YOUR_ID" async></script>
 */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import FloatingChatWidget from './features/chat/FloatingChatWidget'
import { loadConfig } from './api/widgetConfig'
import { ChatWidgetConfig } from './features/chat/types'
import './index.css'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LetchatOptions {
  /** The assistant slug / ID (required) */
  assistantId: string
  /** CSS selector or DOM element to mount into. Defaults to an injected container. */
  container?: string | HTMLElement
  /** Optional z-index for the widget container (default: 9999) */
  zIndex?: number
  /** 'full' = fixed floating button (default) */
  mode?: 'full'
}

// ── SDK Root component ─────────────────────────────────────────────────────
// Loads config then renders the floating widget. No URL involvement.

function SdkRoot({ assistantId }: { assistantId: string }) {
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null)

  useEffect(() => {
    loadConfig(assistantId)
      .then(setConfig)
      .catch(() => {/* silent — SDK should not throw on customer pages */})
  }, [assistantId])

  if (!config) return null

  return <FloatingChatWidget config={config} assistantId={assistantId} />
}

// ── Mount helper ───────────────────────────────────────────────────────────

function mountWidget(opts: LetchatOptions): HTMLElement {
  // Resolve or create container
  let host: HTMLElement
  if (opts.container) {
    host =
      typeof opts.container === 'string'
        ? (document.querySelector(opts.container) as HTMLElement)
        : opts.container
    if (!host) throw new Error(`[Letchat] Container "${opts.container}" not found`)
  } else {
    host = document.createElement('div')
    host.id = 'letchat-widget-root'
    Object.assign(host.style, {
      position: 'fixed',
      bottom: '0',
      right: '0',
      width: '0',
      height: '0',
      zIndex: String(opts.zIndex ?? 9999),
      overflow: 'visible',
      background: 'transparent',
      border: 'none',
    })
    document.body.appendChild(host)
  }

  // Render FloatingChatWidget directly — no URL manipulation
  createRoot(host).render(
    <StrictMode>
      <SdkRoot assistantId={opts.assistantId} />
    </StrictMode>,
  )

  return host
}

// ── Public API ──────────────────────────────────────────────────────────────

const LetchatWidget = {
  init(opts: LetchatOptions) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => mountWidget(opts))
    } else {
      mountWidget(opts)
    }
  },
}

// Expose on window for plain-HTML usage
declare global {
  interface Window {
    LetchatWidget: typeof LetchatWidget
  }
}
window.LetchatWidget = LetchatWidget

// ── Auto-init from <script> tag attributes ─────────────────────────────────
// Picks up: <script src="widget.js" data-assistant-id="my-bot" async></script>

function autoInit() {
  const scriptTag =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-assistant-id]')

  if (!scriptTag) return

  const assistantId = scriptTag.dataset.assistantId
  if (!assistantId) return

  const zIndex = scriptTag.dataset.zIndex ? Number(scriptTag.dataset.zIndex) : 9999

  LetchatWidget.init({ assistantId, zIndex })
}

autoInit()

export default LetchatWidget
