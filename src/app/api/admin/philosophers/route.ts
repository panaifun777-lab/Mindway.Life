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

// 字段白名单：从请求体中提取可写入字段
function pickPhilosopherFields(body: any) {
  return {
    nameCn: typeof body.nameCn === 'string' ? body.nameCn : undefined,
    nameEn: typeof body.nameEn === 'string' ? body.nameEn : undefined,
    slug: typeof body.slug === 'string' ? body.slug : undefined,
    era: typeof body.era === 'string' ? body.era : undefined,
    category: typeof body.category === 'string' ? body.category : undefined,
    tagline: typeof body.tagline === 'string' ? body.tagline : undefined,
    bioSummary: typeof body.bioSummary === 'string' ? body.bioSummary : undefined,
    coreInsight: typeof body.coreInsight === 'string' ? body.coreInsight : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt : undefined,
    quote: typeof body.quote === 'string' ? body.quote : undefined,
    quoteSource: typeof body.quoteSource === 'string' ? body.quoteSource : undefined,
    works: typeof body.works === 'string' ? body.works : undefined,
    worries: typeof body.worries === 'string' ? body.worries : undefined,
    recommendedBooks: typeof body.recommendedBooks === 'string' ? body.recommendedBooks : undefined,
    avatarUrl: typeof body.avatarUrl === 'string' ? body.avatarUrl : undefined,
    order: typeof body.order === 'number' ? body.order : undefined,
    published: typeof body.published === 'boolean' ? body.published : undefined,
    isHost: typeof body.isHost === 'boolean' ? body.isHost : undefined,
  };
}

// GET：获取所有哲学家列表（支持分页、搜索、按时代/分类筛选）
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50));
    const search = (searchParams.get('search') || '').trim();
    const era = (searchParams.get('era') || '').trim();
    const category = (searchParams.get('category') || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { nameCn: { contains: search } },
        { nameEn: { contains: search } },
        { slug: { contains: search } },
        { tagline: { contains: search } },
      ];
    }
    if (era) where.era = era;
    if (category) where.category = category;

    const [total, philosophers] = await Promise.all([
      db.philosopher.count({ where }),
      db.philosopher.findMany({
        where,
        orderBy: [{ isHost: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          nameCn: true,
          nameEn: true,
          slug: true,
          era: true,
          category: true,
          avatarUrl: true,
          tagline: true,
          order: true,
          published: true,
          isHost: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { conversations: true } },
        },
      }),
    ]);

    return NextResponse.json({
      philosophers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Admin philosophers list error:', error);
    return NextResponse.json({ error: '获取哲学家列表失败' }, { status: 500 });
  }
}

// POST：创建新哲学家
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });

    const fields = pickPhilosopherFields(body);

    // 必填字段校验
    const required: Array<keyof typeof fields> = ['nameCn', 'nameEn', 'slug', 'era', 'category', 'tagline', 'bioSummary', 'coreInsight', 'systemPrompt', 'quote'];
    for (const key of required) {
      const v = fields[key];
      if (v === undefined || v === null || v === '') {
        return NextResponse.json({ error: `字段 ${key} 不能为空` }, { status: 400 });
      }
    }

    // slug 唯一性检查
    const existing = await db.philosopher.findUnique({ where: { slug: fields.slug as string } });
    if (existing) {
      return NextResponse.json({ error: `slug "${fields.slug}" 已存在` }, { status: 409 });
    }

    // 计算默认 order：取当前最大 order + 1
    let order = fields.order;
    if (order === undefined) {
      const maxAgg = await db.philosopher.aggregate({ _max: { order: true } });
      order = (maxAgg._max.order ?? 0) + 1;
    }

    // 创建：剔除 undefined 字段
    const data: any = { order };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) data[k] = v;
    }

    const philosopher = await db.philosopher.create({ data });

    return NextResponse.json({ philosopher }, { status: 201 });
  } catch (error) {
    console.error('Admin philosophers create error:', error);
    return NextResponse.json({ error: '创建哲学家失败' }, { status: 500 });
  }
}
