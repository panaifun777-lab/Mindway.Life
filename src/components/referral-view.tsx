'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Gift,
  Users,
  Coins,
  Copy,
  Check,
  Share2,
  RefreshCw,
  TrendingUp,
  Loader2,
  Award,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import ThemeToggle from '@/components/theme-toggle'

interface ReferralInfo {
  referralCode: string
  referralLink: string
  totalReferrals: number
  activeReferrals: number
  totalCommission: number // 单位：分
  recentReferrals: Array<{
    id: string
    status: string
    commission: number
    createdAt: string
    paidAt: string | null
  }>
}

const REFERRAL_REWARD_TOKENS = 10 // 推荐成功即时奖励
const COMMISSION_RATE = 0.1 // 10%

// 从 URL 中读取 ?ref=xxx 邀请码（用于首次注册场景）
function useReferralCodeFromUrl(): string | null {
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) setCode(ref)
  }, [])
  return code
}

export default function ReferralView() {
  const { setView, user } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [binding, setBinding] = useState(false)
  const urlRefCode = useReferralCodeFromUrl()

  const { data, isLoading } = useQuery({
    queryKey: ['referral'],
    queryFn: async () => {
      const res = await fetch('/api/referral')
      if (!res.ok) throw new Error('加载失败')
      return res.json()
    },
    enabled: !!user,
  })

  const info: ReferralInfo | null = data ?? null
  // 用户是否已绑定邀请人（referredBy 非空）
  const hasReferredBy = !!(user as any)?.referredBy

  // ============================================================
  // 绑定邀请关系（仅当 URL 有 ref 且未绑定时）
  // ============================================================
  useEffect(() => {
    if (!user || !urlRefCode || hasReferredBy) return
    setBinding(true)
    fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signup', code: urlRefCode }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok && data.success && !data.alreadyTracked) {
          toast({
            title: '邀请码已绑定',
            description: `你已成功接受邀请`,
          })
          // 清理 URL 中的 ref 参数
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.delete('ref')
            window.history.replaceState({}, '', url.toString())
          }
        }
      })
      .catch(() => {
        /* 静默 */
      })
      .finally(() => setBinding(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, urlRefCode, hasReferredBy])

  const handleCopyLink = async () => {
    if (!info?.referralLink) return
    try {
      await navigator.clipboard.writeText(info.referralLink)
      setCopied(true)
      toast({
        title: '链接已复制',
        description: '快去分享给好友吧',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: '复制失败',
        description: '请手动复制链接',
        variant: 'destructive',
      })
    }
  }

  const handleShare = async () => {
    if (!info?.referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mindway.Life - 哲学为人生烦恼找答案',
          text: `我用这个 App 与 120 位哲学家对话，邀请你也来体验。我的邀请码：${info.referralCode}`,
          url: info.referralLink,
        })
      } catch {
        /* 用户取消 */
      }
    } else {
      handleCopyLink()
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: '重置失败',
          description: data.error || '请稍后重试',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: '邀请码已重置',
        description: '请使用新的邀请码继续推广',
      })
      queryClient.invalidateQueries({ queryKey: ['referral'] })
    } catch {
      toast({
        title: '网络错误',
        description: '请检查网络后重试',
        variant: 'destructive',
      })
    } finally {
      setRegenerating(false)
    }
  }

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[var(--app-bg)] flex flex-col"
      >
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
              推广联盟
            </h1>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-[var(--app-text-secondary)] mb-4">
              请先登录以查看推广信息
            </p>
            <Button
              onClick={() => setView('login')}
              className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white"
            >
              立即登录
            </Button>
          </div>
        </div>
      </motion.div>
    )
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
            推广联盟
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {binding && (
          <div className="bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/30 rounded-xl p-3 flex items-center gap-2 text-sm text-[var(--app-accent)]">
            <Loader2 className="size-4 animate-spin" />
            正在绑定邀请关系...
          </div>
        )}

        {/* Hero: 邀请码与链接 */}
        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-[var(--app-accent)]/15 to-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Gift className="size-5 text-[var(--app-accent)]" />
            <h2
              className="font-serif font-bold text-[var(--app-text-primary)]"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              邀请好友 · 双方受益
            </h2>
          </div>
          <p className="text-sm text-[var(--app-text-secondary)] mb-4 leading-relaxed">
            分享你的专属邀请码，好友注册即可让你获得{' '}
            <span className="text-[var(--app-accent)] font-medium">
              {REFERRAL_REWARD_TOKENS} Token
            </span>{' '}
            奖励。好友后续消费，你还可获得{' '}
            <span className="text-[var(--app-accent)] font-medium">
              {(COMMISSION_RATE * 100).toFixed(0)}%
            </span>{' '}
            佣金。
          </p>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-6 animate-spin text-[var(--app-accent)]" />
            </div>
          ) : info ? (
            <>
              {/* 邀请码 */}
              <div className="bg-[var(--app-bg)] rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--app-text-muted)]">
                    我的邀请码
                  </span>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] flex items-center gap-1 disabled:opacity-50"
                  >
                    {regenerating ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    重置
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-2xl font-serif font-bold tracking-widest text-[var(--app-accent)]"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    {info.referralCode}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="border-[var(--app-accent)]/30 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10"
                  >
                    {copied ? (
                      <Check className="size-3.5 mr-1" />
                    ) : (
                      <Copy className="size-3.5 mr-1" />
                    )}
                    {copied ? '已复制' : '复制链接'}
                  </Button>
                </div>
              </div>

              {/* 邀请链接 */}
              <div className="bg-[var(--app-bg)] rounded-xl p-3 mb-3">
                <p className="text-xs text-[var(--app-text-muted)] mb-1">
                  邀请链接
                </p>
                <p className="text-xs text-[var(--app-text-secondary)] truncate">
                  {info.referralLink}
                </p>
              </div>

              {/* 分享按钮 */}
              <Button
                onClick={handleShare}
                className="w-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white h-11 rounded-xl"
              >
                <Share2 className="size-4 mr-2" />
                立即分享给好友
              </Button>
            </>
          ) : null}
        </motion.section>

        {/* 统计卡片 */}
        {info && (
          <section className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Users className="size-5" />}
              label="累计邀请"
              value={info.totalReferrals}
              color="blue"
            />
            <StatCard
              icon={<TrendingUp className="size-5" />}
              label="活跃用户"
              value={info.activeReferrals}
              color="green"
            />
            <StatCard
              icon={<Coins className="size-5" />}
              label="累计佣金"
              value={`¥${(info.totalCommission / 100).toFixed(2)}`}
              color="orange"
            />
          </section>
        )}

        {/* 奖励规则 */}
        <section className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[var(--app-text-primary)] mb-3 flex items-center gap-2">
            <Award className="size-4 text-[var(--app-accent)]" />
            奖励规则
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-[var(--app-accent)]">
                  1
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[var(--app-text-primary)] font-medium">
                  好友注册即得 {REFERRAL_REWARD_TOKENS} Token
                </p>
                <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                  好友通过你的邀请码完成注册，立即奖励你 {REFERRAL_REWARD_TOKENS} 个 Token
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-[var(--app-accent)]">
                  2
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[var(--app-text-primary)] font-medium">
                  好友消费，你拿 {(COMMISSION_RATE * 100).toFixed(0)}% 佣金
                </p>
                <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                  好友每次购买 Token / 专栏 / 数字生命体，你都能获得订单金额的{' '}
                  {(COMMISSION_RATE * 100).toFixed(0)}% 作为佣金
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="size-6 rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-[var(--app-accent)]">
                  3
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[var(--app-text-primary)] font-medium">
                  佣金可提现
                </p>
                <p className="text-xs text-[var(--app-text-muted)] mt-0.5">
                  累计佣金满 ¥100 可申请提现，请联系 piaoshu@mindway.life
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 最近邀请记录 */}
        {info && info.recentReferrals.length > 0 && (
          <section>
            <h3
              className="text-lg font-serif font-bold text-[var(--app-text-primary)] mb-3"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              最近邀请记录
            </h3>
            <div className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl divide-y divide-[var(--app-border)]">
              {info.recentReferrals.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center">
                      <Users className="size-4 text-[var(--app-accent)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--app-text-primary)]">
                        {r.status === 'converted'
                          ? '已产生佣金'
                          : r.status === 'registered'
                          ? '已注册'
                          : r.status}
                      </p>
                      <p className="text-xs text-[var(--app-text-muted)]">
                        {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                        {r.paidAt && ` · 已结算`}
                      </p>
                    </div>
                  </div>
                  {r.commission > 0 ? (
                    <span
                      className="text-sm font-serif font-bold text-green-600"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      +¥{(r.commission / 100).toFixed(2)}
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[var(--app-text-muted)] border-[var(--app-border)]"
                    >
                      待转化
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA: 前往 Token 商店 */}
        <section className="bg-gradient-to-br from-[var(--app-accent)]/10 to-transparent border border-[var(--app-accent)]/20 rounded-2xl p-5 text-center">
          <p
            className="font-serif text-[var(--app-text-primary)] mb-2"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            想要更多 Token？
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setView('tokenshop')}
            className="border-[var(--app-accent)]/40 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10"
          >
            <ExternalLink className="size-3.5 mr-1" />
            前往 Token 商店
          </Button>
        </section>
      </main>
    </motion.div>
  )
}

// ============================================================
// 统计卡片子组件
// ============================================================
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'blue' | 'green' | 'orange'
}) {
  const colorMap = {
    blue: 'bg-blue-500/15 text-blue-600',
    green: 'bg-green-500/15 text-green-600',
    orange: 'bg-orange-500/15 text-orange-600',
  }
  return (
    <div className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-4 text-center">
      <div
        className={`size-10 mx-auto rounded-full flex items-center justify-center mb-2 ${colorMap[color]}`}
      >
        {icon}
      </div>
      <p
        className="text-xl font-serif font-bold text-[var(--app-text-primary)]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {value}
      </p>
      <p className="text-xs text-[var(--app-text-muted)] mt-0.5">{label}</p>
    </div>
  )
}
