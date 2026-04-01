/*
  lib/api.ts — PokéAPI Data Layer
  
  ============================================================
  THE BIGGEST MINDSET SHIFT FROM REACT NATIVE
  ============================================================
  
  In React Native, data fetching ALWAYS looked like this:
  
    const [pokemon, setPokemon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
      fetch('https://pokeapi.co/api/v2/pokemon/25')
        .then(res => res.json())
        .then(data => {
          setPokemon(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err);
          setLoading(false);
        });
    }, []);
  
  That's a LOT of boilerplate for something simple. And it runs
  on the device, after the JS bundle loads, after the component
  mounts. The user sees a loading spinner every single time.
  
  In Next.js with Server Components, fetching looks like this:
  
    const pokemon = await getPokemon(25);
  
  That's it. One line. No useState, no useEffect, no loading state.
  The data is fetched ON THE SERVER before the page is sent to
  the browser. The user gets a fully-rendered page immediately.
  
  The functions in this file are designed to be called directly
  inside async Server Components. We'll see this in action in
  the next files.
  
  ============================================================
  NEXT.JS FETCH CACHING
  ============================================================
  
  Next.js extends the native `fetch` API with caching superpowers.
  By default, fetch results are cached — if two pages request the
  same Pokémon, the second request uses the cached result.
  
  You control caching with the options object:
  
    fetch(url, { cache: 'force-cache' })    // Cache forever (default)
    fetch(url, { cache: 'no-store' })       // Never cache (always fresh)
    fetch(url, { next: { revalidate: 3600 }}) // Re-fetch after 1 hour
  
  PokéAPI data never changes, so we use 'force-cache' everywhere.
  In a real app with user data, you'd use 'no-store' or revalidate.
  
  In React Native, you'd implement this manually with AsyncStorage
  or a library like React Query. Next.js bakes it in for free.
  
  ============================================================
  ERROR HANDLING STRATEGY
  ============================================================
  
  These functions throw errors on failure rather than returning
  null. This works with Next.js's error boundary system —
  if a fetch fails, it bubbles up to the nearest error.tsx file
  which shows a friendly error UI. We'll create that later.
  
  For cases where "not found" is expected (like a search with
  no results), we return null instead of throwing.
*/

import {
  Pokemon,
  PokemonListResponse,
  PokemonSpecies,
  EvolutionChain,
  EvolutionDetail,
  PokemonTypeData,
  Move,
  TOTAL_POKEMON,
  LETS_GO_VERSION_GROUP,
  FlavorTextEntry,
} from '@/types/pokemon';

import pokemonStatsData from '@/lib/data/pokemon-stats.json';

// Base URL for all PokéAPI requests
const BASE_URL = 'https://pokeapi.co/api/v2';

/* ============================================================
   CORE FETCH HELPER
   
   A thin wrapper around fetch that:
   1. Adds Next.js caching options
   2. Handles non-200 responses
   3. Parses JSON
   4. Is typed with a generic <T> so callers get proper types back
   ============================================================ */

/**
 * Generic fetch helper with Next.js caching.
 *
 * The <T> generic means: "I don't know the return type yet,
 * but whoever calls this function will tell me what it is."
 *
 * Usage:
 *   const data = await apiFetch<Pokemon>('/pokemon/25');
 *   // data is typed as Pokemon ✓
 *
 * TypeScript generics work identically in RN and web.
 */
const apiFetch = async <T>(endpoint: string, options: {cache?: RequestCache; revalidate?: number} = {}): Promise<T> => {
  const url = endpoint.startsWith('http')
    ? endpoint // Full URL (for when PokéAPI gives us a URL directly)
    : `${BASE_URL}${endpoint}`; // Relative endpoint

  const response = await fetch(url, {
    /*
      Next.js cache options:
      'force-cache': Cache this response indefinitely.
      Perfect for PokéAPI since the data never changes.
      
      This is a Next.js extension to the standard fetch API.
      Standard fetch doesn't have this option — it's added by Next.js
      at build time. In React Native, fetch is just standard fetch
      with no caching extensions.
    */
    cache: options.revalidate ? undefined : (options.cache ?? 'force-cache'),
    next: options.revalidate ? {revalidate: options.revalidate} : undefined,
  });

  if (!response.ok) {
    // Throw with status code so callers can handle 404 vs 500 differently
    throw new Error(`PokéAPI error: ${response.status} for ${url}`);
  }

  return response.json() as Promise<T>;
};

/**
 * Clean up PokéAPI flavor text.
 * The API returns text with form feed (\f) and newline (\n)
 * characters used for line breaks in the game's text box.
 * We replace them with spaces for web display.
 */
