"use client";

import Link from "next/link";
import { useCloudAuthStore } from "@/lib/sync/auth-store";
import { isCloudConfigured } from "@/lib/supabase/browser";

/**
 * Navbar auth affordance. Renders NOTHING until cloud sync is configured,
 * so the pure-local experience is untouched. Once env vars exist:
 * signed-out → a visible "Sign in" button; signed-in → the account email.
 */
export function CloudAuthNav() {
  const status = useCloudAuthStore((s) => s.status);
  const user = useCloudAuthStore((s) => s.user);

  if (!isCloudConfigured() || status === "loading" || status === "disabled") {
    return null;
  }

  if (status === "signed-in" && user) {
    return (
      <Link
        href="/settings#account-heading"
        className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs text-ink-muted transition-colors hover:bg-panel-soft hover:text-ink"
        title={`Signed in as ${user.email ?? user.id} — manage in Settings`}
      >
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full bg-ok"
        />
        <span className="hidden max-w-36 truncate sm:inline" aria-hidden>
          {user.email ?? "account"}
        </span>
        <span className="sr-only">
          Signed in as {user.email ?? user.id} — open account settings
        </span>
        <span aria-hidden className="sm:hidden">
          Account
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/settings#account-heading"
      className="btn btn-ghost text-xs"
      title="Sign in to sync your progress"
    >
      Sign in
    </Link>
  );
}
