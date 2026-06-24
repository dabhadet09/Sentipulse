"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  Loader2,
  Check,
  X,
  StickyNote,
  RefreshCw,
  CalendarDays,
  BarChart3,
  UserCircle,
  Sparkles,
  AlertCircle,
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/components/shared/badges";

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED";

interface AdminApplication {
  id: string;
  reason: string;
  platform: string;
  useCase: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    subscriptionTier: string;
    createdAt: string;
    _count: { analyses: number };
  };
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
      >
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === "APPROVED") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
      >
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"
    >
      <XCircle className="h-3 w-3" />
      Rejected
    </Badge>
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === "PREMIUM") {
    return (
      <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-white">
        <Sparkles className="h-3 w-3" />
        Premium
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
    >
      Free
    </Badge>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

const FILTERS: { id: StatusFilter; label: string; icon: typeof Inbox }[] = [
  { id: "all", label: "All", icon: Inbox },
  { id: "PENDING", label: "Pending", icon: Clock },
  { id: "APPROVED", label: "Approved", icon: CheckCircle2 },
  { id: "REJECTED", label: "Rejected", icon: XCircle },
];

export function ApplicationsTab() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Map applicationId -> admin note textarea value
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        filter === "all"
          ? "/api/admin/applications"
          : `/api/admin/applications?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.applications as AdminApplication[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const counts = useMemo(() => {
    return {
      all: applications.length,
      PENDING: applications.filter((a) => a.status === "PENDING").length,
      APPROVED: applications.filter((a) => a.status === "APPROVED").length,
      REJECTED: applications.filter((a) => a.status === "REJECTED").length,
    };
  }, [applications]);

  const handleReview = async (
    app: AdminApplication,
    action: "approve" | "reject"
  ) => {
    const adminNote = (noteDrafts[app.id] || "").trim() || undefined;
    setActionLoading(app.id + action);
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          action,
          adminNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");

      toast.success(
        action === "approve"
          ? `Approved ${app.user.name}'s premium application`
          : `Rejected ${app.user.name}'s premium application`,
        {
          description:
            action === "approve"
              ? "User upgraded to PREMIUM tier"
              : "Application marked as rejected",
        }
      );

      // Refetch the list (so filter tabs reflect new state)
      fetchApplications();
      // Clear the note draft
      setNoteDrafts((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
    } catch (e) {
      toast.error("Failed to review application", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/40 p-1">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.id;
            const count =
              f.id === "all"
                ? counts.all
                : counts[f.id as "PENDING" | "APPROVED" | "REJECTED"];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchApplications}
          className="gap-1.5 self-start sm:self-auto"
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p className="text-sm font-medium">Failed to load applications</p>
            <Button size="sm" onClick={fetchApplications} variant="outline">
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && applications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                No {filter === "all" ? "" : filter.toLowerCase()} applications
              </p>
              <p className="text-xs text-muted-foreground">
                {filter === "PENDING"
                  ? "All caught up — no applications waiting for review."
                  : "Applications in this category will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application cards */}
      {!loading && !error && applications.length > 0 && (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {applications.map((app, idx) => {
              const isPending = app.status === "PENDING";
              const noteValue = noteDrafts[app.id] ?? "";
              const approveLoading =
                actionLoading === app.id + "approve";
              const rejectLoading =
                actionLoading === app.id + "reject";

              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden transition-shadow hover:shadow-md",
                      isPending &&
                        "border-amber-500/30 ring-1 ring-amber-500/10"
                    )}
                  >
                    <CardHeader className="border-b border-border bg-muted/30 pb-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback
                              className={cn(
                                "text-xs font-bold text-white",
                                app.user.subscriptionTier === "PREMIUM"
                                  ? "bg-gradient-to-br from-amber-500 to-orange-500"
                                  : "bg-gradient-to-br from-slate-500 to-slate-600"
                              )}
                            >
                              {initials(app.user.name) ||
                                app.user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                              <span className="truncate">
                                {app.user.name}
                              </span>
                              <StatusBadge status={app.status} />
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="truncate">{app.user.email}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <TierBadge tier={app.user.subscriptionTier} />
                              <span className="text-muted-foreground/50">•</span>
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                Applied{" "}
                                {formatDistanceToNow(new Date(app.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <PlatformBadge platform={app.platform} />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 p-4 sm:p-5">
                      {/* Reason + use case */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <StickyNote className="h-3 w-3" />
                            Reason
                          </p>
                          <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                            {app.reason}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            Use Case
                          </p>
                          <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                            {app.useCase}
                          </p>
                        </div>
                      </div>

                      {/* Account snapshot */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="rounded-md border border-border bg-card/40 p-2.5">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <BarChart3 className="h-3 w-3" />
                            Analyses
                          </p>
                          <p className="text-lg font-bold tabular-nums">
                            {app.user._count.analyses}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-card/40 p-2.5">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <UserCircle className="h-3 w-3" />
                            Account Age
                          </p>
                          <p className="text-lg font-bold tabular-nums">
                            {formatDistanceToNow(new Date(app.user.createdAt))
                              .replace("about ", "")
                              .replace("less than a minute", "<1m")}
                          </p>
                        </div>
                        <div className="col-span-2 rounded-md border border-border bg-card/40 p-2.5 sm:col-span-1">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            Joined
                          </p>
                          <p className="text-sm font-semibold">
                            {format(new Date(app.user.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      {/* Reviewed info (if already reviewed) */}
                      {!isPending && app.reviewedAt && (
                        <div
                          className={cn(
                            "rounded-md p-3 text-sm",
                            app.status === "APPROVED"
                              ? "bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-500/5 text-rose-700 dark:text-rose-300"
                          )}
                        >
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-80">
                            <Check className="h-3 w-3" />
                            Reviewed{" "}
                            {formatDistanceToNow(new Date(app.reviewedAt), {
                              addSuffix: true,
                            })}
                          </p>
                          {app.adminNote && (
                            <p className="mt-1 italic">
                              “{app.adminNote}”
                            </p>
                          )}
                        </div>
                      )}

                      {/* Admin note + actions (only when pending) */}
                      {isPending && (
                        <div className="space-y-2 border-t border-border pt-3">
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <StickyNote className="h-3 w-3" />
                            Admin note{" "}
                            <span className="font-normal normal-case text-muted-foreground/70">
                              (optional — visible to the applicant)
                            </span>
                          </label>
                          <Textarea
                            placeholder="e.g. Approved — your use case aligns with our premium tier guidelines."
                            value={noteValue}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [app.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            className="resize-none text-sm"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReview(app, "reject")}
                              disabled={approveLoading || rejectLoading}
                              className="gap-1.5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                            >
                              {rejectLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReview(app, "approve")}
                              disabled={approveLoading || rejectLoading}
                              className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
                            >
                              {approveLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Approve &amp; grant PREMIUM
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
