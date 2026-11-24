import { describe, it, expect } from 'vitest';
import { advance } from '../storyEngine';
import { getEnding, getEndingAtmosphereKey } from '../endings';
import { createInitialStoryState } from '../storyState';
import type { StoryState } from '../storyState';

describe('Story Endings Reachability & Exclusivity (Property 5)', () => {
  it('reaches RESTORATION through choice trace: wind clock -> trust book -> sacrifice self', () => {
    let state = createInitialStoryState('hope');

    // Act 1: Awakening & Clock
    state = advance(state, 'c_intro_faith');
    expect(state.node).toBe('n_clock');

    // Wind clock: clockWound = true, light = 1, resolve = 3
    state = advance(state, 'c_clock_wind');
    expect(state.node).toBe('n_clock_echo_wind');
    expect(state.flags.clockWound).toBe(true);
    expect(state.vars.light).toBe(1);

    state = advance(state, 'c_clock_wind_cont');
    expect(state.node).toBe('n_clock_after');

    state = advance(state, 'c_clock_after_cont');
    expect(state.node).toBe('n_midpoint');

    // Act 2: Living Book
    state = advance(state, 'c_midpoint_cont');
    expect(state.node).toBe('n_book');

    // Trust book: bookTrusted = true, memory = 2
    state = advance(state, 'c_book_trust');
    expect(state.node).toBe('n_book_echo_trust');
    expect(state.flags.bookTrusted).toBe(true);
    expect(state.vars.memory).toBe(2);

    state = advance(state, 'c_book_trust_cont');
    expect(state.node).toBe('n_book_after');

    state = advance(state, 'c_book_after_cont');
    expect(state.node).toBe('n_crossing');

    // Act 3: Last Crystal
    state = advance(state, 'c_crossing_cont');
    expect(state.node).toBe('n_crystal_intro');

    state = advance(state, 'c_crystal_intro_cont');
    expect(state.node).toBe('n_crystal');

    // Sacrifice self: requires memory >= 2; adds light +2 (total light = 3), does NOT set crystalShared
    state = advance(state, 'c_crystal_sacrifice');
    expect(state.node).toBe('n_end_restore');
    expect(state.vars.light).toBe(3);
    expect(state.flags.clockWound).toBe(true);
    expect(state.flags.crystalShared).toBe(false);

    // Compute ending
    const ending = getEnding(state);
    expect(ending).toBe('RESTORATION');
    expect(getEndingAtmosphereKey(ending)).toBe('end_restoration');
  });

  it('reaches TRANSFORMATION through choice trace: share the crystal', () => {
    let state = createInitialStoryState('curiosity');

    // Fast trace to crystal
    state = advance(state, 'c_intro_curious');
    state = advance(state, 'c_clock_leave');
    state = advance(state, 'c_clock_leave_cont');
    state = advance(state, 'c_clock_after_cont');
    state = advance(state, 'c_midpoint_cont');
    state = advance(state, 'c_book_partial');
    state = advance(state, 'c_book_partial_cont');
    state = advance(state, 'c_book_after_cont');
    state = advance(state, 'c_crossing_cont');
    state = advance(state, 'c_crystal_intro_cont');
    expect(state.node).toBe('n_crystal');

    // Share crystal: sets crystalShared = true, light +2
    state = advance(state, 'c_crystal_share');
    expect(state.node).toBe('n_end_transform');
    expect(state.flags.crystalShared).toBe(true);

    const ending = getEnding(state);
    expect(ending).toBe('TRANSFORMATION');
    expect(getEndingAtmosphereKey(ending)).toBe('end_transformation');
  });

  it('reaches DARKNESS through choice trace: leave clock, reject book, keep crystal', () => {
    let state = createInitialStoryState('fear');

    // Trace: uninspired/fearful path
    state = advance(state, 'c_intro_cautious');
    state = advance(state, 'c_clock_leave');
    state = advance(state, 'c_clock_leave_cont');
    state = advance(state, 'c_clock_after_cont');
    state = advance(state, 'c_midpoint_cont');
    state = advance(state, 'c_book_reject');
    state = advance(state, 'c_book_reject_cont');
    state = advance(state, 'c_book_after_cont');
    state = advance(state, 'c_crossing_cont');
    state = advance(state, 'c_crystal_intro_cont');
    expect(state.node).toBe('n_crystal');

    // Keep crystal: resolve -1, no crystalShared, light < 3
    state = advance(state, 'c_crystal_keep');
    expect(state.node).toBe('n_end_dark');

    const ending = getEnding(state);
    expect(ending).toBe('DARKNESS');
    expect(getEndingAtmosphereKey(ending)).toBe('end_darkness');
  });

  it('reaches DARKNESS through shatter choice when resolve is <= 0', () => {
    const lowResolveState: StoryState = {
      node: 'n_crystal',
      vars: { resolve: 0, memory: 0, light: 0 },
      flags: { clockWound: false, clockBroken: true, bookTrusted: false, crystalShared: false },
      emotion: 'fear',
    };

    const finalState = advance(lowResolveState, 'c_crystal_shatter');
    expect(finalState.node).toBe('n_end_dark');
    expect(getEnding(finalState)).toBe('DARKNESS');
  });

  it('guarantees TRANSFORMATION takes precedence over RESTORATION if crystal is shared', () => {
    // If state has light >= 3 and clockWound = true BUT also crystalShared = true,
    // TRANSFORMATION must take precedence per design.md rules
    const state: StoryState = {
      node: 'n_end_transform',
      vars: { resolve: 5, memory: 3, light: 4 },
      flags: { clockWound: true, clockBroken: false, bookTrusted: true, crystalShared: true },
      emotion: 'hope',
    };

    expect(getEnding(state)).toBe('TRANSFORMATION');
  });
});
