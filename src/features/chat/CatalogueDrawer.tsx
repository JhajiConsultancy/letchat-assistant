import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Search,
  Video,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { CatalogueItem, getCatalogueItemDownloadUrl, listCatalogueItems } from '../../api/client'
import { ChatWidgetConfig } from './types'

// ─── Module-level cache ───────────────────────────────────────────────────────
// Once a page is fetched it is never re-fetched — only new page numbers hit the API.
const PAGE_CACHE = new Map<string, CatalogueItem[]>()
const META_CACHE = new Map<string, { total: number; pages: number }>()

const PER_PAGE = 20

function pageCacheKey(assistantId: string, page: number) {
  return `${assistantId}:${page}`
}

// ─── File-type helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

type FileGroup = 'image' | 'video' | 'pdf' | 'spreadsheet' | 'document' | 'other'

function getFileGroup(fileType: string): FileGroup {
  const t = (fileType ?? '').toLowerCase()
  if (t.includes('image') || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(t)) return 'image'
  if (t.includes('video') || /\.(mp4|mov|avi|webm|mkv)$/.test(t)) return 'video'
  if (t.includes('pdf')) return 'pdf'
  if (/spreadsheet|excel|csv|\.xlsx?$|\.csv$/.test(t)) return 'spreadsheet'
  if (/doc|word|text|\.docx?$|\.txt$|\.rtf$/.test(t)) return 'document'
  return 'other'
}

function FileGroupIcon({ group, className }: { group: FileGroup; className?: string }) {
  const cls = cn('shrink-0', className)
  switch (group) {
    case 'image': return <ImageIcon className={cls} />
    case 'video': return <Video className={cls} />
    case 'pdf': return <FileText className={cls} />
    case 'spreadsheet': return <FileSpreadsheet className={cls} />
    default: return <File className={cls} />
  }
}

const GROUP_COLOR: Record<FileGroup, string> = {
  image: 'text-violet-400',
  video: 'text-blue-400',
  pdf: 'text-red-400',
  spreadsheet: 'text-emerald-400',
  document: 'text-sky-400',
  other: 'text-slate-400',
}

const GROUP_BG: Record<FileGroup, string> = {
  image: 'bg-violet-500/10',
  video: 'bg-blue-500/10',
  pdf: 'bg-red-500/10',
  spreadsheet: 'bg-emerald-500/10',
  document: 'bg-sky-500/10',
  other: 'bg-slate-500/10',
}

const CDN_BASE = 'https://d1m58b6plb7jl0.cloudfront.net'

/**
 * Build a CDN URL from an s3_key.
 * Strips the leading `/catalogue/` prefix used in storage so the resulting
 * path matches the CloudFront distribution structure.
 * e.g. "/catalogue/abc/xyz/image.jpg"  →  "https://…/abc/xyz/image.jpg"
 */
