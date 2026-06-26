/**
 * 反 AI 味真实感引擎 · 情绪感知 + 策略路由 (Emotion Engine)
 * ----------------------------------------------------
 * Mindway.Life 国内版"灵魂共鸣"+"苏格拉底式启发"的核心调度层。
 *
 * 设计原则：
 * 1. 关键词+规则检测为纯同步、毫秒级，不依赖任何 AI 模型 / 网络请求
 * 2. 根据用户当前情绪强度，动态路由飘叔/哲学家的对话策略
 * 3. 不阻断对话流，仅向主 Agent systemPrompt 末尾追加策略提示
 * 4. 与 safety-gateway 解耦：
 *    - safety-gateway 负责"危机熔断"（severe 直接拦截 / mild 前置共情提示）
 *    - emotion-engine 负责"情绪策略"（mild / safe 时后置追加策略提示）
 *    两者互不依赖、可独立演进
 *
 * 调用方式：
 *   import { detectEmotion } from '@/lib/emotion-engine';
 *   const emotionState = detectEmotion(userInput);
 *   systemPrompt = systemPrompt + '\n' + emotionState.systemPromptInjection;
 *
 * 注意：本模块不读写数据库、不调用 LLM、不抛错（内部已兜底）
 */

export type EmotionType = '焦虑' | '愤怒' | '迷茫' | '平静' | '抑郁' | '兴奋';

export type StrategyMode = 'pure_empathy' | 'empathy_plus_guidance' | 'deep_dialogue';

export interface EmotionState {
  emotion: EmotionType;
  /** 1-10，1 最平静，10 最激烈 */
  intensity: number;
  strategy: StrategyMode;
  /** 注入到 systemPrompt 末尾的策略提示（已格式化，调用方追加换行即可） */
  systemPromptInjection: string;
  /** 命中关键词列表（调试/审计用，与 safety-gateway 风格一致） */
  triggerKeywords: string[];
  /** 命中检测耗时（ms），用于监控 */
  elapsedMs: number;
}

/**
 * 情绪关键词映射表
 * - 每类情绪按"明确度"粗排，越具体的词越靠前
 * - 同一关键词在多类情绪下重复出现时，由 EMOTION_PRIORITY 决定归属
 */
const EMOTION_KEYWORDS: Record<Exclude<EmotionType, '平静'>, readonly string[]> = {
  焦虑: [
    '焦虑', '紧张', '压力', 'deadline', '赶不上', '来不及', '怎么办',
    '急', '慌', '怕来不及', '来不及了', '要来不及',
  ],
  愤怒: [
    '气死', '愤怒', '恶心', '受够了', '凭什么', '被骗', '不公',
    '气炸', '火大', '烦死', '讨厌', '气不打一处来', '气不过',
  ],
  迷茫: [
    '迷茫', '不知道', '困惑', '找不到', '意义', '方向', '选择',
    '不知道该', '何去何从', '搞不懂自己', '不知道要什么',
  ],
  抑郁: [
    '低落', '丧', 'emo', '没动力', '空虚', '孤独', '不想动',
    '没意思', '不想说话', '没劲', '想哭', '心累', '好累',
    // 与 safety-gateway MILD_KEYWORDS 对齐的强 distress 信号
    '崩溃', '撑不住', '撑不下去', '好疲惫', '无力',
  ],
  兴奋: [
    '开心', '太棒了', '终于', '成功了', '做到了',
    '太好了', '太爽了', '哈哈哈', '贼开心', '高兴',
  ],
};

/**
 * 情绪优先级（命中数相同时的归属决策）
 * 抑郁 > 愤怒 > 焦虑 > 迷茫 > 兴奋 > 平静
 * 理由：负面情绪优先级高于正面，便于策略层"先接住再引导"
 */
const EMOTION_PRIORITY: Exclude<EmotionType, '平静'>[] = [
  '抑郁', '愤怒', '焦虑', '迷茫', '兴奋',
];

/**
 * 强度放大词（每命中一个 +1 强度，单次输入累加上限 3）
 */
const INTENSIFIER_WORDS: readonly string[] = [
  '非常', '特别', '真的', '太', '极其', '超级', '巨', '贼', '贼拉',
  '死', '炸', '崩溃', '彻底', '完全', '简直', '真的是',
];

/**
 * 计算输入文本中的强度放大信号（boost 分数）
 * - 放大词命中数（cap 3）
 * - 重复标点（!!、？？？、！！、…）命中数（cap 2）
 * - 重复字符（哈哈哈、啊啊啊、555）命中数（cap 2）
 *
 * 内部 try/catch 兜底，正则异常时返回 0，绝不抛错
 */
function computeIntensifierBoost(input: string): number {
  try {
    let boost = 0;

    // 放大词
    let intHit = 0;
    for (const w of INTENSIFIER_WORDS) {
      if (input.includes(w)) intHit += 1;
    }
    boost += Math.min(intHit, 3);

    // 重复标点（连续 2 个及以上）
    const punctMatches = input.match(/[！!]{2,}|[？?]{2,}|[。.]{3,}|[~～]{2,}/g);
    if (punctMatches) boost += Math.min(punctMatches.length, 2);

    // 重复字符（同字连续 3 次及以上，如 哈哈哈、啊啊啊、555）
    const repMatches = input.match(/([\u4e00-\u9fa5\d])\1{2,}/g);
    if (repMatches) boost += Math.min(repMatches.length, 2);

    return boost;
  } catch {
    return 0;
  }
}

