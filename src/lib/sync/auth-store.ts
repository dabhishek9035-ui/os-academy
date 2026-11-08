"use client";

import { create } from "zustand";
import type { CloudUser } from "./cloud";

/**
 * Auth/session state for the cloud sync (never persisted — Supabase owns the
 * session in cookies; `disabled` means the project has no Supabase env vars
 * and the app is running in pure-local mode).
 */
export type CloudStatus = "disabled" | "loading" | "signed-out" | "signed-in";

interface CloudAuthState {
  status: CloudStatus;
  user: CloudUser | null;
  /** ISO timestamp of the last successful pull/push, for the Settings panel. */
  lastSyncedAt: string | null;
  /** Last error message from a sync attempt, cleared on the next success. */
  syncError: string | null;
  setStatus: (status: CloudStatus, user?: CloudUser | null) => void;
  markSynced: () => void;
  setSyncError: (message: string | null) => void;
}

export const useCloudAuthStore = create<CloudAuthState>((set) => ({
  status: "loading",
  user: null,
  lastSyncedAt: null,
  syncError: null,
  setStatus: (status, user = null) => set({ status, user }),
  markSynced: () => set({ lastSyncedAt: new Date().toISOString(), syncError: null }),
  setSyncError: (message) => set({ syncError: message }),
}));
