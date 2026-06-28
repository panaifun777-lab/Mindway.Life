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
    const logs = await db.crisisLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Admin crisis logs error:', error);
    return NextResponse.json({ error: '获取危机日志失败' }, { status: 500 });
  }
}

// 标记危机已处理
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { id, resolved } = await request.json();
    await db.crisisLog.update({
      where: { id },
      data: { resolved },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update crisis log error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
