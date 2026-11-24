// Pure TypeScript Ending Computation (HR-1: No React, Three.js, or DOM dependencies)

import type { StoryState, EndingType } from './storyState';

/**
 * Computes the game's ending from the current story state.
 * Evaluated strictly in order:
 * 1. TRANSFORMATION: crystal was freely shared with the world.
 * 2. RESTORATION: light >= 3, clock was wound, and crystal was not shared (giving of self).
 * 3. DARKNESS: otherwise (fading light could not be saved).
 */
export function getEnding(state: StoryState): EndingType {
  // 1. TRANSFORMATION: checked first so a shared crystal leads to renewal
  if (state.flags.crystalShared) {
    return 'TRANSFORMATION';
  }

  // 2. RESTORATION: ancient order restored through devotion and sacrifice
  if (state.vars.light >= 3 && state.flags.clockWound && !state.flags.crystalShared) {
    return 'RESTORATION';
  }

  // 3. DARKNESS: light fades into eternal ember
  return 'DARKNESS';
}

export function getEndingAtmosphereKey(ending: EndingType): 'end_restoration' | 'end_transformation' | 'end_darkness' {
  switch (ending) {
    case 'RESTORATION':
      return 'end_restoration';
    case 'TRANSFORMATION':
      return 'end_transformation';
    case 'DARKNESS':
      return 'end_darkness';
  }
}
