"use client";

import { useState, type FormEvent } from "react";
import { isCloudConfigured } from "@/lib/supabase/browser";
import { useCloudAuthStore } from "@/lib/sync/auth-store";
import {
  pushProgress,
  pushSettings,
  signIn,
  signOut,
  signUp,
} from "@/lib/sync/cloud";
import { useProgressStore } from "@/lib/progress/store";
import { useSettingsStore } from "@/lib/settings/store";

/**
 * Account & cloud-sync panel for the Settings page. Honest about every
 * state: not configured, signed out, signed in, sync error.
 */
export function AccountPanel() {
  const status = useCloudAuthStore((s) => s.status);
  const user = useCloudAuthStore((s) => s.user);
  const lastSyncedAt = useCloudAuthStore((s) => s.lastSyncedAt);
  const syncError = useCloudAuthStore((s) => s.syncError);

  if (status === "loading") {
    return (
      <section className="card panel-pad" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-base font-semibold text-ink">
          Account &amp; sync
        </h2>
        <p className="mt-2 text-sm text-ink-faint">Checking sign-in state…</p>
      </section>
    );
  }

  if (status === "disabled") {
    return (
      <section className="card panel-pad" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-base font-semibold text-ink">
          Account &amp; sync
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Cloud sync isn&apos;t configured, so progress lives only in this
          browser (nothing leaves your machine). To enable it, create a free
          Supabase project and follow{" "}
          <code className="rounded border border-line bg-panel-soft px-1.5 py-0.5 font-mono text-xs">
            supabase/README.md
          </code>{" "}
          — then add the two keys to{" "}
          <code className="rounded border border-line bg-panel-soft px-1.5 py-0.5 font-mono text-xs">
            .env.local
          </code>{" "}
          and restart the app.
        </p>
      </section>
    );
  }

  if (status === "signed-in" && user) {
    return (
      <section className="card panel-pad" aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-base font-semibold text-ink">
          Account &amp; sync
        </h2>
        <p className="mt-2 text-sm text-ink">
          Signed in as{" "}
          <span className="font-medium text-ink">{user.email ?? user.id}</span>
        </p>
        <dl className="mt-2 space-y-1 text-xs text-ink-muted">
          <div className="flex justify-between gap-3">
            <dt>Sync status</dt>
            <dd className="text-right">
              {syncError ? (
                <span className="text-bad">error — see below</span>
              ) : lastSyncedAt ? (
                <span className="font-mono">
                  last synced {new Date(lastSyncedAt).toLocaleTimeString()}
                </span>
              ) : (
                "waiting for first sync"
              )}
            </dd>
          </div>
        </dl>
        {syncError ? (
          <p
            role="alert"
            className="mt-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-ink"
          >
            {syncError}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <SaveNowButton />
          <SignOutButton />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          While signed in, every change is pushed to your Supabase project
          automatically (about a second after you make it). Clearing this
          browser&apos;s site data is safe — sign in again and everything
          comes back.
        </p>
      </section>
    );
  }

  return <SignInForm />;
}

function SaveNowButton() {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const user = useCloudAuthStore((s) => s.user);

  const saveNow = async () => {
    if (!user) return;
    setSaving(true);
    setNote(null);
    try {
      await pushProgress(user.id, useProgressStore.getState());
      await pushSettings(user.id, useSettingsStore.getState());
      useCloudAuthStore.getState().markSynced();
      setNote("Saved to your database.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className="btn text-xs" onClick={saveNow} disabled={saving}>
        {saving ? "Saving…" : "Save to cloud now"}
      </button>
      {note ? <span className="text-xs text-ink-faint">{note}</span> : null}
    </span>
  );
}

function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const setStatus = useCloudAuthStore((s) => s.setStatus);
  return (
    <button
      type="button"
      className="btn btn-ghost text-xs"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut();
          setStatus("signed-out");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

function SignInForm() {
  const setStatus = useCloudAuthStore((s) => s.setStatus);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
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
            "Account created — check your inbox for a confirmation link, then sign in here. (You can also disable \"Confirm email\" in the Supabase dashboard for local testing.)",
          );
        }
        // If a session exists already (confirmation disabled), the bridge's
        // onAuthStateChange flips the app to signed-in on its own.
      } else {
        await signIn(email.trim(), password);
        setStatus("signed-in"); // bridge refines with the real user object
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card panel-pad" aria-labelledby="account-heading">
      <h2 id="account-heading" className="text-base font-semibold text-ink">
        Account &amp; sync
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Sign in to keep your progress on your Supabase project — it survives
        clearing site data and follows you to other devices. Without an
        account, everything stays in this browser.
      </p>
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
            aria-describedby="password-hint"
          />
          <span id="password-hint" className="mt-1 block text-ink-faint">
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
            {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
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
    </section>
  );
}
