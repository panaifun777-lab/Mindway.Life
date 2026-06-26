/**
 * 情绪熔断安全网关 (Safety Gateway / Crisis Interceptor)
 * ----------------------------------------------------
 * Mindway.Life 国内版安全层。
 *
 * 设计原则：
 * 1. 关键词检测为纯同步、毫秒级，不依赖任何 AI 模型 / 网络请求
 * 2. severe 级别直接熔断主对话流，返回热线干预话术
 * 3. mild 级别不阻断，但向主 Agent systemPrompt 前注入情绪共情提示
 * 4. 所有触发记录可异步上报到 /api/crisis-log 供后台审计
 *
 * 调用方式：
 *   import { checkCrisis } from '@/lib/safety-gateway';
 *   const result = await checkCrisis(userInput);
 *   if (result.blocked) return crisisStream(result.crisisResponse!);
 */

export type RiskLevel = 'safe' | 'mild' | 'severe';

export interface CrisisCheckResult {
  blocked: boolean;
  riskLevel: RiskLevel;
  triggerKeywords: string[];
  /** 已生成的熔断回复（仅 severe 时非空） */
  crisisResponse?: string;
  /** 注入到主 Agent systemPrompt 前的共情提示（仅 mild 时非空） */
  systemPromptInjection?: string;
  /** 命中检测耗时（ms），用于监控 */
  elapsedMs: number;
}

/** 国内危机干预热线（希望24小时热线） */
export const CRISIS_HOTLINE = '400-161-9995';

/**
 * severe 级别关键词 - 立即熔断，返回热线卡片
 * 任何一条命中即触发。顺序按"明确度"粗排：越具体的词越靠前。
 */
const SEVERE_KEYWORDS: readonly string[] = [
  // 直接表达自伤 / 自杀意图
  '自杀',
  '自残',
  '想死',
  '不想活了',
  '不想活',
  '活着没意思',
  '活不下去',
  '活够了',
  '寻短见',
  '轻生',
  '结束生命',
  '结束自己',
  '了结自己',
  '了结此生',
  '了结一切',
  // 具体方式
  '跳楼',
  '割腕',
  '喝农药',
  '吃安眠药',
  '买安眠药',
  '买药', // 单独"买药"风险高，宁可误杀
  '安眠药',
  '农药',
  '烧炭',
  '上吊',
  '服毒',
  // 强烈情绪 + 离世意向
  '解脱',
  '一了百了',
  '一走了之',
  '消失算了',
  '不想存在',
];

/**
 * mild 级别关键词 - 不阻断，但提示主 Agent 共情优先
 * 命中多条才更可能是真实低落，单条命中也注入，但语气较轻。
 */
const MILD_KEYWORDS: readonly string[] = [
  '好累',
  '好疲惫',
  '撑不下去',
  '撑不住',
  '崩溃',
  '绝望',
  '毫无意义',
  '没意义',
  '活着为什么',
  '为什么活着',
  '没意思',
  '没希望',
  '受够了',
  '想哭',
  '孤独',
  '空虚',
  '迷茫',
  '无力',
  '心累',
];

/**
 * 生成 severe 级别熔断回复（飘叔口吻，带温度，非 AI 味）
 * 注意：此回复会原样流式返回给用户，必须由人工撰写，不可交给 LLM 生成。
 */
function buildSevereResponse(): string {
  return [
    '朋友，先停一下。',
    '',
    '飘叔感觉到，你现在正承受着巨大的痛苦——那种话到嘴边说不出来、胸口压着一块石头的痛。',
    '这时候跟你讲什么哲学、什么大道理，都是放屁。',
    '',
    '你现在需要的不是一个答案，而是一个能接住你的人。',
    '请你现在、立刻，拨打这个电话：',
    '',
    `【希望24小时热线：${CRISIS_HOTLINE}】`,
    '',
    '电话那头的人，受过专业训练，24小时都在，不会评判你，也不会跟你绕弯子。',
    '你不需要把话说得很漂亮，哭出来也行，沉默也行，只要拨过去就好。',
    '',
    '你不是一个人扛。这件事比你此刻感觉到的要小，但前提是——你得先让自己被听见。',
    '',
    '打完电话，如果你愿意，回来找飘叔，我们再慢慢聊。哲学的事，不急在今天。',
  ].join('\n');
}

/**
 * 生成 mild 级别注入到主 Agent systemPrompt 前的提示
 * 不修改飘叔原有的人设，只在前面追加一段"情绪上下文"
 */
function buildMildInjection(triggerKeywords: string[]): string {
  return [
    '【安全网关 · 情绪提示 · 仅供飘叔参考】',
    `检测到用户当前情绪偏低落，命中关键词：${triggerKeywords.join('、')}`,
    '回答要求：',
    '1. 开头先用一句话共情（如"我听到你说累了"），不要急于给哲学分析或行动建议',
    '2. 语气要比平时更柔、更慢，少用金句，多用陪伴感',
    '3. 不要否认用户的负面情绪（不说"别想太多""会好起来的"）',
    '4. 如果用户接下来表达更严重的情绪（如自伤、轻生念头），立即停止分析，提示用户拨打 400-161-9995',
    '【提示结束】',
    '',
  ].join('\n');
}

