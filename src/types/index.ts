/**
 * Visual OS Academy — shared type contracts.
 *
 * Three families of types live here:
 *  1. Simulation framework types (engines are pure state machines).
 *  2. Curriculum content types (modules, lessons, sections).
 *  3. Assessment / progress types (quiz banks, attempts, persistence schema).
 *
 * Engines must stay React-free and deterministic so they are unit-testable.
 */

// ---------------------------------------------------------------------------
// 1. Simulation framework
// ---------------------------------------------------------------------------

export type EventSeverity = "info" | "ok" | "warn" | "bad";

/** One line in a simulation's event log. */
export interface SimEvent {
  /** Simulation time at which the event happened (engine-defined units). */
  time: number;
  /** Machine-readable kind, e.g. "interrupt-raised". */
  kind: string;
  /** Human-readable one-line description. */
  label: string;
  /** Optional longer explanation of *why*. */
  detail?: string;
  severity?: EventSeverity;
}

/** A discrete simulation action. Every state change is caused by one. */
export interface SimAction<T extends string = string, P = unknown> {
  type: T;
  payload?: P;
}

/** Engines are pure: step(state, action) returns a NEW state. */
export interface SimulationEngine<S, A extends string = string> {
  /** Stable id, e.g. "scheduling". */
  id: string;
  /** Fresh state with the default scenario loaded. */
  initialState(): S;
  /** Pure transition. May append to the state's own event log. */
  step(state: S, action: SimAction<A>): S;
  /** One-sentence explanation of what the current state shows. */
  explain(state: S): string;
  /**
   * Optional demo script for click-driven labs: Play walks through these
   * actions one per tick so the learner watches a full example, then takes
   * over by clicking. Absent on tick-driven labs.
   */
  script?: SimAction<A>[];
  /**
   * Optional end-of-scenario hint. When it returns true the shell shows a
   * "scenario finished" banner and playback pauses. Open-ended labs may omit
   * it, but declaring it makes Reset/Keep-going explicit.
   */
  done?: (state: S) => boolean;
}

/** Snapshot of state + the event/action that produced it (for step-back). */
export interface SimHistoryEntry<S> {
  state: S;
  action?: string;
  event?: SimEvent;
}

/** Consistent palette for per-process coloring across all simulations. */
export const PROCESS_COLORS = [
  "rgb(var(--p-blue))",
  "rgb(var(--p-green))",
  "rgb(var(--p-amber))",
  "rgb(var(--p-red))",
  "rgb(var(--p-violet))",
  "rgb(var(--p-cyan))",
  "rgb(var(--p-pink))",
  "rgb(var(--p-lime))",
] as const;

export function processColor(index: number): string {
  return PROCESS_COLORS[index % PROCESS_COLORS.length];
}

// ---------------------------------------------------------------------------
// 2. Curriculum content
// ---------------------------------------------------------------------------

export interface ReferenceLink {
  label: string;
  url: string;
  note?: string;
}

export interface Equation {
  /** Human-readable formula, e.g. "Turnaround time = Completion − Arrival". */
  expr: string;
  symbols: { sym: string; meaning: string }[];
  note?: string;
}

export interface WorkedStep {
  title: string;
  body: string[];
}

export interface Misconception {
  wrong: string;
  right: string;
}

