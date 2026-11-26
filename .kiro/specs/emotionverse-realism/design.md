# Design Document — EMOTIONVERSE Realism Layer

## Overview

This design upgrades the implemented MVP in `d:\EMOTIONVERSE` (React 18 + Vite + TypeScript, three 0.169.0, R3F 8.17, Zustand 5, Vitest) across six areas: player locomotion, environment, interactive objects, emotion ambience, cinematics, and audio — adding exactly one new dependency (`@react-three/postprocessing`, R3F 8 / three 0.169 compatible). Everything is procedural (no external textures, models, GLTF, or audio files); all new SFX are synthesized in WebAudio by extending `src/services/audio.ts`. Existing architecture (Game_Store, Atmosphere_Profiles, Reaction_Events, Audio_Service) is reused, not rewritten. All cinematics are single eased camera moves/holds.

Code examples are in TypeScript (the project language).

## Architecture

The realism layer is organized so that every dynamic behavior is driven by a small **pure module** (testable without WebGL/WebAudio) plus a thin R3F component that applies the pure module's output in `useFrame`. New code lives under `src/game/` in new subfolders; edits to existing files are additive wherever possible.

```
src/game/player/          (new)  locomotion reducer, footstep phase detection, reaction pose envelope
src/game/env/             (new)  wind sampler, scatter placement, fog modulation, water/mist/leaf/firefly updaters
src/game/objects/         (new)  object animation state machines (clock tremor, book cover, crystal burst)
src/game/cinematic/       (new)  camera easing math + context presets, camera controller state
src/services/audio/       (new)  layer definitions, crossfade scheduler, cue recipes, panner helpers
src/game/perf/            (new)  FPS monitor + quality-tier decision function
src/components/Postprocessing.tsx (new) EffectComposer wrapper (Bloom + Vignette)
```

Modified existing files (additive): `Player.tsx`, `Camera.tsx`, `Environment.tsx`, `World.tsx`, `Objects.tsx`, `audio.ts` (extended via a new `AudioService2` facade or direct additive methods — see §10), `atmosphereProfiles.ts` (add optional fields), `useGameStore.ts` (add quality setting + interaction/decision UI state), `GameUI.tsx` (quality toggle), `StoryPanel.tsx` (optional panel transition), `src/components/ExplorationScreen.tsx` (mount Postprocessing/PerfMonitor inside the existing Canvas), `package.json`.

**Explicitly forbidden to modify**: `src/story/**`, `src/ai/**`, `api/`, the persistence schema in `src/services/persistence.ts` (only a new optional `quality` key may be appended to `GameSettings` if it does not break `loadGame` of old saves — old saves lacking the key must default to `'medium'`, matching the Data Models section and the performance-tier table), and the `emotionverse-mvp` spec directory.

## Components and Interfaces

The per-area sections below (1–7) are the component designs. Interface summary of every new module:

- `src/game/player/locomotion.ts` — `stepLocomotion(state: LocoState, input: LocoInput): LocoState` (pure reducer)
- `src/game/player/footsteps.ts` — `detectSteps(prevPhase, nextPhase): StepEvent[]`; `footstepEnvelope(material, running): Envelope`
- `src/game/player/reactionPose.ts` — `reactionEnvelope(t, duration): number`
- `src/game/env/wind.ts` — `windAt(t, seed): number`; `registerSwayTarget(ref, opts)`; `Wind.tsx` provider (single `useFrame`)
- `src/game/env/scatter.ts` — `generateScatter(seed, count, radius, colliders, bounds): THREE.Matrix4[]`
- `src/game/env/fogModulation.ts` — `fogVariation(t): number`
- `src/game/env/zones.ts` (opt) — `zoneAt(pos, zones): Zone | null`
- `src/game/objects/anim.ts` — `triggerBurst/stepBurst`, clock tremor, cover easing helpers
- `src/game/objects/positions.ts` — `ARTIFACT_POSITIONS`, zone declarations
- `src/game/cinematic/easing.ts` — `easeInOutCubic`, `stepCamMove`, `pushInTarget`
- `src/game/cinematic/presets.ts` — context preset table (§5.1)
- `src/game/perf/fpsMonitor.ts` — `stepQuality(monitorState, dt, fps)`; `QUALITY_TIERS`
- `src/services/audio/layers.ts|crossfade.ts|cues.ts|hums.ts` — layer recipes, `crossfadeGains`, cue schedules, `attachHum/detachHum`
- `audioService` public API additions: `playFootstep(opts)`, `startClockTick()/stopClockTick()`, `playCue(artifact)`, `attachHum(id, pos)`, `detachHum(id)`, `setAmbienceLayers(layers)` (internally crossfaded)
- `src/components/Postprocessing.tsx` — `<Postprocessing enabled />` (Bloom + Vignette)
- `useGameStore` additions: `quality: 'low'|'medium'|'high'` setting + `setQuality(tier)` action

Existing components (`Player`, `Camera`, `Environment`, `World`, `Objects`, `GameUI`, `StoryPanel`) keep their current props; `World.tsx` wires the new sub-components and the artifact-position export.

## Data Models

New/extended types (all in the pure modules, no store-schema changes):

```ts
// locomotion.ts
type LocoMode = 'idle' | 'walk' | 'run';
interface LocoState { mode; speed; heading; facing; walkPhase; idleTime; headYaw; headPitch; headBlend; }
interface LocoInput { moveX; moveZ; shift; dt; reducedMotion; }

// footsteps.ts
interface StepEvent { foot: 'left'|'right'; }
interface Envelope { gain: number; durationMs: number; filterHz: number; }

// anim.ts
interface BurstState { active: boolean; t: number; firedFor: string | null; }

// easing.ts
interface CamMove { from: Vec3; to: Vec3; duration: number; t: number; }

// fpsMonitor.ts
interface QualityTier { post: boolean; shadows: boolean; mist: boolean; leaves: boolean; fireflies: boolean; }

// atmosphereProfiles.ts (additive, optional — old consumers unaffected)
interface AtmosphereProfile { ...existing; ambienceLayers?: Partial<Record<'wind'|'rain'|'thunder'|'chimes', number>>; fireflies?: boolean; isNight?: boolean; }

// GameSettings (additive optional key; old saves default to 'medium')
type Quality = 'low' | 'medium' | 'high';
```

