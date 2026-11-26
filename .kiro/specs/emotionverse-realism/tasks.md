# Implementation Plan: EMOTIONVERSE Realism Layer

## Overview

Dependency-ordered, incremental plan sized for a ~5–7 credit envelope. Tier 1 is the ESSENTIAL core (Tasks 1–6, 6.0 credits); Tier 2 (Tasks 7–9) contains OPTIONAL, individually droppable increments. The final task is a QA/acceptance pass. Language: TypeScript (existing stack: React 18 + Vite, three 0.169, R3F 8.17, Vitest).

**Non-negotiables for every task**: additive-first edits to existing files; never touch `src/story/**`, `src/ai/**`, `api/**`, or the persistence schema in `src/services/persistence.ts` (the only permitted persistence change is appending an optional `quality` key that old saves default). The `emotionverse-mvp` spec directory is off-limits. Exactly one new dependency: `@react-three/postprocessing@^2.16.x`.

## Credits

| Tier | Task | Credits |
|---|---|---|
| ESSENTIAL | 1 Postprocessing + quality toggle | 0.75 |
| ESSENTIAL | 2 Locomotion state machine + footsteps | 1.25 |
| ESSENTIAL | 3 Environment life (wind, sway, fog, scatter) | 1.0 |
| ESSENTIAL | 4 Object interactions + spatial audio cues | 1.25 |
| ESSENTIAL | 5 Layered ambience + cinematic camera | 1.25 |
| ESSENTIAL | 6 QA/acceptance pass | 0.5 |
| OPTIONAL | 7 Shadows + adaptive FPS monitor | 0.75 |
| OPTIONAL | 8 Water, mist, fireflies, weather bias | 0.5 |
| OPTIONAL | 9 Idle look, reaction poses, ending orbit, panel transitions, ambience zones, footstep materials | 0.75 |

Essential core total: 6.0 credits. Full plan: 8.0 with all optionals; drop any optional task independently without breaking essentials.

## Tasks

- [ ] 1. ESSENTIAL — Install and configure postprocessing with quality toggle
  - **Goal:** Add `@react-three/postprocessing@^2.16.x` (the only new dependency), create `src/components/Postprocessing.tsx` (Bloom intensity 0.6, luminanceThreshold 0.9, mipmapBlur; Vignette offset 0.25 / darkness 0.55), add `quality: 'low'|'medium'|'high'` + `setQuality` to `src/hooks/useGameStore.ts` (additive; optional persisted key, old saves default `'medium'`), mount `<Postprocessing>` inside the R3F Canvas in the exploration screen, and add an "FX" quality toggle button in `src/components/GameUI.tsx` that disables post without a page reload.
  - **Files:** `package.json`, `package-lock.json` (via npm), `src/components/Postprocessing.tsx` (new), `src/hooks/useGameStore.ts`, `src/components/GameUI.tsx`, exploration screen canvas mount (`src/components/ExplorationScreen.tsx` or the file hosting the Canvas).
  - **Depends on:** —
  - **Verification:** `npm ci && npm run build` succeeds with bundle size within ~15% of baseline (no regression); `npx vitest --run` passes (store and UI suites); manual: toggling quality disables Bloom/Vignette instantly, and reduced-motion/mute settings still persist per NFR 2.3.
  - **Covers:** NFR 1.1, NFR 1.3, NFR 4.1.
  - **Credits:** 0.75

- [ ] 2. ESSENTIAL — Player locomotion state machine, animation blend, and synthesized footsteps
  - **Goal:** Implement pure modules `src/game/player/locomotion.ts` (`stepLocomotion` reducer: idle/walk/run modes, run ≥1.6× walk, exponential accel smoothing τ 0.08–0.25 s, shortest-path turning incl. ±180° wrap, walk-phase rate proportional to speed) and `src/game/player/footsteps.ts` (`detectSteps` on π-boundary crossings, `footstepEnvelope`). Rewire `src/game/Player.tsx` `useFrame` to call the reducer (keeping `resolveCollisions`/`clampToBounds`), apply the continuous amplitude blend (idle 0.25 → walk 0.55 → run 0.8), and emit footstep events to a new additive `playFootstep` method on `audioService` (filtered noise burst; shorter/louder when running; suppressed when mute; silent when stationary).
  - **Files:** `src/game/player/locomotion.ts`, `src/game/player/footsteps.ts` (new), `src/game/Player.tsx`, `src/services/audio.ts` (additive), `src/game/player/__tests__/locomotion.test.ts`, `src/game/player/__tests__/footsteps.test.ts` (new).
  - **Depends on:** 1
  - **Verification:** `npx vitest --run src/game/player` — reducer tests: run/walk/idle blend continuity, speed <5% walk within 0.4 s of release, shortest-path turn including wrap, phase-rate proportionality; footstep tests: events exactly on crossings, none when stationary, run envelope shorter/louder. Manual: Shift runs visibly faster with faster stride; stopping decays smoothly (FR 1.1, 1.2, 1.6, 1.3).
  - **Covers:** FR 1.1, FR 1.2, FR 1.3, FR 1.6; NFR 2.2 (mute).
  - **Credits:** 1.25

