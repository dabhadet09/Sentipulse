"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAppStore, type DashboardTab } from "@/store/app-store";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Sparkles,
  History,
  GitCompare,
  Radio,
  Crown,
  UserCircle,
  Sun,
  Moon,
  Search,
  ArrowUp,
  LogOut,
  TrendingUp,
  FileText,
  BarChart3,
  Plus,
  FlaskConical,
  Download,
  CornerDownLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface AnalysisQuickItem {
  id: string;
  title: string;
  platform: string;
  sentiment: string;
  createdAt: string;
}

const NAV_ITEMS: { id: DashboardTab; label: string; icon: typeof LayoutDashboard; iconKey: string; hint: string; shortcut?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, iconKey: "LayoutDashboard", hint: "Dashboard home", shortcut: "G O" },
  { id: "new-analysis", label: "New Analysis", icon: Sparkles, iconKey: "Sparkles", hint: "Run a new sentiment analysis", shortcut: "G N" },
  { id: "my-analyses", label: "My Analyses", icon: History, iconKey: "History", hint: "Browse past analyses", shortcut: "G M" },
  { id: "compare", label: "Compare", icon: GitCompare, iconKey: "GitCompare", hint: "Compare analyses side-by-side", shortcut: "G C" },
  { id: "livestream", label: "Live Stream", icon: Radio, iconKey: "Radio", hint: "Real-time chat analysis (Premium)", shortcut: "G L" },
  { id: "premium", label: "Premium", icon: Crown, iconKey: "Crown", hint: "Apply for premium access", shortcut: "G P" },
  { id: "profile", label: "Profile", icon: UserCircle, iconKey: "UserCircle", hint: "View your profile & achievements", shortcut: "G U" },
];

const RECENT_KEY = "sentimentsense_recent_cmds";
const MAX_RECENT = 4;

/**
 * Persist the user's recently-selected command IDs in localStorage so we can
 * surface a "Recent" group at the top of the palette. Each entry stores the
 * command id, a display label, and an icon key so we can re-render the entry
 * without re-fetching.
 */
interface RecentCommand {
  id: string;
  label: string;
  iconKey: string;
  tab?: DashboardTab;
}

