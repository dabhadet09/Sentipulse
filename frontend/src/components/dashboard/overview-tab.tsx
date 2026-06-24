"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip as ShadcnTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { SentimentBadge, PlatformBadge, PremiumBadge } from "@/components/shared/badges";
import { PlatformBarChart } from "@/components/shared/charts";
import {
  Sparkles,
  Crown,
  TrendingUp,
  TrendingDown,
  Meh,
  BarChart3,
  ArrowRight,
  Radio,
  History,
  Plus,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  Loader2,
  Youtube,
  MessageCircle,
  Instagram,
  Twitter,
  LineChart as LineChartIcon,
  Grid3x3,
  PieChart,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getSentiment, PLATFORMS } from "@/lib/constants";
import { SAMPLE_DATASETS } from "@/lib/sample-data";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Area,
} from "recharts";

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

const ONBOARDING_STORAGE_KEY = "sentimentsense_onboarding_dismissed";

const ONBOARDING_STEPS: { n: number; title: string; desc: string }[] = [
  {
    n: 1,
    title: "Pick a platform",
    desc: "Choose YouTube, Reddit, X, or Instagram to analyze.",
  },
  {
    n: 2,
    title: "Paste content or use samples",
    desc: "Drop in comments/posts, or start with our sample datasets.",
  },
  {
    n: 3,
    title: "Explore insights & download",
    desc: "View charts, AI insights, and export your PDF/CSV report.",
  },
];

