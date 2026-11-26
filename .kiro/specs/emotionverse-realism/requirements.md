# Requirements Document

## Introduction

This spec adds a realism layer to the implemented EMOTIONVERSE MVP (React + Vite + TypeScript, three 0.169, R3F 8.17, Drei 9.114, Zustand 5, Vitest). The MVP already provides: a primitive humanoid player with procedural walk/idle and instant velocity, a damped orbit-follow camera, lerp-transitioned fog/lights with a 380-point particle cloud, static primitive scenery, artifact objects (clock, book, crystal) with post-choice animations, a synthesized audio service with mood pads and mute, atmosphere profiles, reaction events, and story/AI/persistence layers.

This feature upgrades six areas — player, environment, interactive objects, emotion-based atmosphere, cinematic presentation, and audio — while staying fully procedural (no external assets or GLTF), synthesizing all new audio via WebAudio by extending `src/services/audio.ts`, and adding exactly one new dependency: `@react-three/postprocessing`. Existing working source will be modified carefully, reusing the existing architecture (Zustand store, atmosphere profiles, reaction events, audio service). No rewrites.

Every FR below is annotated with: player-experience value, importance, affected existing files, technical complexity, performance impact, and tier (ESSENTIAL / OPTIONAL). OPTIONAL items are individually droppable to fit the ~5–7 credit budget without breaking ESSENTIAL items.

## Glossary

- **System**: The EMOTIONVERSE application, comprising the modules listed in the Glossary below.
- **Player**: The humanoid avatar controlled by the user, defined in `src/game/Player.tsx`.
- **Player_Controller**: The movement/animation logic in `src/game/Player.tsx` that maps input keys to velocity, rotation, and procedural animation.
- **Camera_Rig**: The damped orbit-follow camera system in `src/game/Camera.tsx`.
- **Environment**: The world scene in `src/game/Environment.tsx` and `src/game/World.tsx` (fog, lights, particles, scenery).
- **Artifact**: An interactive story object — Clock, Book, or Crystal — defined in `src/game/Objects.tsx`.
- **Audio_Service**: The WebAudio-based synthesized audio system in `src/services/audio.ts`.
- **Atmosphere_Profiles**: The per-emotion atmosphere definitions in `src/game/atmosphereProfiles.ts`.
- **Atmosphere_Engine**: The lerp/transition logic in `src/game/Environment.tsx` that applies Atmosphere_Profiles over time.
- **Reaction_Events**: The emotion-reaction events emitted via `src/game/reactions.ts`.
- **Game_Store**: The Zustand store in `src/hooks/useGameStore.ts`.
- **Run_Mode**: Locomotion state entered while Shift is held, at a higher target speed than walking.
- **Walk_Phase**: The accumulated phase counter driving the procedural walk cycle in the Player.
- **Postprocessing**: The `@react-three/postprocessing` effect chain (bloom, vignette) — the single permitted new dependency.
- **Instancing**: Rendering many identical meshes (grass tufts, rocks, leaves) via three.js `InstancedMesh`.
- **Reduced_Motion**: The existing accessibility setting in Game_Store that suppresses large camera/animation motion.
- **Eased_Camera_Move**: A single camera transition using an easing function (ease-in-out), with no keyframed choreography.

## Requirements

### FR Area 1 — Player Realism

#### Requirement 1.1: Run mode with animation blend (ESSENTIAL)

**User Story:** As a player, I want to run by holding Shift with visibly different animation, so that movement feels responsive and alive.

- **Player-experience value:** Makes exploration feel physical and gives agency over pace.
- **Why important:** The MVP's single walk speed and instant velocity are the most visible realism gap.
- **Affected files:** `src/game/Player.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHILE Shift is held with a movement key active, THE Player_Controller SHALL increase target speed to the configured run speed (at least 1.6× walk speed) and advance Walk_Phase at a proportionally higher rate.
2. WHEN Shift is released or no movement key is active, THE Player_Controller SHALL return to walk-speed targets within one animation cycle.
3. THE Player_Controller SHALL blend arm and leg swing amplitudes continuously between idle, walk, and run values, with no visible snap when mode changes.

#### Requirement 1.2: Velocity acceleration and deceleration (ESSENTIAL)

**User Story:** As a player, I want the avatar to accelerate and decelerate smoothly, so that starting and stopping feel natural.

- **Player-experience value:** Removes the mechanical instant-stop feel.
- **Why important:** Instant velocity changes break immersion immediately.
- **Affected files:** `src/game/Player.tsx`.
- **Complexity:** low. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. THE Player_Controller SHALL ramp horizontal speed toward its target with exponential smoothing (time constant between 0.08s and 0.25s), instead of assigning velocity directly.
2. WHEN all movement keys are released, THE Player_Controller SHALL decelerate to below 5% of walk speed within 0.4s.

#### Requirement 1.3: Synthesized footstep SFX tied to walk phase (ESSENTIAL)

**User Story:** As a player, I want footsteps synchronized with the visible step cycle, so that walking sounds grounded.

- **Player-experience value:** Strong presence cue, cheap to add.
- **Why important:** Audio-visual sync is the cheapest realism multiplier.
- **Affected files:** `src/services/audio.ts`, `src/game/Player.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHEN Walk_Phase crosses a step boundary (each foot-fall), THE Audio_Service SHALL play a synthesized footstep (filtered noise burst), scheduled within one frame of the phase crossing.
2. WHILE Run_Mode is active, THE Audio_Service SHALL play footsteps at the increased phase rate with increased amplitude and a shorter noise envelope than walking.
3. WHILE the Player is stationary, THE Audio_Service SHALL emit no footstep events.
4. WHERE the existing mute setting is enabled, THE Audio_Service SHALL suppress all footsteps.

