// Pure Math & Interpolation Utilities

/**
 * Clamps a numerical value within [min, max].
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Linear interpolation between two scalar numbers.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Parses a standard 6-character hex color code into [r, g, b] (0-255).
 */
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  if (isNaN(bigint)) {
    return [0, 0, 0];
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

/**
 * Converts [r, g, b] into a #RRGGBB hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const c = clamp(Math.round(n), 0, 255).toString(16);
    return c.length === 1 ? '0' + c : c;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Linearly interpolates between two hex colors.
 */
export function lerpColor(hexA: string, hexB: string, t: number): string {
  const [rA, gA, bA] = hexToRgb(hexA);
  const [rB, gB, bB] = hexToRgb(hexB);
  const factor = clamp(t, 0, 1);

  const r = lerp(rA, rB, factor);
  const g = lerp(gA, gB, factor);
  const b = lerp(bA, bB, factor);

  return rgbToHex(r, g, b);
}