function buildCdnUrl(s3Key: string): string {
  const stripped = s3Key.replace(/^\/?catalogue\//, '')
  return `${CDN_BASE}/${stripped}`
}

/** Return a preview image URL — meta fields take precedence, then CDN from s3_key for image file types */
function getPreviewUrl(item: CatalogueItem): string | null {
  const meta = item.meta as Record<string, unknown> | null
  if (typeof meta?.preview_url === 'string' && meta.preview_url) return meta.preview_url
  if (typeof meta?.thumbnail_url === 'string' && meta.thumbnail_url) return meta.thumbnail_url
  // For image file types, derive URL directly from s3_key via CDN — no signed URL needed
  if (item.s3_key && getFileGroup(item.file_type) === 'image') {
    return buildCdnUrl(item.s3_key)
  }
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  assistantId: string
  config: ChatWidgetConfig
}

interface CategoryOption {
  label: string
  value: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CatalogueDrawer({ open, onClose, assistantId, config }: Props) {
  // ── server data ──
  const [pageItems, setPageItems] = useState<CatalogueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // ── client-side filter state (never triggers API) ──
  const [searchInput, setSearchInput] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('__all__')

  // ── selection / download ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const pageChangeRef = useRef(false) // suppress the loadPage effect on first mount

  const primary = config.theme.primary_color
  const accent = config.theme.accent_color
  const isDark = config.theme.mode === 'dark'
  const gradient = `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
  const drawerTitle = config.catalogue_drawer_title || 'Resource Library'

  // ─── Fetch or serve from cache ────────────────────────────────────────────
  const loadPage = useCallback(async (page: number) => {
    if (!assistantId) return
    const key = pageCacheKey(assistantId, page)

    if (PAGE_CACHE.has(key)) {
      setPageItems(PAGE_CACHE.get(key)!)
      const meta = META_CACHE.get(assistantId)
      if (meta) setTotalPages(meta.pages)
      return
    }

    setLoading(true)
    try {
      const res = await listCatalogueItems(assistantId, { page, per_page: PER_PAGE })
      PAGE_CACHE.set(key, res.items)
      META_CACHE.set(assistantId, { total: res.total, pages: res.pages })
      setPageItems(res.items)
      setTotalPages(res.pages)
    } catch {
      setPageItems([])
    } finally {
      setLoading(false)
    }
  }, [assistantId])

  // Load page 1 when drawer opens
  useEffect(() => {
    if (!open || !assistantId) return
    pageChangeRef.current = false
    void loadPage(1)
    setCurrentPage(1)
  }, [open, assistantId, loadPage])

  // Only re-fetch when the user explicitly changes the page (not on initial open)
  useEffect(() => {
    if (!pageChangeRef.current) return
    void loadPage(currentPage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setSearchInput('')
      setActiveCategory('__all__')
      setSelectedIds(new Set())
    }
  }, [open])

  // ─── Derive category chips from loaded items ──────────────────────────────
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const seen = new Map<string, string>()
    pageItems.forEach((it) => {
      if (it.category && it.category_label && !seen.has(it.category)) {
        seen.set(it.category, it.category_label)
      }
    })
    const out: CategoryOption[] = [{ label: 'All', value: '__all__' }]
    seen.forEach((label, value) => out.push({ label, value }))
    return out
  }, [pageItems])

  // ─── Client-side filter (search + category) ───────────────────────────────
  const filteredItems = useMemo(() => {
    let list = pageItems
    if (activeCategory !== '__all__') {
      list = list.filter((it) => it.category === activeCategory)
    }
    const q = searchInput.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (it) =>
          (it.name ?? '').toLowerCase().includes(q) ||
          (it.description ?? '').toLowerCase().includes(q) ||
          (it.file_name ?? '').toLowerCase().includes(q) ||
          (it.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    }
    return list
  }, [pageItems, activeCategory, searchInput])

  // ─── Partition: image-preview cards vs list rows ──────────────────────────
  const { imageItems, listItems } = useMemo(() => {
    const imgs: CatalogueItem[] = []
    const list: CatalogueItem[] = []
    filteredItems.forEach((it) => {
      if (getPreviewUrl(it)) imgs.push(it)
      else list.push(it)
    })
    return { imageItems: imgs, listItems: list }
  }, [filteredItems])

  // ─── Selection ────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Download ─────────────────────────────────────────────────────────────
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

  async function downloadAllSelected() {
    const toDownload = filteredItems.filter((it) => selectedIds.has(it.item_id))
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
        await new Promise((r) => setTimeout(r, 350))
      } catch { /* skip */ } finally {
        setDownloadingId(null)
      }
    }
  }

  const hasSelected = selectedIds.size > 0

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 z-[28] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sliding panel */}
      <div
        className={cn(
          'absolute top-0 right-0 bottom-0 z-[29]',
          'w-[92%] max-w-[420px]',
          'flex flex-col overflow-hidden',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isDark ? 'bg-[#0f0f1e]' : 'bg-[#f8f8fc]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ borderLeft: `1px solid ${primary}30` }}
      >
        {/* ── Gradient header ── */}
        <div className="relative overflow-hidden shrink-0" style={{ background: gradient }}>
          <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full bg-white/[0.04]" />
          <div className="relative flex items-center gap-2.5 px-4 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/20 border border-white/25 text-base shrink-0 select-none">
              📚
            </div>
            <span className="flex-1 text-white font-bold text-[0.93rem] leading-tight">
              {drawerTitle}
            </span>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Search box ── */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-muted-foreground" />
            <Input
              className={cn(
                'pl-8 h-8 text-[0.8rem] rounded-xl border-0 ring-1 focus-visible:ring-2 transition-all',
                isDark
                  ? 'bg-white/[0.06] ring-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/30'
                  : 'bg-black/[0.04] ring-black/10 placeholder:text-black/35 focus-visible:ring-black/20',
              )}
              placeholder="Search catalogues semantically…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* ── Dynamic category chips ── */}
        {categoryOptions.length > 1 && (
          <div className="px-3 pb-2 shrink-0 flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {categoryOptions.map((cat) => {
              const active = activeCategory === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={cn(
                    'shrink-0 px-2.5 py-[3px] rounded-full text-[0.7rem] font-medium border transition-all whitespace-nowrap',
                    !active && isDark && 'bg-white/[0.06] border-white/10 text-white/65 hover:bg-white/[0.12]',
                    !active && !isDark && 'bg-black/[0.05] border-black/10 text-black/55 hover:bg-black/[0.09]',
                  )}
                  style={active ? { background: primary, borderColor: primary, color: '#fff' } : undefined}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        )}

        <Separator className={isDark ? 'bg-white/[0.08]' : 'bg-black/[0.07]'} />

        {/* ── Scrollable content ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className={cn('px-3 pb-3 pt-2.5')}>

            {/* Loading skeleton */}
            {loading && (
              <div className="flex flex-col gap-2.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn('h-[62px] rounded-xl animate-pulse', isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]')}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <File className={cn('w-8 h-8', isDark ? 'text-white/20' : 'text-black/20')} />
                <p className={cn('text-[0.78rem]', isDark ? 'text-white/35' : 'text-black/35')}>
                  No items found
                </p>
              </div>
            )}

            {!loading && filteredItems.length > 0 && (
              <>
                {/* ── Image product grid ── */}
                {imageItems.length > 0 && (
                  <section className="mb-3">
                    <p className={cn('text-[0.62rem] font-bold uppercase tracking-widest mb-2 pl-0.5', isDark ? 'text-white/30' : 'text-black/30')}>
                      Preview
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {imageItems.map((item) => {
                        const imgUrl = getPreviewUrl(item)!
                        const isSelected = selectedIds.has(item.item_id)
                        return (
                          <Card
                            key={item.item_id}
                            onClick={() => toggleSelect(item.item_id)}
                            className={cn(
                              'overflow-hidden cursor-pointer border-0 shadow-none transition-all duration-150',
                              isDark ? 'bg-white/[0.04]' : 'bg-white',
                              'ring-1',
                              isSelected
                                ? 'ring-2 shadow-md'
                                : isDark ? 'ring-white/[0.1] hover:ring-white/[0.22]' : 'ring-black/[0.08] hover:ring-black/[0.16]',
                            )}
                            style={isSelected ? { '--tw-ring-color': primary, boxShadow: `0 0 0 2px ${primary}` } as React.CSSProperties : undefined}
                          >
                            {/* Image preview */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                              <img
                                src={imgUrl}
                                alt={item.name}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                              {/* Category badge overlay */}
                              {item.category_label && (
                                <Badge
                                  className="absolute top-1.5 left-1.5 h-4 text-[0.55rem] px-1.5 rounded-full bg-black/50 text-white border-0 backdrop-blur-sm font-semibold"
                                >
                                  {item.category_label}
                                </Badge>
                              )}
                            </div>
                            <CardContent className="px-2 pt-1.5 pb-2">
                              <p className={cn('text-[0.73rem] font-semibold leading-tight truncate mb-1', isDark ? 'text-white' : 'text-gray-900')}>
                                {item.name || item.file_name}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className={cn('text-[0.6rem]', isDark ? 'text-white/35' : 'text-black/35')}>
                                  {formatBytes(item.file_size_bytes)}
                                </span>
                                <button
                                  onClick={(e) => void downloadItem(item, e)}
                                  disabled={downloadingId === item.item_id}
                                  className={cn(
                                    'flex items-center justify-center w-5 h-5 rounded transition-colors',
                                    isDark ? 'hover:bg-white/10 text-white/45' : 'hover:bg-black/8 text-black/40',
                                  )}
                                >
                                  {downloadingId === item.item_id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Download className="w-3 h-3" />
                                  }
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* Section divider */}
                {imageItems.length > 0 && listItems.length > 0 && (
                  <Separator className={cn('mb-3', isDark ? 'bg-white/[0.08]' : 'bg-black/[0.07]')} />
                )}

                {/* ── File list rows (grouped by file type) ── */}
                {listItems.length > 0 && (
                  <section className="flex flex-col gap-1.5">
                    {listItems.map((item) => {
                      const group = getFileGroup(item.file_type)
                      const isSelected = selectedIds.has(item.item_id)
                      return (
                        <div
                          key={item.item_id}
                          onClick={() => toggleSelect(item.item_id)}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2 rounded-xl border cursor-pointer transition-all duration-150 select-none',
                            isDark
                              ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.16]'
                              : 'bg-white border-black/[0.07] hover:bg-gray-50 hover:border-black/[0.14]',
                          )}
                          style={isSelected ? { boxShadow: `0 0 0 1.5px ${primary}` } : undefined}
                        >
                          {/* File type icon */}
                          <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', GROUP_BG[group])}>
                            <FileGroupIcon group={group} className={cn('w-[18px] h-[18px]', GROUP_COLOR[group])} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-[0.77rem] font-semibold leading-tight truncate', isDark ? 'text-white' : 'text-gray-900')}>
                              {item.name || item.file_name}
                            </p>
                            {item.description && (
                              <p className={cn('text-[0.67rem] leading-snug mt-[2px] line-clamp-1', isDark ? 'text-white/45' : 'text-black/45')}>
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-[3px] flex-wrap">
                              {item.category_label && (
                                <Badge
                                  className={cn(
                                    'h-[14px] text-[0.56rem] px-1.5 rounded-full border-0 font-semibold',
                                    isDark ? 'bg-white/[0.09] text-white/55' : 'bg-black/[0.07] text-black/50',
                                  )}
                                >
                                  {item.category_label}
                                </Badge>
                              )}
                              <span className={cn('text-[0.6rem]', isDark ? 'text-white/28' : 'text-black/28')}>
                                {formatBytes(item.file_size_bytes)}
                              </span>
                            </div>
                          </div>

                          {/* Download icon */}
                          <button
                            onClick={(e) => void downloadItem(item, e)}
                            disabled={downloadingId === item.item_id}
                            className={cn(
                              'flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors',
                              isDark
                                ? 'text-white/35 hover:text-white/80 hover:bg-white/[0.1]'
                                : 'text-black/30 hover:text-black/70 hover:bg-black/[0.07]',
                            )}
                          >
                            {downloadingId === item.item_id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Download className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      )
                    })}
                  </section>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* ── Pagination (only API calls happen here) ── */}
        {totalPages > 1 && !loading && (
          <div className={cn(
            'shrink-0 px-3 py-2 flex items-center justify-between gap-2',
            isDark ? 'border-t border-white/[0.08]' : 'border-t border-black/[0.07]',
          )}>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => { pageChangeRef.current = true; setCurrentPage((p) => Math.max(1, p - 1)) }}
              className={cn('h-7 text-[0.73rem] px-2.5', isDark ? 'text-white/55 hover:text-white hover:bg-white/10' : '')}
            >
              ← Prev
            </Button>
            <span className={cn('text-[0.7rem] tabular-nums', isDark ? 'text-white/40' : 'text-black/40')}>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => { pageChangeRef.current = true; setCurrentPage((p) => Math.min(totalPages, p + 1)) }}
              className={cn('h-7 text-[0.73rem] px-2.5', isDark ? 'text-white/55 hover:text-white hover:bg-white/10' : '')}
            >
              Next →
            </Button>
          </div>
        )}

        {/* ── Download all selected ── */}
        {hasSelected && (
          <div className={cn(
            'shrink-0 px-3 py-2.5',
            isDark ? 'border-t border-white/[0.08]' : 'border-t border-black/[0.07]',
          )}>
            <button
              onClick={() => void downloadAllSelected()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-[0.82rem] transition-all hover:brightness-110 active:brightness-95"
              style={{ background: gradient }}
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              Download All Selected ({selectedIds.size})
            </button>
            <p className={cn('text-center text-[0.58rem] mt-1.5', isDark ? 'text-white/22' : 'text-black/28')}>
              🔗 Access Portal for more legacy files
            </p>
          </div>
        )}
      </div>
    </>
  )
}
