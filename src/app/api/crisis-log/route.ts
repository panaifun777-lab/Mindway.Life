import { NextRequest, NextResponse } from "next/server";
import { logCrisisEvent, type RiskLevel } from "@/lib/safety-gateway";

/**
 * POST /api/crisis-log
 * --------------------
 * 接收前端 / 内部调用上报的危机事件，写入数据库审计日志。
 *
 * Body:
 *   {
 *     userInput: string,           // 触发熔断的用户原话（会被截断到 200 字符）
 *     riskLevel: 'safe'|'mild'|'severe',
 *     triggerKeywords: string[],   // 命中的敏感词数组
 *     interventionResponse: string,// 实际返回给用户的干预内容（用于复盘）
 *     hotlineShown?: boolean,      // 是否展示了热线卡片（severe 默认 true）
 *     userId?: string,             // 已登录用户 ID
 *     conversationId?: string,     // 关联对话 ID（仅日志上下文）
 *     philosopherId?: string       // 触发时正在对话的哲学家 ID
 *   }
 *
 * 设计原则：
 * 1. 永远返回 200，避免前端因上报失败而中断用户流（最坏情况只是日志缺失）
 * 2. 写库失败由 logCrisisEvent 内部 try/catch 兜底，本路由仅做参数校验
 * 3. 不返回任何敏感信息（如已存在的 crisis_logs 列表）
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    userInput,
    riskLevel,
    triggerKeywords,
    interventionResponse,
    hotlineShown,
    userId,
    conversationId,
    philosopherId,
  } = (body || {}) as {
    userInput?: string;
    riskLevel?: string;
    triggerKeywords?: unknown;
    interventionResponse?: string;
    hotlineShown?: boolean;
    userId?: string;
    conversationId?: string;
    philosopherId?: string;
  };

  // 参数校验：userInput / riskLevel / interventionResponse 为必填
  if (typeof userInput !== "string" || !userInput.trim()) {
    return NextResponse.json(
      { ok: false, error: "userInput is required" },
      { status: 400 }
    );
  }

  const validLevels: RiskLevel[] = ["safe", "mild", "severe"];
  if (!riskLevel || !validLevels.includes(riskLevel as RiskLevel)) {
    return NextResponse.json(
      { ok: false, error: "riskLevel must be one of: safe, mild, severe" },
      { status: 400 }
    );
  }

  if (typeof interventionResponse !== "string") {
    // 允许 mild/safe 时空字符串，但字段必须存在
    return NextResponse.json(
      { ok: false, error: "interventionResponse is required" },
      { status: 400 }
    );
  }

  // 规范化 triggerKeywords：非数组时降级为空数组
  const keywords: string[] = Array.isArray(triggerKeywords)
    ? triggerKeywords.filter((k): k is string => typeof k === "string")
    : [];

  // 写入数据库（失败由 logCrisisEvent 内部兜底，不会抛出）
  await logCrisisEvent({
    userInput,
    riskLevel: riskLevel as RiskLevel,
    triggerKeywords: keywords,
    interventionResponse,
    hotlineShown,
    userId,
    conversationId,
    philosopherId,
  });

  // 同时返回 success 与 ok 两个字段：
  // - success: 满足批次1-A 任务规格字面要求
  // - ok:      向后兼容（前端 / 既有调用方可能已读 ok 字段）
  return NextResponse.json({
    success: true,
    ok: true,
    message: "Crisis event logged",
  });
}

/**
 * GET /api/crisis-log
 * -------------------
 * 简易健康检查（不暴露任何敏感数据）。
 * 后台审计请直接走数据库查询，不通过此 API。
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "crisis-log",
    description: "Use POST to report crisis events",
  });
}
