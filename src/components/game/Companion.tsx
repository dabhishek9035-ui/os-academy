"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useMood } from "@/lib/game/mood";
import type { Quality } from "./useQualityTier";

/**
 * "Bit" — the player's companion. A real rigged GLB (CC0 RobotExpressive,
 * 14 clips) living in-scene: Idle loop by default, Dance when you succeed,
 * Sad after a wrong answer, Wave on unlock moments, Sitting when you've been
 * away. Reduced motion freezes to the Standing pose. Pointer head-look via
 * the Head bone (clamped small, applied after the mixer updates).
 */

const CLIP_FOR_MOOD: Record<string, string | null> = {
  idle: "Idle",
  cheer: "Dance",
  oops: "Sad",
  wave: "Wave",
  sleep: "Sitting",
};

export function Companion3D({ tier, reduced, dark }: { tier: Quality; reduced: boolean; dark: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/companion.glb");
  const clone = useMemo(() => scene, [scene]);
  const { actions, mixer } = useAnimations(animations, clone);

  const mood = useMood((s) => s.mood);
  const since = useMood((s) => s.since);
  const current = useRef<string>("Idle");
  const oneShotUntil = useRef(0);

  // auto-sleep: no mood bump for 90 s while the tab is visible
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden && Date.now() - since > 90_000) {
        if (current.current !== "Sitting") {
          fadeTo("Sitting");
        }
      }
    }, 15_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since]);

  function fadeTo(name: string) {
    const next = actions[name];
    const prev = actions[current.current];
    if (!next) return;
    next.reset().fadeIn(0.25).play();
    if (prev && prev !== next) prev.fadeOut(0.25);
    current.current = name;
    const isLoop = name === "Idle" || name === "Sitting" || name === "Standing";
    oneShotUntil.current = isLoop ? 0 : performance.now() + next.getClip().duration * 1000;
  }

  // react to mood changes
  useEffect(() => {
    const clip = CLIP_FOR_MOOD[mood] ?? "Idle";
    const target = reduced ? "Standing" : clip;
    if (target !== current.current) fadeTo(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, since, reduced]);

  // find the head bone for pointer look
  const head = useMemo(() => {
    let found: THREE.Object3D | null = null;
    clone.traverse((o) => {
      if (!found && /head/i.test(o.name) && (o as THREE.Bone).isBone) found = o;
    });
    return found as THREE.Object3D | null;
  }, [clone]);

  const scale = tier === "low" ? 0.34 : 0.4;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // return from one-shot clips to Idle
    if (oneShotUntil.current && performance.now() > oneShotUntil.current && current.current !== "Idle") {
      fadeTo("Idle");
    }
    mixer.update(dt);
    if (head) {
      head.rotation.y = THREE.MathUtils.damp(head.rotation.y, THREE.MathUtils.clamp(state.pointer.x * 0.4, -0.5, 0.5), 4, dt);
      head.rotation.x = THREE.MathUtils.damp(head.rotation.x, THREE.MathUtils.clamp(-state.pointer.y * 0.25, -0.3, 0.3), 4, dt);
    }
    const g = group.current;
    if (g && !reduced) {
      // gentle idle bob so Bit feels alive even over the Idle clip
      g.position.y = -0.92 + Math.sin(t * 1.4) * 0.02;
    }
  });

  return (
    <group ref={group} position={[-2.35, -0.92, 1.6]} rotation={[0, 0.55, 0]} scale={scale}>
      {/* pedestal disc */}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 32]} />
        <meshBasicMaterial color={dark ? "#0d1424" : "#dfe6f2"} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.88, 40]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.65} />
      </mesh>
      <primitive object={clone} />
    </group>
  );
}

useGLTF.preload("/models/companion.glb");
