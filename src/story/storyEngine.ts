// Pure TypeScript Story Engine (HR-1: No React, Three.js, or DOM dependencies)

import type { StoryState, Choice, StoryNode } from './storyState';
import { STORY_NODES } from './storyData';

export class InvalidChoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidChoiceError';
  }
}

/**
 * Returns the story node definition for a given node ID.
 */
export function getNode(nodeId: string): StoryNode | undefined {
  return STORY_NODES[nodeId];
}

/**
 * Determines whether a given node is terminal (an ending with no outgoing choices).
 */
export function isTerminalNode(nodeId: string): boolean {
  const node = STORY_NODES[nodeId];
  return !node || node.choices.length === 0;
}

/**
 * Computes all currently selectable choices for the active story state,
 * filtering out any choices whose gating conditions evaluate to false.
 */
export function availableChoices(state: StoryState): Choice[] {
  const currentNode = STORY_NODES[state.node];
  if (!currentNode) {
    return [];
  }

  return currentNode.choices.filter((choice) => {
    if (!choice.gate) {
      return true;
    }
    return choice.gate(state.vars, state.flags, state.emotion);
  });
}

/**
 * Advances the story state deterministically by applying a choice.
 * Pure function: given the exact same (state, choiceId), it always returns the exact same new state.
 * Throws InvalidChoiceError if the choice is not valid or fails gating.
 */
export function advance(state: StoryState, choiceId: string): StoryState {
  const currentNode = STORY_NODES[state.node];
  if (!currentNode) {
    throw new InvalidChoiceError(`Story node '${state.node}' does not exist in graph.`);
  }

  const choice = currentNode.choices.find((c) => c.id === choiceId);
  if (!choice) {
    throw new InvalidChoiceError(
      `Choice '${choiceId}' is not valid for story node '${state.node}'.`
    );
  }

  if (choice.gate && !choice.gate(state.vars, state.flags, state.emotion)) {
    throw new InvalidChoiceError(
      `Choice '${choiceId}' is currently locked by gating conditions.`
    );
  }

  const targetNode = STORY_NODES[choice.next];
  if (!targetNode) {
    throw new InvalidChoiceError(
      `Choice '${choiceId}' references non-existent target node '${choice.next}'.`
    );
  }

  // Calculate new variables with pure numeric addition
  const newVars = {
    resolve: state.vars.resolve + (choice.effects?.resolve ?? 0),
    memory: state.vars.memory + (choice.effects?.memory ?? 0),
    light: state.vars.light + (choice.effects?.light ?? 0),
  };

  // Merge any flag updates
  const newFlags = {
    ...state.flags,
    ...(choice.setFlags ?? {}),
  };

  return {
    node: choice.next,
    vars: newVars,
    flags: newFlags,
    emotion: state.emotion,
  };
}