#### Requirement 1.4: Idle subtle head look (OPTIONAL)

**User Story:** As a player, I want the avatar's head to drift and look around while idle, so that waiting feels alive.

- **Player-experience value:** Life-like stillness.
- **Affected files:** `src/game/Player.tsx`.
- **Complexity:** low. **Performance impact:** low. **Tier:** OPTIONAL (individually droppable).

##### Acceptance Criteria

1. WHILE no movement input is active for more than 2 seconds, THE Player_Controller SHALL animate the head with slow sinusoidal yaw/pitch offsets of at most 15° total.
2. WHEN movement input resumes, THE Player_Controller SHALL blend the head back to neutral within 0.3s.

#### Requirement 1.5: Reaction poses on interaction (OPTIONAL)

**User Story:** As a player, I want the avatar to react physically when interacting with artifacts, so that interactions feel embodied.

- **Affected files:** `src/game/Player.tsx`, `src/game/Objects.tsx`, `src/game/reactions.ts`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** OPTIONAL (individually droppable).

##### Acceptance Criteria

1. WHEN an artifact interaction is triggered, THE Player_Controller SHALL play a short recoil/lean-forward pose (under 0.5s, ease-in-out) and return to the locomotion pose.
2. WHERE Reduced_Motion is enabled, THE Player_Controller SHALL reduce the recoil amplitude by at least 70%.

#### Requirement 1.6: Smoother turning (ESSENTIAL)

**User Story:** As a player, I want the avatar to turn gradually rather than snapping, so that direction changes feel natural.

- **Affected files:** `src/game/Player.tsx`.
- **Complexity:** low. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. THE Player_Controller SHALL rotate toward the movement heading with exponential smoothing (time constant between 0.05s and 0.2s), taking the shortest angular path including across the ±180° wrap.

### FR Area 2 — Environment Realism

#### Requirement 2.1: Wind sway on trees and foliage (ESSENTIAL)

**User Story:** As a player, I want trees and foliage to sway in the wind, so that the world feels alive.

