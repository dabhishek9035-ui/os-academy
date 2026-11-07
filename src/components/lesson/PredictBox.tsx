"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PREDICT_PROMPTS } from "@/lib/game/predict";
import { useGameStore } from "@/lib/game/player";

/** "Predict what happens next" micro-prompt after a simulation section. */
export function PredictBox({ simId }: { simId: string }) {
  const prompt = PREDICT_PROMPTS[simId];
  const [revealed, setRevealed] = useState(false);
  const trackPrediction = useGameStore((s) => s.trackPrediction);
  if (!prompt) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-dashed border-warn/50 bg-warn/5 px-4 py-3"
    >
      <p className="flex items-start gap-2 text-sm text-ink">
        <span aria-hidden>🔮</span>
        <span>
          <strong className="font-semibold">Predict:</strong> {prompt.q}
        </span>
      </p>
      {revealed ? (
        <p className="mt-2 rounded-lg bg-panel-soft px-3 py-2 text-xs leading-relaxed text-ink-muted">
          {prompt.a}
        </p>
      ) : (
        <button
          type="button"
          className="btn mt-2 text-xs"
          onClick={() => {
            setRevealed(true);
            trackPrediction();
          }}
        >
          Commit a guess, then reveal
        </button>
      )}
    </motion.div>
  );
}
