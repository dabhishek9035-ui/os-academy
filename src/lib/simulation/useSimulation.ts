"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { SimAction, SimulationEngine } from "@/types";

/**
 * React bridge for pure simulation engines.
 *
 * All state transitions — including history — flow through ONE reducer, so
 * React Strict Mode's double-invoked updaters can never record a step twice.
 * The reducer keeps `{ past, present, future }`:
 *
 * - `past`   bounded undo history for step-back
 * - `future` states undone by step-back; step-forward replays them instead
 *   of recomputing, so replay is exact even for engines whose next state
 *   would depend on un replayable context.
 *
 * Playback auto-pauses when a `tick` produces no state change (simulation
 * over) or when an engine's `done(state)` hint fires (scenario finished).
 * Engines may declare a `script`: Play then dispatches one scripted action
 * per tick so click-driven labs still have a meaningful Play button.
 */

interface HistoryState<S> {
  past: S[];
  present: S;
  future: S[];
  /** True once the history cap has silently dropped early states. */
  trimmed: boolean;
}

type HistoryAction<S, A extends string> =
  | { type: "apply"; action: SimAction<A> }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; state: S };

const HISTORY_LIMIT = 1200;

function historyReducer<S, A extends string>(
  engine: SimulationEngine<S, A>,
  history: HistoryState<S>,
  action: HistoryAction<S, A>,
): HistoryState<S> {
  switch (action.type) {
    case "apply": {
      const next = engine.step(history.present, action.action);
      if (next === history.present) return history;
      const past = [...history.past, history.present];
      return {
        past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
        present: next,
        future: [],
        trimmed: history.trimmed || past.length > HISTORY_LIMIT,
      };
    }
    case "undo": {
      if (history.past.length === 0) return history;
      const past = history.past.slice(0, -1);
      return {
        ...history,
        past,
        present: history.past[history.past.length - 1],
        future: [history.present, ...history.future],
      };
    }
    case "redo": {
      if (history.future.length === 0) return history;
      const [next, ...rest] = history.future;
      return {
        ...history,
        past: [...history.past, history.present],
        present: next,
        future: rest,
      };
    }
    case "reset":
      return { past: [], present: action.state, future: [], trimmed: false };
  }
}

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
  canStepForward: boolean;
  /** True when the engine reports the scenario finished (done hint). */
  done: boolean;
  /** True once early history has been trimmed by the cap. */
  historyTrimmed: boolean;
  speed: number;
  setSpeed: (n: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4];

export function useSimulation<S, A extends string = string>(
  engine: SimulationEngine<S, A>,
  options: { autoPlay?: boolean } = {},
): UseSimulationReturn<S, A> {
  const initialState = useMemo(() => engine.initialState(), [engine]);
  const reducer = useCallback(
    (h: HistoryState<S>, action: HistoryAction<S, A>) =>
      historyReducer(engine, h, action),
    [engine],
  );
  const [history, dispatchHistory] = useReducer(reducer, engine, (e) => ({
    past: [],
    present: e.initialState(),
    future: [],
    trimmed: false,
  }));
  const [playing, setPlaying] = useState(Boolean(options.autoPlay));
  const [speed, setSpeed] = useState(1);

  const state = history.present;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Script position for engines that declare a demo script. Only touched
  // from event handlers and the playback interval — never during render.
  const scriptIndexRef = useRef(0);

  const dispatch = useCallback(
    (action: SimAction<A>) => dispatchHistory({ type: "apply", action }),
    [dispatchHistory],
  );

  /** Next action the playback loop should dispatch, or null if finished. */
  const nextPlaybackAction = useCallback((): SimAction<A> | null => {
    const script = engine.script;
    if (script && script.length > 0) {
      if (scriptIndexRef.current >= script.length) return null;
      const action = script[scriptIndexRef.current];
      scriptIndexRef.current += 1;
      return action;
    }
    return { type: "tick" } as SimAction<A>;
  }, [engine]);

  // Auto-pause when the scenario is over: a tick that changes nothing, an
  // exhausted script, or the engine's done() hint.
  const dispatchTick = useCallback(() => {
    const action = nextPlaybackAction();
    if (action === null) {
      setPlaying(false);
      return;
    }
    const current = stateRef.current;
    const next = engine.step(current, action);
    if (next === current) {
      setPlaying(false);
      return;
    }
    if (engine.done?.(next)) {
      dispatchHistory({ type: "apply", action });
      setPlaying(false);
      return;
    }
    dispatchHistory({ type: "apply", action });
  }, [engine, nextPlaybackAction]);

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
    scriptIndexRef.current = 0;
    dispatchHistory({ type: "reset", state: engine.initialState() });
  }, [engine]);

  const stepForward = useCallback(() => {
    setPlaying(false);
    // After a step-back, replay the undone state exactly; otherwise advance
    // one tick (or one scripted action) from the present.
    if (history.future.length > 0) {
      dispatchHistory({ type: "redo" });
      return;
    }
    dispatchTick();
  }, [dispatchTick, history.future.length]);

  const stepBack = useCallback(() => {
    setPlaying(false);
    dispatchHistory({ type: "undo" });
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
    canStepBack: history.past.length > 0,
    canStepForward: history.future.length > 0,
    done: engine.done ? engine.done(state) : false,
    historyTrimmed: history.trimmed,
    speed,
    setSpeed,
  };
}

export const PLAYBACK_SPEEDS = SPEEDS;
