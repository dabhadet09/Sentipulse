"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Search,
  Users as UsersIcon,
  Crown,
  ShieldCheck,
  Loader2,
  MoreHorizontal,
  UserCog,
  ShieldOff,
  Crown as CrownIcon,
  Ban,
  Trash2,
  AlertTriangle,
  Mail,
  CalendarDays,
  BarChart3,
  RefreshCw,
  ShieldAlert,
  Eye,
  ExternalLink,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SentimentBadge,
  PlatformBadge,
  PremiumBadge,
} from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import { getPlatform, getSentiment } from "@/lib/constants";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  createdAt: string;
  bio: string | null;
  _count: {
    analyses: number;
    applications: number;
    activityLogs: number;
  };
}

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
      >
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
    >
      User
    </Badge>
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === "PREMIUM") {
    return (
      <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-white">
        <CrownIcon className="h-3 w-3" />
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

export function UsersTab() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users as AdminUser[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totals = useMemo(() => {
    const total = users.length;
    const premium = users.filter((u) => u.subscriptionTier === "PREMIUM").length;
    const admins = users.filter((u) => u.role === "ADMIN").length;
    return { total, premium, admins };
  }, [users]);

  const handleAction = async (
    user: AdminUser,
    action:
      | "make_admin"
      | "remove_admin"
      | "grant_premium"
      | "revoke_premium"
  ) => {
    setActionLoading(user.id + action);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...data.user } : u))
      );
      toast.success(`Updated ${user.name}'s account`, {
        description: action.replace(/_/g, " "),
      });
    } catch (e) {
      toast.error("Failed to update user", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id + "delete");
    try {
      const res = await fetch(
        `/api/admin/users?userId=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success(`Deleted ${deleteTarget.name}`, {
        description: deleteTarget.email,
      });
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Failed to delete user", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-medium">Failed to load users</p>
          <Button size="sm" onClick={fetchUsers} variant="outline">
            <RefreshCw className="mr-1.5 h-4 w-4" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <UsersIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total Users
              </p>
              <p className="text-2xl font-bold tabular-nums leading-tight">
                {totals.total}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Premium Users
              </p>
              <p className="text-2xl font-bold tabular-nums leading-tight">
                {totals.premium}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Admins
              </p>
              <p className="text-2xl font-bold tabular-nums leading-tight">
                {totals.admins}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + refresh */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {filtered.length} shown
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead className="text-center">Analyses</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UsersIcon className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No users match your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isAdmin = u.role === "ADMIN";
                  const isPremium = u.subscriptionTier === "PREMIUM";
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarFallback
                              className={cn(
                                "text-xs font-bold text-white",
                                isAdmin
                                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                                  : "bg-gradient-to-br from-slate-500 to-slate-600"
                              )}
                            >
                              {initials(u.name) || u.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium">
                                {u.name}
                              </p>
                              {isSelf && (
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 text-[9px] text-muted-foreground"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <TierBadge tier={u.subscriptionTier} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-semibold tabular-nums">
                            {u._count.analyses}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {u._count.applications} apps
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs">
                            {format(new Date(u.createdAt), "MMM d, yyyy")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(u.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={actionLoading?.startsWith(u.id)}
                            >
                              {actionLoading?.startsWith(u.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Manage {u.name.split(" ")[0]}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!isAdmin ? (
                              <DropdownMenuItem
                                onClick={() => handleAction(u, "make_admin")}
                                className="gap-2 text-emerald-600 focus:text-emerald-700 dark:text-emerald-400 dark:focus:text-emerald-300"
                              >
                                <UserCog className="h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            ) : (
                              !isSelf && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(u, "remove_admin")
                                  }
                                  className="gap-2"
                                >
                                  <ShieldOff className="h-4 w-4" />
                                  Remove Admin
                                </DropdownMenuItem>
                              )
                            )}
                            {!isPremium ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(u, "grant_premium")
                                }
                                className="gap-2 text-amber-600 focus:text-amber-700 dark:text-amber-400 dark:focus:text-amber-300"
                              >
                                <CrownIcon className="h-4 w-4" />
                                Grant Premium
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(u, "revoke_premium")
                                }
                                className="gap-2"
                              >
                                <Ban className="h-4 w-4" />
                                Revoke Premium
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Account
                            </DropdownMenuLabel>
                            <div className="flex flex-col gap-1 px-2 py-1.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{u.email}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <BarChart3 className="h-3 w-3" />
                                {u._count.analyses} analyses
                              </span>
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3" />
                                {formatDistanceToNow(new Date(u.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setViewUser(u)}
                              className="gap-2 text-primary focus:text-primary"
                            >
                              <Eye className="h-4 w-4" />
                              View Analyses
                            </DropdownMenuItem>
                            {!isSelf && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(u)}
                                  className="gap-2 text-rose-600 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile legend hint */}
      <p className="text-center text-[11px] text-muted-foreground lg:hidden">
        Tip: swipe the table horizontally to see all columns.
      </p>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              Delete user account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              ({deleteTarget?.email}). This will also cascade-delete all of
              their{" "}
              <span className="font-medium">
                {deleteTarget?._count.analyses}
              </span>{" "}
              analyses,{" "}
              <span className="font-medium">
                {deleteTarget?._count.applications}
              </span>{" "}
              applications, and{" "}
              <span className="font-medium">
                {deleteTarget?._count.activityLogs}
              </span>{" "}
              activity logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!actionLoading}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500/30"
            >
              {actionLoading?.endsWith("delete") ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete forever
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Analyses Dialog */}
      {viewUser && (
        <ViewUserDialog user={viewUser} onClose={() => setViewUser(null)} />
      )}
    </div>
  );
}

function ViewUserDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const [analyses, setAnalyses] = useState<
    Array<{
      id: string;
      platform: string;
      contentType: string;
      title: string;
      overallSentiment: string;
      sentimentScore: number;
      itemCount: number;
      isPremium: boolean;
      createdAt: string;
    }>
  >([]);
  const [stats, setStats] = useState<{
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/users/${user.id}/analyses`
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!cancelled) {
          setAnalyses(data.analyses || []);
          setStats(data.stats || null);
        }
      } catch {
        toast.error("Failed to load user analyses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-emerald-500/20">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-lg">
                {user.name}
                {user.role === "ADMIN" && (
                  <Badge className="bg-emerald-500/10 text-emerald-600">ADMIN</Badge>
                )}
                {user.subscriptionTier === "PREMIUM" && (
                  <PremiumBadge />
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                {user.email}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <ExternalLink className="h-3 w-3" />
              Read-only view
            </Badge>
          </div>

          {/* Quick stats */}
          {!loading && stats && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-background/60 p-2 text-center">
                <p className="text-lg font-bold tabular-nums">{stats.total}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </p>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                <p className="text-lg font-bold tabular-nums text-emerald-600">
                  {stats.positive}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Positive
                </p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2 text-center">
                <p className="text-lg font-bold tabular-nums text-red-600">
                  {stats.negative}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Negative
                </p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                <p className="text-lg font-bold tabular-nums text-amber-600">
                  {stats.neutral}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Neutral
                </p>
              </div>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No analyses yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This user hasn&apos;t run any sentiment analyses.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.map((a) => {
                const p = getPlatform(a.platform);
                const Icon = p.icon;
                const sentiment = getSentiment(a.overallSentiment);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:bg-accent/30"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${p.gradient} text-white`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <PlatformBadge platform={a.platform} />
                        <SentimentBadge sentiment={a.overallSentiment} />
                        {a.isPremium && <PremiumBadge />}
                        <span className="text-[11px] text-muted-foreground">
                          {a.itemCount} items •{" "}
                          {formatDistanceToNow(new Date(a.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <div
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums"
                      style={{
                        color: sentiment.color,
                        backgroundColor: `${sentiment.color}15`,
                      }}
                    >
                      {a.sentimentScore > 0 ? "+" : ""}
                      {a.sentimentScore.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
