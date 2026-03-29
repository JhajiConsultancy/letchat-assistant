import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import { RichPart, parseInlineMarkdown, CardPart, ButtonGroupPart } from './richContent'

interface Props {
  parts: RichPart[]
  primaryColor: string
  accentColor: string
  textColor?: string
}

const gradient = (primary: string, accent: string) =>
  `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`

// ─── Code Part ──────────────────────────────────────────────────────────────

function CodeRenderer({
  code,
  language,
  primaryColor,
}: {
  code: string
  language?: string
  primaryColor: string
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 0.75,
        borderRadius: 2,
        bgcolor: isDark ? alpha('#000', 0.5) : alpha('#000', 0.05),
        border: `1px solid ${alpha(primaryColor, 0.1)}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          bgcolor: alpha(primaryColor, 0.05),
          borderBottom: `1px solid ${alpha(primaryColor, 0.1)}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: primaryColor, textTransform: 'uppercase', letterSpacing: 1 }}
        >
          {language || 'code'}
        </Typography>
        <Button
          size="small"
          startIcon={<ContentCopyRoundedIcon sx={{ fontSize: '12px !important' }} />}
          sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'none', py: 0 }}
          onClick={() => { navigator.clipboard.writeText(code) }}
        >
          Copy
        </Button>
      </Box>
      <Box
        sx={{
          p: 2,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: alpha(primaryColor, 0.2), borderRadius: 2 },
        }}
      >
        <Typography
          component="pre"
          sx={{
            m: 0,
            fontSize: '0.75rem',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            whiteSpace: 'pre',
            color: isDark ? '#E0E0E0' : '#333',
            lineHeight: 1.5,
          }}
        >
          {code}
        </Typography>
      </Box>
    </Paper>
  )
}

// ─── Inline text renderer ─────────────────────────────────────────────────────

function InlineText({
  content,
  linkColor,
  keyPrefix,
  sx,
  textColor,
}: {
  content: string
  linkColor: string
  keyPrefix: string
  sx?: object
  textColor?: string
}) {
  const nodes = parseInlineMarkdown(content, linkColor, keyPrefix)
  return (
    <Typography
      component="span"
      variant="body2"
      sx={{ lineHeight: 1.65, fontSize: '0.82rem', display: 'inline', color: textColor || 'inherit', ...sx }}
    >
      {nodes}
    </Typography>
  )
}

// ─── Smart text block parser ──────────────────────────────────────────────────

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'numbered'; items: string[] }
  | { kind: 'paragraph'; text: string }

function parseBlocks(raw: string): Block[] {
  const lines = raw.split('\n')
  const blocks: Block[] = []
  let bulletBuf: string[] = []
  let numberedBuf: string[] = []

  const flushBullet = () => {
    if (bulletBuf.length) { blocks.push({ kind: 'bullet', items: [...bulletBuf] }); bulletBuf = [] }
  }
  const flushNumbered = () => {
    if (numberedBuf.length) { blocks.push({ kind: 'numbered', items: [...numberedBuf] }); numberedBuf = [] }
  }

  for (const raw_line of lines) {
    const line = raw_line.trimEnd()

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      flushBullet(); flushNumbered()
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3
      blocks.push({ kind: 'heading', level, text: headingMatch[2] })
      continue
    }

    const bulletMatch = line.match(/^[\s]*(?:-|\*|•|🔹|💡|✅|🔸|➡️|▪️)\s+(.+)/)
    if (bulletMatch) {
      flushNumbered()
      bulletBuf.push(bulletMatch[1])
      continue
    }

    const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)/)
    if (numberedMatch) {
      flushBullet()
      numberedBuf.push(numberedMatch[1])
      continue
    }

    if (line.trim() === '') {
      flushBullet(); flushNumbered()
      continue
    }

    flushBullet(); flushNumbered()
    blocks.push({ kind: 'paragraph', text: line })
  }

  flushBullet(); flushNumbered()
  return blocks
}

