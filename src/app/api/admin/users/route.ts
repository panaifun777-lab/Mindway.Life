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
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            subscriptions: true,
            insights: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 获取每个用户的对话数和消息数
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const conversations = await db.conversation.count({
          where: { userId: u.id },
        });
        const messages = await db.message.count({
          where: { conversation: { userId: u.id } },
        });
        return {
          ...u,
          conversationCount: conversations,
          messageCount: messages,
        };
      })
    );

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