- [ ] 3. ESSENTIAL — Environment life: shared wind provider, tree sway, fog modulation, instanced scatter
  - **Goal:** Create `src/game/env/wind.ts` (pure `windAt`, bounded [-1, 1]), a `Wind.tsx` provider with a single `useFrame` driving a sway registry (tree rotation.z ≤3°, reduced-motion amplitude ≤30%), `src/game/env/fogModulation.ts` (density oscillates ±15% around profile value, color untouched), and `src/game/env/scatter.ts` + Scatter component: 3 `InstancedMesh` sets (grass tufts ~180, rocks ~80, moss ~40; ≤300 total), deterministically seeded, placed outside collider exclusion zones via `src/utils/colliders.ts`. Wire into `World.tsx`/`Environment.tsx` additively.
  - **Files:** `src/game/env/wind.ts`, `src/game/env/Wind.tsx`, `src/game/env/scatter.ts`, `src/game/env/fogModulation.ts`, `src/game/env/__tests__/wind.test.ts`, `src/game/env/__tests__/scatter.test.ts` (new), `src/game/World.tsx`, `src/game/Environment.tsx`.
  - **Depends on:** 2
  - **Verification:** `npx vitest --run src/game/env` — wind bounded/deterministic, fog variation within ±15%, scatter outside colliders and within caps; manual: trees visibly sway (reduced-motion nearly still), grass/rocks scatter without overlapping artifacts or the player spawn, fog breathes slowly (FR 2.1, 2.3, 2.7).
  - **Covers:** FR 2.1, FR 2.3, FR 2.7.
  - **Credits:** 1.0

- [ ] 4. ESSENTIAL — Object interaction realism and spatial audio
  - **Goal:** Implement `src/game/objects/anim.ts` (clock hand tremor <1°, book cover `easeInOutCubic` open ≤90° over ≤1.2 s + page flutter ≤3 s skipped under reduced-motion, crystal sinusoidal emissive pulse + ≤12 orbiters + one-shot 60-particle burst via `triggerBurst`/`stepBurst` guarded by `firedFor`) and `src/game/objects/positions.ts` (`ARTIFACT_POSITIONS`). Apply in `Objects.tsx`'s existing `useFrame`: clock tremor pre-choice + 1 Hz tick + dial emissive glow ease (≤0.3 s) on interaction, book cover split at the spine, crystal burst on final decision (re-armed on reset). Extend `audio.ts` additively: `startClockTick`/`stopClockTick`, `playCue(artifact)` (chime strike / page whoosh / resonant ping, each <1.5 s), `attachHum`/`detachHum` per artifact (PannerNode, inaudible beyond 15 u, released ≤0.5 s after resolution; idempotent). Player faces the artifact on interaction using the Task-2 turn smoothing (within 1 s).
  - **Files:** `src/game/objects/anim.ts`, `src/game/objects/positions.ts`, `src/game/objects/__tests__/anim.test.ts` (new), `src/game/Objects.tsx`, `src/game/Player.tsx` (facing hook), `src/services/audio.ts` (additive).
  - **Depends on:** 3
  - **Verification:** `npx vitest --run src/game/objects` — tremor sub-degree, cover easing monotone/bounded, flutter stops ≤3 s, burst exactly once per decision and re-arms; manual: each artifact shows its animation + distinct cue + positional hum that fades with distance and stops after resolution (FR 3.1, 3.2, 3.3, 5.5, 6.1, 6.2).
  - **Covers:** FR 3.1, FR 3.2, FR 3.3, FR 5.5, FR 6.1, FR 6.2.
  - **Credits:** 1.25

