import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../hooks/useGameStore';
import { isWithinInteractionRange } from '../utils/colliders';

interface ObjectsProps {
  playerPos: [number, number, number];
  onProximityChange?: (nearbyArtifact: 'clock' | 'book' | 'crystal' | null) => void;
}

export function Objects({ playerPos, onProximityChange }: ObjectsProps) {
  const flags = useGameStore((state) => state.flags);

  // References for animation
  const clockPendulumRef = useRef<THREE.Mesh>(null);
  const clockGearsRef = useRef<THREE.Group>(null);
  const bookMeshRef = useRef<THREE.Group>(null);
  const crystalMeshRef = useRef<THREE.Mesh>(null);

  // Coordinates of the 3 artifacts
  const clockPos: [number, number, number] = [0, 0, -10];
  const bookPos: [number, number, number] = [-14, 0, 8];
  const crystalPos: [number, number, number] = [14, 0, 8];

  // Proximity calculations
  const nearClock = isWithinInteractionRange(playerPos, clockPos);
  const nearBook = isWithinInteractionRange(playerPos, bookPos);
  const nearCrystal = isWithinInteractionRange(playerPos, crystalPos);

  const prevNearby = useRef<'clock' | 'book' | 'crystal' | null>(null);

  useFrame((_, delta) => {
    const time = Date.now() * 0.001;

    // Determine current nearby artifact
    let currentNearby: 'clock' | 'book' | 'crystal' | null = null;
    if (nearClock) currentNearby = 'clock';
    else if (nearBook) currentNearby = 'book';
    else if (nearCrystal) currentNearby = 'crystal';

    if (currentNearby !== prevNearby.current) {
      prevNearby.current = currentNearby;
      onProximityChange?.(currentNearby);
    }

    // 1. Clock animations
    if (flags.clockWound) {
      // Wound clock: gears rotate smoothly, pendulum swings rhythmically
      if (clockGearsRef.current) {
        clockGearsRef.current.rotation.z += delta * 1.5;
      }
      if (clockPendulumRef.current) {
        clockPendulumRef.current.rotation.z = Math.sin(time * 3.5) * 0.45;
      }
    } else if (flags.clockBroken) {
      // Broken clock: motionless, tilted
      if (clockPendulumRef.current) {
        clockPendulumRef.current.rotation.z = -0.7;
      }
    } else {
      // Default: frozen pendulum
      if (clockPendulumRef.current) {
        clockPendulumRef.current.rotation.z = 0;
      }
    }

    // 2. Book animations: floating hover
    if (bookMeshRef.current) {
      bookMeshRef.current.position.y = 1.35 + Math.sin(time * 2) * 0.12;
      bookMeshRef.current.rotation.y = Math.sin(time * 0.8) * 0.25;
    }

    // 3. Crystal animations: rotating faceted prism
    if (crystalMeshRef.current) {
      crystalMeshRef.current.position.y = 1.6 + Math.sin(time * 2.5) * 0.15;
      crystalMeshRef.current.rotation.y += delta * (flags.crystalShared ? 2.5 : 0.8);
      crystalMeshRef.current.rotation.x = Math.sin(time * 1.5) * 0.15;
    }
  });

  return (
    <group>
      {/* ========================================================
          1. THE FORGOTTEN CLOCK (Altar at [0, 0, -10])
         ======================================================== */}
      <group position={clockPos}>
        {/* Stone Stepped Base */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[1.8, 2.1, 0.5, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[1.3, 1.6, 0.4, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        {/* Clock Pillar & Dial Housing */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 1.3, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>

        {/* Brass Bezel Ring */}
        <mesh position={[0, 2.2, 0.15]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.75, 0.08, 12, 24]} />
          <meshStandardMaterial
            color={flags.clockWound ? '#facc15' : '#78716c'}
            metalness={0.8}
            roughness={0.2}
            emissive={flags.clockWound ? '#eab308' : '#000000'}
            emissiveIntensity={flags.clockWound ? 0.6 : 0}
          />
        </mesh>

        {/* Clock Face Dial */}
        <mesh position={[0, 2.2, 0.1]}>
          <circleGeometry args={[0.7, 24]} />
          <meshStandardMaterial
            color={flags.clockWound ? '#fef9c3' : '#e2e8f0'}
            roughness={0.3}
            emissive={flags.clockWound ? '#fde047' : '#0f172a'}
            emissiveIntensity={flags.clockWound ? 0.35 : 0.05}
          />
        </mesh>

        {/* Rotating Internal Gears Group */}
        <group ref={clockGearsRef} position={[0, 2.2, 0.14]}>
          <mesh>
            <cylinderGeometry args={[0.25, 0.25, 0.04, 10]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.18, 0.18, 0.05, 8]} />
            <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* Pendulum */}
        <group position={[0, 1.9, 0.2]}>
          <mesh ref={clockPendulumRef} position={[0, -0.4, 0]}>
            {/* Rod */}
            <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
            <meshStandardMaterial color="#b45309" metalness={0.8} />
            {/* Weight Bob */}
            <mesh position={[0, -0.4, 0]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial
                color="#eab308"
                metalness={0.9}
                emissive={flags.clockWound ? '#facc15' : '#000000'}
                emissiveIntensity={flags.clockWound ? 0.5 : 0}
              />
            </mesh>
          </mesh>
        </group>

        {/* Proximity Glowing Floor Ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.15, 32]} />
          <meshBasicMaterial
            color="#facc15"
            transparent
            opacity={nearClock ? 0.85 : 0.25}
          />
        </mesh>
      </group>

      {/* ========================================================
          2. THE LIVING BOOK (Pedestal at [-14, 0, 8])
         ======================================================== */}
      <group position={bookPos}>
        {/* Ancient Mossy Pedestal */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.8, 1.1, 0.9, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.5, 0.7, 0.3, 8]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>

        {/* Floating Book Mesh Group */}
        <group ref={bookMeshRef} position={[0, 1.35, 0]}>
          {/* Book Leather Cover */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.75, 0.12, 0.95]} />
            <meshStandardMaterial
              color="#3b82f6"
              roughness={0.5}
              emissive={flags.bookTrusted ? '#2563eb' : '#1e3a8a'}
              emissiveIntensity={flags.bookTrusted ? 0.5 : 0.1}
            />
          </mesh>

          {/* Glowing Parchment Pages */}
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.68, 0.07, 0.88]} />
            <meshStandardMaterial
              color={flags.bookTrusted ? '#67e8f9' : '#f8fafc'}
              emissive={flags.bookTrusted ? '#22d3aa' : '#60a5fa'}
              emissiveIntensity={flags.bookTrusted ? 0.75 : 0.2}
            />
          </mesh>

          {/* Floating Mystical Glyph Rune */}
          {flags.bookTrusted && (
            <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
              <torusGeometry args={[0.22, 0.02, 8, 16]} />
              <meshBasicMaterial color="#22d3aa" transparent opacity={0.8} />
            </mesh>
          )}
        </group>

        {/* Blooming Flora around base when trusted */}
        {flags.bookTrusted && (
          <group position={[0, 0.1, 0]}>
            {[-0.8, 0.8].map((x, i) => (
              <mesh key={i} position={[x, 0.1, 0.4]}>
                <sphereGeometry args={[0.18, 8, 8]} />
                <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.6} />
              </mesh>
            ))}
          </group>
        )}

        {/* Proximity Glowing Floor Ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 1.95, 32]} />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={nearBook ? 0.85 : 0.25}
          />
        </mesh>
      </group>

      {/* ========================================================
          3. THE LAST CRYSTAL (Sanctuary Dais at [14, 0, 8])
         ======================================================== */}
      <group position={crystalPos}>
        {/* Tiered Sanctuary Dais */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[2.2, 2.5, 0.4, 6]} />
          <meshStandardMaterial color="#0a1f1c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1.6, 1.9, 0.3, 6]} />
          <meshStandardMaterial color="#0f2e29" roughness={0.5} />
        </mesh>

        {/* Four Surrounding Mini Obelisks */}
        {[
          [-1.3, -1.3],
          [1.3, -1.3],
          [-1.3, 1.3],
          [1.3, 1.3],
        ].map(([ox, oz], idx) => (
          <mesh key={idx} position={[ox, 1.0, oz]}>
            <cylinderGeometry args={[0.1, 0.16, 1.1, 4]} />
            <meshStandardMaterial color="#1e3a35" roughness={0.4} />
          </mesh>
        ))}

        {/* Hovering Radiant Crystal Prism */}
        <mesh ref={crystalMeshRef} position={[0, 1.6, 0]}>
          <octahedronGeometry args={[flags.crystalShared ? 0.85 : 0.65, 0]} />
          <meshStandardMaterial
            color={flags.crystalShared ? '#5eead4' : '#67e8f9'}
            emissive={flags.crystalShared ? '#2dd4bf' : '#0891b2'}
            emissiveIntensity={flags.crystalShared ? 1.4 : 0.65}
            roughness={0.15}
            metalness={0.3}
          />

          {/* Surrounding Outer Aura Ring if shared */}
          {flags.crystalShared && (
            <mesh rotation={[Math.PI / 3, 0, 0]}>
              <torusGeometry args={[1.1, 0.04, 12, 32]} />
              <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} />
            </mesh>
          )}
        </mesh>

        {/* Proximity Glowing Floor Ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.35, 32]} />
          <meshBasicMaterial
            color="#22d3aa"
            transparent
            opacity={nearCrystal ? 0.85 : 0.25}
          />
        </mesh>
      </group>
    </group>
  );
}
