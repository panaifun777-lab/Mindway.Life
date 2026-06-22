'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Loader2, Mail, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, Crown, Sparkles, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import ThemeToggle from '@/components/theme-toggle'

type AuthMode = 'login' | 'register'

// Email validation helper
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: '弱', color: 'bg-red-500' }
  if (score <= 2) return { score: 2, label: '较弱', color: 'bg-orange-500' }
  if (score <= 3) return { score: 3, label: '中等', color: 'bg-yellow-500' }
  if (score <= 4) return { score: 4, label: '较强', color: 'bg-green-400' }
  return { score: 5, label: '强', color: 'bg-green-600' }
}

export default function AuthView() {
  const { login, setView } = useAppStore()
  const { toast } = useToast()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Track if fields have been touched for validation feedback
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)

  // Error state
  const [error, setError] = useState('')

  // Derived validation state
  const emailValid = useMemo(() => {
    if (!email) return null // not entered yet
    return isValidEmail(email)
  }, [email])

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null
    return password === confirmPassword
  }, [password, confirmPassword])

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            login(data.user)
            setView('home')
          }
        }
      } catch {
        // Not authenticated, stay on auth page
      }
    }
    checkAuth()
  }, [login, setView])

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setEmailTouched(false)
    setPasswordTouched(false)
    setConfirmPasswordTouched(false)
  }

  const handleModeChange = (newMode: string) => {
    setMode(newMode as AuthMode)
    resetForm()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('请填写邮箱和密码')
      return
    }

    if (!isValidEmail(email.trim())) {
      setError('请输入有效的邮箱地址')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '登录失败，请稍后再试')
        return
      }

      login(data.user)
      setView('home')
    } catch {
      setError('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('请填写所有字段')
      return
    }

    if (!isValidEmail(email.trim())) {
      setError('请输入有效的邮箱地址')
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '注册失败，请稍后再试')
        return
      }

      login(data.user)

      // Show welcome toast before navigating
      toast({
        title: '🎉 欢迎来到哲学的世界！',
        description: '开启你的思想之旅，与伟大的哲学家对话',
      })

      setView('home')
    } catch {
      setError('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  // Enhanced philosophical quotes - rotates more frequently
  const philosophicalQuotes = [
    { text: '认识你自己', author: '苏格拉底' },
    { text: '我思故我在', author: '笛卡尔' },
    { text: '人是万物的尺度', author: '普罗泰戈拉' },
    { text: '未经审视的人生不值得过', author: '苏格拉底' },
    { text: '知者不惑，仁者不忧，勇者不惧', author: '孔子' },
    { text: '吾生也有涯，而知也无涯', author: '庄子' },
    { text: '他人即地狱', author: '萨特' },
    { text: '幸福在于有节制的生活', author: '伊壁鸠鲁' },
  ]

  const currentQuote = philosophicalQuotes[Math.floor(Date.now() / 8000) % philosophicalQuotes.length]

  // Social login handlers (UI placeholders)
  const handleWechatLogin = () => {
    toast({
      title: '微信登录即将上线',
      description: '我们正在接入微信登录，敬请期待',
    })
  }

  const handleAppleLogin = () => {
    toast({
      title: 'Apple 登录即将上线',
      description: '我们正在接入 Apple 登录，敬请期待',
    })
  }

  const handleForgotPassword = () => {
    toast({
      title: '密码重置功能即将上线',
      description: '我们正在开发密码重置功能，敬请期待',
    })
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
        <div className="max-w-3xl mx-auto flex items-center gap-3">
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
              {mode === 'login' ? '登录' : '注册'}
            </h3>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">

          {/* Decorative philosophical header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-6"
          >
            {/* App logo/icon */}
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent)]/70 flex items-center justify-center shadow-lg shadow-[var(--app-accent)]/20">
                  <BookOpen className="size-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--app-bg-card)] border-2 border-[var(--app-accent)] flex items-center justify-center">
                  <Sparkles className="size-3 text-[var(--app-accent)]" />
                </div>
              </div>
            </div>

            {/* App name */}
            <h2
              className="text-xl font-serif font-bold text-[var(--app-text-primary)] mb-1"
              style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
            >
              哲学为人生烦恼找答案
            </h2>

            {/* Ornamental line */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-10 h-[1px] bg-[var(--app-accent)] opacity-50" />
              <div className="w-2 h-2 bg-[var(--app-accent)] rotate-45" />
              <div className="w-10 h-[1px] bg-[var(--app-accent)] opacity-50" />
            </div>

            {/* Rotating Quote */}
            <p className="text-[var(--app-text-secondary)] text-sm italic font-serif mb-1" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              &ldquo;{currentQuote.text}&rdquo;
            </p>
            <p className="text-[var(--app-text-muted)] text-xs">
              —— {currentQuote.author}
            </p>
          </motion.div>

          {/* Auth Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[var(--app-bg-card)] rounded-2xl border border-[var(--app-border)] shadow-lg overflow-hidden"
          >
            {/* Tabs */}
            <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
              <TabsList className="w-full rounded-none border-b border-[var(--app-border)] bg-transparent h-12 p-0">
                <TabsTrigger
                  value="login"
                  className="flex-1 h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--app-accent)] text-[var(--app-text-secondary)] data-[state=active]:text-[var(--app-text-primary)] font-serif text-base"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                >
                  登录
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="flex-1 h-full rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[var(--app-accent)] text-[var(--app-text-secondary)] data-[state=active]:text-[var(--app-text-primary)] font-serif text-base"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                >
                  注册
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="p-6 pt-5 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-[var(--app-text-secondary)] text-sm">
                      邮箱
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--app-text-muted)]" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        className={`pl-10 pr-10 bg-[var(--app-input-bg)] border-[var(--app-border)] focus:border-[var(--app-accent)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60 h-11 ${
                          emailTouched && email
                            ? emailValid
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-red-400 focus:border-red-400'
                            : ''
                        }`}
                        autoComplete="email"
                        required
                      />
                      {emailTouched && email && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailValid ? (
                            <CheckCircle2 className="size-4 text-green-500" />
                          ) : (
                            <AlertCircle className="size-4 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                    {emailTouched && email && !emailValid && (
                      <p className="text-xs text-red-400">请输入有效的邮箱地址</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-[var(--app-text-secondary)] text-sm">
                        密码
                      </Label>
                      <button
                        type="button"
                        className="text-xs text-[var(--app-accent)] hover:text-[var(--app-accent-hover)] transition-colors"
                        onClick={handleForgotPassword}
                      >
                        忘记密码?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--app-text-muted)]" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-[var(--app-input-bg)] border-[var(--app-border)] focus:border-[var(--app-accent)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60 h-11"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] transition-colors"
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2 text-center"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white h-11 text-base font-serif rounded-xl shadow-md transition-all hover:shadow-lg"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--app-border)]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-[var(--app-bg-card)] text-[var(--app-text-muted)]">其他登录方式</span>
                    </div>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* WeChat */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleWechatLogin}
                      className="h-11 border-[var(--app-border)] bg-[var(--app-input-bg)] hover:bg-[var(--app-accent)]/5 hover:border-[var(--app-accent)]/30 transition-all rounded-xl"
                    >
                      <svg className="size-5 mr-2 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.307 4.28c-3.813 0-6.905 2.648-6.905 5.917 0 3.269 3.092 5.917 6.905 5.917a8.07 8.07 0 002.346-.348.67.67 0 01.556.076l1.467.858a.262.262 0 00.132.043.227.227 0 00.224-.228c0-.055-.023-.11-.038-.165l-.3-1.143a.46.46 0 01.165-.514C21.905 19.67 22.905 18.002 22.905 16.188c0-3.269-3.092-5.917-6.905-5.917v0zm-2.76 3.453c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921zm5.52 0c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921z"/>
                      </svg>
                      <span className="text-sm text-[var(--app-text-secondary)]">微信登录</span>
                    </Button>

                    {/* Apple */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAppleLogin}
                      className="h-11 border-[var(--app-border)] bg-[var(--app-input-bg)] hover:bg-[var(--app-accent)]/5 hover:border-[var(--app-accent)]/30 transition-all rounded-xl"
                    >
                      <svg className="size-5 mr-2 text-[var(--app-text-primary)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      <span className="text-sm text-[var(--app-text-secondary)]">Apple 登录</span>
                    </Button>
                  </div>

                  {/* Subscription link */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setView('subscription')}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--app-accent)] hover:text-[var(--app-accent-hover)] transition-colors"
                    >
                      <Crown className="size-3.5" />
                      查看订阅方案，解锁更多功能
                    </button>
                  </div>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register" className="p-6 pt-5 mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Welcome message */}
                  <div className="text-center mb-2">
                    <p className="text-sm text-[var(--app-text-secondary)]">
                      开启你的哲学之旅，与120位哲人对话
                    </p>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-[var(--app-text-secondary)] text-sm">
                      昵称
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--app-text-muted)]" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="你的昵称"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 bg-[var(--app-input-bg)] border-[var(--app-border)] focus:border-[var(--app-accent)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60 h-11"
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-[var(--app-text-secondary)] text-sm">
                      邮箱
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--app-text-muted)]" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        className={`pl-10 pr-10 bg-[var(--app-input-bg)] border-[var(--app-border)] focus:border-[var(--app-accent)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60 h-11 ${
                          emailTouched && email
                            ? emailValid
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-red-400 focus:border-red-400'
                            : ''
                        }`}
                        autoComplete="email"
                        required
                      />
                      {emailTouched && email && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailValid ? (
                            <CheckCircle2 className="size-4 text-green-500" />
                          ) : (
                            <AlertCircle className="size-4 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                    {emailTouched && email && !emailValid && (
                      <p className="text-xs text-red-400">请输入有效的邮箱地址</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-[var(--app-text-secondary)] text-sm">
                      密码
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--app-text-muted)]" />
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="至少6位密码"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setPasswordTouched(true)
                        }}
                        className="pl-10 pr-10 bg-[var(--app-input-bg)] border-[var(--app-border)] focus:border-[var(--app-accent)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60 h-11"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] transition-colors"
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {passwordTouched && password && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                level <= passwordStrength.score
                                  ? passwordStrength.color
                                  : 'bg-[var(--app-border)]'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--app-text-muted)]">密码强度</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 ${
                              passwordStrength.score <= 1
                                ? 'border-red-400 text-red-500'
                                : passwordStrength.score <= 2
                                  ? 'border-orange-400 text-orange-500'
                                  : passwordStrength.score <= 3
                                    ? 'border-yellow-500 text-yellow-600'
                                    : 'border-green-500 text-green-600'
                            }`}
                          >
                            {passwordStrength.label}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-[var(--app-text-secondary)] text-sm">
                      确认密码
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--app-text-muted)]" />
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="再次输入密码"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setConfirmPasswordTouched(true)
                        }}
                        className={`pl-10 pr-10 bg-[var(--app-input-bg)] border-[var(--app-border)] focus:border-[var(--app-accent)] text-[var(--app-text-primary)] placeholder:text-[var(--app-text-muted)]/60 h-11 ${
                          confirmPasswordTouched && confirmPassword
                            ? passwordsMatch
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-red-400 focus:border-red-400'
                            : ''
                        }`}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] transition-colors"
                        aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {confirmPasswordTouched && confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-red-400">两次输入的密码不一致</p>
                    )}
                    {confirmPasswordTouched && confirmPassword && passwordsMatch && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        密码一致
                      </p>
                    )}
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2 text-center"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white h-11 text-base font-serif rounded-xl shadow-md transition-all hover:shadow-lg"
                    style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        注册中...
                      </>
                    ) : (
                      '注册'
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--app-border)]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-[var(--app-bg-card)] text-[var(--app-text-muted)]">其他注册方式</span>
                    </div>
                  </div>

                  {/* Social Login Buttons for Register */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* WeChat */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleWechatLogin}
                      className="h-11 border-[var(--app-border)] bg-[var(--app-input-bg)] hover:bg-[var(--app-accent)]/5 hover:border-[var(--app-accent)]/30 transition-all rounded-xl"
                    >
                      <svg className="size-5 mr-2 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.307 4.28c-3.813 0-6.905 2.648-6.905 5.917 0 3.269 3.092 5.917 6.905 5.917a8.07 8.07 0 002.346-.348.67.67 0 01.556.076l1.467.858a.262.262 0 00.132.043.227.227 0 00.224-.228c0-.055-.023-.11-.038-.165l-.3-1.143a.46.46 0 01.165-.514C21.905 19.67 22.905 18.002 22.905 16.188c0-3.269-3.092-5.917-6.905-5.917v0zm-2.76 3.453c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921zm5.52 0c.5 0 .905.412.905.921a.913.913 0 01-.905.921.913.913 0 01-.905-.921c0-.509.405-.921.905-.921z"/>
                      </svg>
                      <span className="text-sm text-[var(--app-text-secondary)]">微信注册</span>
                    </Button>

                    {/* Apple */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAppleLogin}
                      className="h-11 border-[var(--app-border)] bg-[var(--app-input-bg)] hover:bg-[var(--app-accent)]/5 hover:border-[var(--app-accent)]/30 transition-all rounded-xl"
                    >
                      <svg className="size-5 mr-2 text-[var(--app-text-primary)]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      <span className="text-sm text-[var(--app-text-secondary)]">Apple 注册</span>
                    </Button>
                  </div>

                  {/* Terms hint */}
                  <p className="text-[10px] text-[var(--app-text-muted)] text-center leading-relaxed">
                    注册即表示同意我们的服务条款和隐私政策
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Bottom decorative element */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center mt-6"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-[1px] bg-[var(--app-accent)] opacity-30" />
              <div className="w-1.5 h-1.5 bg-[var(--app-accent)] rotate-45 opacity-30" />
              <div className="w-8 h-[1px] bg-[var(--app-accent)] opacity-30" />
            </div>
            <p className="text-[var(--app-text-muted)] text-xs font-serif" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              开启你的哲学之旅
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
