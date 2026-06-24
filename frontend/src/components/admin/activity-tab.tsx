"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  AlertCircle,
  RefreshCw,
  LogIn,
  UserPlus,
  BarChart3,
  Crown,
  Download,
  LogOut,
  History,
  Inbox,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ActivityEntry {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface StatsResponse {
  recentActivity: ActivityEntry[];
}

interface ActionStyle {
  label: string;
  icon: typeof LogIn;
  color: string;
  bg: string;
  ring: string;
  dot: string;
}

const ACTION_STYLES: Record<string, ActionStyle> = {
  login: {
    label: "Logged in",
    icon: LogIn,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  register: {
    label: "Registered",
    icon: UserPlus,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  analysis: {
    label: "Ran analysis",
    icon: BarChart3,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/30",
    dot: "bg-violet-500",
  },
  apply_premium: {
    label: "Applied for premium",
    icon: Crown,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
  },
  download_report: {
    label: "Downloaded report",
    icon: Download,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/30",
    dot: "bg-cyan-500",
  },
  logout: {
    label: "Logged out",
    icon: LogOut,
    color: "text-muted-foreground",
    bg: "bg-muted",
    ring: "ring-border",
    dot: "bg-muted-foreground",
  },
};

function getActionStyle(action: string): ActionStyle {
  return (
    ACTION_STYLES[action] || {
      label: action.replace(/_/g, " "),
      icon: History,
      color: "text-muted-foreground",
      bg: "bg-muted",
      ring: "ring-border",
      dot: "bg-muted-foreground",
    }
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export function ActivityTab() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch activity");
      const data = (await res.json()) as StatsResponse;
      setActivity(data.recentActivity ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Compute breakdown by action type
  const breakdown = activity.reduce<Record<string, number>>((acc, a) => {
    acc[a.action] = (acc[a.action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Live Activity Timeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Showing the latest {activity.length || 0} platform events in
            chronological order.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivity}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Action type breakdown */}
      {activity.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(ACTION_STYLES).map(([, style]) => {
            const Icon = style.icon;
            const count = breakdown[
              Object.keys(ACTION_STYLES).find(
                (k) => ACTION_STYLES[k] === style
              )!
            ] || 0;
            return (
              <Card
                key={style.label}
                className={cn(
                  "border-border/60 bg-gradient-to-br from-transparent to-transparent",
                  count === 0 && "opacity-40"
                )}
              >
                <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-inset",
                      style.bg,
                      style.color,
                      style.ring
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold tabular-nums leading-none">
                    {count}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {style.label}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p className="text-sm font-medium">Failed to load activity log</p>
            <Button size="sm" onClick={fetchActivity} variant="outline">
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && activity.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Inbox className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold">No activity recorded</p>
              <p className="text-xs text-muted-foreground">
                Platform events (logins, analyses, applications) will appear
                here as they happen.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {!loading && !error && activity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ActivityIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Event Stream
            </CardTitle>
            <CardDescription className="text-xs">
              Most recent first · {activity.length} events
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[800px]">
              <ol className="relative px-4 py-2 sm:px-6">
                {/* vertical line */}
                <span
                  aria-hidden
                  className="absolute left-[36px] top-4 bottom-4 w-px bg-gradient-to-b from-emerald-500/40 via-border to-transparent sm:left-[44px]"
                />
                {activity.map((entry, idx) => {
                  const style = getActionStyle(entry.action);
                  const Icon = style.icon;
                  return (
                    <motion.li
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.03 }}
                      className="relative flex gap-3 py-3 sm:gap-4"
                    >
                      {/* Avatar / icon node */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-background",
                            style.bg,
                            style.color
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1 h-1.5 w-1.5 rounded-full",
                            style.dot
                          )}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-600 text-[9px] font-bold text-white",
                                entry.user.name &&
                                  "from-emerald-500 to-teal-600"
                              )}
                            >
                              {(entry.user.name || entry.user.email || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <p className="truncate text-sm font-semibold text-foreground">
                              {entry.user.name || "Unknown user"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 px-1.5 py-0 text-[10px] font-medium",
                              style.bg,
                              style.color
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {style.label}
                          </Badge>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="text-foreground/70">
                            {entry.user.email}
                          </span>
                          {entry.detail && (
                            <>
                              {" — "}
                              <span>{entry.detail}</span>
                            </>
                          )}
                        </p>

                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {formatDistanceToNow(new Date(entry.createdAt), {
                            addSuffix: true,
                          })}{" "}
                          ·{" "}
                          {format(
                            new Date(entry.createdAt),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
