# EMOTIONVERSE — "THE LAST LIGHT" Design Document

## Overview

A 3D interactive narrative MVP: React + TypeScript + Three.js (via React Three Fiber), one shared transforming environment, a deterministic story engine with three endings, an optional AI dialogue enrichment layer behind a single Vercel serverless function, and full LocalStorage persistence. Fully playable offline.

Hard rules carried through the whole design:

- **HR-1 (from C-7):** `src/story/` and `src/ai/` are pure TypeScript — no imports of `react`, `three`, `@react-three/*`, no DOM access. Enforced by ESLint `import/no-restricted-imports` per-directory rules and CI.
- **HR-2 (from FR-7.6):** the Story Engine alone validates game-action validity. AI output is presentation-only and can never alter nodes, variables, flags, or endings.
- **HR-3 (from FR-3):** one shared environment; all atmosphere change is interpolation over one profile set — no per-emotion scene duplication.

## Architecture

### Folder structure

```
emotionverse/
├─ api/
│  └─ dialogue.ts                 # Vercel serverless fn (Node runtime), LLM proxy
├─ src/
│  ├─ components/                 # React DOM UI (Tailwind)
│  │  ├─ Landing.tsx
│  │  ├─ EmotionSelection.tsx
│  │  ├─ GameUI.tsx               # exploration HUD: act, emotion, hint button
│  │  ├─ StoryPanel.tsx           # typewriter dialogue + decision/choices
│  │  ├─ InteractionPrompt.tsx    # "Press E" proximity prompt
│  │  └─ EndingScreen.tsx         # ending cinematic + restart
│  ├─ game/                       # R3F 3D layer
│  │  ├─ World.tsx                # scene root, static hand-placed geometry
│  │  ├─ Player.tsx               # low-poly humanoid from primitives + controller
│  │  ├─ Objects.tsx              # generic <InteractiveObject/> + 3 artifact instances
│  │  ├─ Environment.tsx          # atmosphere controller, particles, reaction events
│  │  └─ Camera.tsx               # third-person follow, pointer orbit
│  ├─ story/                      # PURE TS (HR-1)
│  │  ├─ storyData.ts             # node graph, fallback dialogue, hint ladders
│  │  ├─ storyEngine.ts           # advance(), getEnding(), gating
│  │  ├─ storyState.ts            # types: StoryState, vars, flags, events
│  │  └─ endings.ts               # ending computation + ending atmosphere keys
│  ├─ ai/                         # PURE TS (HR-1)
│  │  ├─ aiClient.ts              # fetch wrapper for /api/dialogue, timeout/retry
│  │  ├─ responseValidator.ts     # schema check + sanitize + length caps
│  │  └─ fallbackResponses.ts     # per-node fallback accessors (delegate to storyData)
│  ├─ hooks/
│  │  ├─ useGameStore.ts          # store binding (re-export of selectors)
│  │  ├─ useHintEscalation.ts     # 60 s no-progress timer → hint tier
│  │  ├─ useEnvironmentReaction.ts# story events → environment transitions
│  │  └─ useTypewriter.ts
│  ├─ services/
│  │  ├─ persistence.ts           # LocalStorage save/load/validate/clear
│  │  └─ audio.ts                 # WebAudio synthesized ambience controller
│  ├─ utils/                      # math (lerp, clamp), bounds, misc
│  ├─ types/                      # shared UI/game types (not story-internal ones)
│  ├─ assets/                     # nothing binary — reserved for texture placeholders
│  └─ styles/                     # tailwind entry, design tokens
├─ .kiro/
│  ├─ steering/                   # (see Kiro Workspace Setup)
│  └─ agents/                     # (see Kiro Workspace Setup)
```

### Data flow

One-directional at every boundary:

```
player input → store actions → storyEngine.advance (pure) → new StoryState
    → store → { game (environment transitions), components (UI) }
AI: components (StoryPanel/HUD) → aiClient → /api/dialogue → responseValidator
    → valid: display enrichment  |  invalid: fallbackResponses → display
AI output never enters the store's story slice.
```

### State (Zustand)

