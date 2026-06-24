"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SentimentBadge,
  PlatformBadge,
  PremiumBadge,
} from "@/components/shared/badges";
import { PLATFORMS, getPlatform, getSentiment } from "@/lib/constants";
import {
  generateAnalysisReport,
  exportAnalysisCSV,
  exportAllAnalysesCsv,
  type AnalysisWithRelations,
} from "@/lib/report";
import { buildShareUrl } from "@/lib/share";
import type { AnalysisResult } from "@/lib/analysis";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Eye,
  Download,
  Trash2,
  Search,
  Plus,
  Loader2,
  Filter,
  Inbox,
  Sparkles,
  Calendar,
  FileText,
  FileSpreadsheet,
  Share2,
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

interface Stats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;
  byPlatform: { youtube: number; reddit: number; x: number; instagram: number };
}

type FilterPlatform = "all" | keyof typeof PLATFORMS;
type FilterSentiment = "all" | "positive" | "negative" | "neutral" | "mixed";

export function MyAnalysesTab() {
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);
  const setSelectedAnalysisId = useAppStore((s) => s.setSelectedAnalysisId);
  const heatmapFilter = useAppStore((s) => s.heatmapFilter);
  const clearHeatmapFilter = useAppStore((s) => s.clearHeatmapFilter);

  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterPlatform>("all");
  const [sentimentFilter, setSentimentFilter] = useState<FilterSentiment>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d" | "90d">("all");
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  // Consume heatmap filter (when navigated from overview heatmap click)
  useEffect(() => {
    if (heatmapFilter.platform && heatmapFilter.sentiment) {
      setFilter(heatmapFilter.platform as FilterPlatform);
      setSentimentFilter(heatmapFilter.sentiment as FilterSentiment);
      // Clear after consuming so user can change filters freely afterwards
      clearHeatmapFilter();
    }
  }, [heatmapFilter.platform, heatmapFilter.sentiment, clearHeatmapFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analyses");
      const data = await res.json();
      setAnalyses(data.analyses || []);
      setStats(data.stats || null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = analyses.filter((a) => {
    if (filter !== "all" && a.platform !== filter) return false;
    if (sentimentFilter !== "all" && a.overallSentiment !== sentimentFilter) return false;
    if (search.trim() && !a.title.toLowerCase().includes(search.toLowerCase().trim()))
      return false;
    // Date filter
    if (dateFilter !== "all") {
      const created = new Date(a.createdAt).getTime();
      const now = Date.now();
      const ranges: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "90d": 90 * 24 * 60 * 60 * 1000,
      };
      if (now - created > ranges[dateFilter]) return false;
    }
    return true;
  });

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Analysis deleted");
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete analysis");
    }
  }

  async function handleDownload(a: AnalysisListItem) {
    setDownloadingId(a.id);
    try {
      const res = await fetch(`/api/analyses/${a.id}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const analysis = data.analysis;
      const results: AnalysisResult = analysis.results;
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
        results,
      });
      toast.success("PDF report downloaded");
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleShare(a: AnalysisListItem) {
    const url = buildShareUrl(a.id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public share link copied to clipboard", {
        description: "Anyone with the link can view this analysis — no login needed.",
        action: {
          label: "Open",
          onClick: () => window.open(url, "_blank"),
        },
      });
    } catch {
      toast.error("Couldn't copy link — please try again");
    }
  }

  async function handleExportCSV(a: AnalysisListItem) {
    try {
      const res = await fetch(`/api/analyses/${a.id}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const analysis = data.analysis;
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

  async function handleExportAll() {
    if (analyses.length === 0) return;
    setExportingAll(true);
    try {
      // Fetch full details for each analysis in parallel (cap concurrency to 5)
      const results: AnalysisWithRelations[] = [];
      const batchSize = 5;
      for (let i = 0; i < analyses.length; i += batchSize) {
        const batch = analyses.slice(i, i + batchSize);
        const settled = await Promise.allSettled(batch.map(fetchAnalysisFull));
        for (const s of settled) {
          if (s.status === "fulfilled" && s.value) results.push(s.value);
        }
      }
      if (results.length === 0) throw new Error("No analyses could be loaded");
      const blob = exportAllAnalysesCsv(results);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split("T")[0];
      link.download = `sentimentsense-all-analyses-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${results.length} analyses to CSV`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export all analyses");
    } finally {
      setExportingAll(false);
    }
  }

  async function fetchAnalysisFull(a: AnalysisListItem): Promise<AnalysisWithRelations | null> {
    try {
      const res = await fetch(`/api/analyses/${a.id}`);
      if (!res.ok) return null;
      const data = await res.json();
      const analysis = data.analysis;
      return {
        id: a.id,
        title: a.title,
        titleSlug: a.title
          .slice(0, 30)
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase(),
        platform: a.platform,
        contentType: a.contentType,
        overallSentiment: a.overallSentiment,
        sentimentScore: a.sentimentScore,
        itemCount: a.itemCount,
        isPremium: a.isPremium,
        createdAt: a.createdAt,
        results: analysis?.results as AnalysisResult,
      };
    } catch {
      return null;
    }
  }

  const filterButtons: { id: FilterPlatform; label: string }[] = [
    { id: "all", label: "All" },
    { id: "youtube", label: "YouTube" },
    { id: "reddit", label: "Reddit" },
    { id: "x", label: "X" },
    { id: "instagram", label: "Instagram" },
  ];

  const sentimentFilterButtons: { id: FilterSentiment; label: string; color: string }[] = [
    { id: "all", label: "All", color: "" },
    { id: "positive", label: "Positive", color: "bg-emerald-500" },
    { id: "negative", label: "Negative", color: "bg-red-500" },
    { id: "neutral", label: "Neutral", color: "bg-amber-500" },
    { id: "mixed", label: "Mixed", color: "bg-violet-500" },
  ];

  const dateFilterButtons: { id: typeof dateFilter; label: string }[] = [
    { id: "all", label: "All time" },
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "90d", label: "Last 90 days" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Analyses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats ? `${stats.total} analyses run • ${filtered.length} shown` : "Loading your analyses…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analyses.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={exportingAll || analyses.length === 0}
              className="gap-1.5"
            >
              {exportingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exportingAll ? "Exporting…" : "Export All"}
            </Button>
          )}
          <Button
            onClick={() => setDashboardTab("new-analysis")}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Analysis
          </Button>
        </div>
      </div>

      {/* Filter + Search */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Platform:
              </span>
              {filterButtons.map((b) => {
                const active = filter === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setFilter(b.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
            <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Sentiment:
            </span>
            {sentimentFilterButtons.map((b) => {
              const active = sentimentFilter === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSentimentFilter(b.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {b.color && (
                    <span
                      className={`h-2 w-2 rounded-full ${b.color}`}
                      aria-hidden
                    />
                  )}
                  {b.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
            <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Date:
            </span>
            {dateFilterButtons.map((b) => {
              const active = dateFilter === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setDateFilter(b.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
            {(dateFilter !== "all" || filter !== "all" || sentimentFilter !== "all" || search.trim()) && (
              <button
                onClick={() => {
                  setDateFilter("all");
                  setFilter("all");
                  setSentimentFilter("all");
                  setSearch("");
                }}
                className="ml-auto rounded-full px-3 py-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-4 h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          onCreate={() => setDashboardTab("new-analysis")}
          hasAny={analyses.length > 0}
          onClearFilters={() => {
            setDateFilter("all");
            setFilter("all");
            setSentimentFilter("all");
            setSearch("");
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a, i) => (
            <AnalysisCard
              key={a.id}
              analysis={a}
              index={i}
              onView={() => setSelectedAnalysisId(a.id)}
              onDownload={() => handleDownload(a)}
              onExportCSV={() => handleExportCSV(a)}
              onShare={() => handleShare(a)}
              onDelete={() => setDeleteId(a.id)}
              downloading={downloadingId === a.id}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The analysis, its results, and all
              associated items will be permanently removed from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AnalysisCard({
  analysis,
  index,
  onView,
  onDownload,
  onExportCSV,
  onShare,
  onDelete,
  downloading,
}: {
  analysis: AnalysisListItem;
  index: number;
  onView: () => void;
  onDownload: () => void;
  onExportCSV: () => void;
  onShare: () => void;
  onDelete: () => void;
  downloading: boolean;
}) {
  const p = getPlatform(analysis.platform);
  const Icon = p.icon;
  const sentiment = getSentiment(analysis.overallSentiment);
  const scoreColor = sentiment.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card className="group flex h-full flex-col overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] hover:border-primary/40 hover:shadow-lg hover:shadow-emerald-500/10">
        <div className={`h-2 bg-gradient-to-r ${p.gradient}`} />
        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${p.gradient} text-white shadow-sm`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <PlatformBadge platform={analysis.platform} />
            </div>
            {analysis.isPremium && <PremiumBadge />}
          </div>

          <button onClick={onView} className="text-left">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
              {analysis.title}
            </h3>
          </button>

          <div className="flex items-center gap-2">
            <SentimentBadge sentiment={analysis.overallSentiment} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: scoreColor }}
              />
              <span className="tabular-nums">
                {analysis.sentimentScore > 0 ? "+" : ""}
                {analysis.sentimentScore.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {analysis.itemCount} items
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="flex gap-2 border-t border-border/60 pt-3">
            <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              onClick={onShare}
              aria-label="Share analysis"
              title="Copy public share link"
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              onClick={onDownload}
              disabled={downloading}
              aria-label="Download PDF"
              title="Download PDF"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2"
              onClick={onExportCSV}
              aria-label="Export CSV"
              title="Export CSV"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({
  onCreate,
  hasAny,
  onClearFilters,
}: {
  onCreate: () => void;
  hasAny: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-4">
          <div
            className="absolute inset-0 -z-10 rounded-full bg-emerald-500/10 blur-xl"
            aria-hidden
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 ring-1 ring-emerald-500/20">
            {hasAny ? (
              <Inbox className="h-8 w-8 text-primary" />
            ) : (
              <Sparkles className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>
        <h3 className="text-base font-semibold">
          {hasAny ? "No analyses match your filters" : "No analyses yet"}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {hasAny
            ? "Try a different platform or sentiment, adjust the date range, or clear your search."
            : "Run your first sentiment analysis to see results, charts, and downloadable reports here."}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {!hasAny && (
            <Button
              onClick={onCreate}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Create Your First Analysis
            </Button>
          )}
          {hasAny && onClearFilters && (
            <Button onClick={onClearFilters} variant="outline">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Clear all filters
            </Button>
          )}
          {hasAny && (
            <Button
              onClick={onCreate}
              variant="ghost"
              className="text-muted-foreground"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New analysis
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
