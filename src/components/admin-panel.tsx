'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, MessageSquare, CreditCard, AlertTriangle, LogOut, Loader2, TrendingUp, DollarSign, Activity, Phone, Settings, BarChart3, Save, CheckCircle2, KeyRound, Megaphone, Mail, Plus, RefreshCw, Trash2, Ticket, Power, PowerOff, BookOpen, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  plan: string
}

interface Stats {
  users: { total: number; pro: number; premium: number; free: number; today: number; dailyNew: Record<string, number> }
  conversations: { total: number; today: number }
  messages: { total: number; user: number; assistant: number; today: number }
  subscriptions: { active: number; pending: number; revenue: number }
  crisis: { total: number; severe: number; unresolved: number }
  philosophers: { total: number; hosts: number }
  insights: number
  recentConversations: Array<{ id: string; philosopherName: string; philosopherAvatar: string; messageCount: number; createdAt: string; mode: string }>
}

interface SiteConfig {
  id: string
  siteName: string
  announcement: string
  bannerText: string
  bannerEnabled: boolean
  contactEmail: string
  llmProvider: 'zhipu' | 'deepseek' | 'zai'
  zhipuApiKey: string
  deepseekApiKey: string
  zhipuApiKeySet: boolean
  deepseekApiKeySet: boolean
  updatedAt?: string
}

interface Coupon {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  planId: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  active: boolean
  createdAt: string
}

interface Analytics {
  generatedAt: string
  dailyConversationTrend: Array<{ date: string; count: number }>
  dailyMessageTrend: Array<{ date: string; count: number }>
  topPhilosophers: Array<{
    rank: number
    philosopherId: string
    name: string
    nameEn: string
    avatarUrl: string
    era: string
    category: string
    conversationCount: number
  }>
  retention: {
    d1: { rate: number; retained: number; eligible: number }
    d7: { rate: number; retained: number; eligible: number }
    d30: { rate: number; retained: number; eligible: number }
  }
  funnel: {
    registered: number
    conversed: number
    subscribed: number
    convRateRegToConv: number
    convRateConvToSub: number
    convRateOverall: number
  }
  apiCost: {
    totalMessages: number
    userMessages: number
    assistantMessages: number
    costPerMessage: number
    estimatedCostCny: number
  }
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'subscriptions' | 'marketing' | 'crisis' | 'settings' | 'analytics' | 'philosophers'>('dashboard')
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [crisisLogs, setCrisisLogs] = useState<any[]>([])
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
  const [configForm, setConfigForm] = useState<{
    siteName: string
    announcement: string
    bannerText: string
    bannerEnabled: boolean
    contactEmail: string
    llmProvider: 'zhipu' | 'deepseek' | 'zai'
    zhipuApiKey: string
    deepseekApiKey: string
  }>({
    siteName: '',
    announcement: '',
    bannerText: '',
    bannerEnabled: false,
    contactEmail: '',
    llmProvider: 'zhipu',
    zhipuApiKey: '',
    deepseekApiKey: '',
  })
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [configError, setConfigError] = useState('')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(false)
  const [couponFormOpen, setCouponFormOpen] = useState(false)
  const [couponForm, setCouponForm] = useState<{
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: string
    planId: string
    maxUses: string
    expiresAt: string
  }>({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    planId: '',
    maxUses: '100',
    expiresAt: '',
  })
  const [couponSubmitting, setCouponSubmitting] = useState(false)
  const [couponError, setCouponError] = useState('')

  // ===== 哲学家管理状态 =====
  type PhilosopherListItem = {
    id: string
    nameCn: string
    nameEn: string
    slug: string
    era: string
    category: string
    avatarUrl: string
    tagline: string
    order: number
    published: boolean
    isHost: boolean
    createdAt: string
    updatedAt: string
    _count?: { conversations: number }
  }
  const [philosophers, setPhilosophers] = useState<PhilosopherListItem[]>([])
  const [philosophersLoading, setPhilosophersLoading] = useState(false)
  const [philosophersPagination, setPhilosophersPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number }>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [philosopherSearch, setPhilosopherSearch] = useState('')
  const [philosopherEra, setPhilosopherEra] = useState('all')
  const [philosopherCategory, setPhilosopherCategory] = useState('all')
  const [editingPhilosopher, setEditingPhilosopher] = useState<any | null>(null)
  const [philosopherSaving, setPhilosopherSaving] = useState(false)
  const [philosopherError, setPhilosopherError] = useState('')
  const [deletingPhilosopher, setDeletingPhilosopher] = useState<PhilosopherListItem | null>(null)

