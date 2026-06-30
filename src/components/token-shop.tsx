'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Coins,
  Sparkles,
  Crown,
  Loader2,
  TrendingUp,
  TrendingDown,
  Gift,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import ThemeToggle from '@/components/theme-toggle'

interface TokenPackage {
  id: string
  name: string
  price: number
  priceDisplay: string
  tokens: number
  description: string
  upgradePlan?: string
}

interface TokenTransaction {
  id: string
  type: string
  amount: number
  balance: number
  description: string
  createdAt: string
}

const TYPE_LABEL: Record<string, { label: string; positive: boolean }> = {
  welcome: { label: '欢迎赠礼', positive: true },
  purchase: { label: '购买', positive: true },
  consume: { label: '消费', positive: false },
  monthly_reset: { label: '月度重置', positive: true },
  referral_reward: { label: '推荐奖励', positive: true },
  signup_bonus: { label: '注册奖励', positive: true },
  activity_reward: { label: '活动奖励', positive: true },
  admin_grant: { label: '官方赠送', positive: true },
}

export default function TokenShop() {
  const { setView, user } = useAppStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [purchasing, setPurchasing] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const res = await fetch('/api/tokens')
      if (!res.ok) throw new Error('加载失败')
      return res.json()
    },
  })

  const handlePurchase = async (pkg: TokenPackage) => {
    if (!user) {
      setView('login')
      return
    }
    setPurchasing(pkg.id)
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
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
        title: '购买成功',
        description: data.message,
      })
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
    } catch {
      toast({
        title: '网络错误',
        description: '请检查网络后重试',
        variant: 'destructive',
      })
    } finally {
      setPurchasing(null)
    }
  }

  const balance = data?.balance ?? 0
  const plan = data?.plan ?? user?.plan ?? 'free'
  const transactions: TokenTransaction[] = data?.transactions ?? []
  const packages: TokenPackage[] = data?.packages ?? []
  const isPro = plan === 'pro' || plan === 'premium'

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
            Token 商店
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Balance Card */}
        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-br from-[var(--app-accent)]/15 to-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--app-text-muted)] mb-1">
                当前余额
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-4xl font-serif font-bold text-[var(--app-accent)]"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                >
                  {balance}
                </span>
                <span className="text-sm text-[var(--app-text-secondary)]">
                  Token
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-[var(--app-accent)]/30 text-[var(--app-accent)]"
                >
                  {plan === 'free' ? '免费版' : plan === 'pro' ? '专业版' : '旗舰版'}
                </Badge>
                {isPro && (
                  <span className="text-xs text-[var(--app-text-muted)]">
                    · 无限对话
                  </span>
                )}
              </div>
            </div>
            <div className="size-16 rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center">
              <Coins className="size-8 text-[var(--app-accent)]" />
            </div>
          </div>
        </motion.section>

        {/* Pricing Rules */}
        <section className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[var(--app-text-primary)] mb-3 flex items-center gap-2">
            <Zap className="size-4 text-[var(--app-accent)]" />
            Token 计费规则
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[var(--app-bg)] rounded-xl p-3">
              <p className="text-xs text-[var(--app-text-muted)]">单哲学家对话</p>
              <p className="text-lg font-serif font-bold text-[var(--app-text-primary)] mt-1">
                5
              </p>
            </div>
            <div className="bg-[var(--app-bg)] rounded-xl p-3">
              <p className="text-xs text-[var(--app-text-muted)]">辩论场</p>
              <p className="text-lg font-serif font-bold text-[var(--app-text-primary)] mt-1">
                15
              </p>
            </div>
            <div className="bg-[var(--app-bg)] rounded-xl p-3">
              <p className="text-xs text-[var(--app-text-muted)]">深度多智能体</p>
              <p className="text-lg font-serif font-bold text-[var(--app-text-primary)] mt-1">
                30
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--app-text-muted)] mt-3 leading-relaxed">
            · 免费用户每月赠送 100 Token，月初自动重置
            <br />
            · Pro / Premium 用户对话免 Token，由订阅承担
            <br />· 超长消息按字数加成（每 50 字 +1 Token）
          </p>
        </section>

        {/* Packages */}
        <section>
          <h3
            className="text-lg font-serif font-bold text-[var(--app-text-primary)] mb-4"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            充值套餐
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[var(--app-accent)]" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {packages.map((pkg) => {
                const isUpgrade = !!pkg.upgradePlan
                const isCurrentPro = isUpgrade && isPro
                return (
                  <motion.div
                    key={pkg.id}
                    whileHover={{ y: -2 }}
                    className={`relative bg-[var(--app-bg-card)] border-2 rounded-2xl p-5 transition-all ${
                      isUpgrade
                        ? 'border-[var(--app-accent)]/40 shadow-lg shadow-[var(--app-accent)]/10'
                        : 'border-[var(--app-border)]'
                    }`}
                  >
                    {isUpgrade && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <Badge className="bg-[var(--app-accent)] text-white">
                          <Sparkles className="size-3 mr-1" />
                          推荐
                        </Badge>
                      </div>
                    )}
                    <div className="text-center pt-2">
                      <div className="size-12 mx-auto rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center mb-3">
                        {isUpgrade ? (
                          <Crown className="size-6 text-[var(--app-accent)]" />
                        ) : (
                          <Coins className="size-6 text-[var(--app-accent)]" />
                        )}
                      </div>
                      <h4
                        className="font-serif font-bold text-[var(--app-text-primary)]"
                        style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                      >
                        {pkg.name}
                      </h4>
                      <div className="my-3">
                        <span
                          className="text-3xl font-serif font-bold text-[var(--app-accent)]"
                          style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                        >
                          {pkg.priceDisplay}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--app-text-secondary)] leading-relaxed mb-4">
                        {pkg.description}
                      </p>
                      <Button
                        onClick={() => handlePurchase(pkg)}
                        disabled={purchasing === pkg.id || isCurrentPro}
                        className={`w-full h-11 rounded-xl ${
                          isUpgrade
                            ? 'bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white'
                            : 'bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)]'
                        }`}
                      >
                        {purchasing === pkg.id ? (
                          <Loader2 className="size-4 mr-1 animate-spin" />
                        ) : null}
                        {isCurrentPro
                          ? '已是 Pro 用户'
                          : isUpgrade
                          ? '立即升级'
                          : '立即购买'}
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent Transactions */}
        <section>
          <h3
            className="text-lg font-serif font-bold text-[var(--app-text-primary)] mb-4"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            最近流水
          </h3>
          <div className="bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-2xl divide-y divide-[var(--app-border)]">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--app-text-muted)]">
                暂无交易记录
              </div>
            ) : (
              transactions.map((tx) => {
                const meta = TYPE_LABEL[tx.type] || {
                  label: tx.type,
                  positive: tx.amount > 0,
                }
                const positive = meta.positive
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                          positive
                            ? 'bg-green-500/15 text-green-600'
                            : 'bg-orange-500/15 text-orange-600'
                        }`}
                      >
                        {positive ? (
                          <TrendingUp className="size-4" />
                        ) : (
                          <TrendingDown className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--app-text-primary)] truncate">
                          {tx.description || meta.label}
                        </p>
                        <p className="text-xs text-[var(--app-text-muted)]">
                          {new Date(tx.createdAt).toLocaleString('zh-CN')} ·
                          余额 {tx.balance}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-serif font-bold shrink-0 ml-3 ${
                        positive
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {positive ? '+' : ''}
                      {tx.amount}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Referral CTA */}
        <section className="bg-gradient-to-br from-[var(--app-accent)]/10 to-transparent border border-[var(--app-accent)]/20 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-full bg-[var(--app-accent)]/15 flex items-center justify-center shrink-0">
              <Gift className="size-5 text-[var(--app-accent)]" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[var(--app-text-primary)] mb-1">
                邀请好友，赚取 Token
              </h4>
              <p className="text-xs text-[var(--app-text-secondary)] mb-3 leading-relaxed">
                每成功邀请一位好友注册，立即获得 10 Token 奖励。好友消费还可获得 10% 佣金。
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setView('referral')}
                className="border-[var(--app-accent)]/40 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10"
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                前往推广联盟
              </Button>
            </div>
          </div>
        </section>
      </main>
    </motion.div>
  )
}
