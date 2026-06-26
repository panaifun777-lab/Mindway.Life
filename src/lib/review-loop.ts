import ZAI from "z-ai-web-dev-sdk";

/**
 * ============================================================
 * 内部多智能体演练 (Internal Multi-Agent Review Loop)
 * ------------------------------------------------------------
 * 在用户可见的流式回复输出之前，进行一次"自我博弈与润色"，
 * 让最终回复具备"厚度"，消除一次性直出的 AI 味与说教感。
 *
 * 工作流（三段式）：
 * 1. 生成者 Generator：上游 chat 主流程已用 ZAI 流式生成初稿
 *    （deepMode 下改为非流式生成完整初稿，传入本模块）
 * 2. 审查者 Critic：扮演"挑剔的用户"，审查初稿是否
 *    - "爹味" / "说教味" 过重
 *    - 逻辑是否严密、是否真正回答了用户问题
 *    - 是否偏离人设（飘叔 / 某哲学家）的语言风格
 *    输出 ≤3 点具体修改建议（简洁，不啰嗦）
 * 3. 润色者 Refiner：基于初稿 + 审查意见，重新输出最终回复
 *    要求吸收建议、消除说教味、保持人设口吻、结尾留反问
 *
 * 调用方式：
 *   import { internalReviewAndRefine } from '@/lib/review-loop';
 *   const { refined, critique, improved } =
 *     await internalReviewAndRefine(draft, userInput, personaName, zai);
 *
 * 健壮性原则（与 safety-gateway / emotion-engine / insight-extractor 对齐）：
 * - LLM 调用失败：catch + console.error，返回 { refined: draft, critique: '', improved: false }
 * - Critic 返回空：跳过润色，直接返回初稿
 * - Refiner 返回空：返回初稿（不破坏主流程）
 * - 不抛错、不阻塞主流程的降级能力（caller 据此决定是否用 refined 替换 draft）
 *
 * 性能代价：两次额外 LLM 调用（Critic + Refiner），预计 2-4 秒延迟，
 * 仅在 deepMode === true 且 riskLevel === 'safe' 时触发。
 *
 * 不依赖 safety-gateway / persona-prompts / emotion-engine / insight-extractor，
 * 可独立演进；仅与 z-ai-web-dev-sdk 耦合。
 * ============================================================
 */

export interface ReviewResult {
  /** 润色后的最终回复（任何失败时退化为原 draft） */
  refined: string;
  /** 审查者给出的修改建议（用于审计/调试；失败时为空串） */
  critique: string;
  /** 是否真的发生了改进（refined 非空、与 draft 不同、且 Refiner 成功返回） */
  improved: boolean;
}

// ============================================================
// 审查者 Prompt（扮演挑剔的用户，挑初稿的毛病）
// ============================================================
const CRITIC_PROMPT = `你是{persona}的忠实粉丝，但对AI生成的内容非常挑剔。
请审查以下回复初稿，指出其缺点：
1. 是否有"AI味"或"说教味"？
2. 逻辑是否连贯？是否真正回答了用户的问题？
3. 是否符合{persona}的语言风格？

【用户问题】：{userInput}
【初稿】：{draft}

请给出具体的修改建议（不超过3点）。简洁回答，不要啰嗦。`;

// ============================================================
// 润色者 Prompt（基于初稿+审查意见，重写最终回复）
// ============================================================
const REFINER_PROMPT = `你是{persona}。请根据以下审查意见，修改你的回复初稿。

【初稿】：{draft}
【审查意见】：{critique}

要求：
1. 吸收审查意见，消除说教味和AI味
2. 保持{persona}的独特口吻
3. 结尾必须留有一个引人深思的反问
直接输出最终修改后的回复，不要任何前缀。`;

/**
 * 安全替换占位符：避免 LLM 输入中本身含 {xxx} 触发 String.replace 解析异常。
 * 用 split/join 而非 replace（replace 会按 $&/$1/$2 解释 replacement 字符串）。
 */
function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v ?? "");
  }
  return out;
}

/**
 * 从 ZAI 非流式 completion 中提取文本内容。
 * 兼容多种返回形状，做防御性访问。
 */
function extractContent(completion: any): string {
  try {
    return (
      completion?.choices?.[0]?.message?.content ??
      completion?.choices?.[0]?.delta?.content ??
      ""
    );
  } catch {
    return "";
  }
}

