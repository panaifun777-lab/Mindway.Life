'use client'

import { motion } from 'framer-motion'
import { X, MessageCircle, Swords, BookOpen, Quote, Share2, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
// ScrollArea removed - using native scroll for reliable scrolling
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

interface BookRecommendation {
  title: string
  author: string
  reason: string
}

interface Philosopher {
  id: string
  nameCn: string
  nameEn: string
  slug: string
  era: string
  category: string
  tagline: string
  quote: string
  quoteSource: string
  bioSummary: string
  coreInsight: string
  worries: string
  works: string
  recommendedBooks: string
  avatarUrl: string
}

const categoryBadgeStyles: Record<string, string> = {
  '情绪类': 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border-[var(--badge-amber-border)]',
  '关系类': 'bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] border-[var(--badge-rose-border)]',
  '选择类': 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border-[var(--badge-emerald-border)]',
  '意义类': 'bg-[var(--badge-violet-bg)] text-[var(--badge-violet-text)] border-[var(--badge-violet-border)]',
  '综合类': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
}

const categoryDotColors: Record<string, string> = {
  '情绪类': 'bg-amber-400',
  '关系类': 'bg-rose-400',
  '选择类': 'bg-emerald-400',
  '意义类': 'bg-violet-400',
  '综合类': 'bg-amber-500',
}

const categoryGradientVars: Record<string, { start: string; end: string }> = {
  '情绪类': { start: 'var(--gradient-amber)', end: 'var(--gradient-card-end)' },
  '关系类': { start: 'var(--gradient-rose)', end: 'var(--gradient-card-end)' },
  '选择类': { start: 'var(--gradient-emerald)', end: 'var(--gradient-card-end)' },
  '意义类': { start: 'var(--gradient-violet)', end: 'var(--gradient-card-end)' },
  '综合类': { start: 'var(--gradient-amber)', end: 'var(--gradient-card-end)' },
}

// Timeline config: era → { range, color }
const eraConfig: Record<string, { label: string; startYear: number; endYear: number; color: string }> = {
  '古典': { label: '古典时代', startYear: -500, endYear: 500, color: 'var(--app-accent)' },
  '中世纪': { label: '中世纪', startYear: 500, endYear: 1500, color: '#b8860b' },
  '近代': { label: '近代时期', startYear: 1500, endYear: 1900, color: 'var(--app-text-muted)' },
  '当代': { label: '当代时期', startYear: 1900, endYear: 2000, color: 'var(--app-text-secondary)' },
  '主理人': { label: '主理人', startYear: 2000, endYear: 2030, color: 'var(--app-accent)' },
}

// Staggered fade-in animation variants
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

const bookCardVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.12 * i,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
}

