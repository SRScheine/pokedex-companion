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
  LETS_GO_MAX_POKEMON,
  LETS_GO_VERSION_GROUP,
  LETS_GO_VERSION,
  FlavorTextEntry,
} from "@/types/pokemon";

// Base URL for all PokéAPI requests
const BASE_URL = "https://pokeapi.co/api/v2";

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
async function apiFetch<T>(
  endpoint: string,
  options: { cache?: RequestCache; revalidate?: number } = {}
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint  // Full URL (for when PokéAPI gives us a URL directly)
    : `${BASE_URL}${endpoint}`;  // Relative endpoint

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
    cache: options.revalidate ? undefined : (options.cache ?? "force-cache"),
    next: options.revalidate ? { revalidate: options.revalidate } : undefined,
  });

  if (!response.ok) {
    // Throw with status code so callers can handle 404 vs 500 differently
    throw new Error(`PokéAPI error: ${response.status} for ${url}`);
  }

  return response.json() as Promise<T>;
}

/* ============================================================
   POKÉMON LIST FUNCTIONS
   ============================================================ */

/**
 * Fetch a paginated list of Pokémon.
 *
 * We limit to LETS_GO_MAX_POKEMON (151) since that's what's
 * in Let's Go Pikachu. The offset parameter enables pagination.
 *
 * @param limit  How many to fetch (max 151 for our app)
 * @param offset How many to skip (for pagination)
 */