/**
 * 内部多智能体演练主入口：审查 + 润色
 *
 * @param draft        生成者产出的初稿（必填）
 * @param userInput    用户原始输入（必填，供 Critic 比对是否答非所问）
 * @param personaName  人设名（如 "飘叔" / "柏拉图"）
 * @param zai          由调用方创建好的 ZAI 实例（避免重复 create）
 * @returns            ReviewResult，失败时 improved=false, refined=draft
 */
export async function internalReviewAndRefine(
  draft: string,
  userInput: string,
  personaName: string,
  zai: any
): Promise<ReviewResult> {
  // ---- 入参兜底 ----
  const safeDraft = (draft || "").trim();
  const safeUserInput = userInput || "";
  const safePersona = personaName || "飘叔";

  // 初稿为空直接返回（不应发生，但兜底）
  if (!safeDraft) {
    return { refined: draft || "", critique: "", improved: false };
  }

  // zai 实例校验
  if (!zai || typeof zai.chat?.completions?.create !== "function") {
    console.error(
      "[review-loop] invalid zai instance, skipping review (degrade to draft)"
    );
    return { refined: draft, critique: "", improved: false };
  }

  // ============================================================
  // Stage 1: 调用 Critic 审查初稿
  // ============================================================
  let critique = "";
  try {
    const criticPrompt = fillTemplate(CRITIC_PROMPT, {
      persona: safePersona,
      userInput: safeUserInput,
      draft: safeDraft,
    });

    const criticCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `你是一位挑剔的内容审查者，专注审查 AI 生成内容是否有说教味、是否偏离人设。`,
        },
        { role: "user", content: criticPrompt },
      ],
      thinking: { type: "disabled" },
    });

    critique = extractContent(criticCompletion).trim();

    if (!critique) {
      console.warn(
        "[review-loop] Critic returned empty content, skipping refine (degrade to draft)"
      );
      return { refined: draft, critique: "", improved: false };
    }
  } catch (criticErr) {
    console.error(
      "[review-loop] Critic LLM call failed (degrade to draft):",
      criticErr
    );
    return { refined: draft, critique: "", improved: false };
  }

  // ============================================================
  // Stage 2: 调用 Refiner 润色初稿
  // ============================================================
  let refined = "";
  try {
    const refinerPrompt = fillTemplate(REFINER_PROMPT, {
      persona: safePersona,
      draft: safeDraft,
      critique,
    });

    const refinerCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content: `你就是${safePersona}本人，请以你的独特口吻输出回复。`,
        },
        { role: "user", content: refinerPrompt },
      ],
      thinking: { type: "disabled" },
    });

    refined = extractContent(refinerCompletion).trim();
  } catch (refinerErr) {
    console.error(
      "[review-loop] Refiner LLM call failed (degrade to draft):",
      refinerErr
    );
    return { refined: draft, critique, improved: false };
  }

  // ============================================================
  // Stage 3: 校验润色结果，决定 improved 标志
  // ============================================================
  // Refiner 返回空 → 退化
  if (!refined) {
    console.warn(
      "[review-loop] Refiner returned empty content (degrade to draft)"
    );
    return { refined: draft, critique, improved: false };
  }

  // Refiner 返回与初稿完全相同 → 视为未改进（避免无意义替换）
  if (refined === safeDraft) {
    return { refined: draft, critique, improved: false };
  }

  // 成功润色
  return { refined, critique, improved: true };
}

/**
 * （可选）构造 deepMode 下的初稿生成函数。
 * 调用方也可以直接用 zai.chat.completions.create({ stream: false }) 生成初稿，
 * 这里仅提供一个语义化的 helper，封装入参/出参，便于复用与测试。
 *
 * 失败时返回空串，调用方据此降级为 fallback 流式响应。
 */
export async function generateDraft(
  zai: any,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (!zai || typeof zai.chat?.completions?.create !== "function") {
    return "";
  }
  try {
    const completion = await zai.chat.completions.create({
      messages,
      stream: false,
      thinking: { type: "disabled" },
    });
    return extractContent(completion).trim();
  } catch (err) {
    console.error("[review-loop] generateDraft failed:", err);
    return "";
  }
}