Slices: `emotion`, `story` (node id, vars, flags, act), `environment` (current profile key, pending transitions), `ui` (panel open, hint tier, dialogue skip, reduced motion), `settings` (muted, reducedMotion), `aiHealth`. Every story/setting change triggers `persistence.save(state)` (debounced to ~300 ms).

## Components and Interfaces

### Story: "THE LAST LIGHT" (~15 nodes, 3 acts, one artifact per act)

| Node | Act | Content | Choices (effects) |
|---|---|---|---|
| `n_intro` | 1 | Awakening; premise delivered | 3 flavor reactions (emotion-tinted, +0/+1 `resolve`) |
| `n_clock` | 1 | Forgotten Clock encountered | **wind** (`clockWound=true`, `resolve+2`, `light+1`), **leave** (`resolve-1`), **break** (`resolve-3`, `clockBroken=true`) |
| `n_clock_after` | 1 | Consequence narration per choice | 1 continue |
| `n_midpoint` | 1→2 | World reacts; act shift | 1 continue (emits `ACT_2`) |
| `n_book` | 2 | Living Book encountered | **trust** (`bookTrusted=true`, `memory+2`, bloom), **reject** (`memory-2`), **partial read** (`memory+1`) |
| `n_book_after` | 2 | Consequence | 1 continue |
| `n_crossing` | 2→3 | The fading deepens | 1 continue (emits `ACT_3`) |
| `n_crystal_intro` | 3 | Last Crystal encountered | 1 continue |
| `n_crystal` | 3 | Decision point, gated options | **share** (`crystalShared=true`, `light+2`), **keep** (always), **shatter** (requires `resolve <= 0`), **sacrifice self** (requires `memory >= 2`, `light+2`, does NOT set `crystalShared` — the giving-of-self restoration path) |
| `n_end_restore` | end | RESTORATION cinematic | terminal |
| `n_end_transform` | end | TRANSFORMATION cinematic | terminal |
| `n_end_dark` | end | DARKNESS cinematic | terminal |

Plus per-choice echo nodes (`n_clock_echo_wind`, etc.) bringing the total to ~15. Emotion gates: each act has ≥1 choice whose availability or effect text differs by emotion (e.g., Act I "cautious approach" only for Fear; Act III "remember the keeper's name" requires Curiosity or `memory ≥ 1`).

Engine interfaces (pure, deterministic — no `Date.now`, no `Math.random`, no fetch, no DOM):

```ts
advance(state: StoryState, choiceId: string): StoryState   // throws on invalid choice id
availableChoices(state: StoryState): Choice[]               // gate-filtered
getEnding(state: StoryState): 'RESTORATION' | 'TRANSFORMATION' | 'DARKNESS'
```

`getEnding` rules (pure function of vars/flags/node; evaluated in this order — TRANSFORMATION first, so a shared crystal can never be counted toward RESTORATION):

- **TRANSFORMATION**: `crystalShared` (light given freely; the world becomes something new; radiant emerald/cyan bloom atmosphere).
- **RESTORATION**: `light >= 3` and `clockWound` and not `crystalShared` (light returned to the old world; golden dawn atmosphere). Reachability: wind the Clock (`light+1`) then sacrifice self at the Crystal (`light+2`, gated on `memory >= 2` earned by trusting the Book) totals `light = 3`.
- **DARKNESS**: otherwise (light fades; near-black, single dying ember atmosphere).
- Act III reachability requires flags from Acts I–II; the engine rejects choices not valid at the current node, so acts cannot be skipped.

Reaction events: Choice → `ReactionKey` mapping consumed by the 3D layer: `CLOCK_WOUND_LIGHT` (progressive brightening), `BOOK_TRUSTED_BLOOM` (flowers bloom), `CRYSTAL_SHARED_BLOOM` (crystal fracture → radiant bloom), plus `ACT_2`, `ACT_3`, `ENDING_*` atmosphere shifts.

### 3D Game Components

