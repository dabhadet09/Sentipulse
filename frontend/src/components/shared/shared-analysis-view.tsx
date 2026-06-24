"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  SentimentBadge,
  EmotionBadge,
  PlatformBadge,
} from "@/components/shared/badges";
import {
  SentimentPieChart,
  EmotionBarChart,
  SentimentGauge,
  WordCloud,
} from "@/components/shared/charts";
import {
  CONTENT_TYPES,
  getPlatform,
  getSentiment,
  getEmotion,
  GROUP_INFO,
} from "@/lib/constants";
import type { AnalysisResult } from "@/lib/analysis";
import {
  generateAnalysisReport,
  exportAnalysisCsv,
  type AnalysisWithRelations,
} from "@/lib/report";
import { motion } from "framer-motion";
import { Footer } from "@/components/shared/footer";
import {
  Brain,
  Calendar,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Quote,
  TrendingUp,
  TrendingDown,
  Meh,
  Share2,
  ArrowLeft,
  ExternalLink,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/**
 * Build a URL/file-safe slug from an analysis title. Lowercased, hyphen-
 * separated, stripped of leading/trailing hyphens, capped at 50 chars.
 * Falls back to "analysis" when the title yields an empty slug.
 */
function buildTitleSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return slug || "analysis";
}

/** Build the AnalysisWithRelations payload expected by exportAnalysisCsv. */
function toCsvPayload(
  analysis: SharedAnalysisData
): AnalysisWithRelations {
  return {
    id: analysis.id,
    title: analysis.title,
    titleSlug: buildTitleSlug(analysis.title),
    results: analysis.results,
    platform: analysis.platform,
    contentType: analysis.contentType,
    overallSentiment: analysis.overallSentiment,
    sentimentScore: analysis.sentimentScore,
    itemCount: analysis.itemCount,
    isPremium: analysis.isPremium,
    createdAt: analysis.createdAt,
  };
}

/** Build the ReportData payload expected by generateAnalysisReport. */
function toReportPayload(analysis: SharedAnalysisData) {
  return {
    id: analysis.id,
    platform: analysis.platform,
    contentType: analysis.contentType,
    title: analysis.title,
    sourceUrl: analysis.sourceUrl,
    overallSentiment: analysis.overallSentiment,
    sentimentScore: analysis.sentimentScore,
    itemCount: analysis.itemCount,
    isPremium: analysis.isPremium,
    createdAt: analysis.createdAt,
    results: analysis.results,
  };
}

interface SharedAnalysisData {
  id: string;
  platform: string;
  contentType: string;
  title: string;
  sourceUrl: string | null;
  contentItems: { text: string; author?: string }[];
  results: AnalysisResult;
  overallSentiment: string;
  sentimentScore: number;
  itemCount: number;
  isPremium: boolean;
  createdAt: string;
  authorName: string;
}

