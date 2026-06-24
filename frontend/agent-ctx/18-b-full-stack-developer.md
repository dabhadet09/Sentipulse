# Task 18-b: Export All + Weekly Digest

## Agent: full-stack-developer

## Summary

Completed all 4 tasks for the SentimentSense dashboard:

### Task 1: Export All Analyses CSV
- Added new function `exportAllAnalysesCsv(analyses: AnalysisWithRelations[])` in `src/lib/report.ts`
- Function generates a sectioned CSV with each analysis as its own labelled block containing: title, platform, date, sentiment, score, item count, top emotions (top 3), top keywords (top 5), AI summary
- Uses RFC 4180-compliant escaping (quotes wrap fields with commas/quotes/newlines; internal quotes doubled)
- Prepends UTF-8 BOM (\uFEFF) for Excel compatibility; uses CRLF line endings
- Returns a `Blob` (caller triggers the download via URL.createObjectURL + anchor click)
- Updated `src/components/dashboard/my-analyses-tab.tsx`:
  - Switched import from `exportAllAnalysesCSV` (capital) to new `exportAllAnalysesCsv` (lowercase) + `AnalysisWithRelations` type
  - Updated `handleExportAll` to consume the Blob return value and trigger download via temporary anchor
  - Updated `fetchAnalysisFull` return type to `AnalysisWithRelations | null`, now also computes `titleSlug` from the analysis title
  - Updated Export All button: icon changed from `FileSpreadsheet` to `Download`, label from "Export All CSV" to "Export All"
  - Button still uses `variant="outline"`, disabled when no analyses / exporting, shows Loader2 spinner during fetch, toast on success: "Exported X analyses to CSV"

### Task 2: Weekly Digest Summary Card
- Added new `WeeklyDigestCard` component to `src/components/dashboard/overview-tab.tsx`
- Placed between Smart Insights section and Quick Sample widget
- Card title: "Your Week at a Glance" with Calendar icon
- Computes from existing `analyses` state (filters by createdAt within last 7 days — rolling window)
- 2x2 grid of mini stat tiles:
  1. Analyses This Week (count, BarChart3 icon, emerald→teal gradient)
  2. Most Active Platform (platform icon + label, cyan→emerald gradient)
  3. Avg Sentiment Score (TrendingUp/Down icon, emerald or red gradient based on sign)
  4. Dominant Emotion (Sparkles icon, violet→fuchsia gradient, sentiment-derived emoji + label)
- Each tile: gradient circle icon, label, value, sub-text (context line)
- Visual: `bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5`, emerald accent border (`border-emerald-500/30`), decorative blur glows
- Empty state when no analyses in last 7 days: dashed border card with calendar icon, "No analyses this week yet. Start a new analysis to see your weekly digest!" + CTA button
- Framer Motion entrance animation (fade + slide up on card; scale-in stagger on tiles)

### Task 3: Social Share Buttons in Analysis Detail
- Added Twitter, Linkedin, Link2 imports to `src/components/dashboard/analysis-detail.tsx`
- Added new "Share to social" row inside the existing ShareDialog component (between the link preview box and the info list)
- 3 buttons in a 3-column grid:
  1. Twitter/X: opens `https://twitter.com/intent/tweet?text=...&url=...` with analysis title and share URL (window.open with noopener,noreferrer)
  2. LinkedIn: opens `https://www.linkedin.com/sharing/share-offsite/?url=...` with share URL
  3. Copy Link: uses existing `onCopy` handler which copies share URL to clipboard + toast feedback + 2s "Copied" state
- All 3 buttons: `variant="outline"` + `size="sm"`, consistent `hover:bg-accent` hover effect (avoiding brand-specific blue colors per project palette rule)
- Icons provide visual differentiation between the 3 actions
- Reuses existing `copied` state and `onCopy` callback for the Copy Link button

### Task 4: Weekly Stats API Endpoint
- Created new file: `src/app/api/analyses/weekly/route.ts`
- GET endpoint returning weekly statistics for the authenticated user
- Auth via `getCurrentUser()` from `@/lib/session`; returns 401 if unauthenticated
- Queries analyses from the last 7 days (rolling window from `now - 7 days`)
- Response shape (matches task spec):
  ```json
  {
    "totalThisWeek": number,
    "mostActivePlatform": string | null,
    "avgScore": number,                 // mean sentimentScore, -1..1
    "dominantEmotion": string | null,
    "dailyBreakdown": [{ "date": "YYYY-MM-DD", "count": number, "avgScore": number }]
  }
  ```
- Dominant emotion computed by aggregating `emotionDistribution` maps across all analyses (more accurate than just counting each analysis's dominantEmotion field); falls back to per-analysis dominantEmotion bump when distribution is missing
- Empty state returns zeros / nulls and empty dailyBreakdown array (no undefined fields)
- Tested via curl: returns 401 when unauthenticated (correct behavior), compiles cleanly

## Files Modified
- `src/lib/report.ts` (added `exportAllAnalysesCsv` function, ~100 lines)
- `src/components/dashboard/my-analyses-tab.tsx` (updated imports, `handleExportAll`, `fetchAnalysisFull`, button UI)
- `src/components/dashboard/overview-tab.tsx` (added `WeeklyDigestCard` component + render between Smart Insights and Quick Sample)
- `src/components/dashboard/analysis-detail.tsx` (added Twitter, Linkedin imports + social share row in ShareDialog)

## Files Created
- `src/app/api/analyses/weekly/route.ts` (new GET endpoint, ~150 lines)

## Lint Status
- Zero errors, zero warnings

## Dev Server Verification
- `GET /api/analyses/weekly` → 401 when unauthenticated (correct)
- All existing routes still returning 200
- No compilation errors
