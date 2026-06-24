"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMotionValue,
  useInView,
  animate,
  motion,
} from "framer-motion";

interface AnimatedCounterProps {
  /** Target value to count up to. */
  value: number;
  /** Animation duration in milliseconds. */
  duration?: number;
  /** Optional className for the rendered <span>. */
  className?: string;
  /** Optional formatter applied to the current number (e.g. for decimals). */
  format?: (n: number) => string;
  /** Delay (ms) before starting the count-up. */
  delay?: number;
}

/**
 * AnimatedCounter — smoothly counts from 0 to `value` when the element
 * scrolls into the viewport. Uses Framer Motion's `useMotionValue` + `animate`
 * so the animation runs off the React render loop (high performance) and the
 * final value always settles to the prop exactly. The number is rendered with
 * `tabular-nums` so digits don't jitter horizontally while counting.
 */
export function AnimatedCounter({
  value,
  duration = 1000,
  className,
  format,
  delay = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  // Local display value so we can render formatted numbers without re-rendering
  // the whole tree on each animation frame.
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    let startTimeout: ReturnType<typeof setTimeout> | undefined;
    let stop: (() => void) | undefined;

    startTimeout = setTimeout(() => {
      const controls = animate(motionValue, value, {
        duration: duration / 1000,
        ease: [0.16, 1, 0.3, 1], // ease-out quartic — smooth, snappy settle
        onUpdate: (latest) => setDisplay(latest),
        onComplete: () => setDisplay(value),
      });
      stop = controls.stop;
    }, delay);

    return () => {
      if (startTimeout) clearTimeout(startTimeout);
      if (stop) stop();
    };
  }, [inView, value, duration, delay, motionValue]);

  const formatted = format ? format(display) : Math.round(display).toString();

  return (
    <motion.span
      ref={ref}
      className={`tabular-nums ${className ?? ""}`}
      // Subtle fade-in to avoid a flash of "0" before animation starts.
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {formatted}
    </motion.span>
  );
}
