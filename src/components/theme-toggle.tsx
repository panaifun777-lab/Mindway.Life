'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  // Use useSyncExternalStore to detect client mount without setState-in-effect
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={`min-h-[44px] min-w-[44px] ${className}`}
        disabled
      >
        <Sun className="size-4" />
      </Button>
    )
  }

  const toggleTheme = () => {
    // Add transitioning class for smooth theme change
    document.documentElement.classList.add('theme-transitioning')
    setTheme(theme === 'dark' ? 'light' : 'dark')
    // Remove transitioning class after animation
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 300)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`min-h-[44px] min-w-[44px] text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-card)] ${className}`}
      aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
    >
      {theme === 'dark' ? (
        <Sun className="size-4 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="size-4 transition-transform duration-300 rotate-0 scale-100" />
      )}
    </Button>
  )
}
