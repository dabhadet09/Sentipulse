"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Crown,
  ShieldCheck,
  BarChart3,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity as ActivityIcon,
  AlertCircle,
  Loader2,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  LineChart as LineIcon,
  Trophy,
  UserCog,
  ClipboardCheck,
} from "lucide-react";

import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  TrendAreaChart,
  PlatformBarChart,
  SentimentPieChart,
} from "@/components/shared/charts";
import { PlatformBadge } from "@/components/shared/badges";

interface StatsResponse {
  totals: {
    users: number;
    premiumUsers: number;
    adminUsers: number;
    analyses: number;
    premiumAnalyses: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
  };
  platformBreakdown: { platform: string; count: number }[];
  sentimentBreakdown: { sentiment: string; count: number }[];
  dailyNewUsers: { date: string; count: number }[];
  dailyAnalyses: {
    date: string;
    total: number;
    premium: number;
    byPlatform: Record<string, number>;
  }[];
  recentActivity: {
    id: string;
    action: string;
    detail: string | null;
    createdAt: string;
    user: { name: string; email: string };
  }[];
  roleDistribution: { free: number; premium: number; admin: number };
  topActiveUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    subscriptionTier: string;
    analysisCount: number;
  }[];
}

const ACTION_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  login: {
    label: "Login",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  register: {
    label: "Register",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  analysis: {
    label: "Analysis",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
  },
  apply_premium: {
    label: "Premium App",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  download_report: {
    label: "Report",
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  logout: {
    label: "Logout",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

function actionMeta(action: string) {
  return (
    ACTION_META[action] || {
      label: action.replace(/_/g, " "),
      color: "text-muted-foreground",
      bg: "bg-muted",
    }
  );
}

// Extract initials from a name: first letter of first word + first letter of
// last word. Handles single-word names, empty/whitespace strings, and names
// with multiple spaces gracefully (falls back to "?").
function getInitials(name?: string | null): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  delay = 0,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "emerald" | "amber" | "violet" | "rose" | "teal" | "cyan" | "slate" | "orange";
  delay?: number;
}) {
  const tones: Record<string, string> = {
    emerald:
      "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    amber:
      "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    violet:
      "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400 ring-violet-500/20",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400 ring-rose-500/20",
    teal: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-400 ring-teal-500/20",
    cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20",
    slate:
      "from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-300 ring-slate-500/20",
    orange:
      "from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-400 ring-orange-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card
        className={cn(
          "relative overflow-hidden bg-gradient-to-br ring-1 transition-shadow hover:shadow-md",
          tones[tone]
        )}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/60 ring-1 ring-inset ring-border/50",
              tones[tone].split(" ").filter((c) => c.startsWith("text-")).join(" ")
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
              {value.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function OverviewTab() {
  const setAdminTab = useAppStore((s) => s.setAdminTab);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = (await res.json()) as StatsResponse;
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[260px] w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-medium">Failed to load admin stats</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button size="sm" onClick={fetchStats} variant="outline">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const t = stats.totals;

  // Role distribution totals — used for pie chart empty-state check
  const rd = stats.roleDistribution ?? { free: 0, premium: 0, admin: 0 };
  const totalRoles = rd.free + rd.premium + rd.admin;

  // Top active users — filter out anyone with 0 analyses so the leaderboard
  // only shows users who have actually run an analysis
  const topUsers = (stats.topActiveUsers ?? []).filter(
    (u) => u.analysisCount > 0
  );

  // Convert sentimentBreakdown [{sentiment, count}] -> {positive, negative, neutral} percentages
  const sentimentCounts: Record<string, number> = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
  };
  for (const s of stats.sentimentBreakdown) {
    const key = (s.sentiment || "neutral").toLowerCase();
    sentimentCounts[key] = (sentimentCounts[key] || 0) + s.count;
  }
  const totalSentiment =
    sentimentCounts.positive +
    sentimentCounts.negative +
    sentimentCounts.neutral +
    sentimentCounts.mixed;
  const pct = (n: number) =>
    totalSentiment > 0 ? Math.round((n / totalSentiment) * 100) : 0;

  const sentimentDist = {
    positive: pct(sentimentCounts.positive),
    negative: pct(sentimentCounts.negative),
    neutral: pct(sentimentCounts.neutral),
  };

  // Daily new users [{date, count}] -> [{name, value}]
  const dailyData = stats.dailyNewUsers.map((d) => {
    const dateObj = new Date(d.date);
    return {
      name: dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: d.count,
    };
  });

  // Daily analyses: total + premium + per-platform breakdown
  const analysesTimeData = (stats.dailyAnalyses || []).map((d) => {
    const dateObj = new Date(d.date);
    return {
      name: dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      total: d.total,
      premium: d.premium,
      standard: d.total - d.premium,
      youtube: d.byPlatform.youtube || 0,
      reddit: d.byPlatform.reddit || 0,
      x: d.byPlatform.x || 0,
      instagram: d.byPlatform.instagram || 0,
    };
  });
  const totalAnalyses7d = analysesTimeData.reduce((a, b) => a + b.total, 0);
  const totalPremium7d = analysesTimeData.reduce((a, b) => a + b.premium, 0);
  const peakDay = analysesTimeData.reduce(
    (max, d) => (d.total > max.total ? d : max),
    { name: "—", total: 0, premium: 0, standard: 0, youtube: 0, reddit: 0, x: 0, instagram: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card
            className="cursor-pointer overflow-hidden border-l-4 border-l-emerald-500 transition-all hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => setAdminTab("applications")}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                  {t.pendingApplications}
                </p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Review Applications
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
        >
          <Card
            className="cursor-pointer overflow-hidden border-l-4 border-l-teal-500 transition-all hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => setAdminTab("users")}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                  {t.users}
                </p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Manage Users
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <Card
            className="cursor-pointer overflow-hidden border-l-4 border-l-amber-500 transition-all hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => setAdminTab("activity")}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
                <ActivityIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                  {stats.recentActivity.length}
                </p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  View Activity
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pending applications alert */}
      {t.pendingApplications > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
            <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t.pendingApplications} pending premium application
                    {t.pendingApplications === 1 ? "" : "s"} awaiting review
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Review applicant reasons, use cases, and account history
                    before granting PREMIUM access.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
                onClick={() => setAdminTab("applications")}
              >
                Review now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stat cards (8) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={t.users} tone="emerald" delay={0} />
        <StatCard icon={Crown} label="Premium Users" value={t.premiumUsers} tone="amber" delay={0.04} />
        <StatCard icon={ShieldCheck} label="Admin Users" value={t.adminUsers} tone="teal" delay={0.08} />
        <StatCard icon={BarChart3} label="Total Analyses" value={t.analyses} tone="violet" delay={0.12} />
        <StatCard icon={Sparkles} label="Premium Analyses" value={t.premiumAnalyses} tone="cyan" delay={0.16} />
        <StatCard icon={Clock} label="Pending Apps" value={t.pendingApplications} tone="orange" delay={0.2} />
        <StatCard icon={CheckCircle2} label="Approved Apps" value={t.approvedApplications} tone="emerald" delay={0.24} />
        <StatCard icon={XCircle} label="Rejected Apps" value={t.rejectedApplications} tone="rose" delay={0.28} />
      </div>

      {/* Sentiment Distribution — horizontal bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PieIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Sentiment Distribution</CardTitle>
              <CardDescription className="text-xs">
                All analyses by sentiment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalSentiment > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  {
                    name: "Positive",
                    count: sentimentCounts.positive,
                  },
                  {
                    name: "Negative",
                    count: sentimentCounts.negative,
                  },
                  {
                    name: "Neutral",
                    count: sentimentCounts.neutral,
                  },
                  {
                    name: "Mixed",
                    count: sentimentCounts.mixed,
                  },
                ]}
                layout="vertical"
                margin={{ left: 16, right: 24, top: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="posGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="negGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                  <linearGradient id="neuGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="mixGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--popover-foreground)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => {
                    const percentage = totalSentiment > 0 ? Math.round((value / totalSentiment) * 100) : 0;
                    return [`${value} (${percentage}%)`, "Count"];
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  <Cell fill="url(#posGrad)" />
                  <Cell fill="url(#negGrad)" />
                  <Cell fill="url(#neuGrad)" />
                  <Cell fill="url(#mixGrad)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <PieIcon className="mb-2 h-8 w-8 opacity-30" />
              No sentiment data yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Daily New Users</CardTitle>
                  <CardDescription className="text-xs">
                    Last 7 days signups
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {dailyData.reduce((a, b) => a + b.value, 0)} new
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {dailyData.some((d) => d.value > 0) ? (
              <TrendAreaChart data={dailyData} height={240} />
            ) : (
              <div className="flex h-[240px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <TrendingUp className="mb-2 h-8 w-8 opacity-30" />
                No new users in the past 7 days.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Analyses by Platform</CardTitle>
                  <CardDescription className="text-xs">
                    Distribution across social platforms
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {stats.platformBreakdown.reduce((a, b) => a + b.count, 0)} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stats.platformBreakdown.length > 0 ? (
              <PlatformBarChart
                data={stats.platformBreakdown}
                height={240}
              />
            ) : (
              <div className="flex h-[240px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <Layers className="mb-2 h-8 w-8 opacity-30" />
                No analyses recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Role Distribution + Top Active Users */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserCog className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">User Roles</CardTitle>
                  <CardDescription className="text-xs">
                    Distribution by account tier
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {t.users} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {totalRoles > 0 ? (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Free",
                            value: rd.free,
                          },
                          {
                            name: "Premium",
                            value: rd.premium,
                          },
                          {
                            name: "Admin",
                            value: rd.admin,
                          },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.5rem",
                          color: "var(--popover-foreground)",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`${value} user${value === 1 ? "" : "s"}`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center total label */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums leading-none text-foreground">
                      {t.users}
                    </span>
                    <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Users
                    </span>
                  </div>
                </div>
                {/* Legend with counts and percentages */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    {
                      name: "Free",
                      value: rd.free,
                      color: "bg-emerald-500",
                      text: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      name: "Premium",
                      value: rd.premium,
                      color: "bg-amber-500",
                      text: "text-amber-600 dark:text-amber-400",
                    },
                    {
                      name: "Admin",
                      value: rd.admin,
                      color: "bg-violet-500",
                      text: "text-violet-600 dark:text-violet-400",
                    },
                  ].map((s) => {
                    const pct =
                      t.users > 0 ? Math.round((s.value / t.users) * 100) : 0;
                    return (
                      <div
                        key={s.name}
                        className="flex flex-col items-center rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-center"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full", s.color)} />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {s.name}
                          </span>
                        </div>
                        <span className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                          {s.value}
                        </span>
                        <span className={cn("text-[10px] font-medium", s.text)}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex h-[260px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <UserCog className="mb-2 h-8 w-8 opacity-30" />
                No users yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Top Active Users</CardTitle>
                  <CardDescription className="text-xs">
                    Most analyses submitted
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Top {topUsers.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {topUsers.length > 0 ? (
              <ul className="divide-y divide-border">
                {topUsers.map((u, i) => {
                  // Prefer name initials; fall back to email when name is empty/whitespace
                  const nameInitials = getInitials(u.name);
                  const initials =
                    nameInitials !== "?" ? nameInitials : getInitials(u.email);
                  // Rank tones: gold #1, silver #2, bronze #3, neutral #4-5
                  const rankTones = [
                    "from-amber-400 to-yellow-600",
                    "from-slate-300 to-slate-500 dark:from-slate-400 dark:to-slate-600",
                    "from-orange-400 to-amber-700",
                    "from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700",
                    "from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700",
                  ];
                  return (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm",
                          rankTones[i] || rankTones[3]
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[11px] font-bold uppercase text-white ring-2 ring-background">
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {u.name}
                          </p>
                          {u.role === "ADMIN" && (
                            <Badge
                              variant="outline"
                              className="shrink-0 px-1.5 py-0 text-[9px] font-medium text-violet-600 dark:text-violet-400"
                            >
                              ADMIN
                            </Badge>
                          )}
                          {u.subscriptionTier === "PREMIUM" && (
                            <Badge
                              variant="outline"
                              className="shrink-0 gap-0.5 px-1.5 py-0 text-[9px] font-medium text-amber-600 dark:text-amber-400"
                            >
                              <Crown className="h-2.5 w-2.5" />
                              PRO
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 gap-1 tabular-nums"
                      >
                        <BarChart3 className="h-3 w-3" />
                        {u.analysisCount}{" "}
                        {u.analysisCount === 1 ? "analysis" : "analyses"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <Trophy className="mb-2 h-8 w-8 opacity-30" />
                No analyses submitted yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analyses Over Time — full-width composed chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <LineIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Analyses Over Time</CardTitle>
                <CardDescription className="text-xs">
                  Daily analysis volume — last 7 days (stacked by tier, total
                  overlay)
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 text-[10px] text-emerald-600 dark:text-emerald-400"
              >
                <BarChart3 className="h-3 w-3" />
                {totalAnalyses7d} in 7d
              </Badge>
              <Badge
                variant="outline"
                className="gap-1 text-[10px] text-amber-600 dark:text-amber-400"
              >
                <Crown className="h-3 w-3" />
                {totalPremium7d} premium
              </Badge>
              {peakDay.total > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 text-[10px] text-violet-600 dark:text-violet-400"
                >
                  <TrendingUp className="h-3 w-3" />
                  Peak: {peakDay.total} on {peakDay.name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analysesTimeData.some((d) => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={analysesTimeData}
                margin={{ left: -16, right: 8, top: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="stdBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="premBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--popover-foreground)",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconType="circle"
                />
                <Bar
                  dataKey="standard"
                  name="Standard"
                  stackId="a"
                  fill="url(#stdBarGrad)"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="premium"
                  name="Premium"
                  stackId="a"
                  fill="url(#premBarGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <LineIcon className="mb-2 h-8 w-8 opacity-30" />
              No analyses run in the past 7 days.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sentiment distribution + recent activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PieIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Sentiment Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Across all platform analyses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {totalSentiment > 0 ? (
              <>
                <SentimentPieChart distribution={sentimentDist} height={220} />
                {sentimentCounts.mixed > 0 && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    <span className="font-medium text-violet-600 dark:text-violet-400">
                      Mixed: {pct(sentimentCounts.mixed)}%
                    </span>{" "}
                    ·{" "}
                    {sentimentCounts.mixed} of {totalSentiment} analyses
                  </p>
                )}
              </>
            ) : (
              <div className="flex h-[220px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <PieIcon className="mb-2 h-8 w-8 opacity-30" />
                No sentiment data yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ActivityIcon className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription className="text-xs">
                    Latest {stats.recentActivity.length} platform events
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setAdminTab("activity")}
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[340px]">
              {stats.recentActivity.length === 0 ? (
                <div className="flex h-[340px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <ActivityIcon className="mb-2 h-8 w-8 opacity-30" />
                  No activity recorded yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.recentActivity.map((a) => {
                    const meta = actionMeta(a.action);
                    return (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ring-1 ring-inset ring-border",
                            meta.bg,
                            meta.color
                          )}
                        >
                          {(a.user.name || a.user.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {a.user.name}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 px-1.5 py-0 text-[10px] font-medium capitalize",
                                meta.bg,
                                meta.color
                              )}
                            >
                              {meta.label}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.detail || a.user.email}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                            {formatDistanceToNow(new Date(a.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Platform breakdown detail strip */}
      {stats.platformBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform Coverage</CardTitle>
            <CardDescription className="text-xs">
              Where users are running sentiment analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.platformBreakdown.map((p) => (
                <PlatformBadge key={p.platform} platform={p.platform} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
