import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../hooks/useGameStore';
import { ATMOSPHERE_PROFILES, type AtmosphereProfile } from './atmosphereProfiles';
import { applyReactionModifier } from './reactions';
import { lerp, lerpColor } from '../utils/math';

const PARTICLE_COUNT = 380;

export function Environment() {
  const { scene } = useThree();
  const atmosphereKey = useGameStore((state) => state.atmosphereKey);
  const lastReaction = useGameStore((state) => state.lastReaction);

  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Compute active target profile with any additive reaction modifier applied
  const targetProfile: AtmosphereProfile = useMemo(() => {
    const base = ATMOSPHERE_PROFILES[atmosphereKey] || ATMOSPHERE_PROFILES.hope;
    if (lastReaction) {
      return applyReactionModifier(base, lastReaction);
    }
    return base;
  }, [atmosphereKey, lastReaction]);

  // Current interpolated values held in refs for smooth per-frame lerping
  const currentValues = useRef<{
    skyColor: string;
    fogColor: string;
    fogDensity: number;
    sunColor: string;
    sunIntensity: number;
    ambient: number;
    particleColor: string;
  }>({
    skyColor: targetProfile.skyColor,
    fogColor: targetProfile.fogColor,
    fogDensity: targetProfile.fogDensity,
    sunColor: targetProfile.sunColor,
    sunIntensity: targetProfile.sunIntensity,
    ambient: targetProfile.ambient,
    particleColor: targetProfile.particleColor,
  });

  // Setup particle buffer geometry
  const [particlePositions, particleVelocities] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 50;
      pos[i3 + 1] = Math.random() * 16;
      pos[i3 + 2] = (Math.random() - 0.5) * 50;

      vel[i3] = (Math.random() - 0.5) * 0.04;
      vel[i3 + 1] = (Math.random() - 0.5) * 0.04;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.04;
    }

    return [pos, vel];
  }, []);

  // Per-frame damped lerp (2-4s smooth transition without hard cuts - Property 2)
  useFrame((_, delta) => {
    // Clamp delta to avoid huge jumps on tab switch
    const dt = Math.min(delta, 0.1);
    const lerpFactor = 1.0 - Math.exp(-2.5 * dt);

    const cur = currentValues.current;
    cur.skyColor = lerpColor(cur.skyColor, targetProfile.skyColor, lerpFactor);
    cur.fogColor = lerpColor(cur.fogColor, targetProfile.fogColor, lerpFactor);
    cur.sunColor = lerpColor(cur.sunColor, targetProfile.sunColor, lerpFactor);
    cur.particleColor = lerpColor(cur.particleColor, targetProfile.particleColor, lerpFactor);

    cur.fogDensity = lerp(cur.fogDensity, targetProfile.fogDensity, lerpFactor);
    cur.sunIntensity = lerp(cur.sunIntensity, targetProfile.sunIntensity, lerpFactor);
    cur.ambient = lerp(cur.ambient, targetProfile.ambient, lerpFactor);

    // Update Three.js scene fog and background
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(cur.fogColor);
      scene.fog.density = cur.fogDensity;
    } else {
      scene.fog = new THREE.FogExp2(cur.fogColor, cur.fogDensity);
    }
    scene.background = new THREE.Color(cur.skyColor);

    // Update lighting
    if (dirLightRef.current) {
      dirLightRef.current.color.set(cur.sunColor);
      dirLightRef.current.intensity = cur.sunIntensity;
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.color.set(cur.skyColor);
      ambientLightRef.current.intensity = cur.ambient;
    }

    // Update particles based on mode
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const positionsAttr = geo.attributes.position as THREE.BufferAttribute;
      const arr = positionsAttr.array as Float32Array;
      const mode = targetProfile.particleMode;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        if (mode === 'rain') {
          // Downward swift rain
          arr[i3 + 1] -= dt * 14;
          if (arr[i3 + 1] < 0) {
            arr[i3 + 1] = 16;
            arr[i3] = (Math.random() - 0.5) * 50;
            arr[i3 + 2] = (Math.random() - 0.5) * 50;
          }
        } else if (mode === 'storm') {
          // Diagonal sweeping wind
          arr[i3] += dt * 8;
          arr[i3 + 1] -= dt * 12;
          if (arr[i3 + 1] < 0 || arr[i3] > 25) {
            arr[i3] = -25;
            arr[i3 + 1] = 16;
            arr[i3 + 2] = (Math.random() - 0.5) * 50;
          }
        } else {
          // Ember, Dust, Firefly: Gentle floating drift
          arr[i3] += particleVelocities[i3];
          arr[i3 + 1] += Math.sin(arr[i3] + arr[i3 + 2]) * dt * 0.4 + (mode === 'firefly' ? 0.01 : 0.005);
          arr[i3 + 2] += particleVelocities[i3 + 2];

          if (arr[i3 + 1] > 16) arr[i3 + 1] = 0.5;
          if (arr[i3 + 1] < 0.2) arr[i3 + 1] = 15;
          if (Math.abs(arr[i3]) > 25) arr[i3] = -arr[i3];
          if (Math.abs(arr[i3 + 2]) > 25) arr[i3 + 2] = -arr[i3 + 2];
        }
      }

      positionsAttr.needsUpdate = true;

      const mat = pointsRef.current.material as THREE.PointsMaterial;
      if (mat) {
        mat.color.set(cur.particleColor);
      }
    }
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.4} />
      <directionalLight
        ref={dirLightRef}
        position={[15, 25, 12]}
        intensity={1.5}
        castShadow={false}
      />

      {/* Shared Particles Points Cloud */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}
