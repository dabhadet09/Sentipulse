"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    // Initialize theme from system preference or default
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, [setTheme]);

  return <SessionProvider>{children}</SessionProvider>;
}
