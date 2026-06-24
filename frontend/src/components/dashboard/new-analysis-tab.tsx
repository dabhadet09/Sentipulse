"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  SentimentBadge,
  EmotionBadge,
  PlatformBadge,
} from "@/components/shared/badges";
import {
  SentimentPieChart,
  EmotionBarChart,
  SentimentGauge,
} from "@/components/shared/charts";
import { LivestreamStudio } from "./livestream-tab";
import {
  PLATFORMS,
  CONTENT_TYPES,
  getPlatform,
  getEmotion,
  getSentiment,
} from "@/lib/constants";
import { generateAnalysisReport, exportAnalysisCSV } from "@/lib/report";
import type { AnalysisResult } from "@/lib/analysis";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Lock,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Layers,
  Loader2,
  Download,
  CheckCircle2,
  ListChecks,
  Wand2,
  Brain,
  AlertCircle,
  Quote,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

type PlatformId = keyof typeof PLATFORMS;

interface ManualItem {
  text: string;
  author?: string;
}

interface SampleDataset {
  id: string;
  platform: string;
  contentType: string;
  title: string;
  description: string;
  items: { text: string; author: string }[];
}

const PLATFORM_CONTENT: Record<PlatformId, string[]> = {
  youtube: ["video", "livestream"],
  reddit: ["discussion"],
  x: ["post"],
  instagram: ["reel", "post"],
};

