"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SettingsState } from "@/types";

interface SettingsStore extends SettingsState {
  setTheme: (t: SettingsState["theme"]) => void;
  setMotion: (m: SettingsState["motion"]) => void;
  setAmbient: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "light",
      motion: "system",
      ambient: true,
      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      setAmbient: (ambient) => set({ ambient }),
    }),
    {
      name: "visual-os-academy-settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
