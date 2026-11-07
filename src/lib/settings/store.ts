"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SettingsState } from "@/types";

interface SettingsStore extends SettingsState {
  setTheme: (t: SettingsState["theme"]) => void;
  setMotion: (m: SettingsState["motion"]) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "dark",
      motion: "system",
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
    }),
    {
      name: "visual-os-academy-settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
