// Pure 2D Circle Collider Registry & Collision Resolution (C-4, Property 9)

import { distance2D } from './bounds';

export interface CircleCollider {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export const PLAYER_RADIUS = 0.55;
export const INTERACTION_RADIUS = 3.5;

// Default environment colliders for the 3 artifacts and ruin obstacles
export const STATIC_COLLIDERS: CircleCollider[] = [
  // 1. Forgotten Clock Altar at [0, 0, -10]
  { id: 'clock_altar', x: 0, z: -10, radius: 1.4 },
  // 2. Living Book Pedestal at [-14, 0, 8]
  { id: 'book_pedestal', x: -14, z: 8, radius: 1.3 },
  // 3. Last Crystal Sanctuary Dais at [14, 0, 8]
  { id: 'crystal_dais', x: 14, z: 8, radius: 1.5 },

  // Ruined Pillars & Ancient Monuments
  { id: 'pillar_northwest', x: -8, z: -8, radius: 0.9 },
  { id: 'pillar_northeast', x: 8, z: -8, radius: 0.9 },
  { id: 'pillar_southwest', x: -8, z: 14, radius: 0.9 },
  { id: 'pillar_southeast', x: 8, z: 14, radius: 0.9 },
  { id: 'ancient_arch_left', x: -3.5, z: 0, radius: 0.8 },
  { id: 'ancient_arch_right', x: 3.5, z: 0, radius: 0.8 },
];

/**
 * Resolves circle-vs-circle collisions.
 * If the proposed position penetrates any collider, it pushes the position out along the collision normal.
 */
export function resolveCollisions(
  pos: [number, number, number],
  colliders: CircleCollider[] = STATIC_COLLIDERS,
  playerRadius: number = PLAYER_RADIUS
): [number, number, number] {
  let currX = pos[0];
  const currY = pos[1];
  let currZ = pos[2];

  for (const col of colliders) {
    const dist = distance2D([currX, currZ], [col.x, col.z]);
    const minDist = playerRadius + col.radius;

    if (dist < minDist && dist > 0.0001) {
      // Penetration depth
      const overlap = minDist - dist;
      const normalX = (currX - col.x) / dist;
      const normalZ = (currZ - col.z) / dist;

      currX += normalX * overlap;
      currZ += normalZ * overlap;
    }
  }

  return [currX, currY, currZ];
}

/**
 * Checks whether the player is within interaction range of a given target position.
 */
export function isWithinInteractionRange(
  playerPos: [number, number, number],
  targetPos: [number, number, number] | [number, number],
  interactionRadius: number = INTERACTION_RADIUS
): boolean {
  return distance2D(playerPos, targetPos) <= interactionRadius;
}
