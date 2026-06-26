import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import type { UserInsight } from "@prisma/client";

/**
 * ============================================================
 * 心智洞察记忆层 (Mental Insight Memory Layer)
 * ------------------------------------------------------------
 * 解决"对话不连续"问题：不记住用户说过的每一句话，
 * 而是记住用户的"心智模型"和"未解之结"。
 *
 * 工作流：
 * 1. 对话结束后异步调用 extractUserInsights，由"反思 Agent"
 *    调用 LLM 提炼用户画像的五维特征：
 *    【核心痛点 / 认知盲区 / 价值观倾向 / 沟通偏好 / 情绪基线】
 * 2. upsert 到 UserInsight 表，conversationCount 累加，
 *    lastAnalyzedAt 更新；原始 JSON 存入 insightSummary 备查
 * 3. 下次对话开始前，getUserInsights 读取最新画像
 * 4. formatInsightsForPrompt 格式化为可注入 systemPrompt 的文本
 *
 * 健壮性原则（与 safety-gateway / emotion-engine 对齐）：
 * - LLM 调用失败：静默失败，不抛错（catch + console.error）
 * - JSON 解析失败：保留旧画像，不污染数据库
 * - 数据库写入失败：仅 console.error，不影响主流程
 * - 不阻塞响应：调用方应 fire-and-forget（不 await）
 *
 * 不依赖 safety-gateway / persona-prompts / emotion-engine，
 * 可独立演进；仅与 db + z-ai-web-dev-sdk 耦合。
 * ============================================================
 */

export interface ConversationTurn {
  role: string; // user / assistant / philosopher1 / philosopher2
  content: string;
}

export interface ExtractedInsight {
  corePain?: string;
  cognitiveBlindSpots?: string;
  valueTendency?: string;
  communicationPreference?: string;
  emotionBaseline?: string;
}

const ANALYSIS_PROMPT_TEMPLATE = `你是一个专业的心理/哲学分析师。请分析以下对话，提取用户的深层心智画像。
【用户当前已知画像】：{existingProfile}
【最新对话记录】：
{conversationHistory}
请更新并输出用户的画像，必须包含以下维度（JSON格式）：
{ "corePain": "...", "cognitiveBlindSpots": "...", "valueTendency": "...", "communicationPreference": "...", "emotionBaseline": "..." }
注意：只输出JSON，不要任何解释。`;

const MAX_HISTORY_TURNS = 30; // 截断超长历史避免 token 爆炸
const MAX_CONTENT_LEN = 800; // 单条消息截断长度

/**
 * 将对话记录拼接为紧凑文本供 LLM 阅读
 */
function formatConversationHistory(history: ConversationTurn[]): string {
  if (!Array.isArray(history) || history.length === 0) return "（无）";
  const trimmed = history.slice(-MAX_HISTORY_TURNS);
  return trimmed
    .map((turn) => {
      const role = turn.role === "user" ? "用户" : "AI";
      const content = (turn.content || "").slice(0, MAX_CONTENT_LEN);
      return `【${role}】${content}`;
    })
    .join("\n");
}

/**
 * 将现有 UserInsight 压缩成画像摘要字符串供 LLM 参考。
 * 当画像为空时返回"首次画像"提示，让 LLM 知道这是冷启动。
 */
export function summarizeExistingProfile(insight: UserInsight | null): string {
  if (!insight) return "（暂无，首次画像）";
  const parts: string[] = [];
  if (insight.corePain) parts.push(`核心痛点：${insight.corePain}`);
  if (insight.cognitiveBlindSpots) parts.push(`认知盲区：${insight.cognitiveBlindSpots}`);
  if (insight.valueTendency) parts.push(`价值观倾向：${insight.valueTendency}`);
  if (insight.communicationPreference) parts.push(`沟通偏好：${insight.communicationPreference}`);
  if (insight.emotionBaseline) parts.push(`情绪基线：${insight.emotionBaseline}`);
  return parts.length > 0 ? parts.join("；") : "（暂无有效画像）";
}

/**
 * 从 LLM 文本响应中解析 JSON。
 * 兼容三种常见 LLM 输出格式：
 *  1. 纯 JSON：{"corePain": "..."}
 *  2. ```json ... ``` 代码块包裹
 *  3. JSON 前后有多余解释文本（截取第一个 { 到最后一个 }）
 *
 * 解析失败返回 null，调用方据此跳过 upsert（保留旧画像）。
 */
function parseInsightJSON(raw: string): ExtractedInsight | null {
  if (!raw || typeof raw !== "string") return null;
  let text = raw.trim();

  // 剥离 ```json ... ``` 或 ``` ... ``` 代码块包裹
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // 截取第一个 { 到最后一个 } 之间的内容（防御 LLM 输出多余解释）
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return {
        corePain: typeof parsed.corePain === "string" ? parsed.corePain : "",
        cognitiveBlindSpots:
          typeof parsed.cognitiveBlindSpots === "string" ? parsed.cognitiveBlindSpots : "",
        valueTendency:
          typeof parsed.valueTendency === "string" ? parsed.valueTendency : "",
        communicationPreference:
          typeof parsed.communicationPreference === "string"
            ? parsed.communicationPreference
            : "",
        emotionBaseline:
          typeof parsed.emotionBaseline === "string" ? parsed.emotionBaseline : "",
      };
    }
  } catch (err) {
    console.error(
      "[insight-extractor] JSON parse failed:",
      err,
      "\nraw (truncated):",
      raw.slice(0, 500)
    );
  }
  return null;
}

