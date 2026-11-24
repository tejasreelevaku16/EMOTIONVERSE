# Requirements Document

EMOTIONVERSE — "THE LAST LIGHT" (MVP)

## Introduction

EMOTIONVERSE is a solo-developer hackathon MVP: a 3D interactive narrative game built with React, TypeScript, and Three.js. The player selects one of four starting emotions, which shapes a shared 3D environment, and explores it in third person, interacting with three story objects. A deterministic story engine, driven by a structured node graph and persistent variables, branches the narrative toward one of three endings: RESTORATION, TRANSFORMATION, or DARKNESS. An optional AI layer (a single Vercel serverless function proxying an LLM) enriches dialogue and hints, but the game is fully playable offline. Progress persists in LocalStorage for full resume.

**Story premise — "THE LAST LIGHT":** The world's light is fading. The player awakens as the last keeper in a realm where emotion is the only remaining force. Three artifacts hold the final light: the Forgotten Clock, the Living Book, and the Last Crystal. How the player treats each artifact — guided by their chosen emotion — decides whether light is restored, transformed, or extinguished.

## Glossary

- **Emotionverse / System**: The web application implementing this MVP.
- **Player**: The human controlling the humanoid character in the 3D world.
- **Emotion**: One of four selectable starting states — Hope, Sadness, Curiosity, Fear.
- **Atmosphere Profile**: A named set of environment parameters (sky/fog color, light hue/intensity, particles, audio mood) bound to an emotion or story state.
- **Environment**: The single shared 3D scene that transforms per emotion and per story decision.
- **Story Engine**: The deterministic TypeScript module that evaluates the story graph, variables, and flags, and computes the current node and ending.
- **Story Node**: A vertex in the story graph containing narrative text, choices, effects on variables/flags, and gating conditions.
- **Variables**: Persistent numeric story values (e.g., `resolve`, `memory`, `light`) modified by choices.
- **Flags**: Persistent boolean story markers recording completed events (e.g., `clockWound`, `bookTrusted`, `crystalShared`).
- **AI Dialogue Service**: The optional LLM-backed layer reached via `/api/dialogue` that generates dialogue and hints as structured JSON.
- **Fallback Content**: Predefined per-node dialogue and hint text used when the AI Dialogue Service is unavailable.
- **Ending**: One of three terminal outcomes — RESTORATION, TRANSFORMATION, DARKNESS.
- **Artifact Objects**: The three interactive story objects — Forgotten Clock, Living Book, Last Crystal.
- **Steering Documents**: Kiro `.kiro/steering/*.md` guidance files.
- **Custom Agents**: The three Kiro agents — World Architect, Story Architect, Integration & QA Engineer.

## Requirements

### FR-1 Cinematic Landing Page

**User Story:** As a player, I want a cinematic landing page with the game's tagline, so that I am immersed before I begin.

#### Acceptance Criteria

1. THE System SHALL display a landing page with the title "THE LAST LIGHT" and the tagline "Feel the World. Shape the Story. Change Your Destiny."
2. WHEN a saved progress exists in LocalStorage, THE System SHALL offer a "Continue" button that resumes the full persisted state (FR-9).
3. THE System SHALL offer a "New Journey" (start) action on the landing page.
4. WHEN the player starts a new journey while saved progress exists, THE System SHALL confirm before clearing the saved state.

### FR-2 Emotion Selection

**User Story:** As a player, I want to choose one of four emotions, so that the world reflects my inner state.

#### Acceptance Criteria

