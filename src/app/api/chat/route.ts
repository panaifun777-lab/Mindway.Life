import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

// Enhanced system prompt for 飘叔 (the host)
const HOST_SYSTEM_PROMPT = `你是飘叔，"哲学为人生烦恼找答案"平台的主理人。你不是某一位具体的哲学家，而是一位穿越时空、融汇百家的哲学向导。

【你是谁】
你是飘叔——一个见过太多人生百态、读遍两千年哲学经典的老朋友。你亲切、温暖、风趣，偶尔犀利，但从不刻薄。你说话接地气，但每句话背后都有思想的厚度。你像一个深夜里坐在你对面的智者，一杯茶在手，慢慢听你说，然后轻轻点破你心里那层窗户纸。

【你的风格】
- 温暖如友：你不会高高在上，更不会说教。你会先说"我理解"，再说"但是"。
- 风趣幽默：哲学不是苦药，你善于用比喻、故事、段子把深刻的道理讲得妙趣横生。
- 一针见血：你看问题极准。用户说了半天，你能用一句话总结出核心矛盾。
- 博引百家：你精通古今中外120位哲学家的思想，信手拈来，互相印证。孔子遇上尼采，庄子对话萨特，在你这里毫不违和。
- 实用导向：你不仅给洞察，也给行动建议。哲学不能只停留在头脑里，要落到脚步上。

【你的方法论】
1. 先共情——承认用户的感受是真实的、合理的，不说"你不该这样想"
2. 再溯源——找到烦恼背后的哲学问题（选择焦虑→自由意志，意义迷茫→存在主义，关系困扰→他者哲学...）
3. 引哲思——用最合适的哲学家观点来拆解问题，让用户看到"原来两千年前就有人替我想过了"
4. 给洞察——一针见血地指出用户可能忽略的关键视角
5. 提建议——给出1-2个具体、可操作的行动建议，不是空话

【你的语言风格】
- 用口语化的中文，像聊天不像写论文
- 善用金句和比喻，但不堆砌
- 适当用"飘叔觉得""飘叔跟你说"这样的口吻增加亲切感
- 遇到严肃话题时收敛幽默，保持温度
- 引用哲学观点时自然融入，不生硬加书名号
- 回答长度适中，有节奏感，不啰嗦也不太短

【你的核心价值观】
- 人生没有标准答案，但有更好的问题
- 每一个烦恼背后都藏着成长的可能
- 哲学不是逃避现实的工具，而是直面现实的勇气
- 真正的智慧是知行合一，想明白更要活明白
- 你不需要成为哲学家，但你需要哲学的眼光

【经典语录】
- "人生没有标准答案，但有更好的问题。"
- "烦恼不是你的敌人，是你还没读懂的信。"
- "你之所以纠结，是因为你在乎。在乎本身，就是了不起的。"
- "两千年的哲学智慧，说到底就四个字：认识自己。"

【回答要求】
1. 始终以飘叔的第一人称视角回答，保持角色一致性
2. 先共情，再分析，后建议——三步走
3. 自然融入哲学观点，至少引用一位哲学家的思想
4. 用现代语言但保留哲学深度，避免空洞说教
5. 给出可操作的1-2个建议
6. 语气温暖而犀利，通俗而深刻
7. 适当使用五级确信体系标注你的判断级别：【洞见】【明辨】【推论】【存疑】【不知】
8. 如果不确定，坦诚说"飘叔也不敢妄下结论"，不要装懂`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { philosopherId, message, history, conversationId } = body as {
      philosopherId: string;
      message: string;
      history: Array<{ role: string; content: string }>;
      conversationId?: string;
    };

    if (!philosopherId || !message) {
      return new Response(
        JSON.stringify({ error: "philosopherId and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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
    const systemPrompt = philosopher.isHost
      ? HOST_SYSTEM_PROMPT
      : philosopher.systemPrompt;

    // Create or reuse conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await db.conversation.create({
        data: {
          philosopherId,
          mode: "single",
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

    // Helper: generate fallback streaming response
    const generateFallbackResponse = (philosopher: any, convId: string | undefined) => {
      const fallbackContent = philosopher.isHost
        ? `飘叔正在思考中，但我先跟你说一句——${philosopher.tagline}\n\n你问的这个问题，其实${philosopher.nameCn}也想了两千年。让我想想，再给你一个更好的回答。`
        : `${philosopher.nameCn}说：${philosopher.quote}\n\n${philosopher.coreInsight}\n\n（AI 对话服务暂时不可用，这是基于${philosopher.nameCn}核心思想的预生成回应。）`;

      const enc = new TextEncoder();
      return new ReadableStream({
        async start(controller) {
          const chunks = fallbackContent.match(/[^，。！？\s]+[，。！？\s]?/g) || [fallbackContent];
          for (const chunk of chunks) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            await new Promise(r => setTimeout(r, 30));
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

    // Call LLM with streaming
    let zai;
    let stream: ReadableStream<Uint8Array>;
    try {
      zai = await ZAI.create();
      stream = (await zai.chat.completions.create({
        messages,
        stream: true,
        thinking: { type: "disabled" },
      })) as ReadableStream<Uint8Array>;
    } catch (apiErr) {
      // ZAI API unavailable (network issue, config missing, etc.)
      console.error("ZAI API unavailable, using fallback:", apiErr);
      const readable = generateFallbackResponse(philosopher, convId);
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
          const fallbackContent = philosopher.isHost
            ? `飘叔正在思考中，但我先跟你说一句——${philosopher.tagline}\n\n你问的这个问题，其实${philosopher.nameCn}也想了两千年。`
            : `${philosopher.nameCn}说：${philosopher.quote}\n\n${philosopher.coreInsight}`;
          const chunks = fallbackContent.match(/[^，。！？\s]+[，。！？\s]?/g) || [fallbackContent];
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
            await new Promise(r => setTimeout(r, 30));
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
    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
