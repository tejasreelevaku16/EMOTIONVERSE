import { useState, useCallback, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sky, ContactShadows, Sparkles, Float } from '@react-three/drei';
import { useGameStore } from '../hooks/useGameStore';
import { Player } from './Player';
import { Camera } from './Camera';
import { Environment } from './Environment';
import { Objects } from './Objects';

interface WorldProps {
  onProximityChange?: (nearbyArtifact: 'clock' | 'book' | 'crystal' | null) => void;
}

// Deterministic seeded positions so they don't re-randomize
const TREE_POSITIONS: Array<[number, number, number, number, number]> = [
  // [x, z, trunkH, canopyR, variant]
  [-18, -12, 5.5, 3.8, 0],
  [-10, -18, 6.2, 4.2, 1],
  [10,  -18, 5.8, 3.6, 0],
  [18,  -12, 7.0, 5.0, 2],
  [-20,   2, 6.5, 4.5, 1],
  [20,    2, 5.5, 3.8, 0],
  [-18,  16, 6.8, 4.8, 2],
  [18,   16, 6.0, 4.0, 1],
  [-2,  -20, 5.2, 3.4, 0],
  [-24,  -6, 7.5, 5.5, 2],
  [24,   -6, 7.0, 5.0, 1],
  [0,    24, 6.0, 4.2, 0],
  [-12,  10, 4.8, 3.2, 1],
  [12,   10, 5.0, 3.5, 2],
];

const BOULDER_POSITIONS: Array<[number, number, number, number, number, number]> = [
  [-5,  -6, 0.9, 0.7, 0.8, 0.3],
  [ 6,  -5, 0.7, 0.6, 0.9, 0.5],
  [-8,   5, 1.1, 0.8, 1.0, 0.2],
  [ 9,   5, 0.8, 0.7, 0.8, 0.4],
  [-13, -3, 1.2, 1.0, 1.1, 0.1],
  [13,  -3, 0.9, 0.8, 1.0, 0.3],
  [-3,  12, 0.7, 0.6, 0.8, 0.5],
  [ 4,  12, 1.0, 0.9, 0.9, 0.2],
];

const FLOWER_POSITIONS: Array<[number, number, number, string]> = [
  [-3, -3, 0.18, '#f472b6'],
  [ 3, -3, 0.16, '#818cf8'],
  [-5,  2, 0.20, '#34d399'],
  [ 5,  2, 0.18, '#fbbf24'],
  [-7, -1, 0.17, '#f472b6'],
  [ 7, -1, 0.19, '#a5b4fc'],
  [-2,  5, 0.18, '#6ee7b7'],
  [ 2,  5, 0.20, '#fca5a5'],
  [-9,  8, 0.17, '#818cf8'],
  [ 9,  8, 0.18, '#fbbf24'],
  [-11, 2, 0.19, '#f472b6'],
  [11,  2, 0.17, '#34d399'],
  [-4, -8, 0.18, '#a5b4fc'],
  [ 4, -8, 0.20, '#fca5a5'],
  [-6,  10, 0.17, '#6ee7b7'],
  [ 6,  10, 0.18, '#f472b6'],
];

const LANTERN_POSITIONS: Array<[number, number, number]> = [
  [-2.5, 0, -3.5],
  [ 2.5, 0, -3.5],
  [-8,   0,  3.0],
  [ 8,   0,  3.0],
  [-11,  0,  9.0],
  [11,   0,  9.0],
];

const PATH_STONES: Array<[number, number, number, number, number]> = [];
// Generate stepping stone path positions at load time
(function() {
  // North path to Clock [0,0,-10]
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    PATH_STONES.push([
      (Math.sin(i * 1.3) * 0.4),
      0, -2.5 - t * 7.0,
      0.6 + (i % 3) * 0.1,
      0.08 + (i % 2) * 0.04,
    ]);
  }
  // SW path to Book [-14,0,8]
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    PATH_STONES.push([
      -t * 10 + Math.sin(i * 1.1) * 0.3,
      0, t * 6 + Math.sin(i * 0.9) * 0.3,
      0.55 + (i % 3) * 0.1,
      0.07 + (i % 2) * 0.03,
    ]);
  }
  // SE path to Crystal [14,0,8]
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    PATH_STONES.push([
      t * 10 + Math.sin(i * 1.1) * 0.3,
      0, t * 6 + Math.sin(i * 0.9) * 0.3,
      0.55 + (i % 3) * 0.1,
      0.07 + (i % 2) * 0.03,
    ]);
  }
})();