export function SharedAnalysisView({ shareId }: { shareId: string }) {
  const [analysis, setAnalysis] = useState<SharedAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/share/${shareId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load shared analysis");
        }
        const data = await res.json();
        if (!cancelled) setAnalysis(data.analysis);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-emerald-500/[0.03]">
      {/* Public share top banner */}
      <div className="sticky top-0 z-30 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Brain className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">
                Sentiment<span className="text-primary">Sense</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Public Shared Report
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-400 sm:flex"
            >
              <Lock className="h-3 w-3" />
              Read-only
            </Badge>
            <Link href="/">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Try SentimentSense</span>
                <span className="sm:hidden">Try</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {loading ? (
            <SharedSkeleton />
          ) : error ? (
            <Card className="border-red-500/30">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                  <AlertCircle className="h-7 w-7 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Shared analysis unavailable</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to SentimentSense
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : analysis ? (
            <SharedContent analysis={analysis} />
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function SharedContent({ analysis }: { analysis: SharedAnalysisData }) {
  const p = getPlatform(analysis.platform);
  const Icon = p.icon;
  const sentiment = getSentiment(analysis.overallSentiment);
  const dominantEmotion = getEmotion(analysis.results.dominantEmotion);
  const contentTypeMeta = CONTENT_TYPES[analysis.contentType];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className={`h-1.5 bg-gradient-to-r ${p.gradient}`} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.gradient} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <PlatformBadge platform={analysis.platform} />
                <Badge variant="outline" className="capitalize">
                  {contentTypeMeta?.label || analysis.contentType}
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  <Share2 className="h-3 w-3" />
                  Shared
                </Badge>
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                {analysis.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(analysis.createdAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {analysis.itemCount} items analyzed
                </span>
                <span className="flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5" />
                  by {analysis.authorName}
                </span>
                {analysis.sourceUrl && (
                  <a
                    href={analysis.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Source
                  </a>
                )}
              </div>
            </div>
            {/* Export actions */}
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => generateAnalysisReport(toReportPayload(analysis))}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
                title="Download this analysis as a PDF report"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportAnalysisCsv(toCsvPayload(analysis))}
                title="Export analysis items as CSV"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Public-view info banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.07] via-teal-500/[0.04] to-emerald-500/[0.07]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                You&apos;re viewing a public, read-only analysis report.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This link is shareable but cannot be edited.{" "}
                <Link
                  href="/"
                  className="font-medium text-primary hover:underline"
                >
                  Create your own analysis →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricTile
          label="Overall Sentiment"
          icon={
            analysis.overallSentiment === "positive" ? (
              <TrendingUp className="h-4 w-4" />
            ) : analysis.overallSentiment === "negative" ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Meh className="h-4 w-4" />
            )
          }
          color={sentiment.color}
        >
          <span className="capitalize">{analysis.overallSentiment}</span>
        </MetricTile>
        <MetricTile label="Sentiment Score" color={sentiment.color}>
          <span className="tabular-nums">
            {analysis.sentimentScore > 0 ? "+" : ""}
            {analysis.sentimentScore.toFixed(2)}
          </span>
        </MetricTile>
        <MetricTile label="Dominant Emotion" color={dominantEmotion.color}>
          <span className="flex items-center gap-1.5">
            <span>{dominantEmotion.emoji}</span>
            <span>{dominantEmotion.label}</span>
          </span>
        </MetricTile>
        <MetricTile label="Items Analyzed">
          <span className="tabular-nums">{analysis.itemCount}</span>
        </MetricTile>
      </div>

      {/* Gauge + Summary */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentiment Gauge</CardTitle>
            <CardDescription>Overall positivity score (-1 to +1)</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentGauge score={analysis.sentimentScore} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Generated Summary
            </CardTitle>
            <CardDescription>By the transformer model</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
              {analysis.results.summary}
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Key Insights
              </p>
              <ul className="mt-2 space-y-2">
                {analysis.results.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentiment Distribution</CardTitle>
            <CardDescription>Percentage split across items</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentPieChart distribution={analysis.results.sentimentDistribution} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emotion Breakdown</CardTitle>
            <CardDescription>Count per detected emotion</CardDescription>
          </CardHeader>
          <CardContent>
            <EmotionBarChart distribution={analysis.results.emotionDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Top keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Top Keywords
          </CardTitle>
          <CardDescription>
            Frequent terms, sized by frequency and colored by associated sentiment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.results.keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keywords extracted.</p>
          ) : (
            <>
              <WordCloud keywords={analysis.results.keywords} height={200} />
              <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
                {analysis.results.keywords.map((k) => {
                  const s = getSentiment(k.sentiment);
                  return (
                    <span
                      key={k.word}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${s.bgClass}`}
                    >
                      <span>{k.word}</span>
                      <span className="text-[10px] opacity-70">×{k.count}</span>
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full item list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Quote className="h-4 w-4 text-primary" />
            Analyzed Items
            <Badge variant="secondary" className="ml-1">
              {analysis.results.items.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Per-item sentiment, emotion, and score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 space-y-2 overflow-y-auto scrollbar-thin pr-1">
            {analysis.results.items.map((it, i) => {
              const s = getSentiment(it.sentiment);
              const e = getEmotion(it.emotion);
              const scorePct = ((it.score + 1) / 2) * 100;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card/60 p-3 transition-colors hover:bg-accent/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {it.author && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                          @{it.author}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{it.text}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SentimentBadge sentiment={it.sentiment} />
                      <EmotionBadge emotion={it.emotion} />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${scorePct}%`,
                          background: s.color,
                        }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {it.score > 0 ? "+" : ""}
                      {it.score.toFixed(2)} • {e.emoji} {e.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {analysis.results.items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No item-level results available.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.07] via-teal-500/[0.04] to-cyan-500/[0.07]">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
        <CardContent className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                Build your own sentiment dashboard
              </h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                SentimentSense analyzes YouTube, Reddit, X, and Instagram content
                with a fine-tuned transformer model. Free to start — no credit card
                needed.
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                A final year project by Group No {GROUP_INFO.groupNumber} •{" "}
                {GROUP_INFO.members.join(", ")}
              </p>
            </div>
          </div>
          <Link href="/" className="shrink-0">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90">
              Get Started
              <ArrowLeft className="ml-1.5 h-4 w-4 rotate-180" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTile({
  label,
  children,
  icon,
  color,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div
          className="mt-1.5 flex items-center gap-1.5 text-lg font-bold"
          style={color ? { color } : undefined}
        >
          {icon}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function SharedSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 sm:p-8">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-4 h-7 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-40 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
