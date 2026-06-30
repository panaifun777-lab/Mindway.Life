'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Lock,
  Coins,
  Loader2,
  Eye,
  Sparkles,
  Crown,
  Tag,
  Clock,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import ThemeToggle from '@/components/theme-toggle'

interface ArticleItem {
  id: string
  title: string
  summary: string
  coverImage: string
  price: number
  category: string
  tags: string
  viewCount: number
  likeCount: number
  philosopherId: string | null
  createdAt: string
}

interface ArticleDetail extends ArticleItem {
  content: string
  previewLength: number
  totalLength: number
  locked: boolean
  purchased: boolean
  isPro: boolean
  authorId: string
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

function parseTags(tags: string): string[] {
  if (!tags) return []
  return tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export default function ArticleList() {
  const { setView, user } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [category, setCategory] = useState<string>('')

  const { data: listData, isLoading } = useQuery({
    queryKey: ['articles', category],
    queryFn: async () => {
      const url = new URL('/api/articles', window.location.origin)
      if (category) url.searchParams.set('category', category)
      url.searchParams.set('pageSize', '30')
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('加载失败')
      return res.json()
    },
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['article', selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/articles/${selectedId}`)
      if (!res.ok) throw new Error('加载失败')
      return res.json()
    },
    enabled: !!selectedId,
  })

  const items: ArticleItem[] = listData?.items ?? []
  const purchasedIds: string[] = listData?.purchasedIds ?? []
  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean))
  )

  const handleOpen = (id: string) => {
    setSelectedId(id)
  }

  const handleClose = () => {
    setSelectedId(null)
  }

  const handlePurchase = async () => {
    if (!user) {
      setView('login')
      return
    }
    if (!selectedId) return
    setPurchasing(true)
    try {
      const res = await fetch(`/api/articles/${selectedId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: '购买失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: '解锁成功',
        description: data.message,
      })
      queryClient.invalidateQueries({ queryKey: ['article', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
    } catch {
      toast({
        title: '网络错误',
        description: '请检查网络后重试',
        variant: 'destructive',
      })
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[var(--app-bg)]"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--app-header-bg)] backdrop-blur-sm border-b border-[var(--app-border)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('home')}
            className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)]"
          >
            <ArrowLeft className="size-4 mr-1" />
            返回
          </Button>
          <h1
            className="font-serif font-bold text-[var(--app-text-primary)] text-base"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            深度专栏
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Intro */}
        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center py-4"
        >
          <div className="size-12 mx-auto rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center mb-3">
            <BookOpen className="size-6 text-[var(--app-accent)]" />
          </div>
          <h2
            className="text-2xl font-serif font-bold text-[var(--app-text-primary)] mb-2"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            哲学家的私密笔记
          </h2>
          <p className="text-sm text-[var(--app-text-secondary)] max-w-xl mx-auto">
            120 位思想者的人生答卷。免费阅读摘要，Token 解锁全文。
          </p>
        </motion.section>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              size="sm"
              variant={!category ? 'default' : 'outline'}
              onClick={() => setCategory('')}
              className={`h-8 rounded-full ${
                !category
                  ? 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)]'
                  : 'border-[var(--app-border)] text-[var(--app-text-secondary)]'
              }`}
            >
              全部
            </Button>
            {categories.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={category === c ? 'default' : 'outline'}
                onClick={() => setCategory(c)}
                className={`h-8 rounded-full ${
                  category === c
                    ? 'bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent-hover)]'
                    : 'border-[var(--app-border)] text-[var(--app-text-secondary)]'
                }`}
              >
                {c}
              </Button>
            ))}
          </div>
        )}

