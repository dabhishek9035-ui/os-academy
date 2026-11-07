"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/** Floating "+N XP" pop — mount where the action happened. */
export function XpPop({ amount, trigger }: { amount: number; trigger: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 1400);
    return () => window.clearTimeout(t);
  }, [trigger]);
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, y: 8, scale: 0.8 }}
          animate={{ opacity: 1, y: -26, scale: 1 }}
          exit={{ opacity: 0, y: -44 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="pointer-events-none absolute -top-2 right-3 z-20 font-mono text-sm font-bold text-accent"
          role="status"
        >
          +{amount} XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Codex drop toast: "New codex cards discovered". */
export function CodexDrop({ count, names }: { count: number; names: string[] }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (count === 0) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 4200);
    return () => window.clearTimeout(t);
  }, [count, names]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-3 flex items-start gap-3 rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 py-2.5"
          role="status"
        >
          <span className="text-xl" aria-hidden>🃏</span>
          <span>
            <span className="block text-sm font-bold text-ink">
              {count} codex card{count === 1 ? "" : "s"} discovered
            </span>
            <span className="block text-xs text-ink-muted">
              {names.slice(0, 3).join(" · ")}
              {names.length > 3 ? ` +${names.length - 3} more` : ""} — open the Codex to view them.
            </span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
