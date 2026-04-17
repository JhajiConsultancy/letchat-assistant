import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Tab,
  Tabs,
  ThemeProvider,
  Tooltip,
  Typography,
  alpha,
  createTheme,
} from '@mui/material'
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import EmojiEmotionsRoundedIcon from '@mui/icons-material/EmojiEmotionsRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded'
import { ChatWidgetConfig } from './types'
import { getQueryWsUrl, listDocuments, getDocument, DocumentSummary, DocumentDetail } from '../../api/client'
import { readFileAsDataUrl } from '../../api/widgetConfig'
import { RichQueryResponse } from './richContent'
import EmojiPicker from './EmojiPicker'
import MarkdownRenderer from './MarkdownRenderer'
import CatalogueDrawer from './CatalogueDrawer'

interface Message {
  role: 'user' | 'assistant'
  text: string
  /** Markdown content received in the `response` field from the backend */
  response?: string
  status?: string     // shown while status frames arrive
  streaming?: boolean // true while chunk frames are arriving
  image?: string
  sources?: string[]
  timestamp: Date
}

interface ChatWidgetProps {
  config: ChatWidgetConfig
  assistantId: string
  /** When true, header collapses to icon strip once conversation starts */
  compactHeader?: boolean
}

const LANGUAGES = [
  { label: 'English',              value: 'english' },
  { label: 'Hindi',                value: 'hindi' },
  { label: 'Marathi',              value: 'marathi' },
  { label: 'Bhojpuri',             value: 'bhojpuri' },
  { label: 'Tamil',                value: 'tamil' },
  { label: 'Telugu',               value: 'telugu' },
  { label: 'Spanish',              value: 'spanish' },
  { label: 'French',               value: 'french' },
  { label: 'German',               value: 'german' },
  { label: 'Arabic',               value: 'arabic' },
  { label: 'Portuguese',           value: 'portuguese' },
  { label: 'Chinese (Simplified)', value: 'chinese (simplified)' },
  { label: 'Japanese',             value: 'japanese' },
]

