"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SentimentBadge,
  PlatformBadge,
  EmotionBadge,
} from "@/components/shared/badges";
import { SentimentGauge, SentimentPieChart, EmotionBarChart } from "@/components/shared/charts";
import { getPlatform, getSentiment, EMOTIONS } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/analysis";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Sparkles,
  Loader2,
  Trophy,
  Scale,
  ArrowLeftRight,
  LineChart as LineIcon,
} from "lucide-react";

interface AnalysisListItem {
  id: string;
  platform: string;
  contentType: string;
  title: string;
  overallSentiment: string;
  sentimentScore: number;
  itemCount: number;
  isPremium: boolean;
  createdAt: string;
}

interface FullAnalysis extends AnalysisListItem {
  results: AnalysisResult;
}

export function CompareTab() {
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [idA, setIdA] = useState<string>("");
  const [idB, setIdB] = useState<string>("");
  const [fullA, setFullA] = useState<FullAnalysis | null>(null);
  const [fullB, setFullB] = useState<FullAnalysis | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analyses");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAnalyses(data.analyses || []);
        // Auto-select first two
        if (data.analyses?.length >= 2) {
          setIdA(data.analyses[0].id);
          setIdB(data.analyses[1].id);
        } else if (data.analyses?.length === 1) {
          setIdA(data.analyses[0].id);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!idA && !idB) return;
    setLoadingDetail(true);
    let cancelled = false;
    (async () => {
      const promises: Promise<FullAnalysis | null>[] = [];
      if (idA) {
        promises.push(
          fetch(`/api/analyses/${idA}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.analysis || null)
            .catch(() => null)
        );
      } else {
        promises.push(Promise.resolve(null));
      }
      if (idB) {
        promises.push(
          fetch(`/api/analyses/${idB}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.analysis || null)
            .catch(() => null)
        );
      } else {
        promises.push(Promise.resolve(null));
      }
      const [a, b] = await Promise.all(promises);
      if (!cancelled) {
        setFullA(a);
        setFullB(b);
        setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idA, idB]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (analyses.length < 2) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <GitCompare className="h-6 w-6 text-primary" />
            Compare Analyses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Side-by-side comparison of two sentiment analyses to identify trends and differences.
          </p>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Scale className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold">Need at least 2 analyses to compare</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              You currently have {analyses.length} analysis{analyses.length === 1 ? "" : "es"}.
              Run one more analysis to unlock the comparison view.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GitCompare className="h-6 w-6 text-primary" />
          Compare Analyses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Side-by-side comparison of two sentiment analyses to identify trends and differences.
        </p>
      </motion.div>

      {/* Selectors */}
      <Card className="relative overflow-hidden border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.02] to-teal-500/[0.02]">
        <CardContent className="p-5">
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  A
                </span>
                Analysis A
              </label>
              <Select value={idA} onValueChange={setIdA}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first analysis" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === idB}>
                      {a.title} ({getPlatform(a.platform).label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-center gap-1.5 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Swap
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  const tmp = idA;
                  setIdA(idB);
                  setIdB(tmp);
                }}
                disabled={!idA || !idB}
                className="h-9 w-9 rounded-full border-emerald-500/30 bg-background text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                aria-label="Swap A and B"
                title="Swap A and B"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[9px] font-bold text-white">
                  B
                </span>
                Analysis B
              </label>
              <Select value={idB} onValueChange={setIdB}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second analysis" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {analyses.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === idA}>
                      {a.title} ({getPlatform(a.platform).label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingDetail ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      ) : fullA && fullB ? (
        <ComparisonView a={fullA} b={fullB} />
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select two analyses above to see the comparison.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ComparisonView({ a, b }: { a: FullAnalysis; b: FullAnalysis }) {
  const scoreDiff = b.sentimentScore - a.sentimentScore;
  const itemDiff = b.itemCount - a.itemCount;

  // Determine winner
  const sentimentWinner = scoreDiff > 0 ? "B" : scoreDiff < 0 ? "A" : "tie";
  const itemWinner = itemDiff > 0 ? "B" : itemDiff < 0 ? "A" : "tie";

  // Emotion comparison
  const allEmotions = Array.from(
    new Set([
      ...Object.keys(a.results.emotionDistribution),
      ...Object.keys(b.results.emotionDistribution),
    ])
  ).filter((e) => EMOTIONS[e]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Summary comparison row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <AnalysisHeader
          analysis={a}
          label="A"
          color="emerald"
          isWinner={sentimentWinner === "A"}
        />
        <div className="relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/40 to-muted/20 p-4 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.04]" />
          <span className="relative text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            vs
          </span>
          <div className="relative flex items-center gap-1">
            {scoreDiff > 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : scoreDiff < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={`text-sm font-bold tabular-nums ${
                scoreDiff > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : scoreDiff < 0
                    ? "text-red-600 dark:text-red-400"
                    : ""
              }`}
            >
              {scoreDiff > 0 ? "+" : ""}
              {scoreDiff.toFixed(2)}
            </span>
          </div>
          <span className="relative text-[10px] text-muted-foreground">score delta</span>
          {sentimentWinner !== "tie" && (
            <Badge
              variant="outline"
              className="relative mt-1 gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
            >
              <Trophy className="h-2.5 w-2.5" />
              {sentimentWinner === "A" ? "A leads" : "B leads"}
            </Badge>
          )}
        </div>
        <AnalysisHeader
          analysis={b}
          label="B"
          color="teal"
          isWinner={sentimentWinner === "B"}
        />
      </div>

      {/* Score gauges side by side */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Sentiment Score Comparison
          </CardTitle>
          <CardDescription>Overall sentiment score for each analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/10 text-emerald-600">A</Badge>
                {sentimentWinner === "A" && (
                  <Badge className="gap-1 bg-amber-500/10 text-amber-600">
                    <Trophy className="h-3 w-3" />
                    More positive
                  </Badge>
                )}
              </div>
              <SentimentGauge score={a.sentimentScore} height={160} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-teal-500/10 text-teal-600">B</Badge>
                {sentimentWinner === "B" && (
                  <Badge className="gap-1 bg-amber-500/10 text-amber-600">
                    <Trophy className="h-3 w-3" />
                    More positive
                  </Badge>
                )}
              </div>
              <SentimentGauge score={b.sentimentScore} height={160} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment distribution comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentiment Distribution</CardTitle>
          <CardDescription>Positive / Negative / Neutral breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Analysis A</Badge>
              <SentimentPieChart distribution={a.results.sentimentDistribution} height={200} />
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="bg-teal-500/10 text-teal-600">Analysis B</Badge>
              <SentimentPieChart distribution={b.results.sentimentDistribution} height={200} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Score Comparison — overlaid line chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineIcon className="h-4 w-4 text-primary" />
                Sentiment Score Comparison
              </CardTitle>
              <CardDescription>
                Side-by-side sentiment score on a normalized scale
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                A
              </Badge>
              <Badge variant="outline" className="gap-1.5 bg-teal-500/10 text-[10px] text-teal-600 dark:text-teal-400">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                B
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={[
                {
                  name: a.title.length > 20 ? a.title.slice(0, 20) + "…" : a.title,
                  scoreA: a.sentimentScore,
                  scoreB: null,
                },
                {
                  name: b.title.length > 20 ? b.title.slice(0, 20) + "…" : b.title,
                  scoreA: null,
                  scoreB: b.sentimentScore,
                },
              ]}
              margin={{ left: 16, right: 24, top: 16, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                domain={[-1, 1]}
                ticks={[-1, -0.5, 0, 0.5, 1]}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "Neutral", position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  color: "var(--popover-foreground)",
                  fontSize: "12px",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
                }}
                formatter={(value: number | null, name: string) => {
                  if (value === null) return ["—", name];
                  const label = name === "scoreA" ? "Analysis A" : "Analysis B";
                  return [value.toFixed(3), label];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                formatter={(value: string) => (value === "scoreA" ? "Analysis A" : "Analysis B")}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="scoreA"
                name="scoreA"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 8 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="scoreB"
                name="scoreB"
                stroke="#14b8a6"
                strokeWidth={2.5}
                dot={{ r: 6, fill: "#14b8a6", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 8 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              A: {a.sentimentScore.toFixed(3)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              B: {b.sentimentScore.toFixed(3)}
            </span>
            <span className="text-muted-foreground/60">
              Δ {scoreDiff > 0 ? "+" : ""}{scoreDiff.toFixed(3)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Emotion comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emotion Breakdown</CardTitle>
          <CardDescription>Item count per emotion, compared</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-medium text-muted-foreground">Emotion</th>
                  <th className="py-2 text-right font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">A</Badge>
                    </span>
                  </th>
                  <th className="py-2 text-right font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Badge className="bg-teal-500/10 text-teal-600 text-[10px]">B</Badge>
                    </span>
                  </th>
                  <th className="py-2 text-right font-medium text-muted-foreground">Difference</th>
                </tr>
              </thead>
              <tbody>
                {allEmotions.map((emotion) => {
                  const countA = a.results.emotionDistribution[emotion] || 0;
                  const countB = b.results.emotionDistribution[emotion] || 0;
                  const diff = countB - countA;
                  const e = EMOTIONS[emotion];
                  return (
                    <tr key={emotion} className="border-b border-border/50">
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{e.emoji}</span>
                          <span className="font-medium">{e.label}</span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{countA}</td>
                      <td className="py-2 text-right tabular-nums">{countB}</td>
                      <td className="py-2 text-right tabular-nums">
                        {diff === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={diff > 0 ? "text-teal-600" : "text-emerald-600"}>
                            {diff > 0 ? "+" : ""}
                            {diff}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Emotion Radar Chart - visual comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Emotion Radar
              </CardTitle>
              <CardDescription>
                Multi-dimensional emotion profile overlay
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                A
              </Badge>
              <Badge variant="outline" className="gap-1.5 bg-teal-500/10 text-[10px] text-teal-600 dark:text-teal-400">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                B
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmotionRadarChart a={a} b={b} />
        </CardContent>
      </Card>

      {/* Key metrics comparison */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ComparisonMetric
          label="Items Analyzed"
          valueA={a.itemCount}
          valueB={b.itemCount}
          winner={itemWinner}
          format="int"
        />
        <ComparisonMetric
          label="Positive %"
          valueA={a.results.sentimentDistribution.positive}
          valueB={b.results.sentimentDistribution.positive}
          winner={a.results.sentimentDistribution.positive > b.results.sentimentDistribution.positive ? "A" : b.results.sentimentDistribution.positive > a.results.sentimentDistribution.positive ? "B" : "tie"}
          format="pct"
        />
        <ComparisonMetric
          label="Negative %"
          valueA={a.results.sentimentDistribution.negative}
          valueB={b.results.sentimentDistribution.negative}
          winner={a.results.sentimentDistribution.negative < b.results.sentimentDistribution.negative ? "A" : b.results.sentimentDistribution.negative < a.results.sentimentDistribution.negative ? "B" : "tie"}
          format="pct"
          invertColor
        />
        <ComparisonMetric
          label="Dominant Emotion"
          valueA={a.results.dominantEmotion}
          valueB={b.results.dominantEmotion}
          winner="tie"
          format="emotion"
        />
      </div>

      {/* AI Summaries side by side */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <Badge className="mb-2 bg-emerald-500/10 text-emerald-600">Analysis A</Badge>
              <p className="text-sm leading-relaxed">{a.results.summary}</p>
            </div>
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
              <Badge className="mb-2 bg-teal-500/10 text-teal-600">Analysis B</Badge>
              <p className="text-sm leading-relaxed">{b.results.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmotionRadarChart({ a, b }: { a: FullAnalysis; b: FullAnalysis }) {
  // Build radar data: one row per emotion, with A and B columns
  const emotions = Array.from(
    new Set([
      ...Object.keys(a.results.emotionDistribution),
      ...Object.keys(b.results.emotionDistribution),
    ])
  ).filter((e) => EMOTIONS[e]);

  const data = emotions.map((emotion) => ({
    emotion: EMOTIONS[emotion].label,
    emoji: EMOTIONS[emotion].emoji,
    A: a.results.emotionDistribution[emotion] || 0,
    B: b.results.emotionDistribution[emotion] || 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No emotion data to display
      </div>
    );
  }

  // Compute max for axis scaling
  const maxVal = Math.max(
    ...data.flatMap((d) => [d.A, d.B]),
    1
  );

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} margin={{ top: 16, right: 30, left: 30, bottom: 16 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="emotion"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, Math.ceil(maxVal * 1.1)]}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
          />
          <Radar
            name="A"
            dataKey="A"
            stroke="#10b981"
            strokeWidth={2}
            fill="#10b981"
            fillOpacity={0.25}
            dot={{ r: 3, fill: "#10b981", strokeWidth: 1, stroke: "#fff" }}
          />
          <Radar
            name="B"
            dataKey="B"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="#14b8a6"
            fillOpacity={0.2}
            dot={{ r: 3, fill: "#14b8a6", strokeWidth: 1, stroke: "#fff" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              color: "var(--popover-foreground)",
              fontSize: "12px",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
            }}
            formatter={(value: number, name: string) => [
              `${value} item${value === 1 ? "" : "s"}`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            iconType="circle"
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-center text-[10px] text-muted-foreground">
        Larger area = more items exhibiting that emotion. Overlapping regions
        show emotional similarity between the two analyses.
      </p>
    </div>
  );
}

function AnalysisHeader({
  analysis,
  label,
  color,
  isWinner,
}: {
  analysis: FullAnalysis;
  label: string;
  color: "emerald" | "teal";
  isWinner?: boolean;
}) {
  const platform = getPlatform(analysis.platform);
  const Icon = platform.icon;
  const colorClasses = {
    emerald: "from-emerald-500 to-emerald-600",
    teal: "from-teal-500 to-teal-600",
  };
  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isWinner
          ? color === "emerald"
            ? "border-emerald-500/50 shadow-md shadow-emerald-500/10"
            : "border-teal-500/50 shadow-md shadow-teal-500/10"
          : ""
      }`}
    >
      <div className={`h-1.5 bg-gradient-to-r ${colorClasses[color]}`} />
      {isWinner && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400">
          <Trophy className="h-2.5 w-2.5" />
          Leader
        </div>
      )}
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Badge className={`bg-${color}-500/10 text-${color}-600`}>{label}</Badge>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <h3 className="line-clamp-2 font-semibold leading-tight">{analysis.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={analysis.platform} />
          <SentimentBadge sentiment={analysis.overallSentiment} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {analysis.itemCount} items • {new Date(analysis.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

function ComparisonMetric({
  label,
  valueA,
  valueB,
  winner,
  format,
  invertColor,
}: {
  label: string;
  valueA: number | string;
  valueB: number | string;
  winner: "A" | "B" | "tie";
  format: "int" | "pct" | "emotion";
  invertColor?: boolean;
}) {
  function formatVal(v: number | string) {
    if (format === "int") return String(v);
    if (format === "pct") return `${v}%`;
    if (format === "emotion") {
      const e = EMOTIONS[v as string];
      return e ? `${e.emoji} ${e.label}` : String(v);
    }
    return String(v);
  }

  // Winner gets a colored ring + crown
  const aIsWinner = winner === "A";
  const bIsWinner = winner === "B";

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        aIsWinner
          ? "border-emerald-500/40 bg-emerald-500/[0.03]"
          : bIsWinner
            ? "border-teal-500/40 bg-teal-500/[0.03]"
            : ""
      }`}
    >
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="relative text-center">
            {aIsWinner && (
              <Trophy className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 text-amber-500" />
            )}
            <p
              className={`text-lg font-bold tabular-nums transition-colors ${
                aIsWinner
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              }`}
            >
              {formatVal(valueA)}
            </p>
            <p className="text-[10px] text-muted-foreground">A</p>
          </div>
          <div className="flex flex-col items-center">
            <span
              className={`text-[9px] font-semibold uppercase ${
                aIsWinner
                  ? "text-emerald-500"
                  : bIsWinner
                    ? "text-teal-500"
                    : "text-muted-foreground"
              }`}
            >
              {aIsWinner ? "←" : bIsWinner ? "→" : "="}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
          </div>
          <div className="relative text-center">
            {bIsWinner && (
              <Trophy className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 text-amber-500" />
            )}
            <p
              className={`text-lg font-bold tabular-nums transition-colors ${
                bIsWinner
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-foreground"
              }`}
            >
              {formatVal(valueB)}
            </p>
            <p className="text-[10px] text-muted-foreground">B</p>
          </div>
        </div>
        {invertColor && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Lower is better
          </p>
        )}
      </CardContent>
    </Card>
  );
}
