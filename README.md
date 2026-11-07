# Visual OS Academy

**Don't memorize operating systems. Watch them work.**

An interactive, browser-based operating-systems course that takes a student
from "what is a computer?" to a guided end-to-end simulator — through live 2D
simulations, a safe educational terminal, and per-module assessments. All 14
modules, all simulations, and all progress tracking run entirely locally; no
account, no backend, no tracking.

## Quick start

```bash
npm install        # once
npm run dev        # development server → http://localhost:3000
```

Production:

```bash
npm run build
npm start          # serves the production build
```

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | production build |
| `npm start` | serve the production build |
| `npm run typecheck` | strict TypeScript check |
| `npm test` | run all Vitest suites (engines, quiz, progress, content integrity, UI) |
| `npx vite-node scripts/validate-content.mts` | enforce content rules (20-question banks, whyNot completeness, glossary links) |

## What's inside

- **14 modules** (`src/data/curriculum/config.ts` is the single registry):
  computers & OS → interrupts → processes → CPU scheduling → threads &
  concurrency → memory management → virtual memory → deadlocks →
  synchronization → filesystems → I/O → syscalls & security → virtualization →
  capstone.
- **15 pure simulation engines** (`src/modules/*/engine.ts`) — deterministic,
  React-free, unit-tested against hand-computed traces (textbook scheduling
  results, disk-head totals, Banker's safe sequences, FIFO/LRU/Optimal fault
  counts…).
- **26 interactive labs** (`src/components/visualizations/`) with shared
  playback (play/pause/step-back/speed), live explanations, event logs, and
  honest "model notes" on every simplification.
- **Educational terminal** (`/playground/terminal`) driving the same engine
  state as the visual labs: `interrupt timer`, `fork 2`, `schedule srtf`,
  `memory alloc P9 8`, `paging access 42`, `deadlock detect`,
  `files create /tmp/x 3`, … Unknown commands fail honestly; nothing touches
  your real machine.
- **Assessments**: 10 questions per attempt drawn from a 20+ question bank per
  module, shuffled questions AND options (with remapped answer keys), 80% to
  pass, retakes allowed; passing unlocks the next module. Progress persists in
  `localStorage` with a versioned, defensively-validated schema.
- **Glossary & concept map** with typo-tolerant search.
- **3D entry point** (`/3d`) built on the immersive-3d-web skill (Three.js /
  react-three-fiber): the same simulation state as an abstract landscape, with
  a full no-WebGL fallback. See `docs/3d-integration.md`.

## Documentation

| Doc | Contents |
|---|---|
| `docs/architecture.md` | stack, layers, routes, data flow, persistence |
| `docs/simulation-specifications.md` | every engine's model, actions, simplifications |
| `docs/research-notes.md` | sources consulted, attribution & licensing, simplification inventory |
| `docs/curriculum-map.md` | modules, lessons, prerequisites, dependency diagram |
| `docs/3d-integration.md` | the 3D adapter contract and regeneration guide |

## Educational integrity

All lesson text, diagrams, questions and simulations are original work.
Authoritative sources (OSTEP, xv6, Linux man-pages, POSIX) are cited on the
relevant lessons and consulted during design — never copied. Every simulation
declares its simplifications in the UI ("Model notes") and in
`docs/simulation-specifications.md`.

## Testing

Engines are pure functions, so the correctness core is covered by fast unit
tests: `npx vitest run`. Browser-level flows (start-from-zero → lesson →
simulation → assessment → unlock → refresh-persistence) were verified manually
during development; `npm test` remains the regression gate.
# os-academy
