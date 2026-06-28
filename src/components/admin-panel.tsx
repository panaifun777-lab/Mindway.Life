'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, MessageSquare, CreditCard, AlertTriangle, LogOut, Loader2, TrendingUp, DollarSign, Activity, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'subscriptions' | 'crisis'>('dashboard')
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [crisisLogs, setCrisisLogs] = useState<any[]>([])

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

  useEffect(() => {
    if (authenticated) {
      if (activeTab === 'users') loadUsers()
      else if (activeTab === 'subscriptions') loadSubscriptions()
      else if (activeTab === 'crisis') loadCrisisLogs()
      else loadStats()
    }
  }, [activeTab, authenticated])

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
            { id: 'users', label: '用户管理', icon: Users },
            { id: 'subscriptions', label: '订阅支付', icon: CreditCard },
            { id: 'crisis', label: '危机干预', icon: AlertTriangle },
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
      </main>
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
