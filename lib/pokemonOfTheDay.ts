/*
  lib/pokemonOfTheDay.ts

  Deterministically pick a Pokémon based on today's date.
  Same Pokémon for all users on the same calendar day.
*/

export function getPokemonOfTheDayIds(): [number, number, number] {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Hash the date string using DJB2 (polynomial rolling hash)
  // Creates chaotic, non-linear values for small input changes
  // So consecutive dates like "2026-04-20" and "2026-04-21" produce very different hashes
  let hash = 5381; // Magic seed value for good distribution
  for (let i = 0; i < dateString.length; i++) {
    // ((hash << 5) + hash) means: (hash * 32) + hash = hash * 33
    // Multiply by 33 each iteration, creating avalanche effect:
    // small input changes cause large hash changes
    hash = (hash << 5) + hash + dateString.charCodeAt(i);
  }

  // Reduce to [0, 1024] range
  const base = Math.abs(hash) % 1025;

  // Generate 3 distinct IDs using base + offsets (1/3 and 2/3 of range)
  // This guarantees all 3 are always different
  const id1 = base + 1;
  const id2 = ((base + 341) % 1025) + 1;
  const id3 = ((base + 682) % 1025) + 1;

  return [id1, id2, id3];
}
