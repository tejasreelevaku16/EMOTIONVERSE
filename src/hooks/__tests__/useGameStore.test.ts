import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../useGameStore';
import { saveGame } from '../../services/persistence';

describe('Centralized Zustand Game Store (useGameStore)', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetGame();
  });

  it('initializes in landing screen state', () => {
    const state = useGameStore.getState();
    expect(state.screen).toBe('landing');
    expect(state.emotion).toBeNull();
    expect(state.node).toBe('n_intro');
  });

  it('startNewJourney initializes fresh story state and switches to exploration', () => {
    useGameStore.getState().startNewJourney('hope');

    const state = useGameStore.getState();
    expect(state.screen).toBe('exploration');
    expect(state.emotion).toBe('hope');
    expect(state.node).toBe('n_intro');
    expect(state.act).toBe(1);
    expect(state.vars.resolve).toBe(1);
    expect(state.choices.length).toBeGreaterThan(0);
    expect(state.atmosphereKey).toBe('hope');
  });

  it('makeChoice advances story node deterministically and updates variables & flags', () => {
    useGameStore.getState().startNewJourney('hope');

    // Make faith choice -> n_clock
    useGameStore.getState().makeChoice('c_intro_faith');
    expect(useGameStore.getState().node).toBe('n_clock');
    expect(useGameStore.getState().vars.resolve).toBe(2);

    // Make wind clock choice -> n_clock_echo_wind
    useGameStore.getState().makeChoice('c_clock_wind');
    const state = useGameStore.getState();
    expect(state.node).toBe('n_clock_echo_wind');
    expect(state.flags.clockWound).toBe(true);
    expect(state.vars.light).toBe(1);
    expect(state.lastReaction).toBe('CLOCK_WOUND_LIGHT');
  });

  it('continueJourney restores saved state from LocalStorage', () => {
    // Save mid-game state directly to LocalStorage
    saveGame({
      emotion: 'curiosity',
      storyNodeId: 'n_book',
      vars: { resolve: 3, memory: 1, light: 1 },
      flags: { clockWound: true, clockBroken: false, bookTrusted: false, crystalShared: false },
      settings: { muted: true, reducedMotion: false },
    });

    const success = useGameStore.getState().continueJourney();
    expect(success).toBe(true);

    const state = useGameStore.getState();
    expect(state.screen).toBe('exploration');
    expect(state.emotion).toBe('curiosity');
    expect(state.node).toBe('n_book');
    expect(state.act).toBe(2);
    expect(state.vars.resolve).toBe(3);
    expect(state.vars.memory).toBe(1);
    expect(state.flags.clockWound).toBe(true);
    expect(state.settings.muted).toBe(true);
    expect(state.choices.some((c) => c.id === 'c_book_trust')).toBe(true);
  });

  it('reaches ending and automatically transitions screen to ending', () => {
    useGameStore.getState().startNewJourney('curiosity');

    // Follow trace to crystal
    useGameStore.getState().makeChoice('c_intro_curious');
    useGameStore.getState().makeChoice('c_clock_leave');
    useGameStore.getState().makeChoice('c_clock_leave_cont');
    useGameStore.getState().makeChoice('c_clock_after_cont');
    useGameStore.getState().makeChoice('c_midpoint_cont');
    useGameStore.getState().makeChoice('c_book_partial');
    useGameStore.getState().makeChoice('c_book_partial_cont');
    useGameStore.getState().makeChoice('c_book_after_cont');
    useGameStore.getState().makeChoice('c_crossing_cont');
    useGameStore.getState().makeChoice('c_crystal_intro_cont');

    expect(useGameStore.getState().node).toBe('n_crystal');

    // Share crystal -> Transformation ending
    useGameStore.getState().makeChoice('c_crystal_share');

    const finalState = useGameStore.getState();
    expect(finalState.node).toBe('n_end_transform');
    expect(finalState.screen).toBe('ending');
    expect(finalState.atmosphereKey).toBe('end_transformation');
  });

  it('setAiEnrichment updates UI display text without altering story state', () => {
    useGameStore.getState().startNewJourney('hope');

    const varsBefore = { ...useGameStore.getState().vars };
    const flagsBefore = { ...useGameStore.getState().flags };

    useGameStore.getState().setAiEnrichment('Evocative AI line.', 'AI hint.');

    const stateAfter = useGameStore.getState();
    expect(stateAfter.activeDialogue).toBe('Evocative AI line.');
    expect(stateAfter.activeHint).toBe('AI hint.');
    // Authoritative story state is untouched
    expect(stateAfter.vars).toEqual(varsBefore);
    expect(stateAfter.flags).toEqual(flagsBefore);
    expect(stateAfter.node).toBe('n_intro');
  });

  it('toggleMute and toggleReducedMotion update settings slice correctly', () => {
    expect(useGameStore.getState().settings.muted).toBe(false);
    useGameStore.getState().toggleMute();
    expect(useGameStore.getState().settings.muted).toBe(true);

    expect(useGameStore.getState().settings.reducedMotion).toBe(false);
    useGameStore.getState().toggleReducedMotion();
    expect(useGameStore.getState().settings.reducedMotion).toBe(true);
  });

  it('openArtifactPanel and closeArtifactPanel toggle artifact modal state', () => {
    expect(useGameStore.getState().isInteractionPanelOpen).toBe(false);

    useGameStore.getState().openArtifactPanel('clock');
    expect(useGameStore.getState().isInteractionPanelOpen).toBe(true);
    expect(useGameStore.getState().activeArtifact).toBe('clock');

    useGameStore.getState().closeArtifactPanel();
    expect(useGameStore.getState().isInteractionPanelOpen).toBe(false);
    expect(useGameStore.getState().activeArtifact).toBeNull();
  });
});
