"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SentimentBadge,
  EmotionBadge,
  PlatformBadge,
  PremiumBadge,
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
} from "@/lib/constants";
import { generateAnalysisReport, exportAnalysisCSV } from "@/lib/report";
import { buildShareUrl } from "@/lib/share";
import type { AnalysisResult } from "@/lib/analysis";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Calendar,
  FileText,
  Link2,
  Loader2,
  Brain,
  Sparkles,
  FileSpreadsheet,
  Quote,
  TrendingUp,
  TrendingDown,
  Meh,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Twitter,
  Linkedin,
} from "lucide-react";

interface AnalysisDetailData {
  id: string;
  userId: string;
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
}

export function AnalysisDetail() {
  const selectedAnalysisId = useAppStore((s) => s.selectedAnalysisId);
  const setSelectedAnalysisId = useAppStore((s) => s.setSelectedAnalysisId);
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);

  const [analysis, setAnalysis] = useState<AnalysisDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedAnalysisId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const res = await fetch(`/api/analyses/${selectedAnalysisId}`);
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) setAnalysis(data.analysis);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAnalysisId]);

  function handleBack() {
    setSelectedAnalysisId(null);
  }

  async function handleDownload() {
    if (!analysis) return;
    setDownloading(true);
    try {
      generateAnalysisReport({
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
      });
      toast.success("PDF report downloaded");
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setDownloading(false);
    }
  }

  function handleExportCSV() {
    if (!analysis) return;
    try {
      exportAnalysisCSV({
        id: analysis.id,
        title: analysis.title,
        platform: analysis.platform,
        contentType: analysis.contentType,
        createdAt: analysis.createdAt,
        results: analysis.results,
      });
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    }
  }

  function handleShareOpen() {
    setCopied(false);
    setShareOpen(true);
  }

  async function handleCopyShareLink() {
    if (!analysis) return;
    const url = buildShareUrl(analysis.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-and-copy prompt for older browsers
      toast.error("Couldn't copy automatically — copy the link manually");
    }
  }

  if (!selectedAnalysisId) {
    return null;
  }

  if (loading) {
    return <DetailSkeleton onBack={handleBack} />;
  }

  if (notFound || !analysis) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm font-medium">Analysis not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been deleted or you don&apos;t have access.
            </p>
            <Button onClick={() => setDashboardTab("my-analyses")} className="mt-4">
              Back to My Analyses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = getPlatform(analysis.platform);
  const Icon = p.icon;
  const sentiment = getSentiment(analysis.overallSentiment);
  const dominantEmotion = getEmotion(analysis.results.dominantEmotion);
  const contentTypeMeta = CONTENT_TYPES[analysis.contentType];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={handleBack} className="-ml-2">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to list
      </Button>

      {/* Header */}
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
                {analysis.isPremium && <PremiumBadge />}
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">
                {analysis.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(analysis.createdAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {analysis.itemCount} items analyzed
                </span>
                {analysis.sourceUrl && (
                  <a
                    href={analysis.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Source
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleShareOpen}
                variant="outline"
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                Share
              </Button>
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
              >
                {downloading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                Download PDF
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="relative overflow-hidden">
            {/* Pulse glow that plays once when the gauge appears */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{
                background: `radial-gradient(circle at 50% 60%, ${sentiment.color}33 0%, transparent 60%)`,
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: [0, 0.9, 0],
                scale: [0.6, 1.1, 1],
              }}
              transition={{ duration: 1.6, ease: "easeOut", times: [0, 0.5, 1] }}
            />
            <CardHeader className="relative">
              <CardTitle className="text-base">Sentiment Gauge</CardTitle>
              <CardDescription>Overall positivity score (-1 to +1)</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <SentimentGauge score={analysis.sentimentScore} />
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Summary — wrapped in a gradient border */}
        <div className="relative rounded-xl p-[1.5px] bg-gradient-to-br from-emerald-500/40 via-teal-500/30 to-cyan-500/40 lg:col-span-2">
          <Card className="h-full rounded-[10px] border-0 bg-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI-Generated Summary
                  </CardTitle>
                  <CardDescription>By the transformer model</CardDescription>
                </div>
                {/* Confidence Level indicator */}
                <Badge
                  variant="outline"
                  className={`gap-1.5 border-emerald-500/30 bg-emerald-500/10 ${
                    analysis.itemCount >= 10
                      ? "text-emerald-600 dark:text-emerald-400"
                      : analysis.itemCount >= 5
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                  }`}
                  title={`Based on ${analysis.itemCount} analyzed items`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {analysis.itemCount >= 10
                    ? "High Confidence"
                    : analysis.itemCount >= 5
                      ? "Medium Confidence"
                      : "Low Confidence"}
                </Badge>
              </div>
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
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{insight}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
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
                {analysis.results.keywords.map((k, i) => {
                  const s = getSentiment(k.sentiment);
                  return (
                    <motion.span
                      key={k.word}
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.05 + i * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      whileHover={{ y: -2, scale: 1.05 }}
                      className={`inline-flex cursor-default items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${s.bgClass}`}
                    >
                      <span>{k.word}</span>
                      <span className="text-[10px] opacity-70">×{k.count}</span>
                    </motion.span>
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
                  className="rounded-lg border border-border bg-card/60 p-3 transition-all duration-200 hover:bg-accent/50 hover:border-emerald-500/30 hover:shadow-sm"
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

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          onClick={handleShareOpen}
          variant="outline"
        >
          <Share2 className="mr-1.5 h-4 w-4" />
          Share
        </Button>
        <Button
          onClick={handleExportCSV}
          variant="outline"
        >
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
        >
          {downloading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          Download PDF Report
        </Button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        analysis={analysis}
        copied={copied}
        onCopy={handleCopyShareLink}
      />
    </div>
  );
}

function ShareDialog({
  open,
  onOpenChange,
  analysis,
  copied,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: AnalysisDetailData | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const shareUrl = analysis ? buildShareUrl(analysis.id) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Share2 className="h-4 w-4" />
            </span>
            Share this analysis
          </DialogTitle>
          <DialogDescription>
            Generate a public, read-only link to this analysis report. Anyone
            with the link can view it — no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link preview box */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Public share link
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1.5 font-mono text-[11px] text-foreground ring-1 ring-inset ring-border">
                {shareUrl}
              </code>
              <Button
                size="sm"
                onClick={onCopy}
                className="shrink-0 gap-1.5"
                variant={copied ? "secondary" : "default"}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Share to social — quick-post the share link to Twitter/X or
              LinkedIn, or copy it to the clipboard with a toast. */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Share to social
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!analysis) return;
                  const url = buildShareUrl(analysis.id);
                  const text = encodeURIComponent(
                    `Sentiment analysis: "${analysis.title}"`
                  );
                  window.open(
                    `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                className="gap-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Twitter className="h-3.5 w-3.5" />
                Twitter/X
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!analysis) return;
                  const url = buildShareUrl(analysis.id);
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                className="gap-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Linkedin className="h-3.5 w-3.5" />
                LinkedIn
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCopy}
                className="gap-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info list */}
          <div className="space-y-2 rounded-lg bg-emerald-500/[0.04] p-3 ring-1 ring-inset ring-emerald-500/15">
            <div className="flex items-start gap-2 text-xs">
              <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Read-only.</span>{" "}
                Recipients can view all charts and per-item sentiment but cannot
                edit or delete.
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Persistent.</span>{" "}
                The link works as long as the analysis exists in your account.
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">No signup.</span>{" "}
                Recipients see a polished report with a &quot;Try SentimentSense&quot;
                CTA — great for sharing insights with stakeholders or in demos.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              if (shareUrl) window.open(shareUrl, "_blank");
            }}
            variant="outline"
            className="flex-1 gap-1.5 sm:flex-none"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open link
          </Button>
          <Button
            onClick={onCopy}
            className="flex-1 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 sm:flex-none"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        <div className="mt-1.5 flex items-center gap-1.5 text-lg font-bold" style={color ? { color } : undefined}>
          {icon}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="-ml-2">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back
      </Button>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <Skeleton className="h-10 w-10 rounded-xl animate-pulse" />
          <Skeleton className="mt-4 h-7 w-2/3 animate-pulse" />
          <Skeleton className="mt-3 h-4 w-1/2 animate-pulse" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 animate-pulse" />
              <Skeleton className="mt-2 h-6 w-16 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32 animate-pulse" />
            <Skeleton className="mt-4 h-40 w-full animate-pulse" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32 animate-pulse" />
            <Skeleton className="mt-4 h-32 w-full animate-pulse" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-32 animate-pulse" />
              <Skeleton className="mt-4 h-60 w-full animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
