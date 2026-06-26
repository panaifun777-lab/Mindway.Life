/**
 * 反 AI 味后处理规则 (Anti-AI Flavor Detector)
 * ----------------------------------------------------
 * 用于在 LLM 生成回复后做"AI 味"自检，发现典型 AI 腔调词即标记。
 *
 * 设计原则：
 * 1. 纯同步、毫秒级，不依赖 AI
 * 2. 仅做"标记 + 列出问题"，不自动改写（改写交给上层 rerun / 重试）
 * 3. 规则可扩展：未来可追加更多 AI 腔调特征（如列点、"建议你"、"加油"等）
 *
 * 调用方式：
 *   import { detectAIFlavor } from '@/lib/anti-ai-rules';
 *   const { hasAIFlavor, issues } = detectAIFlavor(text);
 *   if (hasAIFlavor) {
 *     // 上层可决定：重新生成 / 提示飘叔 / 记录到审计日志
 *   }
 *
 * 已知误判（保持任务规格字面要求，不擅自过滤）：
 * - "最后"   可能在自然中文里出现（如"最后一班地铁"）—— 视为可接受代价
 * - "首先"   同上（如"首先你得告诉我"）
 * - "作为一个" 过于宽泛（如"作为一个父亲"）—— 后续可按需追加更严格规则
 *
 * 与 PIAOSHU_GRAYSCALE_PROMPT / GENERIC_PHILOSOPHER_PROMPT_TEMPLATE 中
 * "绝对禁令"段的连接词列表保持一致，便于飘叔人格 prompt 与本规则协同。
 */

/**
 * AI 味检测规则表
 * - pattern: 字面字符串（用 includes 匹配，避免正则回溯开销）
 * - label:   命中时返回的问题描述（人类可读）
 */
export interface AntiAIRule {
  pattern: string;
  label: string;
}

/**
 * 默认 AI 味检测规则集（任务规格字面要求）
 *
 * 命中任一即判定有 AI 味。命中多个时 issues 数组按规则顺序返回。
 */
export const ANTI_AI_CHECK_RULES: readonly AntiAIRule[] = [
  { pattern: '首先', label: '模板化连接词"首先"' },
  { pattern: '其次', label: '模板化连接词"其次"' },
  { pattern: '最后', label: '模板化连接词"最后"' },
  { pattern: '综上所述', label: '总结腔"综上所述"' },
  { pattern: '作为AI', label: 'AI 自我标识"作为AI"' },
  { pattern: '作为一个', label: 'AI 自我标识"作为一个"' },
  { pattern: '希望对你有帮助', label: '客服腔"希望对你有帮助"' },
  { pattern: '总之', label: '总结腔"总之"' },
  { pattern: '总而言之', label: '总结腔"总而言之"' },
];

export interface AIFlavorCheckResult {
  hasAIFlavor: boolean;
  /** 命中规则的 label 列表（人类可读，按 ANTI_AI_CHECK_RULES 顺序） */
  issues: string[];
  /** 命中的原始 pattern 列表（调试/日志用） */
  matchedPatterns: string[];
  /** 检测耗时（ms） */
  elapsedMs: number;
}

/**
 * AI 味检测主入口（同步、毫秒级、纯 CPU）
 *
 * 算法：逐条 includes 匹配 ANTI_AI_CHECK_RULES，命中即记录 issue。
 * 注意：本函数不抛错，非字符串输入直接返回 hasAIFlavor=false。
 *
 * @param text 待检测的 LLM 回复文本
 * @returns AIFlavorCheckResult
 */
export function detectAIFlavor(text: string): AIFlavorCheckResult {
  const t0 = Date.now();

  if (!text || typeof text !== 'string') {
    return {
      hasAIFlavor: false,
      issues: [],
      matchedPatterns: [],
      elapsedMs: Date.now() - t0,
    };
  }

  const issues: string[] = [];
  const matchedPatterns: string[] = [];

  for (const rule of ANTI_AI_CHECK_RULES) {
    if (text.includes(rule.pattern)) {
      issues.push(rule.label);
      matchedPatterns.push(rule.pattern);
    }
  }

  return {
    hasAIFlavor: issues.length > 0,
    issues,
    matchedPatterns,
    elapsedMs: Date.now() - t0,
  };
}