1. THE System SHALL present exactly four selectable emotions on the emotion-selection screen: Hope, Sadness, Curiosity, Fear.
2. WHERE the emotion is Hope, THE System SHALL apply a golden-sunlight Atmosphere Profile with warm light, blooming flowers, and gentle particles.
3. WHERE the emotion is Sadness, THE System SHALL apply a blue-toned Atmosphere Profile with rain or mist and fading flowers.
4. WHERE the emotion is Curiosity, THE System SHALL apply an emerald/cyan Atmosphere Profile with glowing symbols and floating particles.
5. WHERE the emotion is Fear, THE System SHALL apply a dark Atmosphere Profile with heavy shadows, fog, and a storm feel.
6. THE System SHALL store the selected emotion in game state and persist it (FR-9); the emotion SHALL NOT be hard-coded in render components.
7. THE emotion selection SHALL influence the narrator's tone and gate at least one choice or event per act in the story graph.

### FR-3 Shared Transforming 3D Environment

**User Story:** As a player, I want one environment that visibly transforms with my emotion and my decisions, so that the world feels alive.

#### Acceptance Criteria

1. THE System SHALL render one bounded 3D environment whose atmosphere is a function of (current emotion, current story state).
2. THE System SHALL transition atmosphere parameters (colors, fog, light, particles) by interpolation over 2–4 seconds; hard cuts are not acceptable.
3. THE System SHALL apply distinct, per-emotion environment descriptions at baseline: Hope (golden sunlight, warm light, blooming flowers, gentle particles), Sadness (blue tones, rain or mist, fading flowers), Curiosity (emerald/cyan tones, glowing symbols, floating particles), Fear (dark, heavy shadows, fog, storm feel).
4. WHEN the player winds the Forgotten Clock, THE System SHALL light up the world (progressive brightening of lights and sky).
5. WHEN the player makes a trust-related choice at the Living Book, THE System SHALL bloom flowers in the environment.
6. WHEN the player shares the Last Crystal, THE System SHALL transform the crystal's appearance (e.g., fractured light becoming a radiant bloom).
7. THE System SHALL apply a final, distinctive atmosphere per ending (RESTORATION / TRANSFORMATION / DARKNESS).
8. THE Environment geometry SHALL be static and hand-placed; procedural generation is out of scope (C-3).

### FR-4 Third-Person Player Character

**User Story:** As a player, I want a visible humanoid character I control, so that I feel present in the world.

#### Acceptance Criteria

1. THE System SHALL render the player as a low-poly humanoid built from Three.js primitives (boxes/spheres/cylinders); external 3D assets and plain capsules are not acceptable.
2. THE System SHALL animate the humanoid with a subtle idle animation (breathing/sway) and a walk animation (limb movement while moving).
3. THE System SHALL support movement via WASD and arrow keys and camera control via mouse, in third-person perspective.
4. THE System SHALL confine the player within the environment bounds using simple collision checks (bounding circles/boxes); no physics engine (C-4).
5. WHEN the player is within interaction range of an Artifact Object, THE System SHALL show an interact prompt ("Press E"), and pressing E SHALL open that object's interaction panel.

### FR-5 Interactive Story Objects

**User Story:** As a player, I want to interact with the three artifacts, so that I drive the story forward.

#### Acceptance Criteria

1. THE System SHALL provide three interactable objects: the Forgotten Clock, the Living Book, and the Last Crystal, each with a hover/highlight state and interaction UI panel.
2. WHEN the player interacts with the Forgotten Clock, THE System SHALL present the choice to wind it, leave it, or break it, and the outcome SHALL affect variables/flags and the environment (lighting up on winding).
3. WHEN the player interacts with the Living Book, THE System SHALL present the choice to trust it, reject it, or read only part of it, and trust SHALL bloom flowers in the environment.
4. WHEN the player interacts with the Last Crystal, THE System SHALL present choices whose availability is gated by prior choices, variables, and flags; sharing the crystal SHALL transform its appearance.
5. THE System SHALL reflect each object's narrative state in its visual state (e.g., clock ticking vs. frozen, book glowing vs. closed, crystal dim vs. radiant).

### FR-6 Deterministic Story Engine

**User Story:** As a player, I want my choices to matter deterministically, so that outcomes are earned, not random.

#### Acceptance Criteria