  // 检查登录状态
  useEffect(() => {
    fetch('/api/admin/login').then(res => res.json()).then(data => {
      if (data.authenticated) {
        setAuthenticated(true)
        loadStats()
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (res.ok) {
        setAuthenticated(true)
        loadStats()
      } else {
        setLoginError(data.error || '登录失败')
      }
    } catch {
      setLoginError('网络错误')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' }).catch(() => {})
    document.cookie = 'admin_token=; path=/; max-age=0'
    setAuthenticated(false)
    setStats(null)
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) setStats(await res.json())
    } catch {}
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch {}
  }

  const loadSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubscriptions(data.subscriptions)
      }
    } catch {}
  }

  const loadCrisisLogs = async () => {
    try {
      const res = await fetch('/api/admin/crisis-logs')
      if (res.ok) {
        const data = await res.json()
        setCrisisLogs(data.logs)
      }
    } catch {}
  }

  const loadSiteConfig = async () => {
    try {
      const res = await fetch('/api/admin/site-config')
      if (res.ok) {
        const data = await res.json()
        const cfg = data.config as SiteConfig
        setSiteConfig(cfg)
        setConfigForm({
          siteName: cfg.siteName || '',
          announcement: cfg.announcement || '',
          bannerText: cfg.bannerText || '',
          bannerEnabled: !!cfg.bannerEnabled,
          contactEmail: cfg.contactEmail || '',
          llmProvider: cfg.llmProvider || 'zhipu',
          zhipuApiKey: cfg.zhipuApiKey || '',
          deepseekApiKey: cfg.deepseekApiKey || '',
        })
      }
    } catch {}
  }

  const saveSiteConfig = async () => {
    setConfigSaving(true)
    setConfigSaved(false)
    setConfigError('')
    try {
      const res = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      })
      const data = await res.json()
      if (res.ok) {
        const cfg = data.config as SiteConfig
        setSiteConfig(cfg)
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
      } else {
        setConfigError(data.error || '保存失败')
      }
    } catch {
      setConfigError('网络错误')
    } finally {
      setConfigSaving(false)
    }
  }

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const res = await fetch('/api/admin/analytics')
      if (res.ok) setAnalytics(await res.json())
    } catch {} finally {
      setAnalyticsLoading(false)
    }
  }

  const loadCoupons = async () => {
    setCouponsLoading(true)
    try {
      const res = await fetch('/api/admin/coupons')
      if (res.ok) {
        const data = await res.json()
        setCoupons(data.coupons || [])
      }
    } catch {} finally {
      setCouponsLoading(false)
    }
  }

  const generateCouponCode = () => {
    // 生成 8 位随机优惠码（大写字母+数字，去除易混淆字符）
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCouponForm(prev => ({ ...prev, code }))
  }

  const submitCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setCouponError('')
    if (!couponForm.code.trim()) {
      setCouponError('请填写或生成优惠码')
      return
    }
    if (couponForm.code.trim().length < 3) {
      setCouponError('优惠码至少需要 3 个字符')
      return
    }
    const dv = Number(couponForm.discountValue)
    if (!Number.isFinite(dv) || dv <= 0) {
      setCouponError('请输入有效的折扣值')
      return
    }
    if (couponForm.discountType === 'percentage' && dv > 100) {
      setCouponError('百分比折扣不能超过 100')
      return
    }
    setCouponSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        code: couponForm.code.trim(),
        discountType: couponForm.discountType,
        discountValue: dv,
        planId: couponForm.planId,
        maxUses: Number(couponForm.maxUses) > 0 ? Number(couponForm.maxUses) : 100,
      }
      if (couponForm.expiresAt) {
        payload.expiresAt = new Date(couponForm.expiresAt).toISOString()
      }
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setCouponFormOpen(false)
        setCouponForm({
          code: '',
          discountType: 'percentage',
          discountValue: '',
          planId: '',
          maxUses: '100',
          expiresAt: '',
        })
        await loadCoupons()
      } else {
        setCouponError(data.error || '创建失败')
      }
    } catch {
      setCouponError('网络错误')
    } finally {
      setCouponSubmitting(false)
    }
  }

  const toggleCouponActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !coupon.active }),
      })
      if (res.ok) {
        await loadCoupons()
      }
    } catch {}
  }

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm(`确定要删除优惠码 "${coupon.code}" 吗？此操作不可撤销。`)) return
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadCoupons()
      }
    } catch {}
  }

  // ===== 哲学家管理操作 =====
  const loadPhilosophers = async () => {
    setPhilosophersLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(philosophersPagination.page))
      params.set('pageSize', String(philosophersPagination.pageSize))
      if (philosopherSearch.trim()) params.set('search', philosopherSearch.trim())
      if (philosopherEra && philosopherEra !== 'all') params.set('era', philosopherEra)
      if (philosopherCategory && philosopherCategory !== 'all') params.set('category', philosopherCategory)
      const res = await fetch(`/api/admin/philosophers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPhilosophers(data.philosophers || [])
        setPhilosophersPagination(data.pagination || { page: 1, pageSize: 50, total: 0, totalPages: 1 })
      }
    } catch {} finally {
      setPhilosophersLoading(false)
    }
  }

  const updateEditingField = (field: string, value: any) => {
    setEditingPhilosopher(prev => (prev ? { ...prev, [field]: value } : prev))
  }

  const openCreatePhilosopher = () => {
    setPhilosopherError('')
    setEditingPhilosopher({
      nameCn: '',
      nameEn: '',
      slug: '',
      era: '古典',
      category: '综合类',
      tagline: '',
      bioSummary: '',
      coreInsight: '',
      description: '',
      systemPrompt: '',
      quote: '',
      quoteSource: '',
      works: '',
      worries: '',
      avatarUrl: '',
      order: 0,
      published: true,
      isHost: false,
    })
  }

  const openEditPhilosopher = async (p: PhilosopherListItem) => {
    setPhilosopherError('')
    try {
      const res = await fetch(`/api/admin/philosophers/${p.id}`)
      if (res.ok) {
        const data = await res.json()
        setEditingPhilosopher(data.philosopher)
        return
      }
    } catch {}
    // 兜底使用列表项数据
    setEditingPhilosopher({ ...p })
  }

  const savePhilosopher = async () => {
    if (!editingPhilosopher) return
    setPhilosopherSaving(true)
    setPhilosopherError('')
    try {
      const payload: any = { ...editingPhilosopher }
      // 剔除不可写字段
      delete payload._count
      delete payload.createdAt
      delete payload.updatedAt
      const isEdit = !!payload.id
      const id = payload.id
      delete payload.id
      const url = isEdit ? `/api/admin/philosophers/${id}` : '/api/admin/philosophers'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setEditingPhilosopher(null)
        loadPhilosophers()
      } else {
        setPhilosopherError(data.error || '保存失败')
      }
    } catch {
      setPhilosopherError('网络错误')
    } finally {
      setPhilosopherSaving(false)
    }
  }

  const deletePhilosopher = async (p: PhilosopherListItem | null) => {
    if (!p) return
    setPhilosopherSaving(true)
    setPhilosopherError('')
    try {
      const res = await fetch(`/api/admin/philosophers/${p.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDeletingPhilosopher(null)
        loadPhilosophers()
      } else {
        setPhilosopherError(data.error || '删除失败')
        setDeletingPhilosopher(null)
      }
    } catch {
      setPhilosopherError('网络错误')
      setDeletingPhilosopher(null)
    } finally {
      setPhilosopherSaving(false)
    }
  }

  useEffect(() => {
    if (authenticated) {
      if (activeTab === 'users') loadUsers()
      else if (activeTab === 'subscriptions') loadSubscriptions()
      else if (activeTab === 'marketing') {
        loadCoupons()
        if (!stats) loadStats()
      }
      else if (activeTab === 'crisis') loadCrisisLogs()
      else if (activeTab === 'settings') loadSiteConfig()
      else if (activeTab === 'analytics') loadAnalytics()
      else if (activeTab === 'philosophers') {
        // 由专门的筛选 useEffect 处理（含首次加载）
      }
      else loadStats()
    }
  }, [activeTab, authenticated])

  // 哲学家列表筛选/搜索/分页变化时重新加载（含 tab 切换首次加载）
  useEffect(() => {
    if (!authenticated || activeTab !== 'philosophers') return
    const h = setTimeout(() => {
      loadPhilosophers()
    }, 250)
    return () => clearTimeout(h)
  }, [authenticated, activeTab, philosopherSearch, philosopherEra, philosopherCategory, philosophersPagination.page, philosophersPagination.pageSize])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="size-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mindway 管理后台</h1>
            <p className="text-sm text-gray-500 mt-2">请输入管理员账号登录</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">管理员邮箱</label>
              <Input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="piaoshu@mindway.life"
                required
                className="h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">密码</label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>
            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{loginError}</div>
            )}
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white">
              登录管理后台
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>测试账号：piaoshu@mindway.life</p>
            <p>密码：Gai16999</p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <LayoutDashboard className="size-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Mindway 管理后台</h1>
              <p className="text-xs text-gray-500">mindway.life · 运营管理</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://mindway.life" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">访问前台</Button>
            </a>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4 mr-1" /> 退出
            </Button>
          </div>
        </div>
      </header>

      {/* Tab栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {[
            { id: 'dashboard', label: '数据概览', icon: TrendingUp },
            { id: 'analytics', label: '数据分析', icon: BarChart3 },
            { id: 'users', label: '用户管理', icon: Users },
            { id: 'philosophers', label: '哲学家管理', icon: BookOpen },
            { id: 'subscriptions', label: '订阅支付', icon: CreditCard },
            { id: 'marketing', label: '销售营销', icon: Megaphone },
            { id: 'crisis', label: '危机干预', icon: AlertTriangle },
            { id: 'settings', label: '系统设置', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="总用户数" value={stats.users.total} sub={`今日 +${stats.users.today}`} color="blue" />
              <StatCard icon={MessageSquare} label="对话总数" value={stats.conversations.total} sub={`今日 +${stats.conversations.today}`} color="green" />
              <StatCard icon={Activity} label="消息总数" value={stats.messages.total} sub={`今日 +${stats.messages.today}`} color="purple" />
              <StatCard icon={DollarSign} label="活跃订阅" value={stats.subscriptions.active} sub={`收入 ¥${(stats.subscriptions.revenue / 100).toFixed(2)}`} color="amber" />
            </div>

            {/* 用户分布 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">用户套餐分布</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">免费版</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400" style={{ width: `${(stats.users.free / stats.users.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">{stats.users.free}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">专业版 ¥49/月</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${(stats.users.pro / stats.users.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">{stats.users.pro}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">旗舰版 ¥99/月</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-700" style={{ width: `${(stats.users.premium / stats.users.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">{stats.users.premium}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">危机干预统计</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats.crisis.total}</p>
                    <p className="text-xs text-gray-500 mt-1">总触发</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.crisis.severe}</p>
                    <p className="text-xs text-gray-500 mt-1">严重级别</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{stats.crisis.unresolved}</p>
                    <p className="text-xs text-gray-500 mt-1">待处理</p>
                  </div>
                </div>
                {stats.crisis.unresolved > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">
                      ⚠️ 有 {stats.crisis.unresolved} 条危机记录待处理，请前往"危机干预"查看
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* API调用统计 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">API调用统计（消息量）</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">用户消息</p>
                  <p className="text-xl font-bold text-gray-900">{stats.messages.user}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">AI回复</p>
                  <p className="text-xl font-bold text-gray-900">{stats.messages.assistant}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">哲学家数</p>
                  <p className="text-xl font-bold text-gray-900">{stats.philosophers.total}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">心智洞察</p>
                  <p className="text-xl font-bold text-gray-900">{stats.insights}</p>
                </div>
              </div>
            </div>

            {/* 最近对话 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">最近对话</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.recentConversations.map(conv => (
                  <div key={conv.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    {conv.philosopherAvatar && (
                      <img src={conv.philosopherAvatar} alt="" className="size-8 rounded-full" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{conv.philosopherName}</p>
                      <p className="text-xs text-gray-500">
                        {conv.messageCount} 条消息 · {new Date(conv.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <Badge variant={conv.mode === 'debate' ? 'default' : 'secondary'} className="text-xs">
                      {conv.mode === 'debate' ? '辩论' : '对话'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">用户管理（共 {users.length} 位）</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">用户</th>
                    <th className="text-left p-3 font-medium text-gray-600">邮箱</th>
                    <th className="text-left p-3 font-medium text-gray-600">套餐</th>
                    <th className="text-left p-3 font-medium text-gray-600">角色</th>
                    <th className="text-right p-3 font-medium text-gray-600">对话数</th>
                    <th className="text-right p-3 font-medium text-gray-600">消息数</th>
                    <th className="text-left p-3 font-medium text-gray-600">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{u.name}</div>
                      </td>
                      <td className="p-3 text-gray-600">{u.email}</td>
                      <td className="p-3">
                        <Badge variant={u.plan === 'premium' ? 'default' : u.plan === 'pro' ? 'secondary' : 'outline'}>
                          {u.plan === 'free' ? '免费' : u.plan === 'pro' ? '专业¥49' : u.plan === 'premium' ? '旗舰¥99' : u.plan}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {u.role === 'admin' ? (
                          <Badge className="bg-red-100 text-red-700">管理员</Badge>
                        ) : (
                          <span className="text-gray-400">用户</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-600">{u.conversationCount}</td>
                      <td className="p-3 text-right text-gray-600">{u.messageCount}</td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">订阅支付记录（共 {subscriptions.length} 条）</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">用户</th>
                    <th className="text-left p-3 font-medium text-gray-600">套餐</th>
                    <th className="text-right p-3 font-medium text-gray-600">金额</th>
                    <th className="text-left p-3 font-medium text-gray-600">周期</th>
                    <th className="text-left p-3 font-medium text-gray-600">状态</th>
                    <th className="text-left p-3 font-medium text-gray-600">支付方式</th>
                    <th className="text-left p-3 font-medium text-gray-600">订单号</th>
                    <th className="text-left p-3 font-medium text-gray-600">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(s => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-gray-900">{s.user?.name || '未知'}</td>
                      <td className="p-3">
                        <Badge variant="outline">{s.plan === 'pro' ? '专业¥49' : '旗舰¥99'}</Badge>
                      </td>
                      <td className="p-3 text-right font-medium">¥{(s.amount / 100).toFixed(2)}</td>
                      <td className="p-3 text-gray-600">{s.interval === 'year' ? '年付' : '月付'}</td>
                      <td className="p-3">
                        <Badge className={s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {s.status === 'active' ? '已激活' : s.status === 'pending' ? '待支付' : s.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">{s.paymentMethod === 'wechat' ? '微信' : s.paymentMethod === 'alipay' ? '支付宝' : s.paymentMethod}</td>
                      <td className="p-3 text-xs text-gray-500 font-mono">{s.transactionId?.slice(0, 20)}...</td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(s.createdAt).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Marketing - 销售营销 */}
        {activeTab === 'marketing' && (
          <div className="space-y-6">
            {/* 转化概览 */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="size-5 text-amber-600" />
                转化概览
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(() => {
                  const totalUsers = stats?.users.total ?? 0
                  const payingUsers = (stats?.users.pro ?? 0) + (stats?.users.premium ?? 0)
                  const activeSubs = stats?.subscriptions.active ?? 0
                  const revenueYuan = (stats?.subscriptions.revenue ?? 0) / 100
                  const visitors = totalUsers // 访客数近似
                  const regRate = visitors > 0 ? 100 : 0 // 因访客数用注册数近似, 转化率为100%
                  const payRate = totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0
                  const arpu = activeSubs > 0 ? revenueYuan / activeSubs : 0
                  const monthlyRevenue = revenueYuan // 月收入估算(基于活跃订阅金额)
                  return (
                    <>
                      <MetricCard icon={Users} label="访客数" value={visitors.toLocaleString()} sub="近似值" color="blue" />
                      <MetricCard icon={CheckCircle2} label="注册转化率" value={`${regRate.toFixed(1)}%`} sub="近似计算" color="green" />
                      <MetricCard icon={CreditCard} label="付费转化率" value={`${payRate.toFixed(1)}%`} sub={`${payingUsers}/${totalUsers}`} color="purple" />
                      <MetricCard icon={DollarSign} label="平均客单价" value={`¥${arpu.toFixed(2)}`} sub="基于活跃订阅" color="amber" />
                      <MetricCard icon={TrendingUp} label="月收入估算" value={`¥${monthlyRevenue.toFixed(2)}`} sub="活跃订阅总额" color="emerald" />
                    </>
                  )
                })()}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                * 访客数无独立追踪，暂用总注册用户数近似；注册转化率因近似关系显示为 100%，实际值需接入埋点后获取。
              </p>
            </div>

            {/* 优惠券管理 */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Ticket className="size-5 text-amber-600" />
                  优惠券管理（共 {coupons.length} 张）
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={loadCoupons} disabled={couponsLoading}>
                    <RefreshCw className={`size-4 mr-1 ${couponsLoading ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
                    onClick={() => {
                      setCouponFormOpen(v => !v)
                      setCouponError('')
                    }}
                  >
                    <Plus className="size-4 mr-1" />
                    创建优惠券
                  </Button>
                </div>
              </div>

              {/* 创建优惠券表单 */}
              {couponFormOpen && (
                <form onSubmit={submitCoupon} className="p-4 bg-amber-50/50 border-b border-gray-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">优惠码 *</label>
                      <div className="flex gap-2">
                        <Input
                          value={couponForm.code}
                          onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="如 NEWYEAR30"
                          className="font-mono uppercase"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={generateCouponCode}>
                          随机生成
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">折扣类型 *</label>
                      <Select
                        value={couponForm.discountType}
                        onValueChange={(v: 'percentage' | 'fixed') => setCouponForm(prev => ({ ...prev, discountType: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择折扣类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">百分比折扣 (%)</SelectItem>
                          <SelectItem value="fixed">固定金额 (元)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        折扣值 * {couponForm.discountType === 'percentage' ? '(%)' : '(元)'}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max={couponForm.discountType === 'percentage' ? 100 : undefined}
                        step={couponForm.discountType === 'percentage' ? '1' : '0.01'}
                        value={couponForm.discountValue}
                        onChange={(e) => setCouponForm(prev => ({ ...prev, discountValue: e.target.value }))}
                        placeholder={couponForm.discountType === 'percentage' ? '如 30 表示 30%' : '如 10 表示 10 元'}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">适用套餐</label>
                      <Select
                        value={couponForm.planId || 'all'}
                        onValueChange={(v) => setCouponForm(prev => ({ ...prev, planId: v === 'all' ? '' : v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="全部套餐" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部套餐</SelectItem>
                          <SelectItem value="pro">专业版 ¥49</SelectItem>
                          <SelectItem value="premium">旗舰版 ¥99</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">最大使用次数</label>
                      <Input
                        type="number"
                        min="1"
                        value={couponForm.maxUses}
                        onChange={(e) => setCouponForm(prev => ({ ...prev, maxUses: e.target.value }))}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">过期时间</label>
                      <Input
                        type="date"
                        value={couponForm.expiresAt}
                        onChange={(e) => setCouponForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                      />
                    </div>
                  </div>
                  {couponError && (
                    <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{couponError}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={couponSubmitting}
                      className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
                    >
                      {couponSubmitting ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                      {couponSubmitting ? '创建中...' : '创建优惠券'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCouponFormOpen(false)
                        setCouponError('')
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </form>
              )}

              {/* 优惠券列表 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">优惠码</th>
                      <th className="text-left p-3 font-medium text-gray-600">类型</th>
                      <th className="text-right p-3 font-medium text-gray-600">折扣值</th>
                      <th className="text-left p-3 font-medium text-gray-600">适用套餐</th>
                      <th className="text-right p-3 font-medium text-gray-600">已用/上限</th>
                      <th className="text-left p-3 font-medium text-gray-600">过期时间</th>
                      <th className="text-left p-3 font-medium text-gray-600">状态</th>
                      <th className="text-right p-3 font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(c => {
                      const usedUp = c.usedCount >= c.maxUses
                      const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false
                      const isLive = c.active && !usedUp && !expired
                      return (
                        <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <span className="font-mono font-semibold text-amber-700">{c.code}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {c.discountType === 'percentage' ? '百分比' : '固定金额'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {c.discountType === 'percentage' ? `${c.discountValue}%` : `¥${(c.discountValue / 100).toFixed(2)}`}
                          </td>
                          <td className="p-3 text-gray-600">
                            {!c.planId ? '全部套餐' : c.planId === 'pro' ? '专业版' : c.planId === 'premium' ? '旗舰版' : c.planId}
                          </td>
                          <td className="p-3 text-right text-gray-600">
                            <span className={usedUp ? 'text-red-600 font-medium' : ''}>{c.usedCount}</span>
                            <span className="text-gray-400"> / {c.maxUses}</span>
                          </td>
                          <td className="p-3 text-gray-500 text-xs">
                            {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('zh-CN') : '永不过期'}
                          </td>
                          <td className="p-3">
                            {expired ? (
                              <Badge className="bg-gray-100 text-gray-500">已过期</Badge>
                            ) : usedUp ? (
                              <Badge className="bg-gray-100 text-gray-500">已用尽</Badge>
                            ) : isLive ? (
                              <Badge className="bg-green-100 text-green-700">启用中</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700">已停用</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCouponActive(c)}
                                title={c.active ? '停用' : '启用'}
                                className="h-8 px-2"
                              >
                                {c.active ? (
                                  <PowerOff className="size-4 text-orange-600" />
                                ) : (
                                  <Power className="size-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteCoupon(c)}
                                title="删除"
                                className="h-8 px-2 hover:bg-red-50"
                              >
                                <Trash2 className="size-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
                          {couponsLoading ? '加载中...' : '暂无优惠券，点击右上角"创建优惠券"开始'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Crisis Logs */}
        {activeTab === 'crisis' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">危机干预日志（共 {crisisLogs.length} 条）</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="size-4" />
                <span>热线：400-161-9995</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {crisisLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={
                        log.riskLevel === 'severe' ? 'bg-red-100 text-red-700' :
                        log.riskLevel === 'mild' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {log.riskLevel === 'severe' ? '严重' : log.riskLevel === 'mild' ? '轻微' : '安全'}
                      </Badge>
                      {log.hotlineShown && <Badge variant="outline" className="text-xs">已展示热线</Badge>}
                      <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <Badge className={log.resolved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                      {log.resolved ? '已处理' : '待处理'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">用户输入：</span>
                    <span className="text-gray-600">"{log.userInput}"</span>
                  </div>
                  {log.triggerKeywords && (
                    <div className="text-xs text-gray-500 mb-2">
                      触发词：{log.triggerKeywords}
                    </div>
                  )}
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                    {log.interventionResponse?.slice(0, 150)}...
                  </div>
                </div>
              ))}
              {crisisLogs.length === 0 && (
                <div className="p-8 text-center text-gray-400">暂无危机干预记录</div>
              )}
            </div>
          </div>
        )}

        {/* Settings - 系统设置 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* 站点配置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Megaphone className="size-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">站点配置</h3>
                  <p className="text-xs text-gray-500">站点名称、公告、Banner、联系邮箱</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">站点名称</label>
                  <Input
                    value={configForm.siteName}
                    onChange={(e) => setConfigForm({ ...configForm, siteName: e.target.value })}
                    placeholder="Mindway.Life"
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">联系邮箱</label>
                  <Input
                    type="email"
                    value={configForm.contactEmail}
                    onChange={(e) => setConfigForm({ ...configForm, contactEmail: e.target.value })}
                    placeholder="piaoshu@mindway.life"
                    className="h-10"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">公告内容</label>
                  <Textarea
                    value={configForm.announcement}
                    onChange={(e) => setConfigForm({ ...configForm, announcement: e.target.value })}
                    placeholder="站点公告，如：新功能上线、活动通知等"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Banner 文字</label>
                  <Input
                    value={configForm.bannerText}
                    onChange={(e) => setConfigForm({ ...configForm, bannerText: e.target.value })}
                    placeholder="顶部横幅文字，如：限时优惠 / 新哲学家入驻"
                    className="h-10"
                  />
                </div>
                <div className="md:col-span-2 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">启用 Banner</p>
                    <p className="text-xs text-gray-500">开启后首页顶部展示 Banner 横幅</p>
                  </div>
                  <Switch
                    checked={configForm.bannerEnabled}
                    onCheckedChange={(v) => setConfigForm({ ...configForm, bannerEnabled: v })}
                  />
                </div>
              </div>
            </div>

            {/* LLM 配置 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <KeyRound className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">LLM 提供商配置</h3>
                  <p className="text-xs text-gray-500">选择默认 LLM 提供商并填写对应 API Key</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">LLM 提供商</label>
                  <select
                    value={configForm.llmProvider}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        llmProvider: e.target.value as 'zhipu' | 'deepseek' | 'zai',
                      })
                    }
                    className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  >
                    <option value="zhipu">智谱 GLM-4-Flash（免费，推荐）</option>
                    <option value="deepseek">DeepSeek（便宜高质量）</option>
                    <option value="zai">ZAI SDK（沙箱隧道，兜底）</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-2">
                    智谱 API Key
                    {siteConfig?.zhipuApiKeySet && (
                      <Badge className="bg-green-100 text-green-700 text-xs">已配置</Badge>
                    )}
                  </label>
                  <Input
                    type="password"
                    value={configForm.zhipuApiKey}
                    onChange={(e) => setConfigForm({ ...configForm, zhipuApiKey: e.target.value })}
                    placeholder={siteConfig?.zhipuApiKeySet ? '已保存，留空表示不修改' : '请输入智谱 API Key'}
                    className="h-10 font-mono"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    申请地址：open.bigmodel.cn · 留空保存则保留原值
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-2">
                    DeepSeek API Key
                    {siteConfig?.deepseekApiKeySet && (
                      <Badge className="bg-green-100 text-green-700 text-xs">已配置</Badge>
                    )}
                  </label>
                  <Input
                    type="password"
                    value={configForm.deepseekApiKey}
                    onChange={(e) => setConfigForm({ ...configForm, deepseekApiKey: e.target.value })}
                    placeholder={siteConfig?.deepseekApiKeySet ? '已保存，留空表示不修改' : '请输入 DeepSeek API Key'}
                    className="h-10 font-mono"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    申请地址：platform.deepseek.com · 留空保存则保留原值
                  </p>
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {configSaved && (
                  <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="size-4" />
                    <span>保存成功</span>
                  </div>
                )}
                {configError && (
                  <div className="text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">{configError}</div>
                )}
                {siteConfig?.updatedAt && !configSaved && !configError && (
                  <span className="text-xs text-gray-400">
                    上次更新：{new Date(siteConfig.updatedAt).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>
              <Button
                onClick={saveSiteConfig}
                disabled={configSaving}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
              >
                {configSaving ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" /> 保存中...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-1.5" /> 保存配置
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Analytics - 数据分析 */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analyticsLoading && !analytics && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">加载分析数据中...</span>
              </div>
            )}

            {analytics && (
              <>
                {/* 30天对话趋势 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <TrendingUp className="size-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">最近 30 天对话趋势</h3>
                        <p className="text-xs text-gray-500">每日新建对话数</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">30天合计</p>
                      <p className="text-xl font-bold text-gray-900">
                        {analytics.dailyConversationTrend.reduce((s, d) => s + d.count, 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end gap-0.5 h-32 mb-2">
                    {analytics.dailyConversationTrend.map((d) => {
                      const max = Math.max(...analytics.dailyConversationTrend.map((x) => x.count), 1)
                      const h = (d.count / max) * 100
                      return (
                        <div
                          key={d.date}
                          className="flex-1 bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-sm hover:from-amber-600 hover:to-amber-400 transition-colors relative group"
                          style={{ height: `${Math.max(h, 2)}%` }}
                          title={`${d.date}: ${d.count} 场对话`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{analytics.dailyConversationTrend[0]?.date}</span>
                    <span>{analytics.dailyConversationTrend[analytics.dailyConversationTrend.length - 1]?.date}</span>
                  </div>
                </div>

                {/* 转化漏斗 + 留存 */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* 转化漏斗 */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">转化漏斗</h3>
                    <div className="space-y-3">
                      <FunnelBar
                        label="注册用户"
                        value={analytics.funnel.registered}
                        rate={100}
                        color="bg-blue-500"
                      />
                      <FunnelBar
                        label="有过对话"
                        value={analytics.funnel.conversed}
                        rate={analytics.funnel.convRateRegToConv}
                        color="bg-amber-500"
                      />
                      <FunnelBar
                        label="已订阅"
                        value={analytics.funnel.subscribed}
                        rate={analytics.funnel.convRateOverall}
                        color="bg-emerald-600"
                      />
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">注册 → 对话</p>
                        <p className="font-bold text-gray-900">{analytics.funnel.convRateRegToConv}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">对话 → 订阅</p>
                        <p className="font-bold text-gray-900">{analytics.funnel.convRateConvToSub}%</p>
                      </div>
                    </div>
                  </div>

                  {/* 用户留存 */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">用户留存率</h3>
                    <p className="text-xs text-gray-500 mb-4">基于过去 30 天注册用户，按首次对话时间计算</p>
                    <div className="grid grid-cols-3 gap-3">
                      <RetentionCard label="次日留存" data={analytics.retention.d1} color="text-blue-600" />
                      <RetentionCard label="7日留存" data={analytics.retention.d7} color="text-amber-600" />
                      <RetentionCard label="30日留存" data={analytics.retention.d30} color="text-emerald-600" />
                    </div>
                  </div>
                </div>

                {/* API 成本 */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">API 调用成本估算</h3>
                    <Badge variant="outline" className="text-xs">
                      单价 ¥{analytics.apiCost.costPerMessage.toFixed(3)}/条
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">总消息数</p>
                      <p className="text-xl font-bold text-gray-900">{analytics.apiCost.totalMessages.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">用户消息</p>
                      <p className="text-xl font-bold text-gray-900">{analytics.apiCost.userMessages.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">AI 回复</p>
                      <p className="text-xl font-bold text-gray-900">{analytics.apiCost.assistantMessages.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-700">估算总成本</p>
                      <p className="text-xl font-bold text-amber-700">¥{analytics.apiCost.estimatedCostCny.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* 哲学家热度 Top 20 */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">哲学家热度 Top 20（按对话数）</h3>
                  </div>
                  {analytics.topPhilosophers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">暂无对话数据</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {analytics.topPhilosophers.map((p) => {
                        const maxCount = analytics.topPhilosophers[0]?.conversationCount || 1
                        const pct = (p.conversationCount / maxCount) * 100
                        return (
                          <div key={p.philosopherId} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                            <div className={`w-7 text-center font-bold text-sm ${p.rank <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                              #{p.rank}
                            </div>
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt="" className="size-8 rounded-full" />
                            ) : (
                              <div className="size-8 rounded-full bg-gray-200" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                {p.era && <Badge variant="outline" className="text-xs">{p.era}</Badge>}
                              </div>
                              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
                                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{p.conversationCount}</p>
                              <p className="text-xs text-gray-400">场对话</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-gray-400">
                  数据生成于：{new Date(analytics.generatedAt).toLocaleString('zh-CN')}
                </div>
              </>
            )}
          </div>
        )}

        {/* Philosophers - 哲学家管理 */}
        {activeTab === 'philosophers' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 头部 + 新增按钮 */}
              <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="size-5 text-amber-600" />
                  哲学家管理（共 {philosophersPagination.total} 位）
                </h3>
                <Button
                  size="sm"
                  onClick={openCreatePhilosopher}
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
                >
                  <Plus className="size-4 mr-1" /> 新增哲学家
                </Button>
              </div>
              {/* 搜索 + 筛选 */}
              <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="搜索中文名 / 英文名 / slug / 标语..."
                    value={philosopherSearch}
                    onChange={(e) => {
                      setPhilosopherSearch(e.target.value)
                      setPhilosophersPagination(p => ({ ...p, page: 1 }))
                    }}
                    className="max-w-xs pr-8"
                  />
                  {philosopherSearch && (
                    <button
                      onClick={() => {
                        setPhilosopherSearch('')
                        setPhilosophersPagination(p => ({ ...p, page: 1 }))
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="清空"
                    >
                      ×
                    </button>
                  )}
                </div>
                <Select
                  value={philosopherEra}
                  onValueChange={(v) => {
                    setPhilosopherEra(v)
                    setPhilosophersPagination(p => ({ ...p, page: 1 }))
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="时代" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时代</SelectItem>
                    <SelectItem value="古典">古典</SelectItem>
                    <SelectItem value="近代">近代</SelectItem>
                    <SelectItem value="当代">当代</SelectItem>
                    <SelectItem value="主理人">主理人</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={philosopherCategory}
                  onValueChange={(v) => {
                    setPhilosopherCategory(v)
                    setPhilosophersPagination(p => ({ ...p, page: 1 }))
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    <SelectItem value="情绪类">情绪类</SelectItem>
                    <SelectItem value="关系类">关系类</SelectItem>
                    <SelectItem value="选择类">选择类</SelectItem>
                    <SelectItem value="意义类">意义类</SelectItem>
                    <SelectItem value="综合类">综合类</SelectItem>
                  </SelectContent>
                </Select>
                {philosophersLoading && <Loader2 className="size-4 animate-spin text-gray-400" />}
                <div className="ml-auto text-xs text-gray-400">
                  第 {philosophersPagination.page} / {philosophersPagination.totalPages} 页
                </div>
              </div>
              {/* 列表表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">头像</th>
                      <th className="text-left p-3 font-medium text-gray-600">中文名</th>
                      <th className="text-left p-3 font-medium text-gray-600">英文名</th>
                      <th className="text-left p-3 font-medium text-gray-600">slug</th>
                      <th className="text-left p-3 font-medium text-gray-600">时代</th>
                      <th className="text-left p-3 font-medium text-gray-600">分类</th>
                      <th className="text-right p-3 font-medium text-gray-600">排序</th>
                      <th className="text-center p-3 font-medium text-gray-600">身份</th>
                      <th className="text-center p-3 font-medium text-gray-600">状态</th>
                      <th className="text-right p-3 font-medium text-gray-600">对话数</th>
                      <th className="text-right p-3 font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {philosophers.map(p => (
                      <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          {p.avatarUrl
                            ? <img src={p.avatarUrl} alt="" className="size-9 rounded-full object-cover bg-gray-100" />
                            : <div className="size-9 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{p.nameCn?.[0] || '?'}</div>}
                        </td>
                        <td className="p-3 font-medium text-gray-900 align-top">
                          <div>{p.nameCn}</div>
                          {p.tagline && (
                            <div className="text-xs text-gray-400 font-normal mt-0.5 line-clamp-1 max-w-xs">{p.tagline}</div>
                          )}
                        </td>
                        <td className="p-3 text-gray-600">{p.nameEn}</td>
                        <td className="p-3 text-gray-500 text-xs font-mono">{p.slug}</td>
                        <td className="p-3"><Badge variant="outline">{p.era}</Badge></td>
                        <td className="p-3"><Badge variant="outline">{p.category}</Badge></td>
                        <td className="p-3 text-right text-gray-600">{p.order}</td>
                        <td className="p-3 text-center">
                          {p.isHost
                            ? <Badge className="bg-amber-100 text-amber-700">主理人</Badge>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-3 text-center">
                          {p.published
                            ? <Badge className="bg-green-100 text-green-700">已发布</Badge>
                            : <Badge className="bg-gray-100 text-gray-600">草稿</Badge>}
                        </td>
                        <td className="p-3 text-right text-gray-600">{p._count?.conversations ?? 0}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditPhilosopher(p)}>
                              <Pencil className="size-3.5 mr-1" /> 编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setPhilosopherError('')
                                setDeletingPhilosopher(p)
                              }}
                            >
                              <Trash2 className="size-3.5 mr-1" /> 删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {philosophers.length === 0 && !philosophersLoading && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-gray-400">
                          暂无哲学家，点击右上角「新增哲学家」开始创建
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* 分页 */}
              {philosophersPagination.totalPages > 1 && (
                <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                  <span>
                    共 {philosophersPagination.total} 条 · 第 {philosophersPagination.page} / {philosophersPagination.totalPages} 页
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={philosophersPagination.page <= 1 || philosophersLoading}
                      onClick={() => setPhilosophersPagination(p => ({ ...p, page: p.page - 1 }))}
                    >
                      上一页
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={philosophersPagination.page >= philosophersPagination.totalPages || philosophersLoading}
                      onClick={() => setPhilosophersPagination(p => ({ ...p, page: p.page + 1 }))}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 哲学家编辑/新增弹窗 */}
        <Dialog open={!!editingPhilosopher} onOpenChange={(o) => !o && setEditingPhilosopher(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPhilosopher?.id ? '编辑哲学家' : '新增哲学家'}</DialogTitle>
              <DialogDescription>修改哲学家信息后点击保存。带 * 为必填字段。</DialogDescription>
            </DialogHeader>
            {philosopherError && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{philosopherError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="中文名 *">
                <Input
                  value={editingPhilosopher?.nameCn || ''}
                  onChange={(e) => updateEditingField('nameCn', e.target.value)}
                  placeholder="如：勒内·笛卡尔"
                />
              </Field>
              <Field label="英文名 *">
                <Input
                  value={editingPhilosopher?.nameEn || ''}
                  onChange={(e) => updateEditingField('nameEn', e.target.value)}
                  placeholder="如：René Descartes"
                />
              </Field>
              <Field label="Slug * (URL 标识，唯一)">
                <Input
                  value={editingPhilosopher?.slug || ''}
                  onChange={(e) => updateEditingField('slug', e.target.value)}
                  placeholder="如：descartes"
                />
              </Field>
              <Field label="头像 URL">
                <Input
                  value={editingPhilosopher?.avatarUrl || ''}
                  onChange={(e) => updateEditingField('avatarUrl', e.target.value)}
                  placeholder="如：/avatars/descartes.png"
                />
              </Field>
              <Field label="时代 *">
                <Select
                  value={editingPhilosopher?.era || '古典'}
                  onValueChange={(v) => updateEditingField('era', v)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="古典">古典</SelectItem>
                    <SelectItem value="近代">近代</SelectItem>
                    <SelectItem value="当代">当代</SelectItem>
                    <SelectItem value="主理人">主理人</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="分类 *">
                <Select
                  value={editingPhilosopher?.category || '综合类'}
                  onValueChange={(v) => updateEditingField('category', v)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="情绪类">情绪类</SelectItem>
                    <SelectItem value="关系类">关系类</SelectItem>
                    <SelectItem value="选择类">选择类</SelectItem>
                    <SelectItem value="意义类">意义类</SelectItem>
                    <SelectItem value="综合类">综合类</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tagline * (一句话标语)">
                <Input
                  value={editingPhilosopher?.tagline || ''}
                  onChange={(e) => updateEditingField('tagline', e.target.value)}
                  placeholder="如：我思故我在"
                />
              </Field>
              <Field label="排序 (整数，越小越靠前)">
                <Input
                  type="number"
                  value={editingPhilosopher?.order ?? 0}
                  onChange={(e) => updateEditingField('order', parseInt(e.target.value || '0', 10) || 0)}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Bio Summary * (短简介)">
                  <Textarea
                    rows={2}
                    value={editingPhilosopher?.bioSummary || ''}
                    onChange={(e) => updateEditingField('bioSummary', e.target.value)}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Core Insight * (核心洞察)">
                  <Textarea
                    rows={2}
                    value={editingPhilosopher?.coreInsight || ''}
                    onChange={(e) => updateEditingField('coreInsight', e.target.value)}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Description (详细介绍全文)">
                  <Textarea
                    rows={4}
                    value={editingPhilosopher?.description || ''}
                    onChange={(e) => updateEditingField('description', e.target.value)}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="System Prompt * (AI 人设提示词)">
                  <Textarea
                    rows={5}
                    value={editingPhilosopher?.systemPrompt || ''}
                    onChange={(e) => updateEditingField('systemPrompt', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Quote * (代表性名言)">
                <Input
                  value={editingPhilosopher?.quote || ''}
                  onChange={(e) => updateEditingField('quote', e.target.value)}
                />
              </Field>
              <Field label="名言出处">
                <Input
                  value={editingPhilosopher?.quoteSource || ''}
                  onChange={(e) => updateEditingField('quoteSource', e.target.value)}
                />
              </Field>
              <Field label="Works (著作，逗号分隔)">
                <Input
                  value={editingPhilosopher?.works || ''}
                  onChange={(e) => updateEditingField('works', e.target.value)}
                  placeholder="如：《第一哲学沉思集》,《谈谈方法》"
                />
              </Field>
              <Field label="Worries (烦恼标签，逗号分隔)">
                <Input
                  value={editingPhilosopher?.worries || ''}
                  onChange={(e) => updateEditingField('worries', e.target.value)}
                  placeholder="如：自我怀疑,身份认同危机"
                />
              </Field>
              <div className="md:col-span-2 flex items-center gap-8 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!editingPhilosopher?.published}
                    onCheckedChange={(v) => updateEditingField('published', v)}
                  />
                  <Label>已发布</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!editingPhilosopher?.isHost}
                    onCheckedChange={(v) => updateEditingField('isHost', v)}
                  />
                  <Label>主理人</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPhilosopher(null)} disabled={philosopherSaving}>
                取消
              </Button>
              <Button
                onClick={savePhilosopher}
                disabled={philosopherSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {philosopherSaving
                  ? <Loader2 className="size-4 mr-1 animate-spin" />
                  : <Save className="size-4 mr-1" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 哲学家删除确认弹窗 */}
        <Dialog open={!!deletingPhilosopher} onOpenChange={(o) => !o && setDeletingPhilosopher(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除哲学家 <span className="font-medium text-gray-900">{deletingPhilosopher?.nameCn}</span>
                （{deletingPhilosopher?.slug}）吗？此操作不可撤销。
                {!!deletingPhilosopher && (deletingPhilosopher._count?.conversations ?? 0) > 0 && (
                  <span className="block mt-2 text-red-600">
                    该哲学家存在 {deletingPhilosopher._count?.conversations} 条关联对话，无法直接删除。请先迁移对话后再尝试。
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            {philosopherError && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{philosopherError}</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingPhilosopher(null)} disabled={philosopherSaving}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletePhilosopher(deletingPhilosopher)}
                disabled={
                  philosopherSaving ||
                  (!!deletingPhilosopher && (deletingPhilosopher._count?.conversations ?? 0) > 0)
                }
              >
                {philosopherSaving
                  ? <Loader2 className="size-4 mr-1 animate-spin" />
                  : <Trash2 className="size-4 mr-1" />}
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
    </div>
  )
}

function FunnelBar({ label, value, rate, color }: { label: string; value: number; rate: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">{value.toLocaleString()}</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(rate, 2)}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">占比 {rate.toFixed(1)}%</p>
    </div>
  )
}

function RetentionCard({ label, data, color }: { label: string; data: { rate: number; retained: number; eligible: number }; color: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{data.rate}%</p>
      <p className="text-xs text-gray-400 mt-1">
        {data.retained}/{data.eligible}
      </p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: number; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