function SmartTextRenderer({
  content,
  primaryColor,
  keyPrefix,
  textColor,
}: {
  content: string
  primaryColor: string
  keyPrefix: string
  textColor?: string
}) {
  const blocks = parseBlocks(content)
  const fontSizeMap = { 1: '1.1rem', 2: '0.95rem', 3: '0.88rem' } as const

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {blocks.map((block, i) => {
        const bkey = `${keyPrefix}-b${i}`

        if (block.kind === 'heading') {
          return (
            <Typography
              key={bkey}
              sx={{
                fontSize: fontSizeMap[block.level],
                fontWeight: 900,
                letterSpacing: -0.2,
                mt: i === 0 ? 0 : 1,
                mb: 0.25,
                color: textColor || 'text.primary',
                lineHeight: 1.3,
              }}
            >
              {block.text}
            </Typography>
          )
        }

        if (block.kind === 'bullet' || block.kind === 'numbered') {
          return (
            <Box
              key={bkey}
              component={block.kind === 'numbered' ? 'ol' : 'ul'}
              sx={{
                m: 0,
                pl: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                '& li::marker': { fontWeight: 700, color: primaryColor },
              }}
            >
              {block.items.map((item, li) => (
                <Box component="li" key={li}>
                  <InlineText content={item} linkColor={primaryColor} keyPrefix={`${bkey}-li${li}`} textColor={textColor} />
                </Box>
              ))}
            </Box>
          )
        }

        return (
          <InlineText key={bkey} content={block.text} linkColor={primaryColor} keyPrefix={bkey} textColor={textColor} />
        )
      })}
    </Box>
  )
}

// ─── Card Part ───────────────────────────────────────────────────────────────

