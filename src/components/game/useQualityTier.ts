"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/game/player";

export type Quality = "high" | "medium" | "low";

/**
 * Quality tiers per the skill: initial guess from hardware + pointer type,
 * then a one-way FPS probe that skips the first 2.5 s (shader-compile hitch)
 * and uses the median frame time (<20 fps → low, <38 → medium; never
 * auto-upgrades). The settings store can pin a tier or "auto".
 */
export function useQualityTier(): { mounted: boolean; webgl: boolean; tier: Quality; reduced: boolean } {
  const qualitySetting = useGameStore((s) => s.quality);
  const [probe, setProbe] = useState<{ webgl: boolean; tier: Quality }>({
    webgl: false,
    tier: "medium",
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
    const cores = navigator.hardwareConcurrency ?? 4;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const initial: Quality = !webgl
      ? "low"
      : cores >= 8 && window.devicePixelRatio <= 2
        ? "high"
        : cores >= 4
          ? "medium"
          : coarse
            ? "medium"
            : "low";
    setProbe({ webgl, tier: initial });

    // one-way FPS probe (only downgrades)
    if (!webgl) return;
    let raf = 0;
    const start = performance.now();
    let last = 0;
    let samples: number[] = [];
    const tick = (now: number) => {
      if (last && now - start > 2500 && now - start < 6000) {
        samples.push(now - last);
      }
      last = now;
      if (now - start < 6200) {
        raf = requestAnimationFrame(tick);
      } else if (samples.length > 10) {
        samples.sort((a, b) => a - b);
        const median = samples[Math.floor(samples.length / 2)];
        const fps = 1000 / median;
        setProbe((p) => {
          if (fps < 20 && p.tier !== "low") return { ...p, tier: "low" };
          if (fps < 38 && p.tier === "high") return { ...p, tier: "medium" };
          return p;
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tier: Quality =
    qualitySetting === "auto" ? probe.tier : (qualitySetting as Quality);

  return { mounted, webgl: probe.webgl, tier, reduced: false };
}

/** Reduced-motion check honouring the settings store and the OS. */
export function useGameReducedMotion(): boolean {
  const motion = useGameStoreSafeMotion();
  const [osReduce, setOsReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setOsReduce(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return motion === "reduced" || (motion === "system" && osReduce);
}

function useGameStoreSafeMotion(): "system" | "reduced" | "full" {
  // reads the settings store lazily to avoid import cycles at module scope
  const [motion, setMotion] = useState<"system" | "reduced" | "full">("system");
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { useSettingsStore } = await import("@/lib/settings/store");
      if (mounted) {
        setMotion(useSettingsStore.getState().motion);
        useSettingsStore.subscribe((s) => setMotion(s.motion));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return motion;
}