function EnchantedTree({ x, z, trunkH, canopyR, variant, topColor, midColor, tipColor }: {
  x: number; z: number; trunkH: number; canopyR: number; variant: number;
  topColor: string; midColor: string; tipColor: string;
}) {
  const trunkColor = '#4a3728';
  const baseRadius = 0.28 + variant * 0.06;
  const trunkRadius = 0.18 + variant * 0.04;

  return (
    <group position={[x, 0, z]}>
      {/* Flared trunk base */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[baseRadius * 1.4, baseRadius * 2.2, 0.6, 7]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>
      {/* Main trunk */}
      <mesh position={[0, trunkH * 0.45, 0]}>
        <cylinderGeometry args={[trunkRadius, baseRadius * 1.5, trunkH * 0.9, 7]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>
      {/* Canopy — 3 offset sphere clusters for organic look */}
      <mesh position={[0, trunkH, 0]}>
        <sphereGeometry args={[canopyR, 8, 6]} />
        <meshStandardMaterial color={topColor} roughness={0.85} />
      </mesh>
      <mesh position={[canopyR * 0.4, trunkH - canopyR * 0.3, canopyR * 0.2]}>
        <sphereGeometry args={[canopyR * 0.72, 7, 5]} />
        <meshStandardMaterial color={midColor} roughness={0.85} />
      </mesh>
      <mesh position={[-canopyR * 0.35, trunkH - canopyR * 0.25, -canopyR * 0.25]}>
        <sphereGeometry args={[canopyR * 0.65, 7, 5]} />
        <meshStandardMaterial color={tipColor} roughness={0.85} />
      </mesh>
      {/* Moss ring at base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[baseRadius * 1.5, baseRadius * 3.5, 10]} />
        <meshStandardMaterial color="#2d5a1b" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Boulder({ x, z, rx, ry, rz, rot }: { x:number;z:number;rx:number;ry:number;rz:number;rot:number }) {
  return (
    <group position={[x, ry * 0.4, z]} rotation={[0, rot * Math.PI * 2, 0]}>
      <mesh>
        <sphereGeometry args={[1, 7, 5]} />
        <meshStandardMaterial color="#4a4a3a" roughness={0.9} />
        <mesh scale={[rx, ry, rz]}>
          <sphereGeometry args={[1, 6, 4]} />
          <meshStandardMaterial color="#3d3d2e" roughness={0.95} />
        </mesh>
      </mesh>
      {/* Moss on top */}
      <mesh position={[0, ry * 0.7, 0]}>
        <sphereGeometry args={[rx * 0.6, 6, 4]} />
        <meshStandardMaterial color="#3a6b22" roughness={0.9} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Post */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.2, 6]} />
        <meshStandardMaterial color="#8B6914" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Lantern housing */}
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
        <meshStandardMaterial color="#6b5a1a" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Glowing inner pane */}
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[0.22, 0.26, 0.22]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={1.4}
          transparent
          opacity={0.75}
          roughness={0.1}
        />
      </mesh>
      {/* Point light from lantern */}
      <pointLight position={[0, 2.3, 0]} intensity={0.8} distance={5} color="#f59e0b" />
      {/* Top cap */}
      <mesh position={[0, 2.56, 0]}>
        <coneGeometry args={[0.18, 0.2, 6]} />
        <meshStandardMaterial color="#6b5a1a" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

