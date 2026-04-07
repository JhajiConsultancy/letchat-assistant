// ---------------------------------------------------------------------------
// MarkdownRenderer.tsx — renders a markdown string using react-markdown with
// MUI-styled elements. Used by ChatWidgetV2 to render assistant responses.
// ---------------------------------------------------------------------------

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import {
  Box,
  Button,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { useState } from 'react'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  primaryColor: string
  accentColor?: string
  textColor?: string
  fontSize?: string
}

// ─── Code block with copy button ────────────────────────────────────────────

function CodeBlock({
  inline,
  className,
  children,
  primaryColor,
}: {
  inline?: boolean
  className?: string
  children?: React.ReactNode
  primaryColor: string
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [copied, setCopied] = useState(false)

  const language = className?.replace('language-', '') ?? ''
  const code = String(children).replace(/\n$/, '')

  if (inline) {
    return (
      <Box
        component="code"
        sx={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          fontSize: '0.78em',
          bgcolor: isDark ? alpha('#fff', 0.1) : alpha('#000', 0.07),
          color: isDark ? '#f0a0a0' : '#c7254e',
          borderRadius: '4px',
          px: 0.6,
          py: 0.15,
        }}
      >
        {children}
      </Box>
    )
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Paper
      elevation={0}
      sx={{
        my: 1,
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${alpha(primaryColor, 0.15)}`,
        bgcolor: isDark ? alpha('#000', 0.55) : alpha('#000', 0.04),
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          bgcolor: alpha(primaryColor, 0.06),
          borderBottom: `1px solid ${alpha(primaryColor, 0.1)}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: primaryColor, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}
        >
          {language || 'code'}
        </Typography>
        <Button
          size="small"
          startIcon={
            copied
              ? <CheckRoundedIcon sx={{ fontSize: '12px !important', color: '#4caf50' }} />
              : <ContentCopyRoundedIcon sx={{ fontSize: '12px !important' }} />
          }
          onClick={handleCopy}
          sx={{ fontSize: '0.65rem', color: copied ? '#4caf50' : 'text.secondary', textTransform: 'none', py: 0, minWidth: 0 }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </Box>
      {/* Code body */}
      <Box
        sx={{
          p: 1.5,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: alpha(primaryColor, 0.2), borderRadius: 2 },
        }}
      >
        <Box
          component="pre"
          sx={{
            m: 0,
            fontSize: '0.75rem',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            whiteSpace: 'pre',
            lineHeight: 1.55,
            color: isDark ? '#e0e0e0' : '#333',
          }}
        >
          <Box component="code" className={className} sx={{ display: 'block' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MarkdownRenderer({
  content,
  primaryColor,
  accentColor,
  textColor,
  fontSize = '0.82rem',
}: MarkdownRendererProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const resolvedText = textColor ?? (isDark ? '#fff' : 'inherit')
  const linkColor = accentColor ?? primaryColor

  const components: Components = {
    // ── Headings ────────────────────────────────────────────────────────────
    h1: ({ children }) => (
      <Typography
        component="h1"
        sx={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.3, mt: 1.5, mb: 0.5, color: resolvedText }}
      >
        {children}
      </Typography>
    ),
    h2: ({ children }) => (
      <Typography
        component="h2"
        sx={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.3, mt: 1.5, mb: 0.5, color: resolvedText }}
      >
        {children}
      </Typography>
    ),
    h3: ({ children }) => (
      <Typography
        component="h3"
        sx={{ fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.3, mt: 1.25, mb: 0.4, color: resolvedText }}
      >
        {children}
      </Typography>
    ),
    h4: ({ children }) => (
      <Typography
        component="h4"
        sx={{ fontSize: '0.86rem', fontWeight: 700, lineHeight: 1.3, mt: 1, mb: 0.3, color: resolvedText }}
      >
        {children}
      </Typography>
    ),

    // ── Paragraph ───────────────────────────────────────────────────────────
    p: ({ children }) => (
      <Typography
        component="p"
        sx={{
          fontSize,
          lineHeight: 1.7,
          color: resolvedText,
          my: 0.4,
          '&:first-of-type': { mt: 0 },
          '&:last-of-type': { mb: 0 },
        }}
      >
        {children}
      </Typography>
    ),

    // ── Lists ────────────────────────────────────────────────────────────────
    ul: ({ children }) => (
      <Box
        component="ul"
        sx={{
          m: 0,
          pl: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.4,
          '& li::marker': { color: primaryColor, fontWeight: 700 },
          my: 0.5,
        }}
      >
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box
        component="ol"
        sx={{
          m: 0,
          pl: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.4,
          '& li::marker': { color: primaryColor, fontWeight: 700 },
          my: 0.5,
        }}
      >
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Box
        component="li"
        sx={{ fontSize, lineHeight: 1.65, color: resolvedText }}
      >
        {children}
      </Box>
    ),

    // ── Blockquote ───────────────────────────────────────────────────────────
    blockquote: ({ children }) => (
      <Box
        component="blockquote"
        sx={{
          m: 0,
          my: 0.75,
          pl: 1.5,
          py: 0.25,
          borderLeft: `3px solid ${alpha(primaryColor, 0.6)}`,
          bgcolor: alpha(primaryColor, 0.05),
          borderRadius: '0 6px 6px 0',
          color: alpha(resolvedText as string, 0.8),
          fontStyle: 'italic',
        }}
      >
        {children}
      </Box>
    ),

    // ── Inline code & code blocks ─────────────────────────────────────────────
    code: ({ inline, className, children, ...props }) => (
      <CodeBlock inline={inline} className={className} primaryColor={primaryColor} {...props}>
        {children}
      </CodeBlock>
    ),

    // ── Horizontal rule ──────────────────────────────────────────────────────
    hr: () => (
      <Divider sx={{ my: 1, borderColor: alpha(primaryColor, 0.2) }} />
    ),

    // ── Links ─────────────────────────────────────────────────────────────────
    a: ({ href, children }) => (
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: linkColor,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          '&:hover': { textDecoration: 'underline', opacity: 0.85 },
        }}
      >
        {children}
        <OpenInNewRoundedIcon sx={{ fontSize: '0.65rem', mb: '1px', opacity: 0.7 }} />
      </Box>
    ),

    // ── Strong / emphasis ─────────────────────────────────────────────────────
    strong: ({ children }) => (
      <Box component="strong" sx={{ fontWeight: 700, color: resolvedText }}>
        {children}
      </Box>
    ),
    em: ({ children }) => (
      <Box component="em" sx={{ fontStyle: 'italic', color: resolvedText }}>
        {children}
      </Box>
    ),

    // ── Images ───────────────────────────────────────────────────────────────
    img: ({ src, alt }) => (
      <Box
        component="img"
        src={src}
        alt={alt ?? ''}
        sx={{ maxWidth: '100%', borderRadius: 2, display: 'block', my: 0.75, maxHeight: 240, objectFit: 'contain' }}
      />
    ),

    // ── Tables (GFM) ──────────────────────────────────────────────────────────
    table: ({ children }) => (
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          my: 0.75,
          border: `1px solid ${alpha(primaryColor, 0.2)}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Table size="small">{children}</Table>
      </TableContainer>
    ),
    thead: ({ children }) => (
      <TableHead sx={{ bgcolor: alpha(primaryColor, 0.08) }}>{children}</TableHead>
    ),
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => (
      <TableRow sx={{ '&:last-child td': { borderBottom: 0 } }}>{children}</TableRow>
    ),
    th: ({ children }) => (
      <TableCell
        sx={{
          fontWeight: 700,
          fontSize: '0.72rem',
          color: primaryColor,
          borderBottom: `1px solid ${alpha(primaryColor, 0.2)}`,
          py: 0.75,
        }}
      >
        {children}
      </TableCell>
    ),
    td: ({ children }) => (
      <TableCell
        sx={{
          fontSize: '0.75rem',
          color: resolvedText,
          borderBottom: `1px solid ${alpha(primaryColor, 0.1)}`,
          py: 0.6,
        }}
      >
        {children}
      </TableCell>
    ),
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        '& > *:first-child': { mt: '0 !important' },
        '& > *:last-child': { mb: '0 !important' },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}
