'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Using native img with lazy loading instead of Avatar to prevent server overload
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import { useState, useMemo } from 'react'

interface Philosopher {
  id: string
  nameCn: string
  nameEn: string
  slug: string
  era: string
  category: string
  tagline: string
  avatarUrl: string
  isHost: boolean
}

const categoryColors: Record<string, string> = {
  '情绪类': 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border-[var(--badge-amber-border)]',
  '关系类': 'bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] border-[var(--badge-rose-border)]',
  '选择类': 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border-[var(--badge-emerald-border)]',
  '意义类': 'bg-[var(--badge-violet-bg)] text-[var(--badge-violet-text)] border-[var(--badge-violet-border)]',
  '综合类': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
}

const categoryTabs = ['全部', '情绪类', '关系类', '选择类', '意义类', '综合类']
const eraTabs = ['全部', '古典', '中世纪', '近代', '当代']

const ITEMS_PER_PAGE = 24

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function PhilosopherGrid() {
  const { categoryFilter, eraFilter, setCategoryFilter, setEraFilter, selectPhilosopher } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const { data: philosophers = [], isLoading, error } = useQuery<Philosopher[]>({
    queryKey: ['philosophers'],
    queryFn: () => fetch('/api/philosophers').then(res => res.json()),
  })

  // Filter philosophers
  const filtered = useMemo(() => {
    return philosophers.filter((p) => {
      if (p.isHost) return false
      if (categoryFilter && p.category !== categoryFilter) return false
      if (eraFilter && p.era !== eraFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          p.nameCn.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [philosophers, categoryFilter, eraFilter, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat === '全部' ? null : cat)
    setCurrentPage(1)
  }

  const handleEraChange = (era: string) => {
    setEraFilter(era === '全部' ? null : era)
    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  return (
    <section id="philosopher-grid" className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2
            className="text-2xl md:text-3xl font-serif font-bold text-[var(--app-text-primary)] mb-2"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            思想者长廊
          </h2>
          <p className="text-[var(--app-text-muted)]">
            {filtered.length} 位哲学家 · 选择一位，聆听穿越时空的智慧
          </p>
        </motion.div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--app-text-muted)]" />
            <Input
              type="text"
              placeholder="搜索哲学家、思想关键词..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-[var(--app-bg-card)] border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-full min-h-[44px]"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[36px] ${
                  (cat === '全部' ? !categoryFilter : categoryFilter === cat)
                    ? 'bg-[var(--app-accent)] text-white shadow-md'
                    : 'bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:bg-[var(--app-border)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Era filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            {eraTabs.map((era) => (
              <button
                key={era}
                onClick={() => handleEraChange(era)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[36px] ${
                  (era === '全部' ? !eraFilter : eraFilter === era)
                    ? 'bg-[var(--app-text-primary)] text-white shadow-md'
                    : 'bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] hover:bg-[var(--app-border)]'
                }`}
              >
                {era}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-[var(--app-accent)]" />
            <span className="ml-3 text-[var(--app-text-muted)]">正在加载思想家...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-20 text-[var(--app-text-muted)]">
            <p>加载失败，请刷新重试</p>
          </div>
        )}

        {/* Philosopher cards grid */}
        {!isLoading && !error && (
          <>
            <motion.div
              key={`${categoryFilter}-${eraFilter}-${searchQuery}-${currentPage}`}
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {paginated.map((p) => (
                <div key={p.id}>
                  <Card
                    className="group cursor-pointer bg-[var(--app-bg-card)]/60 border-[var(--app-border)] hover:border-[var(--app-accent)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    onClick={() => selectPhilosopher(p.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPhilosopher(p.id) } }}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      {/* Avatar with lazy loading */}
                      <div className="size-16 rounded-full border-2 border-[var(--app-avatar-border)] bg-[var(--app-bg)] shrink-0 mb-3 overflow-hidden flex items-center justify-center">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.nameCn}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full items-center justify-center bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif font-bold text-lg"
                          style={{ display: p.avatarUrl ? 'none' : 'flex' }}
                        >
                          {p.nameCn.charAt(0)}
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="font-serif font-bold text-[var(--app-text-primary)] text-sm leading-tight mb-1 line-clamp-1" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                        {p.nameCn}
                      </h3>
                      <p className="text-[10px] text-[var(--app-text-muted)] truncate mb-2">{p.nameEn}</p>

                      {/* Category and Era badges */}
                      <div className="flex items-center gap-1 flex-wrap justify-center">
                        <Badge className={`${categoryColors[p.category] || ''} text-[10px] border px-1.5 py-0`}>
                          {p.category}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-[var(--app-avatar-border)] text-[var(--app-text-muted)] px-1.5 py-0">
                          {p.era}
                        </Badge>
                      </div>

                      {/* Tagline on hover */}
                      <p className="text-[10px] text-[var(--app-text-secondary)] mt-2 line-clamp-2 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-16 transition-all duration-300 leading-relaxed">
                        {p.tagline}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-[var(--app-bg-card)] border border-[var(--app-border)] disabled:opacity-30 hover:bg-[var(--app-border)] transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (currentPage <= 4) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        currentPage === page
                          ? 'bg-[var(--app-accent)] text-white shadow-md'
                          : 'bg-[var(--app-bg-card)] border border-[var(--app-border)] text-[var(--app-text-secondary)] hover:bg-[var(--app-border)]'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-[var(--app-bg-card)] border border-[var(--app-border)] disabled:opacity-30 hover:bg-[var(--app-border)] transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>

                <span className="text-xs text-[var(--app-text-muted)] ml-2">
                  第 {currentPage}/{totalPages} 页 · 共 {filtered.length} 位
                </span>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-[var(--app-text-muted)]">
            <p>未找到符合条件的哲学家</p>
            <p className="text-sm mt-2">试试更换筛选条件或搜索关键词</p>
          </div>
        )}
      </div>
    </section>
  )
}
