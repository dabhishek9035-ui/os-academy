import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side session check for gating pages.
 *
 * Returns:
 *  - "unconfigured" — no Supabase env vars: the app runs in pure-local mode
 *    and gated pages must stay open.
 *  - null           — cloud configured but no valid session (or the auth
 *                     server is unreachable; gating fails closed).
 *  - the user       — a verified session (token checked against Supabase).
 *
 * Cookie writes are intentionally a no-op here: server components cannot set
 * cookies, and `src/middleware.ts` already refreshes sessions before render.
 */
export type CloudSession =
  | { kind: "unconfigured" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; userId: string; email: string | null };

export async function getCloudSession(): Promise<CloudSession> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { kind: "unconfigured" };

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookies().getAll();
      },
      setAll() {
        /* no-op: refreshed in middleware */
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { kind: "signed-out" };
    return { kind: "signed-in", userId: data.user.id, email: data.user.email ?? null };
  } catch {
    return { kind: "signed-out" };
  }
}