function CardRenderer({ part, primary, accent }: { part: CardPart; primary: string; accent: string }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const grad = gradient(primary, accent)

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${alpha(primary, 0.3)}`,
        bgcolor: isDark ? alpha('#fff', 0.04) : alpha('#000', 0.03),
        mt: 0.5,
      }}
    >
      {part.image_url && (
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={part.image_url}
            alt={part.title}
            sx={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
          />
          {part.badge && (
            <Chip
              label={part.badge}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: part.badge_color ?? '#34A853',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.68rem',
                height: 20,
              }}
            />
          )}
        </Box>
      )}

      {!part.image_url && part.badge && (
        <Box sx={{ px: 1.5, pt: 1.5 }}>
          <Chip
            label={part.badge}
            size="small"
            sx={{ bgcolor: part.badge_color ?? '#34A853', color: '#fff', fontWeight: 700, fontSize: '0.68rem', height: 20 }}
          />
        </Box>
      )}

      <Box sx={{ px: 1.5, pt: part.image_url || part.badge ? 1 : 1.5, pb: part.actions?.length ? 0 : 1.5 }}>
        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
          {part.title}
        </Typography>
        {part.subtitle && (
          <Typography variant="caption" sx={{ color: primary, fontWeight: 600, display: 'block', mt: 0.25 }}>
            {part.subtitle}
          </Typography>
        )}
        {part.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5, fontSize: '0.75rem' }}>
            {part.description}
          </Typography>
        )}
      </Box>

      {part.actions && part.actions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, px: 1.5, py: 1, borderTop: `1px solid ${alpha(primary, 0.15)}`, flexWrap: 'wrap' }}>
          {part.actions.map((action, i) => (
            <Button
              key={i}
              size="small"
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={action.variant !== 'text' ? <OpenInNewRoundedIcon sx={{ fontSize: '12px !important' }} /> : undefined}
              sx={{
                fontSize: '0.72rem',
                px: 1.2,
                py: 0.4,
                minHeight: 28,
                borderRadius: 3,
                textTransform: 'none',
                ...(action.variant === 'outlined'
                  ? { border: `1px solid ${alpha(primary, 0.5)}`, color: primary, bgcolor: 'transparent', '&:hover': { bgcolor: alpha(primary, 0.08) } }
                  : action.variant === 'text'
                  ? { color: primary, '&:hover': { bgcolor: alpha(primary, 0.08) } }
                  : { background: grad, color: '#fff', '&:hover': { filter: 'brightness(1.1)' } }),
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  )
}

// ─── Button Group Part ───────────────────────────────────────────────────────

function ButtonGroupRenderer({ part, primary, accent }: { part: ButtonGroupPart; primary: string; accent: string }) {
  const grad = gradient(primary, accent)
  return (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
      {part.buttons.map((btn, i) => (
        <Button
          key={i}
          size="small"
          href={btn.url}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNewRoundedIcon sx={{ fontSize: '12px !important' }} />}
          sx={{
            fontSize: '0.72rem',
            px: 1.5,
            py: 0.5,
            borderRadius: 3,
            textTransform: 'none',
            ...(btn.variant === 'outlined'
              ? { border: `1px solid ${alpha(primary, 0.5)}`, color: primary, bgcolor: 'transparent', '&:hover': { bgcolor: alpha(primary, 0.08) } }
              : btn.variant === 'text'
              ? { color: primary }
              : { background: grad, color: '#fff', '&:hover': { filter: 'brightness(1.1)' } }),
          }}
        >
          {btn.label}
        </Button>
      ))}
    </Box>
  )
}

// ─── Main renderer ───────────────────────────────────────────────────────────

export default function RichMessageRenderer({ parts, primaryColor, accentColor, textColor }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {parts.map((part, idx) => {
        const key = `part-${idx}`
        switch (part.type) {
          case 'text':
            return (
              <SmartTextRenderer
                key={key}
                content={part.content}
                primaryColor={primaryColor}
                keyPrefix={key}
                textColor={textColor}
              />
            )
          case 'image':
            return (
              <Box key={key}>
                <Box
                  component="img"
                  src={part.url}
                  alt={part.alt ?? ''}
                  sx={{ width: '100%', borderRadius: 2, display: 'block', maxHeight: 200, objectFit: 'cover' }}
                />
                {part.caption && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.68rem', fontStyle: 'italic', color: textColor ? alpha(textColor, 0.7) : 'text.secondary' }}>
                    {part.caption}
                  </Typography>
                )}
              </Box>
            )
          case 'card':
            return <CardRenderer key={key} part={part} primary={primaryColor} accent={accentColor} />
          case 'button_group':
            return <ButtonGroupRenderer key={key} part={part} primary={primaryColor} accent={accentColor} />
          case 'list':
            return (
              <Box
                key={key}
                component={part.style === 'numbered' ? 'ol' : 'ul'}
                sx={{
                  m: 0,
                  pl: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  '& li::marker': { fontWeight: 700, color: primaryColor },
                }}
              >
                {part.items.map((item, li) => (
                  <Box component="li" key={li}>
                    <InlineText content={item} linkColor={primaryColor} keyPrefix={`${key}-li-${li}`} textColor={textColor} />
                  </Box>
                ))}
              </Box>
            )
          case 'divider':
            return <Divider key={key} sx={{ my: 0.25, borderColor: alpha(primaryColor, 0.2) }} />
          case 'code':
            return (
              <CodeRenderer
                key={key}
                code={part.code}
                language={part.language}
                primaryColor={primaryColor}
              />
            )
          case 'heading': {
            const variantMap = { 1: 'h5', 2: 'h6', 3: 'subtitle1' } as const
            const fontSizeMap = { 1: '1.25rem', 2: '1rem', 3: '0.9rem' } as const
            return (
              <Typography
                key={key}
                variant={variantMap[part.level]}
                sx={{
                  mt: idx === 0 ? 0 : 2,
                  mb: 0.5,
                  fontWeight: 900,
                  fontSize: fontSizeMap[part.level],
                  letterSpacing: -0.2,
                  color: textColor || 'text.primary',
                }}
              >
                {part.text}
              </Typography>
            )
          }
          default:
            return null
        }
      })}
    </Box>
  )
}
