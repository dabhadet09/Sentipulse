"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  LayoutDashboard,
  Users,
  FileCheck2,
  Activity,
  Menu,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";

import { useAppStore, type AdminTab } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Footer } from "@/components/shared/footer";
import { cn } from "@/lib/utils";

import { OverviewTab } from "./overview-tab";
import { UsersTab } from "./users-tab";
import { ApplicationsTab } from "./applications-tab";
import { ActivityTab } from "./activity-tab";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";

const NAV_ITEMS: {
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Platform stats & insights",
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    description: "Manage accounts & roles",
  },
  {
    id: "applications",
    label: "Applications",
    icon: FileCheck2,
    description: "Review premium requests",
  },
  {
    id: "activity",
    label: "Activity Log",
    icon: Activity,
    description: "Recent platform events",
  },
];

function NavList({ onNavigate }: { onNavigate?: (id: AdminTab) => void }) {
  const adminTab = useAppStore((s) => s.adminTab);
  return (
    <nav className="flex flex-col gap-1.5 px-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = adminTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className={cn(
              "group relative flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
              active
                ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="admin-nav-indicator"
                className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-emerald-500 to-teal-600"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 transition-colors",
                active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                {item.label}
              </span>
              <span className="text-[11px] text-muted-foreground/80 leading-tight">
                {item.description}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

export function AdminPanel() {
  const { data: session } = useSession();
  const adminTab = useAppStore((s) => s.adminTab);
  const setAdminTab = useAppStore((s) => s.setAdminTab);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem =
    NAV_ITEMS.find((n) => n.id === adminTab) ?? NAV_ITEMS[0];

  const handleNav = (id: AdminTab) => {
    setAdminTab(id);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-2 px-4 sm:px-6">
          {/* Left: logo + mobile menu */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <div className="flex h-14 items-center gap-2 border-b border-border px-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold leading-tight">
                      SentimentSense
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Admin Console
                    </p>
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </SheetClose>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                  <NavList onNavigate={handleNav} />
                </div>
                <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
                  Group No 38 · Final Year Project
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <Brain className="h-4 w-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold leading-tight">
                  SentimentSense{" "}
                  <span className="text-muted-foreground">Admin</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Command Center · Group 38
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="ml-2 hidden items-center gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 sm:flex"
            >
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          </div>

          {/* Right: theme + user + sign out */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <NotificationsBell />

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <div className="hidden items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1 sm:flex">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white">
                {(session?.user?.name ?? "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium">
                  {session?.user?.name ?? "Admin"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {session?.user?.email}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="gap-1.5 border-border"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 lg:block">
          <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Management
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              <NavList onNavigate={handleNav} />
            </div>
            <div className="border-t border-border p-4">
              <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3">
                <p className="text-[11px] font-semibold text-foreground">
                  Admin Console
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  Manage users, review premium applications, and monitor
                  platform activity.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border bg-card/30 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
                  <activeItem.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  {activeItem.label}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {activeItem.description}
                </p>
              </div>
              <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live data
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={adminTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {adminTab === "overview" && <OverviewTab />}
                {adminTab === "users" && <UsersTab />}
                {adminTab === "applications" && <ApplicationsTab />}
                {adminTab === "activity" && <ActivityTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