No persistence-schema migrations: `quality` is optional with a default, and `loadGame` of pre-existing saves must keep working unchanged.

## 1. Player Realism

### 1.1 Locomotion state machine (FR 1.1, 1.2, 1.6)

New module `src/game/player/locomotion.ts` — a pure, deterministic reducer, no THREE imports:

```ts
export type LocoMode = 'idle' | 'walk' | 'run';

export interface LocoState {
  mode: LocoMode;
  speed: number;          // current horizontal speed (u/s)
  heading: number;         // radians, movement direction
  facing: number;          // radians, smoothed body rotation
  walkPhase: number;       // accumulated phase
  idleTime: number;        // seconds since last input
}

export interface LocoInput {
  moveX: number;      // -1..1
  moveZ: number;
  shift: boolean;
  dt: number;         // clamped to [0, 0.1]
  reducedMotion: boolean;
}

export const LOCO_CONFIG = {
  walkSpeed: 3.2,     // was 7.5 direct; walk 3.2, run 5.2 (1.625x)
  runSpeed: 5.2,
  accelTau: 0.15,     // exponential smoothing time constant (0.08–0.25 s)
  turnTau: 0.12,      // 0.05–0.2 s
  walkPhaseRate: 7.0, // rad/s at walk
  runPhaseScale: 1.6, // phase advances proportionally with speed
};

export function stepLocomotion(s: LocoState, input: LocoInput): LocoState {
  const moving = input.moveX !== 0 || input.moveZ !== 0;
  const mode: LocoMode = !moving ? 'idle' : input.shift ? 'run' : 'walk';
  const targetSpeed = mode === 'run' ? LOCO_CONFIG.runSpeed
                    : mode === 'walk' ? LOCO_CONFIG.walkSpeed : 0;

  // Exponential acceleration smoothing (FR 1.2)
  const alpha = 1 - Math.exp(-input.dt / LOCO_CONFIG.accelTau);
  const speed = s.speed + (targetSpeed - s.speed) * alpha;

  // Shortest-path turning incl. ±180° wrap (FR 1.6)
  const heading = moving ? Math.atan2(input.moveX, input.moveZ) : s.heading;
  let diff = heading - s.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const facing = s.facing + diff * Math.min(input.dt / LOCO_CONFIG.turnTau, 1) * ... // full diff scaled
  ...
}
```

`Player.tsx` keeps its keyboard listeners and rendering; its `useFrame` body shrinks to: build `LocoInput`, call `stepLocomotion`, write the resulting `position` (after `resolveCollisions`/`clampToBounds`, which stay), `rotation.y = facing`, and drive the animation blend (§1.2). The walk speed drops from the MVP's constant 7.5 to `walkSpeed`/`runSpeed` — this changes feel intentionally; world scale (56u ground) still allows traversal in reasonable time.

### 1.2 Animation blending (FR 1.1 AC3)

Blending is by a continuous `blend = clamp(speed / walkSpeed, 0, runSpeed / walkSpeed)` factor applied to swing amplitude and phase rate; no discrete snap:

```ts
const phaseRate = LOCO_CONFIG.walkPhaseRate * (speed / LOCO_CONFIG.walkSpeed);
walkPhase += dt * phaseRate;
const amp = 0.25 + 0.45 * Math.min(blend, 1.63) / 1.63; // idle 0.25 -> walk 0.55 -> run 0.8
armRefs.rotation.x = Math.sin(walkPhase) * amp; // legs opposite, as today
```

Idle keeps the existing breathing limb-damping branch. The current `walkPhase += dt * 11` and fixed 0.65 swing constant are replaced by the formulas above.

### 1.3 Footsteps from phase zero-crossings (FR 1.3)

Pure detector in `src/game/player/footsteps.ts`:

```ts
export interface StepEvent { foot: 'left' | 'right'; phaseAtCrossing: number; }

export function detectSteps(prevPhase: number, nextPhase: number): StepEvent[] {
  // a footfall occurs at each multiple of PI (each half-cycle = one foot)
  // returns crossings in (prevPhase, nextPhase]; empty when phase didn't advance
}
```

In `Player.tsx`'s `useFrame`: `detectSteps(prevPhase, state.walkPhase)`; for each event with `speed > 0.5 * walkSpeed`, call `audioService.playFootstep({ running, zoneMaterial, intensity: amp })`. Zero crossings and events happen in the same frame as the phase update, satisfying "within one frame". Stationary ⇒ phase doesn't advance ⇒ no events. Mute is enforced inside the Audio_Service (master gain 0).

Footstep synthesis (in `audio.ts`): a 60–120 ms noise burst through a lowpass (walk) or bandpass+shorter envelope (run), gain 0.05–0.12, amplitude scaled by `blend`. Optional zone materials (FR 6.4): `zone === 'stone'` ⇒ highpass tilt + 0.7x duration; `'grass'` ⇒ lowpass 900 Hz + noisier (higher gain, longer tail). The envelope parameters are a pure lookup `footstepEnvelope(zone, running)`.

### 1.4 Idle head look (FR 1.4, OPTIONAL)

