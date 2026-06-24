import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SentimentSense — AI Sentiment & Emotion Analytics | Group No 38",
  description:
    "Advanced sentiment and emotion analysis dashboard for YouTube, Reddit, X, and Instagram. Powered by fine-tuned transformer models.",
  keywords: [
    "sentiment analysis",
    "emotion analysis",
    "NLP",
    "transformers",
    "YouTube",
    "Reddit",
    "X",
    "Instagram",
    "social media analytics",
  ],
  authors: [
    { name: "Vaibhav Thore" },
    { name: "Tushar Dabhade" },
    { name: "Virendra Tambavekar" },
    { name: "Harsh Dubey" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
