'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BookOpen, Sparkles, Home as HomeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import Hero from '@/components/hero'
import HostSection from '@/components/host-section'
import PhilosopherGrid from '@/components/philosopher-grid'
import PhilosopherDetail from '@/components/philosopher-detail'
import ChatInterface from '@/components/chat-interface'
import DebateInterface from '@/components/debate-interface'
import Quiz from '@/components/quiz'
import SubscriptionView from '@/components/subscription-view'
import AuthView from '@/components/auth-view'
import UserMenu from '@/components/user-menu'
import Footer from '@/components/footer'
import ThemeToggle from '@/components/theme-toggle'

function AppContent() {
  const { currentView, goHome, login } = useAppStore()
  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            login(data.user)
          }
        }
      } catch {
        // Not authenticated
      }
    }
    checkAuth()
  }, [login])

  // Views that use the shared header
  const headerViews = ['home', 'detail']
  // Full-screen views that manage their own header
  const fullScreenViews = ['chat', 'debate', 'quiz', 'login', 'register', 'subscription']

  return (
    <div className="min-h-screen flex flex-col bg-[var(--app-bg)]">
      {headerViews.includes(currentView) ? (
        <>
          {/* Navigation header */}
          <header className="sticky top-0 z-40 bg-[var(--app-header-bg)] backdrop-blur-sm border-b border-[var(--app-border)]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <button
                onClick={goHome}
                className="flex items-center gap-2 hover:opacity-90 transition-opacity group"
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-[var(--app-accent)]/30 group-hover:ring-[var(--app-accent)]/60 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[var(--app-accent)]/30">
                  <img
                    src="/logo-main.png"
                    alt="Mindway.Life"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[var(--app-accent)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <span
                  className="font-serif font-bold text-[var(--app-text-primary)] text-sm hidden sm:inline"
                  style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
                >
                  一段探寻智慧的心路历程
                </span>
              </button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goHome}
                  className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] min-h-[44px]"
                >
                  <HomeIcon className="size-4 mr-1" />
                  <span className="hidden sm:inline">首页</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => useAppStore.getState().setView('quiz')}
                  className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] min-h-[44px]"
                >
                  <Sparkles className="size-4 mr-1" />
                  <span className="hidden sm:inline">测试</span>
                </Button>
                <UserMenu />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            {currentView === 'home' && (
              <>
                <Hero />
                <HostSection />
                <PhilosopherGrid />
              </>
            )}
          </main>

          <Footer />
        </>
      ) : (
        <>
          {/* Full-screen views */}
          <AnimatePresence mode="wait">
            {currentView === 'chat' && <ChatInterface />}
            {currentView === 'debate' && <DebateInterface />}
            {currentView === 'quiz' && <Quiz />}
            {currentView === 'login' && <AuthView />}
            {currentView === 'register' && <AuthView />}
            {currentView === 'subscription' && <SubscriptionView />}
          </AnimatePresence>
        </>
      )}

      {/* Detail overlay rendered directly (component uses fixed positioning) */}
      {currentView === 'detail' && <PhilosopherDetail />}
    </div>
  )
}

export default function PhilosophyApp() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
