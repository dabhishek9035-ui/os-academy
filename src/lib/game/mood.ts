"use client";

import { create } from "zustand";

/**
 * Companion mood bus — tiny, non-persisted. Components call `bump("cheer")`
 * on success moments; the in-scene companion + HUD mini-avatar react for a
 * couple of seconds and settle back to idle.
 */

export type Mood = "idle" | "cheer" | "oops" | "wave" | "sleep";

interface MoodState {
  mood: Mood;
  since: number;
  bump: (m: Exclude<Mood, "idle" | "sleep">) => void;
  settle: () => void;
}

export const useMood = create<MoodState>((set) => ({
  mood: "idle",
  since: Date.now(),
  bump: (m) => set({ mood: m, since: Date.now() }),
  settle: () => set({ mood: "idle", since: Date.now() }),
}));

/** Fire-and-forget helper usable outside React handlers. */
export function bumpMood(m: Exclude<Mood, "idle" | "sleep">) {
  useMood.getState().bump(m);
}