- [ ] 5. ESSENTIAL — Layered emotion ambience, crossfades, and eased camera cinematics
  - **Goal:** Create `src/services/audio/layers.ts` (wind/rain/chimes/thunder WebAudio recipes, nodes created once, gains ramped only), `crossfade.ts` (pure `crossfadeGains` equal-power, 3 dB ceiling, ≤2 s), `hums.ts` helpers; add optional `ambienceLayers` (and `fireflies`/`isNight` fields for Task 8) with defaults to all 9 `atmosphereProfiles.ts` entries (4 emotion, 2 act-transition, 3 ending); add `setAmbienceLayers` to `audioService` invoked from `Environment.tsx` on emotion change. Implement `src/game/cinematic/easing.ts` (`easeInOutCubic`, `stepCamMove`, `pushInTarget`) and `presets.ts` (interaction push-in 25% distance / 1.5 s; decision hold ≤2% frame-width drift/s; follow resumes ≤0.5 s; reduced-motion push ≤10% or skip), and add the `'follow' | 'push' | 'hold'` mode state to `Camera.tsx` without touching the existing follow math.
  - **Files:** `src/services/audio/layers.ts`, `src/services/audio/crossfade.ts`, `src/services/audio/hums.ts`, `src/services/audio/__tests__/crossfade.test.ts` (new, mocked WebAudio), `src/game/cinematic/easing.ts`, `src/game/cinematic/presets.ts`, `src/game/cinematic/__tests__/easing.test.ts` (new), `src/services/audio.ts` (additive), `src/game/atmosphereProfiles.ts`, `src/game/Environment.tsx`, `src/game/Camera.tsx`.
  - **Depends on:** 4
  - **Verification:** `npx vitest --run src/services/audio src/game/cinematic` — equal-power curves, 3 dB ceiling during overlap, layer start/stop on emotion change; push-in reduction ∈ [15%, 40%] (≤10% reduced-motion), hold drift bounds, follow resumption ≤0.5 s. Manual: emotion change crossfades ambience without volume jump; approaching an artifact eases the camera in and holds during the choice, then returns (FR 4.1, 4.2, 5.1, 5.2).
  - **Covers:** FR 4.1, FR 4.2, FR 5.1, FR 5.2.
  - **Credits:** 1.25

- [ ] 6. ESSENTIAL — QA/acceptance pass and commit
  - **Goal:** Run the full existing test suite plus all new suites with no skipped tests, write `docs/realism-checklist.md` (per-emotion and per-ending 13-style realism manual checklist: footstep/ambience/hum per mood, artifact behaviors, camera push/hold, reduced-motion per FR, mute per FR), verify 60 FPS at medium quality in the most particle-dense mood (fear) and the low tier's behavior, and create a single commit of the essential core.
  - **Files:** `docs/realism-checklist.md` (new), commit covering all changes.
  - **Depends on:** 5 (and any optional tasks 7–9 taken before this point)
  - **Verification:** `npx vitest --run` — zero failures/skips across `src/story`, `src/ai`, `src/services`, `src/hooks`, `src/components`, `src/utils`, and all new `__tests__`; `npm run build` clean; manual checklist per NFR 1.1, NFR 3; `git log -1` shows the commit.
  - **Covers:** NFR 1, NFR 2, NFR 3, Testing Requirements 4–5.
  - **Credits:** 0.5

- [ ] 7. OPTIONAL — Shadows with adaptive FPS monitor
  - **Goal:** Implement `src/game/perf/fpsMonitor.ts` (pure `stepQuality`, `QUALITY_TIERS`, degradation order shadows → mist/leaves → fireflies → post after <50 FPS for 3 s; recovery after >58 FPS for 10 s; session memory) + `PerfMonitor.tsx` R3F component reading a small external store. Enable one 1024² directional shadow map with ≤12 casters (player, 3 artifacts, nearest scenery) at high quality; auto-disable restores the MVP unshadowed fallback with the existing player base disc.
  - **Files:** `src/game/perf/fpsMonitor.ts`, `src/game/perf/PerfMonitor.tsx`, `src/game/perf/__tests__/fpsMonitor.test.ts` (new), `src/game/Environment.tsx`, `src/game/World.tsx`, `src/game/Player.tsx`, quality-store wiring in `src/hooks/useGameStore.ts`.
  - **Depends on:** 6 (or 5 if executed before the QA pass)
  - **Verification:** `npx vitest --run src/game/perf` — degradation order, recovery, session memory; manual: forcing low FPS (e.g., 4× devtools throttle) disables shadows after ~3 s with no visual artifacts (FR 2.8, NFR 1.2).
  - **Covers:** FR 2.8, NFR 1.2.
  - **Credits:** 0.75

