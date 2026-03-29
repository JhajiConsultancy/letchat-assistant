import { apiClient } from './client'
import { ChatWidgetConfig, DEFAULT_CONFIG, NavItem } from '../features/chat/types'

// ---------------------------------------------------------------------------
// Shape adapter — backend uses nested { splash: {…}, nav: {…} }
//                 widget uses flat splash_enabled / nav_enabled etc.
// ---------------------------------------------------------------------------
type ApiPayload = Record<string, unknown>

function fromApiConfig(raw: ApiPayload): ChatWidgetConfig {
  const splash = (raw.splash as ApiPayload | undefined) ?? {}
  const nav    = (raw.nav    as ApiPayload | undefined) ?? {}

  const base: ApiPayload = { ...raw }
  delete base.splash
  delete base.nav

  return {
    ...DEFAULT_CONFIG,
    ...(base as Partial<ChatWidgetConfig>),
    splash_enabled:      (splash.enabled      as boolean)         ?? (raw.splash_enabled      as boolean)         ?? false,
    splash_title:        (splash.title        as string)          ?? (raw.splash_title        as string)          ?? 'Welcome!',
    splash_subtitle:     (splash.subtitle     as string)          ?? (raw.splash_subtitle     as string)          ?? 'How can I help you today?',
    splash_button_label: (splash.button_label as string)          ?? (raw.splash_button_label as string)          ?? 'Start Chat',
    nav_enabled:  (nav.enabled  as boolean)              ?? (raw.nav_enabled  as boolean)              ?? false,
    nav_items:    (nav.items    as NavItem[])             ?? (raw.nav_items    as NavItem[])             ?? [],
    nav_position: (nav.position as 'top' | 'bottom')     ?? (raw.nav_position as 'top' | 'bottom')     ?? 'top',
  }
}

// ---------------------------------------------------------------------------
// Load active widget config from the backend.
// Falls back to DEFAULT_CONFIG if none exists yet.
// ---------------------------------------------------------------------------
export async function loadConfig(slugName: string): Promise<ChatWidgetConfig> {
  try {
    const { data } = await apiClient.get<ApiPayload>(`/api/chat-assistants/by-slug/${slugName}/widget-config`)
    return fromApiConfig(data)
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 404) return { ...DEFAULT_CONFIG }
    console.warn('[widgetConfig] Failed to load from backend — using defaults', error)
    return { ...DEFAULT_CONFIG }
  }
}

// ---------------------------------------------------------------------------
// Read a local File as a base64 data-URL (used for image attachments).
// ---------------------------------------------------------------------------
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
