import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PLATFORMS, SENTIMENTS, EMOTIONS, getPlatform, GROUP_INFO } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/analysis";

interface ReportData {
  id: string;
  platform: string;
  contentType: string;
  title: string;
  sourceUrl?: string | null;
  overallSentiment: string;
  sentimentScore: number;
  itemCount: number;
  isPremium: boolean;
  createdAt: string;
  results: AnalysisResult;
}

const COLORS = {
  primary: [16, 122, 87] as [number, number, number], // emerald
  dark: [30, 41, 35] as [number, number, number],
  muted: [120, 130, 125] as [number, number, number],
  light: [245, 247, 246] as [number, number, number],
  positive: [16, 185, 129] as [number, number, number],
  negative: [239, 68, 68] as [number, number, number],
  neutral: [245, 158, 11] as [number, number, number],
  border: [220, 225, 222] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function sentimentColor(s: string): [number, number, number] {
  if (s === "positive") return COLORS.positive;
  if (s === "negative") return COLORS.negative;
  if (s === "mixed") return [139, 92, 246];
  return COLORS.neutral;
}

export function generateAnalysisReport(data: ReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ===== HEADER =====
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 90, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SentimentSense", margin, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("AI Sentiment & Emotion Analysis Report", margin, 56);

  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    margin,
    72
  );

  // Premium badge
  if (data.isPremium) {
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(pageWidth - 110, 28, 70, 20, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PREMIUM", pageWidth - 75, 42, { align: "center" });
  }

  y = 110;

  // ===== TITLE SECTION =====
  const platform = getPlatform(data.platform);
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(data.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 20 + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `Platform: ${platform.label}   |   Content Type: ${data.contentType}   |   Items Analyzed: ${data.itemCount}`,
    margin,
    y
  );
  y += 16;

  if (data.sourceUrl) {
    doc.text(`Source: ${data.sourceUrl}`, margin, y);
    y += 16;
  }

  y += 8;
  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // ===== EXECUTIVE SUMMARY =====
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Executive Summary", margin, y);
  y += 18;

  const summaryLines = doc.splitTextToSize(data.results.summary, contentWidth);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 14 + 14;

  // ===== KEY METRICS CARDS =====
  const cardWidth = (contentWidth - 20) / 3;
  const cardHeight = 56;

  // Card 1: Overall Sentiment
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 6, 6, "F");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("OVERALL SENTIMENT", margin + 12, y + 18);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...sentimentColor(data.overallSentiment));
  doc.text(
    data.overallSentiment.toUpperCase(),
    margin + 12,
    y + 40
  );

  // Card 2: Sentiment Score
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin + cardWidth + 10, y, cardWidth, cardHeight, 6, 6, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("SENTIMENT SCORE", margin + cardWidth + 22, y + 18);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...sentimentColor(data.overallSentiment));
  const scoreText = `${data.sentimentScore > 0 ? "+" : ""}${data.sentimentScore.toFixed(2)}`;
  doc.text(scoreText, margin + cardWidth + 22, y + 40);

  // Card 3: Dominant Emotion
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(margin + (cardWidth + 10) * 2, y, cardWidth, cardHeight, 6, 6, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("DOMINANT EMOTION", margin + (cardWidth + 10) * 2 + 12, y + 18);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  const domEmotion = EMOTIONS[data.results.dominantEmotion];
  doc.text(
    `${domEmotion?.emoji || ""} ${domEmotion?.label || data.results.dominantEmotion}`,
    margin + (cardWidth + 10) * 2 + 12,
    y + 40
  );

  y += cardHeight + 20;

  // ===== SENTIMENT DISTRIBUTION TABLE =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text("Sentiment Distribution", margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Sentiment", "Percentage", "Visual"]],
    body: [
      ["Positive", `${data.results.sentimentDistribution.positive}%`, barVisual(data.results.sentimentDistribution.positive, COLORS.positive)],
      ["Negative", `${data.results.sentimentDistribution.negative}%`, barVisual(data.results.sentimentDistribution.negative, COLORS.negative)],
      ["Neutral", `${data.results.sentimentDistribution.neutral}%`, barVisual(data.results.sentimentDistribution.neutral, COLORS.neutral)],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: COLORS.dark },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 80 },
      2: { cellWidth: contentWidth - 200 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // ===== EMOTION DISTRIBUTION TABLE =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text("Emotion Distribution", margin, y);
  y += 10;

  const emotionRows = Object.entries(data.results.emotionDistribution)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => {
      const e = EMOTIONS[key];
      return [
        `${e?.emoji || ""} ${e?.label || key}`,
        String(value),
        `${((value / data.results.itemCount) * 100).toFixed(1)}%`,
      ];
    });

  autoTable(doc, {
    startY: y,
    head: [["Emotion", "Count", "Percentage"]],
    body: emotionRows,
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: COLORS.dark },
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: 80 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Check for page break
  if (y > pageHeight - 200) {
    doc.addPage();
    y = 40;
  }

  // ===== KEY INSIGHTS =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text("Key Insights", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  for (const insight of data.results.insights) {
    const lines = doc.splitTextToSize(`•  ${insight}`, contentWidth - 10);
    if (y + lines.length * 14 > pageHeight - 60) {
      doc.addPage();
      y = 40;
    }
    doc.text(lines, margin, y);
    y += lines.length * 14 + 4;
  }
  y += 12;

  // ===== TOP KEYWORDS =====
  if (y > pageHeight - 140) {
    doc.addPage();
    y = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text("Top Keywords", margin, y);
  y += 10;

  const keywordRows = data.results.keywords.slice(0, 12).map((k) => [
    k.word,
    String(k.count),
    k.sentiment,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Keyword", "Frequency", "Associated Sentiment"]],
    body: keywordRows,
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: COLORS.dark },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const s = data.cell.raw as string;
        if (s === "positive") data.cell.styles.textColor = COLORS.positive;
        else if (s === "negative") data.cell.styles.textColor = COLORS.negative;
        else data.cell.styles.textColor = COLORS.neutral;
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // ===== SAMPLE ANALYZED ITEMS =====
  if (y > pageHeight - 160) {
    doc.addPage();
    y = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text("Sample Analyzed Items", margin, y);
  y += 10;

  const itemRows = data.results.items.slice(0, 15).map((item, i) => [
    String(i + 1),
    item.text.length > 80 ? item.text.slice(0, 77) + "..." : item.text,
    item.sentiment,
    EMOTIONS[item.emotion]?.label || item.emotion,
    item.score.toFixed(2),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Text", "Sentiment", "Emotion", "Score"]],
    body: itemRows,
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: COLORS.dark },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: contentWidth - 24 - 60 - 55 - 45 },
      2: { cellWidth: 60 },
      3: { cellWidth: 55 },
      4: { cellWidth: 45 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const s = data.cell.raw as string;
        if (s === "positive") data.cell.styles.textColor = COLORS.positive;
        else if (s === "negative") data.cell.styles.textColor = COLORS.negative;
        else data.cell.styles.textColor = COLORS.neutral;
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: margin, right: margin },
  });

  // ===== FOOTER on each page =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(
      `SentimentSense — Developed by Group No ${GROUP_INFO.groupNumber} | ${GROUP_INFO.members.join(", ")}`,
      margin,
      pageHeight - 26
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 26,
      { align: "right" }
    );
  }

  // Save
  const fileName = `sentiment-report-${data.title.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${data.id.slice(0, 8)}.pdf`;
  doc.save(fileName);
}

