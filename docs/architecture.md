# Architecture

Visual OS Academy is a local-first Next.js application: no account, no
server-side database, no external AI dependency. Everything — lessons,
simulations, assessments, progress — runs in the browser.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript (strict) | matches the supplied immersive-3d-web skill's host; static-friendly, file-based routes work on refresh |
| Styling | Tailwind CSS 3 + CSS custom properties for theming | dark/light via `[data-theme]` with a pre-paint boot script (no flash) |
| State | zustand (+ persist middleware) | low-frequency app state; simulation state lives in pure engines, not React |
| 3D | three + @react-three/fiber (lazy, `/3d` only) | the supplied skill's stack; see `docs/3d-integration.md` |
| Animation | framer-motion for purposeful UI motion (roadmap road, entrances) + CSS transitions/keyframes; a `data-motion` attribute gates everything | reduced-motion respected globally |
| Tests | Vitest + React Testing Library (jsdom) | fast engine tests; component tests where they pay |

Deliberate substitutions from the master prompt's "recommended" list:
hand-rolled SVG instead of Recharts (every chart is a bespoke, accessible
visualization of engine state — a charting library would have added weight
without fitting the Gantt/timeline shapes), and CSS-first motion instead of
pervasive Framer Motion (reduced-motion support is a hard requirement here).

## Layers

```
src/
  types/            Shared contracts: SimulationEngine, Lesson, QuizQuestion,
                    ProgressStateV1, GlossaryEntry, VisualizationAdapterProps
  modules/<topic>/  PURE simulation engines (no React, deterministic, tested)
  lib/
    simulation/     useSimulation: playback hook (history/step-back/speed)
    quiz/           prepareAttempt / gradeAttempt (shuffling + grading)
    progress/       zustand persist store (versioned, defensive merge) + unlock/weak-area derivations
    commands/       educational terminal: command registry + shared system store
  data/curriculum/  config.ts (single source of truth) + lessons/<module>.ts
  data/questions/   quiz banks <module>.ts (≥20 per module)
  data/glossary/    glossary entries + concept graph
  components/
    layout/         NavBar, ThemeApplier
    lesson/         LessonRenderer (section kinds), Inline formatter
    visualizations/ SimShell + one lab component per simulation + registry.tsx
    three/          3D scene components (see docs/3d-integration.md)
    ui/             inline SVG icon set
  app/              routes (below)
```

**Dependency rule:** `modules/*` (engines) import nothing from React or from
`components/`. Components read engine state and dispatch actions. Data files
are typed content only. This keeps simulation correctness unit-testable and
the UI replaceable.

## Simulation framework

Every lab is a pure engine (`SimulationEngine<S, A>`):

- `initialState(): S` — the default scenario
- `step(state, action): S` — pure transition; appends to `state.eventLog`
  (capped at ~100 entries); returns the same reference when nothing changes
  (which is how playback auto-pauses at "simulation over")
- `explain(state): string` — the one-sentence live explanation in the UI

`useSimulation` (in `lib/simulation`) wraps an engine with React: a bounded
undo history (step-back), play/pause/reset, speed (0.5–4×), and a `tick`
interval for time-driven engines. Event-driven engines simply ignore `tick`.

`SimShell` renders the shared frame: header (title + toolbar slot), live
`explain` line (aria-live), children (the lab's own visualization),
inspector + event log row, playback controls, and a "Model notes" strip that
declares the lab's simplifications.

## Routes

| Route | Purpose |
|---|---|
| `/` | home: hero, start-from-zero / continue, journey preview |
| `/roadmap` | all modules, lock states, progress bars |
| `/roadmap/[moduleId]` | module overview: lessons + assessment entry rules |
| `/lesson/[moduleId]/[lessonId]` | lesson viewer (sections, embedded sims, prev/next, mark complete) |
| `/quiz/[moduleId]` | 10-question assessment with review + retake |
| `/playground` | lab index |
| `/playground/[simId]` | one lab, full width |
| `/playground/terminal` | educational terminal + live state panels |
| `/glossary` | searchable glossary (typo-tolerant) + concept map |
| `/progress` | dashboard: completion, per-module stats, weak areas, activity |
| `/settings` | theme, motion, reset progress (confirmed) |
| `/3d` | dedicated 3D entry point |

## Unlock & progress model

- `MODULES` in `data/curriculum/config.ts` is the single curriculum registry;
  lessons/questions/glossary files key off its ids. Roadmap, unlock logic,
  navigation and progress all derive from it (no duplicated definitions).
- A module unlocks when every `prereqIds` module has `passed === true`.
- Passing requires ≥ 80% on an assessment of exactly 10 questions drawn from
  a ≥ 20-question bank (shuffled questions AND shuffled options with remapped
  answer indices — see `lib/quiz/engine.ts`).
- Progress persists to localStorage (`visual-os-academy-progress`, schema
  version 1) through zustand `persist` with a defensive `merge` that rebuilds
  from malformed data instead of crashing. Settings persist separately.
- Marking a lesson complete requires an explicit user action (button or
  navigating to the next lesson) — never merely visiting.

## The educational terminal

`lib/commands/registry.ts` maps commands to pure functions over a shared
`useSystemStore` that composes real engines (interrupts, processes,
scheduling — extended as more engines connect). `interrupt timer`,
`fork <pid>`, `schedule srtf` etc. dispatch genuine engine actions; the
terminal's side panels render that same store, so terminal and visualization
cannot drift apart. Unknown commands fail with an honest error. Nothing
touches the host machine.

## Content pipeline

Lessons follow the fixed 11-part instructional structure (problem → intuition
→ visual → experiment → technical → worked example → misconceptions →
knowledge check → references → notes) enforced by the `LessonSection` union —
the renderer refuses nothing, but every authored lesson has the full set in
order. Inline text supports `**bold**`, `*emphasis*`, `` `code` `` and
`[lesson:module/lesson]` links, nothing else, and is rendered as text (no
HTML injection surface).

## Performance & resilience notes

- Each lab is `next/dynamic` (client-only, lazy) so heavy sims never block
  first paint of lessons; the 3D bundle loads only on `/3d`.
- Engine history is capped (400 entries); event logs capped (~100); activity
  log capped (60).
- All persisted reads go through defensive migration; a corrupted store
  degrades to defaults rather than breaking the app.
- No network requests after install: fonts are system stacks, no analytics,
  no external images.
