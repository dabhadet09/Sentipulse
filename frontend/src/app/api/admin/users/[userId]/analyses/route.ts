import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Admin endpoint: fetch a specific user's analyses (read-only impersonation view)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        bio: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const analyses = await db.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        contentType: true,
        title: true,
        overallSentiment: true,
        sentimentScore: true,
        itemCount: true,
        isPremium: true,
        createdAt: true,
      },
    });

    const stats = {
      total: analyses.length,
      positive: analyses.filter((a) => a.overallSentiment === "positive").length,
      negative: analyses.filter((a) => a.overallSentiment === "negative").length,
      neutral: analyses.filter((a) => a.overallSentiment === "neutral").length,
      mixed: analyses.filter((a) => a.overallSentiment === "mixed").length,
      byPlatform: {
        youtube: analyses.filter((a) => a.platform === "youtube").length,
        reddit: analyses.filter((a) => a.platform === "reddit").length,
        x: analyses.filter((a) => a.platform === "x").length,
        instagram: analyses.filter((a) => a.platform === "instagram").length,
      },
    };

    return NextResponse.json({ user, analyses, stats });
  } catch (error) {
    console.error("Admin fetch user analyses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user analyses" },
      { status: 500 }
    );
  }
}
