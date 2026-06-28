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

// PUT: 更新优惠券（启用/停用 或 修改其他字段）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '优惠券不存在' }, { status: 404 });
    }

    // 构造更新数据，仅更新提供的字段
    const data: Record<string, unknown> = {};

    if (typeof body.active === 'boolean') {
      data.active = body.active;
    }

    if (typeof body.code === 'string' && body.code.trim().length >= 3) {
      const newCode = body.code.trim().toUpperCase();
      if (newCode !== existing.code) {
        const dup = await db.coupon.findUnique({ where: { code: newCode } });
        if (dup) {
          return NextResponse.json({ error: '该优惠码已存在' }, { status: 400 });
        }
        data.code = newCode;
      }
    }

    if (body.discountType && ['percentage', 'fixed'].includes(body.discountType)) {
      data.discountType = body.discountType;
    }

    if (body.discountValue !== undefined) {
      const v = Number(body.discountValue);
      if (Number.isFinite(v) && v > 0) {
        if (data.discountType === 'percentage' || (!data.discountType && existing.discountType === 'percentage')) {
          if (v > 100) {
            return NextResponse.json({ error: '百分比折扣不能超过 100' }, { status: 400 });
          }
        }
        data.discountValue = Math.round(v);
      }
    }

    if (typeof body.planId === 'string') {
      data.planId = body.planId.trim();
    }

    if (body.maxUses !== undefined) {
      const u = Number(body.maxUses);
      if (Number.isFinite(u) && u > 0) {
        data.maxUses = Math.round(u);
      }
    }

    if (body.expiresAt !== undefined) {
      if (body.expiresAt === null || body.expiresAt === '') {
        data.expiresAt = null;
      } else {
        const parsed = new Date(body.expiresAt);
        if (!isNaN(parsed.getTime())) {
          data.expiresAt = parsed;
        }
      }
    }

    const updated = await db.coupon.update({
      where: { id },
      data,
    });

    return NextResponse.json({ coupon: updated });
  } catch (error) {
    console.error('Update coupon error:', error);
    return NextResponse.json({ error: '更新优惠券失败' }, { status: 500 });
  }
}

// DELETE: 删除优惠券
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '优惠券不存在' }, { status: 404 });
    }

    await db.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return NextResponse.json({ error: '删除优惠券失败' }, { status: 500 });
  }
}
