'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Phone, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 危机干预热线卡片 (Crisis Intervention Hotline Card)
 * ---------------------------------------------------
 * Mindway.Life 前端安全网关 UI 层。
 *
 * 触发条件：后端 safety-gateway.ts 在 SSE 流中检测到 severe 级别情绪信号，
 * 每个 chunk 携带 { content, crisis: true, hotline: "400-161-9995" }，
 * chat-interface.tsx 解析到 crisis:true 即 setState 弹出本卡片。
 *
 * 设计原则：
 * 1. 不允许轻易关闭——点击遮罩、按 ESC 都不会关，必须点"我知道了"按钮
 *    （身处危机状态的用户可能误触屏幕，遮罩点击关闭会让他们错过关键资源）
 * 2. 紧迫感但不恐慌——温暖米黄色调 + 心形图标，与网站主题一致
 * 3. 热线号码醒目——超大字号 + 字重，确保用户一眼看到
 * 4. 手机端可直拨——按钮用 <a href="tel:...">，原生拨号面板唤起
 * 5. 视觉冲击但不血腥——不用红色警告色，避免激化情绪
 *
 * Props:
 *   show: boolean      —— 是否显示
 *   hotline: string    —— 热线号码（如 "400-161-9995"）
 *   onClose: () => void —— 关闭回调（仅"我知道了"按钮触发）
 */

export interface CrisisCardProps {
  show: boolean
  hotline: string
  onClose: () => void
}

export default function CrisisCard({ show, hotline, onClose }: CrisisCardProps) {
  // 防止背景滚动（仅在 show=true 时锁定 body）
  useEffect(() => {
    if (!show) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [show])

  // 显式不处理 ESC 键关闭——危机状态下必须点按钮才能关，
  // 避免误触 ESC 让热线卡片消失而用户错过援助资源
  // （此处仅留注释说明设计意图，不绑定 keydown listener）

  // tel: 链接：仅当 hotline 非空时才生成，避免空号码误拨
  const telHref = hotline ? `tel:${hotline.replace(/[^0-9+]/g, '')}` : undefined

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="crisis-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            backgroundColor: 'var(--app-overlay)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          // ⚠️ 故意不绑定 onClick 关闭逻辑：点击遮罩不关，必须点按钮
          // 仅消费事件避免冒泡到下层聊天界面
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="crisis-card-title"
          aria-describedby="crisis-card-body"
        >
          <motion.div
            key="crisis-card"
            className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              backgroundColor: 'var(--app-bg-card)',
              border: '1px solid var(--app-accent)',
              boxShadow: '0 20px 60px -10px rgba(61, 43, 31, 0.25), 0 0 0 1px var(--app-accent)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部强调色条——视觉锚点，传达"这是一条特殊信息" */}
            <div
              className="h-1.5 w-full"
              style={{
                background:
                  'linear-gradient(90deg, var(--app-accent) 0%, var(--app-accent-hover) 100%)',
              }}
              aria-hidden="true"
            />

            {/* 内容区 */}
            <div className="px-6 py-7 sm:px-8 sm:py-9">
              {/* 头部图标 + 标识 */}
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="flex items-center justify-center size-9 rounded-full shrink-0"
                  style={{
                    backgroundColor: 'rgba(201, 169, 110, 0.15)',
                    border: '1px solid rgba(201, 169, 110, 0.3)',
                  }}
                  aria-hidden="true"
                >
                  <Heart
                    className="size-4"
                    style={{ color: 'var(--app-accent)', fill: 'var(--app-accent)' }}
                  />
                </div>
                <span
                  className="text-[11px] font-mono tracking-widest uppercase"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  Mindway · 安全守护
                </span>
              </div>

              {/* 标题 */}
              <h2
                id="crisis-card-title"
                className="font-serif font-bold text-2xl sm:text-3xl mb-3 leading-tight"
                style={{
                  color: 'var(--app-text-primary)',
                  fontFamily: 'Georgia, "Noto Serif SC", serif',
                }}
              >
                你很重要
              </h2>

              {/* 正文 */}
              <p
                id="crisis-card-body"
                className="text-sm sm:text-[15px] leading-relaxed mb-6"
                style={{ color: 'var(--app-text-secondary)' }}
              >
                如果你正在经历痛苦或有极端想法，请知道——你不是一个人。专业的帮助随时都在。
              </p>

              {/* 热线号码——视觉焦点 */}
              <div
                className="rounded-xl px-4 py-5 mb-6 text-center"
                style={{
                  backgroundColor: 'rgba(201, 169, 110, 0.08)',
                  border: '1px dashed rgba(201, 169, 110, 0.45)',
                }}
              >
                <div
                  className="flex items-center justify-center gap-1.5 mb-1.5"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  <Phone className="size-3" />
                  <span className="text-[11px] font-mono tracking-wider">
                    24小时心理援助热线
                  </span>
                </div>
                <div
                  className="font-mono font-bold tracking-wider"
                  style={{
                    color: 'var(--app-accent)',
                    fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
                    lineHeight: 1.1,
                    letterSpacing: '0.02em',
                  }}
                  // 防止号码被意外选中复制导致显示错乱（仅视觉，不影响 a 标签点击拨号）
                  // 注意：不设置 user-select:none，因为用户可能想手动复制号码
                >
                  {hotline || '400-161-9995'}
                </div>
              </div>

              {/* 操作按钮区 */}
              <div className="flex flex-col gap-2.5">
                {/* 立即拨打——主 CTA，a 标签直拨 */}
                <Button
                  asChild={!!telHref}
                  size="lg"
                  className="w-full h-12 text-base font-semibold shadow-md"
                  style={{
                    backgroundColor: 'var(--app-accent)',
                    color: '#FFFFFF',
                  }}
                  // 当 hotline 为空时降级为普通按钮（理论上不会发生，hotline 由后端保证非空）
                  {...(!telHref ? { onClick: onClose } : {})}
                >
                  {telHref ? (
                    <a href={telHref} aria-label={`拨打心理援助热线 ${hotline}`}>
                      <Phone className="size-4" />
                      立即拨打
                    </a>
                  ) : (
                    <>
                      <Phone className="size-4" />
                      立即拨打
                    </>
                  )}
                </Button>

                {/* 我知道了——次 CTA，关闭卡片 */}
                <Button
                  onClick={onClose}
                  size="lg"
                  variant="outline"
                  className="w-full h-11 text-sm font-medium"
                  style={{
                    color: 'var(--app-text-secondary)',
                    borderColor: 'var(--app-border)',
                    backgroundColor: 'transparent',
                  }}
                >
                  我知道了
                </Button>
              </div>

              {/* 底部小字 */}
              <div
                className="flex items-center justify-center gap-1.5 mt-5 pt-4"
                style={{
                  borderTop: '1px solid var(--app-border)',
                }}
              >
                <ShieldCheck
                  className="size-3"
                  style={{ color: 'var(--app-text-muted)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--app-text-muted)' }}
                >
                  24小时全国心理援助热线 · 免费保密
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