export function World({ onProximityChange }: WorldProps) {
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 0, 0]);
  const handlePlayerMove = useCallback((newPos: [number, number, number]) => {
    setPlayerPosition(newPos);
  }, []);

  const emotion = useGameStore((s) => s.emotion);
  
  // Cinematic intro fade
  const introMeshRef = useRef<THREE.Mesh>(null);
  const introOpacity = useRef(1.0);
  const introComplete = useRef(false);

  useFrame((_, delta) => {
    if (!introComplete.current && introMeshRef.current) {
      introOpacity.current = Math.max(0, introOpacity.current - delta * 0.28);
      const mat = introMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = introOpacity.current;
      if (introOpacity.current <= 0) {
        introComplete.current = true;
        introMeshRef.current.visible = false;
      }
    }
  });

  // Emotion-driven color palette
  const palette = useMemo(() => {
    switch (emotion) {
      case 'hope':
        return { canopyTop: '#2d6e1a', canopyMid: '#3a8a22', canopyTip: '#4aa82c',
                 ground: '#2a4a18', groundAccent: '#3d6622', skyTurbidity: 4,
                 skyRayleigh: 2, sunPos: [1, 0.4, 0] as [number,number,number],
                 sparkleColor: '#fbbf24', groundMoss: '#4a8a28' };
      case 'sadness':
        return { canopyTop: '#1a2a4a', canopyMid: '#1e3a5a', canopyTip: '#223050',
                 ground: '#141e2e', groundAccent: '#1a2840', skyTurbidity: 12,
                 skyRayleigh: 4, sunPos: [0.3, 0.1, -1] as [number,number,number],
                 sparkleColor: '#93c5fd', groundMoss: '#1e3a4a' };
      case 'curiosity':
        return { canopyTop: '#0d4a3a', canopyMid: '#114e45', canopyTip: '#146358',
                 ground: '#0a2820', groundAccent: '#0d3830', skyTurbidity: 6,
                 skyRayleigh: 2.5, sunPos: [0.5, 0.5, 0] as [number,number,number],
                 sparkleColor: '#22d3aa', groundMoss: '#0d5a40' };
      case 'fear':
        return { canopyTop: '#1a0a2a', canopyMid: '#250a3a', canopyTip: '#2d0a40',
                 ground: '#0d0814', groundAccent: '#160a20', skyTurbidity: 20,
                 skyRayleigh: 6, sunPos: [-0.3, 0.05, -0.8] as [number,number,number],
                 sparkleColor: '#c084fc', groundMoss: '#1a0a28' };
      default:
        return { canopyTop: '#0d3b34', canopyMid: '#114e45', canopyTip: '#146358',
                 ground: '#071a17', groundAccent: '#0f2e29', skyTurbidity: 8,
                 skyRayleigh: 3, sunPos: [0.5, 0.3, 0] as [number,number,number],
                 sparkleColor: '#22d3aa', groundMoss: '#0d4a35' };
    }
  }, [emotion]);

  // Sparkles color based on ending/atmosphere
  const sparkleCount = emotion === 'fear' ? 20 : emotion === 'sadness' ? 30 : 60;

  return (
    <>
      <Environment />
      <Camera targetPosition={playerPosition} />
      <Player onPositionUpdate={handlePlayerMove} initialPosition={[0, 0, 0]} />
      <Objects playerPos={playerPosition} onProximityChange={onProximityChange} />

      {/* ── ATMOSPHERIC SKY ── */}
      <Sky
        distance={450000}
        sunPosition={palette.sunPos}
        turbidity={palette.skyTurbidity}
        rayleigh={palette.skyRayleigh}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* ── AMBIENT MAGICAL SPARKLES ── */}
      <Sparkles
        count={sparkleCount}
        scale={[46, 10, 46]}
        size={1.8}
        speed={emotion === 'fear' ? 0.6 : 0.3}
        opacity={0.7}
        color={palette.sparkleColor}
        noise={0.5}
      />

      {/* ── GROUND TERRAIN ── */}
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[64, 64, 6, 6]} />
        <meshStandardMaterial color={palette.ground} roughness={0.95} />
      </mesh>
      {/* Central glade — lighter mossy clearing */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[7.5, 32]} />
        <meshStandardMaterial color={palette.groundMoss} roughness={0.9} />
      </mesh>
      {/* Inner plaza circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[4.0, 32]} />
        <meshStandardMaterial color={palette.groundAccent} roughness={0.85} />
      </mesh>
      {/* Grass texture ring around plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[4.2, 7.5, 32]} />
        <meshStandardMaterial color={palette.groundMoss} roughness={0.9} />
      </mesh>

      {/* ── STEPPING STONE PATHWAYS ── */}
      {PATH_STONES.map(([sx, sz, sw, sh], i) => (
        <mesh key={i} position={[sx, sh * 0.5 + 0.015, sz]} rotation={[0, (i * 0.7) % (Math.PI * 2), 0]}>
          <boxGeometry args={[sw, sh, sw * 0.8]} />
          <meshStandardMaterial color="#8a8070" roughness={0.8} />
        </mesh>
      ))}

      {/* ── CENTRAL GLADE RUNE RING ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[3.8, 4.0, 48]} />
        <meshBasicMaterial color="#22d3aa" transparent opacity={0.35} />
      </mesh>
      {/* Inner rune circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[1.8, 2.0, 24]} />
        <meshBasicMaterial color="#22d3aa" transparent opacity={0.2} />
      </mesh>

      {/* ── ENCHANTED TREES ── */}
      {TREE_POSITIONS.map(([x, z, trunkH, canopyR, variant], i) => (
        <EnchantedTree
          key={i}
          x={x} z={z}
          trunkH={trunkH}
          canopyR={canopyR}
          variant={variant}
          topColor={palette.canopyTop}
          midColor={palette.canopyMid}
          tipColor={palette.canopyTip}
        />
      ))}

      {/* ── MOSS-COVERED BOULDERS ── */}
      {BOULDER_POSITIONS.map(([x, z, rx, ry, rz, rot], i) => (
        <Boulder key={i} x={x} z={z} rx={rx} ry={ry} rz={rz} rot={rot} />
      ))}

      {/* ── GLOWING WILDFLOWERS ── */}
      {FLOWER_POSITIONS.map(([fx, fz, fr, fc], i) => (
        <group key={i} position={[fx as number, 0, fz as number]}>
          {/* Stem */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.015, 0.02, 0.3, 4]} />
            <meshStandardMaterial color="#2d6b1a" roughness={0.8} />
          </mesh>
          {/* Petal bloom */}
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[fr as number, 7, 5]} />
            <meshStandardMaterial
              color={fc as string}
              emissive={fc as string}
              emissiveIntensity={0.5}
              roughness={0.3}
            />
          </mesh>
          {/* Centre dot */}
          <mesh position={[0, 0.34, 0]}>
            <sphereGeometry args={[(fr as number) * 0.35, 5, 4]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}

      {/* ── GOLDEN LANTERNS ── */}
      {LANTERN_POSITIONS.map((pos, i) => (
        <Lantern key={i} position={pos} />
      ))}

      {/* ── ANCIENT STONE ARCHWAY ── */}
      <group position={[0, 0, 2.5]}>
        <mesh position={[-3.6, 2.5, 0]}>
          <cylinderGeometry args={[0.38, 0.52, 5.0, 7]} />
          <meshStandardMaterial color="#3a3028" roughness={0.85} />
        </mesh>
        <mesh position={[3.6, 2.5, 0]}>
          <cylinderGeometry args={[0.38, 0.52, 5.0, 7]} />
          <meshStandardMaterial color="#3a3028" roughness={0.85} />
        </mesh>
        <mesh position={[0, 5.1, 0]}>
          <boxGeometry args={[8.2, 0.55, 0.9]} />
          <meshStandardMaterial color="#2e261e" roughness={0.85} />
        </mesh>
        {/* Vine/moss drape on arch */}
        <mesh position={[0, 5.0, 0.1]}>
          <boxGeometry args={[7.5, 0.3, 0.2]} />
          <meshStandardMaterial color="#3a6b22" roughness={0.9} />
        </mesh>
      </group>

      {/* ── RUINED PILLARS ── */}
      {([[-8,-8],[ 8,-8],[-8,14],[ 8,14]] as [number,number][]).map(([px,pz], idx) => (
        <group key={idx} position={[px, 0, pz]}>
          <mesh position={[0, 2.0, 0]}>
            <cylinderGeometry args={[0.42, 0.55, 4.0, 7]} />
            <meshStandardMaterial color="#3a3028" roughness={0.85} />
          </mesh>
          <mesh position={[0, 4.1, 0]}>
            <boxGeometry args={[1.1, 0.35, 1.1]} />
            <meshStandardMaterial color="#2e261e" roughness={0.85} />
          </mesh>
          {/* Moss on pillar */}
          <mesh position={[0.1, 1.2, 0.3]}>
            <sphereGeometry args={[0.35, 5, 4]} />
            <meshStandardMaterial color="#2d6b1a" roughness={0.9} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* ── GLOWING CRYSTAL SPROUTS ── */}
      {([[- 6,7],[6,7],[-5,-4],[5,-4],[-11,-3],[11,-3],[-4,11],[4,11]] as [number,number][]).map(([gx, gz], i) => (
        <Float key={i} speed={1.5} floatIntensity={0.4} rotationIntensity={0.2}>
          <mesh position={[gx, 0.45, gz]}>
            <octahedronGeometry args={[0.32, 0]} />
            <meshStandardMaterial
              color="#22d3aa"
              emissive="#10b981"
              emissiveIntensity={0.8}
              roughness={0.15}
            />
          </mesh>
        </Float>
      ))}

      {/* ── SOFT CONTACT SHADOWS ── */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.45}
        scale={40}
        blur={2.5}
        far={3}
        resolution={256}
        color="#000820"
      />

      {/* ── WORLD BOUNDARY — distant dark treeline silhouette ── */}
      {([[0,-30,70,1],[0,30,70,1],[-30,0,1,70],[30,0,1,70]] as [number,number,number,number][]).map(([bx,bz,bw,bd], i) => (
        <mesh key={i} position={[bx, 2.5, bz]}>
          <boxGeometry args={[bw, 5, bd]} />
          <meshStandardMaterial color={palette.canopyTop} roughness={1.0} />
        </mesh>
      ))}

      {/* ── CINEMATIC INTRO FADE ── */}
      <mesh ref={introMeshRef} position={[0, 0, 0]} renderOrder={999} frustumCulled={false}>
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial color="#000000" transparent opacity={1.0} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}