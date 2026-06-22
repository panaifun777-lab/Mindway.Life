import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { philosopherId1, philosopherId2, question } = body as {
      philosopherId1: string;
      philosopherId2: string;
      question: string;
    };

    if (!philosopherId1 || !philosopherId2 || !question) {
      return NextResponse.json(
        { error: "philosopherId1, philosopherId2, and question are required" },
        { status: 400 }
      );
    }

    // Fetch both philosophers
    const [philosopher1, philosopher2] = await Promise.all([
      db.philosopher.findUnique({ where: { id: philosopherId1 } }),
      db.philosopher.findUnique({ where: { id: philosopherId2 } }),
    ]);

    if (!philosopher1) {
      return NextResponse.json(
        { error: "Philosopher 1 not found" },
        { status: 404 }
      );
    }

    if (!philosopher2) {
      return NextResponse.json(
        { error: "Philosopher 2 not found" },
        { status: 404 }
      );
    }

    // Call LLM for both philosophers in parallel
    const zai = await ZAI.create();

    const [completion1, completion2] = await Promise.all([
      zai.chat.completions.create({
        messages: [
          { role: "assistant", content: philosopher1.systemPrompt },
          { role: "user", content: `用户提出了这样一个问题：「${question}」\n请用你的哲学观点来回答。同时，请简要点评另一位哲学家可能的不同看法。请用中文回答，保持你独特的思维风格。` },
        ],
        thinking: { type: "disabled" },
      }),
      zai.chat.completions.create({
        messages: [
          { role: "assistant", content: philosopher2.systemPrompt },
          { role: "user", content: `用户提出了这样一个问题：「${question}」\n请用你的哲学观点来回答。同时，请简要点评另一位哲学家可能的不同看法。请用中文回答，保持你独特的思维风格。` },
        ],
        thinking: { type: "disabled" },
      }),
    ]);

    const content1 =
      completion1.choices?.[0]?.message?.content ?? "抱歉，我暂时无法回应。";
    const content2 =
      completion2.choices?.[0]?.message?.content ?? "抱歉，我暂时无法回应。";

    return NextResponse.json({
      response1: {
        philosopher: philosopher1.nameCn,
        content: content1,
      },
      response2: {
        philosopher: philosopher2.nameCn,
        content: content2,
      },
    });
  } catch (error) {
    console.error("Debate API error:", error);
    return NextResponse.json(
      { error: "Failed to generate debate responses" },
      { status: 500 }
    );
  }
}
