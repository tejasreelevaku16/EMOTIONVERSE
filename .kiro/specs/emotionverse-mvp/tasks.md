# Implementation Plan: EMOTIONVERSE — "THE LAST LIGHT" (MVP)

## Overview

Phased, dependency-ordered implementation of the requirements.md and design.md for the "THE LAST LIGHT" MVP: a Vite + React + TS strict app with a pure TypeScript story engine (~15 nodes, 3 acts, 3 endings), a Vercel serverless AI dialogue layer with guaranteed fallback, Zustand + LocalStorage full resume, a Tailwind UI, and a React Three Fiber 3D layer (one shared transforming environment, primitive humanoid player, three interactive artifacts). This document is a plan only; no implementation is performed in this workflow.

Phased, dependency-ordered tasks generated from requirements.md and design.md. Every task states goal, files, dependencies, and a verification command or manual check. No implementation is performed in this workflow. Optional test sub-tasks are marked `*` (may be skipped for MVP speed, but Properties 3–8 are the QA backbone, so skipping is discouraged).

**Kiro credit budget (solo hackathon, total ≤ 50, C-1):** Phase 0: 4 · Story core: 9 · AI: 6 · State/persistence: 5 · UI: 7 · 3D: 10 · Integration: 5 · QA: 4 → **total 50**. Rough allocation: 1 credit ≈ one focused agent session on a phase sub-task.

---

## Tasks

## Phase 0 — Bootstrap & Kiro Workspace

- [ ] 1. Project scaffold, toolchain, and Kiro workspace setup
  - [ ] 1.1 Vite + React + TS strict bootstrap
    - Goal: runnable app skeleton with pinned dependencies and design.md folder tree.
    - Files: `package.json`, `tsconfig.json` (strict, no `any` in story/state layers — NFR-1), `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, empty dirs `src/{components,game,story,ai,hooks,services,utils,types,assets,styles}`, `api/`.
    - Deps: none.
    - Pinned deps per design: react ^18.3.1, three 0.169.0 (exact), @react-three/fiber ^8.17.10, @react-three/drei ^9.114.3, zustand ^5.0.0, vite ^5.4.8, @vitejs/plugin-react ^4.3.2, typescript ~5.6.2, tailwindcss ^3.4.13, vitest ^2.1.2, @testing-library/react ^16.0.1, eslint 9.x + eslint-plugin-import.
    - Verification: `npm run build` and `npx tsc --noEmit` clean; `vite build` output loads with zero console errors (FR-13.1).
    - _Requirements: FR-13.1, NFR-1_

  - [ ] 1.2 Tailwind design tokens + Vitest setup
    - Goal: visual token system and test runner in place before any UI.
    - Files: `src/styles/` (tailwind entry, tokens: `bg-void #050608`, `bg-emerald-deep #0a1f1c`, `accent-cyan #67e8f9`, `accent-glow #22d3aa`, glassmorphism utilities), `vitest.config.ts`, sample test.
    - Deps: 1.1.
    - Verification: `npx vitest --run` passes; tokens compiled.
    - _Requirements: FR-11, NFR-3_

  - [ ] 1.3 ESLint layer-separation guard
    - Goal: enforce HR-1/NFR-2 mechanically.
    - Files: `eslint.config.js` with `import/no-restricted-imports` per-directory rules forbidding `react`, `three`, `@react-three/*` inside `src/story/**` and `src/**/ai/**` (i.e. `src/ai/**`).
    - Deps: 1.1.
    - Verification: a deliberate bad import (`import React from 'react'` in `src/story/`) fails `npx eslint src`; removing it passes.
    - _Requirements: NFR-2, C-7_

  - [ ] 1.4 Vercel deployment config
    - Goal: static frontend + single serverless function, no extra infra (C-2).
    - Files: `vercel.json` (frontend from Vite build, Node-runtime function `api/dialogue.ts`), `.env.example` (`VITE_API_BASE` only; server `LLM_API_KEY`/`LLM_MODEL` documented as Vercel env vars, never committed).
    - Deps: 1.1.
    - Verification: `vercel build` (or `vite build` + function present in `api/`) succeeds.
    - _Requirements: FR-7.1, FR-7.2, C-2_

  - [ ] 1.5 Kiro steering documents
    - Goal: workspace guidance per design's Kiro Workspace Setup.
    - Files: `.kiro/steering/product-vision.md` (premise, endings, scope fences, C-8 honesty rule), `tech-stack.md` (pinned versions), `coding-conventions.md` (TS strict, HR-1/HR-2, lint), `architecture.md` (folder map, data flow, agent ownership table), `visual-design.md` (tokens, atmosphere table), `ai-integration.md` (contract, validation, fallback, secrets).
    - Deps: none (parallel with 1.1).
    - Verification: all six files exist; agent ownership table in `architecture.md` matches design.md.
    - _Requirements: FR-12.1_

  - [ ] 1.6 Kiro custom agents + hooks
    - Goal: three agents with non-overlapping file ownership + minimal automation.
    - Files: `.kiro/agents/world-architect.md` (owns `src/game/`, `src/utils/`, `src/assets/`), `story-architect.md` (owns `src/story/`, `src/ai/`), `integration-qa.md` (owns `src/components/`, `src/hooks/`, `src/services/`, `src/types/`, `src/styles/`, `api/`, tests, CI config); `.kiro/hooks/` with `PostFileSave` matcher on `src/story/**` and `src/ai/**` running `npx tsc --noEmit`, and a test hook running `npx vitest --run` scoped to changed test files (never watch mode).
    - Deps: 1.5.
    - Verification: hook fires on a touched `src/story/**` file and exits 0; agent markdowns document ownership with zero file overlap.
    - _Requirements: FR-12.2, FR-12.3_

