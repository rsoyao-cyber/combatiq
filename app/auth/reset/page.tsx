"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Landing page for the password-reset email. Supabase redirects here with a
// one-time ?code= that is exchanged for a session (PKCE — the code verifier
// lives in a cookie set when "Forgot password?" was clicked, so the link must
// be opened in the same browser). Then the user picks a new password.
function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stage, setStage] = useState<"verifying" | "ready" | "invalid" | "saving">("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const exchanged = useRef(false); // a code is single-use; dev strict mode runs effects twice

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    async function verify() {
      const code = searchParams.get("code");
      if (!code) {
        setError(searchParams.get("error_description") ?? "This reset link is missing its code.");
        setStage("invalid");
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError("This link has expired or was opened in a different browser.");
        setStage("invalid");
        return;
      }
      setStage("ready");
    }
    verify();
  }, [searchParams]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setStage("saving");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStage("ready");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (stage === "verifying") {
    return <p className="text-sm text-muted-foreground">Checking your reset link…</p>;
  }

  if (stage === "invalid") {
    return (
      <div className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Link not valid</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link href="/login" className="inline-block text-sm font-semibold text-primary hover:underline">
          Request a new link from the sign-in page
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-foreground">You&apos;ll be signed in once it&apos;s saved.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full h-10 font-semibold" disabled={stage === "saving"}>
          {stage === "saving" ? "Saving…" : "Save password and sign in"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="mb-8 text-center">
        <span className="font-display text-3xl font-bold uppercase tracking-wide text-primary">CombatIQ</span>
        <p className="text-sm text-muted-foreground mt-1">by TFP Clinic</p>
      </div>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
