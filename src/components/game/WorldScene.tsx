"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import { zoneFromPathname } from "@/lib/game/zones";
import { useSettingsStore } from "@/lib/settings/store";
import { Companion3D } from "./Companion";
import type { Quality } from "./useQualityTier";

/**
 * The persistent MACHINA scene. Pure function of inputs (zone, theme,
 * quality, pointer) and time — per-frame values live in refs, colors ease
 * every frame, layers cross-fade via presence refs (skill architecture).
 */

export interface SceneThemeInput {
  zoneHue: [string, string];
  dark: boolean;
  quality: Quality;
  reduced: boolean;
}

const TIER = {
  high: { particles: 900, dpr: 1.75, heroDetail: 1 },
  medium: { particles: 450, dpr: 1.25, heroDetail: 0.75 },
  low: { particles: 160, dpr: 1, heroDetail: 0.5 },
} as const;

// ---------------------------------------------------------------------------
// Backdrop: gradient-noise shader tinted by the zone (FINISH chunk + dither)
// ---------------------------------------------------------------------------

const BACKDROP_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BACKDROP_FRAG = /* glsl */ `
  uniform vec3 uBg;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform float uTime;
  uniform float uDim;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;
    // large soft colour wash from the top-right light source
    float n = vnoise(uv * 3.0 + uTime * 0.015) * 0.5 + vnoise(uv * 7.0 - uTime * 0.01) * 0.25;
    vec3 col = uBg;
    vec2 lightDir = uv - vec2(0.82, 1.05);
    float glow1 = exp(-dot(lightDir, lightDir) * 5.5);
    vec2 lightDir2 = uv - vec2(0.08, 0.15);
    float glow2 = exp(-dot(lightDir2, lightDir2) * 7.0);
    col += uC1 * glow1 * 0.16;
    col += uC2 * glow2 * 0.10;
    col += (uC1 * 0.5 + uC2 * 0.5) * n * 0.045;
    // vignette toward the bottom so DOM text sits on the darkest area
    col *= 1.0 - smoothstep(0.35, 0.95, uv.y * 0.4 + (1.0 - uv.y) * 0.15) * 0.0;
    col *= mix(1.0, 0.82, uDim * smoothstep(0.15, 0.75, 1.0 - uv.y));
    col += (hash21(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Backdrop({ colors, dim }: { colors: { bg: THREE.Color; c1: THREE.Color; c2: THREE.Color }; dim: React.MutableRefObject<number> }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useRef({
    uBg: { value: colors.bg.clone() },
    uC1: { value: colors.c1.clone() },
    uC2: { value: colors.c2.clone() },
    uTime: { value: 0 },
    uDim: { value: 0 },
  });
  useFrame((state, dt) => {
    const u = uniforms.current;
    u.uTime.value = state.clock.elapsedTime;
    u.uBg.value.lerp(colors.bg, 1 - Math.exp(-dt * 2.2));
    u.uC1.value.lerp(colors.c1, 1 - Math.exp(-dt * 2.2));
    u.uC2.value.lerp(colors.c2, 1 - Math.exp(-dt * 2.2));
    u.uDim.value += (dim.current - u.uDim.value) * (1 - Math.exp(-dt * 3));
    if (mat.current) mat.current.needsUpdate = false;
  });
  return (
    <mesh position={[0, 0, -6]} scale={[1, 1, 1]}>
      <planeGeometry args={[34, 22]} />
      <shaderMaterial
        ref={mat}
        vertexShader={BACKDROP_VERT}
        fragmentShader={BACKDROP_FRAG}
        uniforms={uniforms.current}
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Particles: signal dust on a sphere shell (stars recipe, zone-tinted)
// ---------------------------------------------------------------------------

const DUST_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uScale;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = max(-mv.z, 0.1);
    gl_PointSize = clamp(uSize * (0.3 + aSeed * aSeed * 1.7) * uScale / d, 1.0, 9.0);
    vTw = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 50.0);
  }
`;
const DUST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vTw;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = pow(1.0 - clamp(r, 0.0, 1.0), 3.0);
    gl_FragColor = vec4(uColor, a * vTw * 0.8);
  }