- `World.tsx`: one bounded environment, static hand-placed geometry (no procedural generation, C-3). Scene root wires the player, objects, environment, camera.
- `Environment.tsx`: atmosphere controller driven by a single profile table (see Data Models). All parameters interpolate over **2–4 s** (damped lerp in `useFrame`) via the pure `interpolate(a, b, t)` helper with `t = clamp(elapsed/duration, 0, 1)`; no hard cuts. Reaction events are additive modifiers layered on the base profile (e.g., `CLOCK_WOUND_LIGHT` ramps `sunIntensity` and `ambient` up over ~5 s progressive brightening). One shared `Points` particle cloud whose color/drift/mode comes from `particleMode` (ember / rain / dust / firefly / storm) — capped count, no per-emotion duplication.
- `Player.tsx`: low-poly humanoid assembled from Three.js primitives — box torso, sphere head, cylinder neck/limbs, box hands/feet, simple joint groups. Idle: sine-driven breathing scale + subtle sway. Walk: arm/leg swing phase driven by movement speed. No external assets, no bare capsule.
- Movement: WASD/arrow keys; `Camera.tsx`: pointer-drag orbit + third-person spring-damped follow; `reducedMotion` setting disables sway. Bounds: pure `clampToBounds(pos, bounds)` and circle-vs-circle collision against registered prop colliders (in `utils/`, unit-tested).
- `Objects.tsx`: one generic `<InteractiveObject>` (hover emissive highlight, proximity ring, "Press E" via `InteractionPrompt`). Instances: Clock (ticking vs frozen from `clockWound`/`clockBroken`), Book (glowing open vs closed from `bookTrusted`), Crystal (dim fracture vs radiant from `crystalShared`).

### AI Layer Components

Serverless function `api/dialogue.ts` (Node runtime): reads `LLM_API_KEY` / `LLM_MODEL` from Vercel env vars only. Accepts POST `{ nodeId, emotion, act, speaker, recentContext }` (no secrets, no state mutation), builds a constrained prompt ("return ONLY JSON"), calls the LLM with `fetch` + 8 s server-side `AbortController` timeout, returns the contract body. Returns HTTP 502 with `{ error }` on any failure.

Client flow:

1. `aiClient.request(payload)`: POST `${VITE_API_BASE ?? ''}/api/dialogue`, 5 s client timeout, one retry on network error only (not on validation failure), then fall back.
2. `responseValidator.parse(raw)`: JSON.parse in try/catch → shape check (exact keys, string types) → trim/control-char sanitize → enforce length caps (`dialogue ≤ 600`, `hint ≤ 200`, `mood` from whitelist `hope|sadness|curiosity|fear|neutral|dark|warm`) → return `Ok(value)` | `Err`.
3. `fallbackResponses.get(nodeId, tier)`: returns the node's hand-written dialogue/hint from `storyData`. No user-visible error ever surfaces.
4. Enrichment-only: valid AI text is passed to `StoryPanel`/`GameUI` as display text; the store's story slice is untouched (HR-2).

Hints (FR-8): every node carries a 3-tier ladder in `storyData` (nudge → strong → explicit). `useHintEscalation` watches `lastStoryProgress`; after 60 s without progress it advances the tier and shows a dismissible toast. AI may replace tier text; the fallback ladder is always complete.

### UI Components & Visual Design System

Dark fantasy: deep-black backgrounds (`#050608`), emerald depths, glowing green-cyan accents. Tailwind tokens in `styles/`:

| Token | Value |
|---|---|
| `bg-void` | `#050608` |
| `bg-emerald-deep` | `#0a1f1c` |
| `accent-cyan` | `#67e8f9` |
| `accent-glow` | `#22d3aa` (glow shadow utilities) |
| glassmorphism | `bg-white/5 backdrop-blur-md border border-emerald-deep/40` |

- `Landing`: title, tagline, Continue (when a valid save exists) / New Journey with overwrite confirmation.
- `EmotionSelection`: 4 glass cards; the emotion list comes from state/type data — never hard-coded strings in render.
- `GameUI`: act, emotion, hint button, mute, reduced-motion toggle, progress indicator (act pips + ending-trajectory glyph).
- `StoryPanel`: typewriter dialogue (`useTypewriter`), skip control, choice buttons showing gated availability.
- `InteractionPrompt`: "Press E" prompt, shown when in range.
- `EndingScreen`: per-ending cinematic text + atmosphere, restart clears storage and returns to landing.

### Services