const cleanFlavorText = (text: string): string => {
  return text
    .replace(/\f/g, ' ') // form feed → space
    .replace(/\n/g, ' ') // newline → space
    .replace(/\s+/g, ' ') // multiple spaces → single space
    .trim();
};

/**
 * Capitalize the first letter of a string.
 * PokéAPI returns all names in lowercase ("pikachu" → "Pikachu")
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/* ============================================================
   POKÉMON LIST FUNCTIONS
   ============================================================ */

/**
 * Fetch a paginated list of Pokémon.
 *
 * @param limit  How many to fetch
 * @param offset How many to skip (for pagination)
 */
export const getPokemonList = async (limit: number = 100, offset: number = 0): Promise<PokemonListResponse> => {
  return apiFetch<PokemonListResponse>(`/pokemon?limit=${limit}&offset=${offset}`);
};

/**
 * Fetch a page of Pokémon WITH their full details.
 *
 * The list endpoint only gives us name + URL. This function
 * fetches the list AND then fetches each Pokémon's details
 * in parallel using Promise.all.
 *
 * Promise.all: fires all fetches simultaneously and waits for
 * all of them to complete. Much faster than fetching one by one.
 * Works identically in RN and web — standard JavaScript.
 *
 * @param limit  Number of Pokémon per page
 * @param offset Starting offset for pagination
 */
export const getPokemonListWithDetails = async (limit: number = 100, offset: number = 0): Promise<Pokemon[]> => {
  const listData = await getPokemonList(limit, offset);

  /*
    Promise.all pattern:
    
    Instead of:
      const p1 = await fetch(url1);  // waits 200ms
      const p2 = await fetch(url2);  // waits another 200ms
      const p3 = await fetch(url3);  // waits another 200ms
      // Total: ~600ms
    
    We do:
      const [p1, p2, p3] = await Promise.all([
        fetch(url1),
        fetch(url2),
        fetch(url3),
      ]);
      // Total: ~200ms (all run simultaneously)
    
    For 20 Pokémon, this is a 20x speed improvement.
    This is being a "good steward" of PokéAPI — fewer sequential
    round trips, faster for the user, same total load on the server.
  */
  const pokemonDetails = await Promise.all(listData.results.map((item) => apiFetch<Pokemon>(item.url)));

  return pokemonDetails;
};

/* ============================================================
   INDIVIDUAL POKÉMON FUNCTIONS
   ============================================================ */

/**
 * Fetch a single Pokémon by ID or name.
 *
 * Returns null if not found (404) instead of throwing,
 * since "not found" is an expected case (e.g. invalid URL param).
 *
 * @param idOrName  National Dex number (25) or name ("pikachu")
 */
