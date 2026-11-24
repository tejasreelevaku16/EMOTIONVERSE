// LocalStorage Persistence Service (FR-9 & Property 8)
// Pure TypeScript service for saving, loading, validating, and clearing game progress.

import type { Emotion, StoryVars, StoryFlags } from '../story/storyState';

export const SAVE_KEY = 'emotionverse_save_v1';
export const CURRENT_SCHEMA_VERSION = 1;

export interface GameSettings {
  muted: boolean;
  reducedMotion: boolean;
}

export interface SaveBlob {
  schemaVersion: 1;
  emotion: Emotion;
  storyNodeId: string;
  vars: StoryVars;
  flags: StoryFlags;
  settings: GameSettings;
  savedAt: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  reducedMotion: false,
};

/**
 * Validates whether an unknown object adheres strictly to the SaveBlob schema.
 */
export function isValidSaveBlob(obj: unknown): obj is SaveBlob {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const blob = obj as Record<string, unknown>;

  // Schema version must match exactly
  if (blob.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return false;
  }

  // Emotion validation
  if (!['hope', 'sadness', 'curiosity', 'fear'].includes(blob.emotion as string)) {
    return false;
  }

  // Story node ID validation
  if (typeof blob.storyNodeId !== 'string' || blob.storyNodeId.trim() === '') {
    return false;
  }

  // Variables validation
  const vars = blob.vars as Record<string, unknown> | undefined;
  if (
    !vars ||
    typeof vars.resolve !== 'number' ||
    typeof vars.memory !== 'number' ||
    typeof vars.light !== 'number'
  ) {
    return false;
  }

  // Flags validation
  const flags = blob.flags as Record<string, unknown> | undefined;
  if (
    !flags ||
    typeof flags.clockWound !== 'boolean' ||
    typeof flags.clockBroken !== 'boolean' ||
    typeof flags.bookTrusted !== 'boolean' ||
    typeof flags.crystalShared !== 'boolean'
  ) {
    return false;
  }

  // Settings validation
  const settings = blob.settings as Record<string, unknown> | undefined;
  if (
    !settings ||
    typeof settings.muted !== 'boolean' ||
    typeof settings.reducedMotion !== 'boolean'
  ) {
    return false;
  }

  // SavedAt timestamp validation
  if (typeof blob.savedAt !== 'number' || isNaN(blob.savedAt)) {
    return false;
  }

  return true;
}

/**
 * Saves current game state to LocalStorage.
 * Safe against storage quota errors.
 */
export function saveGame(
  data: Omit<SaveBlob, 'schemaVersion' | 'savedAt'>
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const blob: SaveBlob = {
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
    return true;
  } catch {
    // Gracefully handle storage quota or private-browsing errors
    return false;
  }
}

/**
 * Loads game state from LocalStorage.
 * If data is missing, corrupted, or of an invalid version,
 * it safely purges the invalid entry and returns null without throwing.
 */
export function loadGame(): SaveBlob | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (isValidSaveBlob(parsed)) {
      return parsed;
    }

    // Invalid schema or corrupted save -> purge and start fresh
    window.localStorage.removeItem(SAVE_KEY);
    return null;
  } catch {
    // Malformed JSON parse failure -> purge safely
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Ignore storage errors
    }
    return null;
  }
}

/**
 * Returns whether a valid saved journey exists in LocalStorage.
 */
export function hasSavedGame(): boolean {
  return loadGame() !== null;
}

/**
 * Clears saved game progress (called on New Journey confirm or Ending restart).
 */
export function clearSavedGame(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore errors
  }
}
