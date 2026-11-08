"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { LockIcon } from "@/components/ui/icons";

/**
 * Server-enforced gate: the lesson page renders THIS instead of the lesson
 * content when the visitor has no account (and cloud sync is configured).
 * Signing in or creating an account here establishes the session cookie,
 * then a router refresh re-renders the server page — this time with the
 * lesson. The playground stays open without an account.
 */
export function LessonAuthGate({ moduleTitle }: { moduleTitle?: string }) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-md">
      <section className="card panel-pad" aria-labelledby="gate-heading">
        <LockIcon width={28} height={28} className="text-ink-faint" />
        <h1 id="gate-heading" className="mt-3 text-xl font-semibold text-ink">
          {moduleTitle ? "Sign up to start this lesson" : "Sign up to start learning"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Lessons need a free account so your progress is yours: it survives
          clearing your browser data and follows you to any device. The
          playground stays open without one.
        </p>
        <div className="mt-4">
          <AuthForm onSuccess={() => router.refresh()} />
        </div>
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-faint">
          Just browsing?{" "}
          <Link href="/playground" className="link">
            Explore the playground
          </Link>{" "}
          — every simulation runs without an account.
        </p>
      </section>
    </div>
  );
}
