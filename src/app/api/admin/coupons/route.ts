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

// GET: 获取所有优惠券列表
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Admin coupons list error:', error);
    return NextResponse.json({ error: '获取优惠券列表失败' }, { status: 500 });
  }
}

// POST: 创建新优惠券
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const body = await request.json();
    const { code, discountType, discountValue, planId, maxUses, expiresAt } = body;

    // 基础校验
    if (!code || typeof code !== 'string' || code.trim().length < 3) {
      return NextResponse.json({ error: '优惠码至少需要 3 个字符' }, { status: 400 });
    }

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return NextResponse.json({ error: '折扣类型必须是 percentage 或 fixed' }, { status: 400 });
    }

    const value = Number(discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: '折扣值必须为正数' }, { status: 400 });
    }

    if (discountType === 'percentage' && value > 100) {
      return NextResponse.json({ error: '百分比折扣不能超过 100' }, { status: 400 });
    }

    // 检查优惠码是否已存在
    const existing = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: '该优惠码已存在' }, { status: 400 });
    }

    const uses = Number(maxUses) > 0 ? Number(maxUses) : 100;

    let expiresAtDate: Date | null = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (!isNaN(parsed.getTime())) {
        expiresAtDate = parsed;
      }
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Math.round(value),
        planId: typeof planId === 'string' ? planId.trim() : '',
        maxUses: uses,
        expiresAt: expiresAtDate,
      },
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    console.error('Create coupon error:', error);
    return NextResponse.json({ error: '创建优惠券失败' }, { status: 500 });
  }
}
