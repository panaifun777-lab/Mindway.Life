'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
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
  avatarUrl: string
}

interface QuizQuestion {
  question: string
  options: { label: string; text: string; category: string }[]
}

const quizQuestions: QuizQuestion[] = [
  {
    question: '深夜辗转难眠，你最可能在想什么？',
    options: [
      { label: 'A', text: '为什么我总是控制不住自己的情绪？', category: '情绪类' },
      { label: 'B', text: '身边的人是否真的理解我？', category: '关系类' },
      { label: 'C', text: '明天要做的事，我到底该不该做？', category: '选择类' },
      { label: 'D', text: '这一切到底有什么意义？', category: '意义类' },
    ],
  },
  {
    question: '当你遇到困难时，你的第一反应是？',
    options: [
      { label: 'A', text: '感到焦虑和沮丧，难以平静', category: '情绪类' },
      { label: 'B', text: '想找人倾诉或寻求帮助', category: '关系类' },
      { label: 'C', text: '开始权衡各种选择的利弊', category: '选择类' },
      { label: 'D', text: '追问这件事背后的深层原因', category: '意义类' },
    ],
  },
  {
    question: '哪种情境最让你感到不安？',
    options: [
      { label: 'A', text: '在人群中突然情绪崩溃', category: '情绪类' },
      { label: 'B', text: '被最信任的人误解或背叛', category: '关系类' },
      { label: 'C', text: '站在人生的十字路口不知往哪走', category: '选择类' },
      { label: 'D', text: '日复一日地重复，看不到尽头', category: '意义类' },
    ],
  },
  {
    question: '你最希望拥有的一种能力是？',
    options: [
      { label: 'A', text: '无论发生什么都能保持内心平静', category: '情绪类' },
      { label: 'B', text: '与任何人都能建立深层连接', category: '关系类' },
      { label: 'C', text: '做出最正确的决定从不后悔', category: '选择类' },
      { label: 'D', text: '看透人生的本质不再迷茫', category: '意义类' },
    ],
  },
  {
    question: '你最喜欢哪种类型的书籍或电影？',
    options: [
      { label: 'A', text: '关于情感治愈和心灵成长的故事', category: '情绪类' },
      { label: 'B', text: '关于人与人之间羁绊的故事', category: '关系类' },
      { label: 'C', text: '关于抉择和命运的悬疑故事', category: '选择类' },
      { label: 'D', text: '关于存在与虚无的哲学思考', category: '意义类' },
    ],
  },
  {
    question: '如果可以向哲学家提一个问题，你会问？',
    options: [
      { label: 'A', text: '如何才能不被负面情绪吞噬？', category: '情绪类' },
      { label: 'B', text: '如何在爱与被爱中找到平衡？', category: '关系类' },
      { label: 'C', text: '面对不确定性，怎样才能做出不后悔的选择？', category: '选择类' },
      { label: 'D', text: '人活着到底是为了什么？', category: '意义类' },
    ],
  },
  {
    question: '你觉得人生最大的痛苦来自哪里？',
    options: [
      { label: 'A', text: '无法控制自己的内心感受', category: '情绪类' },
      { label: 'B', text: '孤独，无人真正理解自己', category: '关系类' },
      { label: 'C', text: '做了错误的选择，无法重来', category: '选择类' },
      { label: 'D', text: '找不到存在的理由和价值', category: '意义类' },
    ],
  },
  {
    question: '你最羡慕哪种人？',
    options: [
      { label: 'A', text: '内心强大，泰山崩于前而面不改色', category: '情绪类' },
      { label: 'B', text: '身边总有挚友相伴，从不孤独', category: '关系类' },
      { label: 'C', text: '目标明确，每一步都走得坚定', category: '选择类' },
      { label: 'D', text: '看透世事，内心自足无求于外', category: '意义类' },
    ],
  },
  {
    question: '面对一段失败的经历，你更倾向于？',
    options: [
      { label: 'A', text: '反复回想，被遗憾和自责困住', category: '情绪类' },
      { label: 'B', text: '想知道是否是关系出了问题', category: '关系类' },
      { label: 'C', text: '分析决策过程中的失误', category: '选择类' },
      { label: 'D', text: '反思这段经历对我人生的启示', category: '意义类' },
    ],
  },
  {
    question: '如果人生是一场旅行，你最想带上的行囊是？',
    options: [
      { label: 'A', text: '一颗宁静的心，无论风雨都能安然', category: '情绪类' },
      { label: 'B', text: '一群志同道合的同行者', category: '关系类' },
      { label: 'C', text: '一张精确的地图，不会走错路', category: '选择类' },
      { label: 'D', text: '一本记录智慧的日记，随时翻阅', category: '意义类' },
    ],
  },
]

const categoryColors: Record<string, string> = {
  '情绪类': 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border-[var(--badge-amber-border)]',
  '关系类': 'bg-[var(--badge-rose-bg)] text-[var(--badge-rose-text)] border-[var(--badge-rose-border)]',
  '选择类': 'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border-[var(--badge-emerald-border)]',
  '意义类': 'bg-[var(--badge-violet-bg)] text-[var(--badge-violet-text)] border-[var(--badge-violet-border)]',
  '综合类': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
}

