/**
 * Hash a string into four unsigned 32-bit integers.
 *
 * Notes:
 * - Deterministic, non-cryptographic string hash (cyrb128 variant).
 * - Used to derive the initial 128-bit state for the sfc32 PRNG from an arbitrary seed.
 *
 * @param str Seed string to hash
 * @returns Tuple of four 32-bit unsigned integers [a, b, c, d]
 * @internal
 */
const cyrb128 = (str: string): [number, number, number, number] => {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k: number; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
};

/**
 * Small Fast Counter 32-bit PRNG (sfc32).
 *
 * Creates a pseudo-random number generator closure using four 32-bit seeds.
 * Each invocation advances the internal state and returns a float in [0, 1).
 * Deterministic given the same initial state; not cryptographically secure.
 *
 * @param a Seed part A (uint32)
 * @param b Seed part B (uint32)
 * @param c Seed part C (uint32)
 * @param d Seed part D (uint32)
 * @returns Function that yields a number in [0, 1) on each call
 */
export const sfc32 = (a: number, b: number, c: number, d: number) => {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    return (r >>> 0) / 4294967296;
  };
};

/**
 * Create a deterministic RNG from a string seed.
 *
 * Uses cyrb128 to expand the string seed into four uint32 values and feeds
 * them into sfc32. The resulting RNG is stable across Node, browsers, and CI.
 *
 * @param seed Arbitrary seed string
 * @returns RNG function returning a float in [0, 1) on each call
 */
export const createRng = (seed: string) => {
  const [a, b, c, d] = cyrb128(seed);
  return sfc32(a, b, c, d);
};
