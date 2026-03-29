// ---------------------------------------------------------------------------
// richContent.ts — types for the structured rich-content response from the
// backend's POST /api/query endpoint.
// ---------------------------------------------------------------------------

import React from 'react'

// ─── Part types ─────────────────────────────────────────────────────────────

export interface TextPart {
  type: 'text'
  content: string
}

export interface ImagePart {
  type: 'image'
  url: string
  alt?: string
  caption?: string
}

export interface CardAction {
  label: string
  url: string
  variant?: 'primary' | 'outlined' | 'text'
}

export interface CardPart {
  type: 'card'
  title: string
  subtitle?: string
  description?: string
  image_url?: string
  badge?: string
  badge_color?: string
  actions?: CardAction[]
}

export interface ButtonGroupPart {
  type: 'button_group'
  buttons: CardAction[]
}

export interface ListPart {
  type: 'list'
  style: 'bullet' | 'numbered'
  items: string[]
}

export interface DividerPart {
  type: 'divider'
}

/** Pre-formatted code block */
export interface CodePart {
  type: 'code'
  code: string
  language?: string
}

/** Heading (H1, H2, H3) */
export interface HeadingPart {
  type: 'heading'
  level: 1 | 2 | 3
  text: string
}

export type RichPart =
  | TextPart
  | ImagePart
  | CardPart
  | ButtonGroupPart
  | ListPart
  | DividerPart
  | CodePart
  | HeadingPart

// ─── Extended API response ───────────────────────────────────────────────────

export interface RichQueryResponse {
  query: string
  response: string
  sources: string[]
  parts?: RichPart[]
  session_id?: string
}

// ─── Markdown-lite inline parser ────────────────────────────────────────────

type InlineToken =
  | { kind: 'text';   value: string }
  | { kind: 'bold';   value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'link';   text: string; url: string }
  | { kind: 'math';   value: string; display: boolean }

const INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|\$([^$]+)\$/g

function tokenize(raw: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let last = 0
  let m: RegExpExecArray | null

  INLINE_RE.lastIndex = 0
  while ((m = INLINE_RE.exec(raw)) !== null) {
    if (m.index > last) tokens.push({ kind: 'text', value: raw.slice(last, m.index) })

    if (m[1] !== undefined) {
      tokens.push({ kind: 'link', text: m[1], url: m[2] })
    } else if (m[3] !== undefined) {
      tokens.push({ kind: 'bold', value: m[3] })
    } else if (m[4] !== undefined) {
      tokens.push({ kind: 'italic', value: m[4] })
    } else if (m[5] !== undefined) {
      tokens.push({ kind: 'math', value: m[5], display: false })
    }
    last = m.index + m[0].length
  }
  if (last < raw.length) tokens.push({ kind: 'text', value: raw.slice(last) })
  return tokens
}

export function parseInlineMarkdown(
  raw: string,
  linkColor: string,
  keyPrefix: string,
): React.ReactNode[] {
  return tokenize(raw).map((token, i) => {
    const key = `${keyPrefix}-${i}`
    switch (token.kind) {
      case 'bold':
        return React.createElement('strong', { key, style: { fontWeight: 700 } }, token.value)
      case 'italic':
        return React.createElement('em', { key }, token.value)
      case 'math':
        return React.createElement(
          'span',
          {
            key,
            style: {
              fontFamily: 'STIX Two Math, serif',
              fontStyle: 'italic',
              padding: '0 2px',
            },
          },
          token.value,
        )
      case 'link':
        return React.createElement(
          'a',
          {
            key,
            href: token.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: { color: linkColor, textDecoration: 'underline', wordBreak: 'break-all' },
          },
          token.text,
        )
      default:
        return React.createElement(React.Fragment, { key }, token.value)
    }
  })
}
