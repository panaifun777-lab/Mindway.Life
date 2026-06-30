'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Loader2,
  Send,
  Bot,
  User as UserIcon,
  Lock,
  Check,
  Crown,
  Zap,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import ThemeToggle from '@/components/theme-toggle'

interface Tier {
  id: string
  name: string
  price: number
  priceDisplay: string
  maxConversations: number
  duration: string
  description: string
  features: string[]
}

interface DigitalLife {
  id: string
  name: string
  description: string
  personality: string
  knowledgeBase: string
  avatar: string
  tier: string
  conversationCount: number
  maxConversations: number
  createdAt: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function DigitalLifeView() {
  const { setView, user } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    personality: '',
    knowledgeBase: '',
    tier: 'basic' as string,
  })
  const [creating, setCreating] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['digital-life'],
    queryFn: async () => {
      const res = await fetch('/api/digital-life')
      if (!res.ok) throw new Error('加载失败')
      return res.json()
    },
  })

  const digitalLife: DigitalLife | null = data?.digitalLife ?? null
  const tiers: Tier[] = data?.tiers ?? []

  // Auto-open create dialog if no digital life
  useEffect(() => {
    if (!isLoading && !digitalLife && user) {
      setShowCreate(true)
    }
  }, [isLoading, digitalLife, user])

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({
        title: '请填写名称',
        description: '为你的数字生命体起一个名字',
        variant: 'destructive',
      })
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/digital-life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...form,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: '创建失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: '创建成功',
        description: data.message,
      })
      setShowCreate(false)
      setForm({
        name: '',
        description: '',
        personality: '',
        knowledgeBase: '',
        tier: 'basic',
      })
      queryClient.invalidateQueries({ queryKey: ['digital-life'] })
    } catch {
      toast({
        title: '网络错误',
        description: '请检查网络后重试',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSend = async () => {
    if (!chatInput.trim() || !digitalLife || chatSending) return
    const userMessage = chatInput.trim()
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ]
    setMessages(newMessages)
    setChatInput('')
    setChatSending(true)

    try {
      const res = await fetch('/api/digital-life/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: '对话失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        })
        // 移除已添加的用户消息（避免脏数据）
        setMessages(messages)
        return
      }
      setMessages([
        ...newMessages,
        { role: 'assistant', content: data.reply },
      ])
      queryClient.invalidateQueries({ queryKey: ['digital-life'] })
    } catch {
      toast({
        title: '网络错误',
        description: '请检查网络后重试',
        variant: 'destructive',
      })
      setMessages(messages)
    } finally {
      setChatSending(false)
    }
  }

  const usagePercent = digitalLife
    ? Math.min(
        100,
        Math.round(
          (digitalLife.conversationCount / digitalLife.maxConversations) * 100
        )
      )
    : 0
  const isUnlimited =
    digitalLife?.tier === 'annual' || digitalLife?.tier === 'premium'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[var(--app-bg)] flex flex-col"
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
            数字生命体
          </h1>
          <ThemeToggle />
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[var(--app-accent)]" />
        </div>
      ) : !digitalLife ? (
        /* Empty state */
        <EmptyState onCreate={() => setShowCreate(true)} tiers={tiers} />
      ) : (
        <>
          {/* Profile Header */}
          <section className="bg-gradient-to-br from-[var(--app-accent)]/10 to-transparent border-b border-[var(--app-border)] py-5">
            <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
              <div className="size-16 rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center shrink-0 overflow-hidden">
                {digitalLife.avatar ? (
                  <img
                    src={digitalLife.avatar}
                    alt={digitalLife.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <Bot className="size-8 text-[var(--app-accent)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    className="font-serif font-bold text-lg text-[var(--app-text-primary)] truncate"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    {digitalLife.name}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-[var(--app-accent)]/40 text-[var(--app-accent)]"
                  >
                    {digitalLife.tier === 'basic'
                      ? '基础版'
                      : digitalLife.tier === 'annual'
                      ? '年度版'
                      : '旗舰版'}
                  </Badge>
                </div>
                {digitalLife.description && (
                  <p className="text-xs text-[var(--app-text-secondary)] line-clamp-1 mt-1">
                    {digitalLife.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-[var(--app-text-muted)]">
                    对话 {digitalLife.conversationCount} 次
                  </span>
                  {!isUnlimited && (
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <div className="flex-1 h-1.5 bg-[var(--app-bg)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--app-accent)] transition-all"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      <span className="text-[var(--app-text-muted)] text-xs shrink-0">
                        {digitalLife.conversationCount}/{digitalLife.maxConversations}
                      </span>
                    </div>
                  )}
                  {isUnlimited && (
                    <Badge
                      variant="outline"
                      className="border-green-500/40 text-green-600"
                    >
                      <Zap className="size-3 mr-1" />
                      无限对话
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Chat area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="size-14 mx-auto rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center mb-3">
                    <Heart className="size-7 text-[var(--app-accent)]" />
                  </div>
                  <p
                    className="font-serif text-[var(--app-text-primary)] mb-1"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    与 {digitalLife.name} 开始对话
                  </p>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    说点什么吧，他/她会用心聆听
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`flex gap-3 ${
                      msg.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user'
                          ? 'bg-[var(--app-accent)]/15'
                          : 'bg-[var(--app-accent)]'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <UserIcon className="size-4 text-[var(--app-accent)]" />
                      ) : (
                        <Bot className="size-4 text-white" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-[var(--app-accent)] text-white'
                          : 'bg-[var(--app-bg-card)] border border-[var(--app-border)] text-[var(--app-text-primary)]'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              {chatSending && (
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-[var(--app-accent)] flex items-center justify-center shrink-0">
                    <Bot className="size-4 text-white" />
                  </div>
                  <div className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="size-1.5 bg-[var(--app-text-muted)] rounded-full animate-bounce" />
                      <span className="size-1.5 bg-[var(--app-text-muted)] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 bg-[var(--app-text-muted)] rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-[var(--app-border)] bg-[var(--app-bg-card)] p-4">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={`对 ${digitalLife.name} 说点什么...`}
                disabled={chatSending}
                className="flex-1 bg-[var(--app-bg)] border-[var(--app-border)]"
              />
              <Button
                onClick={handleSend}
                disabled={!chatInput.trim() || chatSending}
                className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white px-4"
              >
                {chatSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[var(--app-bg-card)] border-[var(--app-border)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="font-serif text-[var(--app-text-primary)]"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              创建你的数字生命体
            </DialogTitle>
            <DialogDescription className="text-[var(--app-text-secondary)]">
              选择套餐，定义人格，开启专属陪伴
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tier Selection */}
            <div>
              <Label className="text-[var(--app-text-primary)] mb-2 block">
                选择套餐
              </Label>
              <div className="grid gap-2">
                {tiers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setForm({ ...form, tier: t.id })}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      form.tier === t.id
                        ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/5'
                        : 'border-[var(--app-border)] bg-[var(--app-bg)] hover:border-[var(--app-accent)]/40'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--app-text-primary)]">
                          {t.name}
                        </span>
                        <span
                          className="text-sm font-serif font-bold text-[var(--app-accent)]"
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {t.priceDisplay}
                        </span>
                        {t.id === 'annual' && (
                          <Badge className="bg-[var(--app-accent)]/15 text-[var(--app-accent)] text-xs">
                            推荐
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--app-text-muted)] mt-1">
                        {t.description}
                      </p>
                    </div>
                    {form.tier === t.id && (
                      <Check className="size-4 text-[var(--app-accent)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="dl-name" className="text-[var(--app-text-primary)]">
                名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dl-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：雅典娜、苏格拉底之影..."
                className="mt-1 bg-[var(--app-bg)] border-[var(--app-border)]"
              />
            </div>

            {/* Personality */}
            <div>
              <Label htmlFor="dl-personality" className="text-[var(--app-text-primary)]">
                性格特质
              </Label>
              <Input
                id="dl-personality"
                value={form.personality}
                onChange={(e) =>
                  setForm({ ...form, personality: e.target.value })
                }
                placeholder="温和、睿智、爱提问..."
                className="mt-1 bg-[var(--app-bg)] border-[var(--app-border)]"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="dl-desc" className="text-[var(--app-text-primary)]">
                简介
              </Label>
              <Textarea
                id="dl-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="他/她的背景故事、与你的关系..."
                className="mt-1 bg-[var(--app-bg)] border-[var(--app-border)] min-h-[60px]"
              />
            </div>

            {/* Knowledge Base */}
            <div>
              <Label htmlFor="dl-kb" className="text-[var(--app-text-primary)]">
                知识背景
              </Label>
              <Textarea
                id="dl-kb"
                value={form.knowledgeBase}
                onChange={(e) =>
                  setForm({ ...form, knowledgeBase: e.target.value })
                }
                placeholder="他/她熟悉的话题、专长领域..."
                className="mt-1 bg-[var(--app-bg)] border-[var(--app-border)] min-h-[60px]"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white h-11 rounded-xl"
            >
              {creating ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              {creating ? '创建中...' : '确认创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ============================================================
// 空状态子组件
// ============================================================
function EmptyState({
  onCreate,
  tiers,
}: {
  onCreate: () => void
  tiers: Tier[]
}) {
  const { setView } = useAppStore()
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-md text-center"
      >
        <div className="size-16 mx-auto rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center mb-4">
          <Bot className="size-8 text-[var(--app-accent)]" />
        </div>
        <h2
          className="text-2xl font-serif font-bold text-[var(--app-text-primary)] mb-2"
          style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
        >
          创建你的数字生命体
        </h2>
        <p className="text-sm text-[var(--app-text-secondary)] mb-6 leading-relaxed">
          一个永远在线、专属你的人格化陪伴者。可以注入你的故事、价值观与回忆，让 AI 拥有你的灵魂。
        </p>

        <div className="grid gap-3 mb-6">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-xl p-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--app-text-primary)]">
                    {t.name}
                  </span>
                  {t.id === 'premium' && (
                    <Crown className="size-3.5 text-[var(--app-accent)]" />
                  )}
                </div>
                <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                  {t.description}
                </p>
              </div>
              <span
                className="text-base font-serif font-bold text-[var(--app-accent)] shrink-0"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {t.priceDisplay}
              </span>
            </div>
          ))}
        </div>

        <Button
          onClick={onCreate}
          className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white h-11 px-8 rounded-xl"
        >
          <Sparkles className="size-4 mr-2" />
          立即创建
        </Button>

        <button
          onClick={() => setView('home')}
          className="block mx-auto mt-4 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
        >
          暂不创建，返回首页
        </button>
      </motion.div>
    </div>
  )
}
