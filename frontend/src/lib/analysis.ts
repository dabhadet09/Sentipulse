import { env } from "process";

export interface AnalysisItem {
  text: string;
  author?: string;
}

export interface ItemResult {
  text: string;
  author?: string;
  sentiment: "positive" | "negative" | "neutral";
  emotion: string;
  score: number; // -1 to 1
}

export interface AnalysisResult {
  overallSentiment: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number; // -1 to 1
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotionDistribution: Record<string, number>;
  dominantEmotion: string;
  keywords: { word: string; count: number; sentiment: string }[];
  summary: string;
  insights: string[];
  itemCount: number;
  items: ItemResult[];
}

const EMOTIONS = [
  "joy",
  "anger",
  "sadness",
  "fear",
  "surprise",
  "disgust",
  "trust",
  "anticipation",
];

const FASTAPI_URL = "http://127.0.0.1:8000/api";

/**
 * Analyze a batch of text items for sentiment and emotion using the FastAPI backend.
 */
export async function analyzeSentiment(
  items: AnalysisItem[],
  platform: string,
  contentType: string
): Promise<AnalysisResult> {
  // Limit to 40 items for performance
  const sample = items.slice(0, 40);

  const itemResults: ItemResult[] = [];
  
  // Call FastAPI for each item
  for (const item of sample) {
    try {
      const res = await fetch(`${FASTAPI_URL}/analysis/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: item.text,
          platform: platform,
        }),
      });

      if (!res.ok) {
        throw new Error(`FastAPI error: ${res.statusText}`);
      }

      const data = await res.json();
      
      let mappedSentiment: "positive" | "negative" | "neutral" = "neutral";
      if (data.sentiment.label.toLowerCase().includes("pos")) mappedSentiment = "positive";
      else if (data.sentiment.label.toLowerCase().includes("neg")) mappedSentiment = "negative";

      itemResults.push({
        text: item.text,
        author: item.author,
        sentiment: mappedSentiment,
        emotion: data.emotion.label.toLowerCase(),
        score: data.sentiment.score * (mappedSentiment === "negative" ? -1 : 1),
      });
    } catch (e) {
      console.error("Error calling FastAPI for item:", e);
      // fallback
      itemResults.push({
        text: item.text,
        author: item.author,
        sentiment: "neutral",
        emotion: "neutral",
        score: 0,
      });
    }
  }

  const distribution = computeDistribution(itemResults);
  const emotionDist = computeEmotionDistribution(itemResults);

  const overallSentiment =
    distribution.positive > distribution.negative
      ? "positive"
      : distribution.negative > distribution.positive
        ? "negative"
        : "neutral";

  const sentimentScore =
    itemResults.reduce((acc, it) => acc + it.score, 0) /
    Math.max(itemResults.length, 1);

  const dominantEmotion =
    Object.entries(emotionDist).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "neutral";

  const keywords = extractKeywords(itemResults);

  return {
    overallSentiment: overallSentiment as AnalysisResult["overallSentiment"],
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    sentimentDistribution: distribution,
    emotionDistribution: emotionDist,
    dominantEmotion,
    keywords,
    summary: `Analysis computed using Sentipulse Models.`,
    insights: [
      `Analyzed ${itemResults.length} items from ${platform}.`,
      `Dominant emotion detected: ${dominantEmotion}.`,
      `Overall sentiment leans ${overallSentiment}.`,
    ],
    itemCount: items.length,
    items: itemResults,
  };
}

/**
 * Fetch and analyze a URL directly using the FastAPI backend.
 */
export async function analyzeUrl(
  url: string,
  platform: string,
  maxComments: number = 100
): Promise<AnalysisResult> {
  const res = await fetch(`${FASTAPI_URL}/analysis/url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      platform,
      max_comments: maxComments,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `FastAPI error: ${res.statusText}`);
  }

  const data = await res.json();
  const itemResults: ItemResult[] = data.items.map((it: any) => {
    let mappedSentiment: "positive" | "negative" | "neutral" = "neutral";
    if (it.sentiment.label.toLowerCase().includes("pos")) mappedSentiment = "positive";
    else if (it.sentiment.label.toLowerCase().includes("neg")) mappedSentiment = "negative";

    return {
      text: it.text,
      author: it.author,
      sentiment: mappedSentiment,
      emotion: it.emotion.label.toLowerCase(),
      score: it.sentiment.score * (mappedSentiment === "negative" ? -1 : 1),
    };
  });

  const distribution = computeDistribution(itemResults);
  const emotionDist = computeEmotionDistribution(itemResults);

  const overallSentiment =
    distribution.positive > distribution.negative
      ? "positive"
      : distribution.negative > distribution.positive
        ? "negative"
        : "neutral";

  const sentimentScore =
    itemResults.reduce((acc, it) => acc + it.score, 0) /
    Math.max(itemResults.length, 1);

  const dominantEmotion =
    Object.entries(emotionDist).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "neutral";

  const keywords = extractKeywords(itemResults);

  return {
    overallSentiment: overallSentiment as AnalysisResult["overallSentiment"],
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    sentimentDistribution: distribution,
    emotionDistribution: emotionDist,
    dominantEmotion,
    keywords,
    summary: data.fetch_message || `Analysis computed using Sentipulse Models.`,
    insights: [
      `Fetched and analyzed ${itemResults.length} items from ${platform}.`,
      `Dominant emotion detected: ${dominantEmotion}.`,
      `Overall sentiment leans ${overallSentiment}.`,
      ...(data.video_title ? [`Content Title: ${data.video_title}`] : []),
    ],
    itemCount: itemResults.length,
    items: itemResults,
  };
}

function computeDistribution(items: ItemResult[]) {
  const total = items.length || 1;
  const pos = items.filter((i) => i.sentiment === "positive").length;
  const neg = items.filter((i) => i.sentiment === "negative").length;
  const neu = items.filter((i) => i.sentiment === "neutral").length;
  return {
    positive: Math.round((pos / total) * 100),
    negative: Math.round((neg / total) * 100),
    neutral: Math.round((neu / total) * 100),
  };
}

function computeEmotionDistribution(items: ItemResult[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const e of EMOTIONS) dist[e] = 0;
  for (const it of items) {
    if (dist[it.emotion] !== undefined) dist[it.emotion]++;
  }
  return dist;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "this",
  "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
  "what", "which", "who", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "my", "your", "his", "her", "its", "our", "their", "me", "him", "us",
  "them", "as", "if", "then", "also", "get", "got", "one", "two", "im",
]);

function extractKeywords(items: ItemResult[]): {
  word: string;
  count: number;
  sentiment: string;
}[] {
  const counts: Record<string, { count: number; sentiment: Record<string, number> }> = {};
  for (const it of items) {
    const words = it.text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    for (const w of words) {
      if (!counts[w]) counts[w] = { count: 0, sentiment: {} };
      counts[w].count++;
      counts[w].sentiment[it.sentiment] =
        (counts[w].sentiment[it.sentiment] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([word, data]) => ({
      word,
      count: data.count,
      sentiment: Object.entries(data.sentiment).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "neutral",
    }));
}
