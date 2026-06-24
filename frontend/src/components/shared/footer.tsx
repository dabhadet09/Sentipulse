"use client";

import { GROUP_INFO } from "@/lib/constants";
import { Brain, Heart, Github, FileText, Code2 } from "lucide-react";

export function Footer() {
  return (
    <footer role="contentinfo" className="mt-auto bg-card/50 backdrop-blur">
      {/* Gradient top border — 2px div with gradient */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* 4-column layout */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 (wider): Brand */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight">
                  Sentiment<span className="text-primary">Sense</span>
                </span>
                <p className="text-xs text-muted-foreground">
                  AI-Powered Sentiment &amp; Emotion Analytics
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Decode public sentiment across YouTube, Reddit, X, and Instagram
              with transformer-based NLP.
            </p>
            <p className="mt-3 text-xs font-medium text-muted-foreground/70">
              Group No {GROUP_INFO.groupNumber} — Final Year Project
            </p>
          </div>

          {/* Column 2: Product links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="mt-3 space-y-2.5">
              {["Features", "Pricing", "FAQ", "Testimonials"].map((label) => (
                <li key={label}>
                  <span
                    className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
                    tabIndex={0}
                    role="link"
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Platform links with colored dots */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Platforms</h3>
            <ul className="mt-3 space-y-2.5">
              {[
                { label: "YouTube", color: "bg-red-500" },
                { label: "Reddit", color: "bg-orange-500" },
                { label: "X", color: "bg-foreground" },
                { label: "Instagram", color: "bg-pink-500" },
              ].map((p) => (
                <li key={p.label}>
                  <span
                    className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
                    tabIndex={0}
                    role="link"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${p.color}`}
                      aria-hidden="true"
                    />
                    {p.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Project info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Project</h3>
            <ul className="mt-3 space-y-2.5">
              <li>
                <span
                  className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
                  tabIndex={0}
                  role="link"
                >
                  <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Tech Stack
                </span>
              </li>
              <li>
                <span
                  className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
                  tabIndex={0}
                  role="link"
                >
                  <Github className="h-3.5 w-3.5" aria-hidden="true" />
                  GitHub
                </span>
              </li>
              <li>
                <span
                  className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
                  tabIndex={0}
                  role="link"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  License
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider between main content and copyright */}
        <div className="mt-10 border-t border-border" />

        {/* Bottom row */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2025 SentimentSense — Group No {GROUP_INFO.groupNumber}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Built with Next.js • Prisma • Transformer Models
            <Heart
              className="h-3.5 w-3.5 fill-red-500 text-red-500"
              aria-label="love"
            />
          </p>
        </div>
      </div>
    </footer>
  );
}
