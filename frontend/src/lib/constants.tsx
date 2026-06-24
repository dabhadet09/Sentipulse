import {
  Youtube,
  MessageCircle,
  Twitter,
  Instagram,
  type LucideIcon,
} from "lucide-react";

export const PLATFORMS = {
  youtube: {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "#ef4444",
    bgClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    gradient: "from-red-500 to-rose-600",
  },
  reddit: {
    id: "reddit",
    label: "Reddit",
    icon: MessageCircle,
    color: "#f97316",
    bgClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    gradient: "from-orange-500 to-amber-600",
  },
  x: {
    id: "x",
    label: "X (Twitter)",
    icon: Twitter,
    color: "#0f172a",
    bgClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    gradient: "from-slate-700 to-slate-900",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "#ec4899",
    bgClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    gradient: "from-fuchsia-500 via-pink-500 to-amber-500",
  },
} as const;

export type PlatformId = keyof typeof PLATFORMS;

export const CONTENT_TYPES: Record<
  string,
  { label: string; premium: boolean; description: string }
> = {
  video: { label: "Video / Comments", premium: false, description: "Analyze comments on a YouTube video" },
  livestream: { label: "Live Stream", premium: true, description: "Real-time chat sentiment during a live stream" },
  post: { label: "Post", premium: false, description: "Analyze a social media post and replies" },
  reel: { label: "Reel / Short", premium: false, description: "Analyze a reel or short-form video" },
  discussion: { label: "Discussion Thread", premium: false, description: "Analyze a Reddit discussion thread" },
  short: { label: "Short Video", premium: false, description: "Analyze a short-form video" },
};

export const SENTIMENTS = {
  positive: {
    label: "Positive",
    color: "#10b981",
    bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    solidClass: "bg-emerald-500 text-white",
  },
  negative: {
    label: "Negative",
    color: "#ef4444",
    bgClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    solidClass: "bg-red-500 text-white",
  },
  neutral: {
    label: "Neutral",
    color: "#f59e0b",
    bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    solidClass: "bg-amber-500 text-white",
  },
  mixed: {
    label: "Mixed",
    color: "#8b5cf6",
    bgClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    solidClass: "bg-violet-500 text-white",
  },
} as const;

export const EMOTIONS: Record<string, { label: string; color: string; emoji: string }> = {
  joy: { label: "Joy", color: "#10b981", emoji: "😄" },
  anger: { label: "Anger", color: "#ef4444", emoji: "😠" },
  sadness: { label: "Sadness", color: "#3b82f6", emoji: "😢" },
  fear: { label: "Fear", color: "#6366f1", emoji: "😨" },
  surprise: { label: "Surprise", color: "#8b5cf6", emoji: "😲" },
  disgust: { label: "Disgust", color: "#84cc16", emoji: "🤢" },
  trust: { label: "Trust", color: "#06b6d4", emoji: "🤝" },
  anticipation: { label: "Anticipation", color: "#f59e0b", emoji: "🤩" },
  neutral: { label: "Neutral", color: "#94a3b8", emoji: "😐" },
};

export const GROUP_INFO = {
  groupNumber: "38",
  projectName: "SentimentSense",
  members: [
    "Vaibhav Thore",
    "Tushar Dabhade",
    "Virendra Tambavekar",
    "Harsh Dubey",
  ],
};

export function getPlatform(id: string) {
  return PLATFORMS[id as PlatformId] || PLATFORMS.youtube;
}

export function getSentiment(id: string) {
  return SENTIMENTS[id as keyof typeof SENTIMENTS] || SENTIMENTS.neutral;
}

export function getEmotion(id: string) {
  return EMOTIONS[id] || EMOTIONS.neutral;
}

export function getContentType(id: string) {
  return CONTENT_TYPES[id] || CONTENT_TYPES.post;
}

export type PlatformIconType = LucideIcon;
