"use client";

import { processColor } from "@/types";

export interface MemoryBlockView {
  start: number;
  size: number;
  /** null = free hole. */
  owner: string | null;
}

/**
 * Address space as one proportional strip: allocated blocks get process
 * colours, holes get the shared "free" treatment, all labelled in place.
 */
export function MemoryStrip({
  blocks,
  total,
  height = 96,
  unitWidth = 11,
  highlightOwner,
  caption,
}: {
  blocks: MemoryBlockView[];
  total: number;
  height?: number;
  /** px per unit — scroll horizontally when the strip exceeds the panel. */
  unitWidth?: number;
  highlightOwner?: string | null;
  caption?: string;
}) {
  const colors: Record<string, string> = {};
  let colorIdx = 0;
  for (const b of blocks) {
    if (b.owner && b.owner !== "kernel" && !colors[b.owner]) {
      colors[b.owner] = processColor(colorIdx++);
    }
  }

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div className="thin-scroll overflow-x-auto">
        <div
          className="relative flex min-w-[560px] items-stretch"
          style={{ height }}
          role="img"
          aria-label={`Memory strip, ${total} units total: ${blocks
            .map((b) => (b.owner === null ? `free ${b.size}` : `${b.owner} ${b.size}`))
            .join(", ")}`}
        >
          {blocks.map((b, i) => {
            const isFree = b.owner === null;
            const highlighted = b.owner !== null && b.owner === highlightOwner;
            return (
              <div
                key={i}
                className={`relative flex flex-col items-center justify-center border-r border-line/60 text-xs ${
                  isFree ? "bg-bad/10 text-ink-faint" : "text-ink"
                }`}
                style={{
                  width: Math.max(unitWidth * 0.75, b.size * unitWidth - 1),
                  marginRight: 1,
                  background: isFree
                    ? undefined
                    : b.owner === "kernel"
                      ? "var(--panel-soft)"
                      : colors[b.owner as string],
                  outline: highlighted ? "2px solid rgb(var(--accent))" : undefined,
                  outlineOffset: highlighted ? "-2px" : undefined,
                }}
                title={
                  isFree
                    ? `Free hole: ${b.size} units @ ${b.start}`
                    : `${b.owner}: ${b.size} units @ ${b.start}`
                }
              >
                <span className="font-mono">{isFree ? "hole" : b.owner}</span>
                <span className="font-mono opacity-70">{b.size}u</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-ink-faint">
          <span>0</span>
          <span>{Math.round(total / 2)}</span>
          <span>{total}</span>
        </div>
      </div>
    </figure>
  );
}