function barVisual(pct: number, color: [number, number, number]): string {
  const filled = Math.round((pct / 100) * 20);
  return "█".repeat(filled) + "░".repeat(20 - filled) + ` ${pct}%`;
}

/**
 * Export analysis data as a CSV file (Excel-compatible).
 * Includes: metadata, summary, sentiment distribution, emotion distribution,
 * keywords, and full per-item results.
 */
export function exportAnalysisCSV(data: {
  id: string;
  title: string;
  platform: string;
  contentType: string;
  createdAt: string;
  results: AnalysisResult;
}) {
  const r = data.results;
  const platform = getPlatform(data.platform);
  const rows: string[][] = [];

  // Section: Metadata
  rows.push(["SentimentSense — Analysis Export (Group No 38)"]);
  rows.push([]);
  rows.push(["Title", data.title]);
  rows.push(["Platform", platform.label]);
  rows.push(["Content Type", data.contentType]);
  rows.push(["Created At", new Date(data.createdAt).toLocaleString()]);
  rows.push(["Analysis ID", data.id]);
  rows.push(["Items Analyzed", String(r.itemCount)]);
  rows.push(["Overall Sentiment", r.overallSentiment]);
  rows.push(["Sentiment Score", r.sentimentScore.toFixed(2)]);
  rows.push(["Dominant Emotion", EMOTIONS[r.dominantEmotion]?.label || r.dominantEmotion]);
  rows.push([]);

  // Section: Summary
  rows.push(["AI Summary"]);
  rows.push([r.summary]);
  rows.push([]);

  // Section: Insights
  rows.push(["Key Insights"]);
  r.insights.forEach((insight, i) => rows.push([`${i + 1}`, insight]));
  rows.push([]);

  // Section: Sentiment Distribution
  rows.push(["Sentiment Distribution"]);
  rows.push(["Sentiment", "Percentage"]);
  rows.push(["Positive", `${r.sentimentDistribution.positive}%`]);
  rows.push(["Negative", `${r.sentimentDistribution.negative}%`]);
  rows.push(["Neutral", `${r.sentimentDistribution.neutral}%`]);
  rows.push([]);

  // Section: Emotion Distribution
  rows.push(["Emotion Distribution"]);
  rows.push(["Emotion", "Count", "Percentage"]);
  Object.entries(r.emotionDistribution)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, value]) => {
      const e = EMOTIONS[key];
      rows.push([
        e?.label || key,
        String(value),
        `${((value / r.itemCount) * 100).toFixed(1)}%`,
      ]);
    });
  rows.push([]);

  // Section: Keywords
  rows.push(["Top Keywords"]);
  rows.push(["#", "Keyword", "Frequency", "Associated Sentiment"]);
  r.keywords.forEach((k, i) => {
    rows.push([String(i + 1), k.word, String(k.count), k.sentiment]);
  });
  rows.push([]);

  // Section: Per-item results
  rows.push(["Per-Item Analysis Results"]);
  rows.push(["#", "Author", "Text", "Sentiment", "Emotion", "Score"]);
  r.items.forEach((item, i) => {
    // Escape CSV fields: wrap in quotes, double any internal quotes
    const escape = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
    rows.push([
      String(i + 1),
      escape(item.author || "Anonymous"),
      escape(item.text),
      item.sentiment,
      EMOTIONS[item.emotion]?.label || item.emotion,
      item.score.toFixed(2),
    ]);
  });

  // Convert to CSV string
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.startsWith('"')) return cell; // already escaped
          if (cell.includes(",") || cell.includes("\n") || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(",")
    )
    .join("\n");

  // Download
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileName = `sentiment-data-${data.title.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${data.id.slice(0, 8)}.csv`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Lightweight shape for an analysis with its related results. Used by the
 * per-item CSV exporter below — only `id`, `title`, `titleSlug`, and
 * `results` are required; the optional metadata fields are accepted for
 * forward compatibility but not used in the CSV output.
 */
