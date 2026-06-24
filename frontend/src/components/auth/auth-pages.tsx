"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useAppStore } from "@/store/app-store";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Brain, ArrowLeft, ArrowRight, Loader2, Mail, Lock, User, GraduationCap, Info } from "lucide-react";
import { toast } from "sonner";

export function AuthPages() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const isRegister = view === "register";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            onClick={() => setView("landing")}
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Brain className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Sentiment<span className="text-primary">Sense</span>
            </span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setView("landing")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left: branding */}
          <div className="hidden lg:block">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-10 text-white shadow-2xl shadow-emerald-500/20">
              <Brain className="mb-6 h-12 w-12" />
              <h2 className="text-3xl font-bold leading-tight">
                {isRegister
                  ? "Start your sentiment analysis journey"
                  : "Welcome back to SentimentSense"}
              </h2>
              <p className="mt-4 text-emerald-50">
                {isRegister
                  ? "Create an account to analyze social media content across YouTube, Reddit, X, and Instagram with transformer-powered AI."
                  : "Sign in to access your private dashboard, view past analyses, and continue exploring sentiment insights."}
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Private dashboard — your data, only yours",
                  "Multi-platform sentiment & emotion analysis",
                  "Downloadable PDF reports",
                  "Apply for premium live-stream analysis",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-emerald-50">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                      <ArrowRight className="h-3 w-3" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-10 rounded-xl bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-medium text-emerald-50">
                  Final Year Project
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Group No 38 — Computer Engineering
                </p>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div>
            <Card className="border-border/60 shadow-lg">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-bold">
                    {isRegister ? "Create your account" : "Sign in"}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isRegister
                      ? "Get started with free sentiment analysis"
                      : "Welcome back! Please enter your details."}
                  </p>
                </div>

                {isRegister ? (
                  <RegisterForm />
                ) : (
                  <LoginForm />
                )}

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  {isRegister ? (
                    <>
                      Already have an account?{" "}
                      <button
                        onClick={() => setView("login")}
                        className="font-medium text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        onClick={() => setView("register")}
                        className="font-medium text-primary hover:underline"
                      >
                        Sign up free
                      </button>
                    </>
                  )}
                </div>

                <Separator className="my-6" />
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        Demo Admin Account
                      </p>
                      <p className="mt-0.5">
                        Email: <code className="rounded bg-background px-1 py-0.5">admin@group38.edu</code>
                      </p>
                      <p>
                        Password: <code className="rounded bg-background px-1 py-0.5">admin123</code>
                      </p>
                      <p className="mt-1 text-[11px]">
                        Use this to explore the admin panel and premium features.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
    } else {
      toast.success("Welcome back!");
      // The page orchestrator will switch view on session update
      window.location.reload();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            autoComplete="current-password"
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      toast.success("Account created! Signing you in…");
      // Auto sign-in
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      setLoading(false);
      if (signInRes?.error) {
        toast.error("Account created. Please sign in.");
      } else {
        window.location.reload();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Vaibhav Thore"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
