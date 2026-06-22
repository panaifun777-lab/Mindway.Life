'use client'

import { Crown } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'
import { useAppStore } from '@/lib/store'

export default function Footer() {
  const { setView } = useAppStore()

  return (
    <footer className="mt-auto bg-[var(--app-bg-card)]/40 border-t border-[var(--app-border)] py-6 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <p
          className="font-serif text-[var(--app-text-primary)] font-bold text-sm mb-1"
          style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
        >
          哲学为人生烦恼找答案
        </p>
        <p className="text-xs text-[var(--app-text-muted)] mb-3">
          120位跨越时空的东西方思想者，为你的人生困境点亮一盏灯
        </p>
        <div className="flex justify-center items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setView('subscription')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 transition-colors min-h-[36px]"
          >
            <Crown className="size-3.5" />
            订阅方案
          </button>
        </div>
        <p className="text-xs text-[var(--app-text-muted)] mt-4 opacity-60">
          © 2024 飘叔工作室
        </p>
      </div>
    </footer>
  )
}
