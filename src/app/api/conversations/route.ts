import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const philosopherId = searchParams.get("philosopherId");

    const where: Record<string, unknown> = {};
    if (philosopherId) {
      where.philosopherId = philosopherId;
    }

    const conversations = await db.conversation.findMany({
      where,
      include: {
        philosopher: {
          select: {
            id: true,
            nameCn: true,
            nameEn: true,
            avatarUrl: true,
          },
        },
        messages: {
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Add a preview field (first user message) for UI display
    const enriched = conversations.map((conv) => {
      const firstUserMsg = conv.messages.find((m) => m.role === "user");
      return {
        ...conv,
        preview: firstUserMsg?.content?.slice(0, 80) ?? "",
        messageCount: conv.messages.length,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Conversations list API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
