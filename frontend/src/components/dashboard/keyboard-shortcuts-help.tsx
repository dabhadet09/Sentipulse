"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  Search,
  Sun,
  Moon,
  ArrowLeft,
  HelpCircle,
  LayoutDashboard,
  Sparkles,
  History,
  GitCompare,
  Radio,
  Crown,
  UserCircle,
  Keyboard,
} from "lucide-react";

interface ShortcutGroup {
  title: string;
  icon: typeof Command;
  shortcuts: {
    keys: { label: string; isMac?: boolean }[];
    description: string;
    icon?: typeof Command;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    icon: Command,
    shortcuts: [
      {
        keys: [{ label: "⌘", isMac: true }, { label: "K" }],
        description: "Open command palette",
        icon: Search,
      },
      {
        keys: [{ label: "?" }],
        description: "Show this keyboard shortcuts dialog",
        icon: HelpCircle,
      },
      {
        keys: [{ label: "Esc" }],
        description: "Close dialog / cancel action",
      },
    ],
  },
  {
    title: "Navigation",
    icon: LayoutDashboard,
    shortcuts: [
      {
        keys: [{ label: "G" }, { label: "O" }],
        description: "Go to Overview",
        icon: LayoutDashboard,
      },
      {
        keys: [{ label: "G" }, { label: "N" }],
        description: "Go to New Analysis",
        icon: Sparkles,
      },
      {
        keys: [{ label: "G" }, { label: "A" }],
        description: "Go to My Analyses",
        icon: History,
      },
      {
        keys: [{ label: "G" }, { label: "C" }],
        description: "Go to Compare",
        icon: GitCompare,
      },
      {
        keys: [{ label: "G" }, { label: "L" }],
        description: "Go to Live Stream (premium)",
        icon: Radio,
      },
      {
        keys: [{ label: "G" }, { label: "P" }],
        description: "Go to Premium",
        icon: Crown,
      },
      {
        keys: [{ label: "G" }, { label: "U" }],
        description: "Go to Profile",
        icon: UserCircle,
      },
    ],
  },
  {
    title: "View",
    icon: Sun,
    shortcuts: [
      {
        keys: [{ label: "T" }],
        description: "Toggle light/dark theme",
        icon: Sun,
      },
      {
        keys: [{ label: "Esc" }],
        description: "Back to list (from analysis detail)",
        icon: ArrowLeft,
      },
    ],
  },
];

export function KeyboardShortcutsHelp() {
  const open = useAppStore((s) => s.shortcutsHelpOpen);
  const setOpen = useAppStore((s) => s.setShortcutsHelpOpen);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const setDashboardTab = useAppStore((s) => s.setDashboardTab);
  const setSelectedAnalysisId = useAppStore((s) => s.setSelectedAnalysisId);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  // Global keyboard handler
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input/textarea/select
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      // ? — always works (even from inputs, since it's a help shortcut)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Allow ? from inputs too, but only when not pressed with shift combining into something else
        // (the natural way to type ? is Shift+/ which produces "?")
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Skip other shortcuts when user is typing
      if (isEditable) return;
      // Also skip if any modifier (other than shift for letter keys) is held
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // T — toggle theme
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Esc — back from analysis detail
      if (e.key === "Escape") {
        // Only handle Esc-to-back if no dialog is open (the dialogs handle Esc themselves)
        const dialogOpen =
          useAppStore.getState().commandPaletteOpen ||
          useAppStore.getState().shortcutsHelpOpen;
        if (!dialogOpen && useAppStore.getState().selectedAnalysisId) {
          e.preventDefault();
          setSelectedAnalysisId(null);
        }
        return;
      }

      // G + letter — navigation
      if (e.key === "g" || e.key === "G") {
        // Set up one-shot listener for next key
        const onNext = (ev: KeyboardEvent) => {
          window.removeEventListener("keydown", onNext, true);
          const k = ev.key.toLowerCase();
          const map: Record<string, "overview" | "new-analysis" | "my-analyses" | "compare" | "livestream" | "premium" | "profile"> = {
            o: "overview",
            n: "new-analysis",
            a: "my-analyses",
            c: "compare",
            l: "livestream",
            p: "premium",
            u: "profile",
          };
          if (map[k]) {
            ev.preventDefault();
            setDashboardTab(map[k]);
            setSelectedAnalysisId(null);
          }
        };
        window.addEventListener("keydown", onNext, true);
        // Auto-cancel the "g" prefix after 800ms if no follow-up key
        setTimeout(() => {
          window.removeEventListener("keydown", onNext, true);
        }, 800);
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setOpen, toggleTheme, setDashboardTab, setSelectedAnalysisId]);

  // Suppress unused warning for setters that are used implicitly via store
  void setCommandPaletteOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Keyboard className="h-4 w-4" />
            </span>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts. Press{" "}
            <kbd className="mx-0.5 inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
              ?
            </kbd>{" "}
            anywhere to open this dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.title}>
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <GroupIcon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="ml-1 h-px flex-1 bg-border/60" />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {group.shortcuts.map((sc) => {
                    const ScIcon = sc.icon;
                    return (
                      <div
                        key={sc.description}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2 transition-colors hover:bg-accent/40"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {ScIcon && (
                            <ScIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate text-xs text-foreground">
                            {sc.description}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {sc.keys.map((k, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +
                                </span>
                              )}
                              <kbd
                                className={`inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-semibold text-foreground shadow-sm ${
                                  k.isMac ? "text-base leading-none" : ""
                                }`}
                              >
                                {k.label}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro tip */}
        <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.05] to-teal-500/[0.05] p-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Pro tip: Use the command palette for fuzzy search
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Press{" "}
                <kbd className="mx-0.5 inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px] font-semibold">
                  ⌘K
                </kbd>{" "}
                to jump to any tab, find recent analyses, or sign out — without
                touching the mouse.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Moon className="h-3 w-3" />
            Shortcuts work on all pages
          </span>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Sun className="h-2.5 w-2.5" />
            SentimentSense
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