- `persistence.ts` (FR-9): `save(state)` writes `{ schemaVersion, emotion, storyNodeId, vars, flags, settings, savedAt }` on every state change (debounced); `load()` parses in try/catch, validates schema version, key set, and types, returning `null` and clearing the key on any mismatch (corrupt-save fallback, no crash); `clear()` removes the key (restart flow, after explicit confirm). "Continue" restores the full state; the environment derives its profile from restored state.
- `audio.ts` (FR-10): WebAudio-only. Per `audioMood` (from the atmosphere profile): drone/pad built from oscillators + a filtered noise node (Sadness: low minor drone + rain noise; Fear: dissonant detuned drone + rumble; Hope: warm major pad; Curiosity: airy rising tones). Gain cross-fades on mood change; mute toggle persisted in settings. No audio files anywhere in the repo.

### Kiro Workspace Setup

Steering documents (`.kiro/steering/`): `product-vision.md` (MVP premise, endings, scope fences, C-8 honesty rule), `tech-stack.md` (pinned versions), `coding-conventions.md` (TS strict, HR-1/HR-2 rules, lint config), `architecture.md` (folder map, data flow, agent ownership), `visual-design.md` (tokens, glassmorphism, atmosphere table), `ai-integration.md` (contract, validation, fallback, secrets).

Custom agents with non-overlapping file ownership (documented in each agent markdown and in `architecture.md`):

| Agent | Owns (exclusively) |
|---|---|
| **World Architect** | `src/game/`, `src/utils/` (math/lerp/bounds), `src/assets/` |
| **Story Architect** | `src/story/`, `src/ai/` |
| **Integration & QA Engineer** | `src/components/`, `src/hooks/`, `src/services/`, `src/types/`, `src/styles/`, `api/`, tests, CI config |

Minimal hooks: `PostFileSave` matcher on `src/story/**` and `src/ai/**` running `tsc --noEmit` (keeps the HR-1 boundary compile-clean); a test-run hook running `vitest --run` scoped to changed test files (never watch mode).

## Data Models

### Story types (pure, in `src/story/storyState.ts`)

```ts
type Emotion = 'hope' | 'sadness' | 'curiosity' | 'fear'

type StoryVars = { resolve: number; memory: number; light: number }
type StoryFlags = Record<'clockWound'|'clockBroken'|'bookTrusted'|'crystalShared', boolean>

type Gate = (vars: StoryVars, flags: StoryFlags, emotion: Emotion) => boolean

type Choice = {
  id: string
  label: string
  gate?: Gate                    // undefined = always available
  effects?: Partial<StoryVars>
  setFlags?: Partial<StoryFlags>
  next: string
  envReaction?: ReactionKey       // consumed by useEnvironmentReaction
}

type StoryNode = {
  id: string
  act: 1 | 2 | 3
  speaker: 'narrator' | 'clock' | 'book' | 'crystal'
  fallback: { dialogue: string[]; hintLadder: [string, string, string] }
  choices: Choice[]
}

type StoryState = { node: string; vars: StoryVars; flags: StoryFlags; emotion: Emotion }
type ReactionKey = 'CLOCK_WOUND_LIGHT' | 'BOOK_TRUSTED_BLOOM' | 'CRYSTAL_SHARED_BLOOM'
                 | 'ACT_2' | 'ACT_3' | 'ENDING_RESTORE' | 'ENDING_TRANSFORM' | 'ENDING_DARK'
```

### Atmosphere profile (game layer)

```ts
type AtmosphereKey = Emotion | 'midpoint' | 'act3'
                  | 'end_restoration' | 'end_transformation' | 'end_darkness'

type AtmosphereProfile = {
  skyColor: string; fogColor: string; fogDensity: number
  sunColor: string; sunIntensity: number; ambient: number
  particleColor: string; particleMode: 'ember'|'rain'|'dust'|'firefly'|'storm'
  flowerState: 'blooming' | 'fading' | 'glowing' | 'withered' | 'radiant'
  audioMood: 'hope'|'sadness'|'curiosity'|'fear'|'ending'
}
```

Baselines: Hope — golden/warm, blooming flowers, gentle particles; Sadness — blue, rain-mist, fading flowers; Curiosity — emerald-cyan, glowing symbols, floating particles; Fear — dark, heavy shadows, fog, storm. Ending profiles are distinct per ending.

