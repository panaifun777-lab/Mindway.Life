/**
 * 推广联盟 API
 * -------------
 * GET  /api/referral   获取当前用户的邀请码 + 推广统计
 * POST /api/referral   生成 / 重置邀请码
 *   body: { action: 'generate' | 'regenerate' }
 *
 * 邀请码规则：6 位大写字母+数字（去除 I/O/0/1 等易混淆字符）
 * 佣金规则：被邀请用户消费时，邀请人获得 10% 佣金（Referral.commission，单位：分）
 *           被邀请人注册即奖励邀请人 10 Token（即时激励）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除 I/O/0/1
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueCode(): Promise<string> {
  // 最多重试 10 次
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const exists = await db.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  // 兜底：附加时间戳后缀（仍保持 6 位主体 + 2 位尾缀的短链形式）
  return (
    generateCode().slice(0, 4) +
    Date.now().toString(36).slice(-2).toUpperCase()
  );
}

// ============================================================
// GET /api/referral
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    // 自动生成邀请码（若空）
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = await generateUniqueCode();
      await db.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    const [referrals, commissionAgg] = await Promise.all([
      db.referral.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          status: true,
          commission: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      db.referral.aggregate({
        where: { referrerId: user.id },
        _sum: { commission: true },
      }),
    ]);

    const [totalReferrals, activeReferrals] = await Promise.all([
      db.referral.count({ where: { referrerId: user.id } }),
      db.referral.count({
        where: { referrerId: user.id, status: 'converted' },
      }),
    ]);

    return NextResponse.json({
      referralCode,
      referralLink: `https://mindway.life/?ref=${referralCode}`,
      totalReferrals,
      activeReferrals,
      totalCommission: commissionAgg._sum.commission || 0, // 单位：分
      recentReferrals: referrals,
    });
  } catch (error) {
    console.error('[referral] GET error:', error);
    return NextResponse.json(
      { error: '获取推广信息失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/referral
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'generate' } = body as {
      action?: 'generate' | 'regenerate';
    };

    // regenerate 会清空旧码；若已有邀请记录，禁止重置（防止旧链接失效）
    if (action === 'regenerate' && user.referralCode) {
      const hasReferrals = await db.referral.count({
        where: { referrerId: user.id },
      });
      if (hasReferrals > 0) {
        return NextResponse.json(
          { error: '已有邀请记录，无法重置邀请码（防止旧链接失效）' },
          { status: 400 }
        );
      }
    }

    const newCode = await generateUniqueCode();
    await db.user.update({
      where: { id: user.id },
      data: { referralCode: newCode },
    });

    return NextResponse.json({
      success: true,
      referralCode: newCode,
      referralLink: `https://mindway.life/?ref=${newCode}`,
      message: '邀请码已生成',
    });
  } catch (error) {
    console.error('[referral] POST error:', error);
    return NextResponse.json(
      { error: '生成邀请码失败' },
      { status: 500 }
    );
  }
}
