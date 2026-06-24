"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const TOUR_KEY = "sentimentsense_tour_completed";

interface TourStep {
  target: string | null; // CSS selector or null for whole-page highlight
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to SentimentSense! 👋",
    description:
      "Your AI-powered sentiment and emotion analysis dashboard. Let's take a quick tour of the key features.",
  },
  {
    target: '[data-tour="new-analysis"]',
    title: "Start an Analysis",
    description:
      "Click here to analyze sentiment from YouTube, Reddit, X, or Instagram content using our fine-tuned AI model.",
  },
  {
    target: '[data-tour="my-analyses"]',
    title: "View Your Results",
    description:
      "All your past analyses live here — view sentiment breakdowns, emotion charts, and download reports.",
  },
  {
    target: '[data-tour="premium"]',
    title: "Go Premium",
    description:
      "Unlock live stream analysis, advanced comparison tools, and more with a premium account.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  // Check if tour should auto-start
  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_KEY);
      if (!completed) {
        // Small delay so the dashboard layout renders first
        const timer = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Track spotlight position
  const updateSpotlight = useCallback(() => {
    const currentStep = STEPS[step];
    if (!currentStep?.target) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!open) return;

    const onResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateSpotlight);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    // Use rAF loop to keep position synced (handles sidebar transitions etc.)
    let running = true;
    const loop = () => {
      if (!running) return;
      updateSpotlight();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, step, updateSpotlight]);

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }

  function handlePrev() {
    if (step > 0) setStep(step - 1);
  }

  function handleClose() {
    setOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "true");
    } catch {
      // silent
    }
  }

  function handleSkip() {
    setOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "true");
    } catch {
      // silent
    }
  }

  if (!open) return null;

  const currentStep = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // Compute tooltip position based on the spotlight element
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 10001,
  };

  if (spotlightRect) {
    const rect = spotlightRect;
    // Position tooltip to the right of the element, or below if not enough space
    const spaceRight = window.innerWidth - rect.right;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceRight > 320) {
      tooltipStyle = {
        ...tooltipStyle,
        top: Math.max(16, rect.top),
        left: rect.right + 16,
        maxWidth: 300,
      };
    } else if (spaceBelow > 220) {
      tooltipStyle = {
        ...tooltipStyle,
        top: rect.bottom + 12,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 316)),
        maxWidth: 300,
      };
    } else {
      tooltipStyle = {
        ...tooltipStyle,
        bottom: Math.max(16, window.innerHeight - rect.top + 12),
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 316)),
        maxWidth: 300,
      };
    }
  } else {
    // Center the tooltip for the "welcome" step
    tooltipStyle = {
      ...tooltipStyle,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: 400,
    };
  }

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
        aria-hidden
      />

      {/* Spotlight ring around target element */}
      {spotlightRect && (
        <div
          style={{
            position: "fixed",
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
            zIndex: 10000,
            borderRadius: 12,
            pointerEvents: "none",
            boxShadow: "0 0 0 4px rgba(16,185,129,0.5), 0 0 24px rgba(16,185,129,0.25)",
          }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          style={tooltipStyle}
          className="rounded-xl border border-border bg-card p-5 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Skip tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Step indicator */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* Title */}
          <h3 className="text-base font-bold leading-tight">
            {currentStep.title}
          </h3>

          {/* Description */}
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {currentStep.description}
          </p>

          {/* Progress dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-4 bg-emerald-500"
                    : i < step
                      ? "w-1.5 bg-emerald-500/50"
                      : "w-1.5 bg-muted-foreground/25"
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-8 text-xs text-muted-foreground"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-xs text-white hover:opacity-90"
              >
                {isLast ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
