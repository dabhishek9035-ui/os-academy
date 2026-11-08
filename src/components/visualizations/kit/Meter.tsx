"use client";

/**
 * Thin labelled value bar with the number spelled out beside it (never
 * tooltip-only). `value`/`max` are engine units; `display` is the formatted
 * string to show (defaults to a percentage).
 */
export function Meter({
  label,
  value,
  max = 100,
  display,
  tone = "neutral",
  caption,
}: {
  label: string;
  value: number;
  max?: number;
  display?: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
  caption?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const shown = display ?? `${Math.round(pct)}%`;
  const barColor =
    tone === "ok"
      ? "rgb(var(--ok))"
      : tone === "warn"
        ? "rgb(var(--warn))"
        : tone === "bad"
          ? "rgb(var(--bad))"
          : "rgb(var(--accent))";

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? <figcaption className="mb-1 text-xs text-ink-muted">{caption}</figcaption> : null}
      <div
        className="flex items-center justify-between gap-2 text-xs"
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${shown}`}
      >
        <span className="font-medium text-ink-muted">{label}</span>
        <span className="font-mono font-semibold text-ink">{shown}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-panel-soft">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </figure>
  );
}