export const getPokemon = async (idOrName: string | number): Promise<Pokemon | null> => {
  try {
    return await apiFetch<Pokemon>(`/pokemon/${idOrName}`);
  } catch (error) {
    // Return null for 404s, re-throw for other errors
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

/**
 * Fetch species data for a Pokémon.
 * Species contains: Pokédex flavor text, evolution chain URL,
 * legendary/mythical status, capture rate, etc.
 *
 * You need BOTH pokemon + pokemon-species for a full detail page.
 *
 * @param idOrName  National Dex number or name
 */
export const getPokemonSpecies = async (idOrName: string | number): Promise<PokemonSpecies | null> => {
  try {
    return await apiFetch<PokemonSpecies>(`/pokemon-species/${idOrName}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

/**
 * Fetch both Pokémon and species data in parallel.
 * Used on the detail page where we need both.
 *
 * Returns a typed tuple — TypeScript knows index 0 is Pokemon | null
 * and index 1 is PokemonSpecies | null.
 */
export const getPokemonWithSpecies = async (
  idOrName: string | number
): Promise<[Pokemon | null, PokemonSpecies | null]> => {
  /*
    Promise.all with different return types:
    TypeScript infers the tuple type automatically here.
    This is one of the nicest TypeScript + async patterns.
  */
  return Promise.all([getPokemon(idOrName), getPokemonSpecies(idOrName)]);
};

/**
 * Get the English Pokédex flavor text for a Pokémon,
 * preferring newer games.
 *
 * The flavor text from PokéAPI has weird escaped whitespace
 * characters (\f, \n) that we clean up before displaying.
 */
export const getEnglishFlavorText = (entries: FlavorTextEntry[]): string => {
  // Prefer newer games for more relevant descriptions,
  // fall back to any English entry if needed
  const englishEntry = entries.filter((entry) => entry.language.name === 'en').pop(); // last entry tends to be most recent game
  return englishEntry ? cleanFlavorText(englishEntry.flavor_text) : '';
};

/* ============================================================
   EVOLUTION CHAIN FUNCTIONS
   ============================================================ */

/**
 * Fetch the evolution chain for a Pokémon species.
 *
 * The species data contains the evolution_chain.url — we fetch
 * that URL to get the full chain.
 *
 * @param evolutionChainUrl  The URL from species.evolution_chain.url
 */
export const getEvolutionChain = async (evolutionChainUrl: string): Promise<EvolutionChain> => {
  return apiFetch<EvolutionChain>(evolutionChainUrl);
};

/**
 * Turn a set of evolution details into a human-readable label. We try
 * to surface the most relevant information, falling back to the trigger
 * name when nothing more specific is available.
 *
 * The PokéAPI returns a rather complex object describing every possible
 * condition (item, level, happiness, trade, etc.). In our UI we only
 * need a short phrase such as "Lv. 16", "Thunder Stone" or "Trade".
 */
export const formatEvolutionDetails = (details: EvolutionDetail[]): string => {
  if (!details || details.length === 0) return '';
  const d = details[0]; // most chains only have one entry

  const humanize = (name: string) => capitalize(name.replace(/-/g, ' '));

  switch (d.trigger.name) {
    case 'level-up':
      if (d.min_level) return `Lv. ${d.min_level}`;
      if (d.min_happiness) return `Happiness ≥ ${d.min_happiness}`;
      if (d.time_of_day) return capitalize(d.time_of_day);
      if (d.location) return capitalize(d.location.name);
      if (d.known_move) return `After ${humanize(d.known_move.name)} learned`;
      break;
    case 'use-item':
      if (d.item) return humanize(d.item.name); // full name, e.g. "Thunder Stone"
      break;
    case 'trade':
      if (d.held_item) return `Trade holding ${humanize(d.held_item.name)}`;
      return 'Trade';
    default:
      return humanize(d.trigger.name);
  }

  // fallback
  return humanize(d.trigger.name);
};

/**
 * Helper: extract a flat array of Pokémon names from an evolution chain.
 *
 * The chain is a recursive linked list structure. This function
 * flattens it into a simple array we can iterate over.
 *
 * Example output for Charmander:
 *   ["charmander", "charmeleon", "charizard"]
 *
 * Example output for Eevee:
 *   ["eevee", "vaporeon", "jolteon", "flareon", ...]
 *
 * This is a recursive function — it calls itself on each
 * evolves_to entry. Same pattern in RN and web.
 */
export interface FlatEvolution {
  name: string;
  url: string;
  /**
   * The first evolution detail's minimum level (if applicable).
   * This mirrors the previous output for backwards compatibility, but
   * callers are encouraged to inspect `details` directly for richer
   * information.
   */
  minLevel: number | null;
  /**
   * All evolution details provided by the PokéAPI for this link. Most
   * chains only have one detail entry, but Eevee, for example, can have
   * multiple entries (one per possible stone).
   */
  details: EvolutionDetail[];
}

export const flattenEvolutionChain = (chain: EvolutionChain['chain']): FlatEvolution[] => {
  const result: FlatEvolution[] = [];

  const traverse = (link: EvolutionChain['chain']) => {
    result.push({
      name: link.species.name,
      url: link.species.url,
      minLevel: link.evolution_details[0]?.min_level ?? null,
      details: link.evolution_details,
    });

    link.evolves_to.forEach(traverse);
  };

  traverse(chain);
  return result;
};

/* ============================================================
   TYPE FUNCTIONS
   ============================================================ */

/**
 * Fetch type data including damage relations.
 * Used on the type chart page.
 *
 * @param typeName  e.g. "fire", "water", "psychic"
 */
export const getTypeData = async (typeName: string): Promise<PokemonTypeData> => {
  return apiFetch<PokemonTypeData>(`/type/${typeName}`);
};

/**
 * Fetch damage relations for multiple types at once.
 * Used when a Pokémon has two types — we need both to calculate
 * combined effectiveness.
 *
 * @param typeNames  Array of type names ["fire", "flying"]
 */
export const getMultipleTypeData = async (typeNames: string[]): Promise<PokemonTypeData[]> => {
  return Promise.all(typeNames.map(getTypeData));
};

/**
 * Calculate the combined type effectiveness for a Pokémon
 * that has one or two types.
 *
 * Returns a map of attacking type → damage multiplier.
 * e.g. { water: 2, fire: 0.5, ground: 0 }
 *
 * This is the math behind the type chart:
 *   - 2x from each type that deals double = 4x total
 *   - 0.5x from each type that resists = 0.25x total
 *   - 0x from any immunity = 0x total (immune)
 */
export const calculateTypeEffectiveness = (typeDataList: PokemonTypeData[]): Record<string, number> => {
  // Start with all types doing 1x damage
  const effectiveness: Record<string, number> = {};

  for (const typeData of typeDataList) {
    const {damage_relations} = typeData;

    // Apply double damage (2x)
    damage_relations.double_damage_from.forEach(({name}) => {
      effectiveness[name] = (effectiveness[name] ?? 1) * 2;
    });

    // Apply half damage (0.5x)
    damage_relations.half_damage_from.forEach(({name}) => {
      effectiveness[name] = (effectiveness[name] ?? 1) * 0.5;
    });

    // Apply immunity (0x) — overrides everything
    damage_relations.no_damage_from.forEach(({name}) => {
      effectiveness[name] = 0;
    });
  }

  return effectiveness;
};

/* ============================================================
   MOVE FUNCTIONS
   ============================================================ */

/**
 * Fetch a single move by name or ID.
 *
 * @param nameOrId  e.g. "thunderbolt" or 85
 */
export const getMove = async (nameOrId: string | number): Promise<Move | null> => {
  try {
    return await apiFetch<Move>(`/move/${nameOrId}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

/**
 * Get moves for a Pokémon filtered to Let's Go Pikachu.
 *
 * PokéAPI returns moves for EVERY game a Pokémon has appeared in.
 * We filter to only moves available in Let's Go.
 *
 * Returns a sorted list: level-up moves first (sorted by level),
 * then TM moves.
 */
export const getLetsGoMoves = (
  pokemon: Pokemon
): Array<{name: string; url: string; learnMethod: string; level: number}> => {
  const letsGoMoves: Array<{
    name: string;
    url: string;
    learnMethod: string;
    level: number;
  }> = [];

  for (const moveEntry of pokemon.moves) {
    // Find the Let's Go version group detail for this move
    const letsGoDetail = moveEntry.version_group_details.find(
      (detail) => detail.version_group.name === LETS_GO_VERSION_GROUP
    );

    if (letsGoDetail) {
      letsGoMoves.push({
        name: moveEntry.move.name,
        url: moveEntry.move.url,
        learnMethod: letsGoDetail.move_learn_method.name,
        level: letsGoDetail.level_learned_at,
      });
    }
  }

  // Sort: level-up moves first (sorted by level), then others alphabetically
  return letsGoMoves.sort((a, b) => {
    if (a.learnMethod === 'level-up' && b.learnMethod !== 'level-up') return -1;
    if (a.learnMethod !== 'level-up' && b.learnMethod === 'level-up') return 1;
    if (a.learnMethod === 'level-up' && b.learnMethod === 'level-up') {
      return a.level - b.level;
    }
    return a.name.localeCompare(b.name);
  });
};

/**
 * Get ALL moves for a Pokémon across every game.
 * Used on the detail page when the Gen 1 Only toggle is off.
 * Deduplicates by move name since a move can appear in many versions.
 */
export const getAllMoves = (
  pokemon: Pokemon
): Array<{name: string; url: string; learnMethod: string; level: number}> => {
  const seen = new Set<string>();
  const allMoves: Array<{name: string; url: string; learnMethod: string; level: number}> = [];

  for (const moveEntry of pokemon.moves) {
    if (seen.has(moveEntry.move.name)) continue;
    seen.add(moveEntry.move.name);

    // Use the first version group detail we find for learn method + level
    const detail = moveEntry.version_group_details[0];
    if (!detail) continue;

    allMoves.push({
      name: moveEntry.move.name,
      url: moveEntry.move.url,
      learnMethod: detail.move_learn_method.name,
      level: detail.level_learned_at,
    });
  }

  return allMoves.sort((a, b) => {
    if (a.learnMethod === 'level-up' && b.learnMethod !== 'level-up') return -1;
    if (a.learnMethod !== 'level-up' && b.learnMethod === 'level-up') return 1;
    if (a.learnMethod === 'level-up' && b.learnMethod === 'level-up') {
      return a.level - b.level;
    }
    return a.name.localeCompare(b.name);
  });
};

/* ============================================================
   SEARCH FUNCTION
   ============================================================ */

/**
 * Search for a Pokémon by name (partial match).
 *
 * PokéAPI doesn't have a search endpoint, so we fetch all 151
 * names (just names, no detail data) and filter client-side.
 *
 * This is fast because:
 * 1. The list endpoint returns minimal data (name + url only)
 * 2. The response is cached after the first call
 * 3. We filter in-memory, no additional API calls for the search itself
 *
 * @param query  Search string (case-insensitive partial match)
 */
export const searchPokemon = async (query: string): Promise<Array<{name: string; id: number; url: string}>> => {
  if (!query.trim()) return [];

  // Fetch all Pokémon names (cached after first call)
  const allPokemon = await apiFetch<PokemonListResponse>(`/pokemon?limit=${TOTAL_POKEMON}&offset=0`);

  const lowerQuery = query.toLowerCase().trim();

  return allPokemon.results
    .filter((p) => p.name.includes(lowerQuery))
    .map((p) => ({
      name: p.name,
      url: p.url,
      // Extract the ID from the URL: ".../pokemon/25/" → 25
      id: parseInt(p.url.split('/').filter(Boolean).pop() ?? '0'),
    }));
};

/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/**
 * Format a Pokémon's National Dex number with leading zeros.
 * 1 → "#001", 25 → "#025", 151 → "#151"
 *
 * String.padStart is standard JavaScript — same in RN and web.
 */
export const formatPokemonId = (id: number): string => {
  return `#${String(id).padStart(3, '0')}`;
};

/**
 * Format a hyphenated API name for display.
 * "special-attack" → "Special Attack"
 * "lets-go-pikachu" → "Lets Go Pikachu"
 */
export const formatName = (str: string): string => {
  return str.split('-').map(capitalize).join(' ');
};

/**
 * Get the sprite URL for a Pokémon by ID.
 * Uses the official artwork for large images, sprites for thumbnails.
 *
 * These URLs are stable and don't require an API call.
 * Useful for lists where we want to show images without
 * fetching full Pokémon data.
 */
export const getSpriteUrl = (id: number, type: 'sprite' | 'artwork' = 'sprite'): string => {
  if (type === 'artwork') {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
};

/**
 * Convert height from decimetres to a readable format.
 * PokéAPI: 7 → "0.7 m"
 */
export const formatHeight = (decimetres: number): string => {
  const metres = decimetres / 10;
  return `${metres.toFixed(1)} m`;
};

/**
 * Convert weight from hectograms to a readable format.
 * PokéAPI: 60 → "6.0 kg"
 */
export const formatWeight = (hectograms: number): string => {
  const kg = hectograms / 10;
  return `${kg.toFixed(1)} kg`;
};

/**
 * Get a color class for a stat bar based on the stat value.
 * Used for the stat visualization on detail pages.
 * Low stats are red, mid are yellow, high are green.
 */
export const getStatColor = (value: number): string => {
  if (value < 25) return 'bg-red-400';
  if (value < 50) return 'bg-yellow-400';
  if (value < 75) return 'bg-green-400';
  return 'bg-emerald-500';
};

/**
 * Get the percentile rank (0–100) of a stat value.
 *
 * Uses precomputed breakpoints from lib/data/pokemon-stats.json.
 * The breakpoints were generated from all base-form Pokémon (is_default=true).
 *
 * Algorithm: walk through p10, p20... p100 breakpoints and find
 * which bucket the value falls into. Linear interpolation gives
 * a smooth 0–100 value rather than snapping to the nearest 10.
 *
 * @param statName  e.g. "hp", "attack", "special-attack"
 * @param value     The raw base stat value
 * @returns         0–100 percentile rank
 */
export const getStatPercentile = (statName: string, value: number): number => {
  const breakpoints =
    pokemonStatsData.percentileBreakpoints[statName as keyof typeof pokemonStatsData.percentileBreakpoints];
  if (!breakpoints) return 50; // fallback for unknown stats

  /*
    Walk through each percentile threshold.
    If the value is below p10, it's in the 0–10 range.
    If it's between p10 and p20, interpolate within that band.
    And so on up to p100.
  */
  const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  for (let i = 0; i < thresholds.length; i++) {
    const p = thresholds[i];
    const pKey = `p${p}` as keyof typeof breakpoints;
    const threshold = breakpoints[pKey];

    if (value <= threshold) {
      // Interpolate within this band
      const prevP = i === 0 ? 0 : thresholds[i - 1];
      const prevKey = i === 0 ? null : (`p${prevP}` as keyof typeof breakpoints);
      const prevThreshold = prevKey ? breakpoints[prevKey] : 0;

      if (threshold === prevThreshold) return p; // avoid division by zero

      const fraction = (value - prevThreshold) / (threshold - prevThreshold);
      return Math.round(prevP + fraction * (p - prevP));
    }
  }

  return 100; // above p100 threshold
};
