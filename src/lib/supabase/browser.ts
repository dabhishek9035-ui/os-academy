"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client, or null when the project's env vars are absent —
 * every consumer must handle null so the app degrades to pure-local mode.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && anonKey ? createBrowserClient(url, anonKey) : null;
  return cached;
}

export function isCloudConfigured(): boolean {
  return getSupabaseBrowser() !== null;
}
