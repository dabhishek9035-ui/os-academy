# Visual OS Academy — Game Design Brief

> The course is a **machine world** called **MACHINA**. The student doesn't
> "take a course"; they **reboot a dormant world**, district by district,
> until the Kernel wakes up. This document is the build contract. Knobs are
> marked ⚙.

## 1. Art direction

- **Style:** neon schematic — the world is drawn like a living motherboard:
  dark glass over deep space-black, circuit traces, signal lines, one accent
  hue per district. Abstract primitives are honest here (cores, packets,
  gates are geometric objects in-universe); the **only character is a real
  rigged GLB** (see §6).
- **Two moods:** `night` (default, additive glow, bloom on high tier) and
  `day` (paper-schematic light theme: no bloom, no additive, tinted haze,
  dark ink). Existing `data-theme` + settings store keep working; the 3D
  scene reads the same theme id.
- **Type:** chunky display headings (font-black, tight tracking), mono
  micro-labels for HUD/stats, regular sans for body. Text ≥ 4.5:1 over the
  brightest backdrop pixel — the canvas dims behind text columns.
- **Juice:** every reward lands as motion + sound: XP pops (count-up float),
  rank-up burst, badge toast, unlock fog-lift on the map, boss victory slam.
  All ≤ 1.2 s, all skippable (reduced motion → instant states).

## 2. World & zones (1:1 with modules — ids unchanged)

| # | Module id | Zone | Story hook | Motif | Hue |
|---|---|---|---|---|---|
| 0 | intro-computers-os | **Boot Docks** | where every machine wakes | horizon gate | cyan |
| 1 | interrupts | **Signal Heights** | towers that shout when the world needs the CPU | signal spikes | emerald |
| 2 | processes | **Fork Foundry** | spawn bays; parent cranes build child drones | forging frames | amber |
| 3 | cpu-scheduling | **Cyan Yards** | one engine, endless queues of wagons | rails + queue lights | sky |
| 4 | threads-concurrency | **The Loom** | threads weaving shared memory; race winds | woven beams | rose |
| 5 | memory-management | **Stack Rows** | a city of plots, holes and demolition | plot grid | lime |
| 6 | virtual-memory | **Paged Heights** | sky-pages mapped to ground frames | floating slabs | violet |
| 7 | deadlocks | **Gridlock Junction** | the intersection that froze itself | crossed beams | red |
| 8 | synchronization | **Semaphore Docks** | harbour signals taking turns | semaphore arms | teal |
| 9 | filesystems | **The Archive** | vault of blocks, inodes and paper trails | archive slabs | orange |
| 10 | io-systems | **Pulse Refinery** | conduits pumping data to the outside | pulsing pipes | fuchsia |
| 11 | syscalls-security | **The Bastion** | the guarded gate between rings | gate walls | indigo |
| 12 | virtualization | **Mirror Spire** | worlds inside worlds | nested frames | purple |
| 13 | capstone | **The Core** | heart of Machina; the final ascent | reactor core | white-gold |

Bosses per zone (quiz = boss fight): Boot Warden, SIGINT, The Foreman,
Dispatcher, The Tangled Weaver, Heapkeeper, Page Phantom, Gridlock Serpent,
The Arbitrator, Archivist Prime, Latency Beast, Gatekeeper, Mirror Lord,
**KERNEL PANIC** (final boss).

## 3. Game systems

- **XP (derived first):** lessons 25 XP each · quiz pass 120 + 30×(score−8)
  · quiz attempt 10 (max 50/module) · mission 40 · daily 25 (+15 perfect).
  Derived from existing progress, so old saves gain XP on first load.
  **Bonus XP ledger** in the game store adds combo bonuses & achievements.
  ⚙ `lib/game/player.ts` (`deriveXp`).
- **Ranks (12):** Boot Sector → Signal Scout → Process Handler → Queue
  Runner → Thread Weaver → Page Warden → Deadlock Breaker → Cache Keeper →
  Syscall Adept → Ring-0 Operator → Hypervisor → Kernel Hacker. ⚙ thresholds.
- **Streak:** forgiving — a missed day consumes one of 3 "rest days"
  (refills at each 7-day milestone). Copy never guilt-trips.