function loadRecent(): RecentCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCommand[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecent(items: RecentCommand[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    // ignore quota / private mode errors
  }
}

/**
 * Highlight matching portions of `text` against `query`. Wraps matched
 * substrings in <mark> with a subtle bg. Returns the original text as a
 * single string when the query is empty so React can render it cheaply.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  // Case-insensitive, but keep the original casing in output.
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      out.push(<span key={`r-${key++}`}>{text.slice(cursor)}</span>);
      break;
    }
    if (idx > cursor) {
      out.push(<span key={`p-${key++}`}>{text.slice(cursor, idx)}</span>);
    }
    out.push(
      <mark
        key={`m-${key++}`}
        className="rounded bg-emerald-500/25 px-0.5 font-semibold text-foreground"
      >
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    cursor = idx + q.length;
  }
  return <>{out}</>;
}

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);
  const setSelectedAnalysisId = useAppStore((s) => s.setSelectedAnalysisId);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const { data: session } = useSession();

  const [analyses, setAnalyses] = useState<AnalysisQuickItem[]>([]);
  const [recent, setRecent] = useState<RecentCommand[]>([]);
  const [search, setSearch] = useState("");

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  // Load recent commands from localStorage on open.
  // The eslint rule normally discourages calling setState inside an effect,
  // but here it is the intended pattern: localStorage is browser-only, so we
  // MUST defer the read until after hydration to avoid SSR/client divergence.
  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is browser-only */
  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset search when palette closes
  /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on close */
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch recent analyses when palette opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/analyses")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.analyses) return;
        setAnalyses(
          (data.analyses as AnalysisQuickItem[]).slice(0, 6)
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const userName = session?.user?.name?.split(" ")[0] || "user";

  const go = useCallback(
    (tab: DashboardTab, label: string, iconKey: string) => {
      setSelectedAnalysisId(null);
      setDashboardTab(tab);
      setOpen(false);
      // Persist to recent
      const next = [
        { id: `nav:${tab}`, label, iconKey, tab },
        ...loadRecent().filter((r) => r.id !== `nav:${tab}`),
      ].slice(0, MAX_RECENT);
      saveRecent(next);
      setRecent(next);
    },
    [setDashboardTab, setSelectedAnalysisId, setOpen]
  );

  const openAnalysis = useCallback(
    (id: string, title: string) => {
      setSelectedAnalysisId(id);
      setOpen(false);
      const next = [
        { id: `analysis:${id}`, label: title, iconKey: "FileText", tab: "my-analyses" as DashboardTab },
        ...loadRecent().filter((r) => r.id !== `analysis:${id}`),
      ].slice(0, MAX_RECENT);
      saveRecent(next);
      setRecent(next);
    },
    [setSelectedAnalysisId, setOpen]
  );

  const runSample = useCallback(() => {
    setDashboardTab("new-analysis");
    setOpen(false);
    const next = [
      { id: "quick:sample", label: "Run Sample Analysis", iconKey: "FlaskConical", tab: "new-analysis" as DashboardTab },
      ...loadRecent().filter((r) => r.id !== "quick:sample"),
    ].slice(0, MAX_RECENT);
    saveRecent(next);
    setRecent(next);
  }, [setDashboardTab, setOpen]);

  const exportAll = useCallback(() => {
    setDashboardTab("my-analyses");
    setOpen(false);
    const next = [
      { id: "quick:export", label: "Export All Analyses", iconKey: "Download", tab: "my-analyses" as DashboardTab },
      ...loadRecent().filter((r) => r.id !== "quick:export"),
    ].slice(0, MAX_RECENT);
    saveRecent(next);
    setRecent(next);
  }, [setDashboardTab, setOpen]);

  const toggleThemeCmd = useCallback(() => {
    toggleTheme();
    setOpen(false);
    const next = [
      { id: "quick:theme", label: "Toggle Theme", iconKey: "Sun", tab: "overview" as DashboardTab },
      ...loadRecent().filter((r) => r.id !== "quick:theme"),
    ].slice(0, MAX_RECENT);
    saveRecent(next);
    setRecent(next);
  }, [toggleTheme, setOpen]);

  const recentAnalyses = useMemo(() => analyses.slice(0, 5), [analyses]);

  // Icon resolver for recent commands
  function renderRecentIcon(iconKey: string) {
    const map: Record<string, typeof LayoutDashboard> = {
      LayoutDashboard,
      Sparkles,
      History,
      GitCompare,
      Radio,
      Crown,
      UserCircle,
      FlaskConical,
      Download,
      Sun,
      Moon,
      FileText,
    };
    const Icon = map[iconKey] ?? FileText;
    return <Icon className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />;
  }

  function selectRecent(r: RecentCommand) {
    if (r.tab) {
      setDashboardTab(r.tab);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 shadow-2xl max-w-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search and navigate SentimentSense quickly.
        </DialogDescription>
        <Command className="rounded-lg" loop>
          <div className="flex items-center border-b border-border/60 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder={`What do you want to do, ${userName}?`}
              value={search}
              onValueChange={setSearch}
              className="h-12 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
            />
            <kbd className="ml-auto hidden shrink-0 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
              <ArrowUp className="h-2.5 w-2.5" />K
            </kbd>
          </div>
          <CommandList className="max-h-[420px] overflow-y-auto p-1">
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-2 h-6 w-6 opacity-40" />
              No matches found.
            </CommandEmpty>

            {/* Recent commands — only show when no search query */}
            {!search.trim() && recent.length > 0 && (
              <CommandGroup heading="Recent" className="text-muted-foreground">
                {recent.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`recent ${r.label}`}
                    onSelect={() => selectRecent(r)}
                    className="cursor-pointer py-2"
                  >
                    {renderRecentIcon(r.iconKey)}
                    <span className="flex-1 text-sm text-foreground">{r.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Recent</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!search.trim() && recent.length > 0 && <CommandSeparator />}

            <CommandGroup heading="Quick actions" className="text-muted-foreground">
              <CommandItem
                onSelect={() => go("new-analysis", "New Analysis", "Sparkles")}
                className="cursor-pointer py-2.5"
              >
                <span className="mr-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    <HighlightMatch text="Start a new analysis" query={search} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Analyze YouTube, Reddit, X or Instagram content
                  </span>
                </span>
                <CommandShortcut>N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={runSample}
                className="cursor-pointer py-2.5"
              >
                <span className="mr-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
                  <FlaskConical className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    <HighlightMatch text="Run sample analysis" query={search} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Try a one-click demo with a realistic dataset
                  </span>
                </span>
                <CommandShortcut>S</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={exportAll}
                className="cursor-pointer py-2.5"
              >
                <span className="mr-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
                  <Download className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    <HighlightMatch text="Export all analyses" query={search} />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Open My Analyses to download PDF/CSV reports
                  </span>
                </span>
                <CommandShortcut>E</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={toggleThemeCmd}
                className="cursor-pointer py-2.5"
              >
                <span className="mr-2.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    Toggle {theme === "dark" ? "light" : "dark"} mode
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Switch theme appearance
                  </span>
                </span>
                <CommandShortcut>T</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Navigate" className="text-muted-foreground">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => go(item.id, item.label, item.iconKey)}
                    className="cursor-pointer py-2"
                  >
                    <Icon className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm text-foreground">
                      <HighlightMatch text={item.label} query={search} />
                    </span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {recentAnalyses.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup
                  heading="Recent analyses"
                  className="text-muted-foreground"
                >
                  {recentAnalyses.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`analysis ${a.title} ${a.platform} ${a.sentiment}`}
                      onSelect={() => openAnalysis(a.id, a.title)}
                      className="cursor-pointer py-2"
                    >
                      <FileText className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-sm text-foreground">
                        <HighlightMatch text={a.title} query={search} />
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {a.platform}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />

            <CommandGroup heading="Insights" className="text-muted-foreground">
              <CommandItem
                onSelect={() => go("overview", "View sentiment trend chart", "TrendingUp")}
                className="cursor-pointer py-2"
              >
                <TrendingUp className="mr-2.5 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground">
                  <HighlightMatch text="View sentiment trend chart" query={search} />
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => go("overview", "Open platform sentiment heatmap", "BarChart3")}
                className="cursor-pointer py-2"
              >
                <BarChart3 className="mr-2.5 h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground">
                  <HighlightMatch text="Open platform × sentiment heatmap" query={search} />
                </span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Account" className="text-muted-foreground">
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  signOut({ redirect: false });
                }}
                className="cursor-pointer py-2 text-destructive"
              >
                <LogOut className="mr-2.5 h-4 w-4" />
                <span className="flex-1 text-sm">
                  <HighlightMatch text="Sign out" query={search} />
                </span>
              </CommandItem>
            </CommandGroup>

            {/* Footer with keyboard hints */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center rounded border border-border bg-background px-1 py-0.5 font-mono">
                  <ChevronUp className="h-2.5 w-2.5" />
                  <ChevronDown className="h-2.5 w-2.5" />
                </kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center rounded border border-border bg-background px-1 py-0.5 font-mono">
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </kbd>
                <span>to select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  esc
                </kbd>
                <span>to close</span>
              </span>
              <span className="ml-auto hidden items-center gap-1 sm:flex">
                <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px]">
                  ⌘K
                </kbd>
                <span>toggle</span>
              </span>
            </div>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
