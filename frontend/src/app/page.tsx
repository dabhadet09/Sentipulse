"use client";

import { useSession } from "next-auth/react";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { LandingPage } from "@/components/landing/landing-page";
import { AuthPages } from "@/components/auth/auth-pages";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { AdminPanel } from "@/components/admin/admin-panel";
import { SharedAnalysisView } from "@/components/shared/shared-analysis-view";
import { Loader2 } from "lucide-react";

function HomeContent() {
  const { data: session, status } = useSession();
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const searchParams = useSearchParams();
  const shareId = searchParams.get("share");

  // Sync view with auth state
  useEffect(() => {
    if (status === "loading") return;
    if (session?.user) {
      // Logged in
      if (session.user.role === "ADMIN") {
        setView("admin");
      } else {
        setView("dashboard");
      }
    } else {
      // Logged out
      if (view === "dashboard" || view === "admin") {
        setView("landing");
      }
    }
  }, [session, status, setView, view]);

  // Public share view — takes priority over everything else.
  // Rendered without auth requirement so anyone with the link can view.
  if (shareId) {
    return <SharedAnalysisView shareId={shareId} />;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading SentimentSense…</p>
        </div>
      </div>
    );
  }

  if (session?.user) {
    if (session.user.role === "ADMIN" && view === "admin") {
      return <AdminPanel />;
    }
    if (session.user.role !== "ADMIN" && view === "dashboard") {
      return <UserDashboard />;
    }
    // fallback
    if (session.user.role === "ADMIN") return <AdminPanel />;
    return <UserDashboard />;
  }

  // Not authenticated
  if (view === "login" || view === "register") {
    return <AuthPages />;
  }

  return <LandingPage />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading SentimentSense…</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
