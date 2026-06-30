/**
 * 共享认证工具
 * --------------
 * 从 cookie 读取 `auth-token`，用 jose jwtVerify 验证，返回 user 记录。
 * 与 src/app/api/auth/me/route.ts 保持一致的认证逻辑。
 *
 * 用法：
 *   import { getUserFromRequest } from '@/lib/auth';
 *   const user = await getUserFromRequest(request);
 *   if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'philosophy-app-secret-key-2024'
);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: string;
  avatar: string;
  referralCode: string;
  referredBy: string;
}

/**
 * 从请求中解析当前登录用户。
 *
 * 优先从 cookie `auth-token` 读取，其次从 Authorization: Bearer 头读取。
 * 验证通过后从 DB 拉取最新的用户记录（含 plan/role 等字段）。
 *
 * @param request NextRequest
 * @returns AuthUser | null
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    const tokenFromCookie = request.cookies.get('auth-token')?.value;
    const authHeader = request.headers.get('Authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    if (!userId) return null;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        role: true,
        avatar: true,
        referralCode: true,
        referredBy: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * 简化中间件：未登录直接返回 401
 */
export async function requireUser(request: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return user;
}

/**
 * 简化中间件：非 admin 直接返回 403
 */
export async function requireAdmin(request: NextRequest): Promise<AuthUser | NextResponse> {
  const result = await requireUser(request);
  if (result instanceof NextResponse) return result;
  if (result.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  return result;
}