- **Affected files:** `src/game/World.tsx`, `src/game/Environment.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. THE Environment SHALL apply a cheap sway (group-rotation or vertex-shader offset) to all tree/foliage groups, varying rotation amplitude by up to 3° with a shared wind phase.
2. WHERE Reduced_Motion is enabled, THE Environment SHALL reduce sway amplitude by at least 70%.

#### Requirement 2.2: Falling leaves (OPTIONAL)

**Affected files:** `src/game/World.tsx`, `src/game/Environment.tsx`.
- **Complexity:** medium. **Performance impact:** medium. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. THE Environment SHALL render falling leaves via Instancing (at most 60 instances) with sinusoidal drift, respawning above the canopy on reaching the ground.
2. WHERE Reduced_Motion is enabled, THE Environment SHALL hold leaves static.

#### Requirement 2.3: Dynamic fog variation (ESSENTIAL)

**Affected files:** `src/game/Environment.tsx`, `src/game/atmosphereProfiles.ts`.
- **Complexity:** low. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHILE a mood is active, THE Atmosphere_Engine SHALL modulate fog density by up to ±15% of the profile value with slow noise-based variation, without changing the profile's base fog color.

#### Requirement 2.4: Moving water plane (OPTIONAL)

**Affected files:** `src/game/World.tsx`.
- **Complexity:** medium. **Performance impact:** medium. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. THE Environment SHALL animate the water plane's vertices (or its material's normal/offset) procedurally with at most two summed sine waves.
2. WHERE no water plane exists in a scene layout, THE Environment SHALL skip water rendering.

#### Requirement 2.5: Ground mist (OPTIONAL)

**Affected files:** `src/game/Environment.tsx`.
- **Complexity:** medium. **Performance impact:** medium. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. THE Environment SHALL render low-altitude mist as at most 30 large transparent billboards drifting slowly near the ground.
2. WHERE Reduced_Motion is enabled, THE Environment SHALL hold mist billboards stationary.

#### Requirement 2.6: Fireflies for night-equivalent moods (OPTIONAL)

**Affected files:** `src/game/Environment.tsx`, `src/game/atmosphereProfiles.ts`.
- **Complexity:** low. **Performance impact:** low. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. WHILE a night-equivalent mood is active, THE Environment SHALL render at most 40 emissive firefly points with pulsing brightness and slow wander.
2. WHEN a non-night mood becomes active, THE Environment SHALL fade fireflies out within the atmosphere transition time.

#### Requirement 2.7: Detail scatter via instancing (ESSENTIAL)

**Affected files:** `src/game/World.tsx`.
- **Complexity:** medium. **Performance impact:** low (single draw call per scatter type). **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. THE Environment SHALL scatter grass tufts and rocks via InstancedMesh, with at most 3 instanced sets totaling at most 300 instances.
2. THE Environment SHALL place scatter instances outside player-collider exclusion zones using existing collision utilities in `src/utils/colliders.ts`.

#### Requirement 2.8: Directional shadow map (OPTIONAL, performance-gated)

**Affected files:** `src/game/Environment.tsx`, `src/game/World.tsx`, `src/game/Player.tsx`.
- **Complexity:** medium. **Performance impact:** high. **Tier:** OPTIONAL (individually droppable; must auto-disable if frame budget is exceeded).

##### Acceptance Criteria

1. WHERE the quality setting permits, THE Environment SHALL render one directional shadow map of at most 1024×1024 with at most 12 shadow casters (player, artifacts, and nearest scenery).
2. WHEN the measured frame rate falls below 50 FPS for 3 consecutive seconds with shadows enabled, THE Environment SHALL disable the shadow map automatically.
3. WHERE shadows are disabled, THE Environment SHALL fall back to the MVP's unshadowed lighting with no visual artifacts.

### FR Area 3 — Interactive Object Realism

#### Requirement 3.1: Clock pre-choice ticking and hand tremor (ESSENTIAL)

**Affected files:** `src/game/Objects.tsx`, `src/services/audio.ts`.
- **Complexity:** low. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHILE the Clock artifact is not yet interacted with, THE Clock SHALL exhibit a subtle hand tremor (sub-degree oscillation) and THE Audio_Service SHALL emit a quiet synthesized tick at 1 Hz.
2. WHEN the player presses the interaction key while near the Clock, THE Clock SHALL show glowing feedback (emissive intensity increase, eased over at most 0.3s) until the interaction resolves.

#### Requirement 3.2: Book cover opening and page flutter (ESSENTIAL)

**Affected files:** `src/game/Objects.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHEN the Book artifact is interacted with, THE Book SHALL animate its cover opening through at most 90° with ease-in-out over at most 1.2s.
2. AFTER the cover opens, THE Book SHALL flutter its visible pages with a lightweight sinusoidal offset for at most 3 seconds.
3. WHERE Reduced_Motion is enabled, THE Book SHALL snap the cover to open without the flutter loop.

#### Requirement 3.3: Crystal pulsing, orbiting particles, and burst (ESSENTIAL)

**Affected files:** `src/game/Objects.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHILE the Crystal artifact is present, THE Crystal SHALL pulse emissive intensity sinusoidally and maintain at most 12 orbiting particles.
2. WHEN the final decision is made on the Crystal, THE Crystal SHALL emit a one-shot particle burst (at most 60 particles expanding outward and fading over at most 2s).
3. THE Crystal burst SHALL trigger exactly once per decision and be re-armable on state reset.

### FR Area 4 — Emotion-Based Realism

#### Requirement 4.1: Distinct ambient SFX layers per emotion (ESSENTIAL)

**Affected files:** `src/services/audio.ts`, `src/game/atmosphereProfiles.ts`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. THE Audio_Service SHALL provide synthesized ambient layers for wind, rain, chimes, and thunder rumble, each built from WebAudio oscillators/noise sources with no audio files.
2. THE Atmosphere_Profiles SHALL declare which ambient layers (and relative gains) each emotion activates.
3. WHERE the mute setting is enabled, THE Audio_Service SHALL produce no ambient layer output.

#### Requirement 4.2: Smooth audio crossfades on atmosphere change (ESSENTIAL)

**Affected files:** `src/services/audio.ts`, `src/game/Environment.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHEN the active emotion changes, THE Audio_Service SHALL crossfade outgoing layers down and incoming layers up over at most 2s with equal-power curves.
2. DURING a crossfade, THE Audio_Service SHALL keep total ambient gain within 3dB of the loudest single layer to avoid volume jumps.

