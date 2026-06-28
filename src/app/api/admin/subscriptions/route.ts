import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'philosophy-app-secret-key-2024');

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') return null;
    const user = await db.user.findUnique({ where: { id: payload.userId as string } });
    if (!user || user.role !== 'admin') return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const subs = await db.subscription.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ subscriptions: subs });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({ error: '获取订阅失败' }, { status: 500 });
  }
}
