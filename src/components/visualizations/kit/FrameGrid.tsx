"use client";

/**
 * Frame grid for page replacement: one column per memory access, one row
 * per frame, with fault marks and the victim frame highlighted. DOM table
 * so screen readers get real row/column structure.
 */
export interface FrameGridColumn {
  /** The page that was requested at this time. */
  page: number;
  /** Frame contents after servicing the access (null = empty frame). */
  frames: (number | null)[];
  /** True when this access caused a page fault. */
  fault: boolean;
  /** Index of the frame evicted by this access, if any. */
  victimFrame?: number;
}

export function FrameGrid({
  columns,
  caption,
  hitLabel = "hit",
  faultLabel = "FAULT",
}: {
  columns: FrameGridColumn[];
  caption?: string;
  hitLabel?: string;
  faultLabel?: string;
}) {
  const frameCount = columns[0]?.frames.length ?? 0;

  return (
    <figure className="rounded-lg border border-line bg-bg-soft p-3">
      {caption ? (
        <figcaption className="mb-2 text-xs text-ink-muted">{caption}</figcaption>
      ) : null}
      <div className="thin-scroll overflow-x-auto">
        <table className="border-collapse font-mono text-xs">
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium text-ink-faint">
                frame
              </th>
              {columns.map((c, t) => (
                <th
                  scope="col"
                  key={t}
                  className={`px-1.5 py-1 text-center font-medium ${
                    c.fault ? "text-bad" : "text-ink-faint"
                  }`}
                >
                  {c.page}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: frameCount }, (_, f) => (
              <tr key={f} className="border-t border-line/60">
                <th scope="row" className="px-2 py-1 text-left font-medium text-ink-muted">
                  {f}
                </th>
                {columns.map((c, t) => {
                  const page = c.frames[f];
                  const isVictim = c.fault && c.victimFrame === f;
                  return (
                    <td
                      key={t}
                      className={`px-1.5 py-1 text-center ${
                        page === null
                          ? "text-ink-faint"
                          : isVictim
                            ? "bg-bad/10 font-semibold text-ink"
                            : c.fault
                              ? "bg-panel-soft text-ink"
                              : "text-ink-muted"
                      }`}
                    >
                      {page === null ? "–" : page}
                      {isVictim ? <span className="sr-only"> (evicted)</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th scope="row" className="px-2 py-1 text-left font-medium text-ink-muted">
                result
              </th>
              {columns.map((c, t) => (
                <td
                  key={t}
                  className={`px-1.5 py-1 text-center text-[12px] ${
                    c.fault ? "font-semibold text-bad" : "text-ok"
                  }`}
                >
                  {c.fault ? faultLabel : hitLabel}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Top row = the requested page. Rows below = frame contents after the
        access. The evicted page (when a fault picks a victim) is outlined in
        red. Hit rate and totals live in the metrics panel.
      </p>
    </figure>
  );
}
