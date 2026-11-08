"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COMMANDS,
  SUGGESTED,
  executeLine,
  type OutputLine,
} from "@/lib/commands/registry";
import { useSystemStore } from "@/lib/commands/system-store";
import { useHasMounted } from "@/lib/useHasMounted";
import { processColor } from "@/types";

interface HistoryEntry {
  id: number;
  kind: "input" | "output";
  lines: OutputLine[];
}

const TONE_CLASS: Record<NonNullable<OutputLine["tone"]>, string> = {
  default: "text-ink",
  muted: "text-ink-faint",
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
  accent: "text-accent",
};

export default function TerminalPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: 0,
      kind: "output",
      lines: [
        { text: "Visual OS Academy — educational command interpreter", tone: "accent" },
        { text: "This is a SAFE SIMULATOR. Commands drive an in-browser model of a tiny OS; nothing on your computer is touched.", tone: "muted" },
        { text: 'Type "help" for commands, "concepts" for the lessons behind them, or click a suggestion below.', tone: "muted" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const idRef = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const system = useSystemStore((s) => s);
  const dispatch = useSystemStore((s) => s.dispatch);
  const resetAll = useSystemStore((s) => s.resetAll);
  const mounted = useHasMounted();

  const pushLines = useCallback((lines: OutputLine[]) => {
    setHistory((h) => [...h.slice(-300), { id: idRef.current++, kind: "output", lines }]);
  }, []);

  const run = useCallback(
    (raw: string) => {
      const lines = executeLine(raw, {
        system: () => useSystemStore.getState(),
        dispatch,
        resetAll,
      });
      if (lines.length === 1 && lines[0].text === "\u0000CLEAR") {
        setHistory([]);
        setInput("");
        return;
      }
      setHistory((h) => [
        ...h.slice(-300),
        { id: idRef.current++, kind: "input", lines: [{ text: raw, tone: "accent" }] },
        { id: idRef.current++, kind: "output", lines },
      ]);
      setInput("");
      setHistoryIdx(null);
    },
    [dispatch, resetAll],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [history]);

  const complete = () => {
    const value = input.trim();
    if (!value) return;
    const matches = Object.values(COMMANDS)
      .map((c) => c.name)
      .filter((n) => n.startsWith(value));
    if (matches.length === 1) setInput(matches[0] + " ");
    else if (matches.length > 1) pushLines([{ text: matches.join("   "), tone: "muted" }]);
  };

  const suggestions = useMemo(() => SUGGESTED, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Educational terminal</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
          Type commands to drive the same simulation engines the visual labs
          use — the panels below update live. Invalid input fails honestly.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Terminal */}
        <section
          className="card flex min-h-[420px] flex-col overflow-hidden"
          aria-label="Educational terminal"
        >
          <div
            ref={scrollRef}
            className="thin-scroll grow overflow-y-auto bg-[#0a0e15] px-4 py-3 font-mono text-[13px] leading-relaxed"
          >
            {history.map((h) =>
              h.kind === "input" ? (
                <p key={h.id} className="text-ink">
                  <span className="text-accent">os&gt;</span> {h.lines[0]?.text}
                </p>
              ) : (
                <div key={h.id} className="whitespace-pre-wrap">
                  {h.lines.map((l, i) => (
                    <p key={i} className={TONE_CLASS[l.tone ?? "default"]}>
                      {l.text}
                    </p>
                  ))}
                </div>
              ),
            )}
          </div>
          {/* The form mounts only after hydration: a pre-hydration native
              form submit would reload the page and wipe simulation state. */}
          {mounted ? (
          <form
            className="flex items-center gap-2 border-t border-line bg-panel px-3 py-2"
            action="#"
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) run(input);
            }}
          >
            <span className="font-mono text-sm text-accent" aria-hidden>
              os&gt;
            </span>
            <input
              ref={inputRef}
              className="grow bg-transparent font-mono text-sm text-ink outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                const inputs = history
                  .filter((h) => h.kind === "input")
                  .map((h) => h.lines[0]?.text ?? "");
                if (e.key === "Enter") {
                  // Explicit submit: do not rely on implicit form submission.
                  e.preventDefault();
                  if (input.trim()) run(input);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const idx = historyIdx === null ? inputs.length - 1 : Math.max(0, historyIdx - 1);
                  if (inputs[idx] !== undefined) {
                    setHistoryIdx(idx);
                    setInput(inputs[idx]);
                  }
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (historyIdx === null) return;
                  const idx = historyIdx + 1;
                  if (idx >= inputs.length) {
                    setHistoryIdx(null);
                    setInput("");
                  } else {
                    setHistoryIdx(idx);
                    setInput(inputs[idx]);
                  }
                } else if (e.key === "Tab") {
                  e.preventDefault();
                  complete();
                }
              }}
              aria-label="Terminal input"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-primary text-xs">
              Run
            </button>
          </form>
          ) : (
            <div className="flex items-center gap-2 border-t border-line bg-panel px-3 py-2 text-xs text-ink-faint">
              <span className="font-mono text-accent" aria-hidden>os&gt;</span>
              loading interpreter…
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="chip hover:border-accent/50"
                onClick={() => run(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Live shared state */}
        <aside className="space-y-3" aria-label="Live simulation panels driven by the terminal">
          <div className="card p-3">
            <h2 className="section-label">Process table (live)</h2>
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="text-left text-ink-faint">
                  <th scope="col" className="py-1 font-medium">PID</th>
                  <th scope="col" className="py-1 font-medium">Name</th>
                  <th scope="col" className="py-1 font-medium">State</th>
                  <th scope="col" className="py-1 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {system.processes.processes.map((p) => (
                  <tr key={p.pid} className="border-t border-line/60 font-mono">
                    <td className="py-1">{p.pid}</td>
                    <td className="py-1">{p.name}</td>
                    <td className={`py-1 ${p.state === "zombie" ? "text-p-violet" : p.state === "running" ? "text-ok" : ""}`}>
                      {p.state}
                    </td>
                    <td className="py-1">
                      {p.progress}/{p.burst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-3">
            <h2 className="section-label">Scheduler timeline (live)</h2>
            <TimelineStrip
              timeline={system.scheduling.result.timeline}
              cursor={system.scheduling.cursor}
              algorithm={system.scheduling.algorithm}
            />
          </div>

          <div className="card p-3">
            <h2 className="section-label">CPU / interrupts (live)</h2>
            <ul className="mt-2 space-y-1 font-mono text-xs text-ink-muted">
              <li>mode: {system.interrupts.mode}</li>
              <li>pending interrupts: {system.interrupts.pendingQueue.length}</li>
              <li>handled: {system.interrupts.stats.interruptsHandled} · latency total: {system.interrupts.stats.totalLatency}</li>
              <li>polling: {system.interrupts.pollingMode ? "on" : "off"}</li>
              <li>ready queue: [{system.processes.readyQueue.join(", ")}]</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TimelineStrip({
  timeline,
  cursor,
  algorithm,
}: {
  timeline: { pid: string | null; start: number; end: number }[];
  cursor: number;
  algorithm: string;
}) {
  if (timeline.length === 0) {
    return (
      <p className="mt-2 text-xs text-ink-faint">
        Run a scheduler command (e.g. <span className="font-mono">schedule fcfs</span>) to see the timeline.
      </p>
    );
  }
  const makespan = Math.max(1, ...timeline.map((s) => s.end));
  const pids: string[] = [];
  for (const s of timeline) if (s.pid && !pids.includes(s.pid)) pids.push(s.pid);
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex h-5 overflow-hidden rounded border border-line">
        {timeline.slice(0, cursor).map((s, i) => (
          <div
            key={i}
            title={`${s.pid ?? "idle"}: ${s.start}–${s.end}`}
            style={{
              width: `${((s.end - s.start) / makespan) * 100}%`,
              background: s.pid ? processColor(pids.indexOf(s.pid)) : "rgb(var(--bad))",
              opacity: s.pid ? 0.9 : 0.5,
            }}
            className="border-r border-line/60"
          />
        ))}
      </div>
      <p className="text-xs text-ink-faint">
        {algorithm.toUpperCase()} · {cursor}/{timeline.length} decisions revealed · idle shown in red
      </p>
    </div>
  );
}
