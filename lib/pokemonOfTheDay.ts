/*
  lib/pokemonOfTheDay.ts

  Deterministically pick a Pokémon based on today's date.
  Same Pokémon for all users on the same calendar day.
*/

export function getPokemonOfTheDayIds(): [number, number, number] {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD

  // Hash the date string by summing ASCII values
  // Same date always produces same hash
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash += dateString.charCodeAt(i);
  }

  // Reduce to [0, 1024] range first
  const base = Math.abs(hash) % 1025;

  // Generate 3 distinct IDs using base + offsets (1/3 and 2/3 of range)
  // This guarantees all 3 are always different
  const id1 = base + 1;
  const id2 = ((base + 341) % 1025) + 1;
  const id3 = ((base + 682) % 1025) + 1;

  return [id1, id2, id3];
}
