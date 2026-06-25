'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Check, X, Crown, Sparkles, Star, ArrowLeft, ExternalLink, CreditCard, Smartphone, QrCode, Home, ToggleLeft, ToggleRight, HelpCircle, ChevronDown, Zap, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import ThemeToggle from '@/components/theme-toggle'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Plan {
  id: string
  name: string
  nameEn: string
  price: number
  priceDisplay: string
  features: string[]
  limitations: string[]
  cta: string
  popular: boolean
  paymentLink?: string
}

// Configurable payment links - change these to update payment URLs
const PAYMENT_CONFIG = {
  pro: {
    monthly: 'https://mp.weixin.qq.com/s/pro-subscription',
    annual: 'https://mp.weixin.qq.com/s/pro-annual-subscription',
  },
  premium: {
    monthly: 'https://mp.weixin.qq.com/s/premium-subscription',
    annual: 'https://mp.weixin.qq.com/s/premium-annual-subscription',
  },
}

// Annual pricing config (20% off monthly equivalent)
const ANNUAL_PRICING: Record<string, { monthlyPrice: number; annualPrice: number; monthlyEquivalent: number; savings: number; display: string }> = {
  pro: {
    monthlyPrice: 49,
    annualPrice: 470,
    monthlyEquivalent: 39,
    savings: 20,
    display: '¥470/年',
  },
  premium: {
    monthlyPrice: 99,
    annualPrice: 948,
    monthlyEquivalent: 79,
    savings: 20,
    display: '¥948/年',
  },
}

// Fallback plans with updated pricing and features
const fallbackPlans: Plan[] = [
  {
    id: 'free',
    name: '免费版',
    nameEn: 'Free',
    price: 0,
    priceDisplay: '免费',
    features: ['每天3次AI对话', '浏览全部哲学家', '参与性格测试', '查看哲学家推荐书单'],
    limitations: ['每日对话次数限制', '无法使用辩论场', '无法与飘叔深度对话', '无法查看详细分析'],
    cta: '免费使用',
    popular: false,
    paymentLink: '',
  },
  {
    id: 'pro',
    name: '专业版',
    nameEn: 'Pro',
    price: 4900,
    priceDisplay: '¥49/月',
    features: [
      '无限AI对话',
      '辩论场模式',
      '5位哲学家详细分析',
      '与飘叔深度对话',
      '对话历史云同步',
      '优先响应速度',
      '全部哲学家解锁',
    ],
    limitations: [],
    cta: '立即订阅',
    popular: true,
    paymentLink: PAYMENT_CONFIG.pro.monthly,
  },
  {
    id: 'premium',
    name: '旗舰版',
    nameEn: 'Premium',
    price: 9900,
    priceDisplay: '¥99/月',
    features: [
      '全部专业版功能',
      '优先AI响应速度',
      '专属深度内容',
      '每月直播问答',
      '自定义哲学家人格',
      '哲学思维训练营',
      '专属社群入口',
      '终身书单定制',
    ],
    limitations: [],
    cta: '尊享订阅',
    popular: false,
    paymentLink: PAYMENT_CONFIG.premium.monthly,
  },
]

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      scale: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      },
    },
  },
}

const heroVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
}

const decorativeLineVariants: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, delay: 0.2 },
  },
}

