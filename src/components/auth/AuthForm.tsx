"use client";

import { useState, type FormEvent } from "react";
import { signIn, signUp } from "@/lib/sync/cloud";

/**
 * The email+password form shared by the Settings panel and the lesson
 * auth gate. Handles sign-in / sign-up modes, error rendering, and the
 * "check your inbox" confirmation flow. `onSuccess` fires when a session
 * exists (immediately after sign-in, or after sign-up when email
 * confirmation is disabled).
 */
export function AuthForm({
  onSuccess,
  blurb,
}: {
  /** Called when the user ends up with a live session. */
  onSuccess?: () => void;
  blurb?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const result = await signUp(email.trim(), password);
        if (result.needsEmailConfirmation) {
          setInfo(
            "Account created — check your inbox for a confirmation link, then sign in.",
          );
        } else {
          onSuccess?.();
        }
      } else {
        await signIn(email.trim(), password);
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {blurb ? <p className="text-sm text-ink-muted">{blurb}</p> : null}
      <form className="mt-3 space-y-2.5" action="#" onSubmit={submit}>
        <label className="block text-xs text-ink-muted">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-ink"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          Password
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2.5 text-sm text-ink"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="authform-password-hint"
          />
          <span id="authform-password-hint" className="mt-1 block text-ink-faint">
            at least 6 characters
          </span>
        </label>
        {error ? (
          <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink">
            {error}
          </p>
        ) : null}
        {info ? (
          <p role="status" className="rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ink">
            {info}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary text-xs" disabled={busy}>
            {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create free account"}
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => {
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "sign-in"
              ? "No account yet? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
