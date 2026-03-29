// ---------------------------------------------------------------------------
// types.ts — ChatWidgetConfig shared between the API layer and the widget UI.
// ---------------------------------------------------------------------------

export interface ThemeConfig {
  primary_color: string
  accent_color: string
  background_color: string
  text_color: string
  mode: 'dark' | 'light'
  bot_bubble_color: string
}

export interface NavItem {
  id: string
  label: string
  icon: string          // emoji or short text
  action: 'chat' | 'url'
  url?: string          // only when action === 'url'
}

export interface ChatWidgetConfig {
  id?: string
  name: string

  // Branding
  logo_url: string
  title: string
  subtitle: string

  // UX
  pinned_questions: string[]

  // Appearance
  theme: ThemeConfig
  background_image_url: string

  // RAG
  rag_top_k: number

  // Advanced UI
  bg_image_opacity: number
  pinned_style: 'chip' | 'pill' | 'button'
  input_placeholder: string
  input_radius: number
  header_style: 'gradient' | 'solid' | 'glass'
  bubble_style: 'modern' | 'rounded' | 'flat'
  font_size: 'sm' | 'md' | 'lg'
  show_avatar: boolean
  show_timestamps: boolean
  send_button_style: 'icon' | 'text' | 'gradient'
  input_bg_blur: boolean
  welcome_message: string
  initial_message: string
  message_density: 'compact' | 'normal' | 'spacious'
  show_attachment: boolean
  show_emoji: boolean
  show_mic: boolean
  show_language: boolean
  show_sources: boolean
  show_human_handoff: boolean
  show_doc_summaries?: boolean
  default_language: string

  // RAG
  rag_group_id: string

  // Splash Screen
  splash_enabled: boolean
  splash_title: string
  splash_subtitle: string
  splash_button_label: string

  // Navigation
  nav_enabled: boolean
  nav_items: NavItem[]
  nav_position: 'top' | 'bottom'

  // Lifecycle
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export const DEFAULT_CONFIG: ChatWidgetConfig = {
  name: 'My Chat Widget',
  logo_url: '',
  title: 'LetChat Assistant',
  subtitle: 'Your intelligent conversation partner',
  pinned_questions: [
    'What services does LetChat offer?',
    'How do I create an account?',
    'What is your pricing?',
  ],
  theme: {
    primary_color: '#8E74E4',
    accent_color: '#4DAFFF',
    background_color: '',
    text_color: '#E8EAED',
    mode: 'dark',
    bot_bubble_color: '#1E1E2E',
  },
  background_image_url: '',
  rag_top_k: 3,
  bg_image_opacity: 0.7,
  pinned_style: 'chip',
  input_placeholder: 'Type your message…',
  input_radius: 16,
  header_style: 'gradient',
  bubble_style: 'modern',
  font_size: 'md',
  show_avatar: true,
  show_timestamps: false,
  send_button_style: 'gradient',
  input_bg_blur: true,
  welcome_message: "Hi! I'm here to help. Ask me anything or pick a question below.",
  initial_message: "Hello! Ask me anything.",
  show_human_handoff: false,
  message_density: 'normal',
  show_attachment: true,
  show_emoji: true,
  show_mic: true,
  show_language: true,
  show_sources: true,
  default_language: 'english',
  rag_group_id: '',
  splash_enabled: false,
  splash_title: 'Welcome!',
  splash_subtitle: 'How can I help you today?',
  splash_button_label: 'Start Chat',
  nav_enabled: false,
  nav_items: [],
  nav_position: 'top',
  is_active: true,
  show_doc_summaries: false,
}
