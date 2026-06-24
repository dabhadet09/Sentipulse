"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { SENTIMENTS, EMOTIONS } from "@/lib/constants";

export function SentimentPieChart({
  distribution,
  height = 260,
}: {
  distribution: { positive: number; negative: number; neutral: number };
  height?: number;
}) {
  const data = [
    { name: "Positive", value: distribution.positive, color: SENTIMENTS.positive.color },
    { name: "Negative", value: distribution.negative, color: SENTIMENTS.negative.color },
    { name: "Neutral", value: distribution.neutral, color: SENTIMENTS.neutral.color },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--popover-foreground)",
          }}
          formatter={(value: number) => [`${value}%`, ""]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EmotionBarChart({
  distribution,
  height = 260,
}: {
  distribution: Record<string, number>;
  height?: number;
}) {
  const data = Object.entries(distribution)
    .map(([key, value]) => ({
      name: EMOTIONS[key]?.label || key,
      value,
      color: EMOTIONS[key]?.color || "#94a3b8",
      emoji: EMOTIONS[key]?.emoji || "",
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--muted-foreground)"
          fontSize={12}
          width={90}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--popover-foreground)",
          }}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SentimentGauge({
  score,
  height = 180,
}: {
  score: number; // -1 to 1
  height?: number;
}) {
  // Map -1..1 to 0..100
  const pct = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
  const color =
    score > 0.2
      ? SENTIMENTS.positive.color
      : score < -0.2
        ? SENTIMENTS.negative.color
        : SENTIMENTS.neutral.color;

  // SVG semicircle gauge — reliable cross-browser, no recharts quirks
  const size = Math.min(height * 1.6, 240);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Semicircle: from 180° (left) to 360°/0° (right)
  const startAngle = 180;
  const endAngle = 360;
  const angleSpan = endAngle - startAngle;
  const valueAngle = startAngle + (pct / 100) * angleSpan;

  function polarToCartesian(centerX: number, centerY: number, r: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: centerX + r * Math.cos(rad), y: centerY + r * Math.sin(rad) };
  }

  function describeArc(x: number, y: number, r: number, a1: number, a2: number) {
    const start = polarToCartesian(x, y, r, a2);
    const end = polarToCartesian(x, y, r, a1);
    const largeArc = a2 - a1 <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  const label =
    score > 0.3
      ? "Very Positive"
      : score > 0.1
        ? "Positive"
        : score > -0.1
          ? "Neutral"
          : score > -0.3
            ? "Negative"
            : "Very Negative";

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ height }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Track */}
        <path
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={describeArc(cx, cy, radius, startAngle, valueAngle)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {score > 0 ? "+" : ""}
          {score.toFixed(2)}
        </span>
        <span className="mt-0.5 text-xs font-medium" style={{ color }}>
          {label}
        </span>
      </div>
      {/* Scale labels */}
      <div className="mt-1 flex w-full justify-between px-4 text-[10px] text-muted-foreground">
        <span>-1.0</span>
        <span>0</span>
        <span>+1.0</span>
      </div>
    </div>
  );
}

export function WordCloud({
  keywords,
  height = 220,
}: {
  keywords: { word: string; count: number; sentiment: string }[];
  height?: number;
}) {
  if (!keywords || keywords.length === 0) {
    return <EmptyChartState message="No keywords extracted" height={height} />;
  }

  const maxCount = Math.max(...keywords.map((k) => k.count));
  const sorted = [...keywords].sort((a, b) => b.count - a.count).slice(0, 24);

  function colorFor(s: string) {
    if (s === "positive") return SENTIMENTS.positive.color;
    if (s === "negative") return SENTIMENTS.negative.color;
    return SENTIMENTS.neutral.color;
  }

  function sizeFor(count: number) {
    const ratio = count / maxCount;
    // font sizes from 0.8rem to 1.8rem
    return `${0.8 + ratio * 1.0}rem`;
  }

  function opacityFor(count: number) {
    const ratio = count / maxCount;
    return 0.55 + ratio * 0.45;
  }

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4"
      style={{ height }}
    >
      {sorted.map((k, i) => (
        <span
          key={`${k.word}-${i}`}
          className="cursor-default rounded-md px-2 py-1 font-semibold transition-transform hover:scale-110"
          style={{
            color: colorFor(k.sentiment),
            fontSize: sizeFor(k.count),
            opacity: opacityFor(k.count),
            backgroundColor: `${colorFor(k.sentiment)}11`,
          }}
          title={`${k.word} — ${k.count} mentions (${k.sentiment})`}
        >
          {k.word}
        </span>
      ))}
    </div>
  );
}

export function EmptyChartState({
  message,
  height = 220,
  icon,
}: {
  message: string;
  height?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 text-center"
      style={{ height }}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon || (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" strokeLinecap="round" />
            <path d="M7 14l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <p className="max-w-[200px] text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

export function TrendAreaChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -20, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--popover-foreground)",
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#trendGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PlatformBarChart({
  data,
  height = 220,
}: {
  data: { platform: string; count: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -20, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="platform" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--popover-foreground)",
          }}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LiveStreamChart({
  data,
  height = 200,
}: {
  data: { time: string; positive: number; negative: number; neutral: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -20, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--popover-foreground)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="positive" stroke={SENTIMENTS.positive.color} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="negative" stroke={SENTIMENTS.negative.color} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="neutral" stroke={SENTIMENTS.neutral.color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
