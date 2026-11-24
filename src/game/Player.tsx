import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clampToBounds } from '../utils/bounds';
import { resolveCollisions } from '../utils/colliders';
import { useGameStore } from '../hooks/useGameStore';

interface PlayerProps {
  onPositionUpdate?: (pos: [number, number, number]) => void;
  initialPosition?: [number, number, number];
}

export function Player({ onPositionUpdate, initialPosition = [0, 0, 0] }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Mesh>(null);

  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);

  // Position & rotation state
  const pos = useRef<[number, number, number]>([...initialPosition]);
  const targetRotation = useRef<number>(0);
  const currentRotation = useRef<number>(0);
  const walkPhase = useRef<number>(0);

  // Keyboard input tracking
  const keys = useRef<Record<string, boolean>>({
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if typing in text inputs or textareas
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code in keys.current) {
        keys.current[e.code] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in keys.current) {
        keys.current[e.code] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const speed = 7.5; // units per second

    // Calculate movement vector from keyboard input
    let moveX = 0;
    let moveZ = 0;

    if (keys.current.KeyW || keys.current.ArrowUp) moveZ -= 1;
    if (keys.current.KeyS || keys.current.ArrowDown) moveZ += 1;
    if (keys.current.KeyA || keys.current.ArrowLeft) moveX -= 1;
    if (keys.current.KeyD || keys.current.ArrowRight) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;

    if (isMoving) {
      // Normalize movement direction
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const dirX = (moveX / len) * speed * dt;
      const dirZ = (moveZ / len) * speed * dt;

      // Target rotation angle facing movement direction
      targetRotation.current = Math.atan2(moveX, moveZ);

      // Propose new position
      let nextPos: [number, number, number] = [
        pos.current[0] + dirX,
        pos.current[1],
        pos.current[2] + dirZ,
      ];

      // Resolve environment collisions and clamp inside world bounds
      nextPos = resolveCollisions(nextPos);
      nextPos = clampToBounds(nextPos);

      pos.current = nextPos;
      walkPhase.current += dt * 11;
    }

    // Smooth rotation lerp
    // Handle angle wrapping
    let diff = targetRotation.current - currentRotation.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentRotation.current += diff * Math.min(dt * 12, 1);

    // Apply transformation to 3D group
    if (groupRef.current) {
      groupRef.current.position.set(pos.current[0], pos.current[1], pos.current[2]);
      groupRef.current.rotation.y = currentRotation.current;
    }

    // Procedural Humanoid Animations (FR-4.2)
    if (isMoving) {
      // Walking animation: alternating arm and leg swings
      const swing = Math.sin(walkPhase.current);
      if (leftArmRef.current) leftArmRef.current.rotation.x = swing * 0.65;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing * 0.65;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing * 0.65;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing * 0.65;

      if (torsoRef.current && !reducedMotion) {
        torsoRef.current.position.y = 0.95 + Math.abs(Math.sin(walkPhase.current * 2)) * 0.06;
      }
    } else {
      // Idle animation: subtle breathing scale and gentle limb return
      const breath = Math.sin(Date.now() * 0.002);
      if (leftArmRef.current) leftArmRef.current.rotation.x *= 0.85;
      if (rightArmRef.current) rightArmRef.current.rotation.x *= 0.85;
      if (leftLegRef.current) leftLegRef.current.rotation.x *= 0.85;
      if (rightLegRef.current) rightLegRef.current.rotation.x *= 0.85;

      if (torsoRef.current) {
        torsoRef.current.position.y = 0.95 + (reducedMotion ? 0 : breath * 0.02);
        torsoRef.current.scale.set(1 + breath * 0.02, 1 + breath * 0.02, 1);
      }
    }

    onPositionUpdate?.(pos.current);
  });

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* Torso (Box) */}
      <mesh ref={torsoRef} position={[0, 0.95, 0]}>
        <boxGeometry args={[0.55, 0.65, 0.32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />

        {/* Keeper Cloak Trim */}
        <mesh position={[0, 0, 0.17]}>
          <planeGeometry args={[0.3, 0.45]} />
          <meshBasicMaterial color="#22d3aa" />
        </mesh>
      </mesh>

      {/* Head (Sphere) */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.2} emissive="#0284c7" emissiveIntensity={0.25} />
      </mesh>

      {/* Left Arm (Cylinder) */}
      <mesh ref={leftArmRef} position={[-0.38, 0.95, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.55, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>

      {/* Right Arm (Cylinder) */}
      <mesh ref={rightArmRef} position={[0.38, 0.95, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.55, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>

      {/* Left Leg (Cylinder) */}
      <mesh ref={leftLegRef} position={[-0.16, 0.35, 0]}>
        <cylinderGeometry args={[0.09, 0.08, 0.65, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      {/* Right Leg (Cylinder) */}
      <mesh ref={rightLegRef} position={[0.16, 0.35, 0]}>
        <cylinderGeometry args={[0.09, 0.08, 0.65, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      {/* Player Soft Base Shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#000000" opacity={0.4} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