/**
 * 调用 ZAI LLM 提取用户心智洞察，并 upsert 到 UserInsight 表。
 *
 * 健壮性：全程 try/catch，任何失败均静默（console.error），不抛错。
 * 调用方应 fire-and-forget（不 await）以避免阻塞响应。
 *
 * @param userId              用户 ID（必填，空则跳过）
 * @param conversationHistory 最近一轮对话的消息列表
 * @param existingProfile     现有画像摘要（可选；不传则内部查询）
 */
export async function extractUserInsights(
  userId: string,
  conversationHistory: ConversationTurn[],
  existingProfile?: string
): Promise<void> {
  if (!userId) {
    console.warn("[insight-extractor] userId missing, skip");
    return;
  }
  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    console.warn("[insight-extractor] empty conversationHistory, skip");
    return;
  }

  try {
    // 1. 读取现有画像（如果调用方未传入摘要）
    let profileSummary = existingProfile;
    let existingInsight: UserInsight | null = null;
    if (profileSummary === undefined) {
      existingInsight = await db.userInsight.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      profileSummary = summarizeExistingProfile(existingInsight);
    } else {
      existingInsight = await db.userInsight.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
    }

    // 2. 构建 prompt
    const prompt = ANALYSIS_PROMPT_TEMPLATE.replace(
      "{existingProfile}",
      profileSummary as string
    ).replace("{conversationHistory}", formatConversationHistory(conversationHistory));

    // 3. 调用 LLM（非流式，要求 JSON 输出）
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "你是一个专业的心理/哲学分析师，只输出 JSON。" },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const extracted = parseInsightJSON(raw);
    if (!extracted) {
      console.error("[insight-extractor] LLM did not return valid JSON, skip upsert");
      return;
    }

    // 4. upsert 到 UserInsight 表
    //    - 优先保留 LLM 新值；若某维度 LLM 返回空字符串，则保留旧值（防止画像被清空）
    //    - conversationCount 累加，lastAnalyzedAt 更新
    //    - 原始 JSON 存入 insightSummary 备查
    const rawJsonForAudit = JSON.stringify(extracted);

    if (existingInsight) {
      await db.userInsight.update({
        where: { id: existingInsight.id },
        data: {
          corePain: extracted.corePain || existingInsight.corePain,
          cognitiveBlindSpots:
            extracted.cognitiveBlindSpots || existingInsight.cognitiveBlindSpots,
          valueTendency: extracted.valueTendency || existingInsight.valueTendency,
          communicationPreference:
            extracted.communicationPreference || existingInsight.communicationPreference,
          emotionBaseline: extracted.emotionBaseline || existingInsight.emotionBaseline,
          insightSummary: rawJsonForAudit,
          conversationCount: (existingInsight.conversationCount || 0) + 1,
          lastAnalyzedAt: new Date(),
        },
      });
    } else {
      await db.userInsight.create({
        data: {
          userId,
          corePain: extracted.corePain || "",
          cognitiveBlindSpots: extracted.cognitiveBlindSpots || "",
          valueTendency: extracted.valueTendency || "",
          communicationPreference: extracted.communicationPreference || "",
          emotionBaseline: extracted.emotionBaseline || "",
          insightSummary: rawJsonForAudit,
          conversationCount: 1,
          lastAnalyzedAt: new Date(),
        },
      });
    }

    console.log(
      `[insight-extractor] upserted insight for user ${userId} (conversationCount=${
        (existingInsight?.conversationCount || 0) + 1
      })`
    );
  } catch (err) {
    // 静默失败：LLM 调用 / DB 写入 任何错误都不影响主对话流
    console.error("[insight-extractor] extractUserInsights failed (silent):", err);
  }
}

/**
 * 从数据库读取用户洞察画像（取最新一条）。
 * 失败时返回 null（调用方应优雅降级，不注入洞察）。
 */
export async function getUserInsights(userId: string): Promise<UserInsight | null> {
  if (!userId) return null;
  try {
    const insight = await db.userInsight.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return insight;
  } catch (err) {
    console.error("[insight-extractor] getUserInsights failed (silent):", err);
    return null;
  }
}

/**
 * 将洞察画像格式化为可注入 systemPrompt 的文本。
 * 仅在至少有一个非空字段时返回有效内容；否则返回空字符串。
 *
 * 注入位置建议：在 systemPrompt 末尾追加（emotion-engine 策略之后）。
 * 文本明确告知 AI "不要生硬复述"，避免 AI 味（与 anti-ai-rules 协同）。
 */
export function formatInsightsForPrompt(insight: UserInsight | null): string {
  if (!insight) return "";

  const lines: string[] = [];
  if (insight.corePain) lines.push(`- 核心痛点：${insight.corePain}`);
  if (insight.cognitiveBlindSpots) lines.push(`- 认知盲区：${insight.cognitiveBlindSpots}`);
  if (insight.valueTendency) lines.push(`- 价值观倾向：${insight.valueTendency}`);
  if (insight.communicationPreference)
    lines.push(`- 沟通偏好：${insight.communicationPreference}`);
  if (insight.emotionBaseline) lines.push(`- 情绪基线：${insight.emotionBaseline}`);

  if (lines.length === 0) return "";

  return [
    "",
    "【用户心智画像（后台反思 Agent 提炼，仅供你参考，不要生硬复述给用户）】",
    ...lines,
    "请基于以上画像，更精准地回应这位用户的深层需求与未解之结。",
  ].join("\n");
}