`idleTime` accumulates in the reducer. After 2 s, head `rotation.y/x = sin(t * 0.4) * 0.26 rad` (≤15° total) applied to a new `headRef`; blend factor `headBlend` eases 0→1 over 0.3 s on idle entry and 1→0 within 0.3 s when input resumes. All in the pure reducer (`headYaw`, `headPitch` fields), applied by the component.

### 1.5 Reaction pose + facing on interaction (FR 1.5, 5.5)

New pure module `src/game/player/reactionPose.ts`:

```ts
export function reactionEnvelope(t: number, duration = 0.45): number {
  // ease-in-out bump: 0 at t=0 and t=duration, peak 1 at t=duration/2
}
```

`Player.tsx` subscribes to `useGameStore(s => s.activeArtifact / s.isInteractionPanelOpen)`. When an interaction begins, it (a) sets a `faceTarget` — the artifact position (passed down from `Objects.tsx` via `World.tsx` or read from a shared `ARTIFACT_POSITIONS` constant exported from `src/game/objects/positions.ts`) and computes `heading = atan2(dx, dz)`; the same shortest-path smoothing from the reducer rotates the avatar to face it within 1 s (turnTau 0.12 guarantees completion well under 1 s); (b) for ≤0.5 s, applies a lean-forward torso pitch `reactionEnvelope(t) * 0.25 * (reducedMotion ? 0.3 : 1)` (≥70% reduction). When `reducedMotion` is on, the recoil amplitude is multiplied by 0.3.

### 1.6 Where the code lives

`src/game/player/` contains `locomotion.ts`, `footsteps.ts`, `reactionPose.ts` (pure), and `Player.tsx` stays as the component (moved or left in place; leaving it at `src/game/Player.tsx` with imports from `./player/` keeps the diff minimal).

## 2. Environment Realism

### 2.1 Wind provider + tree sway (FR 2.1)

One `WindProvider` component in `src/game/env/Wind.tsx` computes a shared value once per frame in a single `useFrame` (render-priority after nothing special) and writes it to a module-level ref/context:

```ts
// src/game/env/wind.ts (pure)
export function windAt(t: number, seed: number): number {
  const base = Math.sin(t * 0.25 + seed * 0.7) * 0.5;
  const gust = Math.sin(t * 1.7 + seed) * 0.15 + Math.sin(t * 0.61 + seed * 2.3) * 0.2;
  return clamp(base + gust, -1, 1); // shared wind value in [-1, 1]
}
```

Trees (currently 9 hand-placed groups in `World.tsx`) get a `useRef<THREE.Group>` array collected once; the **WindProvider's** `useFrame` loops over registered tree refs and applies:

```ts
tree.rotation.z = wind * 0.052 * (0.6 + perTreePhase); // ≤3° amplitude
tree.rotation.x = wind * 0.017 * perTreeFactor;
```

No per-tree `useFrame`. Trees register via a `registerSwayTarget(ref, {phase, factor})` call in a small sway registry module. `reducedMotion` multiplies amplitude by 0.3 (≥70% reduction). Foliage cones are children of the tree group, so they inherit rotation for free.

### 2.2 Falling leaves (FR 2.2, OPTIONAL)

A second particle layer reusing the existing `Points` pattern from `Environment.tsx`: a `<points>` with ≤60 positions. Each leaf has `y` decreasing with `dt * fallSpeed`, `x/z` drifting with `sin(t + i)`, and respawns at `y = 6` above canopy (`x/z` re-randomized in a deterministic pattern via `mulberry32(i)` seeded PRNG). Rendered as small `PointsMaterial` (size 0.12, color from profile `particleColor`). `reducedMotion` skips the update loop entirely (leaves frozen at spawn positions).

### 2.3 Dynamic fog modulation (FR 2.3)

In `Environment.tsx`, after the existing density lerp toward the profile value, apply a slow noise modulation:

```ts
// src/game/env/fogModulation.ts (pure)
export function fogVariation(t: number): number {
  // slow value noise in [-0.15, 0.15]
  return 0.15 * Math.sin(t * 0.05) * (0.6 + 0.4 * Math.sin(t * 0.13 + 1.7));
}
scene.fog.density = cur.fogDensity * (1 + fogVariation(time));
```

Fog color is untouched (only density oscillates ±15%).

### 2.4 Water plane (FR 2.4, OPTIONAL)

A low-segment plane (24×24) at a declared water region (e.g., a pond at [-18, 0.02, 18]). In its single `useFrame`, displace vertex Y with two summed sines:

```ts
pos.setY(i, Math.sin(x * 0.8 + t * 1.2) * 0.06 + Math.sin(z * 1.1 + t * 0.7) * 0.04);
```

Material: `meshStandardMaterial` with `transparent, opacity 0.8, roughness 0.1` (specular glint from the directional light). Skipped entirely when the layout declares no water (the component is simply not rendered; the requirement "skip when absent" is structural).

### 2.5 Ground mist (FR 2.5, OPTIONAL)

≤30 large planes (8–14 u) with `meshBasicMaterial` radial-fade via a procedurally generated canvas texture (allowed: generated at runtime, not an external file) or, simpler, `circleGeometry` with low opacity (0.03–0.06), `depthWrite: false`. Positioned `y ∈ [0.15, 0.6]`, each drifting `x/z` at 0.05 u/s with sinusoidal bob, wrapping at ±25 u. `reducedMotion` holds them static.

### 2.6 Fireflies (FR 2.6, OPTIONAL)

The existing particle cloud already has a `firefly` mode; FR 2.6 adds a dedicated ≤40-point emissive layer active only for night-equivalent moods (profile-driven via a new optional `fireflies?: boolean` field on `AtmosphereProfile`). Points wander (same per-point velocity array pattern) with `material.size` pulsing `0.1 + 0.08 * sin(t*2 + i)`; opacity crossfades over the same 2.5 s lerp window used by the atmosphere engine (multiply opacity by the current lerp factor toward 0 when the new mood is not night-equivalent).

