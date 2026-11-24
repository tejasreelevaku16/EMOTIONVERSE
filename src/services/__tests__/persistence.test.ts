import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGame,
  loadGame,
  hasSavedGame,
  clearSavedGame,
  isValidSaveBlob,
  SAVE_KEY,
  CURRENT_SCHEMA_VERSION,
} from '../persistence';
import type { SaveBlob } from '../persistence';

describe('Persistence Service (Property 8: Save/Load Round-Trip & Corruption Safety)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a valid game state round-trip with exact fidelity', () => {
    const testData = {
      emotion: 'hope' as const,
      storyNodeId: 'n_clock',
      vars: { resolve: 3, memory: 1, light: 1 },
      flags: { clockWound: true, clockBroken: false, bookTrusted: false, crystalShared: false },
      settings: { muted: false, reducedMotion: true },
    };

    const saved = saveGame(testData);
    expect(saved).toBe(true);
    expect(hasSavedGame()).toBe(true);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    if (loaded) {
      expect(loaded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(loaded.emotion).toBe('hope');
      expect(loaded.storyNodeId).toBe('n_clock');
      expect(loaded.vars).toEqual(testData.vars);
      expect(loaded.flags).toEqual(testData.flags);
      expect(loaded.settings).toEqual(testData.settings);
      expect(typeof loaded.savedAt).toBe('number');
    }
  });

  it('safely handles and purges malformed JSON without throwing or crashing', () => {
    localStorage.setItem(SAVE_KEY, '{ invalid_json: unclosed bracket');

    expect(() => {
      const loaded = loadGame();
      expect(loaded).toBeNull();
    }).not.toThrow();

    // Verify corrupted key was purged
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(hasSavedGame()).toBe(false);
  });

  it('safely rejects and purges saves with unknown schema version', () => {
    const outdatedBlob = {
      schemaVersion: 999, // Incompatible future/past version
      emotion: 'hope',
      storyNodeId: 'n_clock',
      vars: { resolve: 1, memory: 0, light: 0 },
      flags: { clockWound: false, clockBroken: false, bookTrusted: false, crystalShared: false },
      settings: { muted: false, reducedMotion: false },
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(outdatedBlob));

    const loaded = loadGame();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('safely rejects saves with missing required properties or bad types', () => {
    const missingVars = {
      schemaVersion: 1,
      emotion: 'hope',
      storyNodeId: 'n_clock',
      // vars is missing
      flags: { clockWound: false, clockBroken: false, bookTrusted: false, crystalShared: false },
      settings: { muted: false, reducedMotion: false },
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(missingVars));
    expect(loadGame()).toBeNull();

    const badEmotion = {
      schemaVersion: 1,
      emotion: 'rage', // invalid emotion
      storyNodeId: 'n_clock',
      vars: { resolve: 1, memory: 0, light: 0 },
      flags: { clockWound: false, clockBroken: false, bookTrusted: false, crystalShared: false },
      settings: { muted: false, reducedMotion: false },
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(badEmotion));
    expect(loadGame()).toBeNull();
  });

  it('clearSavedGame() cleanly purges storage', () => {
    saveGame({
      emotion: 'curiosity',
      storyNodeId: 'n_intro',
      vars: { resolve: 1, memory: 0, light: 0 },
      flags: { clockWound: false, clockBroken: false, bookTrusted: false, crystalShared: false },
      settings: { muted: false, reducedMotion: false },
    });
    expect(hasSavedGame()).toBe(true);

    clearSavedGame();
    expect(hasSavedGame()).toBe(false);
    expect(loadGame()).toBeNull();
  });

  it('isValidSaveBlob correctly validates full schema shape', () => {
    const validBlob: SaveBlob = {
      schemaVersion: 1,
      emotion: 'fear',
      storyNodeId: 'n_crystal',
      vars: { resolve: 2, memory: 1, light: 0 },
      flags: { clockWound: false, clockBroken: true, bookTrusted: false, crystalShared: false },
      settings: { muted: true, reducedMotion: false },
      savedAt: 1234567890,
    };
    expect(isValidSaveBlob(validBlob)).toBe(true);
    expect(isValidSaveBlob(null)).toBe(false);
    expect(isValidSaveBlob([])).toBe(false);
    expect(isValidSaveBlob({ schemaVersion: 1 })).toBe(false);
  });
});