function OnboardingWelcomeCard() {
  // Initialize to false to avoid SSR hydration mismatch; flip on mount via
  // effect. The eslint rule react-hooks/set-state-in-effect normally
  // discourages calling setState inside an effect, but here it is the
  // intended pattern: localStorage is browser-only, so we MUST defer the
  // read until after hydration to avoid SSR/client markup divergence.
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is browser-only; must defer to avoid SSR/client divergence */
  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window === "undefined") return;
      const dismissed =
        window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
      setShow(!dismissed);
    } catch {
      // localStorage may be unavailable (private mode); default to showing.
      setShow(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dismiss = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      }
    } catch {
      // ignore storage errors
    }
    setShow(false);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-cyan-500/5">
            {/* Decorative glows */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
            {/* "New" corner badge */}
            <div className="absolute right-4 top-4 z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
                <Sparkles className="h-2.5 w-2.5" />
                New
              </span>
            </div>

            <CardContent className="relative p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 pr-12 sm:pr-16">
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    Welcome to SentimentSense!
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Here&apos;s how to get started in 3 simple steps:
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {ONBOARDING_STEPS.map((s) => (
                  <div
                    key={s.n}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3 backdrop-blur-sm transition-colors hover:border-emerald-500/30"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-sm">
                      {s.n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  Skip for now
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismiss}
                  className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Got it, dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OverviewTab() {
  const { data: session } = useSession();
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);
  const setSelectedAnalysisId = useAppStore((s) => s.setSelectedAnalysisId);

  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestApplication, setLatestApplication] = useState<{
    status: string;
    platform: string;
    adminNote: string | null;
    reviewedAt: string | null;
  } | null>(null);

  const isPremium =
    session?.user?.subscriptionTier === "PREMIUM" || session?.user?.role === "ADMIN";
  const userName = session?.user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [analysesRes, appsRes] = await Promise.all([
          fetch("/api/analyses"),
          fetch("/api/premium/apply"),
        ]);
        if (!cancelled) {
          if (analysesRes.ok) {
            const data = await analysesRes.json();
            setAnalyses(data.analyses || []);
            setStats(data.stats || null);
          }
          if (appsRes.ok) {
            const appsData = await appsRes.json();
            const apps = appsData.applications || [];
            if (apps.length > 0) {
              // Get the most recent application
              setLatestApplication(apps[0]);
            }
          }
        }
      } catch {
        // silent — UI shows skeletons / empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Show notification banner if latest application was recently reviewed (approved/rejected)
  // and user hasn't acknowledged it yet this session
  const showApprovedBanner =
    !isPremium &&
    latestApplication?.status === "APPROVED";
  const showRejectedBanner = latestApplication?.status === "REJECTED";
  const showPendingBanner =
    !isPremium &&
    latestApplication?.status === "PENDING";

  const platformData = stats
    ? ([
        { platform: "youtube", count: stats.byPlatform.youtube },
        { platform: "reddit", count: stats.byPlatform.reddit },
        { platform: "x", count: stats.byPlatform.x },
        { platform: "instagram", count: stats.byPlatform.instagram },
      ].filter((d) => d.count > 0) as { platform: string; count: number }[])
    : [];

  const recent = analyses.slice(0, 5);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Good evening"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : hour < 21
            ? "Good evening"
            : "Good evening";
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Derived smart insights
  const insights: { label: string; value: string; icon: typeof BarChart3; tone: string; confidence: string }[] = [];
  if (stats && stats.total > 0) {
    // Most analyzed platform
    const platformEntries = Object.entries(stats.byPlatform).filter(
      ([, c]) => c > 0
    );
    if (platformEntries.length > 0) {
      platformEntries.sort((a, b) => b[1] - a[1]);
      const top = platformEntries[0];
      const topLabel =
        top[0] === "youtube"
          ? "YouTube"
          : top[0] === "reddit"
            ? "Reddit"
            : top[0] === "x"
              ? "X"
              : "Instagram";
      insights.push({
        label: "Top platform",
        value: `${topLabel} · ${top[1]}`,
        icon: BarChart3,
        tone: "from-emerald-500 to-teal-600",
        confidence: `${Math.round((top[1] / stats.total) * 100)}% of analyses`,
      });
    }
    // Dominant sentiment
    const sentimentEntries: [string, number][] = [
      ["positive", stats.positive],
      ["negative", stats.negative],
      ["neutral", stats.neutral],
      ["mixed", stats.mixed || 0],
    ].filter(([, c]) => c > 0) as [string, number][];
    if (sentimentEntries.length > 0) {
      sentimentEntries.sort((a, b) => b[1] - a[1]);
      const dom = sentimentEntries[0];
      insights.push({
        label: "Dominant sentiment",
        value: `${dom[0][0].toUpperCase() + dom[0].slice(1)} · ${Math.round(
          (dom[1] / stats.total) * 100
        )}%`,
        icon: dom[0] === "positive" ? TrendingUp : dom[0] === "negative" ? TrendingDown : Meh,
        tone:
          dom[0] === "positive"
            ? "from-emerald-400 to-green-500"
            : dom[0] === "negative"
              ? "from-red-400 to-rose-500"
              : dom[0] === "mixed"
                ? "from-violet-500 to-fuchsia-500"
                : "from-amber-400 to-yellow-500",
        confidence: `${Math.round((dom[1] / stats.total) * 100)}% of ${stats.total} analyses`,
      });
    }
    // Average sentiment score
    if (analyses.length > 0) {
      const avg =
        analyses.reduce((acc, a) => acc + a.sentimentScore, 0) /
        analyses.length;
      insights.push({
        label: "Avg sentiment score",
        value: `${avg >= 0 ? "+" : ""}${avg.toFixed(2)} · ${
          avg > 0.15 ? "positive lean" : avg < -0.15 ? "negative lean" : "neutral"
        }`,
        icon: Zap,
        tone: "from-cyan-500 to-emerald-500",
        confidence: `Based on ${analyses.length} analyses`,
      });
    }
    // Last activity
    if (analyses.length > 0) {
      const last = analyses[0];
      const lastDate = new Date(last.createdAt);
      const diffMin = Math.floor((Date.now() - lastDate.getTime()) / 60000);
      const lastLabel =
        diffMin < 1
          ? "Just now"
          : diffMin < 60
            ? `${diffMin}m ago`
            : diffMin < 1440
              ? `${Math.floor(diffMin / 60)}h ago`
              : `${Math.floor(diffMin / 1440)}d ago`;
      insights.push({
        label: "Last analysis",
        value: lastLabel,
        icon: Clock,
        tone: "from-amber-500 to-orange-500",
        confidence: `Run on ${new Date(last.createdAt).toLocaleDateString()}`,
      });
    }
  }

  const statCards = stats
    ? [
        {
          label: "Total Analyses",
          value: stats.total,
          icon: BarChart3,
          color: "from-emerald-500 to-teal-600",
          sub: "all-time",
        },
        {
          label: "Positive",
          value: stats.positive,
          icon: TrendingUp,
          color: "from-emerald-400 to-green-500",
          sub: `${stats.total ? Math.round((stats.positive / stats.total) * 100) : 0}% of total`,
        },
        {
          label: "Negative",
          value: stats.negative,
          icon: TrendingDown,
          color: "from-red-400 to-rose-500",
          sub: `${stats.total ? Math.round((stats.negative / stats.total) * 100) : 0}% of total`,
        },
        {
          label: "Neutral",
          value: stats.neutral,
          icon: Meh,
          color: "from-amber-400 to-yellow-500",
          sub: `${stats.total ? Math.round((stats.neutral / stats.total) * 100) : 0}% of total`,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Onboarding welcome card — first visit only */}
      <OnboardingWelcomeCard />

      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-xl shadow-emerald-500/30 ring-1 ring-emerald-400/20 sm:p-8"
      >
        {/* Decorative glows */}
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-cyan-400/15 blur-3xl" />
        {/* Subtle dotted pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Bottom gradient fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-emerald-700/20 to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-50 ring-1 ring-inset ring-white/20">
                Dashboard
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-50/90 ring-1 ring-inset ring-white/15">
                {todayLabel}
              </span>
              {isPremium && <PremiumBadge />}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight drop-shadow-sm sm:text-3xl">
              {greeting}, {userName}!{" "}
              <span className="hidden sm:inline">✨</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-emerald-50/90">
              {isPremium
                ? "You have premium access. Analyze live streams and unlock advanced insights."
                : "Analyze sentiment and emotion across YouTube, Reddit, X, and Instagram with transformer-powered AI."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setDashboardTab("new-analysis")}
              className="bg-white text-emerald-700 shadow-lg shadow-emerald-900/20 hover:bg-emerald-50 hover:shadow-emerald-900/30"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              New Analysis
            </Button>
            {!isPremium && (
              <Button
                onClick={() => setDashboardTab("premium")}
                variant="outline"
                className="border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/60"
              >
                <Crown className="mr-1.5 h-4 w-4" />
                Go Premium
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Premium application status banners */}
      {!loading && showApprovedBanner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-emerald-500/50 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/10 shadow-sm shadow-emerald-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Premium access granted!
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Approved
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-emerald-800/70 dark:text-emerald-200/70">
                  Your application was approved. You now have access to live
                  stream analysis and all premium features.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setDashboardTab("livestream")}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
              >
                Try Live Stream
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!loading && showRejectedBanner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-red-500/50 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/10 shadow-sm shadow-red-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                  Premium application not approved
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                    Rejected
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-red-800/70 dark:text-red-200/70">
                  {latestApplication?.adminNote
                    ? `Admin note: ${latestApplication.adminNote}`
                    : "You can reapply with an updated use case description."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDashboardTab("premium")}
              >
                Reapply
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!loading && showPendingBanner && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 shadow-sm shadow-amber-500/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-200">
                  Premium application under review
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                    Pending
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-amber-800/70 dark:text-amber-100/80">
                  Your request for{" "}
                  <span className="font-semibold">
                    {latestApplication?.platform}
                  </span>{" "}
                  live stream analysis is pending admin approval.
                  You&apos;ll be notified here once reviewed.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-8 w-16" />
                  <Skeleton className="mt-2 h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="group relative overflow-hidden border-border/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-emerald-500/10">
                    {/* Top accent gradient bar */}
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.color} opacity-90`}
                    />
                    {/* Decorative corner glow */}
                    <div
                      className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${s.color} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20`}
                    />
                    {/* Gradient shine overlay — slides across on hover */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                    />
                    <CardContent className="relative p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                            {s.label}
                          </p>
                          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight leading-none text-foreground dark:text-foreground">
                            <AnimatedCounter
                              value={s.value}
                              duration={1000}
                              delay={i * 80}
                            />
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">{s.sub}</p>
                        </div>
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {/* Sentiment Distribution Ring */}
      {!loading && stats && stats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4 text-primary" />
                Sentiment Distribution
              </CardTitle>
              <CardDescription>Overall sentiment distribution across all your analyses</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const circumference = 2 * Math.PI * 80;
                const segments = [
                  { label: "Positive", value: stats.positive, color: "#10b981" },
                  { label: "Negative", value: stats.negative, color: "#ef4444" },
                  { label: "Neutral", value: stats.neutral, color: "#f59e0b" },
                  { label: "Mixed", value: stats.mixed || 0, color: "#8b5cf6" },
                ].filter((s) => s.value > 0);

                let offset = 0;
                const segData = segments.map((seg) => {
                  const length = (seg.value / stats.total) * circumference;
                  const data = { ...seg, length, offset };
                  offset += length;
                  return data;
                });

                return (
                  <div className="flex flex-col items-center sm:flex-row sm:items-start sm:gap-8">
                    <div className="relative">
                      <svg viewBox="0 0 200 200" className="h-48 w-48 -rotate-90">
                        {segData.map((seg) => (
                          <circle
                            key={seg.label}
                            cx="100" cy="100" r="80"
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="24"
                            strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                            strokeDashoffset={-seg.offset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl font-bold tabular-nums">
                            <AnimatedCounter value={stats.total} duration={1200} />
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 sm:mt-0 sm:flex-col sm:gap-3">
                      {segData.map((seg) => (
                        <div key={seg.label} className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: seg.color }} />
                          <span className="text-sm font-medium">{seg.label}</span>
                          <span className="text-sm text-muted-foreground">{seg.value} ({Math.round((seg.value / stats.total) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Sentiment Timeline — daily average score across analyses */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChartIcon className="h-4 w-4 text-primary" />
                    Sentiment Timeline
                  </CardTitle>
                  <CardDescription>
                    Track how sentiment evolves across your analyses over time
                  </CardDescription>
                </div>
                {analyses.length >= 2 && (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Calendar className="h-3 w-3 text-emerald-500" />
                    {analyses.length} analyses
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {analyses.length < 2 ? (
                <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <LineChartIcon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">
                    Analyze at least 2 datasets to see your sentiment timeline
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Once you have multiple analyses, this chart will plot your
                    daily average sentiment score over time.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setDashboardTab("new-analysis")}
                    className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    New Analysis
                  </Button>
                </div>
              ) : (
                <div className="h-[280px]">
                  <SentimentTimelineChart analyses={analyses} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Smart Insights — derived from user's analysis history */}
      {!loading && insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.05] via-teal-500/[0.04] to-cyan-500/[0.05] p-4 shadow-sm"
        >
          {/* Subtle decorative blur */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-semibold">Smart Insights</h3>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  Auto-generated
                </span>
              </div>
            </div>
            <Badge variant="outline" className="hidden gap-1 text-[10px] sm:flex">
              <Zap className="h-3 w-3 text-amber-500" />
              {insights.length} metrics
            </Badge>
          </div>
          <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((ins, i) => {
              const Icon = ins.icon;
              return (
                <ShadcnTooltip key={ins.label}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: 0.2 + i * 0.06 }}
                      className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-border/60 bg-card/80 p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 hover:scale-[1.02] cursor-default"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${ins.tone} text-white shadow-sm transition-transform group-hover:scale-110`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {ins.label}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold tabular-nums" title={ins.value}>
                          {ins.value}
                        </p>
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <span className="font-medium">Confidence:</span> {ins.confidence}
                  </TooltipContent>
                </ShadcnTooltip>
              );
            })}
          </div>
          </TooltipProvider>
          {analyses.length > 0 && (
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedAnalysisId(analyses[0].id);
                }}
                className="text-primary"
              >
                View Details
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Weekly Digest — last 7 days at a glance */}
      {!loading && <WeeklyDigestCard analyses={analyses} />}

      {/* Quick Sample Analysis widget */}
      <QuickSampleWidget isPremium={isPremium} />

      {/* Charts + Recent */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Platform breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Platform Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of your analyses by platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : platformData.length === 0 ? (
              <EmptyChart message="No analyses yet. Run your first analysis to see the breakdown." />
            ) : (
              <PlatformBarChart data={platformData} />
            )}
          </CardContent>
        </Card>

        {/* Recent analyses */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Recent Analyses
              </CardTitle>
              <CardDescription>Your 5 most recent runs</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDashboardTab("my-analyses")}
              className="text-primary"
            >
              View all
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">No analyses yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start your first sentiment analysis to see results here.
                </p>
                <Button
                  size="sm"
                  onClick={() => setDashboardTab("new-analysis")}
                  className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  New Analysis
                </Button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {recent.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => {
                        setSelectedAnalysisId(a.id);
                      }}
                      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-all duration-200 hover:border-emerald-500/30 hover:bg-accent/50 hover:shadow-md"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white"
                        style={{
                          background: `linear-gradient(135deg, ${sentimentColor(a.overallSentiment)} 0%, ${sentimentColor(a.overallSentiment)}cc 100%)`,
                        }}
                      >
                        <span className="text-xs font-bold tabular-nums">
                          {a.sentimentScore > 0 ? "+" : ""}
                          {a.sentimentScore.toFixed(1)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <PlatformBadge platform={a.platform} />
                          <SentimentBadge sentiment={a.overallSentiment} />
                          <span className="text-[11px] text-muted-foreground">
                            {a.itemCount} items • {formatDate(a.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Trend Over Time + Platform x Sentiment Heatmap */}
      {!loading && analyses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid gap-6 lg:grid-cols-5"
        >
          {/* Trend line chart */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChartIcon className="h-4 w-4 text-primary" />
                    Sentiment Trend Over Time
                  </CardTitle>
                  <CardDescription>
                    Score trajectory of your last {Math.min(analyses.length, 12)} analyses
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {analyses.length} pts
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <SentimentTrendChart analyses={analyses} />
            </CardContent>
          </Card>

          {/* Platform x Sentiment heatmap */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Grid3x3 className="h-4 w-4 text-primary" />
                Platform × Sentiment
              </CardTitle>
              <CardDescription>
                Where your positive vs. negative content lives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformSentimentHeatmap analyses={analyses} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick actions + Premium upsell */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          className="group cursor-pointer border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.98]"
          onClick={() => setDashboardTab("new-analysis")}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Start a New Analysis</p>
              <p className="text-xs text-muted-foreground">
                Paste content or pick a sample dataset
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </CardContent>
        </Card>

        <Card
          className="group cursor-pointer border-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.98]"
          onClick={() => setDashboardTab("my-analyses")}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <History className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Browse My Analyses</p>
              <p className="text-xs text-muted-foreground">
                View, download, or delete past runs
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </CardContent>
        </Card>

        {isPremium ? (
          <Card
            className="group cursor-pointer border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98]"
            onClick={() => setDashboardTab("livestream")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
                <Radio className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Live Stream Analysis</p>
                <p className="text-xs text-muted-foreground">
                  Real-time chat sentiment monitoring
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        ) : (
          <Card
            className="group relative cursor-pointer overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98]"
            onClick={() => setDashboardTab("premium")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                <Crown className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold">Upgrade to Premium</p>
                  <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0 text-[9px] text-white">
                    <Zap className="h-2.5 w-2.5" />PRO
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unlock live stream analysis & more
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Premium upsell banner for free users */}
      {!isPremium && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
            <CardContent className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                  <Radio className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    Live Stream Sentiment Analysis
                  </h3>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    Monitor chat sentiment in real time during live broadcasts.
                    Get per-segment emotion tracking and a running sentiment
                    trend line. A premium feature powered by the transformer
                    model.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setDashboardTab("premium")}
                className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
              >
                <Crown className="mr-1.5 h-4 w-4" />
                Apply for Premium
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center text-center">
      <BarChart3 className="mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function sentimentColor(s: string): string {
  return getSentiment(s).color;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Platform icon helper for sample widget
function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon =
    platform === "youtube"
      ? Youtube
      : platform === "reddit"
      ? MessageCircle
      : platform === "instagram"
      ? Instagram
      : Twitter;
  return <Icon className={className} />;
}

function QuickSampleWidget({ isPremium }: { isPremium: boolean }) {
  const setSelectedAnalysisId = useAppStore((s) => s.setSelectedAnalysisId);
  const [runningId, setRunningId] = useState<string | null>(null);

  // Filter out the premium livestream sample for free users
  const samples = SAMPLE_DATASETS.filter(
    (s) => s.contentType !== "livestream" || isPremium
  );

  async function runSample(sample: (typeof samples)[number]) {
    setRunningId(sample.id);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: sample.platform,
          contentType: sample.contentType,
          title: sample.title,
          sampleId: sample.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }
      toast.success("Analysis complete! Opening results…");
      setSelectedAnalysisId(data.analysisId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] via-card to-teal-500/[0.03]">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-primary" />
              Quick Demo — Try a Sample
            </CardTitle>
            <CardDescription className="text-xs">
              One-click analysis with realistic social media datasets — perfect
              for first-time users
            </CardDescription>
          </div>
          <Badge variant="outline" className="hidden gap-1 text-[10px] sm:flex">
            <Zap className="h-3 w-3 text-amber-500" />
            {samples.length} samples
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {samples.map((sample, i) => {
            const isRunning = runningId === sample.id;
            const isDisabled = runningId !== null;
            const P = PLATFORMS[sample.platform as keyof typeof PLATFORMS];
            return (
              <motion.div
                key={sample.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className={`group relative flex flex-col rounded-xl border border-border/60 bg-card/80 p-3.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md ${
                  isDisabled && !isRunning ? "opacity-60" : ""
                }`}
              >
                {/* Platform accent strip */}
                <div
                  className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
                  style={{
                    background: `linear-gradient(to right, ${P?.color || "#10b981"}, ${P?.color || "#10b981"}99)`,
                  }}
                />
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${P?.color || "#10b981"} 0%, ${P?.color || "#10b981"}cc 100%)`,
                    }}
                  >
                    <PlatformIcon platform={sample.platform} className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {P?.label}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug">
                  {sample.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                  {sample.description}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {sample.items.length} items
                  </span>
                  <Button
                    size="sm"
                    onClick={() => runSample(sample)}
                    disabled={isDisabled}
                    className="h-7 gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 text-[11px] text-white hover:opacity-90"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Running
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Run
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Click <span className="font-medium">Run</span> on any sample — the
          transformer model analyzes all items and opens a detailed report in
          seconds.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Weekly Digest Card — summary of the user's last 7 days of analysis
 * activity. Shows a 2x2 grid of mini stat tiles: analyses this week,
 * most active platform, average sentiment score, and dominant emotion.
 * Renders an empty state when the user has no analyses in the window.
 *
 * All stats are computed from the existing `analyses` state (no extra
 * network round-trip), matching the dashboard's existing pattern.
 */
function WeeklyDigestCard({
  analyses,
}: {
  analyses: AnalysisListItem[];
}) {
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);

  // Filter to the last 7 days (rolling window from now).
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = analyses.filter(
    (a) => new Date(a.createdAt).getTime() >= sevenDaysAgo
  );

  // Empty state — no analyses in the last 7 days.
  if (thisWeek.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Your Week at a Glance
            </CardTitle>
            <CardDescription className="text-xs">
              A quick summary of your analysis activity over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/20 bg-card/40 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">
                No analyses this week yet
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Start a new analysis to see your weekly digest!
              </p>
              <Button
                size="sm"
                onClick={() => setDashboardTab("new-analysis")}
                className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                New Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Compute weekly stats from the existing analyses state.
  const total = thisWeek.length;

  // Most active platform
  const platformCounts: Record<string, number> = {};
  for (const a of thisWeek) {
    platformCounts[a.platform] = (platformCounts[a.platform] || 0) + 1;
  }
  const topPlatformEntry = Object.entries(platformCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topPlatformId = (topPlatformEntry?.[0] || "youtube") as keyof typeof PLATFORMS;
  const topPlatformMeta = PLATFORMS[topPlatformId];
  const TopPlatformIcon = topPlatformMeta?.icon;

  // Average sentiment score
  const avgScore =
    thisWeek.reduce((s, a) => s + a.sentimentScore, 0) / total;
  const scorePositive = avgScore >= 0;

  // Dominant emotion — derived from overallSentiment (the list endpoint
  // exposes sentiment, not per-emotion counts; we map the dominant
  // sentiment to a representative emotion emoji + label so the tile is
  // still meaningful at a glance).
  const sentimentCounts: Record<string, number> = {};
  for (const a of thisWeek) {
    sentimentCounts[a.overallSentiment] =
      (sentimentCounts[a.overallSentiment] || 0) + 1;
  }
  const topSentimentEntry = Object.entries(sentimentCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const dominantSentimentKey = topSentimentEntry?.[0] || "neutral";
  const emotionEmoji =
    dominantSentimentKey === "positive"
      ? "😄"
      : dominantSentimentKey === "negative"
        ? "😠"
        : dominantSentimentKey === "mixed"
          ? "🎭"
          : "😐";
  const emotionLabel =
    dominantSentimentKey.charAt(0).toUpperCase() +
    dominantSentimentKey.slice(1);

  const tiles = [
    {
      label: "Analyses This Week",
      value: String(total),
      sub: `${total === 1 ? "run" : "runs"} in the last 7 days`,
      icon: BarChart3,
      tone: "from-emerald-500 to-teal-600",
    },
    {
      label: "Most Active Platform",
      value: topPlatformMeta?.label || "—",
      sub: `${topPlatformEntry?.[1] || 0} ${topPlatformEntry?.[1] === 1 ? "analysis" : "analyses"}`,
      icon: TopPlatformIcon || BarChart3,
      tone: "from-cyan-500 to-emerald-500",
    },
    {
      label: "Avg Sentiment Score",
      value: `${avgScore > 0 ? "+" : ""}${avgScore.toFixed(2)}`,
      sub: scorePositive ? "leaning positive" : "leaning negative",
      icon: scorePositive ? TrendingUp : TrendingDown,
      tone: scorePositive
        ? "from-emerald-400 to-green-500"
        : "from-red-400 to-rose-500",
    },
    {
      label: "Dominant Emotion",
      value: `${emotionEmoji} ${emotionLabel}`,
      sub: `${Math.round(((topSentimentEntry?.[1] || 0) / total) * 100)}% of analyses`,
      icon: Sparkles,
      tone: "from-violet-500 to-fuchsia-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Your Week at a Glance
              </CardTitle>
              <CardDescription className="text-xs">
                A quick summary of your analysis activity over the last 7 days
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="hidden gap-1 text-[10px] sm:flex"
            >
              <Calendar className="h-3 w-3 text-emerald-500" />
              Last 7 days
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((tile, i) => {
              const Icon = tile.icon;
              return (
                <motion.div
                  key={tile.label}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.06 }}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-card/80 p-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-500/40"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tile.tone} text-white shadow-sm transition-transform group-hover:scale-110`}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {tile.label}
                    </p>
                    <p
                      className="mt-0.5 truncate text-base font-bold tabular-nums"
                      title={tile.value}
                    >
                      {tile.value}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {tile.sub}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Sentiment Trend Over Time — line chart of the user's last N analyses'
 * sentimentScore, chronologically. Points are color-coded by overallSentiment.
 */
function SentimentTrendChart({
  analyses,
}: {
  analyses: AnalysisListItem[];
}) {
  // Take up to last 12, reverse to chronological order
  const data = analyses
    .slice(0, 12)
    .reverse()
    .map((a, i) => ({
      idx: i + 1,
      label: new Date(a.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: a.sentimentScore,
      sentiment: a.overallSentiment,
      title: a.title,
      platform: a.platform,
    }));

  // Compute trend direction (compare first half avg vs second half avg)
  const half = Math.floor(data.length / 2);
  const firstHalfAvg =
    data.slice(0, half).reduce((s, d) => s + d.score, 0) / Math.max(half, 1);
  const secondHalfAvg =
    data.slice(half).reduce((s, d) => s + d.score, 0) /
    Math.max(data.length - half, 1);
  const trendDelta = secondHalfAvg - firstHalfAvg;

  return (
    <div className="space-y-3">
      {/* Trend summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Trend:
        </span>
        {Math.abs(trendDelta) < 0.05 ? (
          <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
            <Meh className="h-3 w-3" />
            Stable
          </Badge>
        ) : trendDelta > 0 ? (
          <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            Improving (+{trendDelta.toFixed(2)})
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-red-500/30 bg-red-500/10 text-[10px] text-red-600 dark:text-red-400">
            <TrendingDown className="h-3 w-3" />
            Declining ({trendDelta.toFixed(2)})
          </Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          Range:{" "}
          <span className="font-medium tabular-nums">
            {Math.min(...data.map((d) => d.score)).toFixed(2)} →{" "}
            {Math.max(...data.map((d) => d.score)).toFixed(2)}
          </span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              color: "var(--popover-foreground)",
              fontSize: "12px",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, _name, item) => {
              const d = item?.payload as (typeof data)[number];
              return [
                `${value > 0 ? "+" : ""}${value.toFixed(2)} (${d?.sentiment})`,
                d?.title?.slice(0, 40) || "Score",
              ];
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="url(#trendLineGrad)"
            strokeWidth={2.5}
            dot={{ r: 5, strokeWidth: 2, fill: "var(--background)" }}
            activeDot={{ r: 7, strokeWidth: 2 }}
            // Color each dot by its sentiment
            // (Recharts applies `fill` per-point via the dot prop callback)
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        {[
          { label: "Positive", color: "#10b981" },
          { label: "Neutral", color: "#f59e0b" },
          { label: "Negative", color: "#ef4444" },
          { label: "Mixed", color: "#8b5cf6" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: l.color }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Sentiment Timeline — daily average sentiment score across all of the
 * user's analyses. Groups analyses by YYYY-MM-DD date, computes the mean
 * sentimentScore per day, and plots it as an emerald line with a subtle
 * area fill. Reference areas tint the positive (y > 0) and negative
 * (y < 0) zones; a dashed reference line marks the neutral baseline at
 * y = 0. The parent card only renders this chart when the user has 2+
 * analyses.
 */
function SentimentTimelineChart({
  analyses,
}: {
  analyses: AnalysisListItem[];
}) {
  // Group analyses by YYYY-MM-DD date and accumulate the sum + count per day.
  const byDate = new Map<string, { sum: number; count: number }>();
  for (const a of analyses) {
    const d = new Date(a.createdAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const entry = byDate.get(dateKey) ?? { sum: 0, count: 0 };
    entry.sum += a.sentimentScore;
    entry.count += 1;
    byDate.set(dateKey, entry);
  }

  // Sort ascending by date and build the chart data array.
  const data = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, v]) => {
      const avg = v.sum / v.count;
      const d = new Date(`${dateKey}T00:00:00`);
      return {
        date: dateKey,
        label: d.toLocaleDateString(undefined, {
          month: "short",
          day: "2-digit",
        }),
        avgScore: Number(avg.toFixed(3)),
        count: v.count,
        sentimentLabel:
          avg > 0.15 ? "positive" : avg < -0.15 ? "negative" : "neutral",
      };
    });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
        <defs>
          <linearGradient id="timelineLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="timelineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          label={{ value: "Date", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "var(--muted-foreground)", textAnchor: "middle" } }}
        />
        <YAxis
          domain={[-1, 1]}
          ticks={[-1, -0.5, 0, 0.5, 1]}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          label={{ value: "Sentiment Score", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "var(--muted-foreground)", textAnchor: "middle" } }}
        />
        <ReferenceArea y1={0} y2={1} fill="#10b981" fillOpacity={0.05} stroke="none" />
        <ReferenceArea y1={-1} y2={0} fill="#ef4444" fillOpacity={0.05} stroke="none" />
        <ReferenceLine
          y={0}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          opacity={0.5}
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
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          labelFormatter={(label: string) => {
            const match = data.find((d) => d.label === label);
            if (match) {
              return new Date(`${match.date}T00:00:00`).toLocaleDateString(
                undefined,
                { year: "numeric", month: "short", day: "numeric" }
              );
            }
            return label;
          }}
          formatter={(value: number, _name, item) => {
            const d = item?.payload as (typeof data)[number] | undefined;
            const v = Number(value);
            const count = d?.count ?? 0;
            return [
              `${v > 0 ? "+" : ""}${v.toFixed(2)} (${d?.sentimentLabel ?? ""})`,
              `Avg score · ${count} analysis${count === 1 ? "" : "es"}`,
            ];
          }}
        />
        {/* Subtle area fill beneath the line (10% emerald) */}
        <Area
          type="monotone"
          dataKey="avgScore"
          stroke="none"
          fill="url(#timelineAreaGrad)"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        {/* The line itself — emerald→teal gradient stroke with dot markers */}
        <Line
          type="monotone"
          dataKey="avgScore"
          stroke="url(#timelineLineGrad)"
          strokeWidth={2.5}
          dot={{
            r: 4,
            strokeWidth: 2,
            fill: "#10b981",
            stroke: "var(--background)",
          }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Platform × Sentiment heatmap — matrix view showing how many analyses
 * fall into each (platform, sentiment) bucket. Cells are color-graded by
 * count intensity.
 */
function PlatformSentimentHeatmap({
  analyses,
}: {
  analyses: AnalysisListItem[];
}) {
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);
  const setHeatmapFilter = useAppStore((s) => s.setHeatmapFilter);
  const platforms = ["youtube", "reddit", "x", "instagram"] as const;
  const sentiments = ["positive", "negative", "neutral", "mixed"] as const;

  // Build matrix
  const matrix: Record<string, Record<string, number>> = {};
  for (const p of platforms) {
    matrix[p] = {};
    for (const s of sentiments) matrix[p][s] = 0;
  }
  for (const a of analyses) {
    if (matrix[a.platform] && matrix[a.platform][a.overallSentiment] !== undefined) {
      matrix[a.platform][a.overallSentiment]++;
    }
  }

  const maxCount = Math.max(
    1,
    ...platforms.flatMap((p) => sentiments.map((s) => matrix[p][s]))
  );

  function cellStyle(count: number, sentiment: string) {
    const intensity = count / maxCount;
    const baseColor =
      sentiment === "positive"
        ? "16, 185, 129"
        : sentiment === "negative"
          ? "239, 68, 68"
          : sentiment === "mixed"
            ? "139, 92, 246"
            : "245, 158, 11";
    if (count === 0) {
      return {
        background: "var(--muted)",
        color: "var(--muted-foreground)",
        opacity: 0.4,
      };
    }
    return {
      background: `rgba(${baseColor}, ${0.12 + intensity * 0.55})`,
      color: intensity > 0.5 ? "#fff" : "var(--foreground)",
      border: `1px solid rgba(${baseColor}, ${0.3 + intensity * 0.4})`,
    };
  }

  function handleCellClick(platform: string, sentiment: string, count: number) {
    if (count === 0) return;
    setHeatmapFilter({ platform, sentiment });
    setDashboardTab("my-analyses");
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Platform
              </th>
              {sentiments.map((s) => (
                <th
                  key={s}
                  className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {platforms.map((p) => {
              const P = PLATFORMS[p];
              const Icon = P.icon;
              const totalForPlatform = sentiments.reduce(
                (acc, s) => acc + matrix[p][s],
                0
              );
              return (
                <tr key={p} className="border-t border-border/40">
                  <td className="px-2 py-2 text-left">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                        style={{ background: P.color }}
                      >
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="text-xs font-medium">{P.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({totalForPlatform})
                      </span>
                    </div>
                  </td>
                  {sentiments.map((s) => {
                    const count = matrix[p][s];
                    const interactive = count > 0;
                    return (
                      <td key={s} className="px-1.5 py-1.5">
                        <div
                          role={interactive ? "button" : undefined}
                          tabIndex={interactive ? 0 : -1}
                          onClick={
                            interactive
                              ? () => handleCellClick(p, s, count)
                              : undefined
                          }
                          onKeyDown={(e) => {
                            if (interactive && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              handleCellClick(p, s, count);
                            }
                          }}
                          className={`flex h-9 items-center justify-center rounded-md text-xs font-bold tabular-nums transition-all ${
                            interactive
                              ? "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                              : "cursor-default"
                          }`}
                          style={cellStyle(count, s)}
                          title={
                            count > 0
                              ? `Click to view ${count} ${P.label} ${s} ${count === 1 ? "analysis" : "analyses"}`
                              : `${P.label} • ${s}: no analyses`
                          }
                        >
                          {count > 0 ? count : "·"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend / hint */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Grid3x3 className="h-3 w-3" />
          Click any cell to filter My Analyses
        </span>
        <span className="flex items-center gap-1.5">
          <span>Low</span>
          <span className="flex h-2 w-16 overflow-hidden rounded-full">
            <span className="flex-1 bg-muted" />
            <span className="flex-1 bg-emerald-500/30" />
            <span className="flex-1 bg-emerald-500/60" />
            <span className="flex-1 bg-emerald-500" />
          </span>
          <span>High</span>
        </span>
      </div>
    </div>
  );
}