### 2.7 Instanced scatter (FR 2.7)

`src/game/env/scatter.ts` (pure) + a `Scatter` component in `World.tsx`:

```ts
export function generateScatter(
  seed: number, count: number, radius: [number, number],
  colliders: Collider[], bounds: { min: number; max: number }
): THREE.Matrix4[] {
  // mulberry32(seed) deterministic placement; rejection-sample positions
  // until outside every collider's exclusion radius and inside bounds
}
```

Three `InstancedMesh` sets: grass tufts (small cone clusters, ~180 instances), small rocks (dodecahedron, ~80), glow moss patches (flattened spheres, ~40) — 3 sets, ≤300 total, one draw call each. Placement uses `isWithinInteractionRange` / collider radii from `src/utils/colliders.ts` to exclude artifact zones and tree trunks. Matrices set once in a `useLayoutEffect`; the grass set registers with the sway registry for a subtle collective bend (rotation.z = wind * 0.03), updated in the shared wind `useFrame` via the instance matrix (or skipped — grass sway optional).

### 2.8 Shadows (FR 2.8, OPTIONAL, perf-gated)

`Environment.tsx`'s directional light gets `castShadow={quality.shadows}` with `shadow-mapSize={[1024, 1024]}` and a tight `shadow-camera` frustum (±20 u) around the sanctuary center. Shadow casters (≤12): player group, 3 artifact meshes, 4 nearest pillars, 2 trees, ground receiver. `World.tsx` adds `castShadow` to those meshes only; `receiveShadow` on ground planes. The perf monitor (§8) auto-flips `shadows` off after <50 FPS for 3 s; fallback is simply `castShadow={false}` plus the existing fake player base-disc shadow (already in `Player.tsx`), so no visual artifacts.

## 3. Interactive Objects

All object animation state machines live in a new pure module `src/game/objects/anim.ts`, with `Objects.tsx` applying outputs in its existing single `useFrame`.

### 3.1 Clock (FR 3.1)

- **Tremor** (pre-choice, i.e., `!flags.clockWound && !flags.clockBroken`): second-hand group `rotation.z += sin(t * 40) * 0.008` each frame (sub-degree oscillation), plus the pendulum gets a tiny jitter `sin(t * 47) * 0.01`.
- **Tick**: `audioService` exposes `startClockTick()` — a scheduled 1 Hz short filtered click (2 ms noise burst through a 3 kHz bandpass) in a loop via `setInterval`-free scheduling (lookahead scheduler, §5), gain 0.02, distance-attenuated by the clock panner (§6.1). Stopped when `clockWound || clockBroken` fires (flags change ⇒ effect cleanup).
- **Dial glow on E**: when the interaction panel is open for the clock (`activeArtifact === 'clock' && isInteractionPanelOpen`), target `emissiveIntensity` of the dial/bezel rises from 0.05→0.9 eased over 0.3 s (`lerp` with `1 - exp(-dt/0.1)`); on resolve it eases back.

### 3.2 Book (FR 3.2)

The book's cover is split from the page block: a `coverRef` group pivoted at the spine (translate geometry so the hinge is at `x = -0.375`). On interaction (`activeArtifact === 'book' && isInteractionPanelOpen`):

```ts
// pure: openProgress in [0,1], ease-in-out, duration 1.2 s
cover.rotation.y = -easeInOutCubic(openProgress) * (Math.PI / 2); // ≤90°
```

After `openProgress === 1`, pages (4–6 thin `planeGeometry` meshes, slightly offset in y) flutter: `rotation.x = sin(t * 6 + i) * 0.08` for ≤3 s (a `flutterTimer` in the object state machine counts down and stops). `reducedMotion` ⇒ `openProgress` snaps 0→1 instantly and no flutter timer runs.

### 3.3 Crystal (FR 3.3)

- **Pulse**: `emissiveIntensity = base + 0.35 * sin(t * 2.2)` (base 0.65 / 1.4 per `crystalShared`).
- **Orbiters**: a small `<points>` of 12 particles; positions computed in the shared `useFrame` as `r_i(t) = [cos(t*w_i + φ_i) * 0.9, 1.6 + sin(t*v_i)*0.3, sin(t*w_i + φ_i) * 0.9]` around the crystal, `w_i ∈ [0.4, 1.2]`.
- **Burst**: pure state machine in `anim.ts`:

```ts
export interface BurstState { active: boolean; t: number; firedFor: string | null; }
export function triggerBurst(s: BurstState, decisionId: string): BurstState
export function stepBurst(s: BurstState, dt: number): BurstState  // t 0→2s, then inactive
```

On the final decision (`flags.crystalShared` transition false→true detected in the component), `triggerBurst` fires once (`firedFor` guards re-trigger); 60 points expand radially `p_i = dir_i * ease(t/2) * 3.5` with opacity `(1 - t/2)`. Reset/re-arm: `resetGame` and state resets recreate `BurstState` (`firedFor: null`).

## 4. Emotion Audio (FR Area 4)

### 4.1 Layered ambience (FR 4.1)

`audio.ts` is extended (additively) with a layer system. New pure module `src/services/audio/layers.ts` defines the four weather layers as graph recipes, and `AtmosphereProfile` gains an optional field (added in `atmosphereProfiles.ts`, defaults filled for all 9 profiles — 4 emotion, 2 act-transition, 3 ending):

```ts
ambienceLayers?: Partial<Record<'wind' | 'rain' | 'thunder' | 'chimes', number>>; // 0..1 gain
```

