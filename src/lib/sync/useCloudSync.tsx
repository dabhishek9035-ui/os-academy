"use client";

import { useEffect } from "react";
import { getSupabaseBrowser, isCloudConfigured } from "@/lib/supabase/browser";
import { useProgressStore } from "@/lib/progress/store";
import { useSettingsStore } from "@/lib/settings/store";
import {
  getSessionUser,
  pullProgress,
  pullSettings,
  pushProgress,
  pushSettings,
} from "./cloud";
import { resolveBlob, isPristineProgress } from "./merge";
import { useCloudAuthStore } from "./auth-store";

/**
 * CloudSyncBridge — mounted once in the root layout. Invisible; owns all
 * cloud-sync behaviour:
 *
 *  - discovers the session and listens for sign-in/sign-out;
 *  - on sign-in: pulls both stores and adopts whichever side is newer;
 *  - while signed in: pushes local changes (debounced ~1.5 s);
 *  - with no Supabase env vars: does nothing at all (pure-local mode).
 *
 * Remote writes go through the same zustand setters the UI uses, so every
 * subscribed view updates exactly as if the change had been made locally.
 */
export function CloudSyncBridge() {
  useEffect(() => {
    if (!isCloudConfigured()) {
      useCloudAuthStore.getState().setStatus("disabled");
      return;
    }
    const supabase = getSupabaseBrowser()!;
    const auth = useCloudAuthStore.getState();
    let currentUser: string | null = null;
    let pushTimer: number | undefined;
    let adopting = false; // suppress push when we ourselves just wrote state

    const schedulePush = () => {
      if (!currentUser || adopting) return;
      window.clearTimeout(pushTimer);
      pushTimer = window.setTimeout(async () => {
        if (!currentUser) return;
        try {
          await pushProgress(currentUser, useProgressStore.getState());
          await pushSettings(currentUser, useSettingsStore.getState());
          auth.markSynced();
        } catch (err) {
          auth.setSyncError(err instanceof Error ? err.message : String(err));
        }
      }, 1500);
    };

    const adopt = async (userId: string) => {
      adopting = true;
      try {
        // Progress: the store itself carries updatedAt.
        const [remoteProgress, remoteSettings] = await Promise.all([
          pullProgress(userId),
          pullSettings(userId),
        ]);

        const localProgress = useProgressStore.getState();
        if (remoteProgress) {
          // A freshly booted (pristine) local store has no claim on the
          // cloud: it would stamp itself "now" and erase real history.
          const decision = isPristineProgress(localProgress)
            ? { adopt: remoteProgress.data as typeof localProgress, winner: "remote" as const }
            : resolveBlob(
                { data: localProgress, updatedAt: localProgress.updatedAt },
                remoteProgress,
              );
          if (decision.winner === "remote") {
            useProgressStore.setState(decision.adopt!);
          }
        } else {
          // First sync for this account: seed the cloud with the local
          // state so every user has its rows immediately (and so the
          // merge policy has an updatedAt anchor from now on).
          await pushProgress(userId, localProgress);
        }

        // Settings: no timestamp inside the store; the bridge keeps the last
        // known cloud timestamp in a meta key so re-pulls don't clobber edits.
        const localSettings = useSettingsStore.getState();
        if (remoteSettings) {
          const lastSeen = readMeta("settingsUpdatedAt");
          const decision = resolveBlob(
            { data: localSettings, updatedAt: lastSeen },
            remoteSettings,
          );
          if (decision.winner === "remote") {
            useSettingsStore.setState(decision.adopt!);
          }
          writeMeta("settingsUpdatedAt", remoteSettings.updatedAt);
        } else {
          await pushSettings(userId, localSettings);
          // The cloud row now carries the authoritative timestamp.
          const seeded = await pullSettings(userId);
          if (seeded) writeMeta("settingsUpdatedAt", seeded.updatedAt);
        }
        auth.markSynced();
      } catch (err) {
        auth.setSyncError(err instanceof Error ? err.message : String(err));
      } finally {
        // Let the debounced push run after adoption finishes.
        window.setTimeout(() => {
          adopting = false;
        }, 50);
      }
    };

    // Initial session discovery.
    getSessionUser()
      .then((user) => {
        if (user) {
          currentUser = user.id;
          auth.setStatus("signed-in", user);
          void adopt(user.id);
        } else {
          auth.setStatus("signed-out");
        }
      })
      .catch(() => auth.setStatus("signed-out"));

    // Session changes (sign-in from Settings, sign-out, token refresh).
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (event === "SIGNED_OUT" || !user) {
        if (currentUser) {
          currentUser = null;
          window.clearTimeout(pushTimer);
          auth.setStatus("signed-out");
        }
        return;
      }
      if (event === "SIGNED_IN" || (event === "TOKEN_REFRESHED" && !currentUser)) {
        if (user.id !== currentUser) {
          currentUser = user.id;
          auth.setStatus("signed-in", { id: user.id, email: user.email ?? null });
          void adopt(user.id);
        }
      }
    });

    // Push local edits while signed in.
    const unsubProgress = useProgressStore.subscribe(schedulePush);
    const unsubSettings = useSettingsStore.subscribe(schedulePush);

    return () => {
      authListener.subscription.unsubscribe();
      unsubProgress();
      unsubSettings();
      window.clearTimeout(pushTimer);
    };
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// Settings-blob timestamps (settings state itself has no updatedAt field)
// ---------------------------------------------------------------------------

const META_KEY = "visual-os-academy-sync-meta";

function readMeta(key: string): string | null {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Record<string, string>)[key] ?? null;
  } catch {
    return null;
  }
}

function writeMeta(key: string, value: string): void {
  try {
    const raw = window.localStorage.getItem(META_KEY);
    const meta = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    meta[key] = value;
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* storage unavailable — merge falls back to remote-wins */
  }
}
