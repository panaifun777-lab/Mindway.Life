/**
 * Token 管理库
 * -----------------
 * 统一处理 Mindway.Life 平台的 Token 账户、扣减、充值、月度重置等逻辑。
 * 所有写操作走事务，保证账户余额与流水一致。
 *
 * 账户模型：TokenAccount
 * 流水模型：TokenTransaction
 *
 * 业务规则：
 * - 新用户首次访问自动创建账户，初始余额 100 Token
 * - 免费用户每月初重置为 100 Token（保留已购买的部分）
 * - pro / premium 用户消费免 Token，由订阅承担
 */

import { db } from './db';

// ============================================================
// 计费常量
// ============================================================

/** 基础对话模式的 Token 成本（不含超长消息加成） */
export const BASE_COST: Record<'single' | 'debate' | 'deep', number> = {
  single: 5,
  debate: 15,
  deep: 30,
};

/** 超长消息阈值：超过该字数开始计费加成 */
const LONG_MESSAGE_THRESHOLD = 100;
/** 每多少字加 1 Token */
const LONG_MESSAGE_STEP = 50;

/** 免费用户每月赠送的 Token 额度 */
export const MONTHLY_FREE_TOKENS = 100;
/** 新用户首次创建账户的初始余额 */
export const INITIAL_TOKENS = 100;

// ============================================================
// 计费计算
// ============================================================

/**
 * 计算单条消息的 Token 成本
 *
 * @param message 用户输入的消息文本
 * @param mode    对话模式：single=单哲学家对话 / debate=辩论场 / deep=深度多智能体
 * @returns Token 数（整数）
 *
 * 规则：
 * - 基础成本：single 5 / debate 15 / deep 30
 * - 超长消息：每超出 100 字后的每 50 字追加 1 Token
 *
 * 示例：
 *   calculateMessageCost('你好', 'single')              // 5
 *   calculateMessageCost('a'.repeat(150), 'single')    // 5 + 1 = 6
 *   calculateMessageCost('a'.repeat(300), 'deep')      // 30 + 4 = 34
 */
export function calculateMessageCost(
  message: string,
  mode: 'single' | 'debate' | 'deep'
): number {
  const base = BASE_COST[mode] ?? BASE_COST.single;
  const safeMsg = typeof message === 'string' ? message : '';
  const len = safeMsg.length;

  if (len <= LONG_MESSAGE_THRESHOLD) {
    return base;
  }

  const overflow = len - LONG_MESSAGE_THRESHOLD;
  const extra = Math.floor(overflow / LONG_MESSAGE_STEP);
  return base + extra;
}

// ============================================================
// 账户查询
// ============================================================

/**
 * 获取用户 Token 余额
 *
 * - 若账户不存在，自动创建（首次访问，初始余额 = INITIAL_TOKENS）
 * - 同步记录初始流水（type=welcome），便于审计
 *
 * @param userId 用户 ID（来自 JWT）
 * @returns 当前余额（整数）
 */
export async function getTokenBalance(userId: string): Promise<number> {
  if (!userId) return 0;

  // 优先查已存在账户
  let account = await db.tokenAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    // 首次访问，自动创建账户 + 写入初始流水（事务保证一致）
    account = await db.$transaction(async (tx) => {
      const created = await tx.tokenAccount.create({
        data: {
          userId,
          balance: INITIAL_TOKENS,
          totalPurchased: 0,
          totalConsumed: 0,
        },
      });
      await tx.tokenTransaction.create({
        data: {
          userId,
          type: 'welcome',
          amount: INITIAL_TOKENS,
          balance: INITIAL_TOKENS,
          description: '新用户欢迎赠礼',
        },
      });
      return created;
    });
  }

  return account.balance;
}

// ============================================================
// 扣减 Token
// ============================================================

export interface ConsumeResult {
  success: boolean;
  balance: number;
  error?: string;
}

