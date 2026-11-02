"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "reset" | "sent">("signin");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleReset(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMode("sent");
  }

  if (mode === "sent") {
    return (
      <div className="w-full max-w-sm space-y-4">
        <h2 className="font-display text-3xl font-bold uppercase text-foreground">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a
          link to set a new password. Open it on this device and browser.
        </p>
        <Button variant="outline" className="w-full" onClick={() => { setMode("signin"); setError(null); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h2 className="font-display text-3xl font-bold uppercase text-foreground">Reset password</h2>
          <p className="text-sm text-muted-foreground">We&apos;ll email you a link to set a new one.</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-3xl font-bold uppercase text-foreground">Sign in</h2>
        <p className="text-sm text-muted-foreground">Access your practitioner dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => { setMode("reset"); setError(null); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full font-semibold" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left hero panel (desktop only) ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-sidebar">
        <div className="flex flex-col leading-none gap-1 select-none">
          <span className="font-display text-white font-bold text-3xl uppercase tracking-wide">CombatIQ</span>
          <span className="text-white/60 text-sm">by TFP Clinic</span>
        </div>
        <div className="space-y-4">
          <h1 className="font-display text-6xl font-bold uppercase text-white leading-[0.95]">
            Performance intelligence<br />for combat athletes.
          </h1>
          <p className="text-white/70 text-lg max-w-sm">
            Track training load, wellbeing, and readiness — all in one place for you and your squad.
          </p>
        </div>
        <p className="text-white/40 text-sm">© {new Date().getFullYear()} CombatIQ</p>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <span className="font-display text-3xl font-bold uppercase tracking-wide text-primary">CombatIQ</span>
          <p className="text-sm text-muted-foreground mt-1">Performance intelligence for combat athletes</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
