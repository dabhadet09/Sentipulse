import { create } from "zustand";

export type View =
  | "landing"
  | "login"
  | "register"
  | "dashboard"
  | "admin";

export type DashboardTab =
  | "overview"
  | "new-analysis"
  | "my-analyses"
  | "compare"
  | "livestream"
  | "premium"
  | "profile";

export type AdminTab =
  | "overview"
  | "users"
  | "applications"
  | "analyses"
  | "activity";

interface HeatmapFilter {
  platform: string | null;
  sentiment: string | null;
}

interface AppState {
  view: View;
  setView: (v: View) => void;

  dashboardTab: DashboardTab;
  setDashboardTab: (t: DashboardTab) => void;

  adminTab: AdminTab;
  setAdminTab: (t: AdminTab) => void;

  // selected analysis for detail view
  selectedAnalysisId: string | null;
  setSelectedAnalysisId: (id: string | null) => void;

  // public share view — when set, page.tsx renders SharedAnalysisView
  // (no auth required). Set via `?share=ID` URL query param.
  sharedAnalysisId: string | null;
  setSharedAnalysisId: (id: string | null) => void;

  // theme
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;

  // heatmap → my-analyses filter handoff
  heatmapFilter: HeatmapFilter;
  setHeatmapFilter: (f: HeatmapFilter) => void;
  clearHeatmapFilter: () => void;

  // command palette (Cmd+K)
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // keyboard shortcuts help dialog (?)
  shortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;
  toggleShortcutsHelp: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "landing",
  setView: (v) => set({ view: v }),

  dashboardTab: "overview",
  setDashboardTab: (t) => set({ dashboardTab: t }),

  adminTab: "overview",
  setAdminTab: (t) => set({ adminTab: t }),

  selectedAnalysisId: null,
  setSelectedAnalysisId: (id) => set({ selectedAnalysisId: id }),

  sharedAnalysisId: null,
  setSharedAnalysisId: (id) => set({ sharedAnalysisId: id }),

  theme: "light",
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      return { theme: next };
    }),
  setTheme: (t) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", t === "dark");
    }
    set({ theme: t });
  },

  heatmapFilter: { platform: null, sentiment: null },
  setHeatmapFilter: (f) => set({ heatmapFilter: f }),
  clearHeatmapFilter: () =>
    set({ heatmapFilter: { platform: null, sentiment: null } }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  shortcutsHelpOpen: false,
  setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
  toggleShortcutsHelp: () =>
    set((s) => ({ shortcutsHelpOpen: !s.shortcutsHelpOpen })),
}));
