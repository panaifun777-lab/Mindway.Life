import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const philosopher = await db.philosopher.findUnique({
      where: { slug },
    });

    if (!philosopher) {
      return NextResponse.json(
        { error: "Philosopher not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(philosopher);
  } catch (error) {
    console.error("Failed to fetch philosopher:", error);
    return NextResponse.json(
      { error: "Failed to fetch philosopher" },
      { status: 500 }
    );
  }
}
