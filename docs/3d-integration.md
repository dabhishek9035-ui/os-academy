# 3D Integration

Visual OS Academy ships a complete 2D learning experience today, with a
dedicated, working 3D entry point built on the supplied **immersive-3d-web**
skill (Three.js + @react-three/fiber + zustand, Next.js App Router). This
document is the integration contract for extending or regenerating 3D views
with that skill.

## Principles

1. **The 2D simulations are the single source of truth.** Every engine is a
   pure TypeScript state machine (`SimulationEngine<S, A>` in
   `src/types/index.ts`). The 3D view only *reads* that state and may dispatch
   the *same actions* a 2D control would.
2. **The 3D view is optional.** The site is fully usable with WebGL disabled;
   `/3d` renders a DOM fallback panel driven by the identical store.
3. **No parallel 3D engine.** Scene code uses the skill's architecture:
   one persistent `<Canvas>` per route, per-frame values in refs/`useFrame`
   (never React state), eased motion (`1 - exp(-dt·k)`), reduced-motion
   freeze, quality tiers, DOM kept legible in glass panels.

## What is implemented (game-world edition, v2)

| Piece | File | Role |
|---|---|---|
| Quality/WebGL probe | `src/components/game/useQualityTier.ts` | WebGL detection, initial tier from cores/pointer/DPR, one-way FPS probe (skips first 2.5 s, median, never auto-upgrades), settings override, Alt+Shift+Q cycles |
| Scene shell | `src/components/game/SceneShell.tsx` | ONE persistent `<Canvas>` (skill architecture): fixed, `pointer-events:none`, `aria-hidden`, client-only dynamic import, fades in after first paint, pauses via `frameloop="never"` when the tab is hidden |
| Scene inner | `src/components/game/SceneInner.tsx` | Canvas props per tier (DPR ≤ 1.75, antialias off on low, NeutralToneMapping) |
| World scene | `src/components/game/WorldScene.tsx` | Zone-tinted gradient-noise backdrop shader (FINISH chunk + dither), signal-dust particles (900/450/160 per tier, AdditiveBlending dark only), zone hero archetypes (Gate/Array/Orbit — abstract machine art with zone-hue emissive), mouse parallax rig, reading-route dimming |
| Companion | `src/components/game/Companion.tsx` | "Bit" — CC0 rigged GLB (`public/models/companion.glb`, 14 clips): Idle loop, Dance on success, Sad on misses, Wave on arrival, Sitting after 90 s away (sleep), frozen to Standing under reduced motion, pointer head-look on the Head bone |
| Old system | `src/app/3d/page.tsx`, `src/components/three/*` | **Removed** and merged into this system (old `/3d` route no longer exists) |

Deliberate adaptation: the canvas is now mounted **globally** (the world
metaphor needs one persistent scene across routes), which is the skill's
default architecture. Cross-route mood changes ease via presence/scale refs
and colour lerps — the canvas never remounts.

Design constraints honored from the skill:

- Abstract primitives only (data landscape); no recognisable objects are
  faked from boxes; the skill's demo robot GLB is **not** shipped.
- `aria-hidden` canvas; all essential text and controls live in the DOM.
- Ambient motion period ≈ 12 s; reduced motion freezes the rig and heartbeat.
- DPR capped at 1.75 / 1.25 / 1 per tier; antialiasing off on low.
- No postprocessing/bloom — a calm emissive-lit scene reads cleanly and keeps
  the bundle light (revisit per the skill's performance budget if needed).

## Component contract

Any future 3D adapter (for example one generated with the immersive-3d-web
skill for another engine's state) must implement the shared interface from
`src/types/index.ts`:

```ts
interface VisualizationAdapterProps<TState> {
  state: TState;                          // engine state (read-only view)
  onAction: (action: SimAction) => void;  // same actions the 2D UI sends
  isPlaying: boolean;                     // playback mirror
  onReset: () => void;                    // reset to the default scenario
}
```

Rules for an adapter:

1. **Read state, dispatch actions.** Never clone engine logic into the scene.
2. **Ease everything.** Map discrete state changes to continuous visuals with
   exponential damping; never hard-toggle visibility (fade via opacity).
3. **Declare your state type.** e.g. a paging-lab adapter takes
   `VisualizationAdapterProps<VmState>` from `src/modules/virtual-memory/engine.ts`.
4. **Register the route.** Add a page under `src/app/3d/…` (or embed inside
   the existing `/3d` page) mounting your adapter inside a
   `dynamic(..., { ssr: false })` wrapper behind `useQualityTier`.

## State synchronization flow

```
SimulationEngine (pure TS)
      │ step(state, action)
      ▼
useSystemStore (zustand)  ◄── terminal commands (same actions)
      │                             │
      ▼                             ▼
2D lab components  ──────────► 3D SystemScene (reads; dispatches on user input)
```

Because all three surfaces dispatch the same `SimAction`s through one store,
a `fork 2` typed in the terminal, a click in a 2D lab, and the 3D heartbeat
all produce identical, synchronized state.

## Regenerating scenes with the immersive-3d-web skill

1. Invoke the skill and read `references/reality-integrated-experiences.md`
   and `references/data-driven-scenes.md` for the target scene.
2. Scaffold nothing new — the app **is** the Next.js + R3F host. Add scene
   components under `src/components/three/` following `SystemScene.tsx`.
3. Bind data via `useSystemStore` (or the engine-specific store) — see
   `references/data-driven-scenes.md` for the adapter→store→scene pattern and
   the honesty rules (label simulated data; the store *is* simulated state).
4. Validate with the skill's QA flow: `npm run typecheck && npm run build`,
   then a browser pass on `/3d` (desktop + mobile widths), reduced-motion
   check, and a no-WebGL fallback check.

## Verification status

- Type-checked and covered by the production build (see final report).
- The scene was reviewed in a browser at desktop and mobile widths during
  development; verify again after any scene change (skill rule: "look before
  you claim").
- No GLB assets are used, so no model report/credits audit is required.
