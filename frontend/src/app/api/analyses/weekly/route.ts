import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * GET /api/analyses/weekly
 *
 * Returns weekly statistics for the authenticated user, computed from
 * analyses created in the last 7 days (rolling window from "now").
 *
 * Response shape:
 *   {
 *     totalThisWeek: number,
 *     mostActivePlatform: string | null,
 *     avgScore: number,                 // mean sentimentScore, -1..1
 *     dominantEmotion: string | null,   // emotion key, e.g. "joy"
 *     dailyBreakdown: Array<{
 *       date: string,                   // YYYY-MM-DD
 *       count: number,
 *       avgScore: number
 *     }>
 *   }
 *
 * Empty state (no analyses in the window) returns zeros / nulls and an
 * empty daily breakdown so the client can render a friendly empty
 * placeholder without branching on undefined.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 7-day rolling window from "now".
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const analyses = await db.analysis.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        sentimentScore: true,
        results: true,
        createdAt: true,
      },
    });

    // Empty state — return zeros / nulls so the client doesn't have to
    // branch on undefined fields.
    if (analyses.length === 0) {
      return NextResponse.json({
        totalThisWeek: 0,
        mostActivePlatform: null,
        avgScore: 0,
        dominantEmotion: null,
        dailyBreakdown: [],
      });
    }

    const totalThisWeek = analyses.length;

    // Most active platform — count by platform, pick the highest.
    const platformCounts: Record<string, number> = {};
    for (const a of analyses) {
      platformCounts[a.platform] = (platformCounts[a.platform] || 0) + 1;
    }
    const sortedPlatforms = Object.entries(platformCounts).sort(
      (a, b) => b[1] - a[1]
    );
    const mostActivePlatform = sortedPlatforms[0]?.[0] ?? null;

    // Average sentiment score across all analyses in the window.
    const avgScore =
      analyses.reduce((s, a) => s + a.sentimentScore, 0) / totalThisWeek;

    // Dominant emotion — aggregate per-emotion counts across all
    // analyses' emotionDistribution maps, then pick the highest total.
    // This is more accurate than just counting each analysis's
    // dominantEmotion field because it weights by item count.
    const emotionCounts: Record<string, number> = {};
    for (const a of analyses) {
      try {
        const parsed = JSON.parse(a.results) as {
          emotionDistribution?: Record<string, number>;
          dominantEmotion?: string;
        };
        if (
          parsed?.emotionDistribution &&
          typeof parsed.emotionDistribution === "object"
        ) {
          for (const [emotion, count] of Object.entries(
            parsed.emotionDistribution
          )) {
            const c = Number(count) || 0;
            if (c > 0) {
              emotionCounts[emotion] = (emotionCounts[emotion] || 0) + c;
            }
          }
        } else if (parsed?.dominantEmotion) {
          // Fallback: bump the analysis's declared dominant emotion by 1
          // if no distribution is available.
          emotionCounts[parsed.dominantEmotion] =
            (emotionCounts[parsed.dominantEmotion] || 0) + 1;
        }
      } catch {
        // Skip malformed results payloads — they don't contribute to
        // the emotion tally.
      }
    }
    const sortedEmotions = Object.entries(emotionCounts).sort(
      (a, b) => b[1] - a[1]
    );
    const dominantEmotion = sortedEmotions[0]?.[0] ?? null;

    // Daily breakdown — group analyses by YYYY-MM-DD date key, then
    // compute per-day count + average sentiment score. Sorted ascending
    // by date so the client can render a left-to-right timeline.
    const byDate: Record<string, { count: number; sum: number }> = {};
    for (const a of analyses) {
      const d = new Date(a.createdAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      const entry = byDate[dateKey] ?? { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += a.sentimentScore;
      byDate[dateKey] = entry;
    }
    const dailyBreakdown = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        count: v.count,
        avgScore: Number((v.sum / v.count).toFixed(3)),
      }));

    return NextResponse.json({
      totalThisWeek,
      mostActivePlatform,
      avgScore: Number(avgScore.toFixed(3)),
      dominantEmotion,
      dailyBreakdown,
    });
  } catch (error) {
    console.error("Weekly stats error:", error);
    return NextResponse.json(
      { error: "Failed to compute weekly stats" },
      { status: 500 }
    );
  }
}