export interface AnalysisWithRelations {
  id: string;
  title: string;
  /** URL/file-safe slug derived from the title (used in the download filename). */
  titleSlug: string;
  results: AnalysisResult;
  platform?: string;
  contentType?: string;
  overallSentiment?: string;
  sentimentScore?: number;
  itemCount?: number;
  isPremium?: boolean;
  createdAt?: string;
}

/**
 * Export the per-item results of a single analysis as a clean, spreadsheet-
 * friendly CSV. One header row + one row per analyzed item.
 *
 * Columns: index, author, text, sentiment, emotion, intensityScore
 *
 * Fields containing commas, double quotes, or newlines are wrapped in double
 * quotes; any internal double quotes are escaped by doubling (RFC 4180).
 */
export function exportAnalysisCsv(analysis: AnalysisWithRelations): void {
  const items = analysis.results?.items ?? [];

  const escapeField = (val: unknown): string => {
    const str = String(val ?? "");
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = [
    "index",
    "author",
    "text",
    "sentiment",
    "emotion",
    "intensityScore",
  ];
  const rows: string[] = [header.join(",")];

  items.forEach((item, i) => {
    const row = [
      String(i + 1),
      escapeField(item.author || "Anonymous"),
      escapeField(item.text),
      escapeField(item.sentiment),
      escapeField(item.emotion),
      item.score.toFixed(3),
    ];
    rows.push(row.join(","));
  });

  // Prepend BOM so Excel detects UTF-8 encoding correctly.
  const csv = "\uFEFF" + rows.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sentimentsense-${analysis.titleSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export ALL of a user's analyses (metadata + summary + key metrics) as a
 * single combined CSV. Useful for spreadsheets / record-keeping. Does NOT
 * include per-item rows (those are available via per-analysis export).
 */
export function exportAllAnalysesCSV(args: {
  analyses: Array<{
    id: string;
    platform: string;
    contentType: string;
    title: string;
    overallSentiment: string;
    sentimentScore: number;
    itemCount: number;
    isPremium: boolean;
    createdAt: string;
    results?: AnalysisResult | null;
  }>;
}) {
  const rows: string[][] = [];

  // Header / title block
  rows.push(["SentimentSense — All Analyses Export (Group No 38)"]);
  rows.push([`Generated: ${new Date().toLocaleString()}`]);
  rows.push([`Total Analyses: ${args.analyses.length}`]);
  rows.push([]);

  // Summary metrics
  const total = args.analyses.length;
  const positive = args.analyses.filter((a) => a.overallSentiment === "positive").length;
  const negative = args.analyses.filter((a) => a.overallSentiment === "negative").length;
  const neutral = args.analyses.filter((a) => a.overallSentiment === "neutral").length;
  const mixed = args.analyses.filter((a) => a.overallSentiment === "mixed").length;
  const premium = args.analyses.filter((a) => a.isPremium).length;
  const avgScore =
    total > 0
      ? (
          args.analyses.reduce((s, a) => s + a.sentimentScore, 0) / total
        ).toFixed(2)
      : "0.00";

  rows.push(["Summary Metrics"]);
  rows.push(["Total Analyses", String(total)]);
  rows.push(["Positive", `${positive} (${total ? Math.round((positive / total) * 100) : 0}%)`]);
  rows.push(["Negative", `${negative} (${total ? Math.round((negative / total) * 100) : 0}%)`]);
  rows.push(["Neutral", `${neutral} (${total ? Math.round((neutral / total) * 100) : 0}%)`]);
  rows.push(["Mixed", `${mixed} (${total ? Math.round((mixed / total) * 100) : 0}%)`]);
  rows.push(["Premium Analyses", String(premium)]);
  rows.push(["Average Sentiment Score", avgScore]);
  rows.push([]);

  // Per-analysis table header
  rows.push([
    "Analysis ID",
    "Title",
    "Platform",
    "Content Type",
    "Overall Sentiment",
    "Sentiment Score",
    "Items Analyzed",
    "Premium",
    "Created At",
    "Dominant Emotion",
    "AI Summary",
  ]);

  const escape = (s: string) => {
    const str = String(s ?? "");
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  for (const a of args.analyses) {
    const platformLabel = getPlatform(a.platform).label;
    const r = a.results;
    const dominantEmotion = r
      ? EMOTIONS[r.dominantEmotion]?.label || r.dominantEmotion
      : "";
    const summary = r?.summary || "";
    rows.push([
      a.id,
      escape(a.title),
      platformLabel,
      a.contentType,
      a.overallSentiment,
      a.sentimentScore.toFixed(2),
      String(a.itemCount),
      a.isPremium ? "Yes" : "No",
      new Date(a.createdAt).toLocaleString(),
      dominantEmotion,
      escape(summary),
    ]);
  }

  // Convert to CSV
  const csv = rows.map((row) => row.join(",")).join("\n");

  // Download
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const date = new Date().toISOString().split("T")[0];
  link.download = `sentimentsense-all-analyses-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build a combined CSV Blob from an array of analyses (with their full
 * AnalysisResult payloads). Each analysis gets its own labelled section
 * containing: title, platform, date, sentiment, score, item count, top
 * emotions, top keywords, and the AI-generated summary.
 *
 * The returned Blob is UTF-8 with a BOM (so Excel detects encoding
 * correctly) and uses RFC 4180-compliant escaping: any field containing
 * a comma, double quote, or newline is wrapped in double quotes, and
 * internal double quotes are escaped by doubling. The caller is
 * responsible for triggering the actual download (e.g. via a temporary
 * anchor element + URL.createObjectURL).
 *
 * This complements the older `exportAllAnalysesCSV` (uppercase) helper,
 * which renders one row per analysis in a flat table. The sectioned
 * layout here is more readable when reviewing many analyses by hand.
 */
export function exportAllAnalysesCsv(
  analyses: AnalysisWithRelations[]
): Blob {
  const escapeField = (val: unknown): string => {
    const str = String(val ?? "");
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  lines.push("SentimentSense — All Analyses Export (Group No 38)");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Total Analyses: ${analyses.length}`);
  lines.push("");

  analyses.forEach((a, idx) => {
    const r = a.results;
    const platformLabel = a.platform ? getPlatform(a.platform).label : "";
    const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleString() : "";
    const sentiment =
      a.overallSentiment || (r?.overallSentiment ?? "") || "";
    const score =
      typeof a.sentimentScore === "number"
        ? a.sentimentScore
        : typeof r?.sentimentScore === "number"
          ? r.sentimentScore
          : 0;
    const itemCount =
      typeof a.itemCount === "number"
        ? a.itemCount
        : typeof r?.itemCount === "number"
          ? r.itemCount
          : 0;

    // Top emotions (up to 3, sorted by count desc)
    let topEmotions = "";
    if (r && r.emotionDistribution) {
      topEmotions = Object.entries(r.emotionDistribution)
        .filter(([, v]) => v > 0)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([k, v]) => {
          const e = EMOTIONS[k];
          return `${e?.label || k} (${v})`;
        })
        .join("; ");
    }

    // Top keywords (up to 5, by frequency)
    let topKeywords = "";
    if (r && Array.isArray(r.keywords) && r.keywords.length > 0) {
      topKeywords = r.keywords
        .slice(0, 5)
        .map((k) => `${k.word} (${k.count})`)
        .join("; ");
    }

    const summary = r?.summary || "";

    // Section header — visual separator between analyses
    lines.push(
      `===== Analysis ${idx + 1} of ${analyses.length} =====`
    );
    lines.push(`Title,${escapeField(a.title)}`);
    lines.push(`Platform,${escapeField(platformLabel)}`);
    lines.push(`Date,${escapeField(dateStr)}`);
    lines.push(`Sentiment,${escapeField(sentiment)}`);
    lines.push(`Score,${score.toFixed(2)}`);
    lines.push(`Item Count,${itemCount}`);
    lines.push(`Top Emotions,${escapeField(topEmotions)}`);
    lines.push(`Top Keywords,${escapeField(topKeywords)}`);
    lines.push(`AI Summary,${escapeField(summary)}`);
    lines.push("");
  });

  // Prepend BOM so Excel detects UTF-8 encoding correctly; use CRLF
  // line endings for maximum spreadsheet compatibility.
  const csv = "\uFEFF" + lines.join("\r\n");
  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

