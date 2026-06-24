"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  EmotionBadge,
  PremiumBadge,
} from "@/components/shared/badges";
import { SentimentGauge, LiveStreamChart } from "@/components/shared/charts";
import { PLATFORMS, getEmotion } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/analysis";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Lock,
  Crown,
  Play,
  Square,
  Loader2,
  Activity,
  MessageSquare,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type PlatformId = keyof typeof PLATFORMS;

interface SegmentEntry {
  segment: number;
  timestamp: string;
  results: AnalysisResult;
}

const TICK_MS = 8000; // every 8 seconds a new segment

export function LivestreamTab() {
  const { data: session } = useSession();
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);

  const isPremium =
    session?.user?.subscriptionTier === "PREMIUM" ||
    session?.user?.role === "ADMIN";

  if (!isPremium) {
    return <LockedView onApply={() => setDashboardTab("premium")} />;
  }

  return <LivestreamStudio />;
}

function LockedView({ onApply }: { onApply: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Stream Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time sentiment monitoring for live broadcasts.
        </p>
      </div>

      <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <CardContent className="relative flex flex-col items-center py-16 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30"
          >
            <Lock className="h-8 w-8" />
          </motion.div>
          <PremiumLockedBadge />
          <h2 className="mt-4 text-xl font-bold">Premium Feature</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Live stream analysis monitors chat sentiment in real time during
            broadcasts — giving you per-segment emotion tracking and a live
            trend line. Apply for premium access to unlock this and other
            advanced analytics.
          </p>

          <div className="mt-6 grid w-full max-w-md gap-2 text-left sm:grid-cols-2">
            {[
              "Per-segment emotion tracking",
              "Live sentiment trend chart",
              "Real-time dominant emotion gauge",
              "Running tally of messages analyzed",
            ].map((b) => (
              <div
                key={b}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-2.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {b}
              </div>
            ))}
          </div>

          <Button
            onClick={onApply}
            className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
          >
            <Crown className="mr-1.5 h-4 w-4" />
            Apply for Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PremiumLockedBadge() {
  return (
    <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
      <Crown className="h-3 w-3" />
      PREMIUM
    </Badge>
  );
}

export function LivestreamStudio({
  initialTitle,
  initialPlatform,
  autoStart = false,
  hideConfig = false,
  onReset,
}: {
  initialTitle?: string;
  initialPlatform?: PlatformId;
  autoStart?: boolean;
  hideConfig?: boolean;
  onReset?: () => void;
} = {}) {
  const [title, setTitle] = useState(initialTitle || "Live Q&A Stream — Chat Sentiment Monitor");
  const [platform, setPlatform] = useState<PlatformId>(initialPlatform || "youtube");
  const [running, setRunning] = useState(false);
  const [currentSegment, setCurrentSegment] = useState<SegmentEntry | null>(null);
  const [segments, setSegments] = useState<SegmentEntry[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingSeg, setLoadingSeg] = useState(false);
  const segmentNumRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const runningRef = useRef(false);

  const analyzeSegment = useCallback(
    async (segment: number, plat: PlatformId, streamTitle: string) => {
      if (!mountedRef.current) return;
      setLoadingSeg(true);
      setError(null);
      try {
        const res = await fetch("/api/livestream/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segment, platform: plat, title: streamTitle }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Segment analysis failed");
        }
        if (!mountedRef.current) return;
        const entry: SegmentEntry = {
          segment: data.segment,
          timestamp: data.timestamp,
          results: data.results,
        };
        setCurrentSegment(entry);
        setSegments((prev) => [...prev, entry]);
        setTotalMessages((prev) => prev + (data.results.itemCount || 0));
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Analysis failed");
          toast.error("Live segment analysis failed — stopping stream.");
          stopStream();
        }
      } finally {
        if (mountedRef.current) setLoadingSeg(false);
      }
    },
    [] // stopStream is removed from deps since it's declared after, or we can use runningRef inside stopStream and hoist it. But stopStream has no deps anyway. We can just declare stopStream first.
  );

  const startStream = useCallback(() => {
    if (runningRef.current) return;
    setSegments([]);
    setCurrentSegment(null);
    setTotalMessages(0);
    setError(null);
    segmentNumRef.current = 1;
    setRunning(true);
    runningRef.current = true;
    
    // Kick off first segment immediately
    analyzeSegment(1, platform, title);
    intervalRef.current = setInterval(() => {
      segmentNumRef.current += 1;
      analyzeSegment(segmentNumRef.current, platform, title);
    }, TICK_MS);
  }, [analyzeSegment, platform, title]);

  const stopStream = useCallback(() => {
    setRunning(false);
    runningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    if (autoStart) {
      startStream();
    }
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Stop stream if running changes to false externally
  useEffect(() => {
    if (!running && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [running]);

  // Chart data
  const chartData = segments.map((s) => ({
    time: `#${s.segment}`,
    positive: s.results.sentimentDistribution.positive,
    negative: s.results.sentimentDistribution.negative,
    neutral: s.results.sentimentDistribution.neutral,
  }));

  // Aggregate summary
  const summary =
    segments.length > 0
      ? {
          avgScore:
            segments.reduce((acc, s) => acc + s.results.sentimentScore, 0) /
            segments.length,
          dominantEmotion:
            Object.entries(
              segments.reduce<Record<string, number>>((acc, s) => {
                for (const [k, v] of Object.entries(s.results.emotionDistribution)) {
                  acc[k] = (acc[k] || 0) + v;
                }
                return acc;
              }, {})
            ).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral",
        }
      : null;

  const isStreaming = running;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Live Stream Studio</h1>
            {isStreaming && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                LIVE
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulated real-time chat sentiment analysis. A new segment is
            analyzed every {TICK_MS / 1000}s.
          </p>
        </div>
        <PremiumBadge />
      </div>

      {/* Stream config + controls */}
      {!hideConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-primary" />
              Stream Configuration
            </CardTitle>
            <CardDescription>Set up your live stream session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="stream-title">Stream Title</Label>
                <Input
                  id="stream-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={running}
                  placeholder="Give your stream a title"
                />
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={platform}
                  onValueChange={(v) => setPlatform(v as PlatformId)}
                  disabled={running}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLATFORMS) as PlatformId[]).map((id) => {
                      const P = PLATFORMS[id];
                      const Icon = P.icon;
                      return (
                        <SelectItem key={id} value={id}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            {P.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {!running ? (
                  <Button
                    onClick={startStream}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 lg:w-auto"
                  >
                    <Play className="mr-1.5 h-4 w-4" />
                    Start Stream
                  </Button>
                ) : (
                  <Button
                    onClick={stopStream}
                    variant="destructive"
                    className="w-full lg:w-auto"
                  >
                    <Square className="mr-1.5 h-4 w-4" />
                    Stop Stream
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hideConfig && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {(() => { const Icon = PLATFORMS[platform].icon; return <Icon className="h-3 w-3" />; })()}
                {PLATFORMS[platform].label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {running ? (
              <Button onClick={stopStream} variant="destructive" size="sm">
                <Square className="mr-1.5 h-4 w-4" />
                Stop Stream
              </Button>
            ) : (
              <Button onClick={onReset} variant="outline" size="sm">
                Back to Config
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Live stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Segments"
          value={String(segments.length)}
          icon={<Activity className="h-4 w-4" />}
          accent="from-emerald-500 to-teal-600"
        />
        <StatTile
          label="Messages Analyzed"
          value={String(totalMessages)}
          icon={<MessageSquare className="h-4 w-4" />}
          accent="from-cyan-500 to-emerald-500"
        />
        <StatTile
          label="Avg Sentiment"
          value={
            summary
              ? `${summary.avgScore > 0 ? "+" : ""}${summary.avgScore.toFixed(2)}`
              : "—"
          }
          icon={<Sparkles className="h-4 w-4" />}
          accent="from-amber-500 to-orange-500"
        />
        <StatTile
          label="Dominant Emotion"
          value={
            summary ? getEmotion(summary.dominantEmotion).label : "—"
          }
          icon={<span>{summary ? getEmotion(summary.dominantEmotion).emoji : "—"}</span>}
          accent="from-violet-500 to-fuchsia-500"
        />
      </div>

      {/* Live chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Sentiment Trend Over Time
          </CardTitle>
          <CardDescription>
            Percentage of positive / negative / neutral per segment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center text-center">
              <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {running ? "Waiting for first segment…" : "Start the stream to see the live chart."}
              </p>
            </div>
          ) : (
            <LiveStreamChart data={chartData} height={240} />
          )}
        </CardContent>
      </Card>

      {/* Current segment detail */}
      <AnimatePresence mode="wait">
        {currentSegment ? (
          <motion.div
            key={currentSegment.segment}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="grid gap-5 lg:grid-cols-3"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Current Segment #{currentSegment.segment}
                </CardTitle>
                <CardDescription>
                  {loadingSeg ? "Analyzing latest chunk…" : "Live snapshot"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SentimentGauge score={currentSegment.results.sentimentScore} />
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <SentimentBadge sentiment={currentSegment.results.overallSentiment} />
                  <EmotionBadge emotion={currentSegment.results.dominantEmotion} />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Segment Summary
                </CardTitle>
                <CardDescription>
                  {currentSegment.results.itemCount} messages in this segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                  {currentSegment.results.summary}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <DistTile
                    label="Positive"
                    pct={currentSegment.results.sentimentDistribution.positive}
                    color="bg-emerald-500"
                  />
                  <DistTile
                    label="Neutral"
                    pct={currentSegment.results.sentimentDistribution.neutral}
                    color="bg-amber-500"
                  />
                  <DistTile
                    label="Negative"
                    pct={currentSegment.results.sentimentDistribution.negative}
                    color="bg-red-500"
                  />
                </div>
                <div className="mt-3 max-h-44 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
                  {currentSegment.results.items.slice(0, 8).map((it, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md border border-border/60 bg-card/60 p-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        {it.author && (
                          <span className="text-muted-foreground">@{it.author}: </span>
                        )}
                        <span className="line-clamp-1">{it.text}</span>
                      </div>
                      <EmotionBadge emotion={it.emotion} className="shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : running ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                Analyzing first segment…
              </p>
            </CardContent>
          </Card>
        ) : null}
      </AnimatePresence>

      {/* Final summary when stopped */}
      {!running && segments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Stream Summary
              </CardTitle>
              <CardDescription>
                Final tally across {segments.length} segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total Messages
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{totalMessages}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Average Score
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {summary ? `${summary.avgScore > 0 ? "+" : ""}${summary.avgScore.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Dominant Emotion
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {summary ? `${getEmotion(summary.dominantEmotion).emoji} ${getEmotion(summary.dominantEmotion).label}` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${accent} text-white`}
          >
            {icon}
          </div>
        </div>
        <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function DistTile({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{pct}%</p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