// FAQ Accordion Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-[var(--app-bg-card)]/60 rounded-xl border border-[var(--app-border)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left min-h-[48px] hover:bg-[var(--app-accent)]/5 transition-colors"
      >
        <HelpCircle className="size-4 text-[var(--app-accent)] shrink-0" />
        <span className="flex-1 text-sm font-medium text-[var(--app-text-primary)]">{question}</span>
        <ChevronDown
          className={`size-4 text-[var(--app-text-muted)] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-4 pt-0"
        >
          <p className="text-sm text-[var(--app-text-secondary)] pl-7 leading-relaxed">{answer}</p>
        </motion.div>
      )}
    </div>
  )
}

export default function SubscriptionView() {
  const { setView, user, isAuthenticated } = useAppStore()
  const { toast } = useToast()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [isAnnual, setIsAnnual] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | null>(null)

  const { data } = useQuery<{ plans: Plan[] }>({
    queryKey: ['subscription-plans'],
    queryFn: () => fetch('/api/subscription/plans').then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  })

  const plans = data?.plans || fallbackPlans

  const handleCTA = (plan: Plan) => {
    if (plan.id === 'free') {
      if (!isAuthenticated) {
        setView('login')
      }
      return
    }

    // For paid plans, need login first
    if (!isAuthenticated) {
      setView('login')
      return
    }

    // Show payment dialog
    setSelectedPlan(plan)
    setPaymentMethod(null)
    setShowPaymentDialog(true)
  }

  const getCTALabel = (plan: Plan) => {
    if (!isAuthenticated || !user) return plan.cta
    if (user.plan === plan.id) {
      return '当前方案'
    }
    return plan.cta
  }

  const isCurrentPlan = (planId: string) => {
    return isAuthenticated && user?.plan === planId
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Sparkles className="size-5" />
      case 'pro':
        return <Star className="size-5" />
      case 'premium':
        return <Crown className="size-5" />
      default:
        return <Sparkles className="size-5" />
    }
  }

  // Get the display price for a plan based on billing cycle
  const getDisplayPrice = (plan: Plan) => {
    if (plan.id === 'free') return plan.priceDisplay
    if (isAnnual && ANNUAL_PRICING[plan.id]) {
      return ANNUAL_PRICING[plan.id].display
    }
    return plan.priceDisplay
  }

  // Get payment link based on billing cycle
  const getPaymentLink = (planId: string) => {
    if (planId === 'free') return ''
    const config = PAYMENT_CONFIG[planId as keyof typeof PAYMENT_CONFIG]
    if (!config) return ''
    return isAnnual ? config.annual : config.monthly
  }

  // Gradient styles for cards
  const getCardGradient = (planId: string) => {
    switch (planId) {
      case 'pro':
        return 'from-[var(--app-accent)]/10 via-transparent to-[var(--app-accent)]/5'
      case 'premium':
        return 'from-[var(--app-accent)]/15 via-[var(--app-accent)]/5 to-[var(--app-accent)]/10'
      default:
        return ''
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="min-h-screen flex flex-col bg-[var(--app-bg)]"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--app-header-bg)] backdrop-blur-sm border-b border-[var(--app-border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('home')}
            className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] shrink-0 min-h-[44px] min-w-[44px]"
            aria-label="返回首页"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h3
              className="font-serif font-bold text-[var(--app-text-primary)] text-sm"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              订阅方案
            </h3>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Hero Section */}
        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-10 md:mb-14"
        >
          {/* Decorative top line */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <motion.div
              variants={decorativeLineVariants}
              initial="hidden"
              animate="visible"
              className="w-12 md:w-20 h-[1px] bg-[var(--app-accent)] opacity-50 origin-right"
            />
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.5, type: 'spring', stiffness: 200 }}
            >
              <Crown className="size-5 text-[var(--app-accent)]" />
            </motion.div>
            <motion.div
              variants={decorativeLineVariants}
              initial="hidden"
              animate="visible"
              className="w-12 md:w-20 h-[1px] bg-[var(--app-accent)] opacity-50 origin-left"
            />
          </div>

          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[var(--app-text-primary)] mb-4 leading-tight"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            解锁哲学的深度
          </h1>
          <p className="text-[var(--app-text-secondary)] text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            选择适合你的方案，让思想者为你的人生导航
          </p>

          {/* Monthly/Annual Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)]'}`}>
              按月付费
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex items-center w-12 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2"
              style={{ backgroundColor: isAnnual ? 'var(--app-accent)' : 'var(--app-border)' }}
              aria-label={isAnnual ? '切换到月付' : '切换到年付'}
              role="switch"
              aria-checked={isAnnual}
            >
              <span
                className={`inline-block size-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  isAnnual ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)]'}`}>
              按年付费
            </span>
            {isAnnual && (
              <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">
                省20%
              </Badge>
            )}
          </div>

          {/* Decorative bottom line */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] opacity-60" />
            <div className="w-8 h-[1px] bg-[var(--app-accent)] opacity-40" />
            <div className="w-2 h-2 rounded-full bg-[var(--app-accent)] opacity-80" />
            <div className="w-8 h-[1px] bg-[var(--app-accent)] opacity-40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] opacity-60" />
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 lg:gap-6 items-start"
        >
          {plans.map((plan) => {
            const popular = plan.popular
            const current = isCurrentPlan(plan.id)
            const annualInfo = ANNUAL_PRICING[plan.id]

            return (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`
                  relative rounded-2xl border overflow-hidden
                  transition-shadow duration-300
                  ${popular
                    ? 'border-[var(--app-accent)] shadow-xl shadow-[var(--app-accent)]/10 md:scale-105 md:z-10'
                    : 'border-[var(--app-border)] shadow-md'
                  }
                  ${current
                    ? 'ring-2 ring-[var(--app-accent)] ring-offset-2 ring-offset-[var(--app-bg)]'
                    : ''
                  }
                `}
              >
                {/* Popular badge */}
                {popular && (
                  <div className="absolute top-0 left-0 right-0 bg-[var(--app-accent)] text-white text-center py-1.5 text-xs font-bold tracking-wider z-10">
                    ✦ 最受欢迎 ✦
                  </div>
                )}

                {/* Gradient background for premium plans */}
                {plan.id !== 'free' && (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${getCardGradient(plan.id)} pointer-events-none`}
                  />
                )}

                {/* Card content */}
                <div
                  className={`
                    relative p-6 md:p-7
                    ${popular ? 'pt-10 md:pt-11' : ''}
                    bg-[var(--app-bg-card)]/80 backdrop-blur-sm
                  `}
                >
                  {/* Plan icon + name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`
                        flex items-center justify-center size-10 rounded-xl
                        ${popular
                          ? 'bg-[var(--app-accent)] text-white'
                          : plan.id === 'premium'
                            ? 'bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent)]/70 text-white'
                            : 'bg-[var(--app-accent)]/15 text-[var(--app-accent)]'
                        }
                      `}
                    >
                      {getPlanIcon(plan.id)}
                    </div>
                    <div>
                      <h3
                        className="font-serif font-bold text-lg text-[var(--app-text-primary)]"
                        style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                      >
                        {plan.name}
                      </h3>
                      <p className="text-xs text-[var(--app-text-muted)]">{plan.nameEn}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div
                      className="text-3xl md:text-4xl font-serif font-bold text-[var(--app-text-primary)]"
                      style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                    >
                      {getDisplayPrice(plan)}
                    </div>
                    {plan.price > 0 && isAnnual && annualInfo && (
                      <div className="mt-1">
                        <p className="text-xs text-[var(--app-text-muted)]">
                          约¥{annualInfo.monthlyEquivalent}/月 · 按年计费
                        </p>
                        <Badge className="mt-1 bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
                          年付省{annualInfo.savings}%
                        </Badge>
                      </div>
                    )}
                    {plan.price > 0 && !isAnnual && (
                      <p className="text-xs text-[var(--app-text-muted)] mt-1">按月计费，随时取消</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-full h-[1px] bg-[var(--app-border)] mb-5" />

                  {/* Features */}
                  <div className="space-y-3 mb-4">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="flex items-center justify-center size-5 rounded-full bg-[var(--app-accent)]/15 shrink-0 mt-0.5">
                          <Check className="size-3 text-[var(--app-accent)]" />
                        </div>
                        <span className="text-sm text-[var(--app-text-primary)] leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limitations */}
                  {plan.limitations.length > 0 && (
                    <div className="space-y-3 mb-5">
                      {plan.limitations.map((limitation, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="flex items-center justify-center size-5 rounded-full bg-[var(--app-text-muted)]/10 shrink-0 mt-0.5">
                            <X className="size-3 text-[var(--app-text-muted)]" />
                          </div>
                          <span className="text-sm text-[var(--app-text-muted)] leading-snug">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Spacer for cards without limitations */}
                  {plan.limitations.length === 0 && <div className="mb-2" />}

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleCTA(plan)}
                    disabled={current}
                    className={`
                      w-full min-h-[44px] rounded-xl font-bold text-sm
                      ${current
                        ? 'bg-[var(--app-bg-card)] text-[var(--app-text-muted)] border border-[var(--app-border)] cursor-default'
                        : popular
                          ? 'bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white shadow-lg shadow-[var(--app-accent)]/20'
                          : plan.id === 'premium'
                            ? 'bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-accent-hover)] hover:opacity-90 text-white shadow-lg shadow-[var(--app-accent)]/15'
                            : 'bg-[var(--app-accent)]/10 hover:bg-[var(--app-accent)]/20 text-[var(--app-accent)] border border-[var(--app-accent)]/30'
                      }
                    `}
                  >
                    {current ? '✓ 当前方案' : getCTALabel(plan)}
                  </Button>
                </div>

                {/* Premium decorative corner */}
                {plan.id === 'premium' && (
                  <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-28 h-28 origin-top-right rotate-45 translate-x-14 -translate-y-14 bg-[var(--app-accent)]/10" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </motion.div>

        {/* Payment Methods Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-10 md:mt-14"
        >
          <div className="text-center mb-6">
            <h3
              className="text-lg md:text-xl font-serif font-bold text-[var(--app-text-primary)] mb-2"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              安全便捷的支付方式
            </h3>
            <p className="text-sm text-[var(--app-text-muted)]">支持多种主流支付渠道</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {/* WeChat Pay */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--app-bg-card)]/60 border border-[var(--app-border)]">
              <svg className="size-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.307 4.28c-3.813 0-6.905 2.648-6.905 5.917 0 3.269 3.092 5.917 6.905 5.917a8.07 8.07 0 002.346-.348.67.67 0 01.556.076l1.467.858a.262.262 0 00.132.043.227.227 0 00.224-.228c0-.055-.023-.11-.038-.165l-.3-1.143a.46.46 0 01.165-.514C21.905 19.67 22.905 18.002 22.905 16.188c0-3.269-3.092-5.917-6.905-5.917v0zm-2.76 3.453c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921zm5.52 0c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921z"/>
              </svg>
              <span className="text-sm text-[var(--app-text-secondary)]">微信支付</span>
            </div>
            {/* Alipay */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--app-bg-card)]/60 border border-[var(--app-border)]">
              <svg className="size-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.422 15.358c-3.32-1.326-6.092-2.786-6.092-2.786s1.392-3.156 1.838-5.18h-4.428V5.866h5.338V4.652h-5.338V1.8h-2.55s-.229.025-.229.228v2.624H4.584v1.214h5.397v1.526H5.98v1.214h8.513c-.3 1.114-1.038 2.778-1.038 2.778s-3.714-1.492-6.234-1.492c-2.52 0-4.236 1.214-4.236 3.062 0 1.848 1.878 3.21 4.5 3.21 2.622 0 4.694-1.266 6.33-2.952 2.28 1.248 6.84 2.94 6.84 2.94l1.266-1.866-.4-.068zM8.72 17.712c-2.262 0-3.24-1.014-3.24-2.046 0-1.092 1.14-1.944 2.892-1.944 1.752 0 3.888.798 3.888.798-1.428 1.92-2.67 3.192-3.54 3.192z"/>
              </svg>
              <span className="text-sm text-[var(--app-text-secondary)]">支付宝</span>
            </div>
            {/* Credit Card */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--app-bg-card)]/60 border border-[var(--app-border)]">
              <CreditCard className="size-6 text-[var(--app-accent)]" />
              <span className="text-sm text-[var(--app-text-secondary)]">银行卡</span>
            </div>
          </div>
        </motion.div>

        {/* Testimonial / Philosophical Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-center mt-12 md:mt-16 mb-6"
        >
          <div className="max-w-lg mx-auto bg-[var(--app-bg-card)]/50 rounded-2xl border border-[var(--app-border)] p-6 md:p-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-[1px] bg-[var(--app-accent)] opacity-30" />
              <Sparkles className="size-4 text-[var(--app-accent)] opacity-60" />
              <div className="w-8 h-[1px] bg-[var(--app-accent)] opacity-30" />
            </div>
            <p
              className="text-[var(--app-text-secondary)] text-base md:text-lg italic font-serif leading-relaxed"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              &ldquo;教育不是灌输，而是点燃火焰。真正的智慧，在于认识到自己的无知。&rdquo;
            </p>
            <p className="text-sm text-[var(--app-text-muted)] mt-3 font-serif" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              —— 苏格拉底
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-1 h-1 rounded-full bg-[var(--app-accent)] opacity-30" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] opacity-50" />
              <div className="w-1 h-1 rounded-full bg-[var(--app-accent)] opacity-30" />
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="max-w-2xl mx-auto mt-12 md:mt-16 mb-8"
        >
          <h2
            className="text-xl md:text-2xl font-serif font-bold text-[var(--app-text-primary)] text-center mb-6"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            常见问题
          </h2>
          <div className="space-y-3">
            {[
              {
                q: '可以随时取消吗？',
                a: '是的，随时取消，无额外费用。取消后当前计费周期内仍可使用全部功能。',
              },
              {
                q: '免费版有什么限制？',
                a: '每天3次AI对话，无法使用辩论场、飘叔深度对话和哲学家详细分析功能。',
              },
              {
                q: '专业版和旗舰版有什么区别？',
                a: '专业版包含无限对话、辩论场和5位哲学家详细分析；旗舰版额外包含优先AI响应、专属内容和每月直播问答等高级功能。',
              },
              {
                q: '支付安全吗？',
                a: '我们使用微信支付和支付宝，全程加密，7天无理由退款。',
              },
            ].map((faq, idx) => (
              <FAQItem key={idx} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </motion.div>

        {/* Trust section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="text-center mt-4 mb-8"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-[var(--app-text-muted)]">
            <div className="flex items-center gap-1.5">
              <Shield className="size-3.5 text-[var(--app-accent)]" />
              <span>7天无理由退款</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="size-3.5 text-[var(--app-accent)]" />
              <span>随时取消订阅</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="size-3.5 text-[var(--app-accent)]" />
              <span>安全支付保障</span>
            </div>
          </div>

          {/* Return to home link */}
          <div className="mt-6">
            <button
              onClick={() => setView('home')}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--app-accent)] hover:text-[var(--app-accent-hover)] transition-colors"
            >
              <Home className="size-4" />
              返回首页
            </button>
          </div>
        </motion.div>
      </div>
      </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-[var(--app-bg-card)] border-[var(--app-border)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className="font-serif text-[var(--app-text-primary)]"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              订阅{selectedPlan?.name}
            </DialogTitle>
            <DialogDescription className="text-[var(--app-text-secondary)]">
              {selectedPlan && getDisplayPrice(selectedPlan)} · {isAnnual ? '按年计费' : '按月计费'}，随时取消
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Plan summary */}
            <div className="bg-[var(--app-bg)] rounded-xl p-4 border border-[var(--app-border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--app-text-secondary)]">方案</span>
                <span className="font-serif font-bold text-[var(--app-text-primary)]" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                  {selectedPlan?.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--app-text-secondary)]">金额</span>
                <span className="text-xl font-serif font-bold text-[var(--app-accent)]" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
                  {selectedPlan && getDisplayPrice(selectedPlan)}
                </span>
              </div>
              {isAnnual && selectedPlan && ANNUAL_PRICING[selectedPlan.id] && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[var(--app-text-muted)]">月均</span>
                  <span className="text-sm text-[var(--app-text-secondary)]">
                    ¥{ANNUAL_PRICING[selectedPlan.id].monthlyEquivalent}/月
                  </span>
                </div>
              )}
            </div>

            {/* Payment methods */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--app-text-primary)]">选择支付方式</p>

              {/* WeChat Pay */}
              <button
                onClick={() => setPaymentMethod('wechat')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[48px] ${
                  paymentMethod === 'wechat'
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/5'
                    : 'border-[var(--app-border)] bg-[var(--app-bg)] hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)]/5'
                }`}
              >
                <div className="size-10 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                  <svg className="size-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.307 4.28c-3.813 0-6.905 2.648-6.905 5.917 0 3.269 3.092 5.917 6.905 5.917a8.07 8.07 0 002.346-.348.67.67 0 01.556.076l1.467.858a.262.262 0 00.132.043.227.227 0 00.224-.228c0-.055-.023-.11-.038-.165l-.3-1.143a.46.46 0 01.165-.514C21.905 19.67 22.905 18.002 22.905 16.188c0-3.269-3.092-5.917-6.905-5.917v0zm-2.76 3.453c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921zm5.52 0c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[var(--app-text-primary)]">微信支付</p>
                  <p className="text-xs text-[var(--app-text-muted)]">推荐 · 扫码或跳转支付</p>
                </div>
                {paymentMethod === 'wechat' && (
                  <Check className="size-4 text-[var(--app-accent)]" />
                )}
              </button>

              {/* Alipay */}
              <button
                onClick={() => setPaymentMethod('alipay')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all min-h-[48px] ${
                  paymentMethod === 'alipay'
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/5'
                    : 'border-[var(--app-border)] bg-[var(--app-bg)] hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)]/5'
                }`}
              >
                <div className="size-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <svg className="size-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.422 15.358c-3.32-1.326-6.092-2.786-6.092-2.786s1.392-3.156 1.838-5.18h-4.428V5.866h5.338V4.652h-5.338V1.8h-2.55s-.229.025-.229.228v2.624H4.584v1.214h5.397v1.526H5.98v1.214h8.513c-.3 1.114-1.038 2.778-1.038 2.778s-3.714-1.492-6.234-1.492c-2.52 0-4.236 1.214-4.236 3.062 0 1.848 1.878 3.21 4.5 3.21 2.622 0 4.694-1.266 6.33-2.952 2.28 1.248 6.84 2.94 6.84 2.94l1.266-1.866-.4-.068zM8.72 17.712c-2.262 0-3.24-1.014-3.24-2.046 0-1.092 1.14-1.944 2.892-1.944 1.752 0 3.888.798 3.888.798-1.428 1.92-2.67 3.192-3.54 3.192z"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[var(--app-text-primary)]">支付宝</p>
                  <p className="text-xs text-[var(--app-text-muted)]">扫码或跳转支付</p>
                </div>
                {paymentMethod === 'alipay' && (
                  <Check className="size-4 text-[var(--app-accent)]" />
                )}
              </button>
            </div>

            {/* QR Code Placeholder Area */}
            {paymentMethod && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <div className="bg-[var(--app-bg)] rounded-xl border border-[var(--app-border)] p-4">
                  <div className="flex flex-col items-center gap-3">
                    {/* QR Code placeholder */}
                    <div className="w-40 h-40 rounded-xl border-2 border-dashed border-[var(--app-border)] flex flex-col items-center justify-center bg-[var(--app-bg-card)]">
                      <QrCode className="size-12 text-[var(--app-text-muted)] mb-2" />
                      <p className="text-xs text-[var(--app-text-muted)] font-medium">扫码支付</p>
                    </div>
                    <p className="text-xs text-[var(--app-text-muted)]">
                      {paymentMethod === 'wechat' ? '请使用微信扫描二维码完成支付' : '请使用支付宝扫描二维码完成支付'}
                    </p>
                  </div>
                </div>

                {/* Or open payment link */}
                <Button
                  onClick={() => {
                    const link = selectedPlan ? getPaymentLink(selectedPlan.id) : ''
                    if (link) {
                      window.open(link, '_blank')
                    }
                    setShowPaymentDialog(false)
                    toast({
                      title: '正在跳转支付',
                      description: '请在支付页面完成付款后返回',
                    })
                  }}
                  className="w-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white h-11 rounded-xl"
                >
                  <ExternalLink className="size-4 mr-2" />
                  打开支付链接
                </Button>
              </motion.div>
            )}

            {/* Trust note */}
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--app-text-muted)] pt-2">
              <div className="flex items-center gap-1">
                <Shield className="size-3 text-[var(--app-accent)]" />
                <span>7天退款</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="size-3 text-[var(--app-accent)]" />
                <span>随时取消</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="size-3 text-[var(--app-accent)]" />
                <span>安全支付</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
