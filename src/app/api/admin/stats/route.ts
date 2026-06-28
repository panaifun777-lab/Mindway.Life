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
  if (!admin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    // 用户统计
    const totalUsers = await db.user.count();
    const proUsers = await db.user.count({ where: { plan: 'pro' } });
    const premiumUsers = await db.user.count({ where: { plan: 'premium' } });
    const freeUsers = await db.user.count({ where: { plan: 'free' } });

    // 对话统计
    const totalConversations = await db.conversation.count();
    const totalMessages = await db.message.count();
    const userMessages = await db.message.count({ where: { role: 'user' } });
    const assistantMessages = await db.message.count({ where: { role: 'assistant' } });

    // 今日统计
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayUsers = await db.user.count({ where: { createdAt: { gte: todayStart } } });
    const todayConversations = await db.conversation.count({ where: { createdAt: { gte: todayStart } } });
    const todayMessages = await db.message.count({ where: { createdAt: { gte: todayStart } } });

    // 订阅统计
    const activeSubscriptions = await db.subscription.count({ where: { status: 'active' } });
    const pendingSubscriptions = await db.subscription.count({ where: { status: 'pending' } });
    const totalRevenue = await db.subscription.aggregate({
      where: { status: 'active' },
      _sum: { amount: true },
    });

    // 危机干预统计
    const totalCrisisLogs = await db.crisisLog.count();
    const severeCrisisLogs = await db.crisisLog.count({ where: { riskLevel: 'severe' } });
    const unresolvedCrisis = await db.crisisLog.count({ where: { resolved: false } });

    // 哲学家统计
    const totalPhilosophers = await db.philosopher.count();
    const hostCount = await db.philosopher.count({ where: { isHost: true } });

    // 心智洞察统计
    const totalInsights = await db.userInsight.count();

    // 最近7天用户增长
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await db.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // 按天分组
    const dailyNewUsers: Record<string, number> = {};
    recentUsers.forEach(u => {
      const day = u.createdAt.toISOString().split('T')[0];
      dailyNewUsers[day] = (dailyNewUsers[day] || 0) + 1;
    });

    // 最近对话
    const recentConversations = await db.conversation.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        philosopher: { select: { nameCn: true, avatarUrl: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      users: {
        total: totalUsers,
        pro: proUsers,
        premium: premiumUsers,
        free: freeUsers,
        today: todayUsers,
        dailyNew: dailyNewUsers,
      },
      conversations: {
        total: totalConversations,
        today: todayConversations,
      },
      messages: {
        total: totalMessages,
        user: userMessages,
        assistant: assistantMessages,
        today: todayMessages,
      },
      subscriptions: {
        active: activeSubscriptions,
        pending: pendingSubscriptions,
        revenue: totalRevenue._sum.amount || 0,
      },
      crisis: {
        total: totalCrisisLogs,
        severe: severeCrisisLogs,
        unresolved: unresolvedCrisis,
      },
      philosophers: {
        total: totalPhilosophers,
        hosts: hostCount,
      },
      insights: totalInsights,
      recentConversations: recentConversations.map(c => ({
        id: c.id,
        philosopherName: c.philosopher.nameCn,
        philosopherAvatar: c.philosopher.avatarUrl,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        mode: c.mode,
      })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
  }
}
