/**
 * 专栏文章详情 API
 * -----------------
 * GET /api/articles/[id]
 *
 * 访问规则：
 * - 公开访问：返回摘要 + 前 200 字预览（locked=true）
 * - 登录用户：
 *   - 已购买 / price=0 / pro / premium → 返回全文（locked=false）
 *   - 否则 → 返回摘要 + 预览（locked=true）
 *
 * 副作用：异步累加 viewCount（不阻塞响应，失败静默）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { isProOrPremium } from '@/lib/token-manager';

const PREVIEW_LENGTH = 200;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 异步累加浏览量（fire-and-forget）
    db.article
      .update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {
        /* 静默失败 */
      });

    const user = await getUserFromRequest(request);
    const isFree = article.price === 0;
    const isPro = user ? isProOrPremium(user.plan) : false;
    let purchased = false;
    if (user) {
      const purchase = await db.articlePurchase.findUnique({
        where: {
          userId_articleId: { userId: user.id, articleId: id },
        },
      });
      purchased = !!purchase;
    }

    const unlocked = isFree || isPro || purchased;
    const previewContent = article.content.slice(0, PREVIEW_LENGTH);

    return NextResponse.json({
      id: article.id,
      title: article.title,
      summary: article.summary,
      coverImage: article.coverImage,
      price: article.price,
      category: article.category,
      tags: article.tags,
      viewCount: article.viewCount,
      likeCount: article.likeCount,
      philosopherId: article.philosopherId,
      authorId: article.authorId,
      createdAt: article.createdAt,
      content: unlocked ? article.content : previewContent,
      previewLength: unlocked ? article.content.length : PREVIEW_LENGTH,
      totalLength: article.content.length,
      locked: !unlocked,
      purchased,
      isPro,
    });
  } catch (error) {
    console.error('[articles/detail] GET error:', error);
    return NextResponse.json(
      { error: '获取文章详情失败' },
      { status: 500 }
    );
  }
}
