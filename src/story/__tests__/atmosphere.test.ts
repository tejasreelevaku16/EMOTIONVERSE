import { describe, it, expect } from 'vitest';
import {
  ATMOSPHERE_PROFILES,
  interpolateAtmosphere,
} from '../../game/atmosphereProfiles';
import type { AtmosphereKey } from '../../game/atmosphereProfiles';
import { applyReactionModifier } from '../../game/reactions';
import type { Emotion } from '../storyState';

describe('Atmosphere Profiles & Transitions (Properties 1, 2, 6)', () => {
  const EMOTIONS: Emotion[] = ['hope', 'sadness', 'curiosity', 'fear'];
  const REQUIRED_KEYS: AtmosphereKey[] = [
    'hope',
    'sadness',
    'curiosity',
    'fear',
    'midpoint',
    'act3',
    'end_restoration',
    'end_transformation',
    'end_darkness',
  ];

  it('Property 1: Atmosphere mapping is complete for all required keys', () => {
    for (const key of REQUIRED_KEYS) {
      const profile = ATMOSPHERE_PROFILES[key];
      expect(profile, `Profile for '${key}' must exist`).toBeDefined();
      expect(profile.skyColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(profile.fogColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(profile.sunColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(profile.particleColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof profile.fogDensity).toBe('number');
      expect(typeof profile.sunIntensity).toBe('number');
      expect(typeof profile.ambient).toBe('number');
      expect(profile.particleMode).toBeDefined();
      expect(profile.flowerState).toBeDefined();
      expect(profile.audioMood).toBeDefined();
    }
  });

  it('Property 1: The four emotion baseline profiles are pairwise distinct', () => {
    for (let i = 0; i < EMOTIONS.length; i++) {
      for (let j = i + 1; j < EMOTIONS.length; j++) {
        const emoA = EMOTIONS[i];
        const emoB = EMOTIONS[j];
        const profA = ATMOSPHERE_PROFILES[emoA];
        const profB = ATMOSPHERE_PROFILES[emoB];

        // Must be pairwise distinct in skyColor, particleMode, and audioMood
        expect(
          profA.skyColor,
          `${emoA} and ${emoB} must have different skyColor`
        ).not.toBe(profB.skyColor);

        expect(
          profA.particleMode,
          `${emoA} and ${emoB} must have different particleMode`
        ).not.toBe(profB.particleMode);

        expect(
          profA.audioMood,
          `${emoA} and ${emoB} must have different audioMood`
        ).not.toBe(profB.audioMood);
      }
    }
  });

  it('Property 2: Atmosphere transitions interpolate smoothly', () => {
    const profA = ATMOSPHERE_PROFILES.hope;
    const profB = ATMOSPHERE_PROFILES.fear;

    // t = 0
    const start = interpolateAtmosphere(profA, profB, 0);
    expect(start.sunIntensity).toBeCloseTo(profA.sunIntensity);
    expect(start.ambient).toBeCloseTo(profA.ambient);
    expect(start.particleMode).toBe(profA.particleMode);

    // t = 0.5 (midpoint)
    const mid = interpolateAtmosphere(profA, profB, 0.5);
    const expectedSun = (profA.sunIntensity + profB.sunIntensity) / 2;
    expect(mid.sunIntensity).toBeCloseTo(expectedSun);
    expect(mid.particleMode).toBe(profB.particleMode); // Switches to target mode at t >= 0.5

    // t = 1
    const end = interpolateAtmosphere(profA, profB, 1);
    expect(end.sunIntensity).toBeCloseTo(profB.sunIntensity);
    expect(end.ambient).toBeCloseTo(profB.ambient);
  });

  it('Property 6: Decision reaction events modify atmosphere parameters correctly', () => {
    const base = ATMOSPHERE_PROFILES.hope;

    // Clock wound reaction brightens sun and ambient
    const brightened = applyReactionModifier(base, 'CLOCK_WOUND_LIGHT');
    expect(brightened.sunIntensity).toBeGreaterThan(base.sunIntensity);
    expect(brightened.ambient).toBeGreaterThan(base.ambient);

    // Book trusted reaction blooms flowers
    const bloomed = applyReactionModifier(ATMOSPHERE_PROFILES.sadness, 'BOOK_TRUSTED_BLOOM');
    expect(bloomed.flowerState).toBe('blooming');

    // Crystal shared reaction sets radiant flowers and firefly particles
    const transformed = applyReactionModifier(ATMOSPHERE_PROFILES.fear, 'CRYSTAL_SHARED_BLOOM');
    expect(transformed.flowerState).toBe('radiant');
    expect(transformed.particleMode).toBe('firefly');
    expect(transformed.sunIntensity).toBeGreaterThan(ATMOSPHERE_PROFILES.fear.sunIntensity);
  });
});
