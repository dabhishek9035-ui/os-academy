import { describe, expect, it } from "vitest";
import {
  HANDLER_STAGES,
  POLL_WAIT_TICKS,
  interruptsEngine,
  type InterruptState,
} from "@/modules/interrupts/engine";

function run(state: InterruptState, actions: Parameters<typeof interruptsEngine.step>[1][]) {
  let s = state;
  for (const a of actions) s = interruptsEngine.step(s, a);
  return s;
}

const ticks = (n: number): Parameters<typeof interruptsEngine.step>[1][] =>
  Array.from({ length: n }, () => ({ type: "tick" as const }));

describe("interrupts engine — plain execution", () => {
  it("completes the demo program after 9 ticks and logs completion once", () => {
    let s = interruptsEngine.initialState();
    s = run(s, ticks(9));
    expect(s.programFinished).toBe(true);
    const completes = s.eventLog.filter((e) => e.kind === "program-complete").length;
    expect(completes).toBe(1);
    const before = s.eventLog.length;
    s = run(s, ticks(3));
    expect(s.eventLog.length).toBe(before); // idle: no new events
  });

  it("advances through instructions in order", () => {
    let s = interruptsEngine.initialState();
    s = run(s, ticks(2)); // LOAD (2 ticks)
    expect(s.pc).toBe(1);
    expect(s.progressInInstruction).toBe(0);
    s = run(s, ticks(1)); // ADD in progress
    expect(s.pc).toBe(1);
    expect(s.progressInInstruction).toBe(1);
  });
});

describe("interrupt lifecycle", () => {
  it("saves context, runs the full handler pipeline, restores and resumes exactly", () => {
    let s = interruptsEngine.initialState();
    s = run(s, ticks(1)); // LOAD partially executed (progress 1/2)
    s = interruptsEngine.step(s, { type: "raise-timer" });
    expect(s.pendingQueue).toHaveLength(1);

    s = interruptsEngine.step(s, { type: "tick" }); // delivery + detect
    expect(s.mode).toBe("kernel");
    expect(s.activeInterrupt?.source).toBe("timer");
    expect(s.savedContexts).toEqual([{ pc: 0, progressInInstruction: 1, mode: "user" }]);
    expect(HANDLER_STAGES[s.handlerStageIndex]).toBe("detect");

    // Pipeline after delivery: save, vector, run(2), restore, enter-resume,
    // complete = 7 ticks (completion happens when the resume stage ticks).
    s = run(s, ticks(7));
    expect(s.activeInterrupt).toBeNull();
    expect(s.savedContexts).toHaveLength(0);
    expect(s.mode).toBe("user");
    expect(s.pc).toBe(0);
    expect(s.progressInInstruction).toBe(1); // resumed exactly where it stopped
    expect(s.stats.interruptsHandled).toBe(1);
    expect(s.stats.totalLatency).toBe(1);

    s = interruptsEngine.step(s, { type: "tick" });
    expect(s.pc).toBe(1); // LOAD finished on this tick
    expect(s.progressInInstruction).toBe(0);
  });

  it("queues a second interrupt raised during handling and delivers it after resume", () => {
    let s = interruptsEngine.initialState();
    s = interruptsEngine.step(s, { type: "raise-timer" });
    s = interruptsEngine.step(s, { type: "raise-timer" }); // raised at clock 0 too
    s = run(s, ticks(8)); // first: delivered t1, completed t8 (7 pipeline ticks)
    expect(s.activeInterrupt).toBeNull();
    expect(s.pendingQueue).toHaveLength(1);
    s = interruptsEngine.step(s, { type: "tick" }); // t9 delivers the second
    expect(s.activeInterrupt?.source).toBe("timer");
    s = run(s, ticks(7)); // second completed by t16
    expect(s.activeInterrupt).toBeNull();
    expect(s.savedContexts).toHaveLength(0);
    expect(s.stats.interruptsHandled).toBe(2);
    // second was delivered at clock 9 but raised at 0 → latency 9
    expect(s.stats.totalLatency).toBe(1 + 9);
  });
});

