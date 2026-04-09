/**
 * Letchat SDK Entry Point
 *
 * Registers a global `LetchatWidget` object and auto-mounts when the script tag
 * is detected with a `data-assistant-id` attribute.
 *
 * One-line embed:
 *   <script src="https://cdn.letchat.in/widget.js" data-assistant-id="YOUR_ID" async></script>
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LetchatOptions {
  /** The assistant slug / ID (required) */
  assistantId: string
  /** CSS selector or DOM element to mount into. Defaults to an injected container. */
  container?: string | HTMLElement
  /** Optional z-index for the widget container (default: 9999) */
  zIndex?: number
  /** Optional width (default: 430px) */
  width?: string
  /** Optional height (default: 100vh or 700px for fixed mode) */
  height?: string
  /** 'full' = fixed viewport overlay, 'embed' = sized as the container (default: 'full') */
  mode?: 'full' | 'embed'
}

// ── Mount helper ───────────────────────────────────────────────────────────

function createContainer(opts: LetchatOptions): HTMLElement {
  const el = document.createElement('div')
  el.id = 'letchat-widget-root'

  const isEmbed = opts.mode === 'embed'

  Object.assign(el.style, {
    position: isEmbed ? 'relative' : 'fixed',
    bottom: isEmbed ? 'auto' : '0',
    right: isEmbed ? 'auto' : '0',
    top: isEmbed ? 'auto' : '0',
    left: isEmbed ? 'auto' : '0',
    width: opts.width ?? (isEmbed ? '100%' : '430px'),
    height: opts.height ?? (isEmbed ? '100%' : '100vh'),
    zIndex: String(opts.zIndex ?? 9999),
    overflow: 'hidden',
    fontFamily: 'inherit',
    border: 'none',
    background: 'transparent',
    maxWidth: isEmbed ? 'none' : '430px',
  })

  return el
}

function mountWidget(opts: LetchatOptions): HTMLElement {
  // Resolve container
  let host: HTMLElement
  if (opts.container) {
    host =
      typeof opts.container === 'string'
        ? (document.querySelector(opts.container) as HTMLElement)
        : opts.container
    if (!host) throw new Error(`[Letchat] Container "${opts.container}" not found`)
  } else {
    host = createContainer(opts)
    document.body.appendChild(host)
  }

  // Inject the assistantId into the URL search params so App.tsx can read it
  const url = new URL(window.location.href)
  if (!url.searchParams.get('slugName') && !isSubdomainSlug()) {
    url.searchParams.set('slugName', opts.assistantId)
    window.history.replaceState(null, '', url.toString())
  }

  createRoot(host).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  return host
}

function isSubdomainSlug(): boolean {
  const parts = window.location.hostname.split('.')
  if (parts.length >= 2) {
    const slug = parts[0].toLowerCase()
    return !['www', 'api', 'admin', 'localhost', '127'].includes(slug)
  }
  return false
}

// ── Public API ──────────────────────────────────────────────────────────────

const LetchatWidget = {
  /**
   * Programmatic mount.
   * @example
   * LetchatWidget.init({ assistantId: 'my-bot' })
   */
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

  const mode = (scriptTag.dataset.mode as LetchatOptions['mode']) ?? 'full'
  const zIndex = scriptTag.dataset.zIndex ? Number(scriptTag.dataset.zIndex) : 9999
  const width = scriptTag.dataset.width
  const height = scriptTag.dataset.height
  const containerSel = scriptTag.dataset.container

  LetchatWidget.init({ assistantId, mode, zIndex, width, height, container: containerSel })
}

autoInit()

export default LetchatWidget
