import { useState } from 'react'
import {
  Box,
  InputBase,
  Popover,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','🙂','😉',
      '😋','😄','😅','🤔','🙄','😏','😢','😭','😤','😠','🥺','🤗',
      '😴','🤯','🥳','😬','😶','😐','😑','🫠','🤪','🫡','🤓','😇',
    ],
  },
  {
    label: 'Gestures',
    icon: '👋',
    emojis: [
      '👋','✋','🤚','🖐️','👌','🤌','✌️','🤞','👍','👎','✊','👊',
      '🤛','🤜','🤝','🙌','👏','🫶','🙏','💪','🫵','☝️','👆','👇',
    ],
  },
  {
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💖','💗',
      '💓','💞','💕','💟','❣️','💝','♥️','🫀','❤️‍🔥','❤️‍🩹',
    ],
  },
  {
    label: 'Symbols',
    icon: '✨',
    emojis: [
      '✨','🌟','⭐','💫','🔥','⚡','💯','✅','❌','❓','❗','💬',
      '📌','📍','🔑','💡','🎯','🏆','🥇','🎁','🎉','🎊','🎈','🆕',
      '🔔','📢','🚀','💎','🛡️','⚙️','🔧','📊','📈','🗂️','📋','💻',
    ],
  },
  {
    label: 'Nature',
    icon: '🌈',
    emojis: [
      '🌈','☀️','🌙','⛅','🌊','🌺','🌸','🌻','🌹','🌷','🌿','🍀',
      '🦋','🐝','🌍','🌱','🍃','🌾','🐶','🐱','🐼','🐨','🦁','🐬',
    ],
  },
  {
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍕','🍔','🌮','🍜','🍣','🍱','🥗','🍰','🎂','🍩','🍪','🍫',
      '☕','🧃','🥤','🍷','🥂','🍺','🧋','🍦','🍧','🍨','🫖','🥐',
    ],
  },
]

interface EmojiPickerProps {
  anchorEl: HTMLElement | null
  onClose: () => void
  onSelect: (emoji: string) => void
}

export default function EmojiPicker({ anchorEl, onClose, onSelect }: EmojiPickerProps) {
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')

  const displayEmojis = search
    ? CATEGORIES.flatMap((c) => c.emojis)
    : CATEGORIES[tab].emojis

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      PaperProps={{
        sx: {
          width: 280,
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search emoji…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setTab(0) }}
          sx={{ fontSize: '0.82rem', px: 1.5, py: 0.6, borderRadius: 2, bgcolor: 'action.hover' }}
        />
      </Box>

      {!search && (
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': { minWidth: 36, minHeight: 36, px: 0.5, fontSize: 16 },
            '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
          }}
        >
          {CATEGORIES.map((cat) => (
            <Tooltip key={cat.label} title={cat.label} placement="top">
              <Tab label={cat.icon} />
            </Tooltip>
          ))}
        </Tabs>
      )}

      {!search && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ px: 1.5, pt: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.65rem' }}
        >
          {CATEGORIES[tab].label}
        </Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 0,
          px: 0.5,
          pb: 1,
          pt: 0.5,
          maxHeight: 180,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        {displayEmojis.map((emoji, i) => (
          <Box
            key={`${emoji}-${i}`}
            component="button"
            onClick={() => { onSelect(emoji); onClose() }}
            title={emoji}
            sx={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              p: 0.5,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.2)' },
              transition: 'transform 0.1s',
            }}
          >
            {emoji}
          </Box>
        ))}
      </Box>
    </Popover>
  )
}
