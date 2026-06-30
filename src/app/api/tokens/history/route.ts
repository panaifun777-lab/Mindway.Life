/**
 * Token 流水 API
 * ---------------
 * GET /api/tokens/history?page=1&pageSize=20
 *
 * 分页返回当前用户的 Token 交易流水（按时间倒序）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
    );

    const [items, total] = await Promise.all([
      db.tokenTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.tokenTransaction.count({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[tokens/history] error:', error);
    return NextResponse.json(
      { error: '获取流水失败' },
      { status: 500 }
    );
  }
}
