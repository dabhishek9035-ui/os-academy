"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings/store";

/** Applies theme + motion preferences to <html data-theme/data-motion>. */
export function ThemeApplier() {
  const theme = useSettingsStore((s) => s.theme);
  const motion = useSettingsStore((s) => s.motion);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const reduced =
        motion === "reduced" || (motion === "system" && media.matches);
      root.dataset.motion = reduced ? "reduced" : "full";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [motion]);

  return null;
}
