'use client'

import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Loader2, Sparkles, Wrench, Terminal, Cpu, ShieldCheck, Search, RotateCcw, AlertTriangle, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppStore } from '@/lib/store'

interface Philosopher {
  id: string
  nameCn: string
  nameEn: string
  slug: string
  era: string
  category: string
  avatarUrl: string
  tagline: string
  bioSummary: string
  coreInsight: string
  worries: string
  works: string
  quote: string
  quoteSource: string
  isHost: boolean
}

const beliefs = ['融汇中西', '哲学解惑', '知行合一', '道通为一', '以思济世']

const skills = [
  { label: '烦恼诊断', icon: Cpu },
  { label: '哲思溯源', icon: Search },
  { label: '思想重构', icon: RotateCcw },
  { label: '智慧评估', icon: ShieldCheck },
  { label: '危机SOP', icon: AlertTriangle },
]

const certaintyLevels = [
  { label: '洞见', color: '#22c55e', desc: '直击本质，逻辑自洽' },
  { label: '明辨', color: '#84cc16', desc: '有理有据，可践行' },
  { label: '推论', color: '#eab308', desc: '合理推导，需留意反例' },
  { label: '存疑', color: '#f97316', desc: '信息不足，不宜武断' },
  { label: '不知', color: '#ef4444', desc: '诚实承认，避免装懂' },
]

// Daily wisdom quotes - rotates based on time
const dailyWisdom = [
  { text: '未经审视的人生不值得过。', author: '苏格拉底', hint: '今天，审视一下你最习以为常的信念' },
  { text: '他人即地狱，也是天堂。', author: '萨特', hint: '你与他人的关系中，藏着最大的困惑与转机' },
  { text: '人是被抛入世界的自由。', author: '海德格尔', hint: '你的焦虑，也许正是你自由的证明' },
  { text: '幸福不在于拥有多少，而在于享受多少。', author: '伊壁鸠鲁', hint: '真正的富有，是知道自己已经足够' },
  { text: '世界是我的表象。', author: '叔本华', hint: '你看到的世界，只是你内心的倒影' },
  { text: '人不能两次踏入同一条河流。', author: '赫拉克利特', hint: '一切都在流动，包括你的烦恼' },
  { text: '给我一个支点，我可以撬动地球。', author: '阿基米德', hint: '找到属于你的哲学支点，撬动人生困境' },
  { text: '吾生也有涯，而知也无涯。', author: '庄子', hint: '不必穷尽一切，但求明心见性' },
  { text: '我思故我在。', author: '笛卡尔', hint: '你的思考本身，就是存在的最好证明' },
  { text: '自由就是对必然的认识。', author: '斯宾诺莎', hint: '理解规律，才能在规律中找到自由' },
  { text: '人是目的，不是手段。', author: '康德', hint: '永远不要让任何人把你当作工具' },
  { text: '凡杀不死我的，必使我更强大。', author: '尼采', hint: '今天的苦，是明天力量的种子' },
]

const glowPulse = {
  initial: {
    boxShadow: '0 0 20px rgba(201, 169, 110, 0.15), 0 0 60px rgba(201, 169, 110, 0.05)',
  },
  animate: {
    boxShadow: [
      '0 0 20px rgba(201, 169, 110, 0.15), 0 0 60px rgba(201, 169, 110, 0.05)',
      '0 0 30px rgba(201, 169, 110, 0.3), 0 0 80px rgba(201, 169, 110, 0.1)',
      '0 0 20px rgba(201, 169, 110, 0.15), 0 0 60px rgba(201, 169, 110, 0.05)',
    ],
  },
}

const borderGlow = {
  initial: {
    backgroundSize: '200% 200%',
    backgroundPosition: '0% 50%',
  },
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
  },
}

const badgeStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const badgeItem = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  show: { opacity: 1, scale: 1, y: 0 },
}

