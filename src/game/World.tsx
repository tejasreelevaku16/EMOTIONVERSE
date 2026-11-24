import { useState, useCallback } from 'react';
import { Player } from './Player';
import { Camera } from './Camera';
import { Environment } from './Environment';
import { Objects } from './Objects';

interface WorldProps {
  onProximityChange?: (nearbyArtifact: 'clock' | 'book' | 'crystal' | null) => void;
}

export function World({ onProximityChange }: WorldProps) {
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 0, 0]);

  const handlePlayerMove = useCallback((newPos: [number, number, number]) => {
    setPlayerPosition(newPos);
  }, []);

  return (
    <>
      {/* 3D Atmospheric Controller & Dynamic Lighting */}
      <Environment />

      {/* Third-Person Camera following Player */}
      <Camera targetPosition={playerPosition} />

      {/* Humanoid Player Character */}
      <Player onPositionUpdate={handlePlayerMove} initialPosition={[0, 0, 0]} />

      {/* The 3 Sacred Interactive Artifacts */}
      <Objects playerPos={playerPosition} onProximityChange={onProximityChange} />

      {/* ========================================================
          HAND-PLACED SANCTUARY ENVIRONMENT GEOMETRY
         ======================================================== */}
      {/* Main Ground Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[56, 56, 1, 1]} />
        <meshStandardMaterial color="#071a17" roughness={0.9} />
      </mesh>

      {/* Central Sanctuary Plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[4.2, 24]} />
        <meshStandardMaterial color="#0f2e29" roughness={0.8} />
      </mesh>

      {/* Ancient Stone Pathways Connecting Artifacts */}
      {/* North Pathway to Forgotten Clock */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -5]}>
        <planeGeometry args={[2.2, 9]} />
        <meshStandardMaterial color="#13352f" roughness={0.7} />
      </mesh>

      {/* Southwest Pathway to Living Book */}
      <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 3]} position={[-7, 0.012, 4]}>
        <planeGeometry args={[2.0, 14]} />
        <meshStandardMaterial color="#13352f" roughness={0.7} />
      </mesh>

      {/* Southeast Pathway to Last Crystal */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 3]} position={[7, 0.012, 4]}>
        <planeGeometry args={[2.0, 14]} />
        <meshStandardMaterial color="#13352f" roughness={0.7} />
      </mesh>

      {/* Central Sanctuary Outer Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[4.0, 4.3, 32]} />
        <meshBasicMaterial color="#22d3aa" transparent opacity={0.3} />
      </mesh>

      {/* ========================================================
          RUINED ARCHITECTURE: PILLARS & ARCHWAYS
         ======================================================== */}
      {/* Ancient Temple Arches over Entrance */}
      <group position={[0, 0, 2]}>
        {/* Left Column */}
        <mesh position={[-3.5, 2.2, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 4.4, 8]} />
          <meshStandardMaterial color="#1e3a35" roughness={0.7} />
        </mesh>
        {/* Right Column */}
        <mesh position={[3.5, 2.2, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 4.4, 8]} />
          <meshStandardMaterial color="#1e3a35" roughness={0.7} />
        </mesh>
        {/* Arch Beam */}
        <mesh position={[0, 4.4, 0]}>
          <boxGeometry args={[7.8, 0.5, 0.9]} />
          <meshStandardMaterial color="#16302c" roughness={0.7} />
        </mesh>
      </group>

      {/* Surrounding Ruined Pillars */}
      {[
        [-8, -8],
        [8, -8],
        [-8, 14],
        [8, 14],
      ].map(([px, pz], idx) => (
        <group key={idx} position={[px, 0, pz]}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.4, 0.5, 3.6, 8]} />
            <meshStandardMaterial color="#1e3a35" roughness={0.7} />
          </mesh>
          <mesh position={[0, 3.7, 0]}>
            <boxGeometry args={[1.1, 0.3, 1.1]} />
            <meshStandardMaterial color="#16302c" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ========================================================
          FANTASY FLORA: STYLIZED TREES & GLOWING CRYSTAL SPROUTS
         ======================================================== */}
      {[
        [-18, -12],
        [-10, -18],
        [10, -18],
        [18, -12],
        [-20, 2],
        [20, 2],
        [-18, 16],
        [18, 16],
        [-2, -20],
      ].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          {/* Tree Trunk */}
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.35, 0.5, 3.2, 6]} />
            <meshStandardMaterial color="#0c1e1c" roughness={0.9} />
          </mesh>
          {/* Layered Foliage Cones */}
          <mesh position={[0, 3.2, 0]}>
            <coneGeometry args={[2.2, 2.5, 6]} />
            <meshStandardMaterial color="#0d3b34" roughness={0.8} />
          </mesh>
          <mesh position={[0, 4.6, 0]}>
            <coneGeometry args={[1.6, 2.2, 6]} />
            <meshStandardMaterial color="#114e45" roughness={0.8} />
          </mesh>
          <mesh position={[0, 5.8, 0]}>
            <coneGeometry args={[1.0, 1.8, 6]} />
            <meshStandardMaterial color="#146358" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Scattered Glowing Crystal Sprouts on Meadow Edges */}
      {[
        [-6, 7],
        [6, 7],
        [-5, -4],
        [5, -4],
        [-11, -3],
        [11, -3],
        [-4, 11],
        [4, 11],
      ].map(([gx, gz], i) => (
        <mesh key={i} position={[gx, 0.35, gz]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color="#22d3aa"
            emissive="#10b981"
            emissiveIntensity={0.65}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Distant Boundary Mountain Ridge Silhouettes */}
      {[
        [0, -27, 54, 1],
        [0, 27, 54, 1],
        [-27, 0, 1, 54],
        [27, 0, 1, 54],
      ].map(([bx, bz, bw, bd], i) => (
        <mesh key={i} position={[bx, 1.5, bz]}>
          <boxGeometry args={[bw, 3, bd]} />
          <meshStandardMaterial color="#051412" roughness={1.0} />
        </mesh>
      ))}
    </>
  );
}
