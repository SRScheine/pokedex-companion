/*
  lib/pokemonOfTheDay.ts

  Deterministically pick 3 distinct Pokémon based on today's date.
  Same Pokémon for all users on the same calendar day.
*/

const ONE_DAY = 24 * 60 * 60 * 1000;
const MAX_POKEMON_ID = 1025;

/*
  mixBits — takes an integer and scrambles its bits so that inputs close together
  (like today=20580 and tomorrow=20581) produce outputs that are completely unrelated.

  This is the "finalizer" step from Murmur3, a well-known hash algorithm.
  It works in three rounds of the same operation: XOR-then-multiply.

  XOR (^): think of it like addition without carrying. In binary, 1+1 doesn't
  carry over — it just resets to 0. This spreads information from the high bits
  down into the low bits.

  >>> 16: shift the binary representation right by 16 places (drop the bottom
  half of bits, fill the top with zeros). This is how we target the high bits —
  shift them down so XOR can mix them with the low bits.

  Math.imul: normal JS multiplication on large integers loses precision because
  JS uses 64-bit floats. Math.imul forces true 32-bit integer multiplication,
  where overflow just wraps around (like a clock going past 12). This wrapping
  is intentional — it's what makes the scrambling nonlinear and hard to reverse.

  >>> 0 at the end: forces the result back into an unsigned 32-bit integer.
  Without it, JS can silently treat the number as signed and mess up the range.

  After two rounds of XOR+multiply, adjacent inputs like 20580 and 20581
  map to outputs that differ in nearly every bit — exactly what we want.
*/
function mixBits(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/*
  makeRand — a seeded pseudo-random number generator (PRNG).
  Given the same seed, it always produces the same sequence of numbers.

  This is a Linear Congruential Generator (LCG): the classic PRNG formula
  next = (a * current + c) mod m

  Here: a=1664525, c=1013904223, m=2^32 (via >>> 0 wrapping)
  These constants are from Knuth's Art of Computer Programming — chosen because
  they pass statistical tests for randomness and cover the full range before repeating.

  Each call advances the internal state s and returns a float in [0, 1).
  Dividing by 0x100000000 (which is 2^32) scales the 32-bit integer into that range,
  same idea as dividing a dice roll by 6 to get a fraction.
*/
function makeRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function getPokemonOfTheDayIds(): [number, number, number] {
  // Days elapsed since Jan 1 1970 — a simple integer that increments by 1 each day.
  // Using this instead of a date string avoids the bug where string hashes of
  // consecutive dates differ by only 1, producing nearly identical seeds.
  const dayIndex = Math.floor(Date.now() / ONE_DAY);

  // Scramble the day index so that today and tomorrow feel completely unrelated.
  const seed = mixBits(dayIndex);

  // Draw IDs one at a time until we have 3 unique ones.
  // The Set automatically rejects duplicates, so we just keep drawing.
  // With 1025 possible IDs and only 3 needed, collisions are rare (~0.3% chance
  // of needing a 4th draw), so this loop almost always runs exactly 3 times.
  const rand = makeRand(seed);
  const ids = new Set<number>();
  while (ids.size < 3) {
    // rand() is in [0, 1), so rand() * 1025 is in [0, 1025), floor gives [0, 1024], +1 gives [1, 1025]
    ids.add(Math.floor(rand() * MAX_POKEMON_ID) + 1);
  }

  return [...ids] as [number, number, number];
}