export async function getPokemonList(
  limit: number = 20,
  offset: number = 0
): Promise<PokemonListResponse> {
  // Clamp limit so we never fetch beyond Gen 1
  const clampedLimit = Math.min(limit, LETS_GO_MAX_POKEMON - offset);
  return apiFetch<PokemonListResponse>(
    `/pokemon?limit=${clampedLimit}&offset=${offset}`
  );
}

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
export async function getPokemonListWithDetails(
  limit: number = 20,
  offset: number = 0
): Promise<Pokemon[]> {
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
  const pokemonDetails = await Promise.all(
    listData.results.map((item) =>
      apiFetch<Pokemon>(item.url)
    )
  );

  return pokemonDetails;
}

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
export async function getPokemon(
  idOrName: string | number
): Promise<Pokemon | null> {
  try {
    return await apiFetch<Pokemon>(`/pokemon/${idOrName}`);
  } catch (error) {
    // Return null for 404s, re-throw for other errors
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch species data for a Pokémon.
 * Species contains: Pokédex flavor text, evolution chain URL,
 * legendary/mythical status, capture rate, etc.
 *
 * You need BOTH pokemon + pokemon-species for a full detail page.
 *
 * @param idOrName  National Dex number or name
 */
export async function getPokemonSpecies(
  idOrName: string | number
): Promise<PokemonSpecies | null> {
  try {
    return await apiFetch<PokemonSpecies>(`/pokemon-species/${idOrName}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch both Pokémon and species data in parallel.
 * Used on the detail page where we need both.
 *
 * Returns a typed tuple — TypeScript knows index 0 is Pokemon | null
 * and index 1 is PokemonSpecies | null.
 */
export async function getPokemonWithSpecies(
  idOrName: string | number
): Promise<[Pokemon | null, PokemonSpecies | null]> {
  /*
    Promise.all with different return types:
    TypeScript infers the tuple type automatically here.
    This is one of the nicest TypeScript + async patterns.
  */
  return Promise.all([
    getPokemon(idOrName),
    getPokemonSpecies(idOrName),
  ]);
}

/**
 * Get the English Pokédex flavor text for a Pokémon,
 * preferring Let's Go Pikachu version if available.
 *
 * PokéAPI returns flavor text for EVERY game and EVERY language.
 * We filter to just the English Let's Go entry. If that doesn't
 * exist, we fall back to any English entry.
 *
 * The flavor text from PokéAPI has weird escaped whitespace
 * characters (\f, \n) that we clean up before displaying.
 */
export function getEnglishFlavorText(
  entries: FlavorTextEntry[]
): string {
  // Try to find Let's Go Pikachu specifically
  const letsGoEntry = entries.find(
    (entry) =>
      entry.language.name === "en" &&
      entry.version.name === LETS_GO_VERSION
  );

  if (letsGoEntry) {
    return cleanFlavorText(letsGoEntry.flavor_text);
  }

  // Fall back to any English entry
  const englishEntry = entries.find(
    (entry) => entry.language.name === "en"
  );

  return englishEntry ? cleanFlavorText(englishEntry.flavor_text) : "";
}

/**
 * Clean up PokéAPI flavor text.
 * The API returns text with form feed (\f) and newline (\n)
 * characters used for line breaks in the game's text box.
 * We replace them with spaces for web display.
 */
function cleanFlavorText(text: string): string {
  return text
    .replace(/\f/g, " ")   // form feed → space
    .replace(/\n/g, " ")   // newline → space
    .replace(/\s+/g, " ")  // multiple spaces → single space
    .trim();
}

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
export async function getEvolutionChain(
  evolutionChainUrl: string
): Promise<EvolutionChain> {
  return apiFetch<EvolutionChain>(evolutionChainUrl);
}

/**
 * Turn a set of evolution details into a human-readable label. We try
 * to surface the most relevant information, falling back to the trigger
 * name when nothing more specific is available.
 *
 * The PokéAPI returns a rather complex object describing every possible
 * condition (item, level, happiness, trade, etc.). In our UI we only
 * need a short phrase such as "Lv. 16", "Thunder Stone" or "Trade".
 */
export function formatEvolutionDetails(details: EvolutionDetail[]): string {
  if (!details || details.length === 0) return "";
  const d = details[0]; // most chains only have one entry

  const humanize = (name: string) =>
    capitalize(name.replace(/-/g, " "));

  switch (d.trigger.name) {
    case "level-up":
      if (d.min_level) return `Lv. ${d.min_level}`;
      if (d.min_happiness) return `Happiness ≥ ${d.min_happiness}`;
      if (d.time_of_day) return capitalize(d.time_of_day);
      if (d.location) return capitalize(d.location.name);
      break;
    case "use-item":
      if (d.item) return humanize(d.item.name); // full name, e.g. "Thunder Stone"
      break;
    case "trade":
      if (d.held_item)
        return `Trade holding ${humanize(d.held_item.name)}`;
      return "Trade";
    default:
      return humanize(d.trigger.name);
  }

  // fallback
  return humanize(d.trigger.name);
}

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

export function flattenEvolutionChain(
  chain: EvolutionChain["chain"]
): FlatEvolution[] {
  const result: FlatEvolution[] = [];

  // Recursive helper
  function traverse(link: EvolutionChain["chain"]) {
    // Extract ID from the species URL and only include if it's in Let's Go
    const evoId = parseInt(
      link.species.url.split("/").filter(Boolean).pop() ?? "0"
    );
    
    if (evoId <= LETS_GO_MAX_POKEMON) {
      result.push({
        name: link.species.name,
        url: link.species.url,
        minLevel: link.evolution_details[0]?.min_level ?? null,
        details: link.evolution_details,
      });
    }
    
    // Recurse into each evolution
    link.evolves_to.forEach(traverse);
  }

  traverse(chain);
  return result;
}


/* ============================================================
   TYPE FUNCTIONS
   ============================================================ */

/**
 * Fetch type data including damage relations.
 * Used on the type chart page.
 *
 * @param typeName  e.g. "fire", "water", "psychic"
 */
export async function getTypeData(
  typeName: string
): Promise<PokemonTypeData> {
  return apiFetch<PokemonTypeData>(`/type/${typeName}`);
}

/**
 * Fetch damage relations for multiple types at once.
 * Used when a Pokémon has two types — we need both to calculate
 * combined effectiveness.
 *
 * @param typeNames  Array of type names ["fire", "flying"]
 */
export async function getMultipleTypeData(
  typeNames: string[]
): Promise<PokemonTypeData[]> {
  return Promise.all(typeNames.map(getTypeData));
}

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
export function calculateTypeEffectiveness(
  typeDataList: PokemonTypeData[]
): Record<string, number> {
  // Start with all types doing 1x damage
  const effectiveness: Record<string, number> = {};

  for (const typeData of typeDataList) {
    const { damage_relations } = typeData;

    // Apply double damage (2x)
    damage_relations.double_damage_from.forEach(({ name }) => {
      effectiveness[name] = (effectiveness[name] ?? 1) * 2;
    });

    // Apply half damage (0.5x)
    damage_relations.half_damage_from.forEach(({ name }) => {
      effectiveness[name] = (effectiveness[name] ?? 1) * 0.5;
    });

    // Apply immunity (0x) — overrides everything
    damage_relations.no_damage_from.forEach(({ name }) => {
      effectiveness[name] = 0;
    });
  }

  return effectiveness;
}

/* ============================================================
   MOVE FUNCTIONS
   ============================================================ */

/**
 * Fetch a single move by name or ID.
 *
 * @param nameOrId  e.g. "thunderbolt" or 85
 */
export async function getMove(
  nameOrId: string | number
): Promise<Move | null> {
  try {
    return await apiFetch<Move>(`/move/${nameOrId}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

/**
 * Get moves for a Pokémon filtered to Let's Go Pikachu.
 *
 * PokéAPI returns moves for EVERY game a Pokémon has appeared in.
 * We filter to only moves available in Let's Go.
 *
 * Returns a sorted list: level-up moves first (sorted by level),
 * then TM moves.
 */
export function getLetsGoMoves(
  pokemon: Pokemon
): Array<{ name: string; url: string; learnMethod: string; level: number }> {
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
    if (a.learnMethod === "level-up" && b.learnMethod !== "level-up") return -1;
    if (a.learnMethod !== "level-up" && b.learnMethod === "level-up") return 1;
    if (a.learnMethod === "level-up" && b.learnMethod === "level-up") {
      return a.level - b.level;
    }
    return a.name.localeCompare(b.name);
  });
}

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
export async function searchPokemon(
  query: string
): Promise<Array<{ name: string; id: number; url: string }>> {
  if (!query.trim()) return [];

  // Fetch all 151 Pokémon names (cached after first call)
  const allPokemon = await apiFetch<PokemonListResponse>(
    `/pokemon?limit=${LETS_GO_MAX_POKEMON}&offset=0`
  );

  const lowerQuery = query.toLowerCase().trim();

  return allPokemon.results
    .filter((p) => p.name.includes(lowerQuery))
    .map((p) => ({
      name: p.name,
      url: p.url,
      // Extract the ID from the URL: ".../pokemon/25/" → 25
      id: parseInt(p.url.split("/").filter(Boolean).pop() ?? "0"),
    }));
}

/* ============================================================
   UTILITY HELPERS
   ============================================================ */

/**
 * Format a Pokémon's National Dex number with leading zeros.
 * 1 → "#001", 25 → "#025", 151 → "#151"
 *
 * String.padStart is standard JavaScript — same in RN and web.
 */
export function formatPokemonId(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

/**
 * Capitalize the first letter of a string.
 * PokéAPI returns all names in lowercase ("pikachu" → "Pikachu")
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a hyphenated API name for display.
 * "special-attack" → "Special Attack"
 * "lets-go-pikachu" → "Lets Go Pikachu"
 */
export function formatName(str: string): string {
  return str
    .split("-")
    .map(capitalize)
    .join(" ");
}

/**
 * Get the sprite URL for a Pokémon by ID.
 * Uses the official artwork for large images, sprites for thumbnails.
 *
 * These URLs are stable and don't require an API call.
 * Useful for lists where we want to show images without
 * fetching full Pokémon data.
 */
export function getSpriteUrl(id: number, type: "sprite" | "artwork" = "sprite"): string {
  if (type === "artwork") {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/**
 * Convert height from decimetres to a readable format.
 * PokéAPI: 7 → "0.7 m"
 */
export function formatHeight(decimetres: number): string {
  const metres = decimetres / 10;
  return `${metres.toFixed(1)} m`;
}

/**
 * Convert weight from hectograms to a readable format.
 * PokéAPI: 60 → "6.0 kg"  
 */
export function formatWeight(hectograms: number): string {
  const kg = hectograms / 10;
  return `${kg.toFixed(1)} kg`;
}

/**
 * Get a color class for a stat bar based on the stat value.
 * Used for the stat visualization on detail pages.
 * Low stats are red, mid are yellow, high are green.
 */
export function getStatColor(value: number): string {
  if (value < 25) return "bg-red-400";
  if (value < 50) return "bg-yellow-400";
  if (value < 75) return "bg-green-400";
  return "bg-emerald-500";
}