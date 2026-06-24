"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  LogIn,
  UserPlus,
  FileText,
  Crown,
  Download,
  UserCog,
  Trash2,
  Radio,
  ChevronRight,
  CheckCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Notification {
  id: string;
  type: "activity" | "premium";
  icon: string;
  title: string;
  detail: string | null;
  createdAt: string;
  status?: string;
}

const ICON_MAP: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  login: { icon: LogIn, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  register: { icon: UserPlus, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  analysis: { icon: Sparkles, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
  analysis_created: { icon: Sparkles, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
  apply_premium: { icon: Crown, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  premium_submitted: { icon: Crown, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  premium_approved: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  premium_rejected: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  download_report: { icon: Download, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  profile_updated: { icon: UserCog, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
  delete_analysis: { icon: Trash2, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  livestream_segment: { icon: Radio, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  premium: { icon: Crown, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
};

function getIconConfig(icon: string, status?: string) {
  if (icon === "premium" && status === "APPROVED") {
    return { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" };
  }
  if (icon === "premium" && status === "REJECTED") {
    return { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" };
  }
  if (icon === "premium" && status === "PENDING") {
    return { icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" };
  }
  return ICON_MAP[icon] || { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Locally-dismissed notification ids — used by the "Mark all as read" button
  // so unread dots disappear without a backend round-trip.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);

  // Fetch notifications on mount + every 30s
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleClick(n: Notification) {
    // Navigate based on notification type
    if (n.type === "premium") {
      setDashboardTab("premium");
    } else if (n.icon.includes("analysis") || n.icon.includes("livestream")) {
      setDashboardTab("my-analyses");
    } else if (n.icon === "download_report") {
      setDashboardTab("my-analyses");
    } else if (n.icon === "profile_updated") {
      setDashboardTab("profile");
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative h-9 w-9"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[9px] font-bold text-white shadow-md shadow-rose-500/40 ring-2 ring-background"
          >
            {unreadCount}
          </motion.span>
        )}
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-ping rounded-full bg-rose-500/60" />
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-2xl border border-border bg-popover shadow-xl shadow-emerald-900/10"
          >
            {/* Header — gradient with "Notifications" title + mark all read */}
            <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 px-4 py-3">
              {/* Subtle decorative glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-12 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl"
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Notifications</p>
                    <p className="text-[10px] text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} new in last 24h` : "All caught up"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                      {unreadCount} new
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedIds(new Set(notifications.map((n) => n.id)));
                        setUnreadCount(0);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-2">
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-full animate-pulse rounded bg-muted/70" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                /* Enhanced empty state — large gradient circle with Bell icon */
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="relative mb-4">
                    {/* Soft pulsing glow behind the circle */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20"
                      style={{ animationDuration: "2.5s" }}
                    />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                      <Bell className="h-7 w-7" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold">No notifications yet</p>
                  <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                    Your analysis completions, premium updates, and activity
                    will appear here in real time.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {notifications.map((n) => {
                    const cfg = getIconConfig(n.icon, n.status);
                    const Icon = cfg.icon;
                    const isRecent =
                      Date.now() - new Date(n.createdAt).getTime() <
                      24 * 60 * 60 * 1000;
                    const isUnread = isRecent && !dismissedIds.has(n.id);
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => handleClick(n)}
                          className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-accent/60"
                        >
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color} ring-1 ring-inset ring-border/50 transition-transform group-hover:scale-105`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">
                                {n.title}
                              </p>
                              {isUnread && (
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/60" />
                                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                                </span>
                              )}
                            </div>
                            {n.detail && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {n.detail}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border/60 bg-muted/30 px-4 py-2.5">
                <p className="text-center text-[10px] text-muted-foreground">
                  Showing last {notifications.length} notifications • Refreshes every 30s
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
