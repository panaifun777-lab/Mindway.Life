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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/admin/analytics
 * 详细运营分析数据：
 *   - 最近 30 天每日对话量趋势
 *   - 哲学家热度 Top 20（按对话数）
 *   - 用户留存率（次日 / 7 日 / 30 日）
 *   - 转化漏斗（注册 → 对话 → 订阅）
 *   - API 调用成本估算（消息数 × 0.001 元）
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const now = new Date();

    // ============ 1. 最近 30 天每日对话量趋势 ============
    const thirtyDaysAgoStart = new Date(now);
    thirtyDaysAgoStart.setDate(thirtyDaysAgoStart.getDate() - 29); // 含今天共 30 天
    thirtyDaysAgoStart.setHours(0, 0, 0, 0);

    const recentConvs = await db.conversation.findMany({
      where: { createdAt: { gte: thirtyDaysAgoStart } },
      select: { createdAt: true, philosopherId: true },
    });

    // 构造 30 天日期桶（保证无数据日期也存在）
    const dailyTrend: Array<{ date: string; count: number }> = [];
    const trendMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      trendMap[key] = 0;
      dailyTrend.push({ date: key, count: 0 });
    }
    recentConvs.forEach((c) => {
      const key = c.createdAt.toISOString().split('T')[0];
      if (key in trendMap) trendMap[key]++;
    });
    dailyTrend.forEach((d) => (d.count = trendMap[d.date] || 0));

    // ============ 2. 哲学家热度 Top 20 ============
    const topPhilosophersRaw = await db.conversation.groupBy({
      by: ['philosopherId'],
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const topPhilosopherIds = topPhilosophersRaw.map((p) => p.philosopherId);
    const philosopherDetails = await db.philosopher.findMany({
      where: { id: { in: topPhilosopherIds } },
      select: {
        id: true,
        nameCn: true,
        nameEn: true,
        avatarUrl: true,
        era: true,
        category: true,
      },
    });
    const philosopherMap = new Map(philosopherDetails.map((p) => [p.id, p]));

    const topPhilosophers = topPhilosophersRaw
      .map((p, idx) => {
        const detail = philosopherMap.get(p.philosopherId);
        return {
          rank: idx + 1,
          philosopherId: p.philosopherId,
          name: detail?.nameCn || '未知',
          nameEn: detail?.nameEn || '',
          avatarUrl: detail?.avatarUrl || '',
          era: detail?.era || '',
          category: detail?.category || '',
          conversationCount: p._count._all,
        };
      })
      .filter((p) => p.name !== '未知');

    // ============ 3. 用户留存率（次日/7日/30日） ============
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
    const cohortUsers = await db.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { id: true, createdAt: true },
    });

    const cohortUserIds = cohortUsers.map((u) => u.id);
    // 拉取这些用户的全部对话，按时间升序后取首条
    const cohortConvs = await db.conversation.findMany({
      where: { userId: { in: cohortUserIds } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const firstConvByUser: Record<string, number> = {};
    cohortConvs.forEach((c) => {
      if (!c.userId) return;
      const t = c.createdAt.getTime();
      const uid = c.userId;
      if (!(uid in firstConvByUser) || t < firstConvByUser[uid]) {
        firstConvByUser[uid] = t;
      }
    });

    let d1Eligible = 0,
      d1Retained = 0;
    let d7Eligible = 0,
      d7Retained = 0;
    let d30Eligible = 0,
      d30Retained = 0;

    cohortUsers.forEach((u) => {
      const regTime = u.createdAt.getTime();
      const elapsedDays = (now.getTime() - regTime) / DAY_MS;
      const firstConvTs = firstConvByUser[u.id];
      const daysToFirstConv =
        firstConvTs !== undefined ? (firstConvTs - regTime) / DAY_MS : Infinity;

      if (elapsedDays >= 1) {
        d1Eligible++;
        if (daysToFirstConv <= 1) d1Retained++;
      }
      if (elapsedDays >= 7) {
        d7Eligible++;
        if (daysToFirstConv <= 7) d7Retained++;
      }
      if (elapsedDays >= 30) {
        d30Eligible++;
        if (daysToFirstConv <= 30) d30Retained++;
      }
    });

    const retention = {
      d1: {
        rate: d1Eligible > 0 ? +(d1Retained / d1Eligible * 100).toFixed(2) : 0,
        retained: d1Retained,
        eligible: d1Eligible,
      },
      d7: {
        rate: d7Eligible > 0 ? +(d7Retained / d7Eligible * 100).toFixed(2) : 0,
        retained: d7Retained,
        eligible: d7Eligible,
      },
      d30: {
        rate: d30Eligible > 0 ? +(d30Retained / d30Eligible * 100).toFixed(2) : 0,
        retained: d30Retained,
        eligible: d30Eligible,
      },
    };

    // ============ 4. 转化漏斗（注册 → 对话 → 订阅） ============
    const totalUsers = await db.user.count();
    // 有过对话的去重用户数（需 userId 不为空）
    const convUsersRaw = await db.conversation.findMany({
      where: { userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const usersWithConversation = convUsersRaw.length;

    // 活跃订阅去重用户数
    const subUsersRaw = await db.subscription.findMany({
      where: { status: 'active' },
      select: { userId: true },
      distinct: ['userId'],
    });
    const usersWithSubscription = subUsersRaw.length;

    const funnel = {
      registered: totalUsers,
      conversed: usersWithConversation,
      subscribed: usersWithSubscription,
      convRateRegToConv:
        totalUsers > 0 ? +((usersWithConversation / totalUsers) * 100).toFixed(2) : 0,
      convRateConvToSub:
        usersWithConversation > 0
          ? +((usersWithSubscription / usersWithConversation) * 100).toFixed(2)
          : 0,
      convRateOverall:
        totalUsers > 0 ? +((usersWithSubscription / totalUsers) * 100).toFixed(2) : 0,
    };

    // ============ 5. API 调用成本估算 ============
    const totalMessages = await db.message.count();
    const userMessages = await db.message.count({ where: { role: 'user' } });
    const assistantMessages = await db.message.count({ where: { role: 'assistant' } });
    // 单价 0.001 元/条
    const COST_PER_MESSAGE = 0.001;
    const apiCost = {
      totalMessages,
      userMessages,
      assistantMessages,
      costPerMessage: COST_PER_MESSAGE,
      estimatedCostCny: +(totalMessages * COST_PER_MESSAGE).toFixed(4),
    };

    // 30 天内每日消息趋势（粗略趋势展示用）
    const recentMsgs = await db.message.findMany({
      where: { createdAt: { gte: thirtyDaysAgoStart } },
      select: { createdAt: true },
    });
    const dailyMsgMap: Record<string, number> = {};
    recentMsgs.forEach((m) => {
      const key = m.createdAt.toISOString().split('T')[0];
      dailyMsgMap[key] = (dailyMsgMap[key] || 0) + 1;
    });
    const dailyMessageTrend: Array<{ date: string; count: number }> = dailyTrend.map((d) => ({
      date: d.date,
      count: dailyMsgMap[d.date] || 0,
    }));

    return NextResponse.json({
      generatedAt: now.toISOString(),
      dailyConversationTrend: dailyTrend,
      dailyMessageTrend,
      topPhilosophers,
      retention,
      funnel,
      apiCost,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: '获取分析数据失败' }, { status: 500 });
  }
}
