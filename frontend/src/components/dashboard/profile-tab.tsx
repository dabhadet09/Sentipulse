"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { GROUP_INFO } from "@/lib/constants";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Mail,
  Calendar,
  Shield,
  Crown,
  User,
  Save,
  Loader2,
  Edit3,
  BarChart3,
  FileText,
  GraduationCap,
  Sparkles,
  Award,
  Flame,
  Rocket,
  Target,
  Trophy,
  Zap,
  Star,
  CheckCircle2,
  History,
  LogIn,
  Crown as CrownIcon,
  Trash2,
  Download,
  Radio,
  Send,
  UserCog,
  Clock,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  subscriptionTier: string;
  bio: string | null;
  avatar: string | null;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: "activity" | "premium";
  icon: string;
  title: string;
  detail: string | null;
  createdAt: string;
  status?: string;
}

interface ActivityLogEntry {
  id: string;
  action: string;
  label: string;
  detail: string | null;
  createdAt: string;
}

export function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loadingActivityLog, setLoadingActivityLog] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, notifRes, activityRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/notifications"),
          fetch("/api/me/activity"),
        ]);
        if (cancelled) return;
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.user);
          setAnalysisCount(data.analysisCount || 0);
          setApplicationCount(data.applicationCount || 0);
          setName(data.user?.name || "");
          setBio(data.user?.bio || "");
        }
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setActivities((notifData.notifications || []).slice(0, 8));
        }
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivityLog(activityData.activities || []);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingActivities(false);
          setLoadingActivityLog(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }
      setProfile((prev) =>
        prev ? { ...prev, name: data.user.name, bio: data.user.bio } : prev
      );
      toast.success("Profile updated");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(profile?.name || "");
    setBio(profile?.bio || "");
    setEditing(false);
  }

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="mt-4 h-20 w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPremium = profile.subscriptionTier === "PREMIUM";
  const isAdmin = profile.role === "ADMIN";
  const initials = (profile.name || profile.email)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // ---- Achievements computation ----
  // Account age in days
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  type Achievement = {
    id: string;
    label: string;
    description: string;
    icon: typeof Award;
    color: string;
    earned: boolean;
    progress?: { current: number; target: number };
  };
  const achievements: Achievement[] = [
    {
      id: "first-step",
      label: "First Step",
      description: "Created your SentimentSense account",
      icon: Rocket,
      color: "from-emerald-500 to-teal-600",
      earned: true,
    },
    {
      id: "first-analysis",
      label: "First Analysis",
      description: "Ran your first sentiment analysis",
      icon: Sparkles,
      color: "from-emerald-500 to-green-500",
      earned: analysisCount >= 1,
    },
    {
      id: "getting-started",
      label: "Getting Started",
      description: "Run 3 analyses",
      icon: Target,
      color: "from-cyan-500 to-emerald-500",
      earned: analysisCount >= 3,
      progress: { current: Math.min(analysisCount, 3), target: 3 },
    },
    {
      id: "power-user",
      label: "Power User",
      description: "Run 10 analyses",
      icon: Zap,
      color: "from-amber-500 to-orange-500",
      earned: analysisCount >= 10,
      progress: { current: Math.min(analysisCount, 10), target: 10 },
    },
    {
      id: "sentiment-pro",
      label: "Sentiment Pro",
      description: "Run 25 analyses",
      icon: Trophy,
      color: "from-violet-500 to-fuchsia-500",
      earned: analysisCount >= 25,
      progress: { current: Math.min(analysisCount, 25), target: 25 },
    },
    {
      id: "premium-member",
      label: "Premium Member",
      description: "Unlocked premium features",
      icon: Crown,
      color: "from-amber-400 to-orange-500",
      earned: isPremium,
    },
    {
      id: "admin-recognized",
      label: "Admin Recognized",
      description: "Trusted with admin privileges",
      icon: Shield,
      color: "from-emerald-600 to-teal-700",
      earned: isAdmin,
    },
    {
      id: "loyal-member",
      label: "Loyal Member",
      description: "Active for 7+ days",
      icon: Flame,
      color: "from-rose-500 to-red-500",
      earned: accountAgeDays >= 7,
      progress: { current: Math.min(accountAgeDays, 7), target: 7 },
    },
  ];
  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalAchievements = achievements.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account info and view your activity stats.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 ring-4 ring-emerald-500/15">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-3 text-lg font-bold">
                {profile.name || "Unnamed User"}
              </h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>

              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {isAdmin ? (
                  <Badge className="gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    Member
                  </Badge>
                )}
                {isPremium ? (
                  <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <Crown className="h-3 w-3" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Free Tier
                  </Badge>
                )}
              </div>

              <Separator className="my-5" />

              <div className="w-full space-y-2.5 text-left">
                <InfoRow
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="Email"
                  value={profile.email}
                />
                <InfoRow
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Member since"
                  value={new Date(profile.createdAt).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "long", day: "numeric" }
                  )}
                />
                <InfoRow
                  icon={<Shield className="h-3.5 w-3.5" />}
                  label="Role"
                  value={profile.role}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable info + stats */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Analyses Run"
              value={analysisCount}
              color="from-emerald-500 to-teal-600"
            />
            <StatCard
              icon={<FileText className="h-4 w-4" />}
              label="Applications"
              value={applicationCount}
              color="from-amber-500 to-orange-500"
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="Plan"
              value={isPremium ? "Premium" : "Free"}
              color={isPremium ? "from-amber-500 to-orange-500" : "from-violet-500 to-fuchsia-500"}
            />
          </div>

          {/* Achievements */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-4 w-4 text-primary" />
                    Achievements
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Earn badges as you use SentimentSense
                  </CardDescription>
                </div>
                <Badge className="gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                  <Trophy className="h-3 w-3" />
                  {earnedCount} / {totalAchievements}
                </Badge>
              </div>
              {/* Overall progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(earnedCount / totalAchievements) * 100}%`,
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {achievements.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className={`group relative flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                        a.earned
                          ? "border-border/70 bg-gradient-to-b from-card to-muted/30 shadow-sm hover:shadow-md"
                          : "border-dashed border-border/60 bg-muted/20 opacity-70"
                      }`}
                    >
                      {/* Earned check */}
                      {a.earned && (
                        <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      )}
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          a.earned
                            ? `bg-gradient-to-br ${a.color} text-white shadow-md`
                            : "bg-muted text-muted-foreground grayscale"
                        } transition-transform group-hover:scale-105`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          a.earned ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {a.label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        {a.description}
                      </p>
                      {a.progress && !a.earned && (
                        <div className="mt-2 w-full">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                              style={{
                                width: `${
                                  (a.progress.current / a.progress.target) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <p className="mt-0.5 text-[9px] text-muted-foreground">
                            {a.progress.current}/{a.progress.target}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity — from ActivityLog */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Your recent actions on SentimentSense
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivityLog ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-36" />
                        <Skeleton className="h-2.5 w-24" />
                      </div>
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : activityLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <History className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">No activity yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your recent actions will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="relative space-y-0">
                    {activityLog.map((entry, i) => {
                      const dotColor = activityDotColor(entry.action);
                      const isLast = i === activityLog.length - 1;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
                          className="relative flex items-start gap-3 pb-4"
                        >
                          {/* Connector line */}
                          {!isLast && (
                            <span
                              className="absolute left-[5px] top-3 h-full w-px bg-border"
                              aria-hidden
                            />
                          )}
                          {/* Dot */}
                          <span
                            className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background ${dotColor}`}
                            aria-hidden
                          />
                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold leading-tight">
                              {entry.label}
                            </p>
                            {entry.detail && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                {entry.detail}
                              </p>
                            )}
                          </div>
                          <time className="shrink-0 pt-0.5 text-[10px] tabular-nums text-muted-foreground">
                            {timeAgo(entry.createdAt)}
                          </time>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editable name + bio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary" />
                  Account Details
                </span>
                {!editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Edit3 className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
              </CardTitle>
              <CardDescription>Update your display name and bio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editing || saving}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!editing || saving}
                  placeholder="Tell us a bit about yourself…"
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length} characters
                </p>
              </div>
              {editing && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Your last 8 actions on SentimentSense
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock className="h-2.5 w-2.5" />
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <History className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium">No activity yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your recent actions will appear here.
                  </p>
                </div>
              ) : (
                <ol className="relative space-y-1">
                  {/* Vertical line */}
                  <span
                    className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-emerald-500/40 via-border to-transparent"
                    aria-hidden
                  />
                  {activities.map((a, i) => {
                    const meta = activityMeta(a.icon, a.type);
                    const Icon = meta.icon;
                    return (
                      <motion.li
                        key={a.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.05, 0.4) }}
                        className="relative flex items-start gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-muted/40"
                      >
                        <div
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${meta.color} text-white shadow-sm ring-2 ring-background`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-xs font-semibold leading-tight">
                            {a.title}
                          </p>
                          {a.detail && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              {a.detail}
                            </p>
                          )}
                        </div>
                        <time className="shrink-0 pt-0.5 text-[10px] tabular-nums text-muted-foreground">
                          {timeAgo(a.createdAt)}
                        </time>
                      </motion.li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Group credit */}
          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Final Year Project
                  </p>
                  <h3 className="mt-0.5 text-base font-bold">
                    Group No {GROUP_INFO.groupNumber}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Computer Engineering
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {GROUP_INFO.members.map((m) => (
                      <Badge key={m} variant="outline" className="font-medium">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium capitalize">{value}</span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${color} text-white`}
          >
            {icon}
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold capitalize tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Maps a notification icon/type string to a lucide icon + tailwind gradient.
 */
function activityMeta(
  icon: string,
  type: "activity" | "premium"
): { icon: typeof History; color: string } {
  if (type === "premium" || icon === "premium") {
    return { icon: CrownIcon, color: "from-amber-500 to-orange-500" };
  }
  const map: Record<string, { icon: typeof History; color: string }> = {
    login: { icon: LogIn, color: "from-emerald-500 to-teal-600" },
    register: { icon: Rocket, color: "from-emerald-500 to-teal-600" },
    analysis: { icon: BarChart3, color: "from-emerald-500 to-green-500" },
    analysis_created: { icon: BarChart3, color: "from-emerald-500 to-green-500" },
    apply_premium: { icon: Send, color: "from-amber-500 to-orange-500" },
    premium_submitted: { icon: Send, color: "from-amber-500 to-orange-500" },
    premium_approved: { icon: CrownIcon, color: "from-amber-400 to-orange-500" },
    premium_rejected: { icon: CrownIcon, color: "from-rose-500 to-red-500" },
    download_report: { icon: Download, color: "from-cyan-500 to-emerald-500" },
    profile_updated: { icon: UserCog, color: "from-violet-500 to-fuchsia-500" },
    delete_analysis: { icon: Trash2, color: "from-rose-500 to-red-500" },
    livestream_segment: { icon: Radio, color: "from-amber-500 to-orange-500" },
  };
  return map[icon] || { icon: Sparkles, color: "from-emerald-500 to-teal-600" };
}

/**
 * Human-friendly relative time, e.g. "5m ago", "2h ago", "3d ago".
 */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

/**
 * Returns a tailwind bg class for the timeline dot based on action type.
 * emerald for positive, amber for pending, gray for neutral.
 */
function activityDotColor(action: string): string {
  const positive = [
    "login",
    "analysis_created",
    "account_created",
    "register",
    "premium_approved",
    "download_report",
    "livestream_segment",
  ];
  const pending = [
    "premium_applied",
    "apply_premium",
    "premium_submitted",
    "profile_updated",
  ];
  if (positive.includes(action)) return "bg-emerald-500";
  if (pending.includes(action)) return "bg-amber-500";
  return "bg-muted-foreground/40";
}
