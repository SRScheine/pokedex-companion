#!/usr/bin/env node

/**
 * Script to find maximum base stats for Gen 1 Pokemon (1-151)
 * Runs in Node.js, fetches from PokéAPI
 */

const BASE_URL = "https://pokeapi.co/api/v2";

async function fetchPokemon(id) {
  const response = await fetch(`${BASE_URL}/pokemon/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch Pokemon ${id}`);
  return response.json();
}

async function findMaxStats() {
  const statsMap = {
    hp: 0,
    attack: 0,
    defense: 0,
    "special-attack": 0,
    "special-defense": 0,
    speed: 0,
  };

  const pokemonWithMaxStats = {
    hp: { pokemon: "", value: 0 },
    attack: { pokemon: "", value: 0 },
    defense: { pokemon: "", value: 0 },
    "special-attack": { pokemon: "", value: 0 },
    "special-defense": { pokemon: "", value: 0 },
    speed: { pokemon: "", value: 0 },
  };

  console.log("Fetching stats for all 151 Gen 1 Pokémon...\n");

  for (let i = 1; i <= 151; i++) {
    try {
      const pokemon = await fetchPokemon(i);
      
      // Iterate through the stats
      pokemon.stats.forEach((stat) => {
        const statName = stat.stat.name;
        const baseValue = stat.base_stat;

        if (baseValue > statsMap[statName]) {
          statsMap[statName] = baseValue;
          pokemonWithMaxStats[statName] = {
            pokemon: pokemon.name,
            value: baseValue,
          };
        }
      });

      if (i % 20 === 0) {
        process.stdout.write(`\rProcessed ${i}/151...`);
      }
    } catch (error) {
      console.error(`Error fetching Pokemon ${i}:`, error.message);
    }
  }

  console.log("\n\n═════════════════════════════════════════");
  console.log("MAX STATS FOR GEN 1 POKÉMON (1-151)");
  console.log("═════════════════════════════════════════\n");

  const statNameMap = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  };

  const orderedStats = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
  
  orderedStats.forEach((statKey) => {
    const { pokemon, value } = pokemonWithMaxStats[statKey];
    console.log(`${statNameMap[statKey].padEnd(12)} : ${value} (${pokemon})`);
  });

  console.log("\n═════════════════════════════════════════");
  console.log("USE THESE VALUES IN StatBar.tsx:");
  console.log("═════════════════════════════════════════\n");
  console.log("const MAX_STATS = {");
  orderedStats.forEach((statKey) => {
    const { value } = pokemonWithMaxStats[statKey];
    console.log(`  ${statKey}: ${value},`);
  });
  console.log("};");
  console.log();
}

findMaxStats().catch(console.error);