/**
 * 扣减用户 Token（事务保证）
 *
 * - 校验余额是否充足
 * - 原子扣减 balance + 累加 totalConsumed
 * - 同步写入流水（type=consume, amount=负数）
 *
 * @param userId      用户 ID
 * @param amount      扣减数量（正整数）
 * @param description 流水描述
 * @returns {success, balance, error?}
 */
export async function consumeTokens(
  userId: string,
  amount: number,
  description: string
): Promise<ConsumeResult> {
  if (!userId) {
    return { success: false, balance: 0, error: '未登录用户' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, balance: 0, error: '扣减数量必须为正整数' };
  }

  const intAmount = Math.floor(amount);

  try {
    const result = await db.$transaction(async (tx) => {
      // 锁定账户（SQLite 串行事务即可保证一致性）
      const account = await tx.tokenAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new Error('ACCOUNT_NOT_FOUND');
      }

      if (account.balance < intAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const newBalance = account.balance - intAmount;
      const updated = await tx.tokenAccount.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalConsumed: account.totalConsumed + intAmount,
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          type: 'consume',
          amount: -intAmount,
          balance: newBalance,
          description: description || '对话消费',
        },
      });

      return updated;
    });

    return { success: true, balance: result.balance };
  } catch (err: any) {
    if (err?.message === 'ACCOUNT_NOT_FOUND') {
      return { success: false, balance: 0, error: '账户不存在' };
    }
    if (err?.message === 'INSUFFICIENT_BALANCE') {
      return { success: false, balance: 0, error: 'Token 余额不足' };
    }
    console.error('[token-manager] consumeTokens error:', err);
    return { success: false, balance: 0, error: '扣减失败，请稍后重试' };
  }
}

// ============================================================
// 充值 Token
// ============================================================

export interface PurchaseResult {
  success: boolean;
  balance: number;
  error?: string;
}

/**
 * 充值 Token（购买 Token 包）
 *
 * - 若账户不存在，自动创建
 * - 原子增加 balance + totalPurchased
 * - 同步写入流水（type=purchase, amount=正数）
 *
 * @param userId      用户 ID
 * @param amount      充值数量（正整数）
 * @param description 流水描述（如 "购买 500 Token 包"）
 */
export async function purchaseTokens(
  userId: string,
  amount: number,
  description = '购买 Token 包'
): Promise<PurchaseResult> {
  if (!userId) {
    return { success: false, balance: 0, error: '未登录用户' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, balance: 0, error: '充值数量必须为正整数' };
  }

  const intAmount = Math.floor(amount);

  try {
    const result = await db.$transaction(async (tx) => {
      // upsert：账户可能尚未创建
      const account = await tx.tokenAccount.upsert({
        where: { userId },
        update: {
          balance: { increment: intAmount },
          totalPurchased: { increment: intAmount },
        },
        create: {
          userId,
          balance: INITIAL_TOKENS + intAmount,
          totalPurchased: intAmount,
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          type: 'purchase',
          amount: intAmount,
          balance: account.balance,
          description,
        },
      });

      return account;
    });

    return { success: true, balance: result.balance };
  } catch (err: any) {
    console.error('[token-manager] purchaseTokens error:', err);
    return { success: false, balance: 0, error: '充值失败，请稍后重试' };
  }
}

// ============================================================
// 月度免费 Token 重置
// ============================================================

/**
 * 检查并重置免费用户的月度 Token 额度
 *
 * 规则：
 * - 仅对 plan=free 的用户生效
 * - 若 monthlyResetAt 为空 / 跨自然月，则将余额重置为 MONTHLY_FREE_TOKENS
 * - 若用户当月已购买过 Token，重置后保留已购买的部分（balance - resetBefore + MONTHLY_FREE_TOKENS）
 *   - 简化策略：若当前余额 > MONTHLY_FREE_TOKENS，则不重置（保留用户已购买的部分）
 *   - 若 <= MONTHLY_FREE_TOKENS，则补齐到 MONTHLY_FREE_TOKENS
 *
 * 写入一条 type=monthly_reset 流水
 *
 * @param userId 用户 ID
 */