- **wind**: looped noise buffer → lowpass (400 Hz, LFO on cutoff ±150 Hz at 0.1 Hz) → gain.
- **rain**: looped noise → highpass 1.5 kHz + bandpass 4 kHz mixed → gain; plus sparse droplet pings (short sine blips, Poisson-scheduled).
- **thunder**: brown-noise buffer (integrated white noise, normalized) → lowpass 120 Hz, rumble events Poisson-scheduled every 8–20 s, 2–4 s swells (also emits a callback the Environment can use for FR 4.3 light boost).
- **chimes**: 3–5 detuned sine partials around 880–1760 Hz, exponentially decaying, triggered every 4–10 s, heavy feedback delay for shimmer.

Profile mapping (examples): `sadness` → rain 0.7, wind 0.3; `fear` → wind 0.8, thunder 0.5; `hope` → chimes 0.4, wind 0.2; ending profiles → chimes 0.5.

The existing mood pads (`synthesizeHope` etc.) remain the **base layer**; weather layers are additional `GainNode`s created once at service init (sources looped, gains at 0) and only their gains are ramped — no node churn per emotion change.

### 4.2 Crossfades (FR 4.2)

Pure scheduler `src/services/audio/crossfade.ts`:

```ts
export function crossfadeGains(from: number[], to: number[], t01: number, duration = 2): number[] {
  // equal-power: g = cos/sin curves; per-layer gain
}
export function totalGainWithinCeiling(gains: number[]): boolean // sum <= loudest * 10^(3/20)
```

On emotion change, the service calls `scheduleCrossfade(currentLayerGains, nextLayerGains, 2.0)` which uses `linearRampToValueAtTime` on each layer gain (equal-power approximation over the ramp, mutually offset phases ensure the summed power never exceeds the loudest single layer by more than 3 dB — enforced by scaling the incoming curve by `min(1, ceiling / sum)`). Mute is the existing master-gain 0; no layer output passes it.

## 5. Cinematics (FR Area 5)

### 5.1 Easing controller (FR 5.1, 5.2, 5.3)

Pure module `src/game/cinematic/easing.ts`:

```ts
export function easeInOutCubic(t: number): number;
export interface CamMove { from: Vec3; to: Vec3; duration: number; t: number; }
export function stepCamMove(m: CamMove, dt: number): { pos: Vec3; done: boolean };
export function pushInTarget(from: Vec3, artifact: Vec3, reduction: number): Vec3
// new distance = current distance * (1 - reduction); direction preserved toward artifact
```

Presets module `src/game/cinematic/presets.ts` (per-context):

| Context | distance Δ | duration | lookAt offset | reduced-motion |
|---|---|---|---|---|
| interaction push-in | 0.25 (25%) | 1.5 s | artifact +0.5 y | Δ ≤ 0.10, or skip |
| decision hold | 0 | hold | player +1.1 y | residual drift only |
| ending drift | orbit 0.08 rad/s | continuous | player +1.2 y | static framing |

`Camera.tsx` gains a small mode state: `'follow' | 'push' | 'hold' | 'ending'`, driven by store selectors (`isInteractionPanelOpen && activeArtifact` ⇒ push toward that artifact, then hold while the choice list is open; `screen === 'ending'` ⇒ ending orbit). In `useFrame`:

```ts
if (mode === 'push' && !move.done) stepCamMove(...);          // cubic ease, 1–2 s
else if (mode === 'hold') currentPos += drift * 0.02 * dt;    // ≤2% frame width/s residual
else if (mode === 'ending') orbitAngle += 0.08 * dt;          // ≤0.1 rad/s
else /* follow */; // existing damped follow, untouched math
```

When the interaction resolves (panel closes), mode returns to `follow` and the existing damping pulls the camera home; damping (4.5) settles within 0.5 s. The existing `reducedMotion` lerp-rate override stays.

### 5.2 Character facing during panels (FR 5.5)

Covered in §1.5 — `faceTarget` is active exactly while the interaction panel is open, using the same `turnTau` smoothing.

### 5.3 Dialogue panel transitions (FR 5.4, OPTIONAL)

`StoryPanel.tsx`: wrap the panel in a keyed container that on new `node`/dialogue applies a one-shot fade/slide-in lasting ≤0.4 s. Note: `tailwindcss-animate` is NOT installed (`tailwind.config.js` has `plugins: []`; existing `animate-in` classes are inert), so the transition must be implemented as a ~10-line inline CSS `transition` with a mounted flag, or by adding the keyframes to `tailwind.config.js`'s `theme.extend.keyframes`/`animation` (config extension, not a new dependency). Composed before the typewriter starts (typewriter untouched). `reducedMotion` ⇒ fade-only.

## 6. Audio Immersion (FR Area 6)

### 6.1 Spatialized hums (FR 6.1)

`audio.ts` gains `attachHum(id: ArtifactType, position: Vec3)` / `updateHumPosition` / `detachHum(id)`:

- Per artifact: a low sine (clock 62 Hz, book 98 Hz, crystal 147 Hz with slow amplitude LFO) → `StereoPannerNode`/`PannerNode` (HRTF, ref distance 1, rolloff so it fades to inaudible by 15 u) → mood bus.
- `Objects.tsx` calls `updateHum(artifact, pos)` on mount; `World.tsx` passes player position each frame is unnecessary — the PannerNode works in listener space; instead set `ctx.listener` position from the camera once per second (cheap), and update panner positions only when an artifact moves (they don't; they're static).
- On `flags.clockWound` etc. (artifact resolved) or unmount, `detachHum` stops the oscillator and disconnects within one `useFrame`/effect cleanup (<0.5 s).

### 6.2 Interaction cues (FR 6.2)

Pure recipes in `src/services/audio/cues.ts` (each returns a schedule of {freq, type, envelope} events, <1.5 s):