### AI contract

```ts
// /api/dialogue response schema (server and client agree on this shape)
type AiDialogueResponse = { dialogue: string; hint: string; mood: string }
```

### Save schema

```ts
type SaveBlob = {
  schemaVersion: 1
  emotion: Emotion
  storyNodeId: string
  vars: StoryVars
  flags: StoryFlags
  settings: { muted: boolean; reducedMotion: boolean }
  savedAt: number
}
```

## Error Handling

- **AI:** every failure mode (network, timeout, HTTP error, malformed JSON, schema violation) converges on `fallbackResponses`; no error UI, no thrown exception past `aiClient`.
- **Persistence:** corrupt/unknown-version save ⇒ silent discard + fresh start; quota errors ignored (in-memory state is authoritative).
- **Story engine:** invalid choice id (desync) ⇒ throw `InvalidChoiceError` caught by the store, node reset from graph (unreachable in practice).
- **WebAudio:** AudioContext creation failure (unsupported/blocked) ⇒ audio disabled, mute toggle reflects it.

## Dependencies and Deployment

Pinned dependencies: react / react-dom ^18.3.1; three 0.169.0 (exact); @react-three/fiber ^8.17.10; @react-three/drei ^9.114.3; zustand ^5.0.0; vite ^5.4.8; @vitejs/plugin-react ^4.3.2; typescript ~5.6.2 (strict); tailwindcss ^3.4.13; vitest ^2.1.2; @testing-library/react ^16.0.1; eslint + `eslint-plugin-import` ^9.x for HR-1 enforcement. No AI SDK — plain `fetch` on both sides. Node ≥ 20.

Deployment (Vercel): static frontend from the Vite build + one function at `api/dialogue.ts` (Node runtime, no extra infra, C-2). Server env vars: `LLM_API_KEY`, `LLM_MODEL`. Client env var: `VITE_API_BASE` (empty ⇒ same-origin `/api`). Secrets never enter the client; the only key holder is the function and the frontend sends no key.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| R3F/three version churn | Exact pin for three; peer deps verified at setup |
| Third-person camera feel | Constants tuning table in `Camera.tsx`; reducedMotion toggle |
| AI latency/invalid output | 5 s timeout, 1 retry, strict validator, guaranteed fallback |
| Perf (particles, per-frame lerp) | One Points cloud, capped count, dpr [1,2], shadows off, 45 FPS target |
| Corrupt saves on schema change | schemaVersion check + discard-and-fresh-start |
| Solo scope creep (C-1) | Graph fixed ~15 nodes; 3 endings; no new acts/objects |

## Testing Strategy

Mapped to the 13-item master checklist (FR-13):

| # | Checklist item | How verified | Type |
|---|---|---|---|
| 1 | Boot check | `vite build` + load, zero console errors | SMOKE |
| 2 | 4 emotion atmospheres | Unit: profile table completeness/distinctness (Property 1) + visual checklist | PROPERTY + manual |
| 3 | Movement/camera/prompts | Manual scripted walk; unit: bounds + prompt range (Property 9) | INTEGRATION + PROPERTY |
| 4 | Choices update vars/flags; gating | Story engine unit tests (Properties 3, 4) | PROPERTY |
| 5 | All 3 endings reachable | Traces for RESTORATION/TRANSFORMATION/DARKNESS (Property 5) | PROPERTY |
| 6 | Env transformations (clock/book/crystal) | Reaction-event unit tests (Property 6) + visual checklist | PROPERTY + manual |
| 7 | AI validation | Validator unit tests: valid JSON accepted, malformed rejected (Property 7) | PROPERTY |
| 8 | Offline playthrough | Manual run with endpoint disabled/unset | INTEGRATION |
| 9 | Bundle audit | `vite build` + grep for key patterns in bundle | INTEGRATION |
| 10 | Console check | Zero errors during a full playthrough | INTEGRATION |
| 11 | FPS ≥ 45 | rAF counter during exploration | INTEGRATION |
| 12 | Continue/resume | Property 8 round-trip + manual continue flow (save mid-act → reload → exact restore; restart clears) | PROPERTY + manual |
| 13 | Honest reporting (C-8) | Process rule — no test | none |

