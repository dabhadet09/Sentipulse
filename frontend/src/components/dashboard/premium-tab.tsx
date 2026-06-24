"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORMS, GROUP_INFO } from "@/lib/constants";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Crown,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Sparkles,
  Radio,
  Zap,
  ShieldCheck,
  FileText,
  TrendingUp,
  Send,
} from "lucide-react";

type PlatformId = keyof typeof PLATFORMS;

interface Application {
  id: string;
  reason: string;
  platform: string;
  useCase: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export function PremiumTab() {
  const { data: session } = useSession();
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);

  const isPremium =
    session?.user?.subscriptionTier === "PREMIUM" ||
    session?.user?.role === "ADMIN";

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState<PlatformId>("youtube");
  const [reason, setReason] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pendingApp = applications.find((a) => a.status === "PENDING");
  const hasPending = !!pendingApp;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/premium/apply");
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 20) {
      toast.error("Please provide a more detailed reason (min 20 characters).");
      return;
    }
    if (useCase.trim().length < 10) {
      toast.error("Please describe your use case (min 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/premium/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          platform,
          useCase: useCase.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }
      toast.success("Application submitted! It's now pending admin review.");
      setReason("");
      setUseCase("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isPremium) {
    return <PremiumActiveView onGoLive={() => setDashboardTab("livestream")} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Premium Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlock live stream analysis and advanced analytics features.
        </p>
      </div>

      {/* Benefits showcase */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Radio,
            title: "Live Stream Analysis",
            desc: "Real-time chat sentiment during broadcasts",
            color: "from-amber-500 to-orange-500",
          },
          {
            icon: Zap,
            title: "Priority Processing",
            desc: "Faster analysis on long content batches",
            color: "from-emerald-500 to-teal-600",
          },
          {
            icon: TrendingUp,
            title: "Trend Insights",
            desc: "Time-segment trend lines and running tallies",
            color: "from-rose-500 to-pink-500",
          },
          {
            icon: ShieldCheck,
            title: "Extended History",
            desc: "Keep more analyses on file forever",
            color: "from-violet-500 to-fuchsia-500",
          },
        ].map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.title} className="overflow-hidden">
              <CardContent className="p-4">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${b.color} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-amber-500" />
              Apply for Premium
            </CardTitle>
            <CardDescription>
              Tell us how you plan to use premium features. Our admin team
              reviews each application manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPending ? (
              <div className="flex flex-col items-center rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-semibold">Application under review</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  You submitted an application on{" "}
                  <span className="font-medium text-foreground">
                    {new Date(pendingApp.createdAt).toLocaleDateString()}
                  </span>
                  . Our admin team will review it shortly. You&apos;ll be able
                  to submit a new one once it&apos;s processed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setDashboardTab("overview")}
                >
                  Back to Overview
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">
                    Which platform do you want livestream analysis for?
                  </Label>
                  <Select
                    value={platform}
                    onValueChange={(v) => setPlatform(v as PlatformId)}
                  >
                    <SelectTrigger id="platform" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PLATFORMS) as PlatformId[]).map((id) => {
                        const P = PLATFORMS[id];
                        const Icon = P.icon;
                        return (
                          <SelectItem key={id} value={id}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {P.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Why do you want premium access?{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g. I'm doing my final-year project on real-time sentiment during live product launches and need to analyze chat reactions as they happen."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Min 20 characters</span>
                    <span className={reason.length < 20 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {reason.length} / 20
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="useCase">
                    Describe your use case{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="useCase"
                    placeholder="e.g. I plan to monitor YouTube livestream chats during product launch events to gauge audience sentiment in real time."
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Min 10 characters</span>
                    <span className={useCase.length < 10 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {useCase.length} / 10
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-4 w-4" />
                      Submit Application
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Application history */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Application History
            </CardTitle>
            <CardDescription>
              Your previous premium applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No applications yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submit your first premium application using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <ApplicationRow key={app.id} app={app} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group credit */}
      <Separator />
      <p className="text-center text-xs text-muted-foreground">
        SentimentSense Premium — Final Year Project by{" "}
        <span className="font-semibold gradient-text">
          Group No {GROUP_INFO.groupNumber}
        </span>{" "}
        • {GROUP_INFO.members.join(" • ")}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: Application["status"] }) {
  if (status === "PENDING") {
    return (
      <Badge className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  if (status === "APPROVED") {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-red-500/15 text-red-700 dark:text-red-400">
      <XCircle className="h-3 w-3" />
      Rejected
    </Badge>
  );
}

function ApplicationRow({ app }: { app: Application }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card/60 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {PLATFORMS[app.platform as PlatformId]?.label || app.platform}
          </p>
          <p className="mt-1 line-clamp-2 text-sm">{app.reason}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Applied {new Date(app.createdAt).toLocaleDateString()}
        {app.reviewedAt && (
          <> • Reviewed {new Date(app.reviewedAt).toLocaleDateString()}</>
        )}
      </div>
      {app.adminNote && (
        <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
          <span className="font-medium">Admin note: </span>
          {app.adminNote}
        </div>
      )}
    </motion.div>
  );
}

function PremiumActiveView({ onGoLive }: { onGoLive: () => void }) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-xl shadow-amber-500/30 sm:p-10"
      >
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur"
          >
            <Crown className="h-9 w-9" />
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
              Premium Active
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            You&apos;re a Premium Member!
          </h2>
          <p className="mt-2 max-w-lg text-amber-50/90">
            Thank you for being part of SentimentSense Premium. You now have
            access to live stream analysis, advanced insights, and priority
            processing — all powered by our fine-tuned transformer model.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={onGoLive}
              className="bg-white text-amber-700 hover:bg-amber-50"
            >
              <Radio className="mr-1.5 h-4 w-4" />
              Start a Live Stream
            </Button>
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              New Analysis
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Radio,
            title: "Live Stream Analysis",
            desc: "Monitor chat sentiment in real time during broadcasts.",
            color: "from-amber-500 to-orange-500",
          },
          {
            icon: Zap,
            title: "Priority Processing",
            desc: "Faster turnaround on long content batches.",
            color: "from-emerald-500 to-teal-600",
          },
          {
            icon: TrendingUp,
            title: "Trend Insights",
            desc: "Time-segment trends and running tally dashboards.",
            color: "from-rose-500 to-pink-500",
          },
          {
            icon: ShieldCheck,
            title: "Extended History",
            desc: "Keep more analyses on file for longer.",
            color: "from-violet-500 to-fuchsia-500",
          },
          {
            icon: FileText,
            title: "PDF Reports",
            desc: "Branded, multi-page PDF exports for every analysis.",
            color: "from-cyan-500 to-emerald-500",
          },
          {
            icon: Sparkles,
            title: "Early Access",
            desc: "Be first to try new model improvements and features.",
            color: "from-violet-500 to-fuchsia-500",
          },
        ].map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.title}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${b.color} text-white shadow-md`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{b.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                  <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