        {/* Articles Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-[var(--app-accent)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--app-text-muted)]">
            暂无专栏文章
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => {
              const purchased = purchasedIds.includes(item.id)
              const isFree = item.price === 0
              return (
                <motion.div
                  key={item.id}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  whileHover={{ y: -2 }}
                  onClick={() => handleOpen(item.id)}
                  className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[var(--app-accent)]/40 hover:shadow-md"
                >
                  <div className="flex gap-4 p-4">
                    {item.coverImage ? (
                      <img
                        src={item.coverImage}
                        alt=""
                        className="size-20 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-20 rounded-xl bg-[var(--app-accent)]/10 flex items-center justify-center shrink-0">
                        <BookOpen className="size-8 text-[var(--app-accent)]/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h3
                          className="font-serif font-bold text-[var(--app-text-primary)] line-clamp-2 flex-1"
                          style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                        >
                          {item.title}
                        </h3>
                        {purchased && (
                          <Badge
                            variant="outline"
                            className="border-green-500/40 text-green-600 shrink-0"
                          >
                            已购
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--app-text-secondary)] line-clamp-2 mb-2">
                        {item.summary}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--app-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" />
                          {item.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDate(item.createdAt)}
                        </span>
                        {!isFree && !purchased && (
                          <span className="flex items-center gap-1 text-[var(--app-accent)] font-medium">
                            <Coins className="size-3" />
                            {item.price}
                          </span>
                        )}
                        {isFree && (
                          <span className="text-green-600 font-medium">免费</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--app-border)]">
                <h3
                  className="font-serif font-bold text-[var(--app-text-primary)] truncate"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                >
                  {detailLoading ? '加载中...' : detail?.title}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="size-8 shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {detailLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="size-8 animate-spin text-[var(--app-accent)]" />
                  </div>
                ) : detail ? (
                  <ArticleContent
                    detail={detail}
                    purchasing={purchasing}
                    onPurchase={handlePurchase}
                    onLoginPrompt={() => setView('login')}
                    isLoggedIn={!!user}
                  />
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================
// 文章内容子组件
// ============================================================
function ArticleContent({
  detail,
  purchasing,
  onPurchase,
  onLoginPrompt,
  isLoggedIn,
}: {
  detail: ArticleDetail
  purchasing: boolean
  onPurchase: () => void
  onLoginPrompt: () => void
  isLoggedIn: boolean
}) {
  const tags = parseTags(detail.tags)
  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-muted)]">
        <Badge
          variant="outline"
          className="border-[var(--app-accent)]/30 text-[var(--app-accent)]"
        >
          <Tag className="size-3 mr-1" />
          {detail.category}
        </Badge>
        {tags.slice(0, 3).map((t) => (
          <span key={t} className="px-2 py-0.5 bg-[var(--app-bg)] rounded">
            #{t}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <Eye className="size-3" />
          {detail.viewCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatDate(detail.createdAt)}
        </span>
      </div>

      {/* Summary */}
      {detail.summary && (
        <div className="bg-[var(--app-accent)]/5 border-l-2 border-[var(--app-accent)]/40 pl-4 py-2">
          <p className="text-sm text-[var(--app-text-secondary)] italic leading-relaxed">
            {detail.summary}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="prose prose-sm max-w-none">
        <div className="text-[var(--app-text-primary)] whitespace-pre-wrap leading-relaxed text-sm">
          {detail.content}
          {detail.locked && (
            <span className="text-[var(--app-text-muted)]">...</span>
          )}
        </div>
      </div>

      {/* Locked CTA */}
      {detail.locked && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[var(--app-accent)]/15 to-transparent border border-[var(--app-accent)]/30 rounded-xl p-5 text-center"
        >
          <div className="size-12 mx-auto rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center mb-3">
            <Lock className="size-6 text-[var(--app-accent)]" />
          </div>
          <p className="text-sm font-medium text-[var(--app-text-primary)] mb-1">
            本文剩余 {detail.totalLength - detail.previewLength} 字需解锁
          </p>
          <p className="text-xs text-[var(--app-text-muted)] mb-4">
            {detail.price === 0
              ? '免费文章，登录后即可阅读全文'
              : `消耗 ${detail.price} Token 解锁全文，永久阅读`}
          </p>
          <Button
            onClick={isLoggedIn ? onPurchase : onLoginPrompt}
            disabled={purchasing}
            className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white h-10 px-6 rounded-xl"
          >
            {purchasing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : detail.price === 0 ? (
              <Sparkles className="size-4 mr-2" />
            ) : (
              <Coins className="size-4 mr-2" />
            )}
            {isLoggedIn
              ? purchasing
                ? '解锁中...'
                : detail.price === 0
                ? '免费解锁'
                : `消耗 ${detail.price} Token 解锁`
              : '登录后阅读'}
          </Button>
        </motion.div>
      )}

      {!detail.locked && detail.purchased && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 rounded-lg p-3">
          <Sparkles className="size-4" />
          <span>已解锁全文，永久阅读</span>
        </div>
      )}

      {!detail.locked && detail.isPro && (
        <div className="flex items-center gap-2 text-xs text-[var(--app-accent)] bg-[var(--app-accent)]/10 rounded-lg p-3">
          <Crown className="size-4" />
          <span>Pro / Premium 会员免费阅读</span>
        </div>
      )}
    </div>
  )
}
