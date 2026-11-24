# Phase 3: Centralized State Management & Persistence

## Overview
Phase 3 establishes the centralized state and persistence architecture for **EMOTIONVERSE: THE LAST LIGHT** as specified in Kiro's `requirements.md` (FR-9) and `design.md`.

## Core Components
1. **Centralized Zustand Store (`src/hooks/useGameStore.ts`):**
   - Unifies the pure TypeScript story engine, atmosphere controller, settings, and UI presentation slices.
   - Slices:
     - `screen`: `'landing' | 'emotion_selection' | 'exploration' | 'ending'`
     - `emotion`: `Emotion | null`
     - `story`: `node`, `vars` (`resolve`, `memory`, `light`), `flags` (`clockWound`, `clockBroken`, `bookTrusted`, `crystalShared`), `act: 1 | 2 | 3`
     - `choices`: `Choice[]` filtered through gating
     - `atmosphereKey`: Active atmosphere profile key
     - `lastReaction`: ReactionKey emitted by the last choice (e.g. `CLOCK_WOUND_LIGHT`)
     - `settings`: `muted: boolean`, `reducedMotion: boolean`
     - `ui / ai presentation`: `activeDialogue`, `activeHint`, `hintTier`, `isAiLoading`, `isInteractionPanelOpen`, `activeArtifact`
   - Actions:
     - `startNewJourney(emotion)`: Resets storage, initializes state, and transitions to exploration.
     - `continueJourney()`: Restores persisted state with exact variables, flags, choices, and atmosphere.
     - `makeChoice(choiceId)`: Evaluates choice via pure deterministic engine, emits reaction, updates atmosphere, and checks terminal ending state.
     - `setAiEnrichment(dialogue, hint)`: Strictly updates UI presentation text without mutating story variables or flags (HR-2).
     - `resetGame()`: Clears storage and returns to landing.
   - Automatically debounces state saves to ~300ms on state changes.

2. **Persistence Service (`src/services/persistence.ts`):**
   - Implements `SaveBlob` schema version 1.
   - Schema validation via `isValidSaveBlob(raw)`.
   - Error resilience: If save data is malformed, corrupted, or of an unknown version, `loadGame()` purges the corrupt key and returns `null` safely without throwing (Property 8).
   - Functions: `saveGame()`, `loadGame()`, `hasSavedGame()`, `clearSavedGame()`.

## Verification & Test Results
- `src/services/__tests__/persistence.test.ts` (6 tests): Round-trip exactness, corrupted JSON safety, schema version mismatch rejection, missing field recovery, clear storage.
- `src/hooks/__tests__/useGameStore.test.ts` (8 tests): State initialization, deterministic progression, reaction emissions, terminal ending transition, save/restore round-trip, AI state immunity, settings toggles.
- Total Vitest tests: 48 passed across 7 test suites.
- Strict Typecheck (`npx tsc --noEmit`): 0 errors.
- ESLint check (`npx eslint src`): 0 warnings.
- Production Build (`npm run build`): Clean build in 1.00s.