#### Requirement 4.3: Weather-linked particle/lighting extension (OPTIONAL)

**Affected files:** `src/game/Environment.tsx`, `src/game/atmosphereProfiles.ts`.
- **Complexity:** medium. **Performance impact:** medium. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. WHEN a rain-declared emotion is active, THE Environment SHALL modulate the existing particle cloud's fall speed and downward bias within the existing particle budget (380 points, no increase).
2. WHEN a thunder-declared emotion is active, THE Environment SHALL briefly boost directional light intensity in sync with thunder rumble onset.

### FR Area 5 — Cinematic Storytelling

#### Requirement 5.1: Eased camera push-in on artifact interaction (ESSENTIAL)

**Affected files:** `src/game/Camera.tsx`, `src/game/Objects.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHEN an artifact interaction begins, THE Camera_Rig SHALL perform a single Eased_Camera_Move toward the artifact (distance reduced by 15–40% of current distance, duration 1–2s, ease-in-out), then return control to follow mode after the interaction resolves.
2. WHERE Reduced_Motion is enabled, THE Camera_Rig SHALL perform a reduced push (at most 10% distance change) or skip the move entirely while keeping the artifact in frame.

#### Requirement 5.2: Brief hold on decision moments (ESSENTIAL)

**Affected files:** `src/game/Camera.tsx`, `src/hooks/useGameStore.ts`.
- **Complexity:** low. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHILE a decision moment is pending (interaction prompt open), THE Camera_Rig SHALL hold its eased position with only residual damping drift of at most 2% of frame width per second.
2. WHEN the decision resolves, THE Camera_Rig SHALL resume follow behavior within 0.5s.

#### Requirement 5.3: Slow orbit/dolly on ending (OPTIONAL)

**Affected files:** `src/game/Camera.tsx`, `src/components/EndingScreen.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. WHILE the ending screen is displayed, THE Camera_Rig SHALL perform a continuous slow orbit (at most 0.1 rad/s) around the player's final position.
2. WHERE Reduced_Motion is enabled, THE Camera_Rig SHALL hold a static framing instead of orbiting.

#### Requirement 5.4: Dialogue panel transitions (OPTIONAL)

**Affected files:** `src/components/StoryPanel.tsx`, `src/components/GameUI.tsx`.
- **Complexity:** low. **Performance impact:** low. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. WHEN a new dialogue segment renders, THE StoryPanel SHALL transition in with a fade/slide lasting at most 0.4s, composed with the existing typewriter effect (not replacing it).
2. WHERE Reduced_Motion is enabled, THE StoryPanel SHALL render new segments without positional motion (fade only or none).

#### Requirement 5.5: Character facing toward interacted object (ESSENTIAL)

**Affected files:** `src/game/Player.tsx`, `src/game/Objects.tsx`.
- **Complexity:** low. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHEN an artifact interaction begins, THE Player_Controller SHALL rotate the avatar to face the artifact using the same smoothed turning as FR 1.6, completing within 1s.

### FR Area 6 — Audio Immersion

#### Requirement 6.1: Spatialized object hums (ESSENTIAL)