export default function HostSection() {
  const { selectPhilosopher, setView } = useAppStore()
  const { data: philosophers = [], isLoading } = useQuery<Philosopher[]>({
    queryKey: ['philosophers'],
    queryFn: () => fetch('/api/philosophers').then(res => res.json()),
  })

  const host = philosophers.find(p => p.isHost)

  // Rotate wisdom based on current hour - computed directly, no effect needed
  const currentWisdom = dailyWisdom[new Date().getHours() % dailyWisdom.length]

  const handleChatWithHost = () => {
    if (!host) return
    useAppStore.setState({ selectedPhilosopherId: host.id, currentView: 'chat' })
  }

  if (isLoading) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[var(--app-accent)]" />
          <span className="ml-3 text-[var(--app-text-muted)]">加载主理人...</span>
        </div>
      </section>
    )
  }

  if (!host) return null

  return (
    <section className="relative py-12 md:py-16 px-4 overflow-hidden">
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, rgba(201, 169, 110, 0.06) 0%, transparent 40%, rgba(201, 169, 110, 0.04) 100%)`,
        }}
      />

      {/* Decorative floating elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-6 left-[10%] text-[var(--app-accent)] opacity-[0.07] text-6xl">⚙</div>
        <div className="absolute bottom-8 right-[8%] text-[var(--app-accent)] opacity-[0.07] text-5xl">⬡</div>
        <div className="absolute top-1/2 right-[20%] text-[var(--app-accent)] opacity-[0.05] text-4xl">◈</div>
        <div className="absolute top-1/4 left-[5%] text-[var(--app-accent)] opacity-[0.04] text-7xl">☯</div>
        <div className="absolute bottom-1/4 right-[15%] text-[var(--app-accent)] opacity-[0.04] text-6xl">∞</div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 mb-4">
            <Sparkles className="size-3.5 text-[var(--app-accent)]" />
            <span className="text-xs font-medium text-[var(--app-accent)] tracking-wider">平台主理人</span>
          </div>
        </motion.div>

        {/* Daily Wisdom Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative rounded-xl px-5 py-4 bg-[var(--app-bg-card)]/60 border border-[var(--app-accent)]/15 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: `linear-gradient(90deg, rgba(201, 169, 110, 0.1) 0%, transparent 50%, rgba(201, 169, 110, 0.05) 100%)`,
              }}
            />
            <div className="relative flex items-start gap-3">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--app-accent)]/15 shrink-0 mt-0.5">
                <Clock className="size-4 text-[var(--app-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-[var(--app-accent)] tracking-wider uppercase">今日哲思</span>
                  <div className="w-1 h-1 rounded-full bg-[var(--app-accent)] opacity-50" />
                  <span className="text-[10px] text-[var(--app-text-muted)]">{currentWisdom.author}</span>
                </div>
                <p
                  className="text-sm md:text-base font-serif italic text-[var(--app-text-primary)] leading-relaxed"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                >
                  &ldquo;{currentWisdom.text}&rdquo;
                </p>
                <p className="text-xs text-[var(--app-text-muted)] mt-1.5 flex items-center gap-1">
                  <Sparkles className="size-3 opacity-50" />
                  {currentWisdom.hint}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Host Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative rounded-2xl p-[2px]"
          style={{
            background: 'linear-gradient(135deg, #C9A96E, #E8D5B7, #C9A96E, #F5E6CC, #C9A96E)',
            backgroundSize: '300% 300%',
          }}
        >
          {/* Animated border glow */}
          <motion.div
            variants={borderGlow}
            initial="initial"
            animate="animate"
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #C9A96E, #E8D5B7, #C9A96E, #F5E6CC, #C9A96E)',
              backgroundSize: '300% 300%',
            }}
          />

          {/* Card content */}
          <motion.div
            variants={glowPulse}
            initial="initial"
            animate="animate"
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative rounded-2xl bg-[var(--app-bg-card)] p-6 md:p-8 overflow-hidden"
          >
            {/* Terminal-style top bar */}
            <div className="absolute top-0 left-0 right-0 h-7 bg-[var(--app-bg)]/80 border-b border-[var(--app-accent)]/10 flex items-center px-3 gap-1.5">
              <span className="size-2 rounded-full bg-red-400/60" />
              <span className="size-2 rounded-full bg-yellow-400/60" />
              <span className="size-2 rounded-full bg-green-400/60" />
              <span className="ml-2 text-[10px] font-mono text-[var(--app-accent)]/40 tracking-wider">piaoshu@philosophy ~ 120位哲人在线</span>
            </div>

            {/* Corner bracket decorations */}
            <div className="absolute top-7 left-0 w-4 h-4 border-l-2 border-t-2 border-[var(--app-accent)]/20 rounded-tl-2xl" />
            <div className="absolute top-7 right-0 w-4 h-4 border-r-2 border-t-2 border-[var(--app-accent)]/20 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-[var(--app-accent)]/20 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[var(--app-accent)]/20 rounded-br-2xl" />

            {/* Top row: Avatar + Info + Badge */}
            <div className="mt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 md:gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent)]/30 blur-sm opacity-50" />
                <Avatar className="size-20 md:size-24 border-3 border-[var(--app-accent)] relative z-10 bg-[var(--app-bg)]">
                  <AvatarImage src={host.avatarUrl} alt={host.nameCn} />
                  <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-accent)] font-serif font-bold text-2xl">
                    飘
                  </AvatarFallback>
                </Avatar>
                {/* Signature wrench emoji */}
                <div className="absolute -bottom-1 -right-1 z-20 bg-[var(--app-bg-card)] rounded-full p-0.5">
                  <span className="text-lg" role="img" aria-label="wrench">🔩</span>
                </div>
                {/* Online indicator */}
                <div className="absolute top-0 right-0 z-20">
                  <span className="flex size-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50" />
                    <span className="relative inline-flex size-4 rounded-full bg-green-500 border-2 border-[var(--app-bg-card)]" />
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                {/* Name + Badge */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2">
                  <h3
                    className="text-2xl md:text-3xl font-serif font-bold text-[var(--app-text-primary)]"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    {host.nameCn}
                  </h3>
                  <Badge className="bg-[var(--app-accent)] text-white border-0 px-3 py-0.5 text-xs font-bold tracking-wider shadow-sm shrink-0">
                    主理人
                  </Badge>
                </div>

                {/* Subtitle with warm personality */}
                <p className="text-sm text-[var(--app-accent)] font-medium mb-2 tracking-wide">
                  融汇120位东西方哲人智慧的向导
                </p>

                {/* Warm intro text */}
                <p className="text-[var(--app-text-secondary)] leading-relaxed mb-3 max-w-lg text-sm">
                  你好，我是飘叔。无论你正经历什么困惑——选择、焦虑、关系、意义——都不要一个人扛。
                  让我们一起，用两千年的哲学智慧，为你的烦恼找一个更清晰的答案。
                </p>

                {/* Tagline */}
                <p className="text-[var(--app-text-secondary)] leading-relaxed mb-4 max-w-lg italic text-sm">
                  {host.tagline}
                </p>

                {/* Quote */}
                <div className="relative inline-block mb-5">
                  <div className="absolute -left-3 -top-1 text-[var(--app-accent)] opacity-20 text-3xl font-serif leading-none">&ldquo;</div>
                  <p
                    className="text-base md:text-lg font-serif italic text-[var(--app-text-primary)] pl-4 pr-2"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    {host.quote}
                  </p>
                  {host.quoteSource && (
                    <p className="text-xs text-[var(--app-text-muted)] mt-1 pl-4">
                      —— {host.quoteSource}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--app-accent)]/30 to-transparent my-5" />

            {/* Belief badges */}
            <motion.div
              variants={badgeStagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-wrap gap-2 justify-center mb-5"
            >
              {beliefs.map((belief) => (
                <motion.span
                  key={belief}
                  variants={badgeItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-[var(--app-bg)] border-[var(--app-accent)]/20 text-[var(--app-accent)] hover:border-[var(--app-accent)]/40 transition-colors"
                >
                  <Wrench className="size-3 opacity-60" />
                  {belief}
                </motion.span>
              ))}
            </motion.div>

            {/* Skills badges - tech/terminal style */}
            <motion.div
              variants={badgeStagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex flex-wrap gap-2 justify-center mb-5"
            >
              <span className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] font-mono mr-1">
                <Terminal className="size-3" />
                核心技能
              </span>
              {skills.map((skill) => {
                const Icon = skill.icon
                return (
                  <motion.span
                    key={skill.label}
                    variants={badgeItem}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium bg-[var(--app-bg)] border border-[var(--app-accent)]/15 text-[var(--app-text-secondary)] hover:border-[var(--app-accent)]/35 hover:text-[var(--app-accent)] transition-colors"
                  >
                    <Icon className="size-3 opacity-50" />
                    {skill.label}
                  </motion.span>
                )
              })}
            </motion.div>

            {/* 五级确定性 Legend */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs text-[var(--app-text-muted)] font-mono">
                <ShieldCheck className="size-3" />
                五级哲思确信体系
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {certaintyLevels.map((level) => (
                  <span
                    key={level.label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border"
                    style={{
                      color: level.color,
                      borderColor: `${level.color}33`,
                      backgroundColor: `${level.color}0D`,
                    }}
                    title={level.desc}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                    【{level.label}】
                  </span>
                ))}
              </div>
            </div>

            {/* CTA Button - Enhanced with interaction hint */}
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={handleChatWithHost}
                className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white px-8 py-5 text-base rounded-xl shadow-lg shadow-[var(--app-accent)]/20 transition-all hover:shadow-xl hover:shadow-[var(--app-accent)]/30 hover:-translate-y-0.5 min-h-[48px] font-medium"
              >
                <MessageCircle className="mr-2 size-4" />
                点击与飘叔对话
              </Button>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="flex items-center gap-1.5 text-xs text-[var(--app-text-muted)]"
              >
                <ChevronRight className="size-3 animate-pulse" />
                <span>随时开聊 · 哲学为人生烦恼找答案</span>
              </motion.p>
            </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Philosophical Wisdom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {[
            {
              icon: '🌿',
              title: '东方智慧',
              desc: '儒释道三家的圆融之道',
              quote: '知者不惑，仁者不忧，勇者不惧。',
            },
            {
              icon: '🏛️',
              title: '西方哲学',
              desc: '从古希腊到后现代的思辨',
              quote: '未经审视的人生不值得过。',
            },
            {
              icon: '🔮',
              title: '当下面临',
              desc: '用古智解答现代人的困惑',
              quote: '人生没有标准答案，但有更好的问题。',
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
              className="group relative rounded-xl p-4 bg-[var(--app-bg-card)]/50 border border-[var(--app-accent)]/10 hover:border-[var(--app-accent)]/25 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-serif font-bold text-[var(--app-text-primary)]" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-[var(--app-text-muted)] mb-2">{item.desc}</p>
              <p
                className="text-xs font-serif italic text-[var(--app-text-secondary)]"
                style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
              >
                &ldquo;{item.quote}&rdquo;
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