export async function checkAndResetMonthlyTokens(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!user || user.plan !== 'free') return;

    const now = new Date();
    const account = await db.tokenAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      // 没有账户，getTokenBalance 会自动创建，这里无需处理
      return;
    }

    // 判断是否需要重置：跨自然月
    const needReset = (() => {
      if (!account.monthlyResetAt) return true;
      const last = new Date(account.monthlyResetAt);
      return (
        last.getFullYear() !== now.getFullYear() ||
        last.getMonth() !== now.getMonth()
      );
    })();

    if (!needReset) return;

    // 重置策略：若余额已高于月度免费额度（用户购买过），不动；否则补齐到月度额度
    if (account.balance >= MONTHLY_FREE_TOKENS) {
      // 仅更新重置时间戳，不改变余额
      await db.tokenAccount.update({
        where: { userId },
        data: { monthlyResetAt: now },
      });
      return;
    }

    const refill = MONTHLY_FREE_TOKENS - account.balance;

    await db.$transaction(async (tx) => {
      const updated = await tx.tokenAccount.update({
        where: { userId },
        data: {
          balance: MONTHLY_FREE_TOKENS,
          monthlyResetAt: now,
        },
      });
      await tx.tokenTransaction.create({
        data: {
          userId,
          type: 'monthly_reset',
          amount: refill,
          balance: updated.balance,
          description: '月度免费 Token 重置',
        },
      });
    });
  } catch (err) {
    console.error('[token-manager] checkAndResetMonthlyTokens error:', err);
  }
}

// ============================================================
// 奖励 Token（推荐奖励 / 活动奖励 / 后台赠送）
// ============================================================

export type RewardType =
  | 'referral_reward'
  | 'signup_bonus'
  | 'activity_reward'
  | 'admin_grant';

/**
 * 奖励 Token（与购买不同：流水类型可自定义，便于审计区分）
 *
 * - 若账户不存在，自动创建（含 INITIAL_TOKENS 初始额度）
 * - 原子增加 balance（不累加 totalPurchased，因非购买行为）
 * - 同步写入流水（type 由调用方指定，amount=正数）
 *
 * 典型场景：
 *   - 推荐成功：rewardTokens(referrerId, 10, 'referral_reward', '成功邀请奖励')
 *   - 活动赠送：rewardTokens(userId, 50, 'activity_reward', '新年活动奖励')
 *
 * @param userId      用户 ID
 * @param amount      奖励数量（正整数）
 * @param type        流水类型
 * @param description 流水描述
 */
export async function rewardTokens(
  userId: string,
  amount: number,
  type: RewardType,
  description: string
): Promise<PurchaseResult> {
  if (!userId) {
    return { success: false, balance: 0, error: '未登录用户' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, balance: 0, error: '奖励数量必须为正整数' };
  }

  const intAmount = Math.floor(amount);

  try {
    const result = await db.$transaction(async (tx) => {
      const account = await tx.tokenAccount.upsert({
        where: { userId },
        update: {
          balance: { increment: intAmount },
        },
        create: {
          userId,
          balance: INITIAL_TOKENS + intAmount,
          totalPurchased: 0,
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          type,
          amount: intAmount,
          balance: account.balance,
          description,
        },
      });

      return account;
    });

    return { success: true, balance: result.balance };
  } catch (err: any) {
    console.error('[token-manager] rewardTokens error:', err);
    return { success: false, balance: 0, error: '奖励发放失败，请稍后重试' };
  }
}

// ============================================================
// 订阅等级判定
// ============================================================

/**
 * 判断用户是否为付费订阅用户（pro / premium）
 * 付费用户对话消费免 Token，由订阅承担。
 */
export function isProOrPremium(plan: string | undefined | null): boolean {
  return plan === 'pro' || plan === 'premium';
}