**Affected files:** `src/services/audio.ts`, `src/game/Objects.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. THE Audio_Service SHALL attach a continuous low-amplitude synthesized hum to each artifact, spatialized via PannerNode (or equivalent three.js positional audio), with distance attenuation audible within 15 units of the artifact.
2. WHEN the corresponding artifact is removed or resolved by story state, THE Audio_Service SHALL stop its hum and release its nodes within 0.5s.

#### Requirement 6.2: Per-object interaction SFX (ESSENTIAL)

**Affected files:** `src/services/audio.ts`, `src/game/Objects.tsx`.
- **Complexity:** low. **Performance impact:** low. **Tier:** ESSENTIAL.

##### Acceptance Criteria

1. WHEN each artifact is interacted with, THE Audio_Service SHALL play a distinct synthesized cue (Clock: chime strike; Book: paper/page whoosh; Crystal: resonant ping), each under 1.5s.
2. WHERE the mute setting is enabled, THE Audio_Service SHALL suppress all interaction cues.

#### Requirement 6.3: Location-based ambience transitions (OPTIONAL)

**Affected files:** `src/services/audio.ts`, `src/game/World.tsx`.
- **Complexity:** high. **Performance impact:** low. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. WHEN the player's position enters a declared ambience zone, THE Audio_Service SHALL crossfade that zone's ambience layer in over at most 1.5s, and crossfade it out on exit.
2. THE System SHALL define at most 3 ambience zones in world-space coordinates.

#### Requirement 6.4: Footstep material variation by zone (OPTIONAL)

**Affected files:** `src/services/audio.ts`, `src/game/World.tsx`.
- **Complexity:** medium. **Performance impact:** low. **Tier:** OPTIONAL.

##### Acceptance Criteria

1. WHERE the player stands in a stone-declared zone, THE Audio_Service SHALL use a harder, shorter footstep envelope than the default; WHERE in a grass-declared zone, THE Audio_Service SHALL use a softer, noisier envelope.
2. WHEN the player crosses a zone boundary mid-stride, THE Audio_Service SHALL apply the new material from the next foot-fall onward.

## Non-Functional Requirements

### NFR 1: Frame rate

1. THE System SHALL sustain at least 60 FPS on a mid-range laptop (integrated/discrete GPU of 2022 or later) with Postprocessing and shadows at their default settings, in the most particle-dense mood.
2. WHEN the measured frame rate falls below 50 FPS for 3 consecutive seconds, THE System SHALL progressively disable OPTIONAL visual features (order: shadows → mist/leaves → fireflies) until the frame rate recovers, and SHALL remember the resulting quality level for the session.
3. THE System SHALL expose a manual quality toggle that disables Postprocessing and shadows without a page reload.

### NFR 2: Accessibility

1. WHERE Reduced_Motion is enabled, THE System SHALL reduce or suppress all camera moves, sway, flutter, and drift behaviors specified above, while keeping the game fully playable.
2. WHERE the mute setting is enabled, THE System SHALL produce no audio output from any new or existing audio path, including one-shot cues and crossfades.
3. THE System SHALL keep the Reduced_Motion and mute settings functional and persisted as they are in the MVP.

### NFR 3: No regression

1. THE System SHALL preserve the existing story engine, AI dialogue flow, and persistence behavior unchanged, per the existing tests in `src/story/__tests__`, `src/ai/__tests__`, and `src/services/__tests__`.
2. THE System SHALL keep all existing gameplay controls (WASD/arrows, interaction key) functional after the realism changes.
3. THE System SHALL pass the existing test suite plus the new tests required below, with no skipped tests.

### NFR 4: Constraints

1. THE System SHALL add at most one runtime dependency: `@react-three/postprocessing` (R3F 8 / three 0.169 compatible). No other new dependencies are permitted.
2. THE System SHALL use fully procedural visuals (no external textures, models, GLTF, or audio files).
3. THE System SHALL implement cinematics only as single Eased_Camera_Moves and holds; no keyframed choreography.
4. THE implementation SHALL modify the existing MVP source in place, reusing Game_Store, Atmosphere_Profiles, Reaction_Events, and Audio_Service, without rewriting those architectures.

### NFR 5: Budget tiering

1. THE System SHALL implement all ESSENTIAL-tier requirements as the core deliverable sized for ~5 credits of work.
2. THE implementation plan SHALL treat each OPTIONAL requirement as an independently droppable increment, removable without violating any ESSENTIAL requirement.

## Testing Requirements

1. WHEN implementing audio scheduling, THE System SHALL include unit tests for footstep phase-boundary scheduling, crossfade gain curves (including the 3dB ceiling during overlap), and layer start/stop on emotion change, using a mocked WebAudio graph.
2. WHEN implementing the locomotion state machine, THE System SHALL include unit tests for the run/walk/idle blend transitions, acceleration smoothing constants, and shortest-path turning (including the ±180° wrap).
3. WHEN implementing camera easing, THE System SHALL include unit tests for the easing math (progress, distance reduction, hold drift bounds) extractable as pure functions.
4. THE implementation SHALL include a manual visual/performance checklist covering: 60 FPS reading per mood, shadow auto-disable behavior, Reduced_Motion behavior per FR, mute behavior per FR, and the per-artifact visual/audio behaviors.
5. THE System SHALL NOT require visual regression tooling; visual checks are manual per the checklist.

## Constraints (Restated for Traceability)

- Exactly one new dependency (`@react-three/postprocessing`); procedural-only assets; synthesized-only audio; no keyframe choreography; the `emotionverse-mvp` spec directory and documents SHALL NOT be modified; ESSENTIAL/OPTIONAL tiering with individually droppable optional items; existing architecture reused, no rewrites.
