import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'philosophy-app-secret-key-2024'
);

/**
 * 解析当前登录用户 ID
 * 评分接口允许匿名提交（userId? 可为空），未登录返回 null
 */
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const tokenFromCookie = request.cookies.get('auth-token')?.value;
  const authHeader = request.headers.get('Authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const token = tokenFromCookie || tokenFromHeader;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.userId as string) || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/ratings?conversationId=xxx
 * 获取某个对话的评分（取最新一条；如有多条返回最新一条，
 * 同时附上聚合统计：avg / count，便于前端展示）
 */
export async function GET(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少 conversationId' },
        { status: 400 }
      );
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!conversation) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const [latest, aggregate] = await Promise.all([
      db.conversationRating.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
      }),
      db.conversationRating.aggregate({
        where: { conversationId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return NextResponse.json({
      rating: latest ? latest.rating : null,
      feedback: latest ? latest.feedback : '',
      createdAt: latest ? latest.createdAt : null,
      avg: aggregate._avg.rating ?? null,
      count: aggregate._count.rating,
    });
  } catch (error) {
    console.error('Ratings GET error:', error);
    return NextResponse.json({ error: '获取评分失败' }, { status: 500 });
  }
}

/**
 * POST /api/ratings
 * body: { conversationId, rating: 1-5, feedback? }
 * 提交对话评分。允许匿名（userId? 为空），但需校验对话存在与 rating 范围。
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);

    const body = await request.json().catch(() => ({}));
    const conversationId = body?.conversationId;
    const rating = Number(body?.rating);
    const feedback =
      typeof body?.feedback === 'string' ? body.feedback.trim().slice(0, 1000) : '';

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: '缺少 conversationId' },
        { status: 400 }
      );
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating 必须为 1-5 的整数' },
        { status: 400 }
      );
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!conversation) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const created = await db.conversationRating.create({
      data: {
        userId: userId || null,
        conversationId,
        rating,
        feedback,
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      rating: created.rating,
    });
  } catch (error) {
    console.error('Ratings POST error:', error);
    return NextResponse.json({ error: '提交评分失败' }, { status: 500 });
  }
}
