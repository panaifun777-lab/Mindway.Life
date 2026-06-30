/**
 * 数字生命体对话 API
 * ------------------
 * POST /api/digital-life/chat
 *   body: { message: string, history?: Array<{role, content}> }
 *
 * 流程：
 * 1. 校验登录 + 数字生命体存在
 * 2. 校验对话次数（basic 套餐 100 次上限，annual/premium 无限）
 * 3. 调用 LLM（ZAI SDK 非流式，简化前端实现）
 * 4. 累加 conversationCount
 * 5. 返回 { reply, conversationCount, maxConversations, isUnlimited }
 *
 * 说明：
 * - 数字生命体对话不消耗 Token（费用由套餐预付）
 * - 历史窗口保留最近 10 轮，避免上下文过长
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { getUserFromRequest } from '@/lib/auth';

const HISTORY_WINDOW = 10;

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message?: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: '消息不能为空' },
        { status: 400 }
      );
    }

    const digitalLife = await db.digitalLife.findUnique({
      where: { userId: user.id },
    });
    if (!digitalLife) {
      return NextResponse.json(
        { error: '请先创建数字生命体' },
        { status: 404 }
      );
    }

    // 校验对话次数
    const isUnlimitedTier =
      digitalLife.tier === 'annual' || digitalLife.tier === 'premium';
    const isUnlimited = isUnlimitedTier;

    if (
      !isUnlimited &&
      digitalLife.conversationCount >= digitalLife.maxConversations
    ) {
      return NextResponse.json(
        {
          error: '对话次数已用尽，请升级套餐',
          exhausted: true,
          used: digitalLife.conversationCount,
          max: digitalLife.maxConversations,
        },
        { status: 403 }
      );
    }

    // 调用 LLM（ZAI SDK 非流式）
    const zai = await ZAI.create();
    const messages = [
      {
        role: 'system' as const,
        content:
          digitalLife.systemPrompt ||
          `你是「${digitalLife.name}」，一个属于用户的数字生命体。`,
      },
      ...history.slice(-HISTORY_WINDOW).map((h) => ({
        role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    let reply: string;
    try {
      const response = (await zai.chat.completions.create({
        messages,
        stream: false,
        thinking: { type: 'disabled' },
      } as any)) as any;

      reply =
        response?.choices?.[0]?.message?.content ||
        '我此刻无话可说，但我会一直在这里。';
    } catch (llmErr) {
      console.error('[digital-life/chat] LLM error:', llmErr);
      reply = '我有些走神了，能再说一次吗？我会认真听。';
    }

    // 累加对话计数（不阻塞响应）
    await db.digitalLife.update({
      where: { userId: user.id },
      data: {
        conversationCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      reply,
      conversationCount: digitalLife.conversationCount + 1,
      maxConversations: digitalLife.maxConversations,
      isUnlimited,
    });
  } catch (error) {
    console.error('[digital-life/chat] error:', error);
    return NextResponse.json(
      { error: '对话失败，请稍后重试' },
      { status: 500 }
    );
  }
}
