"use client";

import type { ProgressStateV1, SettingsState } from "@/types";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { SyncedBlob } from "./merge";

/**
 * Cloud data access for the two synced stores. All functions assume a
 * signed-in user; callers (the sync bridge and Settings panel) check
 * `isCloudConfigured()` and auth state first. Errors are rethrown with the
 * Supabase message intact so the UI can show exactly what went wrong.
 */

const PROGRESS_TABLE = "user_progress";
const SETTINGS_TABLE = "user_settings";

export interface CloudUser {
  id: string;
  email: string | null;
}

export async function getSessionUser(): Promise<CloudUser | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? null } : null;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export async function pullProgress(
  userId: string,
): Promise<SyncedBlob<ProgressStateV1> | null> {
  const supabase = getSupabaseBrowser()!;
  const { data, error } = await supabase
    .from(PROGRESS_TABLE)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Loading cloud progress failed: ${error.message}`);
  if (!data) return null;
  return { data: data.data as ProgressStateV1, updatedAt: data.updated_at as string };
}

export async function pushProgress(
  userId: string,
  data: ProgressStateV1,
): Promise<void> {
  const supabase = getSupabaseBrowser()!;
  const { error } = await supabase.from(PROGRESS_TABLE).upsert({
    user_id: userId,
    data,
    data_version: data.version,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Saving cloud progress failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function pullSettings(
  userId: string,
): Promise<SyncedBlob<SettingsState> | null> {
  const supabase = getSupabaseBrowser()!;
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Loading cloud settings failed: ${error.message}`);
  if (!data) return null;
  return { data: data.data as SettingsState, updatedAt: data.updated_at as string };
}

export async function pushSettings(
  userId: string,
  data: SettingsState,
): Promise<void> {
  const supabase = getSupabaseBrowser()!;
  const { error } = await supabase.from(SETTINGS_TABLE).upsert({
    user_id: userId,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Saving cloud settings failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Auth convenience wrappers with UI-ready error messages
// ---------------------------------------------------------------------------

export async function signUp(
  email: string,
  password: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const supabase = getSupabaseBrowser()!;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Use the origin where the account was created instead of Supabase's
      // project Site URL (which is often still localhost in deployed apps).
      emailRedirectTo: `${window.location.origin}/settings?confirmed=1`,
    },
  });
  if (error) throw new Error(signupErrorMessage(error.message));
  return { needsEmailConfirmation: data.session === null };
}

function signupErrorMessage(raw: string): string {
  if (/\bsigned up\b/i.test(raw) && /already/i.test(raw)) {
    return "An account with this email already exists — try signing in instead.";
  }
  if (/password/i.test(raw) && /at least|characters|short/i.test(raw)) {
    return "Password is too weak — Supabase requires at least 6 characters.";
  }
  if (/invalid email|valid email/i.test(raw)) {
    return "That doesn't look like a valid email address.";
  }
  return raw;
}

export async function signIn(email: string, password: string): Promise<void> {
  const supabase = getSupabaseBrowser()!;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      throw new Error("Wrong email or password — no account matches that combination.");
    }
    if (/email not confirmed/i.test(error.message)) {
      throw new Error(
        "This email isn't confirmed yet — check your inbox for the confirmation link (or disable \"Confirm email\" in Supabase for local testing).",
      );
    }
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowser()!;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