- **Clock chime strike**: struck-bell FM pair (carrier 523 Hz, modulator 1046 Hz × decay), 1.2 s.
- **Book whoosh**: bandpass-swept noise (300→3 kHz over 0.5 s), soft, 0.7 s.
- **Crystal ping**: 880/1320/1760 Hz sines with exponential decays and a 0.4 s feedback delay, 1.2 s.

`Objects.tsx` triggers the matching cue on interaction open. Mute suppression via master gain (universal).

### 6.3 Location zones (FR 6.3, OPTIONAL)

`src/game/objects/positions.ts` (or `src/game/env/zones.ts`) declares ≤3 zones (center circle, north grove, southeast dais) as circles `{x, z, radius, layer: 'wind' | 'chimes' | ...}`. A pure `zoneAt(pos, zones)` returns the active zone; `World.tsx` checks it on player position updates (already flowing through state) and the service crossfades the zone layer in/out over 1.5 s with the same equal-power scheduler as §4.2.

### 6.4 Footstep materials (FR 6.4, OPTIONAL)

Zone declarations carry `material: 'stone' | 'grass' | 'default'`; the path/ plaza area is stone, the meadow is grass. The step event from §1.3 looks up the current material and passes it to `footstepEnvelope(material, running)` — by construction, a crossing that already fired uses the material sampled at the moment of firing, so a mid-stride boundary applies from the next foot-fall.

## 7. Post-Processing & Adaptive Quality

### 7.1 EffectComposer (NFR 1.1)

New `src/components/Postprocessing.tsx`:

```tsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export function Postprocessing({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <EffectComposer>
      <Bloom intensity={0.6} luminanceThreshold={0.9} luminanceSmoothing={0.3} mipmapBlur />
      <Vignette eskil={false} offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}
```

Threshold 0.9 means only emissive surfaces (crystal, glows, dial, particle cloud — additive and >0.9 luminance) bloom; the standard-lit terrain stays clean. Rendered inside the R3F Canvas in `src/components/ExplorationScreen.tsx` (where the Canvas actually lives), toggled by `settings.quality` and the FPS monitor. `reducedMotion` does not disable post-processing (it is not motion), but the ending drift and push-ins are reduced per §5.

### 7.2 FPS monitor (NFR 1.2)

`src/game/perf/fpsMonitor.ts` (pure):

```ts
export interface QualityTier { post: boolean; shadows: boolean; mist: boolean; leaves: boolean; fireflies: boolean; }
export const QUALITY_TIERS: Record<'low' | 'medium' | 'high', QualityTier>;
export function stepQuality(
  q: { fpsWindow: number[]; tier: QualityTier; lowSince: number | null },
  dt: number, fps: number
): typeof q
// rule: fps < 50 for 3 consecutive seconds ⇒ step down (shadows → mist/leaves → fireflies → post)
// fps > 58 for 10 s ⇒ step up one (max manual cap); tier remembered for session
```

A `PerfMonitor` R3F component samples frame times in one `useFrame` (rolling 60-frame average), steps the pure function, and writes the resulting tier to a module-level reactive store (a tiny Zustand slice or `useSyncExternalStore`) that components read. The manual toggle in `GameUI.tsx` (a small "FX" button next to mute) writes `quality: 'low' | 'medium' | 'high'` into `GameSettings` (session-scoped; optional persisted key, backward compatible with old saves). Auto-off below ~45 FPS for postprocessing is the lowest step of the ladder (post goes off at `low`).

## 8. Performance Budget

All numbers are caps enforced in constants and checked by the perf tier table:

| Resource | Low | Medium (default) | High |
|---|---|---|---|
| Shadow map | off | off (shadows = manual opt-in) | 1024², ≤12 casters |
| Post (Bloom+Vignette) | off | on | on |
| Scatter instances | 150 | 300 (3 sets) | 300 |
| Particle cloud (existing) | 380 (unchanged) | 380 | 380 |
| Falling leaves | 0 | 40 | 60 |
| Fireflies | 0 | 24 | 40 |
| Mist billboards | 0 | 16 | 30 |
| Crystal orbiters | 8 | 12 | 12 |
| Crystal burst | 60 (one-shot) | 60 | 60 |
| Water plane | off | 24×24 segs | 32×32 segs |
| Ambient layers active | 2 | 3 | 4 |

Frame-time cost estimate: base MVP ≈ 2 ms; scatter (3 extra draw calls) ≈ 0.2 ms; postprocessing ≈ 1.5 ms at 1080p integrated; shadows 1024² with 12 casters ≈ 1.2 ms; particle updates are existing-style JS loops (380 + ≤100 points ≈ 0.3 ms). Total ≈ 5 ms at medium, leaving headroom for 60 FPS on 2022 integrated GPUs.

## Testing Strategy

All new pure modules are unit-tested with Vitest (same `__tests__` convention):

- `src/game/player/__tests__/locomotion.test.ts` — run/walk/idle blend transitions, accel smoothing constants (speed asymptote, <5% walk speed within 0.4 s of release), shortest-path turning incl. ±180° wrap, phase-rate proportionality, idle head blend timing.
- `src/game/player/__tests__/footsteps.test.ts` — step events exactly on phase-boundary crossings, none while stationary, run envelope shorter/louder, material applied per foot-fall.
- `src/game/env/__tests__/wind.test.ts` — wind sampler bounded and deterministic; fog variation within ±15%; scatter placement outside colliders and within counts; leaf respawn bounds.
- `src/game/objects/__tests__/anim.test.ts` — burst fires exactly once per decision and re-arms; cover easing monotone/bounded ≤1.2 s; flutter stops ≤3 s; clock tremor sub-degree.
- `src/game/cinematic/__tests__/easing.test.ts` — push-in distance reduction ∈ [15%, 40%] (≤10% reduced-motion), hold drift ≤2%/s, ending orbit ≤0.1 rad/s, follow resumption ≤0.5 s.
- `src/services/audio/__tests__/crossfade.test.ts` — equal-power curves, 3 dB ceiling during overlap, layer start/stop on emotion change, footstep/cue envelopes — with a mocked WebAudio graph (a `MockAudioContext` with gain/param recorders, since jsdom has no WebAudio).
- `src/game/perf/__tests__/fpsMonitor.test.ts` — degradation order shadows → mist/leaves → fireflies → post after 3 s below 50 FPS; recovery; session memory.
- Existing suites (`src/story`, `src/ai`, `src/services/persistence`, `src/hooks`, `src/components`, `src/utils`) must pass unmodified — the design never touches `src/story`, `src/ai`, `api/`, or the persistence schema, so regressions there indicate an implementation bug, not a design change.
- Manual visual/perf checklist (committed as `docs/realism-checklist.md`): per-mood FPS reading, shadow auto-disable, reduced-motion per FR, mute per FR, per-artifact visual/audio behaviors, 60 FPS at medium in the most particle-dense mood (fear).

