import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateShareId } from "@/lib/share";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    if (!shareId || shareId.length < 8) {
      return NextResponse.json(
        { error: "Invalid share link" },
        { status: 400 }
      );
    }

    // Brute-force protection: share IDs are 24-char hex (192-bit entropy
    // from HMAC), so enumeration is infeasible. We scan all analyses to
    // find the matching shareId. For perf we rely on the fact that this
    // is a demo project with limited analyses.
    //
    // A more efficient design would store a shareId column on Analysis;
    // we keep this stateless approach for simplicity.
    const allAnalyses = await db.analysis.findMany({
      select: { id: true },
    });

    const matched = allAnalyses.find(
      (a) => generateShareId(a.id) === shareId
    );

    if (!matched) {
      return NextResponse.json(
        { error: "Shared analysis not found" },
        { status: 404 }
      );
    }

    const analysis = await db.analysis.findUnique({
      where: { id: matched.id },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Shared analysis not found" },
        { status: 404 }
      );
    }

    const results = JSON.parse(analysis.results);
    const contentItems = JSON.parse(analysis.contentItems);

    return NextResponse.json({
      analysis: {
        id: analysis.id,
        platform: analysis.platform,
        contentType: analysis.contentType,
        title: analysis.title,
        sourceUrl: analysis.sourceUrl,
        contentItems,
        results,
        overallSentiment: analysis.overallSentiment,
        sentimentScore: analysis.sentimentScore,
        itemCount: analysis.itemCount,
        isPremium: analysis.isPremium,
        createdAt: analysis.createdAt,
        authorName: analysis.user.name,
      },
    });
  } catch (error) {
    console.error("Share fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load shared analysis" },
      { status: 500 }
    );
  }
}