export default function ChatWidgetV2({ config, assistantId, compactHeader = false }: ChatWidgetProps) {
  const widgetTheme = useMemo(() => {
    const isDark = config.theme.mode === 'dark'
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: { main: config.theme.primary_color },
        secondary: { main: config.theme.accent_color },
        background: {
          default: config.theme.background_color || (isDark ? '#0D0D17' : '#F5F5F5'),
          paper: isDark ? '#1A1A2E' : '#FFFFFF',
        },
        text: {
          primary: config.theme.text_color,
          secondary: alpha(config.theme.text_color, 0.65),
        },
      },
      shape: { borderRadius: 12 },
      typography: { fontFamily: '"Google Sans", "Roboto", sans-serif' },
    })
  }, [config.theme])

  const [messages, setMessages] = useState<Message[]>(() =>
    config.initial_message?.trim()
      ? [{ role: 'assistant', text: config.initial_message.trim(), timestamp: new Date() }]
      : []
  )
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null)
  const [selectedLang, setSelectedLang] = useState(config.default_language ?? 'english')
  const [isListening, setIsListening] = useState(false)
  const [humanMode, setHumanMode] = useState(false)
  const [globalError, setGlobalError] = useState<{ message: string; terminated: boolean } | null>(null)
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  // Collapse header to strip once user sends first message (only in floating/compactHeader mode)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  // Document summary state
  const [docSummaries, setDocSummaries] = useState<DocumentSummary[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [summaryPanelSource, setSummaryPanelSource] = useState<string | null>(null)
  const [summaryDetail, setSummaryDetail] = useState<DocumentDetail | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [drawerTab, setDrawerTab] = useState(0)
  const [docSummariesOpen, setDocSummariesOpen] = useState(false)
  const recognitionRef = useRef<any | null>(null)
  // Persistent WebSocket refs
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = useRef<string | null>(
    localStorage.getItem(`ws_session_${assistantId}`)
  )
  const terminatedRef = useRef(false)

  function startListening() {
    const SpeechRecognitionAPI =
      (window as Window & typeof globalThis & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ??
      (window as Window & typeof globalThis & { webkitSpeechRecognition?: any }).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = selectedLang === 'hindi' ? 'hi-IN'
      : selectedLang === 'spanish' ? 'es-ES'
      : selectedLang === 'french' ? 'fr-FR'
      : selectedLang === 'german' ? 'de-DE'
      : selectedLang === 'arabic' ? 'ar-SA'
      : selectedLang === 'portuguese' ? 'pt-BR'
      : selectedLang === 'chinese (simplified)' ? 'zh-CN'
      : selectedLang === 'japanese' ? 'ja-JP'
      : selectedLang === 'tamil' ? 'ta-IN'
      : selectedLang === 'telugu' ? 'te-IN'
      : 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function handleMicClick() {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  useEffect(() => {
    setSelectedLang(config.default_language ?? 'english')
  }, [config.default_language])

  // Fetch document list when feature enabled
  useEffect(() => {
    if (!assistantId || !(config.show_doc_summaries ?? false)) {
      setDocSummaries([])
      setDocsLoading(false)
      return
    }
    setDocsLoading(true)
    listDocuments(assistantId)
      .then(setDocSummaries)
      .catch(() => setDocSummaries([]))
      .finally(() => setDocsLoading(false))
  }, [assistantId, config.show_doc_summaries])

  async function openSummaryPanel(source: string) {
    setSummaryPanelSource(source)
    setSummaryDetail(null)
    setSummaryError(null)
    setSummaryLoading(true)
    setDrawerTab(0)
    try {
      const detail = await getDocument(assistantId, source)
      setSummaryDetail(detail)
    } catch {
      setSummaryError('Failed to load document summary.')
    } finally {
      setSummaryLoading(false)
    }
  }

  async function copySummary(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setSummaryCopied(true)
      setTimeout(() => setSummaryCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const [showSplash, setShowSplash] = useState(config.splash_enabled ?? false)

  useEffect(() => {
    setShowSplash(config.splash_enabled ?? false)
  }, [config.splash_enabled])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Persistent WebSocket lifecycle ────────────────────────────────────────
  useEffect(() => {

    let destroyed = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    function connect() {
      if (destroyed) return;
      if (retryCount >= maxRetries) {
        // Stop trying after max retries
        wsRef.current?.close();
        return;
      }
      const ws = new WebSocket(getQueryWsUrl(assistantId));
      wsRef.current = ws;

      ws.onopen = () => {
        retryCount = 0; // Reset on successful connection
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30_000);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string);

        switch (data.type) {
          case 'connected':
            // Socket is ready — input is always enabled
            break;

          case 'status':
            setMessages((prev) => {
              const list = [...prev];
              const last = list[list.length - 1];
              if (last?.role === 'assistant' && last.streaming) {
                return list.map((m, i) =>
                  i === list.length - 1 ? { ...m, status: data.content as string } : m
                );
              }
              return [...list, { role: 'assistant', text: '', status: data.content as string, streaming: true, timestamp: new Date() }];
            });
            break;

          case 'chunk':
            setMessages((prev) => {
              const list = [...prev];
              const last = list[list.length - 1];
              if (last?.role === 'assistant' && last.streaming) {
                return list.map((m, i) =>
                  i === list.length - 1
                    ? { ...m, text: m.text + (data.content as string), status: undefined }
                    : m
                );
              }
              return [...list, { role: 'assistant', text: data.content as string, streaming: true, timestamp: new Date() }];
            });
            break;

          case 'final': {
            const result = data as RichQueryResponse;
            const rawResponse = result.response as unknown
            const responseText: string =
              typeof rawResponse === 'string'
                ? rawResponse
                : (rawResponse as { markdown?: string } | null)?.markdown ?? String(rawResponse ?? '')
            if (result.session_id) {
              sessionIdRef.current = result.session_id;
              localStorage.setItem(`ws_session_${assistantId}`, result.session_id);
            }
            setMessages((prev) => {
              const list = [...prev];
              const last = list[list.length - 1];
              if (last?.role === 'assistant' && last.streaming) {
                const updated = list.map((m, i): Message =>
                  i === list.length - 1
                    ? { ...m, streaming: false, status: undefined, sources: result.sources, response: responseText || m.response, text: responseText || m.text }
                    : m
                );
               return updated;
              }
              const appendedMessage: Message = {
                role: 'assistant',
                text: responseText || '',
                response: responseText || '',
                streaming: false,
                sources: result.sources,
                timestamp: new Date(),
              };
              const appended = [...list, appendedMessage];
              return appended;
            });
            setLoading(false);
            break;
          }

          case 'error': {
            const isTerminatedError = !!data.connection_terminated
            setGlobalError({ message: (data.detail as string) ?? 'An unexpected error occurred.', terminated: isTerminatedError })
            setMessages((prev) => prev.filter((m) => !(m.role === 'assistant' && m.streaming)))
            setLoading(false)
            if (isTerminatedError) {
              terminatedRef.current = true
              ws.close()
            }
            break
          }

          // 'pong' — no action needed
        }
      };

      ws.onclose = () => {
        if (pingRef.current) clearInterval(pingRef.current);
        if (!destroyed && !terminatedRef.current) {
          retryCount++;
          if (retryCount < maxRetries) {
            reconnectTimeout = setTimeout(connect, 3_000);
          } else {
            setGlobalError({ message: 'Connection failed after multiple attempts. Please refresh the page to try again.', terminated: false });
          }
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      destroyed = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (pingRef.current) clearInterval(pingRef.current)
      wsRef.current?.close()
    }
  }, [assistantId])

  function sendMessage(text: string) {
    if ((!text.trim() && !attachedImage) || loading || isTerminated) return
    // Collapse header to compact strip on first user message
    if (!headerCollapsed) setHeaderCollapsed(true)
    const userMsg: Message = { role: 'user', text: text.trim(), image: attachedImage ?? undefined, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAttachedImage(null)

    // In human mode, don't send to AI — the live agent handles the conversation
    if (humanMode) return

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [...prev, { role: 'assistant', text: '⚠ Connection unavailable. Reconnecting…', timestamp: new Date() }])
      return
    }

    const langSuffix = selectedLang !== 'english' ? `. Generate the response in ${selectedLang}.` : ''
    setLoading(true)
    ws.send(JSON.stringify({
      query: text.trim() + langSuffix,
      top_k: config.rag_top_k ?? 3,
      session_id: sessionIdRef.current ?? null,
    }))
  }

  async function handleImageAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    setAttachedImage(dataUrl)
    e.target.value = ''
  }

  const gradient = `linear-gradient(135deg, ${config.theme.primary_color} 0%, ${config.theme.accent_color} 100%)`

  const headerStyle = config.header_style ?? 'gradient'
  const headerBg =
    headerStyle === 'solid' ? config.theme.primary_color :
    headerStyle === 'glass' ? alpha(config.theme.primary_color, 0.18) :
    gradient

  const bubbleStyle = config.bubble_style ?? 'modern'
  const userBubbleR = bubbleStyle === 'rounded' ? '16px' : bubbleStyle === 'flat' ? '6px' : '16px 16px 4px 16px'
  const botBubbleR  = bubbleStyle === 'rounded' ? '16px' : bubbleStyle === 'flat' ? '6px' : '16px 16px 16px 4px'

  const fontSizeMap = { sm: '0.74rem', md: '0.82rem', lg: '0.92rem' }
  const msgFontSize = fontSizeMap[config.font_size ?? 'md']

  const densityMap = { compact: 0.75, normal: 1.5, spacious: 2.5 }
  const msgGap = densityMap[config.message_density ?? 'normal']

  const showAvatar     = config.show_avatar ?? true
  const showTimestamps = config.show_timestamps ?? false
  const inputBlur      = config.input_bg_blur ?? true
  const showAttachment = config.show_attachment ?? true
  const showEmoji      = config.show_emoji ?? true
  const showMic         = config.show_mic ?? true
  const showLanguage    = config.show_language ?? true
  const showSources     = config.show_sources ?? true
  const showHumanHandoff = config.show_human_handoff ?? false
  const showDocSummaries = config.show_doc_summaries ?? false

  const assistantStreaming = messages.some((m) => m.role === 'assistant' && m.streaming)
  const isTerminated = globalError?.terminated ?? false

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <ThemeProvider theme={widgetTheme}>
      {/* Full-viewport chat layout */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          backgroundImage: config.background_image_url ? `url(${config.background_image_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Backdrop blur overlay for bg image */}
        {config.background_image_url && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(2px)',
              bgcolor: alpha(config.theme.background_color || '#0D0D17', config.bg_image_opacity ?? 0.7),
              zIndex: 0,
            }}
          />
        )}

        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* ── Header (full or collapsed strip) ── */}
          <Box
            sx={{
              background: headerBg,
              backdropFilter: headerStyle === 'glass' ? 'blur(14px)' : 'none',
              borderBottom: headerStyle === 'glass' ? '1px solid rgba(255,255,255,0.1)' : 'none',
              flexShrink: 0,
              overflow: 'hidden',
              transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              maxHeight: headerCollapsed ? 52 : 130,
            }}
          >
            {/* ── Compact strip (shown when collapsed) ── */}
            <Box
              sx={{
                height: 52,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                opacity: headerCollapsed ? 1 : 0,
                transform: headerCollapsed ? 'translateY(0)' : 'translateY(-10px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                pointerEvents: headerCollapsed ? 'all' : 'none',
                position: headerCollapsed ? 'relative' : 'absolute',
                borderBottom: headerCollapsed ? `1px solid rgba(255,255,255,0.1)` : 'none',
              }}
            >
              {/* Mini avatar */}
              {config.logo_url ? (
                <Box
                  component="img"
                  src={config.logo_url}
                  alt="logo"
                  sx={{
                    width: 32, height: 32, objectFit: 'contain', borderRadius: '50%',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    bgcolor: alpha('#fff', 0.12), flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${alpha('#fff', 0.28)}, ${alpha('#fff', 0.1)})`,
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  }}
                >
                  {(config.title || 'AI').slice(0, 2).toUpperCase()}
                </Box>
              )}

              {/* Title + status row */}
              <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 0.2 }}>
                <Typography
                  sx={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {config.title || 'AI Assistant'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80', flexShrink: 0,
                      animation: 'hpulse 2.5s ease-in-out infinite',
                      '@keyframes hpulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
                    }}
                  />
                  <Typography sx={{ color: alpha('#fff', 0.72), fontSize: '0.65rem', lineHeight: 1, fontWeight: 500 }}>
                    Online
                  </Typography>
                </Box>
              </Box>

              {/* Strip action icons */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto', flexShrink: 0 }}>
                {(config.show_catalogue ?? false) && (
                  <Tooltip title={config.catalogue_button_label || 'Catalogues'}>
                    <IconButton
                      size="small"
                      onClick={() => setCatalogueOpen(true)}
                      sx={{ color: '#fff', bgcolor: alpha('#fff', 0.12), p: 0.6, '&:hover': { bgcolor: alpha('#fff', 0.24) } }}
                    >
                      <MenuBookRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}
                {showHumanHandoff && (
                  <Tooltip title={humanMode ? 'Return to AI' : 'Talk to a human'}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (!humanMode) {
                          setHumanMode(true)
                          setMessages((prev) => [...prev, { role: 'assistant', text: "✋ You've been connected to a human agent. Please hold on while we connect you — a team member will respond shortly.", timestamp: new Date() }])
                        } else {
                          setHumanMode(false)
                        }
                      }}
                      sx={{ color: '#fff', bgcolor: humanMode ? alpha('#fff', 0.24) : alpha('#fff', 0.12), p: 0.6, '&:hover': { bgcolor: alpha('#fff', 0.24) } }}
                    >
                      {humanMode
                        ? <AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} />
                        : <SupportAgentRoundedIcon sx={{ fontSize: 15 }} />}
                    </IconButton>
                  </Tooltip>
                )}
                {/* Expand header back */}
                <Tooltip title="Expand header">
                  <IconButton
                    size="small"
                    onClick={() => setHeaderCollapsed(false)}
                    sx={{
                      color: alpha('#fff', 0.65), bgcolor: alpha('#fff', 0.08), p: 0.55,
                      borderRadius: '8px',
                      '&:hover': { bgcolor: alpha('#fff', 0.18), color: '#fff' },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ChevronRightRoundedIcon sx={{ fontSize: 15, transform: 'rotate(90deg)' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* ── Full header (shown when not collapsed) ── */}
            <Box
              sx={{
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
                opacity: headerCollapsed ? 0 : 1,
                transform: headerCollapsed ? 'translateY(-10px)' : 'translateY(0)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                pointerEvents: headerCollapsed ? 'none' : 'all',
              }}
            >
              {config.logo_url ? (
                <Box
                  component="img"
                  src={config.logo_url}
                  alt="logo"
                  sx={{
                    width: 46, height: 46, objectFit: 'contain', borderRadius: '14px',
                    bgcolor: alpha('#fff', 0.15), p: 0.5,
                    border: '1.5px solid rgba(255,255,255,0.22)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 46, height: 46, borderRadius: '14px',
                    background: `linear-gradient(135deg, ${alpha('#fff', 0.28)}, ${alpha('#fff', 0.1)})`,
                    border: '1.5px solid rgba(255,255,255,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#fff', fontSize: 17, flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  }}
                >
                  {(config.title || 'AI').slice(0, 2).toUpperCase()}
                </Box>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.08rem', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                  {config.title || 'AI Assistant'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <Box
                    sx={{
                      width: 7, height: 7, borderRadius: '50%', bgcolor: '#4ade80',
                      animation: 'fullpulse 2.5s ease-in-out infinite',
                      '@keyframes fullpulse': { '0%, 100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.55, transform: 'scale(0.85)' } },
                    }}
                  />
                  <Typography sx={{ color: alpha('#fff', 0.75), fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.01em' }}>
                    {config.subtitle || 'Online · AI Powered'}
                  </Typography>
                </Box>
              </Box>

              {/* Header action buttons — pushed to the right */}
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {/* Catalogue button */}
                {(config.show_catalogue ?? false) && (
                  <Tooltip title={config.catalogue_button_label || 'Catalogues'}>
                    <Box
                      onClick={() => setCatalogueOpen(true)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.6,
                        px: 1.25,
                        py: 0.55,
                        borderRadius: 2,
                        bgcolor: alpha('#fff', 0.15),
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'background 0.18s ease',
                        '&:hover': { bgcolor: alpha('#fff', 0.28) },
                      }}
                    >
                      <MenuBookRoundedIcon sx={{ fontSize: 17 }} />
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1 }}>
                        {config.catalogue_button_label || 'Catalogues'}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}

                {/* Human handoff */}
                {showHumanHandoff && (
                  <Tooltip title={humanMode ? 'Return to AI' : 'Talk to a human agent'}>
                    <IconButton
                      onClick={() => {
                        if (!humanMode) {
                          setHumanMode(true)
                          setMessages((prev) => [
                            ...prev,
                            {
                              role: 'assistant',
                              text: "✋ You've been connected to a human agent. Please hold on while we connect you — a team member will respond shortly.",
                              timestamp: new Date(),
                            },
                          ])
                        } else {
                          setHumanMode(false)
                        }
                      }}
                      sx={{
                        bgcolor: humanMode ? alpha('#fff', 0.3) : alpha('#fff', 0.15),
                        color: '#fff',
                        '&:hover': { bgcolor: alpha('#fff', 0.35) },
                      }}
                    >
                      {humanMode
                        ? <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
                        : <SupportAgentRoundedIcon sx={{ fontSize: 20 }} />}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Box>

          {/* ── Navigation bar (top) ── */}
          {config.nav_enabled && (config.nav_position ?? 'top') === 'top' && (
            <Box
              sx={{
                display: 'flex',
                flexShrink: 0,
                bgcolor: config.theme.mode === 'dark' ? alpha('#fff', 0.03) : '#fff',
                borderBottom: `1px solid ${alpha(config.theme.primary_color, 0.14)}`,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {(config.nav_items ?? []).map((item) => (
                <Box
                  key={item.id}
                  component={item.action === 'url' && item.url ? 'a' : 'div'}
                  href={item.action === 'url' && item.url ? item.url : undefined}
                  target={item.action === 'url' && item.url ? '_blank' : undefined}
                  rel={item.action === 'url' && item.url ? 'noopener noreferrer' : undefined}
                  onClick={item.action === 'chat' ? () => { setMessages([]); setInput('') } : undefined}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', px: 2, py: 1.25,
                    cursor: 'pointer', flex: 1, minWidth: 64,
                    textDecoration: 'none',
                    gap: 0.4,
                    transition: 'background 0.15s ease',
                    '&:hover': {
                      bgcolor: alpha(config.theme.primary_color, 0.08),
                    },
                    '&:hover .nav-icon-box': {
                      bgcolor: alpha(config.theme.primary_color, 0.14),
                      transform: 'scale(1.08)',
                    },
                  }}
                >
                  <Box
                    className="nav-icon-box"
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '12px',
                      bgcolor: alpha(config.theme.primary_color, 0.08),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.18s ease',
                      border: `1px solid ${alpha(config.theme.primary_color, 0.14)}`,
                    }}
                  >
                    <Typography sx={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.62rem', color: config.theme.text_color, fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.75 }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* ── Human agent banner ── */}
          {humanMode && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.75,
                bgcolor: alpha('#2e7d32', 0.1),
                borderBottom: `1px solid ${alpha('#2e7d32', 0.25)}`,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#2e7d32',
                  flexShrink: 0,
                  animation: 'hpulse 1.5s ease-in-out infinite',
                  '@keyframes hpulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.35 },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, flex: 1, fontSize: '0.72rem' }}>
                Live agent session active
              </Typography>
              <Chip
                label="Return to AI"
                size="small"
                onClick={() => setHumanMode(false)}
                sx={{
                  fontSize: '0.65rem',
                  height: 20,
                  cursor: 'pointer',
                  bgcolor: alpha('#2e7d32', 0.15),
                  color: '#2e7d32',
                  '& .MuiChip-label': { px: 0.75 },
                  '&:hover': { bgcolor: alpha('#2e7d32', 0.25) },
                }}
              />
            </Box>
          )}

          {/* ── Global Error Banner ── */}
          {globalError && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                px: 2,
                py: 1,
                flexShrink: 0,
                bgcolor: globalError.terminated ? alpha('#c62828', 0.08) : alpha('#e65100', 0.08),
                borderBottom: `1px solid ${globalError.terminated ? alpha('#c62828', 0.28) : alpha('#e65100', 0.28)}`,
              }}
            >
              <ErrorOutlineRoundedIcon
                sx={{
                  fontSize: 17,
                  mt: '1px',
                  color: globalError.terminated ? '#c62828' : '#e65100',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    lineHeight: 1.4,
                    color: globalError.terminated ? '#c62828' : '#e65100',
                  }}
                >
                  {globalError.terminated ? 'Assistant Unavailable' : 'Connection Error'}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.70rem',
                    lineHeight: 1.4,
                    color: globalError.terminated
                      ? alpha('#c62828', 0.85)
                      : alpha('#e65100', 0.85),
                    mt: 0.15,
                  }}
                >
                  {globalError.message}
                  {globalError.terminated && ' All interactions have been disabled.'}
                </Typography>
              </Box>
              {!globalError.terminated && (
                <IconButton
                  size="small"
                  onClick={() => setGlobalError(null)}
                  sx={{ p: 0.3, flexShrink: 0, color: '#e65100', mt: '-2px' }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          )}

          {/* ── Document summary drawer (vertical collapsible) ── */}
          {showDocSummaries && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexShrink: 0, borderBottom: `1px solid ${alpha(config.theme.primary_color, 0.14)}`, bgcolor: alpha(config.theme.primary_color, 0.04) }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 0.6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <ArticleOutlinedIcon sx={{ fontSize: 13, color: alpha(config.theme.primary_color, 0.6) }} />
                  <Typography sx={{ color: config.theme.text_color, fontWeight: 600, fontSize: '0.75rem' }}>Documents Summary</Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => setDocSummariesOpen((open) => !open)}
                  sx={{ textTransform: 'none', fontSize: '0.72rem' }}
                >
                  {docSummariesOpen ? 'Collapse' : 'Expand'}
                </Button>
              </Box>

              {docSummariesOpen && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 1.5, py: 0.75, maxHeight: 180, overflowY: 'auto' }}>
                  {docsLoading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {[80, 60, 72].map((w) => (
                        <Box key={w} sx={{ width: w, height: 22, borderRadius: 3, bgcolor: alpha(config.theme.primary_color, 0.12), animation: 'pulse 1.4s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 0.5 }, '50%': { opacity: 1 } } }} />
                      ))}
                    </Box>
                  )}

                  {!docsLoading && !assistantId && (
                    <Typography sx={{ fontSize: '0.65rem', color: alpha(config.theme.text_color, 0.4), fontStyle: 'italic' }}>
                      Open via assistant to view documents
                    </Typography>
                  )}

                  {!docsLoading && assistantId && docSummaries.length === 0 && (
                    <Typography sx={{ fontSize: '0.65rem', color: alpha(config.theme.text_color, 0.4), fontStyle: 'italic' }}>
                      No documents indexed
                    </Typography>
                  )}

                  {!docsLoading && docSummaries.length > 0 && (
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      gap: 0.5,
                    }}>
                      {docSummaries.map((doc) => (
                        <Chip
                          key={doc.source}
                          label={doc.summary_name || doc.source}
                          onClick={() => void openSummaryPanel(doc.source)}
                          sx={{
                            width: 'auto',
                            minWidth: 80,
                            maxWidth: 'calc(50% - 4px)',
                            justifyContent: 'space-between',
                            fontSize: '0.72rem',
                            bgcolor: alpha(config.theme.primary_color, 0.08),
                            border: `1px solid ${alpha(config.theme.primary_color, 0.28)}`,
                            color: config.theme.text_color,
                            '&:hover': { bgcolor: alpha(config.theme.primary_color, 0.16) },
                            '& .MuiChip-icon': { color: alpha(config.theme.primary_color, 0.7) },
                          }}
                          icon={<ChevronRightRoundedIcon sx={{ fontSize: '14px !important' }} />}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* ── Messages area ── */}
          <Box sx={{ position: 'relative', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {/* Powered by Letchat — absolute overlay, zero space */}
            <Box sx={{
              position: 'absolute',
              bottom: 10,
              right: 14,
              zIndex: 5,
              pointerEvents: 'none',
              userSelect: 'none',
            }}>
              <Typography sx={{ fontSize: '0.6rem', color: alpha(config.theme.text_color, 0.25), letterSpacing: '0.04em', lineHeight: 1 }}>
                Powered by{' '}
                <Box component="span" sx={{ color: alpha(config.theme.primary_color, 0.38), fontWeight: 700 }}>Letchat</Box>
              </Typography>
            </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              px: { xs: 2, sm: 3, md: 4 },
              py: 2.5,
              display: 'flex',
              flexDirection: 'column',
              gap: msgGap,
              scrollbarWidth: 'thin',
              scrollbarColor: `${alpha(config.theme.primary_color, 0.35)} transparent`,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { borderRadius: 4, background: alpha(config.theme.primary_color, 0.35) },
              maxWidth: 860,
              width: '100%',
              mx: 'auto',
              left: '50%',
              transform: 'translateX(-50%)',
              boxSizing: 'border-box',
            }}
          >
            {messages.length === 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  mt: 4,
                  gap: 2,
                  px: 2,
                  textAlign: 'center',
                }}
              >
                {/* Glowing avatar */}
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 0 8px ${alpha(config.theme.primary_color, 0.12)}, 0 0 0 16px ${alpha(config.theme.primary_color, 0.06)}`,
                    mb: 0.5,
                  }}
                >
                  <AutoAwesomeRoundedIcon sx={{ fontSize: 30, color: '#fff' }} />
                </Box>

                <Box sx={{ maxWidth: 340 }}>
                  <Typography
                    sx={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: config.theme.mode === 'dark' ? alpha('#fff', 0.92) : alpha(config.theme.text_color, 0.88),
                      lineHeight: 1.3,
                      mb: 0.75,
                    }}
                  >
                    {config.title || 'AI Assistant'}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: msgFontSize,
                      color: config.theme.mode === 'dark' ? alpha('#fff', 0.5) : alpha(config.theme.text_color, 0.52),
                      lineHeight: 1.6,
                    }}
                  >
                    {config.welcome_message || "Hi! I'm here to help. Ask me anything."}
                  </Typography>
                </Box>
              </Box>
            )}

            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 1,
                  alignItems: 'flex-end',
                }}
              >
                {msg.role === 'assistant' && showAvatar && (
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: '#fff' }} />
                  </Box>
                )}
                {msg.role === 'assistant' && !showAvatar && <Box sx={{ width: 30, flexShrink: 0 }} />}

                <Box
                  sx={{
                    maxWidth: '70%',
                    px: 1.75,
                    py: 1.1,
                    borderRadius: msg.role === 'user' ? userBubbleR : botBubbleR,
                    background:
                      msg.role === 'user'
                        ? gradient
                        : config.theme.bot_bubble_color
                        ? config.theme.bot_bubble_color
                        : config.theme.mode === 'dark' ? '#2a2a3a' : '#f0f0f5',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {msg.image && (
                    <Box
                      component="img"
                      src={msg.image}
                      alt="attached"
                      sx={{ width: '100%', maxWidth: 260, borderRadius: 2, display: 'block', mb: msg.text ? 0.75 : 0 }}
                    />
                  )}

                  {msg.role === 'assistant' && !msg.streaming ? (
                    <MarkdownRenderer
                      content={msg.response || msg.text || ''}
                      primaryColor={config.theme.primary_color}
                      accentColor={config.theme.accent_color}
                      textColor={config.theme.mode === 'dark' ? '#fff' : config.theme.text_color}
                      fontSize={msgFontSize}
                    />
                  ) : (
                    (msg.text || msg.status) && (
                      <Box>
                        {/* Status label shown above streaming text */}
                        {msg.status && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: config.theme.mode === 'dark' ? alpha('#fff', 0.65) : alpha(config.theme.text_color, 0.65),
                              fontStyle: 'italic',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              mb: msg.text ? 0.75 : 0,
                            }}
                          >
                            <CircularProgress size={10} thickness={6} sx={{ color: config.theme.primary_color }} />
                            {msg.status}
                          </Typography>
                        )}
                        {/* Streaming token preview or final plain-text */}
                        {msg.text && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: msg.role === 'user' ? '#fff' : (config.theme.mode === 'dark' ? '#fff' : config.theme.text_color),
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.6,
                              fontSize: msgFontSize,
                            }}
                          >
                            {msg.text}
                            {msg.streaming && (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  width: '2px',
                                  height: '1em',
                                  bgcolor: config.theme.primary_color,
                                  ml: '2px',
                                  verticalAlign: 'text-bottom',
                                  animation: 'blink 0.9s step-end infinite',
                                  '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
                                }}
                              />
                            )}
                          </Typography>
                        )}
                      </Box>
                    )
                  )}

                  {showTimestamps && (
                    <Typography
                      sx={{
                        fontSize: '0.6rem',
                        mt: 0.5,
                        color: msg.role === 'user' ? alpha('#fff', 0.65) : alpha(config.theme.text_color, 0.4),
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                        display: 'block',
                      }}
                    >
                      {formatTime(msg.timestamp)}
                    </Typography>
                  )}

                  {showSources && msg.sources && msg.sources.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                      {msg.sources.map((src) => (
                        <Chip
                          key={src}
                          label={src}
                          size="small"
                          sx={{ fontSize: '0.62rem', height: 18, bgcolor: alpha('#fff', 0.15), color: alpha('#fff', 0.85), '& .MuiChip-label': { px: 0.75 } }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {msg.role === 'user' && showAvatar && (
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      bgcolor: alpha(config.theme.primary_color, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <PersonOutlineRoundedIcon sx={{ fontSize: 16, color: config.theme.primary_color }} />
                  </Box>
                )}
                {msg.role === 'user' && !showAvatar && <Box sx={{ width: 30, flexShrink: 0 }} />}
              </Box>
            ))}

            {/* Typing indicator (only when no streaming assistant message already exists) */}
            {loading && !assistantStreaming && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: '#fff' }} />
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: '16px 16px 16px 4px',
                    bgcolor: config.theme.bot_bubble_color || (config.theme.mode === 'dark' ? '#2a2a3a' : '#f0f0f5'),
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <CircularProgress size={16} sx={{ color: config.theme.primary_color }} />
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>
          </Box>

          {/* ── Pinned questions ── */}
          {config.pinned_questions.length > 0 && (
            <Box sx={{ position: 'relative', flexShrink: 0, maxWidth: 860, width: '100%', mx: 'auto', alignSelf: 'center' }}>
            <Box
              sx={{
                px: { xs: 2, sm: 3, md: 4 },
                pt: 1.5,
                pb: 1.5,
                display: 'flex',
                gap: 0.75,
                overflowX: 'auto',
                flexShrink: 0,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {config.pinned_questions.map((q) => {
                const ps = config.pinned_style ?? 'chip'
                const pinnedSx =
                  ps === 'pill'
                    ? { flexShrink: 0, bgcolor: alpha(config.theme.primary_color, 0.07), border: `1.5px solid ${alpha(config.theme.primary_color, 0.55)}`, color: config.theme.primary_color, fontSize: '0.75rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.18s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', '&:hover': { bgcolor: alpha(config.theme.primary_color, 0.14), borderColor: config.theme.primary_color, boxShadow: '0 2px 6px rgba(0,0,0,0.12)', transform: 'translateY(-1px)' }, '&:active': { transform: 'scale(0.97)', boxShadow: 'none' } }
                    : ps === 'button'
                    ? { flexShrink: 0, background: gradient, border: 'none', color: '#fff', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.18s ease', '&:hover': { filter: 'brightness(1.12)', transform: 'translateY(-1px)', boxShadow: '0 3px 8px rgba(0,0,0,0.18)' }, '&:active': { transform: 'scale(0.97)' } }
                    : { flexShrink: 0, bgcolor: alpha(config.theme.primary_color, 0.13), border: `1px solid ${alpha(config.theme.primary_color, 0.35)}`, color: config.theme.text_color, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.18s ease', '&:hover': { bgcolor: alpha(config.theme.primary_color, 0.22), borderColor: alpha(config.theme.primary_color, 0.6), transform: 'translateY(-1px)', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }, '&:active': { transform: 'scale(0.97)' } }
                return (
                  <Chip
                    key={q}
                    label={q}
                    size="small"
                    onClick={() => void sendMessage(q)}
                    disabled={loading || isTerminated}
                    sx={pinnedSx}
                  />
                )
              })}
            </Box>
            {/* Fade-out hint for overflowing chips */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 40,
              background: `linear-gradient(to right, transparent, ${config.theme.mode === 'dark' ? alpha('#0D0D17', 0.9) : alpha('#F5F5F5', 0.95)})`,
              pointerEvents: 'none',
            }} />
            </Box>
          )}

          {/* ── Input bar ── */}
          {isTerminated ? (
            <Box
              sx={{
                px: { xs: 2, sm: 3, md: 4 },
                py: 1.5,
                flexShrink: 0,
                borderTop: `1px solid ${alpha('#c62828', 0.2)}`,
                bgcolor: config.theme.mode === 'dark' ? alpha('#1a0000', 0.45) : alpha('#fff5f5', 0.9),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <ErrorOutlineRoundedIcon sx={{ fontSize: 15, color: alpha('#c62828', 0.55) }} />
              <Typography
                variant="caption"
                sx={{ color: alpha('#c62828', 0.7), fontSize: '0.72rem', fontStyle: 'italic' }}
              >
                This assistant is unavailable. No further messages can be sent.
              </Typography>
            </Box>
          ) : (
          <Box
            sx={{
              px: { xs: 2, sm: 3, md: 4 },
              pb: 2,
              pt: 0.75,
              flexShrink: 0,
              borderTop: `1px solid ${alpha(config.theme.mode === 'dark' ? '#fff' : '#000', 0.06)}`,
              bgcolor: config.theme.mode === 'dark' ? alpha('#0D0D17', 0.85) : alpha('#F5F5F5', 0.95),
              backdropFilter: inputBlur ? 'blur(12px)' : 'none',
            }}
          >
            {attachedImage && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 0.75,
                  px: 0.75,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: alpha(config.theme.primary_color, 0.08),
                  border: `1px solid ${alpha(config.theme.primary_color, 0.2)}`,
                  maxWidth: 860,
                  mx: 'auto',
                }}
              >
                <Box
                  component="img"
                  src={attachedImage}
                  alt="preview"
                  sx={{ height: 40, width: 40, borderRadius: 1.5, objectFit: 'cover' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontSize: '0.7rem' }}>
                  Image attached
                </Typography>
                <IconButton size="small" onClick={() => setAttachedImage(null)} sx={{ p: 0.25 }}>
                  <CloseRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                </IconButton>
              </Box>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => void handleImageAttach(e)}
            />

            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, maxWidth: 860, mx: 'auto' }}>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 0.25,
                  borderRadius: `${config.input_radius ?? 22}px`,
                  bgcolor: config.theme.mode === 'dark' ? alpha('#fff', 0.07) : alpha('#000', 0.05),
                  border: `1px solid ${alpha(config.theme.primary_color, 0.2)}`,
                  px: 1.25,
                  py: 0.625,
                  transition: 'border-color 0.2s',
                  '&:focus-within': { borderColor: alpha(config.theme.primary_color, 0.6) },
                }}
              >
                {/* Emoji */}
                {showEmoji && (
                  <Tooltip title="Emoji">
                    <IconButton
                      size="small"
                      disabled={loading || isTerminated}
                      onClick={(e) => setEmojiAnchor(e.currentTarget)}
                      sx={{ color: 'text.secondary', p: 1, '&:hover': { color: config.theme.primary_color } }}
                    >
                      <EmojiEmotionsRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Emoji Picker popover */}
                <EmojiPicker
                  anchorEl={emojiAnchor}
                  onClose={() => setEmojiAnchor(null)}
                  onSelect={(emoji) => setInput((prev) => prev + emoji)}
                />

                {/* Attachment */}
                {showAttachment && (
                  <Tooltip title="Attach image">
                    <IconButton
                      size="small"
                      disabled={loading || isTerminated}
                      onClick={() => imageInputRef.current?.click()}
                      sx={{ color: 'text.secondary', p: 1, '&:hover': { color: config.theme.primary_color } }}
                    >
                      <AttachFileRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Text input */}
                <Box
                  component="textarea"
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage(input)
                    }
                  }}
                  placeholder={config.input_placeholder || 'Type your message…'}
                  rows={1}
                  sx={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    background: 'transparent',
                    color: config.theme.text_color,
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    py: 0.85,
                    px: 0.5,
                    fontFamily: '"Google Sans", "Roboto", sans-serif',
                    '&::placeholder': { color: alpha(config.theme.text_color, 0.55) },
                    overflowY: 'hidden',
                    maxHeight: 120,
                    overflowWrap: 'break-word',
                  }}
                />

                {/* Language selector */}
                {showLanguage && (
                  <Tooltip title="Response language — tap to switch">
                    <Select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      variant="standard"
                      disableUnderline
                      disabled={loading || isTerminated}
                      renderValue={() => (
                        <LanguageRoundedIcon sx={{ fontSize: 20, color: 'text.secondary', display: 'flex' }} />
                      )}
                      sx={{
                        '& .MuiSelect-select': { p: 1, display: 'flex', alignItems: 'center' },
                        '& .MuiSelect-icon': { display: 'none' },
                      }}
                    >
                      {LANGUAGES.map((lang) => (
                        <MenuItem key={lang.value} value={lang.value} sx={{ fontSize: '0.82rem' }}>
                          {lang.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </Tooltip>
                )}
              </Box>

              {/* Send / Mic button */}
              {input.trim() || attachedImage ? (
                <Tooltip title="Send">
                  <IconButton
                    onClick={() => void sendMessage(input)}
                    disabled={loading || isTerminated}
                    sx={{
                      background: config.send_button_style === 'gradient' ? gradient : config.theme.primary_color,
                      color: '#fff',
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      '&:hover': { filter: 'brightness(1.1)' },
                      '&:disabled': { opacity: 0.5 },
                    }}
                  >
                    <SendRoundedIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              ) : showMic ? (
                <Tooltip title={isListening ? 'Stop listening' : 'Voice input'}>
                  <IconButton
                    onClick={handleMicClick}
                    sx={{
                      background: isListening
                        ? `linear-gradient(135deg, ${config.theme.primary_color} 0%, ${config.theme.accent_color} 100%)`
                        : config.theme.mode === 'dark' ? alpha('#fff', 0.07) : alpha('#000', 0.05),
                      color: isListening ? '#fff' : 'text.secondary',
                      border: isListening ? 'none' : `1px solid ${alpha(config.theme.primary_color, 0.2)}`,
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                      animation: isListening ? 'pulse 1.2s ease-in-out infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { boxShadow: `0 0 0 0 ${alpha(config.theme.primary_color, 0.5)}` },
                        '70%': { boxShadow: `0 0 0 8px ${alpha(config.theme.primary_color, 0)}` },
                        '100%': { boxShadow: `0 0 0 0 ${alpha(config.theme.primary_color, 0)}` },
                      },
                    }}
                  >
                    {isListening
                      ? <MicOffRoundedIcon sx={{ fontSize: 20 }} />
                      : <MicRoundedIcon sx={{ fontSize: 20 }} />}
                  </IconButton>
                </Tooltip>
              ) : null}
            </Box>
          </Box>
          )}
          {/* ── Navigation bar (bottom) ── */}
          {config.nav_enabled && config.nav_position === 'bottom' && (
            <Box
              sx={{
                display: 'flex',
                flexShrink: 0,
                bgcolor: config.theme.mode === 'dark' ? alpha('#fff', 0.03) : '#fff',
                borderTop: `1px solid ${alpha(config.theme.primary_color, 0.14)}`,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {(config.nav_items ?? []).map((item) => (
                <Box
                  key={item.id}
                  component={item.action === 'url' && item.url ? 'a' : 'div'}
                  href={item.action === 'url' && item.url ? item.url : undefined}
                  target={item.action === 'url' && item.url ? '_blank' : undefined}
                  rel={item.action === 'url' && item.url ? 'noopener noreferrer' : undefined}
                  onClick={item.action === 'chat' ? () => { setMessages([]); setInput('') } : undefined}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', px: 2, py: 1.25,
                    cursor: 'pointer', flex: 1, minWidth: 64,
                    textDecoration: 'none',
                    gap: 0.4,
                    transition: 'background 0.15s ease',
                    '&:hover': {
                      bgcolor: alpha(config.theme.primary_color, 0.08),
                    },
                    '&:hover .nav-icon-box-b': {
                      bgcolor: alpha(config.theme.primary_color, 0.14),
                      transform: 'scale(1.08)',
                    },
                  }}
                >
                  <Box
                    className="nav-icon-box-b"
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '12px',
                      bgcolor: alpha(config.theme.primary_color, 0.08),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.18s ease',
                      border: `1px solid ${alpha(config.theme.primary_color, 0.14)}`,
                    }}
                  >
                    <Typography sx={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.62rem', color: config.theme.text_color, fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.75 }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* ── Splash screen overlay ── */}
          {showSplash && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${config.theme.primary_color} 0%, ${config.theme.accent_color} 100%)`,
                zIndex: 20,
                px: 4,
                gap: 3,
              }}
            >
              <AutoAwesomeRoundedIcon sx={{ fontSize: 64, color: alpha('#fff', 0.9) }} />
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, textAlign: 'center', lineHeight: 1.3 }}>
                {config.splash_title || 'Welcome!'}
              </Typography>
              <Typography sx={{ color: alpha('#fff', 0.8), textAlign: 'center', fontSize: '1rem', maxWidth: 360 }}>
                {config.splash_subtitle || 'How can I help you today?'}
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => setShowSplash(false)}
                sx={{
                  mt: 1,
                  bgcolor: '#fff',
                  color: config.theme.primary_color,
                  fontWeight: 700,
                  px: 5,
                  py: 1.5,
                  borderRadius: 3,
                  fontSize: '1rem',
                  '&:hover': { bgcolor: alpha('#fff', 0.9) },
                }}
              >
                {config.splash_button_label || 'Start Chat'}
              </Button>
            </Box>
          )}

          {/* ── Catalogue Drawer ── */}
          <CatalogueDrawer
            open={catalogueOpen}
            onClose={() => setCatalogueOpen(false)}
            assistantId={assistantId}
            config={config}
          />

          {/* ── Document Summary Drawer ── */}
          {/* Backdrop */}
          <Box
            onClick={() => setSummaryPanelSource(null)}
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: alpha('#000', 0.5),
              zIndex: 28,
              backdropFilter: 'blur(3px)',
              opacity: summaryPanelSource ? 1 : 0,
              pointerEvents: summaryPanelSource ? 'all' : 'none',
              transition: 'opacity 0.28s ease',
            }}
          />
          {/* Drawer panel */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '90%',
              zIndex: 29,
              transform: summaryPanelSource ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderLeft: `1px solid ${alpha(config.theme.primary_color, 0.25)}`,
              bgcolor: config.theme.mode === 'dark' ? '#0f0f1e' : '#f8f8fc'
            }}
          >
            {/* Rich gradient header */}
            <Box sx={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${config.theme.primary_color} 0%, ${config.theme.accent_color} 100%)`, opacity: 0.92 }} />
              <Box sx={{ position: 'absolute', top: -18, right: -18, width: 80, height: 80, borderRadius: '50%', bgcolor: alpha('#fff', 0.07) }} />
              <Box sx={{ position: 'absolute', bottom: -12, left: -10, width: 55, height: 55, borderRadius: '50%', bgcolor: alpha('#fff', 0.05) }} />
              <Box sx={{ position: 'relative', px: 1.75, pt: 1.5, pb: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: alpha('#fff', 0.2), backdropFilter: 'blur(4px)', border: `1px solid ${alpha('#fff', 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    <ArticleOutlinedIcon sx={{ fontSize: 16, color: '#fff' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: alpha('#fff', 0.65), fontSize: '0.52rem', letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1, mb: 0.2 }}>AI Document Summary</Typography>
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {summaryLoading ? 'Loading…' : (summaryDetail?.summary_name ?? summaryPanelSource ?? '')}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setSummaryPanelSource(null)} sx={{ flexShrink: 0, color: '#fff', bgcolor: alpha('#fff', 0.15), backdropFilter: 'blur(4px)', border: `1px solid ${alpha('#fff', 0.2)}`, p: 0.45, '&:hover': { bgcolor: alpha('#fff', 0.28) } }}>
                    <CloseRoundedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                {summaryPanelSource && (
                  <Chip label={summaryPanelSource} size="small" sx={{ height: 17, fontSize: '0.58rem', fontFamily: 'monospace', bgcolor: alpha('#000', 0.22), color: alpha('#fff', 0.85), border: `1px solid ${alpha('#fff', 0.15)}`, backdropFilter: 'blur(4px)', maxWidth: '100%', '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' } }} />
                )}
              </Box>
              <Tabs
                value={drawerTab}
                onChange={(_, v: number) => setDrawerTab(v)}
                sx={{ minHeight: 30, px: 1, '& .MuiTabs-indicator': { background: '#fff', height: 2, borderRadius: '2px 2px 0 0' } }}
              >
                {[
                  { icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 11 }} />, label: 'Summary' },
                  { icon: <ArticleOutlinedIcon sx={{ fontSize: 11 }} />, label: 'Context' },
                ].map((t, i) => (
                  <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} sx={{ minHeight: 30, py: 0.5, px: 1.25, fontSize: '0.62rem', fontWeight: 600, textTransform: 'none', color: alpha('#fff', 0.6), gap: 0.4, minWidth: 'unset', '&.Mui-selected': { color: '#fff' } }} />
                ))}
              </Tabs>
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${alpha(config.theme.primary_color, 0.3)} transparent` }}>
              {summaryLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 6 }}>
                  <Box sx={{ position: 'relative', width: 44, height: 44 }}>
                    <CircularProgress size={44} thickness={2} sx={{ color: alpha(config.theme.primary_color, 0.15), position: 'absolute' }} variant="determinate" value={100} />
                    <CircularProgress size={44} thickness={2} sx={{ color: config.theme.primary_color, position: 'absolute' }} />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: config.theme.primary_color }} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '0.7rem', color: alpha(config.theme.text_color, 0.4) }}>Generating summary…</Typography>
                </Box>
              )}
              {!summaryLoading && summaryError && (
                <Box sx={{ p: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: alpha('#ef5350', 0.08), border: `1px solid ${alpha('#ef5350', 0.25)}`, display: 'flex', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.7rem', color: '#ef5350', lineHeight: 1.5 }}>⚠️ {summaryError}</Typography>
                  </Box>
                </Box>
              )}
              {!summaryLoading && !summaryError && summaryDetail && (
                <Box sx={{ p: 1.75, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {drawerTab === 0 && (
                    <>
                      <Box sx={{ position: 'relative', borderRadius: 2.5, overflow: 'hidden', border: `1px solid ${alpha(config.theme.primary_color, 0.22)}`, bgcolor: alpha(config.theme.primary_color, 0.05) }}>
                        <Box sx={{ height: 2, background: `linear-gradient(135deg, ${config.theme.primary_color} 0%, ${config.theme.accent_color} 100%)`, borderRadius: '2px 2px 0 0' }} />
                        <Box sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <AutoAwesomeRoundedIcon sx={{ fontSize: 11, color: config.theme.primary_color }} />
                              <Typography sx={{ fontSize: '0.57rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: alpha(config.theme.text_color, 0.45) }}>Generated Summary</Typography>
                            </Box>
                            <Tooltip title={summaryCopied ? 'Copied!' : 'Copy summary'} placement="top">
                              <IconButton size="small" onClick={() => void copySummary(summaryDetail.description)} sx={{ p: 0.3 }}>
                                {summaryCopied ? <CheckRoundedIcon sx={{ fontSize: 12, color: '#66bb6a' }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 12, color: alpha(config.theme.text_color, 0.35) }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                          {summaryDetail.description
                            ? <MarkdownRenderer
                                content={summaryDetail.description}
                                primaryColor={config.theme.primary_color}
                                accentColor={config.theme.accent_color}
                                textColor={alpha(config.theme.text_color, 0.85)}
                                fontSize="0.74rem"
                              />
                            : <Typography sx={{ fontSize: '0.74rem', color: alpha(config.theme.text_color, 0.45), lineHeight: 1.75 }}>No description available.</Typography>
                          }
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1.25, borderRadius: 2, bgcolor: alpha(config.theme.primary_color, 0.04), border: `1px solid ${alpha(config.theme.primary_color, 0.12)}` }}>
                        {[
                          { label: 'Source', value: summaryDetail.source, mono: true },
                          { label: 'Type', value: summaryDetail.content_type || '—' },
                          ...(summaryDetail.created_at ? [{ label: 'Indexed', value: new Date(summaryDetail.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }), mono: false }] : []),
                        ].map(({ label, value, mono }) => (
                          <Box key={label} sx={{ display: 'flex', gap: 0.75 }}>
                            <Typography sx={{ fontSize: '0.6rem', color: alpha(config.theme.text_color, 0.35), fontWeight: 700, minWidth: 40, flexShrink: 0 }}>{label}</Typography>
                            <Typography sx={{ fontSize: '0.6rem', color: alpha(config.theme.text_color, 0.7), fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                  {drawerTab === 1 && (
                    <Box sx={{ borderRadius: 2.5, overflow: 'hidden', border: `1px solid ${alpha(config.theme.primary_color, 0.22)}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.25, py: 0.7, bgcolor: alpha(config.theme.primary_color, 0.14), borderBottom: `1px solid ${alpha(config.theme.primary_color, 0.2)}` }}>
                        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
                          <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c, flexShrink: 0 }} />
                        ))}
                        <Typography sx={{ flex: 1, fontSize: '0.55rem', fontFamily: 'monospace', color: alpha(config.theme.text_color, 0.4), ml: 0.5 }}>context_block</Typography>
                        <Tooltip title={summaryCopied ? 'Copied!' : 'Copy block'} placement="top">
                          <IconButton size="small" onClick={() => void copySummary(summaryDetail.context_block)} sx={{ p: 0.3 }}>
                            {summaryCopied ? <CheckRoundedIcon sx={{ fontSize: 12, color: '#66bb6a' }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 12, color: alpha(config.theme.text_color, 0.35) }} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box component="pre" sx={{ m: 0, p: 1.25, fontSize: '0.64rem', fontFamily: '"JetBrains Mono","Fira Code",monospace', color: alpha(config.theme.text_color, 0.82), whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7, bgcolor: alpha(config.theme.primary_color, 0.03), overflowX: 'hidden' }}>
                        {summaryDetail.context_block || '(empty)'}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
