"use client";

import { processColor } from "@/types";

/**
 * Ordered queue: head on the left, items as labelled blocks, tail marker on
 * the right. Always renders labels in place — colour is never the only
 * signal.
 */
export interface QueueItem {
  id: string;
  label: string;
  /** Optional detail line (e.g. remaining burst). */
  detail?: string;
  colorIndex?: number;
}

export function QueueLane({
  items,
  headLabel = "head",
  tailLabel = "tail",
  emptyLabel = "empty",
  caption,
}: {
  items: QueueItem[];
  headLabel?: string;
  tailLabel?: string;
  emptyLabel?: string;
  caption?: string;
}) {
  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div
        className="flex min-h-11 flex-wrap items-center gap-1.5"
        role="img"
        aria-label={`Queue, front first: ${items.length === 0 ? emptyLabel : items.map((i) => i.label).join(", ")}`}
      >
        {items.length === 0 ? (
          <span className="font-mono text-xs text-ink-faint">{emptyLabel}</span>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className="flex min-h-9 flex-col items-center justify-center rounded-md border px-2 py-1 text-xs"
              style={{
                background: `color-mix(in srgb, ${processColor(item.colorIndex ?? i)} 14%, transparent)`,
                borderColor: processColor(item.colorIndex ?? i),
              }}
              title={item.detail ? `${item.label} — ${item.detail}` : item.label}
            >
              <span className="font-mono font-medium text-ink">{item.label}</span>
              {item.detail ? (
                <span className="font-mono text-[12px] text-ink-muted">{item.detail}</span>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[12px] text-ink-faint">
        <span>← {headLabel}</span>
        <span>{tailLabel} →</span>
      </div>
    </figure>
  );
}
