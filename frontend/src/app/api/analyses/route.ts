import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");

    const where: { userId: string; platform?: string } = { userId: user.id };
    if (platform && platform !== "all") {
      where.platform = platform;
    }

    const analyses = await db.analysis.findMany({
      where,
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

    return NextResponse.json({ analyses, stats });
  } catch (error) {
    console.error("Fetch analyses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    );
  }
}
