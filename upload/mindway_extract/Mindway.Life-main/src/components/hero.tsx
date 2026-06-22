'use client'

import { motion } from 'framer-motion'
import { BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

export default function Hero() {
  const { setView } = useAppStore()

  return (
    <section className="relative overflow-hidden py-16 md:py-24 px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-8 left-8 text-[var(--app-accent)] opacity-10 text-9xl font-serif leading-none">&ldquo;</div>
        <div className="absolute bottom-8 right-8 text-[var(--app-accent)] opacity-10 text-9xl font-serif leading-none rotate-180">&ldquo;</div>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Ornamental top line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-24 h-[2px] bg-[var(--app-accent)] mx-auto mb-8"
        />

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-[var(--app-text-primary)] mb-6 tracking-tight"
          style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
        >
          哲学为人生烦恼找答案
        </motion.h1>

        {/* Decorative diamond */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="w-12 h-[1px] bg-[var(--app-accent)] opacity-50" />
          <div className="w-2 h-2 bg-[var(--app-accent)] rotate-45" />
          <div className="w-12 h-[1px] bg-[var(--app-accent)] opacity-50" />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-[var(--app-text-secondary)] mb-10 leading-relaxed max-w-2xl mx-auto"
        >
          120位跨越时空的东西方思想者，为你的人生困境点亮一盏灯
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => {
              const gridSection = document.getElementById('philosopher-grid')
              if (gridSection) {
                gridSection.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white px-8 py-6 text-base rounded-lg shadow-md transition-all hover:shadow-lg min-h-[44px]"
          >
            <BookOpen className="mr-2 size-5" />
            开始探索
          </Button>
          <Button
            onClick={() => setView('quiz')}
            variant="outline"
            className="border-[var(--app-accent)] text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 px-8 py-6 text-base rounded-lg min-h-[44px]"
          >
            <Sparkles className="mr-2 size-5" />
            测测哪位哲学家适合你
          </Button>
        </motion.div>

        {/* Ornamental bottom line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="w-24 h-[2px] bg-[var(--app-accent)] mx-auto mt-10"
        />
      </div>
    </section>
  )
}
