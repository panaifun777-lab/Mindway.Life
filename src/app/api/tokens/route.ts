/**
 * Token API
 * ----------
 * GET  /api/tokens          获取当前余额 + 最近 10 条流水
 * POST /api/tokens          购买 Token 包
 *   body: { packageId: 'trial' | 'standard' | 'unlimited' }
 *
 * 套餐配置：
 *   trial:    ¥9.9  = 500 Token
 *   standard: ¥49   = 3000 Token
 *   unlimited:¥99   = 升级为 pro 用户（订阅而非 Token）
 *
 * 认证：cookie `auth-token`（参考 src/app/api/auth/me/route.ts）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import {
  getTokenBalance,
  purchaseTokens,
  checkAndResetMonthlyTokens,
  INITIAL_TOKENS,
} from '@/lib/token-manager';

// Token 套包配置
const TOKEN_PACKAGES = {
  trial: {
    id: 'trial',
    name: '体验包',
    price: 9.9,
    priceDisplay: '¥9.9',
    tokens: 500,
    description: '500 Token，适合轻度体验',
  },
  standard: {
    id: 'standard',
    name: '标准包',
    price: 49,
    priceDisplay: '¥49',
    tokens: 3000,
    description: '3000 Token，高频对话优选',
  },
  unlimited: {
    id: 'unlimited',
    name: '无限包',
    price: 99,
    priceDisplay: '¥99',
    tokens: 0, // 0 表示升级订阅而非充值 Token
    description: '升级为 Pro 用户，享无限对话',
    upgradePlan: 'pro',
  },
} as const;

export type TokenPackageId = keyof typeof TOKEN_PACKAGES;

// ============================================================
// GET /api/tokens
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    // 免费用户尝试月度重置（幂等）
    if (user.plan === 'free') {
      await checkAndResetMonthlyTokens(user.id);
    }

    const balance = await getTokenBalance(user.id);

    const recentTransactions = await db.tokenTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      balance,
      plan: user.plan,
      transactions: recentTransactions,
      packages: Object.values(TOKEN_PACKAGES),
    });
  } catch (error) {
    console.error('[tokens] GET error:', error);
    return NextResponse.json(
      { error: '获取 Token 信息失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/tokens
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { packageId } = body as { packageId?: TokenPackageId };

    if (!packageId || !TOKEN_PACKAGES[packageId]) {
      return NextResponse.json(
        { error: '无效的套餐 ID' },
        { status: 400 }
      );
    }

    const pkg = TOKEN_PACKAGES[packageId];

    // unlimited 套餐：升级为 pro 用户
    if ('upgradePlan' in pkg && pkg.upgradePlan) {
      // 创建订阅记录
      await db.subscription.create({
        data: {
          userId: user.id,
          plan: pkg.upgradePlan,
          amount: Math.round(pkg.price * 100), // 分
          currency: 'CNY',
          interval: 'month',
          status: 'active',
          paymentMethod: 'token_shop',
          transactionId: `tok_${Date.now()}_${user.id.slice(-6)}`,
        },
      });
      // 升级用户 plan
      await db.user.update({
        where: { id: user.id },
        data: { plan: pkg.upgradePlan },
      });

      const balance = await getTokenBalance(user.id);
      return NextResponse.json({
        success: true,
        balance,
        upgraded: true,
        plan: pkg.upgradePlan,
        message: `已升级为 ${pkg.upgradePlan === 'pro' ? '专业版' : '旗舰版'} 用户`,
      });
    }

    // 普通 Token 包：充值
    const result = await purchaseTokens(
      user.id,
      pkg.tokens,
      `购买 ${pkg.name}（${pkg.priceDisplay}）`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '购买失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      balance: result.balance,
      package: pkg.name,
      tokens: pkg.tokens,
      message: `成功购买 ${pkg.tokens} Token`,
    });
  } catch (error) {
    console.error('[tokens] POST error:', error);
    return NextResponse.json(
      { error: '购买失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export { INITIAL_TOKENS };
