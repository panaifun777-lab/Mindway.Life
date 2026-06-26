import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";
import { PIAOSHU_GRAYSCALE_PROMPT } from "@/lib/persona-prompts";
import {
  checkCrisis,
  logCrisisEvent,
  CRISIS_HOTLINE,
} from "@/lib/safety-gateway";
import { detectEmotion } from "@/lib/emotion-engine";
import { generateSmartFallback } from "@/lib/smart-fallback";
import { streamChatWithFallback, parseOpenAIStreamChunk } from "@/lib/llm-providers";
import {
  extractUserInsights,
  getUserInsights,
  formatInsightsForPrompt,
} from "@/lib/insight-extractor";
import {
  internalReviewAndRefine,
  generateDraft,
} from "@/lib/review-loop";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      philosopherId,
      message,
      history,
      conversationId,
      userId,
      deepMode,
    } = body as {
      philosopherId: string;
      message: string;
      history: Array<{ role: string; content: string }>;
      conversationId?: string;
      userId?: string; // 心智洞察记忆层：可选，未登录用户为 undefined
      deepMode?: boolean; // 内部多智能体演练：true 时先审查+润色再流式输出
    };

    if (!philosopherId || !message) {
      return new Response(
        JSON.stringify({ error: "philosopherId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // 情绪熔断安全网关 (Safety Gateway)
    // ------------------------------------------------------------
    // 在任何 DB 查询 / LLM 调用之前执行同步关键词检测（毫秒级）。
    // - severe: 立即熔断，返回热线干预话术（流式 SSE，带 crisis:true）
    // - mild:   不阻断，但向 systemPrompt 前注入情绪共情提示
    // - safe:   继续正常流程
    //
    // 注意：网关本身不抛错（内部已兜底），最坏情况是降级为 safe
    // ============================================================
    let crisisCheck;
    try {
      crisisCheck = await checkCrisis(message);
    } catch (gateErr) {
      console.error("[safety-gateway] checkCrisis failed, falling through to normal flow:", gateErr);
      crisisCheck = { blocked: false, riskLevel: 'safe' as const, triggerKeywords: [], elapsedMs: 0 };
    }

    // ---- severe: 立即熔断，不进入主对话流 ----
    if (crisisCheck.riskLevel === 'severe' && crisisCheck.crisisResponse) {
      const crisisText = crisisCheck.crisisResponse;
      const crisisKeywords = crisisCheck.triggerKeywords;
      const enc = new TextEncoder();

      // 异步上报到 crisis_logs（不阻塞响应）
      logCrisisEvent({
        userInput: message,
        riskLevel: 'severe',
        triggerKeywords: crisisKeywords,
        interventionResponse: crisisText,
        hotlineShown: true,
        philosopherId,
      }).catch(() => { /* 静默失败 */ });

      // 尽力创建 conversation + 保存 user message（审计用，失败可降级）
      let crisisConvId = conversationId;
      if (!crisisConvId) {
        try {
          const c = await db.conversation.create({
            data: { philosopherId, mode: "single" },
          });
          crisisConvId = c.id;
        } catch {
          // philosopherId 可能无效，跳过
        }
      }
      if (crisisConvId) {
        try {
          await db.message.create({
            data: { conversationId: crisisConvId, role: "user", content: message },
          });
        } catch {
          /* 静默 */
        }
      }

      // 构建熔断 SSE 流：每个 chunk 都带 crisis:true + hotline，前端据此弹热线卡片
      const readable = new ReadableStream({
        async start(controller) {
          // 按句切分流式输出（与现有 fallback 节奏一致）
          const chunks = crisisText.match(/[^，。！？\s]+[，。！？\s]?/g) || [crisisText];
          for (const chunk of chunks) {
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({
                  content: chunk,
                  crisis: true,
                  hotline: CRISIS_HOTLINE,
                })}\n\n`
              )
            );
            await new Promise((r) => setTimeout(r, 50));
          }

          // 保存熔断回复到 message 表（供用户后续查看历史）
          if (crisisConvId) {
            try {
              await db.message.create({
                data: { conversationId: crisisConvId, role: "assistant", content: crisisText },
              });
            } catch {
              /* 静默 */
            }
          }

          // 末尾再发一次 crisis 元信息，前端可在 [DONE] 前确保拿到 hotline
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({
                conversationId: crisisConvId,
                crisis: true,
                hotline: CRISIS_HOTLINE,
                riskLevel: 'severe',
              })}\n\n`
            )
          );
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Fetch the philosopher's system prompt
    const philosopher = await db.philosopher.findUnique({
      where: { id: philosopherId },
    });

    if (!philosopher) {
      return new Response(
        JSON.stringify({ error: "Philosopher not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use enhanced host prompt for 飘叔, otherwise use the philosopher's own prompt
    // 注意：用 let 是因为 mild 级别需要在前面追加情绪共情提示
    let systemPrompt = philosopher.isHost
      ? PIAOSHU_GRAYSCALE_PROMPT
      : philosopher.systemPrompt;

    // ---- mild: 在 systemPrompt 前注入情绪共情提示（不阻断对话）----
    if (crisisCheck.riskLevel === 'mild' && crisisCheck.systemPromptInjection) {
      systemPrompt = crisisCheck.systemPromptInjection + systemPrompt;

      // 异步上报到 crisis_logs（不阻塞响应）
      logCrisisEvent({
        userInput: message,
        riskLevel: 'mild',
        triggerKeywords: crisisCheck.triggerKeywords,
        interventionResponse: crisisCheck.systemPromptInjection,
        hotlineShown: false,
        philosopherId,
      }).catch(() => { /* 静默失败 */ });
    }

    // ============================================================
    // 反 AI 味真实感引擎 · 情绪感知 + 策略路由 (Emotion Engine)
    // ------------------------------------------------------------
    // 在 safety-gateway 之后执行（mild/safe 均触发，severe 已提前熔断返回）。
    // 同步、毫秒级、不依赖 AI；根据用户情绪强度向 systemPrompt 末尾追加
    // 策略提示，引导飘叔/哲学家在"纯共情 / 共情+引导 / 深度交锋"间切换。
    //
    // 与 mild 注入的关系：
    // - mild 注入是"前置共情提示"（safety-gateway 生成，关注危机降级）
    // - 情绪策略是"后置策略提示"（emotion-engine 生成，关注对话节奏）
    // 两者互补，不冲突。最终 systemPrompt 结构：
    //   [mild 前置共情] + [原 persona prompt] + [\n] + [情绪策略后置]
    //
    // try/catch 兜底：emotion-engine 内部已防抛错，此处再加一层保险，
    // 失败仅 console.warn + 跳过注入，绝不影响主对话流。
    // ============================================================
    try {
      const emotionState = detectEmotion(message);
      if (emotionState.systemPromptInjection) {
        systemPrompt = systemPrompt + '\n' + emotionState.systemPromptInjection;
      }
    } catch (emoErr) {
      console.warn('[emotion-engine] detectEmotion failed, skipping strategy injection:', emoErr);
    }

    // ============================================================
    // 心智洞察记忆层 · 前置画像注入 (Insight Memory Layer)
    // ------------------------------------------------------------
    // 在 emotion-engine 之后、conversation 创建之前执行。
    // 若 userId 存在，读取后台反思 Agent 提炼的用户心智画像，
    // 追加到 systemPrompt 末尾，让飘叔/哲学家"看见"用户的深层模型
    // 与未解之结，从而跨对话保持连续性。
    //
    // 与 emotion-engine 的关系：
    // - emotion-engine 注入"本次回复的语气策略"（短时）
    // - insight 注入"用户长期画像"（跨对话持久）
    // 两者互补，最终 systemPrompt 结构：
    //   [mild 前置共情] + [persona prompt] + [情绪策略] + [用户心智画像]
    //
    // try/catch 兜底：getUserInsights 内部已防抛错，此处再加一层保险，
    // 失败仅 console.warn + 跳过注入，绝不影响主对话流。
    // ============================================================
    if (userId) {
      try {
        const userInsight = await getUserInsights(userId);
        const insightBlock = formatInsightsForPrompt(userInsight);
        if (insightBlock) {
          systemPrompt = systemPrompt + '\n' + insightBlock;
        }
      } catch (insightErr) {
        console.warn('[insight-extractor] getUserInsights failed, skipping injection:', insightErr);
      }
    }

    // Create or reuse conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await db.conversation.create({
        data: {
          philosopherId,
          mode: "single",
          // 若已登录，绑定 userId 便于后续反思 Agent / 历史归属校验
          ...(userId ? { userId } : {}),
        },
      });
      convId = conversation.id;
    }

    // Save user message to DB
    await db.message.create({
      data: {
        conversationId: convId,
        role: "user",
        content: message,
      },
    });

    // Build messages array: use systemPrompt as assistant message (z-ai-web-dev-sdk convention)
    const messages: Array<{ role: string; content: string }> = [
      { role: "assistant", content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    // Helper: generate fallback streaming response based on philosopher persona + user message
    const generateFallbackResponse = (philosopher: any, convId: string | undefined, userMessage: string) => {
      // 使用智能降级响应（根据问题类型+随机开场白，避免重复）
      const fallbackContent = generateSmartFallback(philosopher, userMessage, philosopher.isHost);

      const enc = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          const chunks = fallbackContent.match(/[^，。！？\s]+[，。！？\s]?/g) || [fallbackContent];
          for (const chunk of chunks) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            await new Promise(r => setTimeout(r, 50));
          }
          try {
            await db.message.create({
              data: { conversationId: convId!, role: "assistant", content: fallbackContent },
            });
          } catch {}
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`));
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
    };

    // Call LLM with streaming - 使用多提供商适配层（智谱GLM-4-Flash > DeepSeek > ZAI隧道 > 降级）
    let stream: ReadableStream<Uint8Array>;
    let providerName = '';
    try {
      // 构建标准消息格式（OpenAI兼容）
      const llmMessages: Array<{ role: string; content: string }> = [
        ...(Array.isArray(history) ? history : []),
        { role: "user", content: message },
      ];

      const result = await streamChatWithFallback(llmMessages, systemPrompt);
      stream = result.stream;
      providerName = result.provider;
    } catch (apiErr) {
      // 所有LLM提供商都失败
      console.error("All LLM providers unavailable, using fallback:", apiErr);
      const readable = generateFallbackResponse(philosopher, convId, message);
      return new Response(readable, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // Create a TransformStream to parse upstream SSE and re-emit in our format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullContent = ""; // Accumulate full content for DB save
    let hasStreamedContent = false;

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.slice(5).trim();

          // Check for [DONE] from upstream
          if (dataStr === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              hasStreamedContent = true;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      },
      async flush(controller) {
        // If nothing was streamed (API failed mid-stream), use fallback
        if (!hasStreamedContent) {
          const msg = message.slice(0, 100);
          const fallbackContent = generateSmartFallback(philosopher, message, philosopher.isHost);
          const chunks = fallbackContent.match(/[^，。！？\s]+[，。！？\s]?/g) || [fallbackContent];
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            await new Promise(r => setTimeout(r, 50));
          }
          fullContent = fallbackContent;
        }

        // Save assistant message to DB
        if (fullContent) {
          try {
            await db.message.create({
              data: {
                conversationId: convId!,
                role: "assistant",
                content: fullContent,
              },
            });
          } catch (err) {
            console.error("Failed to save assistant message:", err);
          }
        }

        // ============================================================
        // 心智洞察记忆层 · 后台反思触发 (Insight Memory Layer)
        // ------------------------------------------------------------
        // assistant 消息落库后，若 userId 存在，异步触发反思 Agent
        // 调用 LLM 提炼【核心痛点 / 认知盲区 / 价值观倾向 / 沟通偏好 /
        // 情绪基线】，upsert 到 UserInsight 表。
        //
        // fire-and-forget（不 await）：响应流已基本结束，
        // 反思任务在后台执行，失败也不影响本次对话体验。
        //
        // conversationHistory 取 in-memory history + 本轮 user + 本轮 assistant，
        // 避免在热路径上再做一次 DB 查询（与 /api/insight-extract 路由区别：
        // 后者用于离线补偿，会从 DB 重读 messages）。
        // ============================================================
        if (userId && fullContent) {
          const convHistory = [
            ...(Array.isArray(history) ? history : []),
            { role: "user", content: message },
            { role: "assistant", content: fullContent },
          ];
          extractUserInsights(userId, convHistory).catch((insightErr) => {
            console.error('[insight-extractor] async reflection failed (silent):', insightErr);
          });
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`)
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    });

    const readableStream = stream.pipeThrough(transformStream);

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    // Return fallback streaming response instead of 500 error
    // 注意：message 和 philosopher 可能在 catch 作用域外不可见，做安全处理
    const safeMessage = typeof message !== 'undefined' ? message : '';
    const safePhilosopher = typeof philosopher !== 'undefined' ? philosopher : { isHost: false, nameCn: '哲学家', quote: '思考是智慧的起点', coreInsight: '每一个问题都值得深思', worries: '' };
    const fallbackContent = generateSmartFallback(safePhilosopher, safeMessage, safePhilosopher.isHost);
    const enc = new TextEncoder();
    let fallbackConvId = typeof convId !== 'undefined' ? convId : undefined;
    const safePhilosopherId = typeof philosopherId !== 'undefined' ? philosopherId : '';
    if (!fallbackConvId && safePhilosopherId) {
      try {
        const c = await db.conversation.create({ data: { philosopherId: safePhilosopherId, mode: "single" } });
        fallbackConvId = c.id;
      } catch {}
    }
    const finalConvId = fallbackConvId;
    const readable = new ReadableStream({
      async start(controller) {
        const chunks = fallbackContent.match(/[^，。！？\s]+[，。！？\s]?/g) || [fallbackContent];
        for (const chunk of chunks) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          await new Promise(r => setTimeout(r, 50));
        }
        try {
          await db.message.create({
            data: { conversationId: finalConvId!, role: "assistant", content: fallbackContent },
          });
        } catch {}
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ conversationId: finalConvId })}\n\n`));
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }
}
