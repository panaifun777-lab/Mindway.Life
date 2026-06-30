/**
 * 邀请跟踪 API
 * -------------
 * POST /api/referral/track
 *   body: {
 *     action: 'signup' | 'purchase',
 *     code?: string,      // signup 时必填：从 URL ?ref=xxx 拿到的邀请码
 *     amount?: number,    // purchase 时必填：消费金额（元）
 *   }
 *
 * signup 行为（被邀请人注册时调用）：
 *   - 幂等：已绑定 referredBy 则跳过
 *   - 校验邀请码有效 + 非自己邀请自己
 *   - 事务：写 user.referredBy + 创建 Referral 记录（status='registered'）
 *   - 异步：奖励邀请人 10 Token（推荐即时激励）
 *
 * purchase 行为（被邀请人消费时调用）：
 *   - 查找 Referral 记录
 *   - commission += 10% * amount * 100（分）
 *   - 状态升级为 'converted'
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { rewardTokens } from '@/lib/token-manager';

const REFERRAL_REWARD_TOKENS = 10; // 推荐成功即时奖励邀请人的 Token 数
const COMMISSION_RATE = 0.10; // 10% 佣金

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, amount, code } = body as {
      action: 'signup' | 'purchase';
      amount?: number;
      code?: string;
    };

    // ============================================================
    // signup: 绑定邀请关系
    // ============================================================
    if (action === 'signup') {
      // 幂等：已绑定则跳过
      if (user.referredBy) {
        return NextResponse.json({
          success: true,
          alreadyTracked: true,
          message: '已绑定邀请关系',
        });
      }

      const referralCode = (code || '').trim().toUpperCase();
      if (!referralCode) {
        return NextResponse.json(
          { error: '缺少邀请码' },
          { status: 400 }
        );
      }

      // 不能邀请自己
      if (referralCode === user.referralCode) {
        return NextResponse.json(
          { error: '不能使用自己的邀请码' },
          { status: 400 }
        );
      }

      const referrer = await db.user.findFirst({
        where: { referralCode },
        select: { id: true },
      });
      if (!referrer) {
        return NextResponse.json(
          { error: '邀请码无效' },
          { status: 404 }
        );
      }

      // 事务：绑定 referredBy + 创建 Referral 记录
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { referredBy: referralCode },
        });

        await tx.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            referralCode,
            commission: 0,
            status: 'registered',
          },
        });
      });

      // 异步奖励邀请人 Token（失败不影响主流程）
      rewardTokens(
        referrer.id,
        REFERRAL_REWARD_TOKENS,
        'referral_reward',
        `成功邀请用户注册（邀请码 ${referralCode}）`
      ).catch((err) => {
        console.error('[referral/track] rewardTokens failed:', err);
      });

      return NextResponse.json({
        success: true,
        message: '邀请关系绑定成功',
      });
    }

    // ============================================================
    // purchase: 累计佣金
    // ============================================================
    if (action === 'purchase') {
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: '购买金额无效' },
          { status: 400 }
        );
      }

      if (!user.referredBy) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: '无邀请人，跳过佣金计算',
        });
      }

      const referral = await db.referral.findFirst({
        where: { referredId: user.id },
      });
      if (!referral) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: '未找到邀请关系记录',
        });
      }

      const commissionFen = Math.round(amount * 100 * COMMISSION_RATE);

      await db.referral.update({
        where: { id: referral.id },
        data: {
          commission: { increment: commissionFen },
          status: 'converted',
        },
      });

      return NextResponse.json({
        success: true,
        commission: commissionFen,
        message: `佣金累计成功（+${commissionFen} 分）`,
      });
    }

    return NextResponse.json(
      { error: '无效的 action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[referral/track] error:', error);
    return NextResponse.json(
      { error: '邀请跟踪失败' },
      { status: 500 }
    );
  }
}
