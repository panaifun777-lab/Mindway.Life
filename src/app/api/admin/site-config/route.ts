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

const ALLOWED_PROVIDERS = ['zhipu', 'deepseek', 'zai'] as const;
type LlmProvider = (typeof ALLOWED_PROVIDERS)[number];

/**
 * GET /api/admin/site-config
 * 获取站点配置（单行 SiteConfig 表，id='default'）
 * 出于安全考虑，API Key 返回脱敏字段（仅展示是否已设置）
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    let config = await db.siteConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await db.siteConfig.create({ data: { id: 'default' } });
    }

    return NextResponse.json({
      config: {
        id: config.id,
        siteName: config.siteName,
        announcement: config.announcement,
        bannerText: config.bannerText,
        bannerEnabled: config.bannerEnabled,
        contactEmail: config.contactEmail,
        llmProvider: config.llmProvider,
        // 脱敏：只返回是否已设置
        zhipuApiKey: config.zhipuApiKey,
        deepseekApiKey: config.deepseekApiKey,
        zhipuApiKeySet: !!config.zhipuApiKey,
        deepseekApiKeySet: !!config.deepseekApiKey,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('Admin site-config GET error:', error);
    return NextResponse.json({ error: '获取站点配置失败' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/site-config
 * 更新站点配置
 * 字段：siteName, announcement, bannerText, bannerEnabled, contactEmail,
 *      llmProvider(zhipu/deepseek/zai), zhipuApiKey, deepseekApiKey
 */
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      siteName,
      announcement,
      bannerText,
      bannerEnabled,
      contactEmail,
      llmProvider,
      zhipuApiKey,
      deepseekApiKey,
    } = body || {};

    // 校验 llmProvider
    const provider: LlmProvider = ALLOWED_PROVIDERS.includes(llmProvider) ? llmProvider : 'zhipu';

    // 构造更新数据（仅包含提供的字段，未提供的字段保留）
    const data: Record<string, unknown> = {};
    if (typeof siteName === 'string') data.siteName = siteName.trim().slice(0, 100);
    if (typeof announcement === 'string') data.announcement = announcement.slice(0, 1000);
    if (typeof bannerText === 'string') data.bannerText = bannerText.slice(0, 500);
    if (typeof bannerEnabled === 'boolean') data.bannerEnabled = bannerEnabled;
    if (typeof contactEmail === 'string') data.contactEmail = contactEmail.trim().slice(0, 200);
    data.llmProvider = provider;

    // API Key：允许空字符串清空；只有显式提供时才更新
    // 前端约定：若传 null 或 undefined，表示不修改；传空串表示清空
    if (zhipuApiKey !== undefined && zhipuApiKey !== null) {
      data.zhipuApiKey = String(zhipuApiKey).trim();
    }
    if (deepseekApiKey !== undefined && deepseekApiKey !== null) {
      data.deepseekApiKey = String(deepseekApiKey).trim();
    }

    // upsert：保证 default 行一定存在
    const updated = await db.siteConfig.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        siteName: typeof siteName === 'string' ? siteName.trim() : 'Mindway.Life',
        announcement: typeof announcement === 'string' ? announcement : '',
        bannerText: typeof bannerText === 'string' ? bannerText : '',
        bannerEnabled: typeof bannerEnabled === 'boolean' ? bannerEnabled : false,
        contactEmail: typeof contactEmail === 'string' ? contactEmail.trim() : 'piaoshu@mindway.life',
        llmProvider: provider,
        zhipuApiKey: typeof zhipuApiKey === 'string' ? zhipuApiKey.trim() : '',
        deepseekApiKey: typeof deepseekApiKey === 'string' ? deepseekApiKey.trim() : '',
      },
    });

    // 同步到运行时环境变量，使 llm-providers.ts 能读取（仅当前进程生效）
    if (typeof data.zhipuApiKey === 'string') {
      process.env.ZHIPU_API_KEY = data.zhipuApiKey;
    }
    if (typeof data.deepseekApiKey === 'string') {
      process.env.DEEPSEEK_API_KEY = data.deepseekApiKey;
    }

    return NextResponse.json({
      success: true,
      config: {
        id: updated.id,
        siteName: updated.siteName,
        announcement: updated.announcement,
        bannerText: updated.bannerText,
        bannerEnabled: updated.bannerEnabled,
        contactEmail: updated.contactEmail,
        llmProvider: updated.llmProvider,
        zhipuApiKey: updated.zhipuApiKey,
        deepseekApiKey: updated.deepseekApiKey,
        zhipuApiKeySet: !!updated.zhipuApiKey,
        deepseekApiKeySet: !!updated.deepseekApiKey,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Admin site-config PUT error:', error);
    return NextResponse.json({ error: '更新站点配置失败' }, { status: 500 });
  }
}
