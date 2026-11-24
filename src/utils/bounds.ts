// Pure Mathematical Bounds & Movement Clamping (HR-1 / Property 9)

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WORLD_BOUNDS: Bounds2D = {
  minX: -26,
  maxX: 26,
  minZ: -26,
  maxZ: 26,
};

/**
 * Clamps a 3D position [x, y, z] so that x and z remain inside the environment bounds.
 */
export function clampToBounds(
  pos: [number, number, number],
  bounds: Bounds2D = WORLD_BOUNDS
): [number, number, number] {
  const x = Math.max(bounds.minX, Math.min(bounds.maxX, pos[0]));
  const y = pos[1];
  const z = Math.max(bounds.minZ, Math.min(bounds.maxZ, pos[2]));
  return [x, y, z];
}

/**
 * Calculates Euclidean 2D distance on the XZ plane between two positions.
 */
export function distance2D(
  posA: [number, number, number] | [number, number],
  posB: [number, number, number] | [number, number]
): number {
  const dx = posA[0] - posB[0];
  const dz = (posA.length === 3 ? posA[2] : posA[1]) - (posB.length === 3 ? posB[2] : posB[1]);
  return Math.sqrt(dx * dx + dz * dz);
}