PBT is used for the universal properties below (≥100 iterations each); concrete examples (profile layer sets, cue durations, panel transition timing) are example-based.

## 10. File-Change Map

**New files** (all under `src/`, plus one dependency):

- `src/game/player/locomotion.ts`, `footsteps.ts`, `reactionPose.ts` (+ `__tests__`)
- `src/game/env/wind.ts`, `scatter.ts`, `fogModulation.ts`, `Wind.tsx`, `Leaves.tsx` (opt), `Mist.tsx` (opt), `Fireflies.tsx` (opt), `Water.tsx` (opt), `zones.ts` (opt) (+ `__tests__`)
- `src/game/objects/anim.ts`, `positions.ts` (+ `__tests__`)
- `src/game/cinematic/easing.ts`, `presets.ts` (+ `__tests__`)
- `src/game/perf/fpsMonitor.ts`, `PerfMonitor.tsx` (+ `__tests__`)
- `src/services/audio/layers.ts`, `crossfade.ts`, `cues.ts`, `hums.ts` (+ `__tests__` with mock WebAudio)
- `src/components/Postprocessing.tsx`
- `docs/realism-checklist.md`

**Modified files** (additive edits):

- `src/game/Player.tsx` — replace direct velocity with reducer; animation blend; footsteps; head look; reaction/facing; `castShadow` on group.
- `src/game/Camera.tsx` — mode state + eased moves/hold/ending orbit (existing follow math untouched).
- `src/game/Environment.tsx` — fog modulation, weather particle bias (opt), firefly layer (opt), thunder light boost hookup (opt), shadow config on dirLight.
- `src/game/World.tsx` — render Scatter/Wind/Water/Mist/Leaves components, `castShadow`/`receiveShadow` flags, sway-ref registration on trees, artifact positions export wiring.
- `src/game/Objects.tsx` — clock tremor/dial glow, book cover split + open/flutter, crystal pulse/orbiters/burst, hum attach/detach, cue triggers.
- `src/services/audio.ts` — additive: footstep API, hums, cues, weather layers, crossfade scheduler, tick; existing pad synthesis and mute untouched.
- `src/game/atmosphereProfiles.ts` — add optional `ambienceLayers`, `fireflies`, `isNight` fields with defaults for all 9 profiles (backward compatible).
- `src/hooks/useGameStore.ts` — add `quality` setting + toggle action (no changes to story/persistence flow; `GameSettings` gains an optional key).
- `src/components/GameUI.tsx` — quality toggle button.
- `src/components/StoryPanel.tsx` — optional panel transition wrapper (opt).
- `src/components/ExplorationScreen.tsx` (or wherever the Canvas lives) — mount `Postprocessing`, `PerfMonitor`.
- `package.json` — add `@react-three/postprocessing` (the single permitted dependency, pinned to a version compatible with R3F 8.17 / three 0.169, i.e., `@react-three/postprocessing@^2.16.x`).

**Forbidden**: `src/story/**`, `src/ai/**`, `api/**`, persistence schema changes, and the `emotionverse-mvp` spec directory.

## Error Handling

- **WebAudio unavailable / suspended**: all `audioService` methods already no-op safely on `initContext()` failure; new methods follow the same guard (try/catch around node creation, `null` checks on `ctx`). Crossfades check layer existence before ramping.
- **`@react-three/postprocessing` load failure / WebGL2 unavailable**: `Postprocessing.tsx` is feature-flagged by quality; if the composer throws on mount, an error boundary around it (inline try via `componentDidCatch`-style wrapper or a mounted-state guard) disables the effect for the session and logs once. The scene renders identically without it.
- **Delta spikes** (tab switch): every `useFrame` already clamps `dt` to 0.1 s; the new updaters (wind, leaves, mist, burst, camera moves) reuse the same clamp, so no position jumps or skipped burst resets.
- **Artifact hum cleanup**: `detachHum` is called from effect cleanup and from flag-change effects; double-detach is idempotent (node set removal by id).
- **Burst re-arm on reset**: `resetGame` re-creates `BurstState`; the guard `firedFor` prevents double bursts even if the decision event re-fires.
- **Old saves without `quality`**: defaults applied at load; missing optional profile fields fall back to built-in defaults so `ATMOSPHERE_PROFILES` lookups never return `undefined`.
- **Reduced-motion/mute escapes**: every amplitude constant is multiplied at the pure-module level, so no rendering path can bypass the reduction.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Locomotion speed smoothing is asymptotic and bounded

*For any* sequence of frame deltas and input states, the player's horizontal speed moves toward its target (0, walk, or run) monotonically-in-expectation via exponential smoothing, never exceeds the run speed, and *for any* release of all movement keys, the speed falls below 5% of walk speed within 0.4 s.

**Validates: Requirements 1.2**

