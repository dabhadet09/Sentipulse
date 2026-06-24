# Task 16-c — Admin Analytics Agent

## Summary

Added two new admin overview analytics cards:
1. **User Roles** — donut pie chart showing the distribution of users across Free / Premium / Admin buckets (with center total + 3-column legend showing counts and percentages).
2. **Top Active Users** — leaderboard of up to 5 users with the most analyses, with rank medals (gold/silver/bronze/neutral), initials avatars, and analysis-count badges.

## Files Modified

| File | Change |
| --- | --- |
| `src/app/api/admin/stats/route.ts` | Removed the `role: "USER"` filter from the `premium` role-distribution bucket so it counts *all* PREMIUM-tier users (per spec). Updated the explanatory comment block. All other existing fields preserved. |
| `src/components/admin/overview-tab.tsx` | Added module-level `getInitials()` helper (first+last word initials, with edge-case handling). Added `rd` / `totalRoles` / `topUsers` derived values. Pie chart: height 220→260, `innerRadius` 62→50, `outerRadius` 92→80, empty-state trigger `t.users>0` → `totalRoles>0`, empty-state height 220→260. Top users list: switched to `getInitials()` (with email fallback), rank circle `h-6 w-6`→`h-7 w-7`, neutral slate tones for ranks #4–5 (was emerald), `variant="secondary"` badge with "N analyses" text (was gradient + bare number), row padding `px-4 py-3`→`px-3 py-2.5`, hover `hover:bg-muted/40`→`rounded-lg hover:bg-accent/50`, removed unused `isTop3` var, empty state uses filtered list. Loading skeleton third row `h-[320px]`→`h-[280px]`. |

## API Response Shape (new fields)

```typescript
roleDistribution: { free: number; premium: number; admin: number };
topActiveUsers: Array<{
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  analysisCount: number;
}>;
```

Bucket semantics (per spec):
- `free` = `role: "USER" AND subscriptionTier: "FREE"`
- `premium` = `subscriptionTier: "PREMIUM"` (any role)
- `admin` = `role: "ADMIN"` (any tier)

Note: buckets are NOT mutually exclusive — a PREMIUM admin would appear in both `premium` and `admin`. In practice the seeded admin uses the default FREE tier so no double counting occurs.

## Verification

- `bun run lint` — 0 errors, 0 warnings
- Dev server: `✓ Compiled in 80ms` after edits, no compile errors, no hydration warnings
- `/api/admin/stats` returns 200 when authenticated (verified in dev.log)
- All existing admin overview functionality preserved (8 stat cards, pending-apps alert, Daily New Users area chart, Analyses by Platform bar chart, Analyses Over Time composed chart, Sentiment Distribution pie, Recent Activity feed, Platform Coverage strip)

## Files NOT Touched (per task constraint)

- `src/components/dashboard/overview-tab.tsx` (belongs to task 16-b)
- All other admin tabs (users-tab, applications-tab, activity-tab, admin-panel)
- All shared components, Prisma schema, app-store, lib/*