- **Achievements (28):** see `lib/game/achievements.ts`; 5 secret.
- **Mastery stars per module (3):** ⭐ lessons complete · ⭐ boss passed ·
  ⭐ all missions done. Derived.
- **Codex:** glossary terms become collectible cards; rarity from a stable
  id hash (common 60 / rare 25 / epic 12 / legendary 3 %). Unlocked when met
  (lesson completed → that lesson's terms; boss cleared → the module's set).
- **Daily circuit:** 5 quick-fire questions (3 weighted to weak areas via
  `deriveWeakAreas`), 30 s each, once per day, XP + streak touch.

## 4. Store schema (`visual-os-academy-game`, version 1, migrated defensively)

```ts
{ version: 1, xpBonus: number, achievements: Record<string, string /*ISO*/>,
  streak: { count, longest, lastActive: "YYYY-MM-DD", restDays: number },
  codexSeen: string[], missions: Record<string, { done: boolean; attempts: number }>,
  boss: Record<string, { wins: number; losses: number; bestCombo: number; firstTry: boolean }>,
  daily: { lastDate?: string; streak: number }, stats: { stepBacks, terminal, labsVisited: string[] },
  sound: boolean /* off */, quality: "auto" | "high" | "medium" | "low" }
```
Learning progress stays in `visual-os-academy-progress` (`ProgressStateV1`)
**untouched**; Settings→Reset clears both stores with one confirm.

## 5. Scene architecture (skill architecture, one canvas)

`SceneShell` (client-only, dynamic ssr:false) mounted in `layout.tsx` → ONE
persistent `<Canvas>` (fixed, z-0, `pointer-events:none`, `aria-hidden`),
frameloop pauses when the tab is hidden, DPR ≤ 1.75, quality tiers
high/medium/low (particles 900/450/160), backdrop = gradient-noise shader
tinted per zone (uniforms eased in `useFrame`, presence refs cross-fade on
route change), instanced particle field, zone hero prop (3 archetype groups:
**gate/spikes/loom/core** — abstract machine art, honest primitives), and
the **companion GLB** living in-scene (Idle loop; Dance on success; Sad on a
wrong answer; Sitting when away > 60 s; reduced-motion →静止 Idle pose).
`/3d` page and `SystemScene` are merged into this system and removed.
No WebGL → scene shell renders nothing; every page is a complete 2D game UI.

## 6. Companion: "Bit"

Real rigged GLB (CC0 RobotExpressive, 14 clips) — satisfies the skill's HARD
RULE. Reactions via a tiny mood bus (`lib/game/mood.ts`): `idle | cheer |
oops | wave | sleep`. HUD mini-avatar is a 2D schematic of Bit (honest
fallback when WebGL is off).

## 7. Page-by-page

- `/` — cinematic hero over the persistent scene: rank chip, XP bar,
  **Continue quest** CTA, next objective, today's Daily Circuit card, Bit
  waving. First paint is DOM-complete before WebGL.
- `/roadmap` → **World Map**: the road becomes a glowing circuit trace;
  zones are map nodes with their hue, motif glyph, fog-over-locked,
  star-glow on cleared, "YOU ARE HERE" beacon on the frontier.
- `/lesson/*` — **quest view**: zone banner, checkpoint path for sections
  (scroll-driven), Predict-boxes after visuals, completion juice + codex
  drops.
- `/quiz/*` — **boss fight**: intro card (boss, taunt), HP bars both sides,
  combo multiplier, 50/50 hint costs a shield, victory/defeat outro with
  weak-spot breakdown linking lessons. Grading/recording unchanged.
- Labs — **missions**: 1–3 objectives evaluated from engine state (pure
  data + evaluator, engines untouched), success/fail moment + XP.
- `/progress` — **player profile**: rank, Bit, stats, streak calendar,
  achievement wall, mastery map, activity feed.
- `/glossary` → **Codex** (route kept): collectible card grid, rarity
  frames, "???" silhouettes for undiscovered.
- `/settings` — theme, quality tier, motion, sound, reset (both stores).
- `/daily` — Daily Circuit.

## 8. Sound

Tiny WebAudio synth (`lib/game/sfx.ts`): click/correct/wrong/xp/levelup/
unlock. **Off by default**, one-click toggle in HUD, persisted. No files.