export class CrisisInterceptor {
  /**
   * 同步关键词检测（毫秒级，纯 CPU）
   * 使用 String.prototype.includes 逐条匹配，避免正则回溯开销
   *
   * @returns riskLevel + triggerKeywords
   */
  static detect(input: string): {
    riskLevel: RiskLevel;
    triggerKeywords: string[];
  } {
    if (!input || typeof input !== 'string') {
      return { riskLevel: 'safe', triggerKeywords: [] };
    }

    // severe 优先：任何一条命中即熔断（一票否决式）
    const severeHits = SEVERE_KEYWORDS.filter((kw) => input.includes(kw));
    if (severeHits.length > 0) {
      return { riskLevel: 'severe', triggerKeywords: severeHits };
    }

    // mild 次之
    const mildHits = MILD_KEYWORDS.filter((kw) => input.includes(kw));
    if (mildHits.length > 0) {
      return { riskLevel: 'mild', triggerKeywords: mildHits };
    }

    return { riskLevel: 'safe', triggerKeywords: [] };
  }

  /** severe 级别熔断回复（缓存，避免每次重新拼字符串） */
  private static severeResponseCache?: string;
  static getSevereResponse(): string {
    if (!this.severeResponseCache) {
      this.severeResponseCache = buildSevereResponse();
    }
    return this.severeResponseCache;
  }

  /** mild 级别注入提示 */
  static getMildInjection(triggerKeywords: string[]): string {
    return buildMildInjection(triggerKeywords);
  }

  /**
   * 异步总入口：执行检测 + 生成回复
   *
   * 注意：本函数不直接写数据库。日志上报交给 /api/crisis-log 或
   * logCrisisEvent()，由调用方决定是否记录（避免在网关层耦合 db）。
   *
   * async 是为了未来扩展（如加入轻量级语义模型二级确认），
   * 当前实现里同步部分会在事件循环的同一个 tick 内完成。
   */
  static async check(userInput: string): Promise<CrisisCheckResult> {
    const t0 = Date.now();
    const { riskLevel, triggerKeywords } = CrisisInterceptor.detect(userInput);
    const elapsedMs = Date.now() - t0;

    if (riskLevel === 'severe') {
      return {
        blocked: true,
        riskLevel,
        triggerKeywords,
        crisisResponse: CrisisInterceptor.getSevereResponse(),
        elapsedMs,
      };
    }

    if (riskLevel === 'mild') {
      return {
        blocked: false,
        riskLevel,
        triggerKeywords,
        systemPromptInjection: CrisisInterceptor.getMildInjection(triggerKeywords),
        elapsedMs,
      };
    }

    return {
      blocked: false,
      riskLevel: 'safe',
      triggerKeywords: [],
      elapsedMs,
    };
  }
}

/**
 * 模块级导出：供 chat route / 其他 API 直接调用
 */
export async function checkCrisis(userInput: string): Promise<CrisisCheckResult> {
  return CrisisInterceptor.check(userInput);
}

/**
 * 危机事件日志上报（供 /api/crisis-log 与 chat route 共用）
 *
 * 写入策略：
 * - 如果 Prisma Client 已经生成 CrisisLog 模型且数据库表存在，正常写入
 * - 否则仅 console.warn，不抛错，不影响主流程
 *
 * 用户输入会截断到 200 字符以内，避免日志膨胀 + 适度脱敏
 *
 * 字段映射到 prisma CrisisLog 模型：
 *   userInput            -> userInput (截断 200 字符)
 *   riskLevel            -> riskLevel
 *   triggerKeywords      -> triggerKeywords (JSON string)
 *   interventionResponse -> interventionResponse (熔断回复 / 注入提示原文)
 *   hotlineShown         -> hotlineShown (severe=true, mild=false)
 *   userId               -> userId (可选，从外部传入)
 */
export interface CrisisLogPayload {
  userInput: string;
  riskLevel: RiskLevel;
  triggerKeywords: string[];
  /** 熔断回复（severe）或注入提示（mild）原文，存档用于审计复盘 */
  interventionResponse: string;
  /** 是否向用户展示了热线卡片（仅 severe=true） */
  hotlineShown?: boolean;
  /** 已登录用户的 ID（可选） */
  userId?: string;
  /** 关联对话 ID（仅用于日志上下文，不外键约束） */
  conversationId?: string;
  /** 触发时正在对话的哲学家 ID（可空） */
  philosopherId?: string;
}

export async function logCrisisEvent(payload: CrisisLogPayload): Promise<void> {
  try {
    const { db } = await import('@/lib/db');
    // 动态访问 crisisLog，若 Prisma Client 未生成该模型则跳过
    const crisisLog = (db as unknown as {
      crisisLog?: {
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      };
    }).crisisLog;

    if (!crisisLog || typeof crisisLog.create !== 'function') {
      // 模型不存在 - 静默降级（仅开发期告警一次）
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[safety-gateway] CrisisLog model not found in Prisma Client. Run `bun run db:push` after schema update.');
      }
      return;
    }

    const maskedInput = payload.userInput.slice(0, 200);
    await crisisLog.create({
      data: {
        userInput: maskedInput,
        riskLevel: payload.riskLevel,
        triggerKeywords: JSON.stringify(payload.triggerKeywords),
        interventionResponse: payload.interventionResponse.slice(0, 2000),
        hotlineShown: payload.hotlineShown ?? payload.riskLevel === 'severe',
        userId: payload.userId || null,
      },
    });
  } catch (err) {
    // 表不存在 / 写入失败 - 仅控制台告警，不上抛
    console.warn('[safety-gateway] crisis log db write failed:', err);
  }
}
