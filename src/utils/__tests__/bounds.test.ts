import { describe, it, expect } from 'vitest';
import { clampToBounds, distance2D, WORLD_BOUNDS } from '../bounds';
import {
  resolveCollisions,
  isWithinInteractionRange,
  STATIC_COLLIDERS,
  PLAYER_RADIUS,
} from '../colliders';

describe('Player Movement Bounds & Colliders (Property 9)', () => {
  it('clamps attempted positions strictly inside the world boundaries', () => {
    // Attempting to move far beyond max bounds
    const outEast = clampToBounds([100, 0, 0], WORLD_BOUNDS);
    expect(outEast[0]).toBe(WORLD_BOUNDS.maxX);

    const outWest = clampToBounds([-50, 0, 0], WORLD_BOUNDS);
    expect(outWest[0]).toBe(WORLD_BOUNDS.minX);

    const outNorth = clampToBounds([0, 0, -80], WORLD_BOUNDS);
    expect(outNorth[2]).toBe(WORLD_BOUNDS.minZ);

    const outSouth = clampToBounds([0, 0, 80], WORLD_BOUNDS);
    expect(outSouth[2]).toBe(WORLD_BOUNDS.maxZ);

    // Position within bounds is untouched
    const inside = clampToBounds([5, 0, -5], WORLD_BOUNDS);
    expect(inside).toEqual([5, 0, -5]);
  });

  it('calculates Euclidean 2D distance accurately', () => {
    expect(distance2D([0, 0], [3, 4])).toBe(5);
    expect(distance2D([0, 0, 0], [0, 0, 10])).toBe(10);
  });

  it('prevents player from penetrating static prop colliders', () => {
    // Clock altar is at [0, 0, -10] with radius 1.4
    const clockAltar = STATIC_COLLIDERS.find((c) => c.id === 'clock_altar')!;
    const attemptedPos: [number, number, number] = [0, 0, -10.5]; // Deep inside the altar

    const resolved = resolveCollisions(attemptedPos, [clockAltar], PLAYER_RADIUS);
    const distAfter = distance2D([resolved[0], resolved[2]], [clockAltar.x, clockAltar.z]);

    // Distance must now be at least playerRadius + colliderRadius
    expect(distAfter).toBeGreaterThanOrEqual(PLAYER_RADIUS + clockAltar.radius - 0.001);
  });

  it('accurately identifies when player is within interaction range', () => {
    const clockPos: [number, number, number] = [0, 0, -10];

    // Player standing at distance 2.5 (inside 3.5 range)
    expect(isWithinInteractionRange([0, 0, -7.5], clockPos)).toBe(true);

    // Player standing at distance 5.0 (outside 3.5 range)
    expect(isWithinInteractionRange([0, 0, -5.0], clockPos)).toBe(false);
  });
});