### Property 2: Run mode scales speed and phase proportionally

*For any* input state where Shift and a movement key are held, the target speed is at least 1.6× walk speed and the walk-phase advancement rate is proportional to the ratio of current speed to walk speed; and for any mode change, swing amplitude is a continuous function of the blend factor with no discontinuity between idle, walk, and run.

**Validates: Requirements 1.1**

### Property 3: Shortest-path turning including the ±180° wrap

*For any* current facing angle and target heading, the smoothed rotation follows the shortest angular path (the applied delta never exceeds π in magnitude), and repeated stepping converges to the target; when facing an interacted artifact, convergence completes within 1 s.

**Validates: Requirements 1.6, 5.5**

### Property 4: Footsteps fire exactly on phase-boundary crossings

*For any* pair of consecutive walk-phase values, footstep events are emitted exactly at each multiple-of-π crossing occurring in the interval, at most one per boundary; *for any* stationary input sequence, no events are emitted; and *for any* running state, the envelope is shorter and louder than walking, with material (stone/grass/default) determined at the moment of the crossing.

**Validates: Requirements 1.3, 6.4**

### Property 5: Idle head look and reaction poses are bounded and reduced-motion-safe

*For any* time value, idle head yaw/pitch offsets stay within 15° total and blend to neutral within 0.3 s of input resuming; *for any* interaction trigger, the reaction pose envelope is zero at both endpoints, lasts under 0.5 s, and its amplitude under reduced motion is at most 30% of the full-motion amplitude.

**Validates: Requirements 1.4, 1.5**

### Property 6: Wind and sway amplitudes are bounded

*For any* time, the shared wind value lies in [-1, 1] and the resulting tree sway rotation never exceeds 3°, with reduced-motion sway at most 30% of full sway; falling leaves, mist, and fireflies hold static under reduced motion.

**Validates: Requirements 2.1, 2.2, 2.5, 2.6**

### Property 7: Fog modulation preserves base color and density band

*For any* time, the applied fog density lies within ±15% of the current profile's base density and the fog color equals the interpolated profile color.

**Validates: Requirements 2.3**

### Property 8: Scatter placement avoids colliders and respects caps

*For any* generated scatter set (deterministic in the seed), every instance lies outside all collider exclusion zones, inside world bounds, with at most 3 instanced sets totaling at most 300 instances.

**Validates: Requirements 2.7**

### Property 9: Shadow budget and auto-disable

*For any* frame-time sequence averaging below 50 FPS for 3 consecutive seconds while shadows are enabled, the shadow map is disabled and the fallback (unshadowed MVP lighting) produces no visual artifacts; the shadow map, when enabled, is at most 1024×1024 with at most 12 casters.

**Validates: Requirements 2.8** (also satisfies NFR 1.2's shadow clause)

### Property 10: Object animation envelopes are bounded and one-shot

*For any* time, the clock hand tremor oscillation stays below 1°; the book cover easing is monotone, reaches ≤90° within 1.2 s, and page flutter stops within 3 s (or is skipped entirely under reduced motion, with the cover snapping open); the crystal emissive pulse is sinusoidal around its base intensity with at most 12 orbiting particles.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 11: Crystal burst fires exactly once per decision and re-arms

*For any* sequence of decision triggers, the burst state machine emits at most one burst per distinct decision event, the burst expands at most 60 particles and fades within 2 s, and a state reset restores the armed state.

**Validates: Requirements 3.3**

### Property 12: Crossfades obey the equal-power 3 dB ceiling

*For any* pair of adjacent emotion states, the ambient layer crossfade completes within 2 s, uses equal-power curves, and at every moment during the overlap the total ambient gain is within 3 dB of the loudest single layer; and *for any* muted state, all layer gains (including one-shot cues) contribute zero output.

**Validates: Requirements 4.1, 4.2, 6.2** (mute clauses also cover NFR 2.2)

### Property 13: Camera easing moves are single, bounded, and reduced-motion-safe

*For any* interaction push-in, the camera's distance to the artifact is reduced by between 15% and 40% over 1–2 s with ease-in-out (monotone progress), the move occurs exactly once per interaction, control returns to follow within 0.5 s of resolution; under reduced motion the push is at most 10% or skipped; during a decision hold the residual drift is at most 2% of frame width per second; the ending orbit rate never exceeds 0.1 rad/s and is zero under reduced motion.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 14: Spatial hum lifecycle and attenuation

*For any* artifact presence state, a hum is attached while present, its panner position matches the artifact position, it is inaudible beyond 15 units, and within 0.5 s of the artifact's resolution the hum's nodes are stopped and disconnected.

**Validates: Requirements 6.1**

### Property 15: Adaptive quality degrades in the defined order

*For any* frame-time sequence, when FPS stays below 50 for 3 consecutive seconds the system disables optional features in the order shadows → mist/leaves → fireflies → post-processing, recovers upward only after sustained recovery, and remembers the resulting tier for the session; the manual toggle disables post-processing and shadows without a reload.

**Validates: Requirements 2.8** (shadows auto-disable; the degradation ladder, session memory, and manual toggle additionally satisfy NFR 1.2 and NFR 1.3)

### Property 16: Weather particle modulation stays within the existing budget

*For any* rain-declared or thunder-declared emotion, the existing particle cloud's speed and bias are modulated without exceeding the existing 380-point budget, and a thunder flash boosts directional light intensity only in sync with a rumble onset.

**Validates: Requirements 4.3**

(Non-executable requirements — no-regression NFR 3, single-dependency/procedural-only constraints NFR 4, and tiering NFR 5 — are enforced by the file-change map, review, and the existing suite passing; they carry no property. The panel transition timing, FR 5.4, is example-tested: transition ≤0.4 s, reduced-motion fade-only.)
