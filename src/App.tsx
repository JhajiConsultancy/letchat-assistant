import { useEffect, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import ChatWidget from './features/chat/ChatWidget'
import { loadConfig } from './api/widgetConfig'
import { ChatWidgetConfig } from './features/chat/types'
import LandingPage from './Landing'

function getAssistantId(): string {
  const { hostname, search } = window.location
  const params = new URLSearchParams(search)

  // 1. Try to get slug from subdomain (e.g., neeraj.letchat.in)
  const parts = hostname.split('.')
  // If we're on <slug>.letchat.in or <slug>.localhost
  if (parts.length >= 2) {
    const slug = parts[0]
    // Filter out common subdomains that aren't slugs
    if (!['www', 'api', 'admin', 'localhost', '127'].includes(slug.toLowerCase())) {
      return slug
    }
  }

  // 2. Fallback to slugName query parameter
  const idValue = params.get('slugName')
  // if no slug found than land on the default landing page
  if (!idValue) 
    return 'landing'
 
  return idValue
}

export default function App() {
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assistantId] = useState<string | null>(() => {
    try { return getAssistantId() } catch { return null }
  })

  if (assistantId === 'landing') {
    return <LandingPage />
  }

  useEffect(() => {
    if (!assistantId) {
      setError('Missing required URL parameter: assistantId')
      return
    }
    loadConfig(assistantId)
      .then(setConfig)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load configuration'
        setError(msg)
      })
  }, [assistantId])

  if (error) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, bgcolor: '#0D0D17' }}>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
        <Typography color="text.secondary" variant="caption" sx={{ color: '#aaa' }}>
          Please check your API configuration and try again.
        </Typography>
      </Box>
    )
  }

  if (!config) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0D0D17' }}>
        <CircularProgress sx={{ color: '#8E74E4' }} />
      </Box>
    )
  }

  return <ChatWidget config={config} assistantId={assistantId!} />
}
