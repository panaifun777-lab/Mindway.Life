/**
 * 购买专栏文章 API
 * -----------------
 * POST /api/articles/[id]/purchase
 *
 * 解锁规则：
 * 1. 已购买：幂等返回全文
 * 2. 免费文章（price=0）：直接创建购买记录，返回全文
 * 3. pro / premium 用户：免费解锁（写购买记录 price=0）
 * 4. 普通用户：从 Token 余额扣 article.price，写入 ArticlePurchase + 流水
 *
 * 返回解锁后的全文 content。
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { consumeTokens, isProOrPremium } from '@/lib/token-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const article = await db.article.findUnique({
      where: { id },
    });

    if (!article || !article.published) {
      return NextResponse.json(
        { error: '文章不存在或已下架' },
        { status: 404 }
      );
    }

    // 1. 已购买：幂等返回
    const existing = await db.articlePurchase.findUnique({
      where: {
        userId_articleId: { userId: user.id, articleId: id },
      },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyPurchased: true,
        content: article.content,
        message: '已购买过该文章',
      });
    }

    // 2. 免费文章：直接解锁
    if (article.price === 0) {
      await db.articlePurchase.create({
        data: {
          userId: user.id,
          articleId: id,
          price: 0,
        },
      });
      return NextResponse.json({
        success: true,
        content: article.content,
        message: '免费文章已解锁',
      });
    }

    // 3. pro / premium 用户：免费解锁
    if (isProOrPremium(user.plan)) {
      await db.articlePurchase.create({
        data: {
          userId: user.id,
          articleId: id,
          price: 0,
        },
      });
      return NextResponse.json({
        success: true,
        content: article.content,
        message: 'Pro/Premium 用户免费解锁',
      });
    }

    // 4. Token 支付
    const result = await consumeTokens(
      user.id,
      article.price,
      `购买专栏文章：${article.title}`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Token 余额不足' },
        { status: 400 }
      );
    }

    await db.articlePurchase.create({
      data: {
        userId: user.id,
        articleId: id,
        price: article.price,
      },
    });

    // 异步累计佣金（被邀请人消费时，邀请人获得 10% 佣金）
    // 直接调用 DB（避免内部 HTTP fetch 无法转发 cookie）
    if (user.referredBy) {
      const COMMISSION_RATE = 0.1;
      // Token 折算为元：1 Token = 0.01 元（与 ¥9.9 = 500 Token 一致）
      const amountYuan = article.price / 100;
      const commissionFen = Math.round(amountYuan * 100 * COMMISSION_RATE);
      if (commissionFen > 0) {
        db.referral
          .findFirst({ where: { referredId: user.id } })
          .then((ref) =>
            ref
              ? db.referral.update({
                  where: { id: ref.id },
                  data: {
                    commission: { increment: commissionFen },
                    status: 'converted',
                  },
                })
              : null
          )
          .catch(() => {
            /* 静默 */
          });
      }
    }

    return NextResponse.json({
      success: true,
      content: article.content,
      balance: result.balance,
      message: `购买成功，消耗 ${article.price} Token`,
    });
  } catch (error) {
    console.error('[articles/purchase] POST error:', error);
    return NextResponse.json(
      { error: '购买失败，请稍后重试' },
      { status: 500 }
    );
  }
}
