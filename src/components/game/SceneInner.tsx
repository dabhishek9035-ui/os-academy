"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { WorldScene } from "./WorldScene";
import type { Quality } from "./useQualityTier";

/** Canvas wrapper — separated so the shell can gate it client-only. */
export default function SceneInner({
  tier,
  reduced,
  hidden,
}: {
  tier: Quality;
  reduced: boolean;
  hidden: boolean;
}) {
  const dpr: [number, number] = tier === "high" ? [1, 1.75] : tier === "medium" ? [1, 1.25] : [1, 1];
  return (
    <Canvas
      frameloop={hidden ? "never" : "always"}
      dpr={dpr}
      camera={{ position: [0, 1.6, 6.4], fov: 50 }}
      gl={{
        antialias: tier !== "low",
        alpha: false,
        powerPreference: tier === "low" ? "default" : "high-performance",
        toneMapping: THREE.NeutralToneMapping,
      }}
      style={{ pointerEvents: "none" }}
    >
      <WorldScene tier={tier} reduced={reduced} />
    </Canvas>
  );
}