export default function PhilosopherDetail() {
  const { selectedPhilosopherId, setView, goHome } = useAppStore()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // First get slug from the lightweight list
  const { data: philosophers = [] } = useQuery<{id: string; slug: string}[]>({
    queryKey: ['philosophers'],
    queryFn: () => fetch('/api/philosophers').then(res => res.json()),
  })

  const selectedSlug = philosophers.find(p => p.id === selectedPhilosopherId)?.slug

  // Then load full detail from the slug-based API
  const { data: philosopher } = useQuery<Philosopher>({
    queryKey: ['philosopher', selectedSlug],
    queryFn: () => fetch(`/api/philosophers/${selectedSlug}`).then(res => res.json()),
    enabled: !!selectedSlug,
  })

  if (!philosopher) return null

  const worriesList = philosopher.worries.split(',').map(w => w.trim()).filter(Boolean)
  const worksList = philosopher.works.split(',').map(w => w.trim()).filter(Boolean)

  let recommendedBooks: BookRecommendation[] = []
  try {
    if (philosopher.recommendedBooks) {
      recommendedBooks = JSON.parse(philosopher.recommendedBooks)
    }
  } catch {
    recommendedBooks = []
  }

  const handleShare = async () => {
    const text = `「${philosopher.quote}」—— ${philosopher.nameCn}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: '已复制到剪贴板',
        description: `${philosopher.nameCn}的名言已复制，快去分享吧`,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: '复制失败',
        description: '请手动复制引用内容',
        variant: 'destructive',
      })
    }
  }

  // Timeline calculation
  const eraInfo = eraConfig[philosopher.era]
  const totalRange = 2030 - (-500)
  const eraStartPct = eraInfo ? ((eraInfo.startYear - (-500)) / totalRange) * 100 : 0
  const eraEndPct = eraInfo ? ((eraInfo.endYear - (-500)) / totalRange) * 100 : 100

  // Gradient style for top section
  const gradientVars = categoryGradientVars[philosopher.category]
  const topGradientStyle = gradientVars
    ? { backgroundImage: `linear-gradient(to bottom, ${gradientVars.start}, ${gradientVars.end})` }
    : { backgroundImage: `linear-gradient(to bottom, var(--gradient-default-start), var(--gradient-default-end))` }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'var(--app-overlay)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) goHome()
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden border flex flex-col"
        style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
      >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Close + Share button bar */}
            <div
              className="sticky top-0 z-10 flex justify-between items-center p-4 backdrop-blur-sm"
              style={{ backgroundColor: 'var(--app-header-bg)' }}
            >
              <div />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="min-h-[44px] gap-1.5"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  {copied ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                  <span className="text-xs">{copied ? '已复制' : '分享'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goHome}
                  className="min-h-[44px] min-w-[44px]"
                  style={{ color: 'var(--app-text-secondary)' }}
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            {/* Top section with gradient */}
            <motion.div
              custom={0}
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="px-6 pb-6"
              style={topGradientStyle}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <Avatar
                  className="size-28 shadow-lg mb-4"
                  style={{
                    border: '4px solid var(--app-avatar-border)',
                    backgroundColor: 'var(--app-bg)',
                  }}
                >
                  <AvatarImage src={philosopher.avatarUrl} alt={philosopher.nameCn} />
                  <AvatarFallback
                    className="font-serif font-bold text-3xl"
                    style={{
                      backgroundColor: 'var(--app-avatar-fallback-bg)',
                      color: 'var(--app-avatar-fallback-text)',
                    }}
                  >
                    {philosopher.nameCn.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2
                  className="text-2xl md:text-3xl font-serif font-bold mb-1"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                >
                  {philosopher.nameCn}
                </h2>
                <p className="text-sm mb-3 italic" style={{ color: 'var(--app-text-muted)' }}>{philosopher.nameEn}</p>
                <div className="flex items-center gap-2">
                  <Badge className={`${categoryBadgeStyles[philosopher.category] || ''} text-xs border`}>
                    {philosopher.category}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: 'var(--app-avatar-border)', color: 'var(--app-text-muted)' }}
                  >
                    {philosopher.era}
                  </Badge>
                </div>
              </div>

              {/* Quote */}
              <motion.div
                custom={1}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl p-5 relative border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-bg) 80%, transparent)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <Quote
                  className="size-8 absolute top-3 left-3"
                  style={{ color: 'var(--app-accent)', opacity: 0.2 }}
                />
                <p
                  className="text-center italic font-serif text-lg leading-relaxed pl-6 pr-6"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                >
                  &ldquo;{philosopher.quote}&rdquo;
                </p>
                {philosopher.quoteSource && (
                  <p className="text-center text-xs mt-2" style={{ color: 'var(--app-text-muted)' }}>
                    —— {philosopher.quoteSource}
                  </p>
                )}
              </motion.div>
            </motion.div>

            {/* Content section */}
            <div className="px-6 py-6 space-y-7">

              {/* Tagline */}
              <motion.div
                custom={2}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="text-center"
              >
                <p className="text-base font-medium tracking-wide" style={{ color: 'var(--app-text-secondary)' }}>
                  {philosopher.tagline}
                </p>
              </motion.div>

              <Separator style={{ backgroundColor: 'var(--app-border)' }} />

              {/* Philosophical Timeline */}
              <motion.div
                custom={3}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="size-4" style={{ color: 'var(--app-accent)' }} />
                  <h3
                    className="font-serif font-bold"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                  >
                    思想时代
                  </h3>
                </div>
                <div className="relative h-10 flex items-center">
                  {/* Full track */}
                  <div
                    className="absolute left-0 right-0 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--app-border)' }}
                  />
                  {/* Era segments */}
                  {Object.entries(eraConfig).map(([era, config]) => {
                    const startPct = ((config.startYear - (-500)) / totalRange) * 100
                    const endPct = ((config.endYear - (-500)) / totalRange) * 100
                    const isActive = era === philosopher.era
                    return (
                      <div
                        key={era}
                        className="absolute h-2 rounded-full transition-all duration-300"
                        style={{
                          left: `${startPct}%`,
                          width: `${endPct - startPct}%`,
                          backgroundColor: isActive ? config.color : 'var(--app-border)',
                          opacity: isActive ? 1 : 0.3,
                        }}
                      />
                    )
                  })}
                  {/* Current position marker */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
                    className="absolute z-10"
                    style={{ left: `${(eraStartPct + eraEndPct) / 2}%`, transform: 'translateX(-50%)' }}
                  >
                    <div
                      className={`w-5 h-5 ${categoryDotColors[philosopher.category] || ''} rounded-full shadow-md flex items-center justify-center`}
                      style={{ border: '3px solid var(--app-bg)' }}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  </motion.div>
                  {/* Era labels */}
                  <div className="absolute -bottom-0.5 left-0 right-0 flex justify-between text-[10px]" style={{ color: 'var(--app-text-muted)' }}>
                    {Object.entries(eraConfig).map(([era, config]) => {
                      const midPct = (((config.startYear + config.endYear) / 2 - (-500)) / totalRange) * 100
                      return (
                        <span
                          key={era}
                          className={`absolute ${era === philosopher.era ? 'font-bold' : ''}`}
                          style={{
                            left: `${midPct}%`,
                            transform: 'translateX(-50%)',
                            color: era === philosopher.era ? 'var(--app-text-primary)' : undefined,
                          }}
                        >
                          {era}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Bio Summary */}
              <motion.div
                custom={4}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="size-4" style={{ color: 'var(--app-accent)' }} />
                  <h3
                    className="font-serif font-bold"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                  >
                    生平简介
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--app-text-secondary)' }}>
                  {philosopher.bioSummary}
                </p>
              </motion.div>

              {/* Core Insight */}
              <motion.div
                custom={5}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl p-5 relative overflow-hidden border"
                style={{
                  background: `linear-gradient(to bottom right, color-mix(in srgb, var(--app-bg-card) 70%, transparent), color-mix(in srgb, var(--app-bg-card) 40%, transparent))`,
                  borderColor: 'var(--app-border)',
                }}
              >
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 5%, transparent)' }}
                />
                <h3
                  className="font-serif font-bold mb-2 relative"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                >
                  💡 核心洞见
                </h3>
                <p className="text-sm leading-relaxed relative" style={{ color: 'var(--app-text-secondary)' }}>
                  {philosopher.coreInsight}
                </p>
              </motion.div>

              {/* Worries */}
              <motion.div
                custom={6}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
              >
                <h3
                  className="font-serif font-bold mb-3"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                >
                  🎯 擅长应对
                </h3>
                <div className="flex flex-wrap gap-2">
                  {worriesList.map((worry) => (
                    <Badge
                      key={worry}
                      variant="outline"
                      className="text-xs py-1 px-3"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--app-accent) 40%, transparent)',
                        color: 'var(--app-text-secondary)',
                        backgroundColor: 'var(--app-bg)',
                      }}
                    >
                      {worry}
                    </Badge>
                  ))}
                </div>
              </motion.div>

              {/* Works */}
              <motion.div
                custom={7}
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
              >
                <h3
                  className="font-serif font-bold mb-3"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                >
                  📚 代表著作
                </h3>
                <div className="flex flex-wrap gap-2">
                  {worksList.map((work) => (
                    <span
                      key={work}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--app-bg-card) 60%, transparent)',
                        color: 'var(--app-text-secondary)',
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      {work}
                    </span>
                  ))}
                </div>
              </motion.div>

              <Separator style={{ backgroundColor: 'var(--app-border)' }} />

              {/* Recommended Books */}
              {recommendedBooks.length > 0 && (
                <motion.div
                  custom={8}
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">📖</span>
                    <h3
                      className="font-serif font-bold"
                      style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                    >
                      推荐书单
                    </h3>
                    <span className="text-xs ml-1" style={{ color: 'var(--app-text-muted)' }}>
                      · {philosopher.nameCn}的阅读清单
                    </span>
                  </div>
                  <div className="space-y-3">
                    {recommendedBooks.map((book, index) => (
                      <motion.div
                        key={book.title}
                        custom={index}
                        variants={bookCardVariants}
                        initial="hidden"
                        animate="visible"
                        className="group rounded-xl p-4 border transition-all duration-300 cursor-default hover:shadow-md"
                        style={{
                          background: `linear-gradient(to right, color-mix(in srgb, var(--app-bg-card) 50%, transparent), color-mix(in srgb, var(--app-bg-card) 20%, transparent))`,
                          borderColor: 'var(--app-border)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--app-accent) 60%, transparent)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--app-border)'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Book number indicator */}
                          <div
                            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 15%, transparent)' }}
                          >
                            <span
                              className="font-serif font-bold text-sm"
                              style={{ color: 'var(--app-accent)' }}
                            >
                              {index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4
                              className="font-serif font-bold text-sm mb-0.5"
                              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif', color: 'var(--app-text-primary)' }}
                            >
                              {book.title}
                            </h4>
                            <p className="text-xs mb-2" style={{ color: 'var(--app-text-muted)' }}>
                              {book.author}
                            </p>
                            <p className="text-xs leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--app-text-secondary)' }}>
                              {book.reason}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setView('chat')}
                className="flex-1 text-white rounded-xl min-h-[48px] shadow-md hover:shadow-lg transition-all duration-300"
                style={{ backgroundColor: 'var(--app-accent)' }}
              >
                <MessageCircle className="mr-2 size-4" />
                与TA对话
              </Button>
              <Button
                onClick={() => setView('debate')}
                variant="outline"
                className="flex-1 rounded-xl min-h-[48px] transition-all duration-300"
                style={{
                  borderColor: 'var(--app-accent)',
                  color: 'var(--app-accent)',
                }}
              >
                <Swords className="mr-2 size-4" />
                开启辩论
              </Button>
            </div>
          </div>
      </motion.div>
    </div>
  )
}
