"use client";

import { useCallback, useRef } from "react";
import { useGameStore } from "./player";

/**
 * Tiny synthesised WebAudio SFX — no audio files. The AudioContext is
 * created lazily on the first user gesture. Sound is OFF by default
 * (settings store), and everything is a no-op when muted.
 */

type Sfx = "click" | "correct" | "wrong" | "xp" | "levelup" | "unlock" | "hit" | "boss";

interface Note {
  f: number;
  t: number; // start offset seconds
  d: number; // duration
  type?: OscillatorType;
  g?: number;
}

const RECIPES: Record<Sfx, Note[]> = {
  click: [{ f: 620, t: 0, d: 0.05, type: "square", g: 0.05 }],
  correct: [
    { f: 523, t: 0, d: 0.09, type: "triangle", g: 0.09 },
    { f: 784, t: 0.08, d: 0.12, type: "triangle", g: 0.09 },
  ],
  wrong: [
    { f: 196, t: 0, d: 0.16, type: "sawtooth", g: 0.07 },
    { f: 147, t: 0.1, d: 0.2, type: "sawtooth", g: 0.06 },
  ],
  xp: [
    { f: 660, t: 0, d: 0.06, type: "sine", g: 0.07 },
    { f: 880, t: 0.05, d: 0.08, type: "sine", g: 0.06 },
  ],
  levelup: [
    { f: 523, t: 0, d: 0.12, type: "triangle", g: 0.1 },
    { f: 659, t: 0.1, d: 0.12, type: "triangle", g: 0.1 },
    { f: 784, t: 0.2, d: 0.12, type: "triangle", g: 0.1 },
    { f: 1047, t: 0.3, d: 0.24, type: "triangle", g: 0.12 },
  ],
  unlock: [
    { f: 392, t: 0, d: 0.1, type: "sine", g: 0.08 },
    { f: 587, t: 0.09, d: 0.1, type: "sine", g: 0.08 },
    { f: 880, t: 0.18, d: 0.2, type: "sine", g: 0.09 },
  ],
  hit: [{ f: 110, t: 0, d: 0.12, type: "sawtooth", g: 0.08 }],
  boss: [
    { f: 98, t: 0, d: 0.25, type: "sawtooth", g: 0.09 },
    { f: 98, t: 0.28, d: 0.25, type: "sawtooth", g: 0.09 },
    { f: 131, t: 0.56, d: 0.4, type: "sawtooth", g: 0.1 },
  ],
};

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function useSfx() {
  const sound = useGameStore((s) => s.sound);
  const startedRef = useRef(false);

  return useCallback(
    (name: Sfx) => {
      if (!sound) return;
      // AudioContext must be created after a user gesture; recipes only run
      // from interaction handlers anyway, but guard defensively.
      if (!startedRef.current) {
        startedRef.current = true;
      }
      const ac = ensureCtx();
      if (!ac) return;
      const now = ac.currentTime;
      for (const n of RECIPES[name]) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = n.type ?? "sine";
        osc.frequency.value = n.f;
        const start = now + n.t;
        const vol = n.g ?? 0.08;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(vol, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + n.d);
        osc.connect(gain).connect(ac.destination);
        osc.start(start);
        osc.stop(start + n.d + 0.02);
      }
    },
    [sound],
  );
}
