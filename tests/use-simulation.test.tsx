/**
 * useSimulation hook tests — run under React.StrictMode.
 *
 * Guards the invariants the labs rely on:
 *  - every step (play or manual dispatch) records exactly ONE history entry,
 *    even with Strict Mode's double-invoked updaters;
 *  - step-back returns exactly one prior state and can be replayed exactly
 *    with step-forward;
 *  - reset returns to the engine's initial state;
 *  - engines that declare a script: Play walks the script one action per
 *    tick and pauses when it is exhausted.
 */
import { describe, expect, it, vi } from "vitest";
import { StrictMode, act } from "react";
import { renderHook } from "@testing-library/react";
import type { SimulationEngine, SimAction } from "@/types";
import { useSimulation } from "@/lib/simulation/useSimulation";

interface CountState {
  value: number;
  log: string[];
}

/** Minimal deterministic engine driven by "inc"/"dec" plus "tick". */
const counterEngine: SimulationEngine<CountState, "inc" | "dec" | "tick"> = {
  id: "counter",
  initialState: () => ({ value: 0, log: ["init"] }),
  step(state, action) {
    switch (action.type) {
      case "inc":
        return { value: state.value + 1, log: [...state.log, "inc"] };
      case "dec":
        return { value: state.value - 1, log: [...state.log, "dec"] };
      case "tick":
        return state; // never changes: playback should auto-pause
    }
  },
  explain: (s) => `counter at ${s.value}`,
};

/** Engine whose whole behaviour is a click-driven script. */
const scriptedEngine: SimulationEngine<CountState, "a" | "b" | "tick"> = {
  id: "scripted",
  initialState: () => ({ value: 0, log: ["init"] }),
  step(state, action) {
    return { value: state.value + 10, log: [...state.log, action.type] };
  },
  explain: (s) => `scripted at ${s.value}`,
  script: [{ type: "a" }, { type: "b" }, { type: "a" }] as SimAction<"a" | "b" | "tick">[],
};

function setup<A extends string, S>(engine: SimulationEngine<S, A>) {
  return renderHook(() => useSimulation(engine), {
    wrapper: StrictMode,
  });
}

describe("useSimulation (Strict Mode)", () => {
  it("records exactly one history entry per dispatch", () => {
    const { result } = setup(counterEngine);
    act(() => result.current.dispatch({ type: "inc" }));
    act(() => result.current.dispatch({ type: "inc" }));
    act(() => result.current.dispatch({ type: "dec" }));
    expect(result.current.state.value).toBe(1);
    expect(result.current.canStepBack).toBe(true);

    // Exactly three undos reach the initial state; a fourth does nothing.
    act(() => result.current.stepBack());
    expect(result.current.state.value).toBe(2);
    act(() => result.current.stepBack());
    expect(result.current.state.value).toBe(1);
    act(() => result.current.stepBack());
    expect(result.current.state.value).toBe(0);
    expect(result.current.canStepBack).toBe(false);
    act(() => result.current.stepBack());
    expect(result.current.state.value).toBe(0);
  });

  it("step-forward replays the undone state instead of recomputing", () => {
    const { result } = setup(counterEngine);
    act(() => result.current.dispatch({ type: "inc" }));
    act(() => result.current.dispatch({ type: "inc" }));
    act(() => result.current.dispatch({ type: "inc" }));
    act(() => result.current.stepBack());
    expect(result.current.state.value).toBe(2);

    act(() => result.current.stepForward());
    expect(result.current.state.value).toBe(3);
    expect(result.current.canStepForward).toBe(false);
  });

  it("step-forward without history advances one tick (which may be a no-op)", () => {
    const { result } = setup(counterEngine);
    act(() => result.current.stepForward());
    // "tick" on the counter engine changes nothing.
    expect(result.current.state.value).toBe(0);
  });

  it("playback on a tick-less engine auto-pauses", () => {
    const { result } = setup(counterEngine);
    act(() => result.current.play());
    expect(result.current.playing).toBe(true);
    act(() => result.current.stepForward());
    // No state change → hook paused by itself.
    expect(result.current.playing).toBe(false);
  });

  it("reset restores the initial state and clears history", () => {
    const { result } = setup(counterEngine);
    act(() => result.current.dispatch({ type: "inc" }));
    act(() => result.current.dispatch({ type: "inc" }));
    act(() => result.current.reset());
    expect(result.current.state.value).toBe(0);
    expect(result.current.canStepBack).toBe(false);
    expect(result.current.canStepForward).toBe(false);
  });

  it("scripted engines play one scripted action per tick and stop", () => {
    vi.useFakeTimers();
    try {
      const { result } = setup(scriptedEngine);
      act(() => result.current.play());
      act(() => vi.advanceTimersByTime(950));
      expect(result.current.state.value).toBe(10); // one scripted action so far
      act(() => vi.advanceTimersByTime(900));
      expect(result.current.state.value).toBe(20);
      act(() => vi.advanceTimersByTime(900));
      expect(result.current.state.value).toBe(30);
      act(() => vi.advanceTimersByTime(900));
      // Script exhausted → paused, state unchanged.
      expect(result.current.state.value).toBe(30);
      expect(result.current.playing).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("scripted engines keep Play doing nothing after the script ends", () => {
    const { result } = setup(scriptedEngine);
    // Exhaust the script through the same path Play uses.
    act(() => {
      for (let i = 0; i < 5; i += 1) {
        result.current.stepForward();
      }
    });
    expect(result.current.state.value).toBe(30);
    // Manual action after the script still works (learner takes over).
    act(() => result.current.dispatch({ type: "b" }));
    expect(result.current.state.value).toBe(40);
  });
});
