import { describe, it, expect } from 'vitest';
import {
  advance,
  availableChoices,
  getNode,
  isTerminalNode,
  InvalidChoiceError,
} from '../storyEngine';
import { STORY_NODES } from '../storyData';
import { createInitialStoryState } from '../storyState';
import type { StoryState } from '../storyState';

describe('Story Engine & Graph Integrity (Phase 1)', () => {
  it('loads all defined story nodes and verifies there are no broken links', () => {
    const nodeIds = Object.keys(STORY_NODES);
    expect(nodeIds.length).toBeGreaterThanOrEqual(15);
    expect(getNode('n_intro')).toBeDefined();

    // Every choice in every node must point to a valid node
    for (const [nodeId, node] of Object.entries(STORY_NODES)) {
      expect(node.id).toBe(nodeId);
      expect(node.fallback.dialogue.length).toBeGreaterThan(0);
      expect(node.fallback.hintLadder).toHaveLength(3);

      for (const choice of node.choices) {
        expect(
          STORY_NODES[choice.next],
          `Node '${nodeId}' has choice '${choice.id}' pointing to non-existent node '${choice.next}'`
        ).toBeDefined();
      }
    }
  });

  it('Property 3: Story engine is purely deterministic', () => {
    const stateA = createInitialStoryState('hope');
    const stateB = createInitialStoryState('hope');

    const nextA = advance(stateA, 'c_intro_faith');
    const nextB = advance(stateB, 'c_intro_faith');

    expect(nextA).toEqual(nextB);
    expect(nextA.vars).toEqual(nextB.vars);
    expect(nextA.flags).toEqual(nextB.flags);
  });

  it('Property 4: Variable updates and flag setting are exact', () => {
    let state: StoryState = {
      node: 'n_clock',
      vars: { resolve: 1, memory: 0, light: 0 },
      flags: { clockWound: false, clockBroken: false, bookTrusted: false, crystalShared: false },
      emotion: 'hope',
    };

    // Wind choice awards: resolve +2, light +1, flag: clockWound = true
    state = advance(state, 'c_clock_wind');

    expect(state.node).toBe('n_clock_echo_wind');
    expect(state.vars.resolve).toBe(3);
    expect(state.vars.light).toBe(1);
    expect(state.vars.memory).toBe(0);
    expect(state.flags.clockWound).toBe(true);
    expect(state.flags.clockBroken).toBe(false);
  });

  it('Property 4: Gated choices are filtered in availableChoices and rejected by advance()', () => {
    // n_crystal has c_crystal_sacrifice gated on memory >= 2
    const lowMemoryState: StoryState = {
      node: 'n_crystal',
      vars: { resolve: 3, memory: 1, light: 1 },
      flags: { clockWound: true, clockBroken: false, bookTrusted: false, crystalShared: false },
      emotion: 'hope',
    };

    const choicesLow = availableChoices(lowMemoryState);
    expect(choicesLow.some((c) => c.id === 'c_crystal_sacrifice')).toBe(false);

    expect(() => advance(lowMemoryState, 'c_crystal_sacrifice')).toThrow(InvalidChoiceError);

    const highMemoryState: StoryState = {
      ...lowMemoryState,
      vars: { ...lowMemoryState.vars, memory: 2 },
    };

    const choicesHigh = availableChoices(highMemoryState);
    expect(choicesHigh.some((c) => c.id === 'c_crystal_sacrifice')).toBe(true);

    const advanced = advance(highMemoryState, 'c_crystal_sacrifice');
    expect(advanced.node).toBe('n_end_restore');
  });

  it('throws InvalidChoiceError for invalid choice IDs', () => {
    const state = createInitialStoryState('curiosity');
    expect(() => advance(state, 'non_existent_choice_id')).toThrow(InvalidChoiceError);
  });

  it('Property 10: Every node defines a complete 3-tier hint ladder', () => {
    for (const [id, node] of Object.entries(STORY_NODES)) {
      const [nudge, strong, explicit] = node.fallback.hintLadder;
      expect(typeof nudge, `Node ${id} missing nudge`).toBe('string');
      expect(typeof strong, `Node ${id} missing strong hint`).toBe('string');
      expect(typeof explicit, `Node ${id} missing explicit hint`).toBe('string');
      expect(nudge.length).toBeGreaterThan(0);
      expect(strong.length).toBeGreaterThan(0);
      expect(explicit.length).toBeGreaterThan(0);
    }
  });

  it('verifies emotion-specific choices exist across the acts', () => {
    // In Act 1 n_intro:
    const fearIntroChoices = availableChoices({ ...createInitialStoryState('fear') });
    expect(fearIntroChoices.some((c) => c.id === 'c_intro_cautious')).toBe(true);

    const sadnessIntroChoices = availableChoices({ ...createInitialStoryState('sadness') });
    expect(sadnessIntroChoices.some((c) => c.id === 'c_intro_mourn')).toBe(true);

    // In Act 2 n_book:
    const hopeBookState: StoryState = {
      node: 'n_book',
      vars: { resolve: 1, memory: 0, light: 0 },
      flags: { clockWound: false, clockBroken: false, bookTrusted: false, crystalShared: false },
      emotion: 'hope',
    };
    const hopeBookChoices = availableChoices(hopeBookState);
    expect(hopeBookChoices.some((c) => c.id === 'c_book_hope_comfort')).toBe(true);

    const sadnessBookChoices = availableChoices({ ...hopeBookState, emotion: 'sadness' });
    expect(sadnessBookChoices.some((c) => c.id === 'c_book_sadness_share')).toBe(true);
  });

  it('correctly identifies terminal nodes', () => {
    expect(isTerminalNode('n_end_restore')).toBe(true);
    expect(isTerminalNode('n_end_transform')).toBe(true);
    expect(isTerminalNode('n_end_dark')).toBe(true);
    expect(isTerminalNode('n_intro')).toBe(false);
  });
});
