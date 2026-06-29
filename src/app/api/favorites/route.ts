import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'philosophy-app-secret-key-2024'
);

/**
 * 解析当前登录用户 ID
 * 与 auth/me/route.ts 一致：优先 cookie `auth-token`，其次 Authorization: Bearer
 * 未登录返回 null（不抛错，由调用方决定是否拒绝）
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
 * GET /api/favorites
 * 获取当前登录用户的收藏列表（含哲学家基础信息）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 注意：UserFavorite 表只存 philosopherId，没有显式 relation，
    // 不能用 include。这里先拿收藏列表，再批量查哲学家基础信息拼装。
    const favorites = await db.userFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (favorites.length === 0) {
      return NextResponse.json({ favorites: [] });
    }

    const philosopherIds = favorites.map((f) => f.philosopherId);
    const philosophers = await db.philosopher.findMany({
      where: { id: { in: philosopherIds }, published: true },
      select: {
        id: true,
        nameCn: true,
        nameEn: true,
        slug: true,
        era: true,
        category: true,
        avatarUrl: true,
        tagline: true,
        quote: true,
        quoteSource: true,
        isHost: true,
      },
    });
    const philosopherMap = new Map(philosophers.map((p) => [p.id, p]));

    // 过滤掉未发布 / 已删除的哲学家
    const list = favorites
      .filter((f) => philosopherMap.has(f.philosopherId))
      .map((f) => ({
        id: f.id,
        philosopherId: f.philosopherId,
        createdAt: f.createdAt,
        philosopher: philosopherMap.get(f.philosopherId)!,
      }));

    return NextResponse.json({ favorites: list });
  } catch (error) {
    console.error('Favorites GET error:', error);
    return NextResponse.json({ error: '获取收藏列表失败' }, { status: 500 });
  }
}

/**
 * POST /api/favorites
 * body: { philosopherId }
 * 收藏哲学家（唯一约束会兜底重复收藏）
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const philosopherId = body?.philosopherId;
    if (!philosopherId || typeof philosopherId !== 'string') {
      return NextResponse.json(
        { error: '缺少 philosopherId' },
        { status: 400 }
      );
    }

    // 校验哲学家存在
    const philosopher = await db.philosopher.findUnique({
      where: { id: philosopherId },
      select: { id: true, published: true },
    });
    if (!philosopher || !philosopher.published) {
      return NextResponse.json({ error: '哲学家不存在' }, { status: 404 });
    }

    // upsert：避免唯一约束冲突报错
    const favorite = await db.userFavorite.upsert({
      where: {
        userId_philosopherId: { userId, philosopherId },
      },
      update: {}, // 已存在则不动
      create: { userId, philosopherId },
    });

    return NextResponse.json({
      ok: true,
      favorited: true,
      id: favorite.id,
    });
  } catch (error) {
    console.error('Favorites POST error:', error);
    return NextResponse.json({ error: '收藏失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/favorites
 * body: { philosopherId }
 * 取消收藏
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const philosopherId = body?.philosopherId;
    if (!philosopherId || typeof philosopherId !== 'string') {
      return NextResponse.json(
        { error: '缺少 philosopherId' },
        { status: 400 }
      );
    }

    await db.userFavorite
      .delete({
        where: {
          userId_philosopherId: { userId, philosopherId },
        },
      })
      .catch(() => {
        // 不存在也视为成功（幂等）
      });

    return NextResponse.json({ ok: true, favorited: false });
  } catch (error) {
    console.error('Favorites DELETE error:', error);
    return NextResponse.json({ error: '取消收藏失败' }, { status: 500 });
  }
}
