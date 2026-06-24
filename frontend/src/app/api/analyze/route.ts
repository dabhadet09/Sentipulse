import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeSentiment, analyzeUrl, type AnalysisItem } from "@/lib/analysis";
import { getCurrentUser } from "@/lib/session";
import { SAMPLE_DATASETS } from "@/lib/sample-data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { title } = body;
    const {
      platform,
      contentType,
      sourceUrl,
      items,
      sampleId,
      inputMode,
    } = body;

    if (!platform || !contentType || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const isLiveStream = contentType === "livestream";
    if (
      isLiveStream &&
      user.role !== "ADMIN" &&
      user.subscriptionTier !== "PREMIUM"
    ) {
      return NextResponse.json(
        {
          error:
            "Live stream analysis is a premium feature. Please apply for premium access.",
        },
        { status: 403 }
      );
    }

    let analysisItems: AnalysisItem[] = [];

    if (inputMode === "url") {
      // items will be populated by analyzeUrl
    } else if (sampleId) {
      const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
      if (!sample) {
        return NextResponse.json(
          { error: "Sample dataset not found" },
          { status: 404 }
        );
      }
      analysisItems = sample.items.map((it) => ({
        text: it.text,
        author: it.author,
      }));
    } else if (items && Array.isArray(items) && items.length > 0) {
      analysisItems = items
        .filter((it: { text?: string }) => it.text && it.text.trim().length > 0)
        .map((it: { text: string; author?: string }) => ({
          text: it.text,
          author: it.author,
        }));
    } else {
      return NextResponse.json(
        { error: "No content provided. Paste text, provide URL, or select a sample dataset." },
        { status: 400 }
      );
    }

    let results;

    if (inputMode === "url") {
      if (!sourceUrl) {
        return NextResponse.json(
          { error: "Source URL is required for auto-fetch mode." },
          { status: 400 }
        );
      }
      let fetchPlatform = platform;
      if (platform === "youtube" && contentType === "livestream") {
        fetchPlatform = "youtube_live";
      }
      results = await analyzeUrl(sourceUrl, fetchPlatform);
      // Optional: override the title if the fetcher found the real title
      const videoTitleInsight = results.insights.find(i => i.startsWith("Content Title:"));
      if (videoTitleInsight) {
        title = videoTitleInsight.replace("Content Title: ", "").trim();
      }
      analysisItems = results.items;
    } else {
      if (analysisItems.length < 2) {
        return NextResponse.json(
          { error: "Please provide at least 2 text items to analyze." },
          { status: 400 }
        );
      }
      results = await analyzeSentiment(analysisItems, platform, contentType);
    }

    const analysis = await db.analysis.create({
      data: {
        userId: user.id,
        platform,
        contentType,
        title,
        sourceUrl: sourceUrl || null,
        contentItems: JSON.stringify(analysisItems),
        results: JSON.stringify(results),
        overallSentiment: results.overallSentiment,
        sentimentScore: results.sentimentScore,
        itemCount: results.itemCount,
        isPremium: isLiveStream,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "analysis",
        detail: `Analyzed ${results.itemCount} items from ${platform} (${contentType})`,
      },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      results,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
