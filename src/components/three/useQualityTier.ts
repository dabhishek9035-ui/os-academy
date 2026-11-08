"use client";

import { useEffect, useRef, useState } from "react";

/**
 * WebGL capability probe + quality tiering per the immersive-3d-web skill.
 * The 3D experience is a complement, never a requirement: this component
 * decides between rendering the 3D canvas or the 2D fallback.
 */
export function useQualityTier(): {
  mounted: boolean;
  webgl: boolean;
  tier: "high" | "medium" | "low";
  reduced: boolean;
} {
  const [state, setState] = useState<{
    mounted: boolean;
    webgl: boolean;
    tier: "high" | "medium" | "low";
    reduced: boolean;
  }>({ mounted: false, webgl: false, tier: "low", reduced: false });
  const probed = useRef(false);

  useEffect(() => {
    if (probed.current) return;
    probed.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      );
    } catch {
      webgl = false;
    }
    const cores = navigator.hardwareConcurrency ?? 4;
    const tier: "high" | "medium" | "low" =
      !webgl ? "low" : cores >= 8 && window.devicePixelRatio <= 2 ? "high" : cores >= 4 ? "medium" : "low";
    setState({ mounted: true, webgl, tier, reduced });
  }, []);

  return state;
}
