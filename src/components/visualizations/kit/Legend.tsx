"use client";

/**
 * Colour + shape + label key for any lab visual. Colour is never the only
 * signal: every legend entry names what it marks.
 */
export function Legend({
  items,
  caption,
}: {
  items: { label: string; color?: string; shape?: "square" | "circle" | "line" | "rect" }[];
  caption?: string;
}) {
  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption> : null}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={
                item.shape === "circle"
                  ? "h-3 w-3 rounded-full"
                  : item.shape === "line"
                    ? "h-0.5 w-4"
                    : item.shape === "rect"
                      ? "h-3 w-4 rounded-sm border"
                      : "h-3 w-3 rounded-sm"
              }
              style={{ background: item.color, borderColor: item.color }}
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