1. THE Story Engine SHALL be implemented as pure TypeScript, defined by a story graph (nodes, choices, gates, effects) in data separate from all 3D and rendering code (C-7).
2. THE Story Engine SHALL maintain persistent variables and flags updated by every choice.
3. WHEN a choice is made, THE Story Engine SHALL advance the story node deterministically, given the current node, variables, and flags.
4. THE Story Engine SHALL gate later events on earlier choices (prior acts must restrict or unlock Act III options and ending eligibility).
5. THE Story Engine SHALL compute one of three endings — RESTORATION, TRANSFORMATION, DARKNESS — as a pure function of the final variables, flags, and node.
6. THE Story Engine SHALL be testable without rendering: given (emotion, choice sequence), the ending is computable in unit tests.

### FR-7 AI Dialogue Integration (Serverless, Validated, Offline-safe)

**User Story:** As a player, I want dynamic AI-flavored dialogue, so that the story feels alive — but the game must never depend on it.

#### Acceptance Criteria

1. THE System SHALL expose one minimal Vercel serverless function at `/api/dialogue` that proxies a configured LLM.
2. THE System SHALL keep the LLM API key exclusively in Vercel environment variables; the key SHALL NOT appear in the frontend bundle, source, or any client request.
3. WHEN the AI Dialogue Service returns a response, THE System SHALL require structured JSON conforming to a defined schema (`{ "dialogue": string, "hint": string, "mood": string }`) and validate it before display; invalid or malformed responses SHALL be rejected.
4. WHEN the AI call fails, times out, or returns invalid JSON, THE System SHALL fall back to predefined per-node dialogue and hint content with no user-visible error.
5. WHILE offline or with the AI endpoint disabled, THE System SHALL remain fully playable start-to-ending using fallback dialogue and hints.
6. THE AI layer SHALL be separate from game logic: the Story Engine's decisions SHALL never depend on AI output (AI output is presentation-only).

### FR-8 Hints

**User Story:** As a stuck player, I want progressive hints, so that I never soft-lock.

#### Acceptance Criteria

1. THE System SHALL provide a 3-tier hint ladder per story node (nudge → strong hint → explicit direction), sourced from AI when available and from fallback content otherwise.
2. WHEN the player has not made story progress for 60 seconds, THE System SHALL surface the next hint tier; hints SHALL be dismissible.

### FR-9 Progress Persistence (LocalStorage)

**User Story:** As a player, I want my full journey saved, so that I can continue where I left off.

#### Acceptance Criteria

1. THE System SHALL persist to LocalStorage, on every state change: current emotion, current story node, all variables, all flags, and settings.
2. WHEN the landing page loads with saved progress, THE System SHALL offer "Continue" (FR-1.2) that restores the exact persisted state and matching environment.
3. WHEN the player confirms a restart, THE System SHALL clear all persisted data before starting a new journey.
4. IF persisted data is corrupted or of an unknown schema version, THEN THE System SHALL discard the save and start cleanly without crashing.

### FR-10 Audio (Synthesized WebAudio)

**User Story:** As a player, I want ambient sound that matches each emotion, so that the atmosphere is complete — with zero audio files.

#### Acceptance Criteria

1. THE System SHALL synthesize per-emotion ambience with the WebAudio API using drone/pad tones (Hope: warm major pad; Sadness: low minor drone with rain-like noise; Curiosity: airy rising tones; Fear: dissonant low drone with rumble).
2. THE System SHALL ship no audio files; all sound SHALL be generated at runtime.
3. THE System SHALL provide a mute/enable control persisted in settings.

### FR-11 UI Screens

**User Story:** As a player, I want a complete UI flow, so that I always know where I am in the journey.

#### Acceptance Criteria

1. THE System SHALL implement these screens/components: landing page, emotion-selection screen, exploration HUD (act, emotion, hints access), interaction panels (per object), decision panels (choices), progress indicator (act/ending trajectory), ending cinematic, and restart flow.
2. WHEN the ending cinematic completes, THE System SHALL offer a restart action that clears storage and returns to the landing page.
3. THE System SHALL include minimal accessibility controls: dialogue skip and a reduced-motion toggle for camera sway.

