// Atmosphere Profiles & Interpolation (HR-1 / 3D Game Foundation)

import { lerp, lerpColor, clamp } from '../utils/math';
import type { Emotion } from '../story/storyState';

export type AtmosphereKey =
  | Emotion
  | 'midpoint'
  | 'act3'
  | 'end_restoration'
  | 'end_transformation'
  | 'end_darkness';

export type ParticleMode = 'ember' | 'rain' | 'dust' | 'firefly' | 'storm';
export type FlowerState = 'blooming' | 'fading' | 'glowing' | 'withered' | 'radiant';
export type AudioMood = 'hope' | 'sadness' | 'curiosity' | 'fear' | 'ending';

export interface AtmosphereProfile {
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  ambient: number;
  particleColor: string;
  particleMode: ParticleMode;
  flowerState: FlowerState;
  audioMood: AudioMood;
}

export const ATMOSPHERE_PROFILES: Record<AtmosphereKey, AtmosphereProfile> = {
  // Emotion Baselines
  hope: {
    skyColor: '#fef08a',
    fogColor: '#fef9c3',
    fogDensity: 0.015,
    sunColor: '#fde047',
    sunIntensity: 1.8,
    ambient: 0.65,
    particleColor: '#facc15',
    particleMode: 'ember',
    flowerState: 'blooming',
    audioMood: 'hope',
  },
  sadness: {
    skyColor: '#1e3a8a',
    fogColor: '#172554',
    fogDensity: 0.038,
    sunColor: '#60a5fa',
    sunIntensity: 0.75,
    ambient: 0.32,
    particleColor: '#93c5fd',
    particleMode: 'rain',
    flowerState: 'fading',
    audioMood: 'sadness',
  },
  curiosity: {
    skyColor: '#042f2e',
    fogColor: '#064e3b',
    fogDensity: 0.024,
    sunColor: '#67e8f9',
    sunIntensity: 1.4,
    ambient: 0.48,
    particleColor: '#22d3aa',
    particleMode: 'dust',
    flowerState: 'glowing',
    audioMood: 'curiosity',
  },
  fear: {
    skyColor: '#09090b',
    fogColor: '#18181b',
    fogDensity: 0.052,
    sunColor: '#a855f7',
    sunIntensity: 0.4,
    ambient: 0.18,
    particleColor: '#c084fc',
    particleMode: 'storm',
    flowerState: 'withered',
    audioMood: 'fear',
  },

  // Act Transition Profiles
  midpoint: {
    skyColor: '#1e1b4b',
    fogColor: '#172554',
    fogDensity: 0.03,
    sunColor: '#818cf8',
    sunIntensity: 1.1,
    ambient: 0.4,
    particleColor: '#a5b4fc',
    particleMode: 'dust',
    flowerState: 'glowing',
    audioMood: 'curiosity',
  },
  act3: {
    skyColor: '#0f172a',
    fogColor: '#020617',
    fogDensity: 0.045,
    sunColor: '#38bdf8',
    sunIntensity: 0.8,
    ambient: 0.28,
    particleColor: '#7dd3fc',
    particleMode: 'dust',
    flowerState: 'withered',
    audioMood: 'fear',
  },

  // Ending Profiles
  end_restoration: {
    skyColor: '#fed7aa',
    fogColor: '#fef3c7',
    fogDensity: 0.012,
    sunColor: '#f59e0b',
    sunIntensity: 2.2,
    ambient: 0.8,
    particleColor: '#fbbf24',
    particleMode: 'firefly',
    flowerState: 'radiant',
    audioMood: 'ending',
  },
  end_transformation: {
    skyColor: '#0d9488',
    fogColor: '#115e59',
    fogDensity: 0.018,
    sunColor: '#2dd4bf',
    sunIntensity: 1.9,
    ambient: 0.72,
    particleColor: '#5eead4',
    particleMode: 'firefly',
    flowerState: 'radiant',
    audioMood: 'ending',
  },
  end_darkness: {
    skyColor: '#050608',
    fogColor: '#09090b',
    fogDensity: 0.065,
    sunColor: '#3f3f46',
    sunIntensity: 0.2,
    ambient: 0.1,
    particleColor: '#71717a',
    particleMode: 'ember',
    flowerState: 'withered',
    audioMood: 'ending',
  },
};

/**
 * Pure interpolation between two atmosphere profiles.
 * Smoothly lerps colors, densities, and intensities; discrete states switch at midpoint (t >= 0.5).
 */
export function interpolateAtmosphere(
  profileA: AtmosphereProfile,
  profileB: AtmosphereProfile,
  t: number
): AtmosphereProfile {
  const factor = clamp(t, 0, 1);

  return {
    skyColor: lerpColor(profileA.skyColor, profileB.skyColor, factor),
    fogColor: lerpColor(profileA.fogColor, profileB.fogColor, factor),
    fogDensity: lerp(profileA.fogDensity, profileB.fogDensity, factor),
    sunColor: lerpColor(profileA.sunColor, profileB.sunColor, factor),
    sunIntensity: lerp(profileA.sunIntensity, profileB.sunIntensity, factor),
    ambient: lerp(profileA.ambient, profileB.ambient, factor),
    particleColor: lerpColor(profileA.particleColor, profileB.particleColor, factor),
    particleMode: factor >= 0.5 ? profileB.particleMode : profileA.particleMode,
    flowerState: factor >= 0.5 ? profileB.flowerState : profileA.flowerState,
    audioMood: factor >= 0.5 ? profileB.audioMood : profileA.audioMood,
  };
}