export function NewAnalysisTab() {
  const { data: session } = useSession();
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);
  const setSelectedAnalysisId = useAppStore((s) => s.setSelectedAnalysisId);

  const isPremium =
    session?.user?.subscriptionTier === "PREMIUM" ||
    session?.user?.role === "ADMIN";

  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<PlatformId>("youtube");
  const [contentType, setContentType] = useState<string>("video");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  // Content state
  const [inputMode, setInputMode] = useState<"paste" | "sample" | "csv" | "url">("paste");
  const [pastedText, setPastedText] = useState("");
  const [manualItems, setManualItems] = useState<ManualItem[]>([
    { text: "", author: "" },
  ]);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchText, setBatchText] = useState("");

  // CSV import state
  const [csvItems, setCsvItems] = useState<ManualItem[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>("");

  // Samples
  const [samples, setSamples] = useState<SampleDataset[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(true);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [liveStreaming, setLiveStreaming] = useState(false);
  const [results, setResults] = useState<{
    analysisId: string;
    results: AnalysisResult;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/samples");
        const data = await res.json();
        if (!cancelled) setSamples(data.samples || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setSamplesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When platform changes, reset contentType to the first valid one
  useEffect(() => {
    const validTypes = PLATFORM_CONTENT[platform];
    if (!validTypes.includes(contentType)) {
      setContentType(validTypes[0]);
    }
  }, [platform, contentType]);

  const platformSamples = samples.filter((s) => s.platform === platform);

  // Parse pasted text into items
  const parsedItems: ManualItem[] = (() => {
    const text = pastedText.trim();
    if (!text) return [];
    // Try JSON first
    if (text.startsWith("[") || text.startsWith("{")) {
      try {
        const parsed = JSON.parse(text);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return arr
          .map((it: { text?: string; author?: string; content?: string; body?: string; message?: string }) => ({
            text: it.text || it.content || it.body || it.message || "",
            author: it.author || it.user || it.username || undefined,
          }))
          .filter((it: ManualItem) => it.text.trim().length > 0);
      } catch {
        // fall through to line-based
      }
    }
    return text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Support "author: text" or "@author text"
        const m = line.match(/^(?:@?[\w._-]+):\s*(.+)$/);
        if (m) {
          return {
            text: m[1].trim(),
            author: line.split(":")[0].trim().replace(/^@/, ""),
          };
        }
        return { text: line, author: undefined };
      });
  })();

  const manualValidItems = manualItems.filter((it) => it.text.trim().length > 0);

  // Batch mode parsed items
  const batchParsedItems: ManualItem[] = batchText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ text: line, author: undefined }));

  const liveItemCount = inputMode === "sample"
    ? samples.find((s) => s.id === sampleId)?.items.length || 0
    : inputMode === "csv"
      ? csvItems.length
      : batchMode
        ? batchParsedItems.length
        : parsedItems.length + manualValidItems.length;

  const isLivestream = contentType === "livestream";
  const livestreamLocked = isLivestream && !isPremium;

  const canAnalyze =
    title.trim().length > 0 &&
    !livestreamLocked &&
    (isLivestream ||
      (inputMode === "url"
        ? !!sourceUrl.trim()
        : inputMode === "sample"
          ? !!sampleId
          : inputMode === "csv"
            ? csvItems.length >= 2
            : liveItemCount >= 2));

  async function handleAnalyze() {
    if (!canAnalyze) {
      toast.error("Please complete all steps before analyzing.");
      return;
    }

    if (isLivestream) {
      setLiveStreaming(true);
      return;
    }

    let payloadItems: ManualItem[] | undefined = undefined;
    if (inputMode === "sample" || inputMode === "url") {
      // items populated on server
    } else if (inputMode === "csv") {
      payloadItems = csvItems;
      if (csvItems.length < 2) {
        toast.error("Please import a CSV with at least 2 text items.");
        return;
      }
    } else if (batchMode) {
      payloadItems = batchParsedItems;
      if (batchParsedItems.length < 2) {
        toast.error("Please provide at least 2 text items to analyze.");
        return;
      }
    } else {
      // Merge parsed + manual
      const merged = [...parsedItems, ...manualValidItems];
      payloadItems = merged;
      if (merged.length < 2) {
        toast.error("Please provide at least 2 text items to analyze.");
        return;
      }
    }

    setAnalyzing(true);
    setResults(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentType,
          title: title.trim(),
          sourceUrl: sourceUrl.trim() || undefined,
          inputMode,
          items: inputMode === "sample" || inputMode === "url" ? undefined : payloadItems,
          sampleId: inputMode === "sample" ? sampleId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }
      setResults({ analysisId: data.analysisId, results: data.results });
      toast.success("Analysis complete! Generating insights…");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReset() {
    setResults(null);
    setLiveStreaming(false);
    setStep(1);
    setTitle("");
    setSourceUrl("");
    setPastedText("");
    setManualItems([{ text: "", author: "" }]);
    setSampleId(null);
    setInputMode("paste");
    setPlatform("youtube");
    setContentType("video");
    setBatchMode(false);
    setBatchText("");
    setCsvItems([]);
    setCsvError(null);
    setCsvFileName("");
  }

  function handleDownloadReport() {
    if (!results) return;
    const sample = samples.find((s) => s.id === sampleId);
    const items = inputMode === "sample"
      ? (sample?.items || [])
      : inputMode === "url"
        ? results.results.items
        : batchMode
          ? batchParsedItems
          : [...parsedItems, ...manualValidItems];
    generateAnalysisReport({
      id: results.analysisId,
      platform,
      contentType,
      title: title.trim(),
      sourceUrl: sourceUrl.trim() || null,
      overallSentiment: results.results.overallSentiment,
      sentimentScore: results.results.sentimentScore,
      itemCount: results.results.itemCount,
      isPremium: isLivestream,
      createdAt: new Date().toISOString(),
      results: {
        ...results.results,
        items: results.results.items.length
          ? results.results.items
          : items.map((it, i) => ({
              text: it.text,
              author: it.author,
              sentiment: results.results.items[i]?.sentiment || "neutral",
              emotion: results.results.items[i]?.emotion || "neutral",
              score: results.results.items[i]?.score || 0,
            })),
      },
    });
    toast.success("PDF report downloaded");
  }

  function handleExportCSV() {
    if (!results) return;
    try {
      exportAnalysisCSV({
        id: results.analysisId,
        platform,
        contentType,
        title: title.trim(),
        createdAt: new Date().toISOString(),
        results: {
          ...results.results,
          items: results.results.items.length
            ? results.results.items
            : items.map((it, i) => ({
                text: it.text,
                author: it.author,
                sentiment: results.results.items[i]?.sentiment || "neutral",
                emotion: results.results.items[i]?.emotion || "neutral",
                score: results.results.items[i]?.score || 0,
              })),
        },
      });
      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    }
  }

  // ============ STEPS ============
  const steps = [
    { id: 1, label: "Platform" },
    { id: 2, label: "Content Type" },
    { id: 3, label: "Details" },
    ...(isLivestream ? [] : [{ id: 4, label: "Content" }]),
  ];

  // CSV parsing helper
  function handleCsvFile(file: File) {
    setCsvError(null);
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setCsvError("Could not read file.");
        return;
      }
      // Detect delimiter: comma or semicolon
      const firstLine = text.split("\n")[0] || "";
      const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setCsvError("CSV file must have a header row and at least one data row.");
        setCsvItems([]);
        return;
      }

      // Parse header
      const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
      const textIdx = headers.indexOf("text");
      if (textIdx === -1) {
        setCsvError('No "text" column found. Your CSV must have a column named "text".');
        setCsvItems([]);
        return;
      }
      const authorIdx = headers.indexOf("author");

      // Parse rows
      const items: ManualItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const textVal = cols[textIdx];
        if (textVal && textVal.trim().length > 0) {
          items.push({
            text: textVal.trim(),
            author: authorIdx >= 0 && cols[authorIdx] ? cols[authorIdx].trim() : undefined,
          });
        }
      }

      if (items.length === 0) {
        setCsvError("No valid items found in the CSV after parsing.");
        setCsvItems([]);
        return;
      }

      setCsvItems(items);
      toast.success(`Parsed ${items.length} items from CSV`);
    };
    reader.onerror = () => {
      setCsvError("Failed to read the file.");
      setCsvItems([]);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your sentiment & emotion analysis in {isLivestream ? "3" : "4"} quick steps.
          </p>
        </div>
        {results && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <Plus className="mr-1.5 h-4 w-4" />
            Start a New Analysis
          </Button>
        )}
      </div>

      {/* Stepper */}
      {!results && !analyzing && !liveStreaming && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => {
                const done = step > s.id;
                const active = step === s.id;
                return (
                  <div key={s.id} className="flex flex-1 items-center last:flex-none">
                    <div className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-300 ${
                      active ? "bg-gradient-to-r from-emerald-500/5 to-transparent" : ""
                    }`}>
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                          done
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30"
                            : active
                              ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                      </div>
                      <div className="hidden sm:block">
                        <p
                          className={`text-xs font-medium uppercase tracking-wide ${
                            active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          Step {s.id}
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {s.label}
                        </p>
                      </div>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`mx-3 h-0.5 flex-1 rounded-full transition-all duration-300 ${
                          done ? "bg-emerald-500" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {liveStreaming ? (
          <motion.div
            key="livestream"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <LivestreamStudio
              initialTitle={title}
              initialPlatform={platform}
              autoStart={true}
              hideConfig={true}
              onReset={handleReset}
            />
          </motion.div>
        ) : analyzing ? (
          <AnalyzingState key="analyzing" platform={platform} />
        ) : results ? (
          <ResultsPanel
            key="results"
            analysisId={results.analysisId}
            results={results.results}
            title={title}
            platform={platform}
            contentType={contentType}
            isLivestream={isLivestream}
            onViewDetail={() => {
              setSelectedAnalysisId(results.analysisId);
            }}
            onDownload={handleDownloadReport}
            onExportCSV={handleExportCSV}
            onNewAnalysis={handleReset}
          />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* STEP 1 — Platform */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      1
                    </span>
                    Choose a platform
                  </CardTitle>
                  <CardDescription>
                    Select the social media platform whose content you want to analyze.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {(Object.keys(PLATFORMS) as PlatformId[]).map((id) => {
                      const p = PLATFORMS[id];
                      const Icon = p.icon;
                      const active = platform === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setPlatform(id)}
                          className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 ${
                            active
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10 -translate-y-0.5"
                              : "border-border hover:border-primary/40 hover:bg-accent/30 hover:-translate-y-0.5"
                          }`}
                        >
                          <div
                            className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${p.gradient} opacity-10 transition-transform group-hover:scale-125`}
                          />
                          <div
                            className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.gradient} text-white shadow-lg`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <p className="relative mt-3 font-semibold">{p.label}</p>
                          <p className="relative mt-0.5 text-xs text-muted-foreground">
                            {PLATFORM_CONTENT[id].length} content type
                            {PLATFORM_CONTENT[id].length > 1 ? "s" : ""}
                          </p>
                          {active && (
                            <div className="absolute right-3 top-3">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2 — Content Type */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      2
                    </span>
                    Pick a content type
                  </CardTitle>
                  <CardDescription>
                    What kind of {PLATFORMS[platform].label} content are you analyzing?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {PLATFORM_CONTENT[platform].map((ct) => {
                      const meta = CONTENT_TYPES[ct];
                      const active = contentType === ct;
                      const locked = meta.premium && !isPremium;
                      return (
                        <div
                          key={ct}
                          onClick={() => !locked && setContentType(ct)}
                          className={`group relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all ${
                            locked
                              ? "cursor-not-allowed border-border bg-muted/40 opacity-70"
                              : active
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/40 hover:bg-accent/30 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{meta.label}</p>
                                {meta.premium && (
                                  <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0 text-[9px] text-white">
                                    PRO
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {meta.description}
                              </p>
                            </div>
                            {locked ? (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            ) : active ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : null}
                          </div>
                          {locked && (
                            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                              <div className="flex items-start gap-2">
                                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <div className="text-xs">
                                  <p className="font-medium text-amber-700 dark:text-amber-400">
                                    Premium feature
                                  </p>
                                  <p className="mt-0.5 text-muted-foreground">
                                    Live stream analysis is a premium feature.
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 h-7 border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDashboardTab("premium");
                                    }}
                                  >
                                    <Sparkles className="mr-1 h-3 w-3" />
                                    Apply for Premium
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3 — Details */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      3
                    </span>
                    Analysis details
                  </CardTitle>
                  <CardDescription>
                    Give your analysis a title so you can find it later.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. iPhone 16 launch — public reaction"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source URL (optional)</Label>
                    <Input
                      id="source"
                      placeholder="https://youtube.com/watch?v=..."
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Link back to the original post or video.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Summary
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <PlatformBadge platform={platform} />
                      <Badge variant="outline" className="capitalize">
                        {CONTENT_TYPES[contentType].label}
                      </Badge>
                      {isLivestream && (
                        <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4 — Content */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      4
                    </span>
                    Provide content to analyze
                  </CardTitle>
                  <CardDescription>
                    Paste text/comments, import a CSV, or pick a ready-made sample dataset.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={inputMode}
                    onValueChange={(v) => setInputMode(v as "paste" | "sample" | "csv" | "url")}
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="url">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Auto-Fetch
                      </TabsTrigger>
                      <TabsTrigger value="paste">
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Paste
                      </TabsTrigger>
                      <TabsTrigger value="csv">
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        CSV
                      </TabsTrigger>
                      <TabsTrigger value="sample">
                        <Layers className="mr-1.5 h-3.5 w-3.5" />
                        Sample
                      </TabsTrigger>
                    </TabsList>

                    {/* URL tab */}
                    <TabsContent value="url" className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <Wand2 className="h-5 w-5" />
                          <span>AI Auto-Fetch Mode</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Enter a valid URL to automatically scrape and analyze comments from {PLATFORMS[platform].label}.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="url-fetch">Source URL</Label>
                          <Input
                            id="url-fetch"
                            placeholder={`https://${platform === 'youtube' ? 'youtube.com/watch?v=...' : platform + '.com/...'}`}
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Paste tab */}
                    <TabsContent value="paste" className="space-y-4">
                      {/* Batch mode toggle */}
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex items-center gap-2">
                          <ListChecks className="h-4 w-4 text-muted-foreground" />
                          <Label htmlFor="batch-mode" className="cursor-pointer text-sm font-medium">
                            Batch mode
                          </Label>
                        </div>
                        <Switch
                          id="batch-mode"
                          checked={batchMode}
                          onCheckedChange={setBatchMode}
                        />
                      </div>

                      {batchMode ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="batch-text">Paste multiple items, one per line</Label>
                            <span className="text-xs text-muted-foreground">
                              {batchParsedItems.length} items detected
                            </span>
                          </div>
                          <Textarea
                            id="batch-text"
                            placeholder="Paste multiple items, one per line…"
                            value={batchText}
                            onChange={(e) => setBatchText(e.target.value)}
                            className="min-h-[200px] font-mono text-xs"
                          />
                          <p className="text-xs text-muted-foreground">
                            Each line becomes a separate item with an &quot;Anonymous&quot; author.
                          </p>
                        </div>
                      ) : (
                      <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pasted">Paste comments / posts</Label>
                          <span className="text-xs text-muted-foreground">
                            {parsedItems.length} parsed items
                          </span>
                        </div>
                        <Textarea
                          id="pasted"
                          placeholder={`Paste one item per line. Supported formats:\n\nThis video is amazing!\nBest tutorial I've seen.\n@user1: Loved the editing.\n\nOr paste JSON: [{"text": "...", "author": "..."}]`}
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          className="min-h-[160px] font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Tip: lines like <code className="rounded bg-muted px-1">author: text</code> or{" "}
                          <code className="rounded bg-muted px-1">@author text</code> are parsed automatically.
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Or add items manually
                          </Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setManualItems([...manualItems, { text: "", author: "" }])
                            }
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add item
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {manualItems.map((it, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 rounded-lg border border-border bg-card p-2"
                            >
                              <Input
                                placeholder="@author (optional)"
                                value={it.author || ""}
                                onChange={(e) => {
                                  const next = [...manualItems];
                                  next[i] = { ...next[i], author: e.target.value };
                                  setManualItems(next);
                                }}
                                className="h-9 w-32 sm:w-40"
                              />
                              <Textarea
                                placeholder="Type or paste a comment / post text…"
                                value={it.text}
                                onChange={(e) => {
                                  const next = [...manualItems];
                                  next[i] = { ...next[i], text: e.target.value };
                                  setManualItems(next);
                                }}
                                className="min-h-[40px] flex-1 resize-none text-sm"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setManualItems(manualItems.filter((_, idx) => idx !== i));
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {manualItems.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground">
                              No manual items. Click “Add item” to add some.
                            </p>
                          )}
                        </div>
                      </div>
                      </>
                      )}
                    </TabsContent>

                    {/* Sample tab */}
                    <TabsContent value="sample" className="space-y-4">
                      {samplesLoading ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                          ))}
                        </div>
                      ) : platformSamples.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center">
                          <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm font-medium">No samples for {PLATFORMS[platform].label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Try a different platform or paste your own content.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {platformSamples.map((s) => {
                            const active = sampleId === s.id;
                            return (
                              <button
                                key={s.id}
                                onClick={() => setSampleId(s.id)}
                                className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
                                  active
                                    ? "border-primary bg-primary/5 shadow-md"
                                    : "border-border hover:border-primary/40 hover:bg-accent/30"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">
                                      {s.title}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {s.description}
                                    </p>
                                  </div>
                                  {active && (
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                                  )}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  <Badge variant="outline" className="capitalize">
                                    {CONTENT_TYPES[s.contentType]?.label || s.contentType}
                                  </Badge>
                                  <span className="text-[11px] text-muted-foreground">
                                    {s.items.length} items
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* CSV Import tab */}
                    <TabsContent value="csv" className="space-y-4">
                      <div className="space-y-3">
                        <div
                          className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-all hover:border-primary/40 hover:bg-accent/20 cursor-pointer"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".csv";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleCsvFile(file);
                            };
                            input.click();
                          }}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                            <Upload className="h-6 w-6" />
                          </div>
                          <p className="mt-3 text-sm font-semibold">
                            {csvFileName ? csvFileName : "Click to upload a CSV file"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Supports comma and semicolon delimiters. Must have a &quot;text&quot; column.
                          </p>
                        </div>

                        {csvError && (
                          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            <p className="text-sm text-red-600 dark:text-red-400">{csvError}</p>
                          </div>
                        )}

                        {csvItems.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                Preview ({csvItems.length} item{csvItems.length !== 1 ? "s" : ""})
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setCsvItems([]);
                                  setCsvFileName("");
                                  setCsvError(null);
                                }}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Clear
                              </Button>
                            </div>
                            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                              <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold text-muted-foreground">#</th>
                                    <th className="px-3 py-2 font-semibold text-muted-foreground">Author</th>
                                    <th className="px-3 py-2 font-semibold text-muted-foreground">Text</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {csvItems.slice(0, 20).map((item, i) => (
                                    <tr key={i} className="border-t border-border/50">
                                      <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                                      <td className="max-w-[120px] truncate px-3 py-1.5">
                                        {item.author || <span className="italic text-muted-foreground">—</span>}
                                      </td>
                                      <td className="max-w-[300px] truncate px-3 py-1.5">{item.text}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {csvItems.length > 20 && (
                                <div className="border-t border-border/50 px-3 py-2 text-center text-xs text-muted-foreground">
                                  +{csvItems.length - 20} more item{csvItems.length - 20 !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Live count */}
                  <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ListChecks className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Items ready to analyze
                        </p>
                        <p className="text-xl font-bold tabular-nums">{liveItemCount}</p>
                      </div>
                    </div>
                    {liveItemCount > 0 && liveItemCount < 2 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        At least 2 items required
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      {!results && !analyzing && !liveStreaming && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          {step < (isLivestream ? 3 : 4) ? (
            <Button
              onClick={() => setStep(Math.min(isLivestream ? 3 : 4, step + 1))}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
              disabled={step === 2 && livestreamLocked}
            >
              Continue
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
            >
              <Wand2 className="mr-1.5 h-4 w-4" />
              Run Analysis
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Sub-components ============

function AnalyzingState({ platform }: { platform: string }) {
  const p = getPlatform(platform);
  const Icon = p.icon;
  const [phase, setPhase] = useState(0);
  const phases = [
    "Tokenizing input text…",
    "Running transformer forward pass…",
    "Classifying sentiment per item…",
    "Detecting emotions (joy, anger, fear…)…",
    "Extracting keywords & themes…",
    "Computing distribution statistics…",
    "Generating human-readable insights…",
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((prev) => Math.min(prev + 1, phases.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative grid-bg px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 3, -3, 0],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/40"
        >
          <Brain className="h-10 w-10" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 rounded-2xl border-2 border-dashed border-emerald-500/30"
          />
        </motion.div>

        <h3 className="relative mt-6 text-xl font-bold">
          Analyzing your content…
        </h3>
        <p className="relative mt-2 text-sm text-muted-foreground">
          Our transformer model is processing each item from{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Icon className="h-3.5 w-3.5" />
            {p.label}
          </span>
          . This usually takes 10–20 seconds.
        </p>

        <div className="relative mx-auto mt-8 max-w-md space-y-2.5">
          {phases.map((label, i) => {
            const done = i < phase;
            const active = i === phase;
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: i <= phase ? 1 : 0.4, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-4 py-2.5 text-left"
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                )}
                <span className={`text-sm ${done ? "text-muted-foreground line-through" : active ? "font-medium" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function ResultsPanel({
  analysisId,
  results,
  title,
  platform,
  contentType,
  isLivestream,
  onViewDetail,
  onDownload,
  onExportCSV,
  onNewAnalysis,
}: {
  analysisId: string;
  results: AnalysisResult;
  title: string;
  platform: string;
  contentType: string;
  isLivestream: boolean;
  onViewDetail: () => void;
  onDownload: () => void;
  onExportCSV: () => void;
  onNewAnalysis: () => void;
}) {
  const dominantEmotion = getEmotion(results.dominantEmotion);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Success header */}
      <Card className="overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Analysis Complete
              </p>
              <h2 className="text-lg font-bold">{title}</h2>
              <p className="text-xs text-muted-foreground">
                {results.itemCount} items analyzed • ID: {analysisId.slice(0, 8)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onDownload} title="Download PDF report">
              <Download className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">PDF </span>Report
            </Button>
            <Button variant="outline" size="sm" onClick={onExportCSV} title="Export analysis items as CSV">
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Export </span>CSV
            </Button>
            <Button size="sm" onClick={onViewDetail} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90">
              View Full Detail
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Overall Sentiment"
          value={results.overallSentiment}
          badge={<SentimentBadge sentiment={results.overallSentiment} />}
        />
        <StatTile
          label="Sentiment Score"
          value={`${results.sentimentScore > 0 ? "+" : ""}${results.sentimentScore.toFixed(2)}`}
          sub="range -1 to +1"
        />
        <StatTile
          label="Dominant Emotion"
          value={dominantEmotion.label}
          sub={`${dominantEmotion.emoji} detected`}
        />
        <StatTile
          label="Items Analyzed"
          value={String(results.itemCount)}
          sub={isLivestream ? "livestream segment" : "from input"}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentiment Distribution</CardTitle>
            <CardDescription>Percentage split across items</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentPieChart distribution={results.sentimentDistribution} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Emotion Breakdown</CardTitle>
            <CardDescription>Count of items per detected emotion</CardDescription>
          </CardHeader>
          <CardContent>
            <EmotionBarChart distribution={results.emotionDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Gauge + Summary */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Sentiment Gauge</CardTitle>
            <CardDescription>Overall positivity score</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentGauge score={results.sentimentScore} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </CardTitle>
            <CardDescription>Generated by the transformer model</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
              {results.summary}
            </p>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Key Insights
              </p>
              <ul className="mt-2 space-y-2">
                {results.insights.map((insight, i) => (
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

      {/* Top keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" />
            Top Keywords
          </CardTitle>
          <CardDescription>Most frequent terms, colored by associated sentiment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {results.keywords.slice(0, 20).map((k) => {
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
        </CardContent>
      </Card>

      {/* Sample item results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Quote className="h-4 w-4 text-primary" />
            Sample Analyzed Items
          </CardTitle>
          <CardDescription>First 6 items with per-item sentiment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 space-y-2 overflow-y-auto scrollbar-thin pr-1">
            {results.items.slice(0, 6).map((it, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card/60 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{it.text}</p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <SentimentBadge sentiment={it.sentiment} />
                    <EmotionBadge emotion={it.emotion} />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {it.author && <span>@{it.author}</span>}
                  <span>score: {it.score.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={onNewAnalysis}>
          <Plus className="mr-1.5 h-4 w-4" />
          Run Another
        </Button>
        <Button variant="outline" onClick={onExportCSV} title="Export analysis items as CSV">
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
        <Button onClick={onDownload}>
          <Download className="mr-1.5 h-4 w-4" />
          Download PDF Report
        </Button>
      </div>
    </motion.div>
  );
}

function StatTile({
  label,
  value,
  sub,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-xl font-bold capitalize">{value}</p>
          {badge}
        </div>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
