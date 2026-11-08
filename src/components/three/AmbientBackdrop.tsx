"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSettingsStore } from "@/lib/settings/store";
import { PALETTES } from "@/lib/three/scenePalette";
import { useQualityTier } from "@/components/three/useQualityTier";

/**
 * Persistent, quiet backdrop (immersive-3d-web: one fixed canvas, z-index 0,
 * pointer-events none, DOM stays the product).
 *
 * Look: a slowly drifting field of contour lines — hairlines in --ink at ~8%
 * alpha over the CSS paper colour. No glow, no bloom, no additive blending, no
 * blur: it follows the Notion profile and the project's ban list.
 *
 * Rules honoured: ambient period >> 10 s; pointer parallax ≤ a few px; colours
 * ease toward the theme target; frozen (single frame) under reduced motion;
 * absent on low tier / no WebGL / ambient off; never alongside the /3d canvas.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uPointer;
  uniform vec3 uLine;
  uniform float uAlpha;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p = p * 2.02 + 17.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float aspect = uRes.x / max(uRes.y, 1.0);
    vec2 p = vec2(vUv.x * aspect, vUv.y) * 1.5 + uPointer * 0.05;
    float h = fbm(p + vec2(uTime * 0.012, -uTime * 0.008));
    float bands = h * 9.0;
    // distance (in band units) to the nearest contour; fwidth keeps 1px lines
    float dd = abs(fract(bands + 0.5) - 0.5);
    float w = fwidth(bands) + 0.0001;
    float line = 1.0 - smoothstep(0.0, w * 1.1, dd);
    // calmer behind the centred content column, stronger toward the edges
    float edge = smoothstep(0.2, 0.95, abs(vUv.x - 0.5) * 2.0);
    float mask = 0.3 + 0.7 * edge;
    float a = line * uAlpha * mask;
    gl_FragColor = vec4(uLine, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Field({ reduced }: { reduced: boolean }) {
  const theme = useSettingsStore((s) => s.theme);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const mat = useRef<THREE.ShaderMaterial>(null);

  // Colours are shared by reference with the uniforms and eased each frame.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uLine: { value: new THREE.Color(PALETTES.light.ink) },
      uAlpha: { value: PALETTES.light.contourAlpha },
    }),
    [],
  );
  const target = useRef({
    color: new THREE.Color(PALETTES.light.ink),
    alpha: PALETTES.light.contourAlpha,
  });

  useEffect(() => {
    const p = PALETTES[theme];
    target.current.color.set(p.ink);
    target.current.alpha = p.contourAlpha;
    if (reduced) {
      // No easing when frozen: snap, then draw one frame.
      uniforms.uLine.value.copy(target.current.color);
      uniforms.uAlpha.value = p.contourAlpha;
      invalidate();
    }
  }, [theme, reduced, uniforms, invalidate]);

  useEffect(() => {
    uniforms.uRes.value.set(size.width, size.height);
    invalidate();
  }, [size.width, size.height, uniforms, invalidate]);

  useFrame((state, delta) => {
    if (reduced) return;
    const dt = Math.min(delta, 0.05); // clamp so a tab switch never jumps
    const k = 1 - Math.exp(-dt * 4);
    uniforms.uTime.value += dt;
    uniforms.uPointer.value.x += (state.pointer.x - uniforms.uPointer.value.x) * (1 - Math.exp(-dt * 1.5));
    uniforms.uPointer.value.y += (state.pointer.y - uniforms.uPointer.value.y) * (1 - Math.exp(-dt * 1.5));
    uniforms.uLine.value.lerp(target.current.color, k);
    uniforms.uAlpha.value += (target.current.alpha - uniforms.uAlpha.value) * k;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function AmbientBackdrop() {
  const pathname = usePathname();
  const { mounted, webgl, tier, reduced: osReduced } = useQualityTier();
  const ambient = useSettingsStore((s) => s.ambient);
  const motion = useSettingsStore((s) => s.motion);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);

  const reduced = motion === "reduced" || (motion === "system" && osReduced);
  // One canvas at a time: /3d owns the page with its own scene.
  const onSceneRoute = pathname?.startsWith("/3d") ?? false;
  const enabled = mounted && webgl && tier !== "low" && ambient && !lost && !onSceneRoute;

  useEffect(() => {
    if (!enabled) setReady(false);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="scene-canvas" data-ready={ready} aria-hidden>
      <Canvas
        flat
        dpr={tier === "high" ? [1, 1.5] : 1}
        frameloop={reduced ? "demand" : "always"}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 1] }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            setLost(true); // fall back to the plain paper page
          });
          setReady(true);
        }}
      >
        <Field reduced={reduced} />
      </Canvas>
    </div>
  );
}