/**
 * 根据情绪 + 强度选择策略
 *
 * 默认规则（任务规格字面）：
 * - 强度 > 7：pure_empathy（100% 共情，停止讲理）
 * - 强度 4-7：empathy_plus_guidance（30% 共情 + 70% 认知拆解 + 反问引导）
 * - 强度 < 4：deep_dialogue（直接深度哲学交锋）
 *
 * 特例：兴奋情绪即使强度高，也不进入 pure_empathy
 *       —— "停止讲理"用于喜事违和，统一走 empathy_plus_guidance（同频喜悦 + 引导深化）
 */
function pickStrategy(emotion: EmotionType, intensity: number): StrategyMode {
  // 兴奋情绪：跳过 pure_empathy，避免"停止讲理、只做情绪安抚"用于喜事
  if (emotion === '兴奋') {
    return intensity >= 4 ? 'empathy_plus_guidance' : 'deep_dialogue';
  }

  if (intensity > 7) return 'pure_empathy';
  if (intensity >= 4) return 'empathy_plus_guidance';
  return 'deep_dialogue';
}

/**
 * 生成策略注入提示（注入到 systemPrompt 末尾）
 *
 * 三种策略的提示语严格遵守任务规格字面要求，
 * 末尾追加"情绪类型 + 强度"上下文，供飘叔/哲学家参考调整语气。
 */
function buildStrategyInjection(
  emotion: EmotionType,
  intensity: number,
  strategy: StrategyMode,
): string {
  let body: string;
  switch (strategy) {
    case 'pure_empathy':
      body = `：用户情绪极度激动(强度${intensity}，情绪类型：${emotion})，你必须100%共情，停止讲理，只做倾听和情绪安抚，不要给建议，不要反问，先接住对方`;
      break;
    case 'empathy_plus_guidance':
      body = `：用户情绪中等(强度${intensity}，情绪类型：${emotion})，30%共情+70%认知拆解，用反问引导，降维隐喻`;
      break;
    case 'deep_dialogue':
      body = `：用户情绪平静(强度${intensity}，情绪类型：${emotion})，直接进行深度哲学交锋，苏格拉底式追问`;
      break;
  }

  return `【当前对话策略${body}】`;
}

/**
 * 情绪检测主入口（同步、毫秒级、纯 CPU）
 *
 * 算法：
 * 1. 对 5 类非平静情绪的关键词表逐条 includes 匹配
 * 2. 命中数最多的情绪胜出（同分按 EMOTION_PRIORITY 决断）
 * 3. 强度 = 命中关键词数 × 2 + 放大词/标点/重复字符 boost，clamp 到 [1, 10]
 * 4. 无任何命中 → 平静情绪，强度固定 2（落入 deep_dialogue）
 *
 * 性能：单条输入检测耗时 < 1ms（与 safety-gateway 同量级）
 * 健壮性：非字符串/空输入直接返回平静默认值，绝不抛错
 *
 * @param userInput 用户原始输入文本
 * @returns EmotionState（含 strategy + systemPromptInjection）
 */
export function detectEmotion(userInput: string): EmotionState {
  const t0 = Date.now();

  // 兜底：非字符串/空输入直接返回平静默认值
  if (!userInput || typeof userInput !== 'string' || userInput.length === 0) {
    return {
      emotion: '平静',
      intensity: 2,
      strategy: 'deep_dialogue',
      systemPromptInjection: buildStrategyInjection('平静', 2, 'deep_dialogue'),
      triggerKeywords: [],
      elapsedMs: Date.now() - t0,
    };
  }

  // 1. 关键词匹配（按 EMOTION_PRIORITY 顺序，确保后续 sort 稳定）
  const hits: Array<{ emotion: Exclude<EmotionType, '平静'>; keywords: string[] }> = [];
  for (const emo of EMOTION_PRIORITY) {
    const kws = EMOTION_KEYWORDS[emo];
    const matched = kws.filter((kw) => userInput.includes(kw));
    if (matched.length > 0) {
      hits.push({ emotion: emo, keywords: matched });
    }
  }

  // 2. 无命中 → 平静
  if (hits.length === 0) {
    // 平静情绪强度固定 2，不参与 boost 计算（避免放大词误判）
    const intensity = 2;
    const strategy = pickStrategy('平静', intensity);
    return {
      emotion: '平静',
      intensity,
      strategy,
      systemPromptInjection: buildStrategyInjection('平静', intensity, strategy),
      triggerKeywords: [],
      elapsedMs: Date.now() - t0,
    };
  }

  // 3. 选出主导情绪（命中数最多，同分按 EMOTION_PRIORITY）
  hits.sort((a, b) => {
    if (b.keywords.length !== a.keywords.length) {
      return b.keywords.length - a.keywords.length;
    }
    return EMOTION_PRIORITY.indexOf(a.emotion) - EMOTION_PRIORITY.indexOf(b.emotion);
  });
  const dominant = hits[0];
  const allKeywords = hits.flatMap((h) => h.keywords);

  // 4. 计算强度
  const baseIntensity = dominant.keywords.length * 2;
  const boost = computeIntensifierBoost(userInput);
  const intensity = Math.max(1, Math.min(baseIntensity + boost, 10));

  // 5. 选策略
  const strategy = pickStrategy(dominant.emotion, intensity);

  // 6. 生成注入提示
  const injection = buildStrategyInjection(dominant.emotion, intensity, strategy);

  return {
    emotion: dominant.emotion,
    intensity,
    strategy,
    systemPromptInjection: injection,
    triggerKeywords: allKeywords,
    elapsedMs: Date.now() - t0,
  };
}
