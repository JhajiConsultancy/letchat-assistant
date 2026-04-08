import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { CatalogueItem, getCatalogueItemDownloadUrl, listCatalogueItems } from '../../api/client'
import { ChatWidgetConfig } from './types'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function FileIcon({ fileType, color }: { fileType: string; color: string }) {
  const t = fileType?.toLowerCase() ?? ''
  if (t.includes('video') || t.includes('mp4') || t.includes('mov'))
    return <PlayCircleOutlineRoundedIcon sx={{ fontSize: 28, color }} />
  if (t.includes('pdf'))
    return <PictureAsPdfOutlinedIcon sx={{ fontSize: 28, color: '#e53935' }} />
  if (t.includes('doc') || t.includes('word') || t.includes('spreadsheet') || t.includes('excel'))
    return <DescriptionOutlinedIcon sx={{ fontSize: 28, color: '#1976d2' }} />
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 28, color }} />
}

// ─── types ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  assistantId: string
  config: ChatWidgetConfig
}

// ─── component ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Catalogues', value: 'catalogue' },
  { label: 'Guides', value: 'guide' },
  { label: 'Compliance', value: 'compliance' },
]

export default function CatalogueDrawer({ open, onClose, assistantId, config }: Props) {
  const [items, setItems] = useState<CatalogueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const primary = config.theme.primary_color
  const accent = config.theme.accent_color
  const isDark = config.theme.mode === 'dark'
  const gradient = `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
  const drawerBg = isDark ? '#0f0f1e' : '#f8f8fc'
  const cardBg = isDark ? alpha('#ffffff', 0.04) : '#ffffff'
  const textColor = config.theme.text_color

  // Load items whenever drawer opens or filter changes
  useEffect(() => {
    if (!open || !assistantId) return

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setLoading(true)
      listCatalogueItems(assistantId, {
        category: activeCategory || undefined,
        search: search || undefined,
        per_page: 50,
      })
        .then((res) => setItems(res.items))
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assistantId, activeCategory, search])

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setSearch('')
      setActiveCategory('')
      setSelectedIds(new Set())
    }
  }, [open])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function downloadItem(item: CatalogueItem, e: React.MouseEvent) {
    e.stopPropagation()
    setDownloadingId(item.item_id)
    try {
      const withUrl = await getCatalogueItemDownloadUrl(assistantId, item.item_id)
      const link = document.createElement('a')
      link.href = withUrl.download_url
      link.download = item.file_name || item.name
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setDownloadingId(null)
    }
  }

  async function downloadSelected() {
    const toDownload = items.filter((it) => selectedIds.has(it.item_id))
    for (const item of toDownload) {
      setDownloadingId(item.item_id)
      try {
        const withUrl = await getCatalogueItemDownloadUrl(assistantId, item.item_id)
        const link = document.createElement('a')
        link.href = withUrl.download_url
        link.download = item.file_name || item.name
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        // Small delay between multiple downloads
        await new Promise((resolve) => setTimeout(resolve, 400))
      } catch { /* skip failed items */ } finally {
        setDownloadingId(null)
      }
    }
  }

  const drawerTitle = config.catalogue_drawer_title || 'Resource Library'
  const hasSelected = selectedIds.size > 0

  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: alpha('#000', 0.5),
          zIndex: 28,
          backdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Drawer */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '92%',
          maxWidth: 420,
          zIndex: 29,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderLeft: `1px solid ${alpha(primary, 0.25)}`,
          bgcolor: drawerBg,
        }}
      >
        {/* ── Header ── */}
        <Box sx={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: gradient,
              opacity: 0.92,
            }}
          />
          {/* decorative circles */}
          <Box sx={{ position: 'absolute', top: -18, right: -18, width: 80, height: 80, borderRadius: '50%', bgcolor: alpha('#fff', 0.07) }} />
          <Box sx={{ position: 'absolute', bottom: -12, left: -10, width: 55, height: 55, borderRadius: '50%', bgcolor: alpha('#fff', 0.05) }} />

          <Box sx={{ position: 'relative', px: 2, pt: 1.75, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {/* Book icon */}
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: alpha('#fff', 0.2),
                backdropFilter: 'blur(4px)',
                border: `1px solid ${alpha('#fff', 0.3)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: 16 }}>📚</Typography>
            </Box>

            <Typography
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '1rem',
                flex: 1,
                lineHeight: 1.2,
              }}
            >
              {drawerTitle}
            </Typography>

            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: '#fff',
                bgcolor: alpha('#fff', 0.15),
                backdropFilter: 'blur(4px)',
                border: `1px solid ${alpha('#fff', 0.2)}`,
                p: 0.5,
                '&:hover': { bgcolor: alpha('#fff', 0.28) },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* ── Search ── */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search catalogues semantically…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: alpha(textColor, 0.4) }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.04),
                borderRadius: 3,
                fontSize: '0.82rem',
                '& fieldset': { borderColor: alpha(primary, 0.2) },
                '&:hover fieldset': { borderColor: alpha(primary, 0.4) },
                '&.Mui-focused fieldset': { borderColor: alpha(primary, 0.7) },
              },
              '& input': { color: textColor, py: 0.9 },
            }}
          />
        </Box>

        {/* ── Category filter pills ── */}
        <Box
          sx={{
            px: 2,
            pb: 1,
            flexShrink: 0,
            display: 'flex',
            gap: 0.75,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.value}
              label={cat.label}
              size="small"
              onClick={() => setActiveCategory(cat.value)}
              sx={{
                flexShrink: 0,
                fontSize: '0.75rem',
                fontWeight: activeCategory === cat.value ? 700 : 400,
                bgcolor:
                  activeCategory === cat.value
                    ? primary
                    : isDark
                    ? alpha('#fff', 0.07)
                    : alpha('#000', 0.06),
                color:
                  activeCategory === cat.value
                    ? '#fff'
                    : textColor,
                border: `1.5px solid ${activeCategory === cat.value ? primary : alpha(primary, 0.18)}`,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor:
                    activeCategory === cat.value
                      ? primary
                      : alpha(primary, 0.12),
                },
              }}
            />
          ))}
        </Box>

        {/* ── Items list ── */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 2,
            pb: hasSelected ? 0 : 2,
            scrollbarWidth: 'thin',
          }}
        >
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
              <CircularProgress size={28} sx={{ color: primary }} />
            </Box>
          )}

          {!loading && items && items.length === 0 && (
            <Box sx={{ textAlign: 'center', pt: 6 }}>
              <Typography sx={{ fontSize: '0.85rem', color: alpha(textColor, 0.45), fontStyle: 'italic' }}>
                No items found
              </Typography>
            </Box>
          )}

          {!loading && items &&
            items.map((item) => {
              const isSelected = selectedIds.has(item.item_id)
              return (
                <Box
                  key={item.item_id}
                  onClick={() => toggleSelect(item.item_id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.25,
                    px: 1.5,
                    py: 1.25,
                    mb: 1,
                    borderRadius: 2.5,
                    border: `1.5px solid ${isSelected ? alpha(primary, 0.6) : alpha(primary, 0.12)}`,
                    bgcolor: isSelected ? alpha(primary, 0.07) : cardBg,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    '&:hover': {
                      border: `1.5px solid ${alpha(primary, 0.4)}`,
                      bgcolor: isSelected ? alpha(primary, 0.1) : alpha(primary, 0.04),
                    },
                  }}
                >
                  {/* File icon */}
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: isDark ? alpha('#fff', 0.06) : alpha(primary, 0.07),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileIcon fileType={item.file_type} color={primary} />
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        color: textColor,
                        lineHeight: 1.3,
                        mb: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name || item.file_name}
                    </Typography>
                    {item.description && (
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          color: alpha(textColor, 0.58),
                          lineHeight: 1.4,
                          mb: 0.4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.description}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.65rem', color: alpha(textColor, 0.38) }}>
                      {formatBytes(item.file_size_bytes)}
                    </Typography>
                  </Box>

                  {/* Per-item download */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={(e) => void downloadItem(item, e)}
                        disabled={downloadingId === item.item_id}
                        sx={{
                          p: 0.6,
                          color: alpha(textColor, 0.5),
                          '&:hover': { color: primary },
                        }}
                      >
                        {downloadingId === item.item_id ? (
                          <CircularProgress size={14} sx={{ color: primary }} />
                        ) : (
                          <DownloadRoundedIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                    {item.category_label && (
                      <Typography
                        sx={{
                          fontSize: '0.6rem',
                          color: alpha(primary, 0.75),
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.6,
                        }}
                      >
                        {item.category_label}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.58rem', color: alpha(textColor, 0.28), fontStyle: 'italic' }}>
                      VIEW DETAILS &gt;
                    </Typography>
                  </Box>
                </Box>
              )
            })}
        </Box>

        {/* ── Download All Selected ── */}
        {hasSelected && (
          <Box
            sx={{
              flexShrink: 0,
              px: 2,
              py: 1.5,
              borderTop: `1px solid ${alpha(primary, 0.14)}`,
            }}
          >
            <Box
              onClick={() => void downloadSelected()}
              sx={{
                background: gradient,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 1.25,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'filter 0.18s ease',
                '&:hover': { filter: 'brightness(1.1)' },
                '&:active': { filter: 'brightness(0.95)' },
              }}
            >
              <DownloadRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>
                Download All Selected ({selectedIds.size})
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mt: 0.75,
              }}
            >
              <Typography sx={{ fontSize: '0.62rem', color: alpha(textColor, 0.38) }}>
                🔗 Access Portal for more legacy files
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </>
  )
}
