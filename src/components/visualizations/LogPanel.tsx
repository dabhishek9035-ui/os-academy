"use client";

import { useMemo } from "react";
import type { SimEvent } from "@/types";

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-p-blue",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
};

export function LogPanel({
  events,
  title = "Event log",
  emptyText = "No events yet — press play or interact with the simulation.",
  max = 150,
  className = "",
}: {
  events: SimEvent[];
  title?: string;
  emptyText?: string;
  max?: number;
  className?: string;
}) {
  const shown = useMemo(() => events.slice(-max).reverse(), [events, max]);
  return (
    <section
      className={`flex min-h-0 flex-col rounded-lg border border-line bg-bg-soft ${className}`}
      aria-label={title}
    >
      <h4 className="border-b border-line px-3 py-2 section-label">{title}</h4>
      <ol
        className="thin-scroll max-h-64 grow overflow-y-auto px-3 py-2 text-[13px]"
        aria-live="polite"
      >
        {shown.length === 0 ? (
          <li className="text-ink-faint">{emptyText}</li>
        ) : (
          shown.map((e, i) => (
            <li key={`${e.time}-${e.kind}-${i}`} className="flex gap-2 py-0.5 leading-snug">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[e.severity ?? "info"]}`}
                aria-hidden
              />
              <span className="font-mono text-[11px] text-ink-faint">{e.time}</span>
              <span className="text-ink-muted">
                {e.label}
                {e.detail ? <span className="text-ink-faint"> — {e.detail}</span> : null}
              </span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
