import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';
import { useGameStore } from '../hooks/useGameStore';
import { isWithinInteractionRange } from '../utils/colliders';

interface ObjectsProps {
  playerPos: [number, number, number];
  onProximityChange?: (nearbyArtifact: 'clock' | 'book' | 'crystal' | null) => void;
}

export function Objects({ playerPos, onProximityChange }: ObjectsProps) {
  const flags = useGameStore((state) => state.flags);

  const clockPendulumRef = useRef<THREE.Mesh>(null);
  const clockGearsRef = useRef<THREE.Group>(null);
  const bookMeshRef = useRef<THREE.Group>(null);
  const crystalMeshRef = useRef<THREE.Mesh>(null);
  const clockAuraRef = useRef<THREE.Mesh>(null);
  const bookAuraRef = useRef<THREE.Mesh>(null);
  const crystalAuraRef = useRef<THREE.Mesh>(null);

  const clockPos: [number, number, number] = [0, 0, -10];
  const bookPos: [number, number, number] = [-14, 0, 8];
  const crystalPos: [number, number, number] = [14, 0, 8];

  const nearClock = isWithinInteractionRange(playerPos, clockPos);
  const nearBook = isWithinInteractionRange(playerPos, bookPos);
  const nearCrystal = isWithinInteractionRange(playerPos, crystalPos);

  const prevNearby = useRef<'clock' | 'book' | 'crystal' | null>(null);

  useFrame((_, delta) => {
    const time = Date.now() * 0.001;

    let currentNearby: 'clock' | 'book' | 'crystal' | null = null;
    if (nearClock) currentNearby = 'clock';
    else if (nearBook) currentNearby = 'book';
    else if (nearCrystal) currentNearby = 'crystal';

    if (currentNearby !== prevNearby.current) {
      prevNearby.current = currentNearby;
      onProximityChange?.(currentNearby);
    }

    // ── Aura opacity animations ──
    const targetClockAura = nearClock ? 0.18 + Math.sin(time * 2.5) * 0.06 : 0;
    const targetBookAura  = nearBook  ? 0.22 + Math.sin(time * 2.0) * 0.07 : 0;
    const targetCrystalAura = nearCrystal ? 0.25 + Math.sin(time * 3.0) * 0.08 : 0;

    if (clockAuraRef.current) {
      const mat = clockAuraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetClockAura - mat.opacity) * Math.min(delta * 4, 1);
      clockAuraRef.current.rotation.y += delta * 0.4;
    }
    if (bookAuraRef.current) {
      const mat = bookAuraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetBookAura - mat.opacity) * Math.min(delta * 3.5, 1);
      bookAuraRef.current.rotation.y += delta * 0.3;
      bookAuraRef.current.scale.setScalar(1.0 + Math.sin(time * 1.8) * 0.04);
    }
    if (crystalAuraRef.current) {
      const mat = crystalAuraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetCrystalAura - mat.opacity) * Math.min(delta * 4, 1);
      crystalAuraRef.current.rotation.y -= delta * 0.5;
      crystalAuraRef.current.rotation.x = Math.sin(time * 0.7) * 0.2;
    }

    // ── Clock animations ──
    if (!flags.clockWound && !flags.clockBroken && nearClock) {
      if (clockPendulumRef.current) clockPendulumRef.current.rotation.z = Math.sin(time * 18) * 0.06;
      if (clockGearsRef.current) clockGearsRef.current.rotation.z += delta * 0.3;
    }
    if (flags.clockWound) {
      if (clockGearsRef.current) clockGearsRef.current.rotation.z += delta * 1.5;
      if (clockPendulumRef.current) clockPendulumRef.current.rotation.z = Math.sin(time * 3.5) * 0.45;
    } else if (flags.clockBroken) {
      if (clockPendulumRef.current) clockPendulumRef.current.rotation.z = -0.7;
    } else {
      if (clockPendulumRef.current) clockPendulumRef.current.rotation.z = 0;
    }

    // ── Book animations ──
    if (bookMeshRef.current) {
      bookMeshRef.current.position.y = 1.35 + Math.sin(time * 2) * 0.12;
      bookMeshRef.current.rotation.y = Math.sin(time * 0.8) * 0.25;
      if (nearBook) bookMeshRef.current.rotation.x = Math.sin(time * 6) * 0.04;
    }

    // ── Crystal animations ──
    if (crystalMeshRef.current) {
      crystalMeshRef.current.position.y = 1.6 + Math.sin(time * 2.5) * 0.15;
      crystalMeshRef.current.rotation.y += delta * (flags.crystalShared ? 2.5 : 0.8);
      crystalMeshRef.current.rotation.x = Math.sin(time * 1.5) * 0.15;
      if (crystalMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
        const basePulse = flags.crystalShared ? 1.4 : 0.65;
        const nearBoost = nearCrystal ? Math.sin(time * 4) * 0.3 : 0;
        crystalMeshRef.current.material.emissiveIntensity = basePulse + nearBoost;
      }
    }
  });

  return (
    <group>
      {/* ================================================================
          1. THE FORGOTTEN CLOCK
         ================================================================ */}
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
        {/* Clock Pillar */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 1.3, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>
        {/* Brass Bezel Ring */}
        <mesh position={[0, 2.2, 0.15]}>
          <torusGeometry args={[0.75, 0.08, 12, 24]} />
          <meshStandardMaterial
            color={flags.clockWound ? '#facc15' : '#78716c'}
            metalness={0.8} roughness={0.2}
            emissive={flags.clockWound ? '#eab308' : '#000000'}
            emissiveIntensity={flags.clockWound ? 0.6 : 0}
          />
        </mesh>
        {/* Clock Face */}
        <mesh position={[0, 2.2, 0.1]}>
          <circleGeometry args={[0.7, 24]} />
          <meshStandardMaterial
            color={flags.clockWound ? '#fef9c3' : '#e2e8f0'}
            roughness={0.3}
            emissive={flags.clockWound ? '#fde047' : '#0f172a'}
            emissiveIntensity={flags.clockWound ? 0.35 : 0.05}
          />
        </mesh>
        {/* Gears */}
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
            <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
            <meshStandardMaterial color="#b45309" metalness={0.8} />
            <mesh position={[0, -0.4, 0]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial
                color="#eab308" metalness={0.9}
                emissive={flags.clockWound ? '#facc15' : '#000000'}
                emissiveIntensity={flags.clockWound ? 0.5 : 0}
              />
            </mesh>
          </mesh>
        </group>
        {/* Floor ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.15, 32]} />
          <meshBasicMaterial color="#facc15" transparent opacity={nearClock ? 0.85 : 0.25} />
        </mesh>
        {/* ── PROXIMITY AURA ── large disc glow */}
        <mesh ref={clockAuraRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 32]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0} depthWrite={false} />
        </mesh>
        {/* Sparkles aura on approach */}
        {nearClock && (
          <Sparkles count={28} scale={[3.0, 2.5, 3.0]} size={1.6} speed={0.5} color="#fbbf24" opacity={0.85} noise={0.3} position={[0, 1.2, 0]} />
        )}
        {/* Always-on subtle clock sparkles if wound */}
        {flags.clockWound && (
          <Sparkles count={16} scale={[2.2, 3.0, 2.2]} size={1.2} speed={0.8} color="#fde047" opacity={0.6} noise={0.4} position={[0, 1.5, 0]} />
        )}
      </group>

      {/* ================================================================
          2. THE LIVING BOOK
         ================================================================ */}
      <group position={bookPos}>
        {/* Mossy Pedestal */}
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.8, 1.1, 0.9, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.5, 0.7, 0.3, 8]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        {/* Floating Book */}
        <group ref={bookMeshRef} position={[0, 1.35, 0]}>
          <mesh>
            <boxGeometry args={[0.75, 0.12, 0.95]} />
            <meshStandardMaterial
              color="#3b82f6" roughness={0.5}
              emissive={flags.bookTrusted ? '#2563eb' : '#1e3a8a'}
              emissiveIntensity={flags.bookTrusted ? 0.5 : 0.1}
            />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.68, 0.07, 0.88]} />
            <meshStandardMaterial
              color={flags.bookTrusted ? '#67e8f9' : '#f8fafc'}
              emissive={flags.bookTrusted ? '#22d3aa' : '#60a5fa'}
              emissiveIntensity={flags.bookTrusted ? 0.75 : 0.2}
            />
          </mesh>
          {flags.bookTrusted && (
            <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
              <torusGeometry args={[0.22, 0.02, 8, 16]} />
              <meshBasicMaterial color="#22d3aa" transparent opacity={0.8} />
            </mesh>
          )}
        </group>
        {/* Book interaction: large glowing aura behind book (Genshin-style) */}
        <mesh ref={bookAuraRef} position={[0, 1.6, -0.05]}>
          <planeGeometry args={[2.4, 2.4]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Secondary outer aura ring */}
        <mesh position={[0, 1.6, -0.06]} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={nearBook ? 0.3 : 0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Bloom flora */}
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
        {/* Floor ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 1.95, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={nearBook ? 0.85 : 0.25} />
        </mesh>
        {/* Sparkles on approach */}
        {nearBook && (
          <Sparkles count={36} scale={[2.5, 3.0, 2.5]} size={1.8} speed={0.4} color="#93c5fd" opacity={0.9} noise={0.4} position={[0, 1.5, 0]} />
        )}
        {flags.bookTrusted && (
          <Sparkles count={20} scale={[3.0, 4.0, 3.0]} size={1.4} speed={0.6} color="#22d3aa" opacity={0.7} noise={0.5} position={[0, 1.5, 0]} />
        )}
      </group>

      {/* ================================================================
          3. THE LAST CRYSTAL
         ================================================================ */}
      <group position={crystalPos}>
        {/* Tiered Dais */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[2.2, 2.5, 0.4, 6]} />
          <meshStandardMaterial color="#0a1f1c" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1.6, 1.9, 0.3, 6]} />
          <meshStandardMaterial color="#0f2e29" roughness={0.5} />
        </mesh>
        {/* Mini obelisks */}
        {([[-1.3,-1.3],[1.3,-1.3],[-1.3,1.3],[1.3,1.3]] as [number,number][]).map(([ox,oz],idx) => (
          <mesh key={idx} position={[ox, 1.0, oz]}>
            <cylinderGeometry args={[0.1, 0.16, 1.1, 4]} />
            <meshStandardMaterial color="#1e3a35" roughness={0.4} />
          </mesh>
        ))}
        {/* Crystal prism */}
        <mesh ref={crystalMeshRef} position={[0, 1.6, 0]}>
          <octahedronGeometry args={[flags.crystalShared ? 0.85 : 0.65, 0]} />
          <meshStandardMaterial
            color={flags.crystalShared ? '#5eead4' : '#67e8f9'}
            emissive={flags.crystalShared ? '#2dd4bf' : '#0891b2'}
            emissiveIntensity={flags.crystalShared ? 1.4 : 0.65}
            roughness={0.15} metalness={0.3}
          />
          {flags.crystalShared && (
            <mesh rotation={[Math.PI / 3, 0, 0]}>
              <torusGeometry args={[1.1, 0.04, 12, 32]} />
              <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} />
            </mesh>
          )}
        </mesh>
        {/* Point light from crystal */}
        <pointLight
          position={[0, 1.8, 0]}
          intensity={nearCrystal ? 2.5 : 1.0}
          distance={8}
          color={flags.crystalShared ? '#5eead4' : '#22d3aa'}
        />
        {/* Crystal aura sphere */}
        <mesh ref={crystalAuraRef} position={[0, 1.6, 0]}>
          <sphereGeometry args={[1.4, 10, 8]} />
          <meshBasicMaterial color="#22d3aa" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Floor ring */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.35, 32]} />
          <meshBasicMaterial color="#22d3aa" transparent opacity={nearCrystal ? 0.85 : 0.25} />
        </mesh>
        {/* Sparkles */}
        {nearCrystal && (
          <Sparkles count={44} scale={[3.5, 4.0, 3.5]} size={2.0} speed={0.6} color="#67e8f9" opacity={0.9} noise={0.5} position={[0, 1.6, 0]} />
        )}
        {flags.crystalShared && (
          <Sparkles count={60} scale={[5.0, 6.0, 5.0]} size={2.5} speed={1.2} color="#5eead4" opacity={0.8} noise={0.6} position={[0, 2.0, 0]} />
        )}
      </group>
    </group>
  );
}