describe("masking and priorities", () => {
  it("does not deliver masked interrupts but delivers enabled ones", () => {
    let s = interruptsEngine.initialState();
    s = interruptsEngine.step(s, { type: "toggle-source", payload: { source: "io", enabled: false } });
    s = interruptsEngine.step(s, { type: "raise-io" });
    expect(s.pendingQueue).toHaveLength(0);
    expect(s.eventLog.at(-1)?.kind).toBe("interrupt-masked");
    s = interruptsEngine.step(s, { type: "raise-timer" });
    expect(s.pendingQueue).toHaveLength(1);
    s = interruptsEngine.step(s, { type: "tick" });
    expect(s.activeInterrupt?.source).toBe("timer");
  });

  it("never masks exceptions", () => {
    let s = interruptsEngine.initialState();
    s = interruptsEngine.step(s, { type: "toggle-source", payload: { source: "exception", enabled: false } });
    expect(s.error).toMatch(/cannot be masked/);
    expect(s.enabled.exception).toBe(true);
    s = interruptsEngine.step(s, { type: "toggle-source", payload: { source: "timer", enabled: false } });
    s = interruptsEngine.step(s, { type: "raise-timer" });
    expect(s.pendingQueue).toHaveLength(0);
    s = interruptsEngine.step(s, { type: "raise-exception" });
    expect(s.pendingQueue).toHaveLength(1);
    s = interruptsEngine.step(s, { type: "tick" });
    expect(s.activeInterrupt?.source).toBe("exception");
    expect(s.mode).toBe("kernel");
  });

  it("handles higher-priority interrupts first", () => {
    let s = interruptsEngine.initialState();
    s = interruptsEngine.step(s, { type: "raise-io" }); // priority 2
    s = interruptsEngine.step(s, { type: "raise-timer" }); // priority 1
    s = interruptsEngine.step(s, { type: "tick" });
    expect(s.activeInterrupt?.label).toBe("timer tick");
    s = run(s, ticks(7)); // finish timer handler at tick 8
    expect(s.activeInterrupt).toBeNull();
    s = interruptsEngine.step(s, { type: "tick" });
    expect(s.activeInterrupt?.source).toBe("io"); // delivered next
  });
});

describe("polling vs interrupts", () => {
  it("burns one tick per poll while the device is busy, then services inline", () => {
    let s = interruptsEngine.initialState();
    s = interruptsEngine.step(s, { type: "set-polling", payload: true });
    s = interruptsEngine.step(s, { type: "raise-io" });
    expect(s.deviceWaitTicks).toBe(POLL_WAIT_TICKS);
    s = run(s, ticks(POLL_WAIT_TICKS));
    expect(s.stats.wastedPollTicks).toBe(POLL_WAIT_TICKS);
    expect(s.pc).toBe(0); // the program could NOT run while polling
    expect(s.deviceReady).toBe(true);
    s = interruptsEngine.step(s, { type: "tick" });
    expect(s.eventLog.at(-1)?.kind).toBe("poll-serviced");
    expect(s.stats.interruptsHandled).toBe(1);
    expect(s.deviceReady).toBe(false);
  });

  it("in interrupt mode the signal arrives at once and no ticks are wasted polling", () => {
    let s = interruptsEngine.initialState();
    s = interruptsEngine.step(s, { type: "raise-io" });
    s = interruptsEngine.step(s, { type: "tick" }); // delivered immediately
    expect(s.activeInterrupt?.source).toBe("io");
    expect(s.stats.wastedPollTicks).toBe(0);
    s = run(s, ticks(7)); // handler completes; program resumes exactly
    expect(s.activeInterrupt).toBeNull();
    expect(s.mode).toBe("user");
    expect(s.pc).toBe(0);
  });
});

describe("program loading and validation", () => {
  it("rejects invalid programs", () => {
    let s = interruptsEngine.initialState();
    s = interruptsEngine.step(s, { type: "load-program", payload: [] });
    expect(s.error).toMatch(/Program needs/);
    s = interruptsEngine.step(s, {
      type: "load-program",
      payload: [{ name: "NOP", duration: 0 }],
    });
    expect(s.error).toMatch(/duration/);
  });

  it("loads a valid program and resets the pc", () => {
    let s = interruptsEngine.initialState();
    s = run(s, ticks(3));
    s = interruptsEngine.step(s, {
      type: "load-program",
      payload: [{ name: "NOP", duration: 1 }],
    });
    expect(s.error).toBeNull();
    expect(s.program).toHaveLength(1);
    expect(s.pc).toBe(0);
  });
});
