'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Swords, Loader2, ChevronRight, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import ThemeToggle from '@/components/theme-toggle'

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
  systemPrompt: string
  avatarUrl: string
}

const categoryColors: Record<string, string> = {
  '情绪类': 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border-[var(--badge-amber-border)]',
  '关系类': 'bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] border-[var(--badge-rose-border)]',
  '选择类': 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border-[var(--badge-emerald-border)]',
  '意义类': 'bg-[var(--badge-violet-bg)] text-[var(--badge-violet-text)] border-[var(--badge-violet-border)]',
  '综合类': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
}

type DebateStep = 'question' | 'select2' | 'debate'

export default function DebateInterface() {
  const { selectedPhilosopherId, selectedPhilosopher2Id, selectPhilosopher2, setView } = useAppStore()
  const [step, setStep] = useState<DebateStep>('question')
  const [question, setQuestion] = useState('')
  const [response1, setResponse1] = useState('')
  const [response2, setResponse2] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [roundCount, setRoundCount] = useState(0)
  const [searchQuery2, setSearchQuery2] = useState('')

  const suggestedTopics = ['人应该追求快乐还是意义？', '自由意志是否存在？', '科技让人类更幸福还是更痛苦？', '爱情是理性还是感性？']

  const { data: philosophers = [] } = useQuery<Philosopher[]>({
    queryKey: ['philosophers'],
    queryFn: () => fetch('/api/philosophers').then(res => res.json()),
  })

  const philosopher1 = philosophers.find(p => p.id === selectedPhilosopherId)
  const philosopher2 = philosophers.find(p => p.id === selectedPhilosopher2Id)

  const handleStartDebate = async () => {
    if (!philosopher1 || !philosopher2 || !question.trim()) return

    setIsLoading(true)
    setStep('debate')
    setRoundCount(prev => prev + 1)

    try {
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          philosopherId1: philosopher1.id,
          philosopherId2: philosopher2.id,
          question: question.trim(),
        }),
      })

      const data = await res.json()
      setResponse1(data.response1?.content || '暂无回复')
      setResponse2(data.response2?.content || '暂无回复')
    } catch {
      setResponse1('抱歉，思考遇到了困难。')
      setResponse2('抱歉，思考遇到了困难。')
    } finally {
      setIsLoading(false)
    }
  }

  if (!philosopher1) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col bg-[var(--app-bg)]"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--app-header-bg)] backdrop-blur-sm border-b border-[var(--app-border)] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === 'debate') {
                setStep('question')
                setResponse1('')
                setResponse2('')
              } else if (step === 'select2') {
                setStep('question')
              } else {
                setView('detail')
              }
            }}
            className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] shrink-0 min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Swords className="size-5 text-[var(--app-accent)] shrink-0" />
            <h3 className="font-serif font-bold text-[var(--app-text-primary)]" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              哲学辩论场
            </h3>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 p-4">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Question */}
            {step === 'question' && (
              <motion.div
                key="question"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto"
              >
                {/* Philosopher 1 info */}
                <div className="bg-[var(--app-bg-card)]/50 rounded-xl p-4 border border-[var(--app-border)] mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="size-10 border border-[var(--app-avatar-border)] bg-[var(--app-bg)]">
                      <AvatarImage src={philosopher1.avatarUrl} alt={philosopher1.nameCn} />
                      <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif font-bold">
                        {philosopher1.nameCn.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-serif font-bold text-[var(--app-text-primary)]" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                        {philosopher1.nameCn}
                      </p>
                      <Badge className={`${categoryColors[philosopher1.category]} text-xs border`}>
                        {philosopher1.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--app-text-muted)]">已选择为第一位辩手</p>
                </div>

                {/* Question input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--app-text-primary)] mb-2">
                    提出你想让两位哲学家辩论的问题
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="例如：人应该追求快乐还是追求意义？"
                    className="w-full min-h-[120px] p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-input-bg)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60 focus:border-[var(--app-accent)] focus:outline-none resize-none"
                  />
                </div>

                {/* Suggested debate topics */}
                <div className="mb-6">
                  <p className="text-xs text-[var(--app-text-muted)] mb-2">热门辩题 →</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => setQuestion(topic)}
                        className="px-3 py-1.5 rounded-full text-xs border border-[var(--app-border)] bg-[var(--app-bg-card)]/60 text-[var(--app-text-secondary)] hover:border-[var(--app-accent)]/50 hover:text-[var(--app-accent)] hover:bg-[var(--app-accent)]/5 transition-all cursor-pointer"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => setStep('select2')}
                  disabled={!question.trim()}
                  className="w-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white rounded-lg min-h-[44px]"
                >
                  选择第二位辩手
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Select second philosopher */}
            {step === 'select2' && (
              <motion.div
                key="select2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <p className="text-center text-[var(--app-text-secondary)] mb-4 font-medium">选择第二位辩手</p>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--app-text-muted)]" />
                  <input
                    type="text"
                    placeholder="搜索哲学家..."
                    value={searchQuery2}
                    onChange={(e) => setSearchQuery2(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin mb-6">
                  {philosophers
                    .filter(p => p.id !== philosopher1.id && !p.isHost)
                    .filter(p => {
                      if (!searchQuery2) return true
                      const q = searchQuery2.toLowerCase()
                      return p.nameCn.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q)
                    })
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectPhilosopher2(p.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedPhilosopher2Id === p.id
                            ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/10 shadow-md'
                            : 'border-[var(--app-border)] bg-[var(--app-input-bg)] hover:border-[var(--app-accent)]/50 hover:shadow'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8 border border-[var(--app-avatar-border)] bg-[var(--app-bg)]">
                            <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif text-xs font-bold">
                              {p.nameCn.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-serif text-sm font-bold text-[var(--app-text-primary)] truncate" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                              {p.nameCn}
                            </p>
                            <Badge className={`${categoryColors[p.category]} text-[10px] border`}>
                              {p.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {philosopher2 && (
                  <div className="bg-[var(--app-bg-card)]/50 rounded-xl p-4 border border-[var(--app-border)] mb-4">
                    <p className="text-sm text-[var(--app-text-secondary)]">
                      <span className="font-bold">{philosopher1.nameCn}</span> VS <span className="font-bold">{philosopher2.nameCn}</span>
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleStartDebate}
                  disabled={!selectedPhilosopher2Id}
                  className="w-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white rounded-lg min-h-[44px]"
                >
                  <Swords className="mr-2 size-4" />
                  开始辩论
                </Button>
              </motion.div>
            )}

            {/* Step 3: Debate results */}
            {step === 'debate' && philosopher2 && (
              <motion.div
                key="debate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Question display */}
                <div className="text-center mb-6">
                  <p className="text-xs text-[var(--app-text-muted)] mb-1">辩论话题</p>
                  <p className="text-[var(--app-text-primary)] font-serif font-bold text-lg" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                    &ldquo;{question}&rdquo;
                  </p>
                </div>

                {/* VS display */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8 border border-[var(--app-avatar-border)] bg-[var(--app-bg)]">
                      <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif text-xs font-bold">
                        {philosopher1.nameCn.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-serif font-bold text-[var(--app-text-primary)] text-sm" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                      {philosopher1.nameCn}
                    </span>
                  </div>
                  <span className="text-[var(--app-accent)] font-bold">VS</span>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-[var(--app-text-primary)] text-sm" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                      {philosopher2.nameCn}
                    </span>
                    <Avatar className="size-8 border border-[var(--app-avatar-border)] bg-[var(--app-bg)]">
                      <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif text-xs font-bold">
                        {philosopher2.nameCn.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <Separator className="bg-[var(--app-border)] mb-6" />

                {/* Debate columns */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-8 animate-spin text-[var(--app-accent)]" />
                    <span className="ml-3 text-[var(--app-text-muted)]">两位思想者正在激烈辩论...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Philosopher 1 response */}
                    <div className="bg-[var(--app-bg-card)]/50 rounded-xl border border-[var(--app-border)] p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Avatar className="size-8 border border-[var(--app-avatar-border)] bg-[var(--app-bg)]">
                          <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif text-xs font-bold">
                            {philosopher1.nameCn.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-serif font-bold text-[var(--app-text-primary)] text-sm" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                            {philosopher1.nameCn}
                          </p>
                          <Badge className={`${categoryColors[philosopher1.category]} text-[10px] border`}>
                            {philosopher1.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 text-[var(--app-text-primary)]">
                        <ReactMarkdown>{response1}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Philosopher 2 response */}
                    <div className="bg-[var(--app-bg-card)]/50 rounded-xl border border-[var(--app-border)] p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Avatar className="size-8 border border-[var(--app-avatar-border)] bg-[var(--app-bg)]">
                          <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif text-xs font-bold">
                            {philosopher2.nameCn.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-serif font-bold text-[var(--app-text-primary)] text-sm" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                            {philosopher2.nameCn}
                          </p>
                          <Badge className={`${categoryColors[philosopher2.category]} text-[10px] border`}>
                            {philosopher2.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 text-[var(--app-text-primary)]">
                        <ReactMarkdown>{response2}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Round counter + 再来一轮 button */}
                {!isLoading && (response1 || response2) && (
                  <div className="mt-8 text-center">
                    {roundCount > 0 && (
                      <p className="text-xs text-[var(--app-text-muted)] mb-3">第 {roundCount} 轮辩论</p>
                    )}
                    <Button
                      onClick={() => {
                        setQuestion('')
                        setResponse1('')
                        setResponse2('')
                        setStep('question')
                      }}
                      variant="outline"
                      className="border-[var(--app-accent)]/30 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 min-h-[44px]"
                    >
                      <RotateCcw className="mr-2 size-4" />
                      再来一轮
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
