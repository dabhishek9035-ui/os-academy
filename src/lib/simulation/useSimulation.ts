"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SimAction, SimulationEngine } from "@/types";
import { useGameStore } from "@/lib/game/player";

/**
 * React bridge for pure simulation engines.
 *
 * Keeps a bounded undo history (for step-back), playback with speed control,
 * and auto-pauses when a `tick` produces no state change (simulation over).
 */
export interface UseSimulationReturn<S, A extends string> {
  state: S;
  dispatch: (action: SimAction<A>) => void;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBack: () => void;
  canStepBack: boolean;
  speed: number;
  setSpeed: (n: number) => void;
}

const HISTORY_LIMIT = 400;
const SPEEDS = [0.5, 1, 2, 4];

export function useSimulation<S, A extends string = string>(
  engine: SimulationEngine<S, A>,
  options: { autoPlay?: boolean } = {},
): UseSimulationReturn<S, A> {
  const initial = useMemo(() => engine.initialState(), [engine]);
  const [state, setState] = useState<S>(initial);
  const [past, setPast] = useState<S[]>([]);
  const [playing, setPlaying] = useState(Boolean(options.autoPlay));
  const [speed, setSpeed] = useState(1);
  const stateRef = useRef(state);
  stateRef.current = state;

  const apply = useCallback(
    (action: SimAction<A>) => {
      setState((prev) => {
        const next = engine.step(prev, action);
        if (next === prev) return prev;
        setPast((p) => {
          const trimmed = [...p, prev];
          return trimmed.length > HISTORY_LIMIT
            ? trimmed.slice(trimmed.length - HISTORY_LIMIT)
            : trimmed;
        });
        return next;
      });
    },
    [engine],
  );

  const dispatch = useCallback((action: SimAction<A>) => apply(action), [apply]);

  // Auto-pause when a tick changes nothing (reached the end).
  const dispatchTick = useCallback(() => {
    const next = engine.step(stateRef.current, { type: "tick" } as SimAction<A>);
    if (next === stateRef.current) {
      setPlaying(false);
      return;
    }
    apply({ type: "tick" } as SimAction<A>);
  }, [apply, engine]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(dispatchTick, Math.max(80, Math.round(900 / speed)));
    return () => window.clearInterval(id);
  }, [playing, speed, dispatchTick]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const reset = useCallback(() => {
    setPlaying(false);
    setPast([]);
    setState(engine.initialState());
  }, [engine]);
  const stepForward = useCallback(() => {
    setPlaying(false);
    dispatchTick();
  }, [dispatchTick]);
  const stepBack = useCallback(() => {
    setPlaying(false);
    setPast((p) => {
      if (p.length === 0) return p;
      setState(p[p.length - 1]);
      return p.slice(0, -1);
    });
    useGameStore.getState().trackStepBack();
  }, []);

  return {
    state,
    dispatch,
    playing,
    play,
    pause,
    toggle,
    reset,
    stepForward,
    stepBack,
    canStepBack: past.length > 0,
    speed,
    setSpeed,
  };
}

export const PLAYBACK_SPEEDS = SPEEDS;
