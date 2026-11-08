"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSystemStore } from "@/lib/commands/system-store";
import { useSettingsStore } from "@/lib/settings/store";
import { PALETTES, type ScenePalette } from "@/lib/three/scenePalette";
import type { SimProcess } from "@/modules/processes/engine";

/**
 * The 3D "system landscape" — an abstract, data-driven scene (per the
 * immersive-3d-web skill: abstract primitives are appropriate here; no
 * recognisable objects are faked from boxes).
 *
 * Look follows the Notion profile: matte materials, paper-toned ground,
 * hairline grid, one accent. No emissive glow, no halo, no coloured point
 * lights. Colours come from lib/three/scenePalette (mirrors the CSS tokens).
 *
 * Read-only consumer of the shared simulation store: the 2D labs remain the
 * source of truth. Per-frame values are eased in useFrame; React state only
 * carries low-frequency changes. Ambient motion period ≈ 12 s; everything
 * freezes under reduced motion.
 */

const SYSTEM_RADIUS = 4.2;

function eased(current: number, target: number, dt: number, speed = 4): number {
  return current + (target - current) * (1 - Math.exp(-dt * speed));
}

/** Central core = the CPU. Scales up while a process runs. */
function CpuCore({ busy, palette }: { busy: boolean; palette: ScenePalette }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += dt * 0.4;
    const s = eased(mesh.current.scale.x, busy ? 1.18 : 1.0, dt, 6);
    mesh.current.scale.setScalar(s);
  });
  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color={palette.ink} roughness={0.7} metalness={0} flatShading />
      </mesh>
      {/* Static accent ring marks the core; it never pulses or glows. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.75, 0.025, 8, 64]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
    </group>
  );
}

/** One orb per live process, arranged on a ring. Height = progress. */
function ProcessOrb({
  proc,
  index,
  total,
  palette,
}: {
  proc: SimProcess;
  index: number;
  total: number;
  palette: ScenePalette;
}) {
  const group = useRef<THREE.Group>(null);
  const targetY = useMemo(() => (proc.progress / Math.max(1, proc.burst)) * 2.2, [proc.progress, proc.burst]);
  const angle = (index / Math.max(1, total)) * Math.PI * 2;
  useFrame((state, dt) => {
    if (!group.current) return;
    const targetX = Math.cos(angle + state.clock.elapsedTime * 0.08) * SYSTEM_RADIUS;
    const targetZ = Math.sin(angle + state.clock.elapsedTime * 0.08) * SYSTEM_RADIUS;
    group.current.position.x = eased(group.current.position.x, targetX, dt, 2.2);
    group.current.position.z = eased(group.current.position.z, targetZ, dt, 2.2);
    group.current.position.y = eased(group.current.position.y, targetY, dt, 3);
  });
  const color = palette.process[index % palette.process.length];
  const zombie = proc.state === "zombie";
  const blocked = proc.state === "blocked";
  const terminated = proc.state === "terminated";
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.42, 28, 28]} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          transparent={zombie || terminated}
          opacity={terminated ? 0.25 : zombie ? 0.55 : 1}
        />
      </mesh>
      {/* State is also shown in the DOM list; the wire cage is a second cue, not the only one. */}
      {(zombie || blocked) && (
        <mesh scale={1.5}>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshBasicMaterial color={zombie ? palette.process[4] : palette.process[2]} transparent opacity={0.6} wireframe />
        </mesh>
      )}
    </group>
  );
}

/** Ground grid + stationary hardware markers — the "landscape" layer. */
function Landscape({ spin, palette }: { spin: boolean; palette: ScenePalette }) {
  const grid = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (grid.current && spin) grid.current.rotation.y += dt * 0.03;
  });
  return (
    <group ref={grid}>
      <gridHelper args={[16, 24, palette.gridMajor, palette.gridMinor]} position={[0, -2.2, 0]} />
      {/* disk monolith */}
      <mesh position={[-5.4, -1.1, -2.4]}>
        <boxGeometry args={[1.4, 2.2, 1.4]} />
        <meshStandardMaterial color={palette.gridMajor} roughness={0.8} />
      </mesh>
      {/* RAM bars */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[5.4, -1.6 + i * 0.55, -2.4 - i * 0.9]}>
          <boxGeometry args={[1.5, 0.28, 0.7]} />
          <meshStandardMaterial color={palette.accent} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ reduced }: { reduced: boolean }) {
  useFrame((state, delta) => {
    if (reduced) return;
    // Slow autonomous orbit + gentle mouse parallax. dt clamped so a tab
    // switch never makes the camera jump.
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const r = 9.5;
    state.camera.position.x = eased(
      state.camera.position.x,
      Math.sin(t * 0.05) * r * 0.35 + state.pointer.x * 0.9,
      dt,
      1.4,
    );
    state.camera.position.y = eased(state.camera.position.y, 3.4 + state.pointer.y * 0.5, dt, 1.4);
    state.camera.position.z = eased(state.camera.position.z, r, dt, 1.4);
    state.camera.lookAt(0, 0.4, 0);
  });
  return null;
}

export function SystemScene({ reduced, tier }: { reduced: boolean; tier: "high" | "medium" | "low" }) {
  const theme = useSettingsStore((s) => s.theme);
  const palette = PALETTES[theme];
  const processes = useSystemStore((s) => s.processes.processes);
  const runningPid = useSystemStore((s) => s.processes.runningPid);
  const live = useMemo(
    () => processes.filter((p) => p.state !== "terminated").slice(0, 8),
    [processes],
  );
  const dpr = tier === "high" ? 1.75 : tier === "medium" ? 1.25 : 1;

  return (
    <Canvas
      key={theme /* remount only on theme switch: fog/background are constructor args */}
      dpr={dpr}
      camera={{ position: [0, 3.4, 9.5], fov: 50 }}
      gl={{ antialias: tier !== "low", alpha: true }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <color attach="background" args={[palette.bgSoft]} />
      <fog attach="fog" args={[palette.bgSoft, 12, 28]} />
      <hemisphereLight args={[palette.bg, palette.gridMajor, 1.1]} />
      <directionalLight position={[4, 6, 3]} intensity={1.0} />
      <Rig reduced={reduced} />
      <CpuCore busy={runningPid !== null} palette={palette} />
      {live.map((p, i) => (
        <ProcessOrb key={p.pid} proc={p} index={i} total={live.length} palette={palette} />
      ))}
      <Landscape spin={!reduced} palette={palette} />
    </Canvas>
  );
}