- [ ] 8. OPTIONAL — Water plane, falling leaves, ground mist, fireflies, weather particle bias
  - **Goal:** Implement `Leaves.tsx` (FR 2.2: ≤60 falling leaf points with sinusoidal drift, respawning above the canopy, held static under reduced-motion), `Water.tsx` (≤2 summed sine waves displacing a 24×24-segment plane; skipped when the layout declares no water), `Mist.tsx` (≤30 transparent billboards, static under reduced-motion), `Fireflies.tsx` (≤40 emissive points for night moods, faded out within the atmosphere transition), driven by the `isNight`/`fireflies` profile fields added in Task 5; add rain fall-speed/downward bias within the existing 380-point budget and the thunder light-boost callback hookup.
  - **Files:** `src/game/env/Leaves.tsx`, `src/game/env/Water.tsx`, `src/game/env/Mist.tsx`, `src/game/env/Fireflies.tsx` (new), `src/game/World.tsx`, `src/game/Environment.tsx`, `src/game/atmosphereProfiles.ts`.
  - **Depends on:** 6 (or 5)
  - **Verification:** `npx vitest --run src/game/env`; manual: leaves drift and respawn above the canopy (nearly still under reduced-motion), pond ripples, mist near the ground, fireflies in night-equivalent moods fading on mood change, rain mood shows faster downward particles, thunder syncs a light flash (FR 2.2, 2.4, 2.5, 2.6, 4.3).
  - **Covers:** FR 2.2, FR 2.4, FR 2.5, FR 2.6, FR 4.3.
  - **Credits:** 0.5

- [ ] 9. OPTIONAL — Idle head look, reaction poses, ending orbit, panel transitions, ambience zones, footstep materials
  - **Goal:** Add idle head-look (sinusoidal ≤15° after 2 s idle, blends back ≤0.3 s) and reaction poses (`reactionPose.ts` pure envelope; recoil ≤0.5 s, ≤30% amplitude under reduced-motion) in `Player.tsx`; ending slow orbit (≤0.1 rad/s, static framing under reduced-motion) in `Camera.tsx`; fade/slide StoryPanel transitions ≤0.4 s composed with the typewriter; ≤3 ambience zones + `zoneAt` in `src/game/env/zones.ts` with 1.5 s zone-layer crossfades; stone/grass footstep material variation applied from the next foot-fall.
  - **Files:** `src/game/player/reactionPose.ts` (new), `src/game/Player.tsx`, `src/game/Camera.tsx`, `src/components/StoryPanel.tsx`, `src/game/env/zones.ts` (new), `src/game/World.tsx`, `src/services/audio.ts` (additive), `src/game/objects/positions.ts`.
  - **Depends on:** 6 (or 5)
  - **Verification:** `npx vitest --run src/game/player src/game/env`; manual: idle glance-around, recoil on artifact interaction, ending orbit, dialogue slides in, zone ambience shifts on entering grove/dais, footsteps change timbre on stone vs grass (FR 1.4, 1.5, 5.3, 5.4, 6.3, 6.4).
  - **Covers:** FR 1.4, FR 1.5, FR 5.3, FR 5.4, FR 6.3, FR 6.4.
  - **Credits:** 0.75

## Notes

- Optional tasks 7–9 are individually droppable; dropping any leaves every ESSENTIAL requirement intact (NFR 5.2). If the envelope tightens below 6 credits, run Task 6 directly after Task 5.
- Tasks touching existing files are additive-first: new pure modules carry the logic; existing components only wire outputs in `useFrame`/effects. Never touch `src/story/**`, `src/ai/**`, `api/`, or the persistence schema (beyond the optional `quality` key defaulting for old saves).
- Pure modules (locomotion, footsteps, wind, scatter, fog, anim, easing, crossfade, fpsMonitor, reactionPose) are unit/PBT-tested without WebGL/WebAudio; audio tests use a mocked WebAudio context.
- Property-based tests map to the design's Correctness Properties 1–16 where applicable (locomotion → P1–P3, footsteps → P4, sway/fog/scatter → P6–P8, objects → P10–P11, crossfade → P12, camera → P13).
- Checkpoint behavior is folded into Task 6 (full suite run) and into each task's verification step; if any test fails, fix before proceeding.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6"] },
    { "id": 6, "tasks": ["7", "8", "9"] }
  ]
}
```

Rationale: each essential task builds on the previous one's wiring (quality store → player frame loop → env provider → objects/camera wiring → ambience). The three optional tasks are mutually independent and all depend only on the core being complete; if they execute before the QA pass, run Task 6 after them (waves 6 and 7 then swap).
