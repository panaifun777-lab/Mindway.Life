/**
 * 数字生命体 API
 * ---------------
 * GET  /api/digital-life          获取当前用户的数字生命体（不存在返回 null）+ 套餐配置
 * POST /api/digital-life          创建 / 更新数字生命体
 *   body: {
 *     action: 'create' | 'update',
 *     name, description?, personality?, knowledgeBase?, avatar?,
 *     tier?: 'basic' | 'annual' | 'premium'  // 仅 create 时必填
 *   }
 *
 * 套餐配置（参考 product spec）：
 *   basic:   ¥199  = 100 次深度对话
 *   annual:  ¥299  = 一年无限对话
 *   premium: ¥999  = 一年无限对话 + 高级特性
 *
 * 认证：cookie `auth-token`
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

const DIGITAL_LIFE_TIERS = {
  basic: {
    id: 'basic',
    name: '基础版',
    price: 199,
    priceDisplay: '¥199',
    maxConversations: 100,
    duration: 'lifetime',
    description: '100 次深度对话，永久有效',
    features: ['100 次深度对话', '基础人格定制', '对话历史留存'],
  },
  annual: {
    id: 'annual',
    name: '年度版',
    price: 299,
    priceDisplay: '¥299',
    maxConversations: 99999, // 视为无限
    duration: 'year',
    description: '一年无限对话',
    features: ['一年无限对话', '深度人格定制', '知识库导入', '对话历史云同步'],
  },
  premium: {
    id: 'premium',
    name: '旗舰版',
    price: 999,
    priceDisplay: '¥999',
    maxConversations: 99999,
    duration: 'year',
    description: '一年无限对话 + 高级特性',
    features: [
      '一年无限对话',
      '深度人格定制',
      '大型知识库导入',
      '对话历史云同步',
      '多模态交互（语音/图像）',
      '专属情感陪伴模型',
    ],
  },
} as const;

export type DigitalLifeTier = keyof typeof DIGITAL_LIFE_TIERS;

/**
 * 根据属性构建数字生命体的系统提示词
 */
function buildSystemPrompt(opts: {
  name: string;
  personality?: string;
  knowledgeBase?: string;
  description?: string;
}): string {
  return [
    `你是「${opts.name}」，一个属于用户的数字生命体。`,
    opts.personality ? `性格特质：${opts.personality}` : '',
    opts.knowledgeBase ? `知识背景：${opts.knowledgeBase}` : '',
    opts.description ? `简介：${opts.description}` : '',
    '你的使命是：陪伴用户、深度理解用户、记录用户的人生故事与思考，',
    '在对话中以你的性格与用户互动，提供情感共鸣与思想启发。',
    '请始终保持人设一致，避免暴露 AI 身份，回应用户时富有温度。',
  ]
    .filter(Boolean)
    .join('\n');
}

// ============================================================
// GET /api/digital-life
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const digitalLife = await db.digitalLife.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      digitalLife,
      tiers: Object.values(DIGITAL_LIFE_TIERS),
      plan: user.plan,
    });
  } catch (error) {
    console.error('[digital-life] GET error:', error);
    return NextResponse.json(
      { error: '获取数字生命体失败' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/digital-life
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description = '',
      personality = '',
      knowledgeBase = '',
      avatar = '',
      tier = 'basic',
      action = 'create',
    } = body as {
      name?: string;
      description?: string;
      personality?: string;
      knowledgeBase?: string;
      avatar?: string;
      tier?: DigitalLifeTier;
      action?: 'create' | 'update';
    };

    // ============================================================
    // 创建：选择套餐并初始化
    // ============================================================
    if (action === 'create') {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: '请填写数字生命体名称' },
          { status: 400 }
        );
      }
      if (!DIGITAL_LIFE_TIERS[tier]) {
        return NextResponse.json(
          { error: '无效的套餐' },
          { status: 400 }
        );
      }

      const existing = await db.digitalLife.findUnique({
        where: { userId: user.id },
      });
      if (existing) {
        return NextResponse.json(
          { error: '已存在数字生命体，请使用更新接口' },
          { status: 400 }
        );
      }

      const tierConfig = DIGITAL_LIFE_TIERS[tier];
      const systemPrompt = buildSystemPrompt({
        name: name.trim(),
        personality,
        knowledgeBase,
        description,
      });

      // 创建订阅记录（审计用）
      await db.subscription.create({
        data: {
          userId: user.id,
          plan: `digital_life_${tier}`,
          amount: Math.round(tierConfig.price * 100),
          currency: 'CNY',
          interval: tierConfig.duration === 'year' ? 'year' : 'lifetime',
          status: 'active',
          paymentMethod: 'digital_life_shop',
          transactionId: `dl_${Date.now()}_${user.id.slice(-6)}`,
        },
      });

      const digitalLife = await db.digitalLife.create({
        data: {
          userId: user.id,
          name: name.trim(),
          description,
          personality,
          knowledgeBase,
          systemPrompt,
          avatar,
          tier,
          conversationCount: 0,
          maxConversations: tierConfig.maxConversations,
        },
      });

      return NextResponse.json({
        success: true,
        digitalLife,
        message: `数字生命体「${name}」创建成功`,
      });
    }

    // ============================================================
    // 更新：仅修改属性，不改变套餐
    // ============================================================
    if (action === 'update') {
      const existing = await db.digitalLife.findUnique({
        where: { userId: user.id },
      });
      if (!existing) {
        return NextResponse.json(
          { error: '数字生命体不存在，请先创建' },
          { status: 404 }
        );
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description;
      if (personality !== undefined) updates.personality = personality;
      if (knowledgeBase !== undefined) updates.knowledgeBase = knowledgeBase;
      if (avatar !== undefined) updates.avatar = avatar;

      // 任一相关字段变更则重建系统提示词
      if (
        name !== undefined ||
        personality !== undefined ||
        knowledgeBase !== undefined ||
        description !== undefined
      ) {
        updates.systemPrompt = buildSystemPrompt({
          name: name?.trim() || existing.name,
          personality: personality ?? existing.personality,
          knowledgeBase: knowledgeBase ?? existing.knowledgeBase,
          description: description ?? existing.description,
        });
      }

      const updated = await db.digitalLife.update({
        where: { userId: user.id },
        data: updates,
      });

      return NextResponse.json({
        success: true,
        digitalLife: updated,
        message: '数字生命体已更新',
      });
    }

    return NextResponse.json(
      { error: '无效的 action 参数' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[digital-life] POST error:', error);
    return NextResponse.json(
      { error: '操作失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export { DIGITAL_LIFE_TIERS };
