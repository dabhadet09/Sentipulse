"use client";

import { Badge } from "@/components/ui/badge";
import { getSentiment, getEmotion, getPlatform } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SentimentBadge({ sentiment, className }: { sentiment: string; className?: string }) {
  const s = getSentiment(sentiment);
  return (
    <Badge variant="outline" className={cn(s.bgClass, "border font-medium capitalize", className)}>
      {s.label}
    </Badge>
  );
}

export function EmotionBadge({ emotion, className }: { emotion: string; className?: string }) {
  const e = getEmotion(emotion);
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", className)}>
      <span>{e.emoji}</span>
      <span>{e.label}</span>
    </Badge>
  );
}

export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  const p = getPlatform(platform);
  const Icon = p.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", p.bgClass, className)}>
      <Icon className="h-3 w-3" />
      {p.label}
    </Badge>
  );
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white", className)}>
      <span className="text-[10px]">★</span>
      PREMIUM
    </Badge>
  );
}
