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
    // Token统计
    const tokenAccounts = await db.tokenAccount.count();
    const tokenConsumed = await db.tokenTransaction.aggregate({
      where: { type: 'consume', amount: { lt: 0 } },
      _sum: { amount: true },
    });
    const tokenPurchased = await db.tokenTransaction.aggregate({
      where: { type: 'purchase' },
      _sum: { amount: true },
    });
    const tokenRevenue = await db.tokenTransaction.aggregate({
      where: { type: 'purchase' },
      _sum: { amount: true },
    });
    // Token收入估算：每个购买交易对应¥9.9/¥49/¥99
    const tokenPurchases = await db.tokenTransaction.count({ where: { type: 'purchase' } });

    // 专栏统计
    const totalArticles = await db.article.count();
    const totalPurchases = await db.articlePurchase.count();
    const articleRevenue = await db.articlePurchase.aggregate({ _sum: { price: true } });
    const topArticles = await db.articlePurchase.groupBy({
      by: ['articleId'],
      _count: { articleId: true },
      orderBy: { _count: { articleId: 'desc' } },
      take: 5,
    });
    let topArticleDetails: any[] = [];
    if (topArticles.length > 0) {
      const ids = topArticles.map(t => t.articleId);
      const arts = await db.article.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, price: true } });
      topArticleDetails = topArticles.map(t => {
        const art = arts.find(a => a.id === t.articleId);
        return { title: art?.title || '未知', price: art?.price || 0, purchases: t._count.articleId };
      });
    }

    // 数字生命体统计
    const totalDigitalLives = await db.digitalLife.count();
    const basicLives = await db.digitalLife.count({ where: { tier: 'basic' } });
    const annualLives = await db.digitalLife.count({ where: { tier: 'annual' } });
    const premiumLives = await db.digitalLife.count({ where: { tier: 'premium' } });
    // 数字生命体收入估算
    const digitalLifeRevenue = basicLives * 19900 + annualLives * 29900 + premiumLives * 99900;

    // 联盟统计
    const totalReferrals = await db.referral.count();
    const paidReferrals = await db.referral.count({ where: { status: 'paid' } });
    const totalCommission = await db.referral.aggregate({ _sum: { commission: true } });

    // Token收入估算（按套餐）
    const tokenRevenueEstimate = tokenPurchases * 2000; // 平均¥20/次购买

    return NextResponse.json({
      token: {
        activeAccounts: tokenAccounts,
        totalConsumed: Math.abs(tokenConsumed._sum.amount || 0),
        totalPurchased: tokenPurchased._sum.amount || 0,
        purchaseCount: tokenPurchases,
        revenueEstimate: tokenRevenueEstimate, // 分
      },
      articles: {
        total: totalArticles,
        totalPurchases,
        revenue: articleRevenue._sum.price || 0, // 分
        topArticles: topArticleDetails,
      },
      digitalLife: {
        total: totalDigitalLives,
        basic: basicLives,
        annual: annualLives,
        premium: premiumLives,
        revenue: digitalLifeRevenue, // 分
      },
      referral: {
        total: totalReferrals,
        paid: paidReferrals,
        commission: totalCommission._sum.commission || 0, // 分
        conversionRate: totalReferrals > 0 ? (paidReferrals / totalReferrals * 100).toFixed(1) : '0',
      },
      totalRevenue: tokenRevenueEstimate + (articleRevenue._sum.price || 0) + digitalLifeRevenue,
    });
  } catch (error) {
    console.error('Monetization stats error:', error);
    return NextResponse.json({ error: '获取盈利数据失败' }, { status: 500 });
  }
}