export default function Quiz() {
  const { setView, selectPhilosopher } = useAppStore()
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const { data: philosophers = [] } = useQuery<Philosopher[]>({
    queryKey: ['philosophers'],
    queryFn: () => fetch('/api/philosophers').then(res => res.json()),
  })

  const handleAnswer = (category: string) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    const newAnswers = [...answers, category]
    setAnswers(newAnswers)

    if (currentQ < quizQuestions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setShowResult(true)
    }
    // Prevent rapid clicking during AnimatePresence transitions
    setTimeout(() => setIsTransitioning(false), 400)
  }

  const getResult = () => {
    const counts: Record<string, number> = { '情绪类': 0, '关系类': 0, '选择类': 0, '意义类': 0 }
    answers.forEach(a => { counts[a] = (counts[a] || 0) + 1 })

    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    const matched = philosophers.filter(p => p.category === dominant)
    // Pick the philosopher from the dominant category
    const result = matched[Math.floor(Math.random() * matched.length)]
    return { dominant, result, counts }
  }

  const handleReset = () => {
    setCurrentQ(0)
    setAnswers([])
    setShowResult(false)
    setIsTransitioning(false)
  }

  const progress = ((currentQ + (showResult ? 1 : 0)) / quizQuestions.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col bg-[var(--app-bg)]"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--app-header-bg)] backdrop-blur-sm border-b border-[var(--app-border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (showResult) {
                handleReset()
              } else if (currentQ > 0) {
                setCurrentQ(currentQ - 1)
                setAnswers(answers.slice(0, -1))
              } else {
                setView('home')
              }
            }}
            className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] shrink-0 min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-[var(--app-text-primary)] text-sm" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              哲学家匹配测试
            </h3>
            <p className="text-xs text-[var(--app-text-muted)]">{currentQ + 1} / {quizQuestions.length}</p>
          </div>
          <Progress value={progress} className="w-20 h-2 bg-[var(--progress-bg)] [&>[data-slot=indicator]]:bg-[var(--progress-fill)]" />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div
                key={`q-${currentQ}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {/* Question */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className="size-5 text-[var(--app-accent)]" />
                  </div>
                  <h2
                    className="text-xl md:text-2xl font-serif font-bold text-[var(--app-text-primary)] leading-relaxed"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    {quizQuestions[currentQ].question}
                  </h2>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {quizQuestions[currentQ].options.map((option) => (
                    <motion.button
                      key={option.label}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleAnswer(option.category)}
                      className="w-full text-left p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-input-bg)] hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)]/5 transition-all min-h-[44px] group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center size-8 rounded-full bg-[var(--app-bg-card)] text-[var(--app-accent)] font-bold text-sm shrink-0 group-hover:bg-[var(--app-accent)] group-hover:text-white transition-colors">
                          {option.label}
                        </span>
                        <span className="text-[var(--app-text-primary)] text-sm leading-relaxed pt-1">{option.text}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {(() => {
                  const result = getResult()
                  if (!result.result) return <p className="text-center text-[var(--app-text-muted)]">未找到匹配的哲学家</p>

                  return (
                    <div className="text-center">
                      {/* Decorative top */}
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-16 h-[1px] bg-[var(--app-accent)] opacity-50" />
                        <Sparkles className="size-6 text-[var(--app-accent)]" />
                        <div className="w-16 h-[1px] bg-[var(--app-accent)] opacity-50" />
                      </div>

                      <p className="text-[var(--app-text-muted)] text-sm mb-2">最适合开导你的哲学家是</p>

                      {/* Result card */}
                      <div className="bg-[var(--app-bg-card)]/60 rounded-2xl border border-[var(--app-border)] p-8 mb-6 shadow-lg">
                        <Avatar className="size-20 border-4 border-[var(--app-avatar-border)] bg-[var(--app-bg)] mx-auto mb-4">
                          <AvatarImage src={result.result.avatarUrl} alt={result.result.nameCn} />
                          <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif font-bold text-3xl">
                            {result.result.nameCn.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <h3
                          className="text-2xl font-serif font-bold text-[var(--app-text-primary)] mb-1"
                          style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                        >
                          {result.result.nameCn}
                        </h3>
                        <p className="text-[var(--app-text-muted)] text-sm mb-3">{result.result.nameEn}</p>
                        <Badge className={`${categoryColors[result.dominant]} border mb-4`}>
                          {result.dominant}
                        </Badge>
                        <p className="text-[var(--app-text-secondary)] text-sm leading-relaxed mb-4">{result.result.tagline}</p>

                        {/* Quote */}
                        <div className="bg-[var(--app-bg)]/80 rounded-xl p-4 border border-[var(--app-border)]">
                          <p className="text-[var(--app-text-primary)] italic font-serif text-sm" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                            &ldquo;{result.result.quote}&rdquo;
                          </p>
                          {result.result.quoteSource && (
                            <p className="text-xs text-[var(--app-text-muted)] mt-2">—— {result.result.quoteSource}</p>
                          )}
                        </div>
                      </div>

                      {/* Category breakdown */}
                      <div className="flex justify-center gap-4 mb-6">
                        {Object.entries(result.counts).map(([cat, count]) => (
                          <div key={cat} className="text-center">
                            <Badge className={`${categoryColors[cat]} border text-xs mb-1`}>{cat}</Badge>
                            <p className="text-xs text-[var(--app-text-muted)]">{count}题</p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          onClick={() => {
                            selectPhilosopher(result.result!.id)
                          }}
                          className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white rounded-lg min-h-[44px] px-6"
                        >
                          <MessageCircle className="mr-2 size-4" />
                          与TA对话
                        </Button>
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="border-[var(--app-accent)] text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 rounded-lg min-h-[44px] px-6"
                        >
                          <ArrowRight className="mr-2 size-4" />
                          重新测试
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
