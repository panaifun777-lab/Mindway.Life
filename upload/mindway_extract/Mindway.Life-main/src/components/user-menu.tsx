'use client'

import { LogOut, User, Crown, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/lib/store'

const planLabels: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  premium: '尊享版',
}

export default function UserMenu() {
  const { user, isAuthenticated, setView, logout } = useAppStore()

  // Not logged in: show login button
  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView('login')}
        className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] min-h-[44px] gap-1.5"
      >
        <User className="size-4" />
        <span className="hidden sm:inline">登录</span>
      </Button>
    )
  }

  // Logged in: show user avatar + dropdown
  const planLabel = planLabels[user.plan] || user.plan

  const handleLogout = async () => {
    try {
      // Attempt to clear server-side cookie
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
        // Endpoint may not exist yet, that's OK
      })
    } finally {
      logout()
      setView('home')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] min-h-[44px] gap-1.5 px-2"
        >
          <Avatar className="size-6 border border-[var(--app-avatar-border)]">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-[var(--app-avatar-fallback-bg)] text-[var(--app-avatar-fallback-text)] text-xs font-serif font-bold">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline max-w-[80px] truncate text-sm">
            {user.name}
          </span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 bg-[var(--app-bg-card)] border-[var(--app-border)] shadow-lg"
      >
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-[var(--app-text-primary)] font-serif" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              {user.name}
            </p>
            <div className="flex items-center gap-1.5">
              <Crown className="size-3 text-[var(--app-accent)]" />
              <span className="text-xs text-[var(--app-accent)]">{planLabel}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--app-border)]" />

        <DropdownMenuGroup>
          {/* Subscription management */}
          <DropdownMenuItem
            onClick={() => setView('subscription')}
            className="text-[var(--app-text-secondary)] focus:text-[var(--app-text-primary)] focus:bg-[var(--app-accent)]/10 cursor-pointer"
          >
            <Crown className="size-4 mr-2 text-[var(--app-accent)]" />
            订阅管理
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[var(--app-border)]" />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
        >
          <LogOut className="size-4 mr-2" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
