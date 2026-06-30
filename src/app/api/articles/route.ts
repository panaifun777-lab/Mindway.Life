/**
 * 专栏文章列表 API
 * -----------------
 * GET /api/articles?category=&tag=&philosopherId=&page=1&pageSize=20
 *
 * 公开访问：返回所有已发布文章的列表（不含全文，仅元信息 + 摘要）。
 * 登录用户额外返回 purchasedIds（已购买文章 ID 列表），便于前端标记。
 *
 * 认证：可选（cookie `auth-token`，参考 src/lib/auth.ts）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const philosopherId = searchParams.get('philosopherId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
    );

    const where: any = { published: true };
    if (category) where.category = category;
    if (philosopherId) where.philosopherId = philosopherId;
    if (tag) where.tags = { contains: tag };

    const [items, total] = await Promise.all([
      db.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          summary: true,
          coverImage: true,
          price: true,
          category: true,
          tags: true,
          viewCount: true,
          likeCount: true,
          philosopherId: true,
          createdAt: true,
        },
      }),
      db.article.count({ where }),
    ]);

    // 登录用户：附带已购买 ID 列表
    const user = await getUserFromRequest(request);
    let purchasedIds: string[] = [];
    if (user) {
      const purchases = await db.articlePurchase.findMany({
        where: { userId: user.id },
        select: { articleId: true },
      });
      purchasedIds = purchases.map((p) => p.articleId);
    }

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      purchasedIds,
    });
  } catch (error) {
    console.error('[articles] GET error:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}
