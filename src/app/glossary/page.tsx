"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ALL_GLOSSARY,
  CONCEPT_EDGES,
  CONCEPT_NODES,
  glossaryById,
} from "@/data/glossary";
import { MODULE_MAP } from "@/data/curriculum/config";
import { RARITY_META, rarityOf, codexCounts, type Rarity } from "@/lib/game/codex";
import { useGameStore } from "@/lib/game/player";
import { useHasMounted } from "@/lib/useHasMounted";
import type { GlossaryEntry } from "@/types";

/** Simple Levenshtein distance for forgiving search ("semfore" → "semaphore"). */
function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function searchEntries(query: string, onlySeen: boolean): GlossaryEntry[] {
  const seen = new Set(useGameStore.getState().codexSeen);
  const pool = onlySeen ? ALL_GLOSSARY.filter((e) => seen.has(e.id)) : ALL_GLOSSARY;
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  const scored = pool.map((e) => {
    const term = e.term.toLowerCase();
    const full = (e.fullForm ?? "").toLowerCase();
    let score = 0;
    if (term === q) score = 100;
    else if (term.startsWith(q)) score = 80;
    else if (term.includes(q) || full.includes(q)) score = 60;
    else if (q.length >= 4 && editDistance(q, term, 3) <= Math.min(3, Math.floor(term.length / 3)))
      score = 40;
    else if (e.simple.toLowerCase().includes(q) || e.technical.toLowerCase().includes(q)) score = 20;
    return { e, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.e.term.localeCompare(b.e.term))
    .map((s) => s.e);
}

export default function CodexPage() {
  const mounted = useHasMounted();
  const codexSeen = useGameStore((s) => s.codexSeen);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState<"all" | Rarity>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const seen = useMemo(() => new Set(codexSeen), [codexSeen]);
  const counts = useMemo(() => codexCounts(), [codexSeen]);

  const results = useMemo(() => searchEntries(query, false), [query, codexSeen]);
  const filtered = useMemo(
    () =>
      results.filter(
        (e) =>
          (moduleFilter === "all" || e.moduleId === moduleFilter) &&
          (rarityFilter === "all" || rarityOf(e.id) === rarityFilter),
      ),
    [results, moduleFilter, rarityFilter],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="section-label">Machina · codex</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">
          The Codex{" "}
          <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            of the machine
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Every term you meet on your journey becomes a collectible card.
          {mounted ? ` ${counts.seen}/${counts.total} discovered.` : ""} Search
          forgives typos — try “semfore”.
        </p>
        {/* rarity tally */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(["common", "rare", "epic", "legendary"] as Rarity[]).map((r) => (
            <span key={r} className={`chip ${RARITY_META[r].frame} ${RARITY_META[r].text}`}>
              {RARITY_META[r].label} {mounted ? `${counts.byRarity[r].seen}/${counts.byRarity[r].total}` : ""}
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          className="w-full max-w-xs rounded-lg border border-line bg-panel px-3 py-2 text-sm"
          placeholder="Search discovered cards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the codex"
        />
        <select
          className="rounded-lg border border-line bg-panel px-2 py-2 text-sm"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          aria-label="Filter by zone"
        >
          <option value="all">All zones</option>
          {Object.values(MODULE_MAP).map((m) => (
            <option key={m.id} value={m.id}>
              {m.num}. {m.title}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-line bg-panel px-2 py-2 text-sm"
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value as Rarity | "all")}
          aria-label="Filter by rarity"
        >
          <option value="all">All rarities</option>
          {(["common", "rare", "epic", "legendary"] as Rarity[]).map((r) => (
            <option key={r} value={r}>
              {RARITY_META[r].label}
            </option>
          ))}
        </select>
        <button type="button" className="btn text-sm" onClick={() => setShowGraph((v) => !v)}>
          {showGraph ? "Hide concept map" : "Concept map"}
        </button>
      </div>

      {showGraph ? <ConceptGraph onOpen={setOpenId} /> : null}

      {openId ? (
        <EntryDetail entry={glossaryById(openId)} onClose={() => setOpenId(null)} onOpen={(id) => setOpenId(id)} />
      ) : null}

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((e) => {
          const discovered = mounted && seen.has(e.id);
          const rarity = rarityOf(e.id);
          const meta = RARITY_META[rarity];
          return (
            <li key={e.id}>
              <motion.button
                type="button"
                layout
                whileHover={{ y: -3 }}
                className={`card panel-pad h-full w-full text-left ${meta.frame} ${
                  discovered ? "" : "opacity-60"
                }`}
                style={discovered ? { boxShadow: meta.glow } : undefined}
                onClick={() => setOpenId(e.id)}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${meta.text}`}>
                    {meta.label}
                  </span>
                  <span className="chip px-1.5 py-0 text-[9px]">
                    {MODULE_MAP[e.moduleId] ? `M${MODULE_MAP[e.moduleId].num}` : ""}
                  </span>
                </div>
                <h2 className="mt-1.5 text-sm font-bold text-ink">
                  {discovered ? e.term : "???"}
                  {discovered && e.fullForm ? (
                    <span className="ml-1 text-[10px] font-normal text-ink-faint">({e.fullForm})</span>
                  ) : null}
                </h2>
                <p className="mt-1 text-xs leading-snug text-ink-muted">
                  {discovered ? e.simple : "Undiscovered — meet this term in a quest or clear its zone."}
                </p>
              </motion.button>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 ? (
        <p className="card panel-pad text-sm text-ink-muted">
          No cards matched “{query}”. Try a shorter or differently spelled query.
        </p>
      ) : null}
    </div>
  );
}

function EntryDetail({
  entry,
  onClose,
  onOpen,
}: {
  entry: GlossaryEntry | undefined;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  if (!entry) return null;
  const mod = MODULE_MAP[entry.moduleId];
  const rarity = rarityOf(entry.id);
  const meta = RARITY_META[rarity];
  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`card panel-pad border-2 ${meta.frame}`}
      style={{ boxShadow: meta.glow }}
      aria-label={`Codex entry: ${entry.term}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`font-mono text-[9px] uppercase tracking-[0.25em] ${meta.text}`}>
            {meta.label} card
          </span>
          <h2 className="text-xl font-black text-ink">
            {entry.term}
            {entry.fullForm ? (
              <span className="ml-2 text-sm font-normal text-ink-faint">({entry.fullForm})</span>
            ) : null}
          </h2>
        </div>
        <button type="button" className="btn btn-ghost px-2" onClick={onClose} aria-label="Close entry">
          ✕
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="section-label">In plain language</h3>
          <p className="mt-1 text-sm text-ink-muted">{entry.simple}</p>
        </div>
        <div>
          <h3 className="section-label">Technical definition</h3>
          <p className="mt-1 text-sm text-ink-muted">{entry.technical}</p>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="section-label">Example</h3>
        <p className="mt-1 text-sm text-ink-muted">{entry.example}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {mod ? (
          <Link href={`/roadmap/${mod.id}`} className="chip hover:border-accent/50">
            Module {mod.num}: {mod.title}
          </Link>
        ) : null}
        {entry.lessonRef ? (
          <Link href={`/lesson/${entry.lessonRef}`} className="chip hover:border-accent/50">
            Quest: {entry.lessonRef.split("/")[1]?.replace(/-/g, " ")}
          </Link>
        ) : null}
        {entry.refUrl ? (
          <a href={entry.refUrl} target="_blank" rel="noreferrer" className="chip hover:border-accent/50">
            Reference: {entry.refLabel ?? "source"} ↗
          </a>
        ) : null}
        {entry.related.length > 0 ? (
          <span className="text-ink-faint">
            Related:{" "}
            {entry.related.map((rid, i) => {
              const rel = glossaryById(rid);
              return rel ? (
                <span key={rid}>
                  {i > 0 ? ", " : ""}
                  <button type="button" className="link" onClick={() => onOpen(rid)}>
                    {rel.term}
                  </button>
                </span>
              ) : null;
            })}
          </span>
        ) : null}
      </div>
    </motion.section>
  );
}

/** Deterministic radial concept graph in SVG (kept from the glossary). */
function ConceptGraph({ onOpen }: { onOpen: (id: string) => void }) {
  const width = 760;
  const height = 560;
  const cx = width / 2;
  const cy = height / 2;
  const positions = new Map<string, { x: number; y: number }>();
  CONCEPT_NODES.forEach((n, i) => {
    const ring = i < 6 ? 0 : i < 16 ? 1 : 2;
    const countInRing = i < 6 ? 6 : i < 16 ? 10 : CONCEPT_NODES.length - 16;
    const idxInRing = i < 6 ? i : i < 16 ? i - 6 : i - 16;
    const radius = 90 + ring * 105;
    const angle = (2 * Math.PI * idxInRing) / Math.max(1, countInRing) + ring * 0.5;
    positions.set(n.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });

  return (
    <figure className="card overflow-hidden p-3">
      <figcaption className="mb-1 text-xs text-ink-muted">
        How the concepts connect — click any node to open its codex card.
      </figcaption>
      <div className="thin-scroll overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label="Concept map connecting operating-systems concepts"
        >
          {CONCEPT_EDGES.map((e, i) => {
            const a = positions.get(e.from);
            const b = positions.get(e.to);
            if (!a || !b) return null;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--line)" strokeWidth={1.4} />;
          })}
          {CONCEPT_NODES.map((n) => {
            const p = positions.get(n.id)!;
            const entry = n.glossaryId ? glossaryById(n.glossaryId) : undefined;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x} ${p.y})`}
                className="cursor-pointer"
                onClick={() => entry && onOpen(entry.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if ((ev.key === "Enter" || ev.key === " ") && entry) onOpen(entry.id);
                }}
              >
                <circle r={34} fill="var(--panel-soft)" stroke="var(--accent)" strokeOpacity={0.35} />
                <text textAnchor="middle" dy="0.35em" fontSize={10.5} fill="var(--ink)" style={{ pointerEvents: "none" }}>
                  {n.label.length > 14 ? n.label.slice(0, 13) + "…" : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
