'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Plus, Terminal, ShieldCheck, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import ThemeToggle from '@/components/theme-toggle'
import CrisisCard from '@/components/crisis-card'

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
  isHost: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function ChatInterface() {
  const { selectedPhilosopherId, setView } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  // 危机干预热线卡片状态：后端 safety-gateway.ts 在 SSE 中返回 crisis:true 时触发
  const [crisisInfo, setCrisisInfo] = useState<{ show: boolean; hotline: string }>({
    show: false,
    hotline: '',
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { data: philosophers = [] } = useQuery<Philosopher[]>({
    queryKey: ['philosophers'],
    queryFn: () => fetch('/api/philosophers').then(res => res.json()),
  })

  const philosopher = philosophers.find(p => p.id === selectedPhilosopherId)

  // Helper: relative time in Chinese
  const getRelativeTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 10) return '刚刚'
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    return `${Math.floor(diff / 86400)}天前`
  }

  // Copy message to clipboard
  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      // Fallback: do nothing
    }
  }

  // Quick start prompts
  const hostPrompts = ['我的项目遇到瓶颈了', '职业方向很迷茫', '创业还是打工？', '如何克服拖延症？']
  const regularPrompts = ['我最近很焦虑', '人生的意义是什么？', '我该如何做出选择？']

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent, isStreaming])

  // Load existing conversation messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      fetch(`/api/conversations/${conversationId}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages) {
            setMessages(
              data.messages
                .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
                .map((m: { role: string; content: string }, i: number) => ({
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                  timestamp: Date.now() - (data.messages.length - i) * 60000,
                }))
            )
          }
        })
        .catch(() => {
          // If loading fails, just start fresh
        })
    }
  }, [conversationId])

  const handleNewChat = useCallback(() => {
    // Abort any ongoing stream
    if (abortRef.current) {
      abortRef.current.abort()
    }
    setMessages([])
    setConversationId(null)
    setStreamingContent('')
    setIsStreaming(false)
    setInput('')
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !philosopher) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim(), timestamp: Date.now() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setStreamingContent('')

    // Create abort controller for this request
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          philosopherId: philosopher.id,
          message: userMessage.content,
          history,
          conversationId,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue

          const dataStr = trimmed.slice(5).trim()
          if (dataStr === '[DONE]') continue

          try {
            const parsed = JSON.parse(dataStr)

            // ============================================================
            // 危机干预安全网关 · 前端检测 (Safety Gateway Detection)
            // ------------------------------------------------------------
            // 后端 safety-gateway.ts 在 severe 级别情绪触发时，每个 SSE chunk
            // 都会带 { content, crisis: true, hotline: "400-161-9995" }。
            // 末尾还会再发一帧 { conversationId, crisis, hotline, riskLevel }
            // 确保前端能拿到 hotline。此处检测到 crisis:true 即弹出热线卡片，
            // 覆盖在聊天界面之上，强制用户看见援助资源。
            // ============================================================
            if (parsed.crisis === true && parsed.hotline) {
              setCrisisInfo({ show: true, hotline: parsed.hotline })
              // 不 continue：severe 帧 content 字段是飘叔干预话术，仍需正常累加显示在聊天气泡里
            }

            // Handle conversation ID
            if (parsed.conversationId) {
              setConversationId(parsed.conversationId)
              continue
            }

            // Handle content chunk
            if (parsed.content) {
              accumulated += parsed.content
              setStreamingContent(accumulated)
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Add the complete assistant message
      if (accumulated) {
        setMessages(prev => [...prev, { role: 'assistant', content: accumulated, timestamp: Date.now() }])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled, add whatever we have so far
        if (streamingContent) {
          setMessages(prev => [...prev, { role: 'assistant', content: streamingContent, timestamp: Date.now() }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，思考遇到了一些困难，请稍后再试。', timestamp: Date.now() }])
      }
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      abortRef.current = null
    }
  }, [input, isStreaming, philosopher, messages, conversationId, streamingContent])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!philosopher) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="min-h-screen flex flex-col bg-[var(--app-bg)]"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--app-header-bg)] backdrop-blur-sm border-b border-[var(--app-border)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('detail')}
            className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] shrink-0 min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <Avatar className="size-10 border-2 border-[var(--app-avatar-border)] bg-[var(--app-bg-card)]">
            <AvatarImage src={philosopher.avatarUrl} alt={philosopher.nameCn} />
            <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif font-bold">
              {philosopher.nameCn.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-[var(--app-text-primary)] text-sm truncate" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                {philosopher.nameCn}
              </h3>
              {philosopher.isHost && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--app-accent)]/15 text-[var(--app-accent)] border border-[var(--app-accent)]/20 shrink-0">
                  <Terminal className="size-2.5" />
                  主理人
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--app-text-muted)] truncate">{philosopher.tagline}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] shrink-0 min-h-[44px] min-w-[44px]"
            title="新对话"
          >
            <Plus className="size-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="max-w-3xl mx-auto p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin"
        >
          {/* Welcome message */}
          {messages.length === 0 && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Avatar className="size-16 border-2 border-[var(--app-avatar-border)] bg-[var(--app-bg-card)] mx-auto mb-4">
                <AvatarImage src={philosopher.avatarUrl} alt={philosopher.nameCn} />
                <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif font-bold text-2xl">
                  {philosopher.nameCn.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <p className="text-[var(--app-text-primary)] font-serif font-bold text-lg mb-2" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                与{philosopher.nameCn}对话
              </p>
              {philosopher.isHost ? (
                <>
                  <p className="text-[var(--app-accent)] text-sm max-w-md mx-auto leading-relaxed font-medium mb-3">
                    飘叔会以架构师思维拆解你的人生问题。先看日志，别猜。
                  </p>
                  <div className="mt-4 bg-[var(--app-bg-card)]/50 rounded-xl p-4 border border-[var(--app-accent)]/15 max-w-md mx-auto">
                    <div className="flex items-center gap-1.5 mb-3 justify-center">
                      <ShieldCheck className="size-3.5 text-[var(--app-accent)]/60" />
                      <span className="text-[10px] font-mono text-[var(--app-text-muted)] tracking-wider">五级确定性</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                      {[
                        { label: '确定', color: '#22c55e' },
                        { label: '高度可信', color: '#84cc16' },
                        { label: '推断', color: '#eab308' },
                        { label: '不确定', color: '#f97316' },
                        { label: '不知道', color: '#ef4444' },
                      ].map((level) => (
                        <span
                          key={level.label}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium border"
                          style={{
                            color: level.color,
                            borderColor: `${level.color}33`,
                            backgroundColor: `${level.color}0D`,
                          }}
                        >
                          <span className="size-1 rounded-full" style={{ backgroundColor: level.color }} />
                          {level.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--app-text-muted)] font-mono">
                      每个回答都会标注确定性等级——不装懂，不含糊。
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-[var(--app-text-muted)] text-sm max-w-md mx-auto leading-relaxed">
                  向{philosopher.nameCn}倾诉你的困惑，TA将以独特的哲学视角为你解答。
                </p>
              )}
              <div className="mt-6 bg-[var(--app-bg-card)]/50 rounded-xl p-4 border border-[var(--app-border)] max-w-md mx-auto">
                <p className="text-sm text-[var(--app-text-secondary)] italic">
                  &ldquo;{philosopher.quote}&rdquo;
                </p>
                {philosopher.quoteSource && (
                  <p className="text-xs text-[var(--app-text-muted)] mt-2">—— {philosopher.quoteSource}</p>
                )}
              </div>

              {/* Quick start prompts */}
              <div className="mt-6 max-w-md mx-auto">
                <p className="text-xs text-[var(--app-text-muted)] mb-3">试试这些话题 →</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {(philosopher.isHost ? hostPrompts : regularPrompts).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 rounded-full text-xs border border-[var(--app-border)] bg-[var(--app-bg-card)]/60 text-[var(--app-text-secondary)] hover:border-[var(--app-accent)]/50 hover:text-[var(--app-accent)] hover:bg-[var(--app-accent)]/5 transition-all cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Message bubbles */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' && (
                    <Avatar className="size-8 border border-[var(--app-avatar-border)] bg-[var(--app-bg-card)] shrink-0 mt-1">
                      <AvatarImage src={philosopher.avatarUrl} alt={philosopher.nameCn} />
                      <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif text-xs font-bold">
                        {philosopher.nameCn.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[var(--bubble-user-bg)] text-[var(--bubble-user-text)] rounded-br-md'
                          : 'bg-[var(--bubble-assistant-bg)] text-[var(--bubble-assistant-text)] rounded-bl-md border border-[var(--bubble-assistant-border)]'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 text-[var(--bubble-assistant-text)]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {/* Timestamp + copy */}
                    <div className={`flex items-center gap-2 mt-1 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.timestamp ? (
                        <span className="text-[10px] text-[var(--app-text-muted)]/60">{getRelativeTime(msg.timestamp)}</span>
                      ) : null}
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="text-[var(--app-text-muted)]/40 hover:text-[var(--app-text-secondary)] transition-colors p-0.5"
                          title="复制"
                        >
                          {copiedIdx === idx ? (
                            <Check className="size-3 text-green-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming message bubble */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-2 max-w-[85%] flex-row">
                <Avatar className="size-8 border border-[var(--app-avatar-border)] bg-[var(--app-bg-card)] shrink-0 mt-1">
                  <AvatarImage src={philosopher.avatarUrl} alt={philosopher.nameCn} />
                  <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] font-serif text-xs font-bold">
                    {philosopher.nameCn.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-[var(--bubble-assistant-bg)] text-[var(--bubble-assistant-text)] rounded-2xl rounded-bl-md border border-[var(--bubble-assistant-border)] px-4 py-3">
                  {streamingContent ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 text-[var(--bubble-assistant-text)]">
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      <span className="inline-block w-0.5 h-4 bg-[var(--app-accent)] ml-0.5 align-text-bottom animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[var(--app-text-muted)] text-sm">
                      <div className="flex gap-1">
                        <span className="size-1.5 bg-[var(--app-accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="size-1.5 bg-[var(--app-accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="size-1.5 bg-[var(--app-accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>{philosopher.isHost ? '飘叔正在排查...' : '正在思考...'}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 bg-[var(--app-bg)] border-t border-[var(--app-border)] p-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={philosopher.isHost ? '描述你的问题，飘叔来排查...' : `向${philosopher.nameCn}倾诉你的困惑...`}
            className="min-h-[44px] max-h-32 resize-none bg-[var(--app-input-bg)] border-[var(--app-border)] focus:border-[var(--app-accent)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white shrink-0 min-h-[44px] px-4"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      {/* 危机干预热线卡片——覆盖在聊天界面上的模态层
          由 SSE 中 crisis:true 字段触发，必须点"我知道了"才能关闭 */}
      <CrisisCard
        show={crisisInfo.show}
        hotline={crisisInfo.hotline}
        onClose={() => setCrisisInfo((prev) => ({ ...prev, show: false }))}
      />
    </motion.div>
  )
}
