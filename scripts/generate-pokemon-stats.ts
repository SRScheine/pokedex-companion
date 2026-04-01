/*
  scripts/generate-pokemon-stats.ts

  Run this script to generate the percentile breakpoint data used
  by the stat radar chart. Output is written to lib/data/pokemon-stats.json.

  Run with:
    npx tsx scripts/generate-pokemon-stats.ts

  This only needs to be re-run if PokéAPI adds new Pokémon (i.e. a new
  generation releases). Commit the output JSON to the repo so the app
  never needs to fetch this data at runtime.

  ============================================================
  WHY A SCRIPT INSTEAD OF FETCHING AT BUILD TIME?
  ============================================================

  We could fetch all 1025 Pokémon stats during next build, but:
  1. It would add ~1000 API calls to every build — slow and fragile
  2. The data never changes between generations
  3. Committing the JSON means zero runtime cost — it's just an import

  This is a common pattern for static reference data: generate it
  once, commit it, import it anywhere. Same idea as committing a
  translations JSON or a country codes list.
*/

import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://pokeapi.co/api/v2';
const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const OUTPUT_PATH = path.join(process.cwd(), 'lib/data/pokemon-stats.json');

interface PokemonListItem {
  name: string;
  url: string;
}

interface PokemonStat {
  base_stat: number;
  stat: {name: string};
}

interface PokemonData {
  id: number;
  is_default: boolean;
  stats: PokemonStat[];
}

/*
  fetchWithRetry: wraps fetch with simple retry logic.

  When fetching ~1008 Pokémon in parallel, PokéAPI occasionally
  returns a 429 (rate limit) or transient 500. Rather than failing
  the whole script, we wait briefly and try again.

  In production code you'd use a library like p-retry.
  For a one-off script, a simple recursive retry is fine.
*/
const fetchWithRetry = async (url: string, retries = 3): Promise<Response> => {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      console.log(`  Retrying ${url} (${retries} left)...`);
      await new Promise((r) => setTimeout(r, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
};

/*
  fetchInBatches: fetches an array of URLs in parallel batches.

  Firing all 1025 requests at once risks rate limiting.
  Batching into groups of 50 keeps us well within PokéAPI's limits
  while still being much faster than sequential fetching.

  In RN: same pattern — you'd use this for any large parallel fetch.
  On web: identical, this is plain JavaScript async/await.
*/
const fetchInBatches = async <T>(urls: string[], batchSize = 50): Promise<T[]> => {
  const results: T[] = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`  Fetching batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(urls.length / batchSize)}...`);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const res = await fetchWithRetry(url);
        return res.json() as Promise<T>;
      })
    );
    results.push(...batchResults);
    // Brief pause between batches to be a good API citizen
    if (i + batchSize < urls.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return results;
};

/*
  computePercentileBreakpoints: given an array of stat values,
  returns the value at each 10th percentile (p10 through p100).

  Algorithm:
  1. Sort values ascending
  2. For each percentile p, find the index at (p/100) * (n-1)
  3. Interpolate between the two surrounding values for accuracy

  Linear interpolation gives smoother results than just rounding
  to the nearest index, especially for small populations.
*/
const computePercentileBreakpoints = (values: number[]): Record<string, number> => {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const breakpoints: Record<string, number> = {};

  for (let p = 10; p <= 100; p += 10) {
    /*
      Index calculation:
      p=10, n=1008 → index = 0.1 * 1007 = 100.7
      We interpolate between sorted[100] and sorted[101].
    */
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    const value =
      lower === upper ? sorted[lower] : Math.round(sorted[lower] + fraction * (sorted[upper] - sorted[lower]));

    breakpoints[`p${p}`] = value;
  }

  return breakpoints;
};

const main = async () => {
  console.log('🔍 Fetching Pokémon list...');

  // Fetch all Pokémon names + URLs (limit=1000000 to get all)
  const listRes = await fetch(`${BASE_URL}/pokemon?limit=1000000&offset=0`);
  const listData = await listRes.json();
  const allUrls: string[] = listData.results.map((p: PokemonListItem) => p.url);

  console.log(`📋 Found ${allUrls.length} total Pokémon. Fetching stats...`);

  // Fetch all Pokémon data in batches
  const allPokemon = await fetchInBatches<PokemonData>(allUrls, 50);

  // Filter to base forms only
  const baseForms = allPokemon.filter((p) => p.is_default);
  console.log(`✅ ${baseForms.length} base-form Pokémon after filtering is_default=true`);

  /*
    Build a map of stat name → array of all values across base forms.
    e.g. { hp: [45, 60, 80, ...], attack: [49, 62, 100, ...], ... }
    These arrays are what we run the percentile calculation on.
  */
  const statValues: Record<string, number[]> = Object.fromEntries(STAT_KEYS.map((key) => [key, []]));

  for (const pokemon of baseForms) {
    for (const stat of pokemon.stats) {
      if (statValues[stat.stat.name]) {
        statValues[stat.stat.name].push(stat.base_stat);
      }
    }
  }

  // Compute percentile breakpoints for each stat
  console.log('📊 Computing percentile breakpoints...');
  const percentileBreakpoints: Record<string, Record<string, number>> = {};

  for (const statKey of STAT_KEYS) {
    const values = statValues[statKey];
    console.log(`  ${statKey}: ${values.length} values, range ${Math.min(...values)}–${Math.max(...values)}`);
    percentileBreakpoints[statKey] = computePercentileBreakpoints(values);
  }

  // Write output
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      pokemonCount: baseForms.length,
      description:
        'Percentile breakpoints for each base stat across all base-form Pokémon (is_default=true). Used by the stat radar chart.',
    },
    percentileBreakpoints,
  };

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_PATH), {recursive: true});
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\n✨ Written to ${OUTPUT_PATH}`);
  console.log('\nSample output (HP):');
  console.log(percentileBreakpoints['hp']);
};

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
