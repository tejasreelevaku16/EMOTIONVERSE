// Guaranteed Offline Fallback Responses (HR-1: Pure TypeScript)

import { STORY_NODES } from '../story/storyData';
import type { Emotion } from '../story/storyState';
import type { AiDialogueResponse } from './responseValidator';

/**
 * Retrieves the hand-crafted fallback dialogue array for a story node.
 */
export function getFallbackDialogue(nodeId: string): string[] {
  const node = STORY_NODES[nodeId];
  if (node && node.fallback.dialogue.length > 0) {
    return node.fallback.dialogue;
  }
  return ['The ancient light wavers in the quiet realm...'];
}

/**
 * Retrieves the fallback hint for a given node and escalation tier (0: nudge, 1: strong, 2: explicit).
 */
export function getFallbackHint(nodeId: string, tier: 0 | 1 | 2 = 0): string {
  const node = STORY_NODES[nodeId];
  if (node && node.fallback.hintLadder) {
    const clampedTier = Math.min(Math.max(tier, 0), 2) as 0 | 1 | 2;
    return node.fallback.hintLadder[clampedTier];
  }
  return 'Explore the sanctuary and look for interactive artifacts.';
}

/**
 * Constructs a complete AiDialogueResponse object from fallback data.
 * Guarantees zero user-visible errors and full offline gameplay continuity.
 */
export function getFallbackResponse(
  nodeId: string,
  emotion: Emotion,
  tier: 0 | 1 | 2 = 0
): AiDialogueResponse {
  const dialogueLines = getFallbackDialogue(nodeId);
  const hint = getFallbackHint(nodeId, tier);

  return {
    dialogue: dialogueLines.join(' '),
    hint,
    mood: emotion,
  };
}