## Phase 1 — Story Core (pure TypeScript, no rendering)

- [ ] 2. Story types, graph, engine, and atmosphere data
  - [ ] 2.1 Story state types
    - Goal: pure type layer for the deterministic engine.
    - Files: `src/story/storyState.ts` — `Emotion`, `StoryVars`, `StoryFlags`, `Gate`, `Choice` (id, label, gate, effects, setFlags, next, envReaction), `StoryNode`, `StoryState`, `ReactionKey`, `AtmosphereKey`.
    - Deps: 1.1.
    - Verification: `npx tsc --noEmit` clean; no react/three imports (lint guard).
    - _Requirements: FR-6.1, FR-6.2_

  - [ ] 2.2 THE LAST LIGHT node graph (~15 nodes, 3 acts, one artifact per act)
    - Goal: full graph with fallback dialogue and 3-tier hint ladders.
    - Files: `src/story/storyData.ts` — `n_intro`, `n_clock`, `n_clock_after` (+echo nodes), `n_midpoint` (emits `ACT_2`), `n_book`, `n_book_after`, `n_crossing` (emits `ACT_3`), `n_crystal_intro`, `n_crystal` (gated: `shatter` requires `resolve <= 0`, `sacrifice` requires `memory >= 2` and grants `light+2` without setting `crystalShared` (RESTORATION path); emotion-gated choices: ≥1 per act, e.g. cautious approach for Fear, keeper's-name memory for Curiosity), `n_end_restore`, `n_end_transform`, `n_end_dark`, plus echo nodes to ~15 total.
    - Deps: 2.1.
    - Verification: unit test — every `next` id resolves to a node; no orphan nodes; every node has a complete 3-tier hint ladder.
    - _Requirements: FR-2.7, FR-6.1, FR-8.1_

  - [ ] 2.3 Story engine reducer + ending computation
    - Goal: deterministic `advance` / `availableChoices` / `getEnding`.
    - Files: `src/story/storyEngine.ts` (pure: no `Date.now`, `Math.random`, fetch, DOM; throws `InvalidChoiceError` on invalid id), `src/story/endings.ts` (TRANSFORMATION takes precedence: checked first on `crystalShared`; then RESTORATION: `light>=3 && clockWound && !crystalShared`; else DARKNESS; ending atmosphere keys).
    - Deps: 2.2.
    - Verification: unit test — same (state, choice) always yields identical result; invalid/gated choice rejected.
    - _Requirements: FR-6.2, FR-6.3, FR-6.4, FR-6.5, FR-6.6_

  - [ ] 2.4 Atmosphere profile table + reaction events
    - Goal: single source of atmosphere truth consumed by the 3D layer.
    - Files: `src/game/atmosphereProfiles.ts` (pure data: 4 emotion baselines + `midpoint`, `act3` + 3 ending profiles, each a full `AtmosphereProfile`), `src/game/reactions.ts` (additive reaction modifiers `CLOCK_WOUND_LIGHT`, `BOOK_TRUSTED_BLOOM`, `CRYSTAL_SHARED_BLOOM` layered on base profile), `src/utils/math.ts` (`lerp`, `clamp`, `interpolate`).
    - Deps: 2.1.
    - Verification: unit test — table completeness for all `AtmosphereKey`s; 4 emotion baselines pairwise distinct in skyColor/particleMode/audioMood.
    - _Requirements: FR-2.2–2.5, FR-3.3, FR-3.7_

  - [ ]* 2.5 Property tests — engine determinism, effects/gating exactness
    - **Property 3: Story engine is deterministic** — **Validates: FR-6.3, FR-6.5, FR-7.6**
    - **Property 4: Effects and gating are exact** — **Validates: FR-6.2, FR-6.4, FR-13.4**
    - **Property 10: Hint ladders are complete** — **Validates: FR-8.1, FR-8.2**
    - Files: `src/story/__tests__/engine.property.test.ts` (generator: random valid choice traces).
    - Deps: 2.3, 2.2.
    - Verification: `npx vitest --run src/story` passes ≥100 generated iterations.

  - [ ]* 2.6 Property tests — all 3 endings reachable and exclusive
    - **Property 5: All endings are reachable and exclusive** — **Validates: FR-6.5, FR-13.5**
    - Files: `src/story/__tests__/endings.test.ts` — explicit choice traces reaching each ending: RESTORATION (wind clock → trust book → sacrifice self: `light+1`+`memory+2` gate→`light+2`, `light=3`, `clockWound`, no `crystalShared`), TRANSFORMATION (share crystal), DARKNESS (e.g. break/leave/reject + keep); all traces yield exactly one ending.
    - Deps: 2.3.
    - Verification: `npx vitest --run src/story` green; each ending trace asserted.

## Phase 2 — AI Layer

- [ ] 3. Serverless AI dialogue + validated client + fallback
  - [ ] 3.1 `/api/dialogue` serverless function
    - Goal: minimal LLM proxy, key in env only.
    - Files: `api/dialogue.ts` (Node runtime; reads `LLM_API_KEY`/`LLM_MODEL` from Vercel env; accepts POST `{nodeId, emotion, act, speaker, recentContext}`; constrained "return ONLY JSON" prompt; `fetch` with 8 s `AbortController`; HTTP 502 `{error}` on failure).
    - Deps: 1.4.
    - Verification: local `vercel dev` curl POST returns schema-shaped JSON or 502; `LLM_API_KEY` absent from any client-visible output (FR-13.9 precondition).
    - _Requirements: FR-7.1, FR-7.2_

  - [ ] 3.2 aiClient (timeout + retry)
    - Goal: enrichment-only client that never blocks gameplay.
    - Files: `src/ai/aiClient.ts` — `request(payload)`: POST `${VITE_API_BASE ?? ''}/api/dialogue`, 5 s timeout, one retry on network error only, converges on fallback, throws nothing past the module (HR-2: output never touches story state).
    - Deps: 1.3.
    - Verification: unit test with mocked `fetch` (reject / 10 s hang / HTTP 500 / 200) — always resolves ≤ ~6 s, never throws.
    - _Requirements: FR-7.4, FR-7.5, FR-7.6_

  - [ ] 3.3 responseValidator
    - Goal: strict schema/sanitize gate.
    - Files: `src/ai/responseValidator.ts` — JSON.parse try/catch → exact keys `{dialogue, hint, mood}` → string types → trim/control-char sanitize → caps (`dialogue ≤ 600`, `hint ≤ 200`, mood ∈ whitelist) → `Ok | Err`.
    - Deps: 2.1.
    - Verification: unit test — valid JSON accepted; malformed, extra-key, over-length, bad-mood rejected.
    - _Requirements: FR-7.3_

  - [ ] 3.4 fallbackResponses
    - Goal: guaranteed offline content from the graph.
    - Files: `src/ai/fallbackResponses.ts` — `get(nodeId, tier)` delegating to `storyData` fallback dialogue/hint ladders.
    - Deps: 2.2.
    - Verification: unit test — every node id returns non-empty dialogue and all 3 hint tiers.
    - _Requirements: FR-7.4, FR-7.5, FR-8.1_

  - [ ]* 3.5 Property tests — AI validation, fallback-guarantee, enrichment-only
    - **Property 7: AI output is validated, fallback-guaranteed, and enrichment-only** — **Validates: FR-7.3–7.6, FR-8.1, FR-13.7, FR-13.8**
    - Files: `src/ai/__tests__/ai.property.test.ts` (generator ≥100 raw bodies incl. malformed; mocked failure modes; story-state equality with AI on/off).
    - Deps: 3.2, 3.3, 3.4.
    - Verification: `npx vitest --run src/ai` green.

## Phase 3 — State & Persistence

- [ ] 4. Zustand store + LocalStorage full-resume
  - [ ] 4.1 Game store (slices + engine wiring)
    - Goal: single one-directional state source.
    - Files: `src/hooks/useGameStore.ts` (slices: `emotion`, `story`, `environment`, `ui`, `settings`, `aiHealth`; actions call `storyEngine.advance`; `InvalidChoiceError` caught, node reset).
    - Deps: 2.3, 3.2.
    - Verification: unit test — dispatching a choice updates node/vars/flags; `ACT_2`/`ACT_3` transitions fire once.
    - _Requirements: FR-6.2, FR-2.6_

  - [ ] 4.2 Persistence service
    - Goal: full-resume save/load/clear with corruption safety.
    - Files: `src/services/persistence.ts` — `save(state)` (debounced ~300 ms, `SaveBlob` schemaVersion 1), `load()` (try/catch, version/key/type validation → `null` + clear on mismatch), `clear()` (after explicit restart confirm).
    - Deps: 4.1.
    - Verification: unit test — round-trip equality; corrupt blob (bad version, missing keys, wrong types) → `null`, no throw; clear empties the key.
    - _Requirements: FR-9.1–9.4_

  - [ ]* 4.3 Property tests — save/load round-trip & corruption safety
    - **Property 8: Save/load round-trip and corruption safety** — **Validates: FR-9.1, FR-9.2, FR-9.4**
    - Files: `src/services/__tests__/persistence.property.test.ts` (generator over reachable states + mangled blobs).
    - Deps: 4.2.
    - Verification: `npx vitest --run src/services` green.

## Phase 4 — UI (React DOM, Tailwind)

- [ ] 5. Screens and HUD
  - [ ] 5.1 Landing page
    - Goal: cinematic entry with resume support.
    - Files: `src/components/Landing.tsx` — title "THE LAST LIGHT", tagline "Feel the World. Shape the Story. Change Your Destiny.", animated background, "Continue" (iff valid save), "New Journey" with overwrite confirmation before clearing (FR-1.4/FR-9.3).
    - Deps: 4.2.
    - Verification: manual — Continue appears with save, absent without; restart confirm shown; unit render smoke with mock store.
    - _Requirements: FR-1.1–1.4_

  - [ ] 5.2 Emotion selection
    - Goal: four palettes driven by data, not hard-coded strings (FR-2.6).
    - Files: `src/components/EmotionSelection.tsx` (4 glass cards from `Emotion` type + profile data; selection writes to store and persists).
    - Deps: 5.1, 2.4.
    - Verification: manual — 4 options, each previews its palette; selection starts game with matching environment.
    - _Requirements: FR-2.1–2.6_

  - [ ] 5.3 GameUI / HUD + progress indicator
    - Goal: exploration HUD with act, emotion, hints, accessibility.
    - Files: `src/components/GameUI.tsx` — act, emotion, hint button, mute toggle, reduced-motion toggle (FR-11.3), progress indicator (act pips + ending-trajectory glyph).
    - Deps: 4.1.
    - Verification: manual — HUD reflects state changes after each choice; toggles persist.
    - _Requirements: FR-11.1, FR-11.3, FR-10.3_

  - [ ] 5.4 StoryPanel (typewriter dialogue + decisions)
    - Goal: narrative display + gated choice UI, AI-enriched but fallback-safe.
    - Files: `src/components/StoryPanel.tsx`, `src/hooks/useTypewriter.ts` (skip control), choice buttons rendered from `availableChoices` showing gated state; AI text display-only.
    - Deps: 4.1, 3.4.
    - Verification: unit render test — typewriter completes, skip works, gated choices disabled/hidden.
    - _Requirements: FR-11.1, FR-7.3, FR-11.3_

  - [ ] 5.5 InteractionPrompt + hint escalation
    - Goal: "Press E" prompt and the 60 s hint ladder.
    - Files: `src/components/InteractionPrompt.tsx`, `src/hooks/useHintEscalation.ts` (watches `lastStoryProgress`; one tier per 60 s; dismissible; resets on progress).
    - Deps: 4.1, 3.4.
    - Verification: unit test with fake timers — tier advances at 60 s, resets on progress, dismissible.
    - _Requirements: FR-4.5, FR-8.1, FR-8.2_

  - [ ] 5.6 EndingScreen + restart flow
    - Goal: per-ending cinematic, storage-clearing restart.
    - Files: `src/components/EndingScreen.tsx` — per-ending text/atmosphere (from ending profile), restart clears LocalStorage and returns to landing (FR-11.2).
    - Deps: 5.1, 4.2, 2.3.
    - Verification: unit test — restart clears save and resets store; manual — ending cinematic renders per ending.
    - _Requirements: FR-3.7, FR-11.2, FR-9.3_

  - [ ] 5.7 WebAudio ambience service
    - Goal: zero-file synthesized per-mood sound.
    - Files: `src/services/audio.ts` — oscillator/noise-based moods (Hope warm major pad; Sadness low minor drone + rain noise; Curiosity airy rising; Fear dissonant rumble; ending mood), gain cross-fade, mute persisted, AudioContext failure → disabled.
    - Deps: 2.4.
    - Verification: unit test (mock AudioContext) — mood switch cross-fades; no audio files in repo (`git ls-files | grep -iE '\.(mp3|wav|ogg)$'` empty).
    - _Requirements: FR-10.1–10.3_

## Phase 5 — 3D Game Layer (React Three Fiber)

- [ ] 6. Environment, player, camera, and interactive objects
  - [ ] 6.1 Bounds, collision, and collider registry
    - Goal: pure, testable movement math.
    - Files: `src/utils/bounds.ts` (`clampToBounds`), `src/utils/colliders.ts` (registry of prop bounding circles; circle-vs-circle resolution).
    - Deps: 1.3.
    - Verification: unit test — arbitrary positions clamped inside bounds and outside colliders.
    - _Requirements: FR-4.4, C-4_

  - [ ]* 6.2 Property tests — bounds & prompt range
    - **Property 9: Player is bounded and prompts are range-accurate** — **Validates: FR-4.4, FR-4.5**
    - Files: `src/utils/__tests__/bounds.property.test.ts`.
    - Deps: 6.1.
    - Verification: `npx vitest --run src/utils` green.

  - [ ] 6.3 World environment (static, hand-placed)
    - Goal: one bounded shared scene, no procedural generation.
    - Files: `src/game/World.tsx` — scene root wiring player, objects, environment, camera; static hand-placed geometry.
    - Deps: 6.1.
    - Verification: manual — scene renders, bounded, zero console errors.
    - _Requirements: FR-3.1, FR-3.8, C-3_

  - [ ] 6.4 Player (low-poly primitive humanoid + animations)
    - Goal: visible humanoid with idle/walk animation and keyboard control.
    - Files: `src/game/Player.tsx` — box torso, sphere head, cylinder neck/limbs, box hands/feet, joint groups; idle sine breathing/sway; speed-driven walk limb swing; WASD/arrow movement; `reducedMotion` disables sway.
    - Deps: 6.3, 6.1.
    - Verification: manual — walk/idle animations, movement confined to bounds.
    - _Requirements: FR-4.1–4.4_

  - [ ] 6.5 Third-person camera
    - Goal: pointer-drag orbit + spring-damped follow, reduced-motion aware.
    - Files: `src/game/Camera.tsx` (constants tuning table), mouse control.
    - Deps: 6.4.
    - Verification: manual — orbit + follow feel; reduced-motion toggle changes sway.
    - _Requirements: FR-4.3, FR-11.3_

  - [ ] 6.6 Generic InteractiveObject + three artifacts
    - Goal: one reusable component, three instances with narrative visual states.
    - Files: `src/game/Objects.tsx` — generic `<InteractiveObject>` (hover emissive, proximity ring, "Press E" via `InteractionPrompt`); instances: Clock (ticking vs frozen from `clockWound`/`clockBroken`), Book (glowing open vs closed from `bookTrusted`), Crystal (dim fracture vs radiant from `crystalShared`); registration in collider registry.
    - Deps: 6.3, 5.5.
    - Verification: manual — hover highlight and prompt for all 3 objects; visual states flip with flags.
    - _Requirements: FR-5.1–5.5, NFR-3_

  - [ ] 6.7 Atmosphere controller (centralized, interpolated)
    - Goal: single profile-driven atmosphere with 2–4 s transitions and reaction events.
    - Files: `src/game/Environment.tsx` (damped lerp of full profile via `interpolate`; one shared capped `Points` cloud with modes ember/rain/dust/firefly/storm; flower state; additive reaction modifiers `CLOCK_WOUND_LIGHT` ~5 s progressive brightening, `BOOK_TRUSTED_BLOOM`, `CRYSTAL_SHARED_BLOOM`), `src/hooks/useEnvironmentReaction.ts` (story events → transitions).
    - Deps: 2.4, 6.3.
    - Verification: unit test of interpolation timing (Property 2); manual — clock winding visibly brightens world over ~5 s, no hard cuts.
    - _Requirements: FR-3.1–3.6_

  - [ ]* 6.8 Property tests — transitions always interpolate
    - **Property 2: Atmosphere transitions always interpolate** — **Validates: FR-3.2**
    - Files: `src/game/__tests__/atmosphere.property.test.ts` (pure data; generator over profile pairs and t).
    - Deps: 6.7, 2.4.
    - Verification: `npx vitest --run src/game` green.

  - [ ] 6.9 Ending environment states
    - Goal: distinctive final atmospheres per ending.
    - Files: `src/game/Environment.tsx` (ending profiles `end_restoration` golden dawn / `end_transformation` radiant emerald-cyan bloom / `end_darkness` near-black dying ember), wired from `getEnding`.
    - Deps: 6.7, 2.3.
    - Verification: manual — each ending renders its distinct atmosphere.
    - _Requirements: FR-3.7_

## Phase 6 — Integration & QA

- [ ] 7. Full playthrough wiring and performance
  - [ ] 7.1 End-to-end playthrough wiring
    - Goal: landing → emotion select → explore → 3 interactions → ending → restart, fully connected, no orphaned code.
    - Files: `src/App.tsx`, `src/components/*`, `src/game/*`, `src/hooks/*` — wire store, engine, AI enrichment, persistence, audio, and reactions together.
    - Deps: all of Phases 1–5.
    - Verification: `npx tsc --noEmit` + `npm run build` clean; automated store-level trace of a full run reaching an ending.
    - _Requirements: FR-13.1, FR-13.10_

  - [ ] 7.2 Environment reaction-event integration
    - Goal: choices produce the three signature world changes (Property 6).
    - **Property 6: Decision reaction events fire** — **Validates: FR-3.4, FR-3.5, FR-3.6, FR-5.2–5.4, FR-13.6**
    - Files: `src/hooks/useEnvironmentReaction.ts`, reaction wiring in `Environment.tsx`/`Objects.tsx`.
    - Deps: 7.1, 6.7.
    - Verification: `npx vitest --run` green (reaction unit tests) + manual visual checklist.
    - _Requirements: FR-13.6_

  - [ ] 7.3 Performance pass
    - Goal: ≥ 45 FPS exploration on mid-range laptop (60 stretch); production cold-load < 5 s on broadband (NFR-4).
    - Files: `src/game/*` — capped particle count, `dpr [1,2]`, shadows off, profile-level lerp optimizations.
    - Deps: 7.1.
    - Verification: rAF FPS counter during exploration, ≥ 45 FPS recorded (FR-13.11); `vite build` + hard-refresh network timing of the deployed build, load < 5 s (NFR-4).
    - _Requirements: FR-13.11, NFR-4_

  - [ ] 7.4 Bundle key-leakage audit
    - Goal: no secrets in the frontend bundle.
    - Files: build output.
    - Deps: 7.1.
    - Verification: `npm run build` then grep bundle for key patterns (`sk-`, `LLM_API_KEY`, `API_KEY`, `Bearer `) — zero matches (FR-13.9).
    - _Requirements: FR-7.2, FR-13.9_

  - [ ] 8. Acceptance checklist run (13 items, FR-13)
    - Goal: verify every checklist item with a stated method; report verified vs unverified (C-8).
    - Items and verification methods:
      1. Boot check — `vite build` + load, zero console errors (SMOKE).
      2. 4 emotion atmospheres — Property-1 unit tests + manual visual checklist per emotion.
      3. Movement/camera/prompts for 3 objects — manual scripted walk + Property 9 tests.
      4. Choices update vars/flags; gating — engine unit tests (Properties 3, 4).
      5. All 3 endings reachable — ending traces (Property 5).
      6. Env transformations — Property 6 tests + visual checklist (clock lights world, book trust blooms, crystal share transforms).
      7. AI validation — Property 7 tests.
      8. Offline playthrough — manual run with `VITE_API_BASE` unset/endpoint disabled; completes with fallback, no surfaced errors.
      9. Bundle audit — Task 7.4 grep.
      10. Console check — zero runtime errors in a full manual playthrough.
      11. FPS ≥ 45 — Task 7.3 measurement.
      12. Continue/resume — Property 8 tests + manual: save mid-act, reload, Continue restores the exact state and matching environment; restart clears storage (FR-9).
      13. Honest reporting — mark each of items 1–12 verified/unverified in the final report; never claim untested features.
    - Deps: 7.1–7.4.
    - Verification: checklist recorded with per-item evidence; **manual visual checklist per emotion (4) and per ending (3):** distinct sky/fog/particles/audio for each emotion baseline; distinct final atmosphere + cinematic text per ending.
    - _Requirements: FR-13.1–13.13_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked `*` are optional test sub-tasks (skippable for MVP, but Properties 2–9 back the FR-13 checklist, so skip only if credits run out).
- Every task references specific FR/NFR ids; files follow the design.md folder map.
- Property tests use ≥ 100 generated iterations for validator, interpolation, bounds, and persistence generators per the testing strategy.
- Credit envelope: 50 total; if overrun, cut optional PBT sub-tasks before cutting integration/QA (C-8 forbids unverified claims).
- No implementation happens in this workflow; this document is the plan.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.5"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.6"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.4"] },
    { "id": 4, "tasks": ["2.3", "3.4", "3.3"] },
    { "id": 5, "tasks": ["2.5", "2.6", "6.1"] },
    { "id": 6, "tasks": ["3.1", "3.2", "6.2", "6.3"] },
    { "id": 7, "tasks": ["3.5", "6.4"] },
    { "id": 8, "tasks": ["4.1"] },
    { "id": 9, "tasks": ["4.2"] },
    { "id": 10, "tasks": ["4.3", "5.1", "5.3", "5.4", "5.5", "5.7"] },
    { "id": 11, "tasks": ["5.2", "5.6", "6.5"] },
    { "id": 12, "tasks": ["6.6"] },
    { "id": 13, "tasks": ["6.7"] },
    { "id": 14, "tasks": ["6.8", "6.9"] },
    { "id": 15, "tasks": ["7.1"] },
    { "id": 16, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 17, "tasks": ["8"] },
    { "id": 18, "tasks": ["9"] }
  ]
}
```