/** Inline formatting allowed in body text: **bold**, `code`, *emphasis*. */
export interface CheckQuestion {
  id: string;
  q: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export type LessonSection =
  | { kind: "problem"; title?: string; body: string[] }
  | { kind: "intuition"; title?: string; body: string[] }
  | { kind: "visual"; title?: string; simId: string; body?: string[] }
  | {
      kind: "experiment";
      title?: string;
      simId: string;
      prompts: string[];
      body?: string[];
    }
  | { kind: "technical"; title?: string; body: string[]; equations?: Equation[] }
  | { kind: "worked-example"; title?: string; steps: WorkedStep[] }
  | { kind: "misconceptions"; title?: string; items: Misconception[] }
  | { kind: "knowledge-check"; title?: string; questions: CheckQuestion[] }
  | { kind: "references"; title?: string; items: ReferenceLink[] }
  | { kind: "note"; title?: string; body: string[] };

export interface Lesson {
  /** Globally unique: "<moduleSlug>/<lessonSlug>" */
  id: string;
  moduleId: string;
  title: string;
  minutes: number;
  /** What the student should be able to do after this lesson. */
  objectives: string[];
  sections: LessonSection[];
}

export interface ModuleDef {
  /** Stable id like "interrupts". */
  id: string;
  /** 0-based position in the default path. */
  num: number;
  title: string;
  tagline: string;
  description: string;
  /** Module ids that must be passed before this one unlocks. */
  prereqIds: string[];
  /** Simulation ids this module's lessons embed. */
  simIds: string[];
  /** Icon name (inline icon set) — optional. */
  icon?: string;
}

// ---------------------------------------------------------------------------
// 3. Assessment & progress
// ---------------------------------------------------------------------------

export type QuestionKind =
  | "concept"
  | "diagram"
  | "state-transition"
  | "numeric"
  | "prediction"
  | "misconception";

export type Difficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  /** Globally unique stable id, e.g. "sched-q01". */
  id: string;
  moduleId: string;
  /** Lesson id this question is answerable from. */
  lessonRef: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  stem: string;
  /** Exactly four options. */
  options: [string, string, string, string];
  /** Index of the correct option (before any shuffling). */
  answerIndex: 0 | 1 | 2 | 3;
  /** Why each option is wrong — null for the correct one. Same length. */
  whyNot: [string | null, string | null, string | null, string | null];
  /** Explanation of the correct answer. */
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  moduleId: string;
  takenAt: string;
  score: number;
  total: number;
  passed: boolean;
  questionIds: string[];
  /** The chosen option index per question (or null if unanswered). */
  answers: (number | null)[];
}

export interface ModuleProgress {
  lessonsDone: string[];
  attempts: QuizAttempt[];
  bestScore: number;
  passed: boolean;
}

export type ActivityKind = "lesson" | "quiz" | "module" | "reset";

export interface ActivityEvent {
  ts: string;
  kind: ActivityKind;
  label: string;
  moduleId?: string;
}

/** Persisted progress — versioned so migrations stay safe. */
export interface ProgressStateV1 {
  version: 1;
  modules: Record<string, ModuleProgress>;
  activity: ActivityEvent[];
  updatedAt: string;
}

export type ThemePreference = "dark" | "light";
export type MotionPreference = "system" | "reduced" | "full";

export interface SettingsState {
  theme: ThemePreference;
  motion: MotionPreference;
  /** Quiet 3D contour backdrop behind every page (off on low-end devices). */
  ambient: boolean;
}

// ---------------------------------------------------------------------------
// 4. Glossary & concept graph
// ---------------------------------------------------------------------------

export interface GlossaryEntry {
  /** Stable id, usually the kebab-case term. */
  id: string;
  term: string;
  /** Expansion of an acronym, e.g. "Process Control Block". */
  fullForm?: string;
  /** One-sentence beginner-friendly definition. */
  simple: string;
  /** Precise technical definition. */
  technical: string;
  example: string;
  /** Related glossary entry ids. */
  related: string[];
  moduleId: string;
  /** Lesson id for a deep dive, if any. */
  lessonRef?: string;
  /** Simulation to open, if any. */
  simId?: string;
  /** Authoritative external reference. */
  refUrl?: string;
  refLabel?: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  moduleId: string;
  /** Glossary entry or lesson to open on click. */
  href?: string;
  glossaryId?: string;
}

export interface ConceptEdge {
  from: string;
  to: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// 5. 3D integration boundary (see docs/3d-integration.md)
// ---------------------------------------------------------------------------

/**
 * Contract any 3D visualization adapter must satisfy. The 2D simulation
 * remains the single source of truth; a 3D adapter only reads state and
 * emits the same actions a 2D control would.
 */
export interface VisualizationAdapterProps<TState> {
  state: TState;
  onAction: (action: SimAction) => void;
  isPlaying: boolean;
  onReset: () => void;
}
