// Reaction Modifiers & Atmosphere Events

import type { ReactionKey } from '../story/storyState';
import type { AtmosphereProfile } from './atmosphereProfiles';
import { clamp } from '../utils/math';

export interface AtmosphereModifier {
  sunIntensityDelta?: number;
  ambientDelta?: number;
  fogDensityDelta?: number;
  flowerStateOverride?: AtmosphereProfile['flowerState'];
  particleModeOverride?: AtmosphereProfile['particleMode'];
}

export const REACTION_MODIFIERS: Record<ReactionKey, AtmosphereModifier> = {
  // When the clock is wound: progressive world brightening
  CLOCK_WOUND_LIGHT: {
    sunIntensityDelta: 0.6,
    ambientDelta: 0.25,
    fogDensityDelta: -0.01,
  },
  // When the book is trusted: flowers bloom throughout the grove
  BOOK_TRUSTED_BLOOM: {
    sunIntensityDelta: 0.25,
    ambientDelta: 0.15,
    flowerStateOverride: 'blooming',
  },
  // When the crystal is shared: radiant bloom of luminescent particles
  CRYSTAL_SHARED_BLOOM: {
    sunIntensityDelta: 0.8,
    ambientDelta: 0.35,
    flowerStateOverride: 'radiant',
    particleModeOverride: 'firefly',
  },
  // Act Transitions
  ACT_2: {
    ambientDelta: 0.05,
  },
  ACT_3: {
    fogDensityDelta: 0.01,
  },
  // Endings
  ENDING_RESTORE: {
    sunIntensityDelta: 1.0,
    ambientDelta: 0.4,
    flowerStateOverride: 'radiant',
    particleModeOverride: 'firefly',
  },
  ENDING_TRANSFORM: {
    sunIntensityDelta: 0.9,
    ambientDelta: 0.35,
    flowerStateOverride: 'radiant',
    particleModeOverride: 'firefly',
  },
  ENDING_DARK: {
    sunIntensityDelta: -0.5,
    ambientDelta: -0.2,
    flowerStateOverride: 'withered',
    particleModeOverride: 'ember',
  },
};

/**
 * Applies an additive reaction modifier on top of an atmosphere profile.
 */
export function applyReactionModifier(
  base: AtmosphereProfile,
  reaction: ReactionKey
): AtmosphereProfile {
  const mod = REACTION_MODIFIERS[reaction];
  if (!mod) {
    return base;
  }

  return {
    ...base,
    sunIntensity: clamp(base.sunIntensity + (mod.sunIntensityDelta ?? 0), 0.1, 4.0),
    ambient: clamp(base.ambient + (mod.ambientDelta ?? 0), 0.05, 1.0),
    fogDensity: clamp(base.fogDensity + (mod.fogDensityDelta ?? 0), 0.005, 0.1),
    flowerState: mod.flowerStateOverride ?? base.flowerState,
    particleMode: mod.particleModeOverride ?? base.particleMode,
  };
}
