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

// 字段白名单：从请求体中提取可更新字段（仅支持 task 中列出的字段）
function pickUpdatableFields(body: any) {
  const allowed: Record<string, any> = {
    nameCn: 'string',
    nameEn: 'string',
    slug: 'string',
    era: 'string',
    category: 'string',
    tagline: 'string',
    bioSummary: 'string',
    coreInsight: 'string',
    description: 'string',
    systemPrompt: 'string',
    quote: 'string',
    quoteSource: 'string',
    works: 'string',
    worries: 'string',
    recommendedBooks: 'string',
    avatarUrl: 'string',
    order: 'number',
    published: 'boolean',
    isHost: 'boolean',
  };
  const data: any = {};
  for (const [key, type] of Object.entries(allowed)) {
    if (body[key] === undefined) continue;
    if (type === 'number' && typeof body[key] !== 'number') continue;
    if (type === 'boolean' && typeof body[key] !== 'boolean') continue;
    if (type === 'string' && typeof body[key] !== 'string') continue;
    data[key] = body[key];
  }
  return data;
}

// GET：获取单个哲学家详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { id } = await params;
    const philosopher = await db.philosopher.findUnique({ where: { id } });
    if (!philosopher) {
      return NextResponse.json({ error: '哲学家不存在' }, { status: 404 });
    }
    return NextResponse.json({ philosopher });
  } catch (error) {
    console.error('Admin philosopher get error:', error);
    return NextResponse.json({ error: '获取哲学家失败' }, { status: 500 });
  }
}

// PUT：更新哲学家信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });

    const existing = await db.philosopher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '哲学家不存在' }, { status: 404 });
    }

    const data = pickUpdatableFields(body);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 });
    }

    // 如果修改了 slug，需要检查唯一性
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await db.philosopher.findUnique({ where: { slug: data.slug } });
      if (conflict) {
        return NextResponse.json({ error: `slug "${data.slug}" 已存在` }, { status: 409 });
      }
    }

    const philosopher = await db.philosopher.update({
      where: { id },
      data,
    });

    return NextResponse.json({ philosopher });
  } catch (error) {
    console.error('Admin philosopher update error:', error);
    return NextResponse.json({ error: '更新哲学家失败' }, { status: 500 });
  }
}

// DELETE：删除哲学家
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { id } = await params;
    const existing = await db.philosopher.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '哲学家不存在' }, { status: 404 });
    }

    // 检查是否有关联对话；如果有，提示需先迁移或强制删除
    const conversationCount = await db.conversation.count({ where: { philosopherId: id } });
    if (conversationCount > 0) {
      return NextResponse.json(
        {
          error: `该哲学家存在 ${conversationCount} 条关联对话，无法直接删除。请先迁移对话或在前端使用强制删除。`,
          conversationCount,
        },
        { status: 409 }
      );
    }

    await db.philosopher.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Admin philosopher delete error:', error);
    return NextResponse.json({ error: '删除哲学家失败' }, { status: 500 });
  }
}
