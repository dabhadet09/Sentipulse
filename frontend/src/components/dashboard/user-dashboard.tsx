"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAppStore, type DashboardTab } from "@/store/app-store";
import { Footer } from "@/components/shared/footer";
import { PremiumBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Brain,
  LayoutDashboard,
  Sparkles,
  History,
  Radio,
  Crown,
  UserCircle,
  Menu,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  GitCompare,
  Search,
  HelpCircle,
  ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OverviewTab } from "./overview-tab";
import { NewAnalysisTab } from "./new-analysis-tab";
import { MyAnalysesTab } from "./my-analyses-tab";
import { CompareTab } from "./compare-tab";
import { LivestreamTab } from "./livestream-tab";
import { PremiumTab } from "./premium-tab";
import { ProfileTab } from "./profile-tab";
import { AnalysisDetail } from "./analysis-detail";
import { NotificationsBell } from "./notifications-bell";
import { CommandPalette } from "./command-palette";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { OnboardingTour } from "./onboarding-tour";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
  premium?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "new-analysis", label: "New Analysis", icon: Sparkles },
  { id: "my-analyses", label: "My Analyses", icon: History },
  { id: "compare", label: "Compare", icon: GitCompare },
  { id: "livestream", label: "Live Stream", icon: Radio, premium: true },
  { id: "premium", label: "Premium", icon: Crown },
  { id: "profile", label: "Profile", icon: UserCircle },
];

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
        <Brain className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-base font-bold tracking-tight">
          Sentiment<span className="text-primary">Sense</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          AI Sentiment Analytics
        </div>
      </div>
    </div>
  );
}

function SidebarNav({
  activeTab,
  onNavigate,
}: {
  activeTab: DashboardTab;
  onNavigate: (tab: DashboardTab) => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            data-tour={
              item.id === "new-analysis"
                ? "new-analysis"
                : item.id === "my-analyses"
                  ? "my-analyses"
                  : item.id === "premium"
                    ? "premium"
                    : undefined
            }
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {/* Active left accent bar */}
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-emerald-500 to-teal-600"
              />
            )}
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                active
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-muted/80 dark:bg-muted/60 text-foreground/60 dark:text-foreground/70 group-hover:bg-accent-foreground/10 group-hover:scale-105"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.premium && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-600 ring-1 ring-inset ring-amber-500/30 shadow-sm shadow-amber-500/20 dark:text-amber-400">
                <Crown className="h-2.5 w-2.5" />
                Pro
              </span>
            )}
            {active && !item.premium && (
              <ChevronRight className="ml-auto h-4 w-4 text-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserDashboard() {
  const { data: session } = useSession();
  const dashboardTab = useAppStore((s) => s.dashboardTab);
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);
  const selectedAnalysisId = useAppStore((s) => s.selectedAnalysisId);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setShortcutsHelpOpen = useAppStore((s) => s.setShortcutsHelpOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPremium =
    session?.user?.subscriptionTier === "PREMIUM" ||
    session?.user?.role === "ADMIN";

  const userName = session?.user?.name || "User";
  const initials = initialsOf(userName);

  const handleNav = (tab: DashboardTab) => {
    setDashboardTab(tab);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-[0_1px_0_0_rgba(16,185,129,0.1)]">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Left: mobile menu + logo */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <BrandLogo />
                <SidebarNav activeTab={dashboardTab} onNavigate={handleNav} />
                <div className="mt-auto border-t border-border/60 p-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{userName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {session?.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Brain className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight">
                Sentiment<span className="text-primary">Sense</span>
              </span>
            </div>

            <div className="hidden lg:block">
              <span className="text-sm font-medium text-muted-foreground">
                {NAV_ITEMS.find((n) => n.id === dashboardTab)?.label}
              </span>
            </div>
          </div>

          {/* Right: user info + theme + sign out */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isPremium && <PremiumBadge className="hidden sm:inline-flex" />}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden h-9 gap-2 px-3 text-muted-foreground hover:text-foreground md:inline-flex"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search…</span>
              <kbd className="ml-2 hidden select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
                <span>⌘</span>K
              </kbd>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open command palette"
              className="h-9 w-9 md:hidden"
            >
              <Search className="h-4 w-4" />
            </Button>

            <div className="mx-0.5 hidden h-6 w-px bg-border/60 sm:block" />

            <NotificationsBell />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShortcutsHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              className="hidden h-9 w-9 sm:inline-flex"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme (T)"
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <div className="hidden items-center gap-2.5 rounded-full border border-border/70 bg-gradient-to-r from-card to-muted/40 py-1 pl-1 pr-3 shadow-sm sm:flex">
              <Avatar className="h-7 w-7 ring-2 ring-emerald-500/15">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <div className="text-xs font-semibold">{userName}</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {isPremium ? (
                    <>
                      <Crown className="h-2.5 w-2.5 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">Premium</span>
                    </>
                  ) : (
                    <span className="text-foreground/70">Free tier</span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ redirect: false })}
              aria-label="Sign out"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-sidebar/50 lg:block">
          <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col">
            <BrandLogo />
            <SidebarNav activeTab={dashboardTab} onNavigate={handleNav} />
            <div className="mt-auto border-t border-border/60 p-4">
              {isPremium ? (
                <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3 ring-1 ring-amber-500/20">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Crown className="h-3.5 w-3.5" />
                    Premium Active
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Live stream & advanced analytics unlocked.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setDashboardTab("premium")}
                  className="group w-full rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-3 text-left text-white shadow-md shadow-emerald-500/20 transition-transform hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Crown className="h-3.5 w-3.5" />
                    Upgrade to Premium
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-50/90">
                    Unlock live stream analysis & more.
                  </p>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAnalysisId ? `detail-${selectedAnalysisId}` : dashboardTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                {selectedAnalysisId ? (
                  <AnalysisDetail />
                ) : dashboardTab === "overview" ? (
                  <OverviewTab />
                ) : dashboardTab === "new-analysis" ? (
                  <NewAnalysisTab />
                ) : dashboardTab === "my-analyses" ? (
                  <MyAnalysesTab />
                ) : dashboardTab === "compare" ? (
                  <CompareTab />
                ) : dashboardTab === "livestream" ? (
                  <LivestreamTab />
                ) : dashboardTab === "premium" ? (
                  <PremiumTab />
                ) : dashboardTab === "profile" ? (
                  <ProfileTab />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Footer />

      <CommandPalette />
      <KeyboardShortcutsHelp />
      {session && <OnboardingTour />}

      <ScrollToTopButton />
    </div>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-lg backdrop-blur-xl transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