`;

function Dust({ colors, count, reduced }: { colors: { c1: THREE.Color }; count: number; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geometry = useRef<THREE.BufferGeometry>(null);

  const positions = useRef<Float32Array>(new Float32Array(0));
  const seeds = useRef<Float32Array>(new Float32Array(0));
  const builtFor = useRef(-1);

  if (builtFor.current !== count) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      // shell radius 9..16, biased away from the camera centre
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 9 + Math.random() * 7;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 4;
      seed[i] = Math.random();
    }
    positions.current = pos;
    seeds.current = seed;
    builtFor.current = count;
  }

  useFrame((state, dt) => {
    if (ref.current && !reduced) {
      ref.current.rotation.y += dt * 0.008;
    }
    const u = mat.current?.uniforms as
      | { uColor?: { value: THREE.Color }; uTime?: { value: number } }
      | undefined;
    if (u?.uColor) u.uColor.value.lerp(colors.c1, 1 - Math.exp(-dt * 2));
    if (u?.uTime) u.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={ref}>
      <bufferGeometry ref={geometry} key={count}>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds.current, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={DUST_VERT}
        fragmentShader={DUST_FRAG}
        uniforms={{
          uTime: { value: 0 },
          uScale: { value: 320 },
          uSize: { value: 2.4 },
          uColor: { value: new THREE.Color("#67e8f9") },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Zone hero: three abstract machine archetypes (gate / array / orbit)
// ---------------------------------------------------------------------------

function ZoneHero({ archetype, colorRef, reduced }: { archetype: number; colorRef: React.MutableRefObject<THREE.Color>; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const presence = useRef(0);
  const shownArchetype = useRef(archetype);
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const bars = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    // presence: scale out on archetype change, scale back in after swap
    const target = shownArchetype.current === archetype ? 1 : 0;
    presence.current += (target - presence.current) * (1 - Math.exp(-dt * 5));
    if (presence.current < 0.04 && shownArchetype.current !== archetype) {
      shownArchetype.current = archetype;
    }
    g.scale.setScalar(0.92 * presence.current);
    if (!reduced) g.rotation.y = Math.sin(t * 0.12) * 0.35;

    const mat = (o: THREE.Object3D | null) => {
      const m = (o as THREE.Mesh | null)?.material as THREE.MeshStandardMaterial | undefined;
      if (m) m.emissive.lerp(colorRef.current, 1 - Math.exp(-dt * 2));
    };
    mat(core.current);
    mat(ringA.current);
    mat(ringB.current);
    if (bars.current) {
      for (const child of bars.current.children) {
        const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissive.lerp(colorRef.current, 1 - Math.exp(-dt * 2));
        if (!reduced) {
          const h = 0.35 + Math.abs(Math.sin(t * 0.7 + (child.userData.i ?? 0) * 1.7)) * 0.9;
          child.scale.y += (h - child.scale.y) * (1 - Math.exp(-dt * 3));
        }
      }
    }
  });

  return (
    <group ref={group} position={[2.6, 0.4, 0]}>
      {/* archetype 0 — THE GATE: ring + core (Boot Docks, Bastion, Docks, Mirror, Core) */}
      {shownArchetype.current === 0 && (
        <group>
          <mesh ref={core} position={[0, 0.6, 0]}>
            <icosahedronGeometry args={[0.55, 1]} />
            <meshStandardMaterial color="#0c1220" emissive="#22d3ee" emissiveIntensity={1.6} roughness={0.3} metalness={0.4} flatShading />
          </mesh>
          <mesh ref={ringA} position={[0, 0.6, 0]} rotation={[Math.PI / 2.4, 0.4, 0]}>
            <torusGeometry args={[1.15, 0.045, 12, 64]} />
            <meshStandardMaterial color="#0c1220" emissive="#22d3ee" emissiveIntensity={1.2} roughness={0.4} />
          </mesh>
        </group>
      )}
      {/* archetype 1 — THE ARRAY: undulating data towers (Signals, Foundry, Archive, Rows, Refinery) */}
      {shownArchetype.current === 1 && (
        <group ref={bars} position={[0, -0.4, 0]}>
          {Array.from({ length: 12 }, (_, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            return (
              <mesh key={i} userData={{ i }} position={[(col - 1.5) * 0.75, 0.8, row * 0.9 - 0.45]}>
                <boxGeometry args={[0.32, 1, 0.32]} />
                <meshStandardMaterial color="#0c1220" emissive="#22d3ee" emissiveIntensity={0.9} roughness={0.35} metalness={0.3} />
              </mesh>
            );
          })}
        </group>
      )}
      {/* archetype 2 — THE ORBIT: core + counter-rotating rings (Yards, Loom, Heights, Junction, Spire) */}
      {shownArchetype.current === 2 && (
        <group position={[0, 0.55, 0]}>
          <mesh ref={core}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#0c1220" emissive="#22d3ee" emissiveIntensity={1.6} roughness={0.3} metalness={0.4} flatShading />
          </mesh>
          <mesh ref={ringA} rotation={[Math.PI / 2.2, 0.3, 0]}>
            <torusGeometry args={[1.0, 0.035, 10, 60]} />
            <meshStandardMaterial color="#0c1220" emissive="#22d3ee" emissiveIntensity={1.1} roughness={0.4} />
          </mesh>
          <mesh ref={ringB} rotation={[Math.PI / 1.7, -0.5, 0.4]}>
            <torusGeometry args={[1.35, 0.028, 10, 60]} />
            <meshStandardMaterial color="#0c1220" emissive="#22d3ee" emissiveIntensity={0.9} roughness={0.4} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// WorldScene root
// ---------------------------------------------------------------------------

const ARCHETYPE_BY_MOTIF: Record<string, number> = {
  gate: 0, bastion: 0, docks: 0, mirror: 0, core: 0,
  spikes: 1, forge: 1, archive: 1, plots: 1, pipes: 1,
  rails: 2, loom: 2, slabs: 2, junction: 2,
};

export function WorldScene({ tier, reduced }: { tier: Quality; reduced: boolean }) {
  const pathname = usePathname();
  const theme = useSettingsStore((s) => s.theme);
  const zone = zoneFromPathname(pathname ?? "/");

  const dark = theme === "dark";
  const cfg = TIER[tier];

  // eased colors (skill: shared THREE.Color objects, lerped in useFrame)
  const colors = useRef({
    bg: new THREE.Color(dark ? "#080a10" : "#eef0f7"),
    c1: new THREE.Color(zone.hue[0]),
    c2: new THREE.Color(zone.hue[1]),
    dust: new THREE.Color(dark ? zone.hue[0] : zone.hue[1]),
  });
  colors.current.bg.set(dark ? "#080a10" : "#e9edf6");
  colors.current.c1.set(dark ? zone.hue[0] : zone.hue[1]);
  colors.current.c2.set(dark ? zone.hue[1] : zone.hue[0]);
  colors.current.dust.set(dark ? zone.hue[0] : zone.hue[1]);

  const colorRef = useRef(new THREE.Color(zone.hue[0]));
  const scratch = useRef(new THREE.Color("#22d3ee"));
  const dimRef = useRef(0);
  const { pointer } = useThree();

  // DOM text dims the canvas: pages with a wide text column set a higher dim.
  const readingRoute = pathname?.startsWith("/lesson") || pathname?.startsWith("/quiz");
  dimRef.current = readingRoute ? 1 : 0.25;

  const rig = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    scratch.current.set(dark ? zone.hue[0] : zone.hue[1]);
    colorRef.current.lerp(scratch.current, 1 - Math.exp(-dt * 2));
    if (rig.current && !reduced) {
      const g = rig.current;
      g.position.x += (pointer.x * 0.35 - g.position.x) * (1 - Math.exp(-dt * 1.6));
      g.position.y += (pointer.y * 0.2 - g.position.y) * (1 - Math.exp(-dt * 1.6));
    }
  });

  const archetype = ARCHETYPE_BY_MOTIF[zone.motif] ?? 0;

  return (
    <>
      <color attach="background" args={[dark ? "#080a10" : "#e9edf6"]} />
      <fog attach="fog" args={[dark ? "#080a10" : "#e9edf6", 11, 26]} />
      <Backdrop colors={colors.current} dim={dimRef} />
      <Dust colors={{ c1: colors.current.dust }} count={cfg.particles} reduced={reduced} />
      <group ref={rig}>
        <ZoneHero archetype={archetype} colorRef={colorRef} reduced={reduced} />
        <Companion3D tier={tier} reduced={reduced} dark={dark} />
      </group>
      {/* light: one bright zone top-right + soft fill; light theme gets gentler lights */}
      <ambientLight intensity={dark ? 0.42 : 0.85} />
      <directionalLight position={[5, 6, 4]} intensity={dark ? 1.0 : 1.4} color={dark ? "#cfe9ff" : "#ffffff"} />
      <pointLight position={[3.2, 2.2, 1.5]} intensity={dark ? 2.4 : 1.2} color={zone.hue[0]} distance={10} />
    </>
  );
}
