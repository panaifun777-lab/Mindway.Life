import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractUserInsights } from "@/lib/insight-extractor";

/**
 * POST /api/insight-extract
 * ------------------------------------------------------------
 * 心智洞察反思 Agent 的外部触发入口。
 *
 * 请求体：{ userId, conversationId }
 *
 * 流程：
 * 1. 校验 userId + conversationId 存在
 * 2. 拉取 conversation.messages（含归属校验，防越权触发）
 * 3. 拼接为 conversationHistory
 * 4. 异步调用 extractUserInsights（fire-and-forget）
 * 5. 立即返回 { started: true }，不等待 LLM 完成
 *
 * 与 chat/route.ts 的关系：
 * - chat/route.ts 在 flush 阶段已内置 fire-and-forget 触发
 *   （针对本轮 user+assistant 已在内存中的场景）
 * - 本路由适用于：
 *   a) 前端在用户主动结束对话后再次显式触发（兜底）
 *   b) 后台定时任务/手动重跑历史对话
 *   c) Chat 流程中 fire-and-forget 因进程退出未完成时的补偿
 *
 * 任何失败均不抛 5xx 给调用方（除非参数缺失/越权），
 * 因为这是后台异步任务，失败也不应影响前端体验。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, conversationId } = body as {
      userId?: string;
      conversationId?: string;
    };

    if (!userId || !conversationId) {
      return NextResponse.json(
        { error: "userId and conversationId are required" },
        { status: 400 }
      );
    }

    // 拉取 conversation + messages（一次查询）
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // 归属校验：conversation.userId 为空时允许触发（兼容旧数据），
    // 但若已绑定且与请求 userId 不一致，则拒绝（防越权）
    if (conversation.userId && conversation.userId !== userId) {
      return NextResponse.json(
        { error: "Conversation does not belong to this user" },
        { status: 403 }
      );
    }

    // 拼接 conversationHistory
    const conversationHistory = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (conversationHistory.length === 0) {
      return NextResponse.json(
        { error: "Conversation has no messages to analyze" },
        { status: 400 }
      );
    }

    // 异步触发反思 Agent（fire-and-forget，不 await）
    // IIFE + catch：即使主响应已返回，后台任务仍会继续执行
    // （注：serverless 环境下可能因函数冻结而中断，自托管 Node 进程则不会）
    (async () => {
      try {
        await extractUserInsights(userId, conversationHistory);
      } catch (err) {
        console.error("[insight-extract] async reflection failed:", err);
      }
    })();

    // 立即返回，不等待 LLM 完成
    return NextResponse.json({ started: true });
  } catch (error) {
    console.error("[insight-extract] route error:", error);
    // 即使出错也返回 200 + started:false，避免前端误以为触发成功
    return NextResponse.json(
      { started: false, error: "Failed to start insight extraction" },
      { status: 500 }
    );
  }
}