### FR-12 Kiro Project Setup (Steering + Agents)

**User Story:** As the solo developer, I want the Kiro workspace configured with steering documents and custom agents, so that development stays within the plan.

#### Acceptance Criteria

1. THE System's repository SHALL contain Kiro steering documents covering: product vision, tech stack, coding conventions, architecture, visual design rules, and AI integration rules.
2. THE Kiro configuration SHALL define three custom agents: World Architect (3D environment, atmosphere, player character), Story Architect (story graph, dialogue fallback content, variables/flags), and Integration & QA Engineer (wiring, state, persistence, testing).
3. THE three agents SHALL have non-overlapping file ownership documented in the steering/agent configuration, so that no two agents edit the same files.

### FR-13 Testing and Quality Gates

**User Story:** As the developer, I want an explicit test checklist, so that I only claim what is verified.

#### Acceptance Criteria

1. THE System SHALL pass a boot check: the app loads cleanly with a production build.
2. THE System SHALL pass verification that all 4 emotions produce their correct distinct atmospheres (FR-2 criteria 2–5).
3. THE System SHALL pass verification of movement, camera control, and interaction prompts for all 3 objects.
4. THE System SHALL pass state tests proving choices update variables/flags and prior choices gate later events (Story Engine unit tests).
5. THE System SHALL pass story-graph tests proving all 3 endings are reachable from at least one choice trace each.
6. THE System SHALL pass verification of environment transformations: clock-winding lights the world, trust blooms flowers, crystal-sharing transforms the crystal.
7. THE System SHALL pass AI validation tests (schema-valid JSON accepted; malformed JSON rejected with fallback).
8. THE System SHALL pass an offline test: AI endpoint disabled, full playthrough completes with fallback content and no surfaced errors.
9. THE System SHALL pass a bundle audit: no secret keys or API-key strings in the frontend bundle.
10. THE System SHALL pass a console check: zero runtime errors during a full playthrough.
11. THE System SHALL run at a reasonable frame rate on a mid-range laptop (target ≥ 45 FPS during exploration; 60 FPS stretch), and the production build SHALL cold-load in under 5 seconds on broadband (NFR-4).
12. THE System SHALL pass a persistence/resume test: saving mid-journey, reloading, and using "Continue" restores the exact persisted state and matching environment, and the restart flow clears storage (FR-9).
13. THE project SHALL never claim an untested feature works; progress reporting SHALL distinguish verified from unverified features (C-8).

## Non-Functional Requirements

- NFR-1 TypeScript strict mode; no `any` in story or state layers.
- NFR-2 Story and AI layers import nothing from React or three.js (enforced by review/lint).
- NFR-3 Reusable, generic components (atmosphere controller, interactive object, dialogue/decision panel) rather than per-case duplicates (C-6).
- NFR-4 Production cold-load under 5 seconds on broadband.
- NFR-5 All user-facing content in English only.

## Constraints

- C-1 Solo developer hackathon scope; ~50 Kiro credit budget for the whole build.
- C-2 No multiplayer, no backend infrastructure beyond the single `/api/dialogue` serverless function.
- C-3 No procedural generation.
- C-4 No advanced physics (no rigid bodies, no physics engine; simple bounds/circle collision only).
- C-5 No out-of-MVP features: no voice acting, no mobile touch controls, no localization, no achievements.
- C-6 Reusable components required.
- C-7 Story logic separate from 3D; AI separate from game logic.
- C-8 Never claim untested features work.

## Out of Scope

Multiplayer, procedural generation, advanced physics, voice acting, recorded audio files, external 3D model assets, mobile touch controls, localization beyond English, achievements, accounts, and any backend infrastructure beyond `/api/dialogue`.
