import { useEffect, useRef, useState } from 'react'
import { alpha } from '@mui/material'
import { X, MessageCircle } from 'lucide-react'
import { ChatWidgetConfig } from './types'
import ChatWidgetV2 from './ChatWidgetV2'

interface FloatingChatWidgetProps {
  config: ChatWidgetConfig
  assistantId: string
}

export default function FloatingChatWidget({ config, assistantId }: FloatingChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const animFrameRef = useRef<number | null>(null)

  const primary = config.theme.primary_color
  const accent  = config.theme.accent_color
  const gradient = `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`

  // Open: mount first, then fade/slide in on next frame
  function handleOpen() {
    setMounted(true)
    setOpen(true)
    animFrameRef.current = requestAnimationFrame(() => {
      animFrameRef.current = requestAnimationFrame(() => setVisible(true))
    })
  }

  // Close: fade/slide out, unmount after transition
  function handleClose() {
    setVisible(false)
    setTimeout(() => {
      setOpen(false)
      setMounted(false)
    }, 340)
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const avatarUrl = config.logo_url

  return (
    <>
      {/* ── Floating dialog ── */}
      {mounted && (
        <div
          style={{
            position: 'fixed',
            bottom: 88,
            right: 24,
            width: 'min(420px, calc(100vw - 32px))',
            height: 'min(620px, calc(100vh - 120px))',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.14)',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.96)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.26s ease',
            transformOrigin: 'bottom right',
          }}
        >
          {/* Thin close strip at very top */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 10,
              paddingLeft: 14,
              zIndex: 10,
              background: 'transparent',
              pointerEvents: 'none',
            }}
          >
            <button
              onClick={handleClose}
              aria-label="Close chat"
              style={{
                pointerEvents: 'auto',
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: 'none',
                background: alpha('#000', 0.22),
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                transition: 'background 0.18s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = alpha('#000', 0.42))}
              onMouseLeave={e => (e.currentTarget.style.background = alpha('#000', 0.22))}
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Chat widget fills the panel */}
          {open && (
            <ChatWidgetV2
              config={config}
              assistantId={assistantId}
              compactHeader
            />
          )}
        </div>
      )}

      {/* ── Floating launcher button ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9998,
        }}
      >
        {/* Pulse rings */}
        {!open && (
          <>
            <span
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                background: primary,
                opacity: 0,
                animation: 'fcw-pulse1 2.4s ease-out infinite',
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                background: primary,
                opacity: 0,
                animation: 'fcw-pulse1 2.4s ease-out 0.9s infinite',
              }}
            />
          </>
        )}

        <button
          onClick={() => (open ? handleClose() : handleOpen())}
          aria-label={open ? 'Close chat' : 'Open chat'}
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: gradient,
            boxShadow: `0 4px 20px ${alpha(primary, 0.45)}, 0 2px 8px rgba(0,0,0,0.2)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = `0 6px 28px ${alpha(primary, 0.55)}, 0 3px 12px rgba(0,0,0,0.24)`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = `0 4px 20px ${alpha(primary, 0.45)}, 0 2px 8px rgba(0,0,0,0.2)`
          }}
        >
          {/* Avatar or icon */}
          {avatarUrl && !open ? (
            <img
              src={avatarUrl}
              alt="chat"
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease',
                transform: open ? 'rotate(90deg) scale(0.9)' : 'rotate(0deg) scale(1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {open
                ? <X size={22} color="#fff" strokeWidth={2.5} />
                : <MessageCircle size={22} color="#fff" strokeWidth={2} />
              }
            </div>
          )}
        </button>

        {/* Unread badge dot — shown when closed and there's an initial message */}
        {!open && config.initial_message && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid #fff',
              display: 'block',
            }}
          />
        )}
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes fcw-pulse1 {
          0%   { transform: scale(1);   opacity: 0.55; }
          60%  { transform: scale(1.7); opacity: 0.15; }
          100% { transform: scale(2);   opacity: 0; }
        }
      `}</style>
    </>
  )
}
