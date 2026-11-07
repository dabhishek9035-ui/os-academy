"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/game/player";
import { useSettingsStore } from "@/lib/settings/store";
import { useQualityTier } from "./useQualityTier";

/**
 * Skill architecture: ONE persistent <Canvas>, fixed, pointer-events none,
 * aria-hidden, mounted client-only and gated on WebGL + a quality tier.
 * The canvas pauses when the tab is hidden and fades in only once ready
 * (first paint stays DOM-complete).
 */

const Inner = dynamic(() => import("./SceneInner"), { ssr: false });

export function SceneShell() {
  const { mounted, webgl, tier } = useQualityTier();
  const quality = useGameStore((s) => s.quality);
  const motion = useSettingsStore((s) => s.motion);
  const [hidden, setHidden] = useState(false);
  const [visible, setVisible] = useState(false); // presence fade-in

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Alt+Shift+Q cycles quality tiers (skill's hidden manual switch)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "Q" || e.key === "q")) {
        const order = ["auto", "high", "medium", "low"] as const;
        const cur = useGameStore.getState().quality;
        const next = order[(order.indexOf(cur) + 1) % order.length];
        useGameStore.getState().setQuality(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const show = mounted && webgl;
  const reduced = motion === "reduced";

  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => setVisible(true), 60);
    return () => window.clearTimeout(id);
  }, [show]);

  if (!show) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 1.1s ease",
      }}
    >
      <Inner tier={tier} reduced={reduced} hidden={hidden} />
    </div>
  );
}
