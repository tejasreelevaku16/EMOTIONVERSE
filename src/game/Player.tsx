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
  const pos = useRef<[number, number, number]>([...initialPosition]);
  const targetRotation = useRef<number>(0);
  const currentRotation = useRef<number>(0);
  const walkPhase = useRef<number>(0);
  const keys = useRef<Record<string, boolean>>({
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.code in keys.current) keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code in keys.current) keys.current[e.code] = false;
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
    const speed = 7.5;
    let moveX = 0, moveZ = 0;
    if (keys.current.KeyW || keys.current.ArrowUp) moveZ -= 1;
    if (keys.current.KeyS || keys.current.ArrowDown) moveZ += 1;
    if (keys.current.KeyA || keys.current.ArrowLeft) moveX -= 1;
    if (keys.current.KeyD || keys.current.ArrowRight) moveX += 1;
    const isMoving = moveX !== 0 || moveZ !== 0;
    if (isMoving) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const dirX = (moveX / len) * speed * dt;
      const dirZ = (moveZ / len) * speed * dt;
      targetRotation.current = Math.atan2(moveX, moveZ);
      let nextPos: [number, number, number] = [pos.current[0] + dirX, pos.current[1], pos.current[2] + dirZ];
      nextPos = resolveCollisions(nextPos);
      nextPos = clampToBounds(nextPos);
      pos.current = nextPos;
      walkPhase.current += dt * 11;
    }
    let diff = targetRotation.current - currentRotation.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentRotation.current += diff * Math.min(dt * 12, 1);
    if (groupRef.current) {
      groupRef.current.position.set(pos.current[0], pos.current[1], pos.current[2]);
      groupRef.current.rotation.y = currentRotation.current;
    }
    if (isMoving) {
      const swing = Math.sin(walkPhase.current);
      if (leftArmRef.current) leftArmRef.current.rotation.x = swing * 0.65;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing * 0.65;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing * 0.65;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing * 0.65;
      if (torsoRef.current && !reducedMotion) torsoRef.current.position.y = 0.95 + Math.abs(Math.sin(walkPhase.current * 2)) * 0.06;
    } else {
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
      {/* BOOTS */}
      <mesh position={[-0.13, 0.12, 0]}><boxGeometry args={[0.14, 0.24, 0.18]} /><meshStandardMaterial color='#1a0f06' roughness={0.9} /></mesh>
      <mesh position={[0.13, 0.12, 0]}><boxGeometry args={[0.14, 0.24, 0.18]} /><meshStandardMaterial color='#1a0f06' roughness={0.9} /></mesh>
      {/* LEGS */}
      <mesh ref={leftLegRef} position={[-0.14, 0.44, 0]}><boxGeometry args={[0.13, 0.42, 0.14]} /><meshStandardMaterial color='#1e293b' roughness={0.6} /></mesh>
      <mesh ref={rightLegRef} position={[0.14, 0.44, 0]}><boxGeometry args={[0.13, 0.42, 0.14]} /><meshStandardMaterial color='#1e293b' roughness={0.6} /></mesh>
      {/* BELT */}
      <mesh position={[0, 0.69, 0]}><boxGeometry args={[0.46, 0.1, 0.22]} /><meshStandardMaterial color='#92400e' roughness={0.5} metalness={0.3} /></mesh>
      {/* TORSO */}
      <mesh ref={torsoRef} position={[0, 0.95, 0]}>
        <boxGeometry args={[0.46, 0.5, 0.22]} />
        <meshStandardMaterial color='#1e293b' roughness={0.4} />
        <mesh position={[0, 0.02, 0.12]}><boxGeometry args={[0.32, 0.36, 0.04]} /><meshStandardMaterial color='#0f172a' roughness={0.3} metalness={0.5} /></mesh>
        <mesh position={[0, -0.22, 0.12]}><boxGeometry args={[0.32, 0.04, 0.045]} /><meshStandardMaterial color='#0d9488' emissive='#0d9488' emissiveIntensity={0.4} /></mesh>
        <mesh position={[0, -0.05, -0.14]}><boxGeometry args={[0.52, 0.56, 0.04]} /><meshStandardMaterial color='#92400e' roughness={0.8} side={THREE.DoubleSide} /></mesh>
      </mesh>
      {/* SHOULDER GUARDS */}
      <mesh position={[-0.28, 1.14, 0]}><boxGeometry args={[0.1, 0.1, 0.24]} /><meshStandardMaterial color='#0f172a' roughness={0.3} metalness={0.6} /></mesh>
      <mesh position={[0.28, 1.14, 0]}><boxGeometry args={[0.1, 0.1, 0.24]} /><meshStandardMaterial color='#0f172a' roughness={0.3} metalness={0.6} /></mesh>
      {/* LEFT ARM */}
      <mesh ref={leftArmRef} position={[-0.32, 0.92, 0]}>
        <boxGeometry args={[0.11, 0.38, 0.12]} />
        <meshStandardMaterial color='#1e293b' roughness={0.5} />
        <mesh position={[0, -0.22, 0]}><boxGeometry args={[0.13, 0.12, 0.14]} /><meshStandardMaterial color='#92400e' roughness={0.4} metalness={0.4} /></mesh>
      </mesh>
      {/* RIGHT ARM */}
      <mesh ref={rightArmRef} position={[0.32, 0.92, 0]}>
        <boxGeometry args={[0.11, 0.38, 0.12]} />
        <meshStandardMaterial color='#1e293b' roughness={0.5} />
        <mesh position={[0, -0.22, 0]}><boxGeometry args={[0.13, 0.12, 0.14]} /><meshStandardMaterial color='#92400e' roughness={0.4} metalness={0.4} /></mesh>
      </mesh>
      {/* HANDS */}
      <mesh position={[-0.32, 0.67, 0]}><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color='#c8a882' roughness={0.7} /></mesh>
      <mesh position={[0.32, 0.67, 0]}><boxGeometry args={[0.1, 0.1, 0.1]} /><meshStandardMaterial color='#c8a882' roughness={0.7} /></mesh>
      {/* NECK */}
      <mesh position={[0, 1.27, 0]}><boxGeometry args={[0.14, 0.1, 0.14]} /><meshStandardMaterial color='#c8a882' roughness={0.6} /></mesh>
      {/* HEAD */}
      <mesh position={[0, 1.48, 0]}>
        <boxGeometry args={[0.26, 0.28, 0.24]} />
        <meshStandardMaterial color='#c8a882' roughness={0.6} />
        <mesh position={[0, 0.08, 0.13]}><boxGeometry args={[0.22, 0.04, 0.03]} /><meshStandardMaterial color='#a07850' roughness={0.5} /></mesh>
        <mesh position={[0, 0.01, 0.13]}><boxGeometry args={[0.05, 0.08, 0.04]} /><meshStandardMaterial color='#b08860' roughness={0.6} /></mesh>
        <mesh position={[-0.07, 0.07, 0.13]}><boxGeometry args={[0.055, 0.04, 0.02]} /><meshStandardMaterial color='#0f172a' emissive='#38bdf8' emissiveIntensity={0.6} roughness={0.3} /></mesh>
        <mesh position={[0.07, 0.07, 0.13]}><boxGeometry args={[0.055, 0.04, 0.02]} /><meshStandardMaterial color='#0f172a' emissive='#38bdf8' emissiveIntensity={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, -0.1, 0.1]}><boxGeometry args={[0.2, 0.04, 0.06]} /><meshStandardMaterial color='#a07850' roughness={0.7} /></mesh>
      </mesh>
      {/* HOOD */}
      <mesh position={[0, 1.56, -0.08]}><boxGeometry args={[0.32, 0.26, 0.2]} /><meshStandardMaterial color='#92400e' roughness={0.85} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 1.6, 0.08]}><boxGeometry args={[0.3, 0.06, 0.06]} /><meshStandardMaterial color='#78350f' roughness={0.8} /></mesh>
      {/* CLOAK FLAP */}
      <mesh position={[0, 0.44, -0.16]}><boxGeometry args={[0.48, 0.72, 0.04]} /><meshStandardMaterial color='#78350f' roughness={0.9} side={THREE.DoubleSide} /></mesh>
      {/* RUNE BADGE */}
      <mesh position={[0, 0.98, 0.145]}><boxGeometry args={[0.08, 0.08, 0.01]} /><meshStandardMaterial color='#0d9488' emissive='#0d9488' emissiveIntensity={1.2} roughness={0.1} /></mesh>
      {/* SHADOW */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.38, 16]} /><meshBasicMaterial color='#000000' opacity={0.35} transparent depthWrite={false} /></mesh>
    </group>
  );
}