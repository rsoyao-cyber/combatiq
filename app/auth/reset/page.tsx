"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Landing page for the password-reset email. Two link formats:
// - ?token_hash=…&type=recovery (current email template): works in any
//   browser. The token is only redeemed when the new password is submitted,
//   so email link-scanners that open the page don't use it up.
// - ?code=… (PKCE, older template / Supabase default): exchanged on load and
//   only works in the browser that clicked "Forgot password?".
function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");

  const [stage, setStage] = useState<"verifying" | "ready" | "invalid" | "saving">(
    tokenHash ? "ready" : "verifying",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const exchanged = useRef(false); // a code is single-use; dev strict mode runs effects twice

  useEffect(() => {
    if (tokenHash || exchanged.current) return;
    exchanged.current = true;

    async function verify() {
      if (!code) {
        setError(searchParams.get("error_description") ?? "This reset link is incomplete.");
        setStage("invalid");
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError("This link only works in the browser where you requested it, and for one hour.");
        setStage("invalid");
        return;
      }
      setStage("ready");
    }
    verify();
  }, [code, tokenHash, searchParams]);

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

    if (tokenHash) {
      const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      if (otpError) {
        setError("This link has already been used or is more than an hour old.");
        setStage("invalid");
        return;
      }
    }

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