Dual approach: property tests (≥ 100 generated iterations for the validator, interpolation, and bounds generators) plus example-based unit tests for concrete scenarios (corrupt save blob, empty dialogue, restart flow) and manual integration checks for 3D feel, FPS, and the offline run. Unverified features are never claimed to work.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — a formal statement about what the system should do, bridging human-readable specs and machine-verifiable guarantees.*

### Property 1: Atmosphere mapping is complete and distinct

*For any* selectable emotion (hope, sadness, curiosity, fear) *and for any* ending (RESTORATION, TRANSFORMATION, DARKNESS), the atmosphere profile table contains a fully-defined profile for that key, and the four emotion baseline profiles are pairwise distinct in at least (skyColor, particleMode, audioMood).

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 3.3, 3.7, 13.2**

### Property 2: Atmosphere transitions always interpolate

*For any* pair of atmosphere profiles A and B and any elapsed time t during a transition, the effective profile equals `interpolate(A, B, clamp(t/duration, 0, 1))` with duration between 2 and 4 seconds; no parameter ever jumps discontinuously between transition start and end.

**Validates: Requirements 3.2**

### Property 3: Story engine is deterministic

*For any* story state S and choice id c valid at S's node, `advance(S, c)` always returns the same resulting state, and the resulting state is a pure function of (S, c) — no dependence on time, randomness, network, or AI output.

**Validates: Requirements 6.3, 6.5, 7.6**

### Property 4: Effects and gating are exact

*For any* story state S and choice c, applying c updates exactly the variables and flags declared by c (and nothing else), and `availableChoices(S)` returns exactly those choices whose gate evaluates to true on S; a choice whose gate is false is never accepted by `advance`.

**Validates: Requirements 6.2, 6.4, 13.4**

### Property 5: All endings are reachable and exclusive

*For any* valid playthrough, `getEnding` returns exactly one of RESTORATION, TRANSFORMATION, or DARKNESS; *and there exist* at least one choice trace reaching each of the three endings; *and no* trace yields more than one ending.

**Validates: Requirements 6.5, 13.5**

### Property 6: Decision reaction events fire

*For any* choice carrying a reaction key, making that choice (a) sets its declared flag and (b) emits the corresponding environment reaction — winding the clock increases world brightness parameters, trusting the book activates the bloom modifier, sharing the crystal switches the crystal visual state to radiant; *for any* choice, no reaction fires unless the choice is actually made.

**Validates: Requirements 3.4, 3.5, 3.6, 5.2, 5.3, 5.4, 13.6**

### Property 7: AI output is validated, fallback-guaranteed, and enrichment-only

*For any* raw response body from `/api/dialogue`: it is accepted only if it parses as JSON with exactly the keys `{dialogue, hint, mood}`, string-typed, within length caps, and mood from the whitelist — otherwise it is rejected. *For any* failure mode (network error, timeout, HTTP error status, malformed body), the displayed content is the fallback text for the current node. *For any* AI output (valid or invalid), the story state after the interaction is identical to what it would have been with AI disabled.

**Validates: Requirements 7.3, 7.4, 7.5, 7.6, 8.1, 13.7, 13.8**

### Property 8: Save/load round-trip and corruption safety

*For any* reachable story state S, `load(save(S))` restores a state equal in (emotion, node, vars, flags, settings). *For any* persisted blob that does not match the current schema version and shape, `load` returns null and the game starts fresh without throwing.

**Validates: Requirements 9.1, 9.2, 9.4**

### Property 9: Player is bounded and prompts are range-accurate

*For any* attempted player position p, the applied position lies within the environment bounds and outside all prop colliders. *For any* frame, the "Press E" prompt for an object is visible if and only if the distance between the player and that object is below its interaction radius.

**Validates: Requirements 4.4, 4.5**

### Property 10: Hint ladders are complete

*For any* story node, the node defines exactly three hint tiers (nudge, strong, explicit) available without AI; the escalation timer advances one tier per 60 seconds without story progress and resets on progress.

**Validates: Requirements 8.1, 8.2**
