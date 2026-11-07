"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Minimal inline formatter for lesson body text:
 *   **bold** · *emphasis* · `code` · [lesson:module/lesson] → link
 * Everything else passes through as plain text (safe by default).
 */
export function Inline({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  // Split on tokens: bold, code, emphasis, lesson links.
  const re =
    /(\*\*[^*]+\*\*)|(`[^`]+`)|(\*[^*\s][^*]*\*)|(\[lesson:[a-z0-9-]+\/[a-z0-9-]+\])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    const tok = match[0];
    if (tok.startsWith("**")) {
      nodes.push(<strong key={key++} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-panel-soft px-1 py-0.5 font-mono text-[0.85em] text-ink">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[lesson:")) {
      const id = tok.slice(8, -1);
      nodes.push(
        <Link key={key++} href={`/lesson/${id}`} className="link">
          {id.split("/")[1]?.replace(/-/g, " ") ?? id}
        </Link>,
      );
    } else {
      nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = match.index + tok.length;
  }
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return <>{nodes}</>;
}

export function Paragraphs({ body }: { body: string[] }) {
  return (
    <>
      {body.map((p, i) => (
        <p key={i} className="leading-relaxed text-ink-muted">
          <Inline text={p} />
        </p>
      ))}
    </>
  );
}
