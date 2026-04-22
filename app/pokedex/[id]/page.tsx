/*
  app/pokedex/[id]/page.tsx — Pokémon Detail Page
  Route: yoursite.com/pokedex/25  (or any number 1-151)

  ============================================================
  DYNAMIC ROUTING — THE [id] FOLDER
  ============================================================

  The square brackets in the folder name [id] tell Next.js:
  "this segment of the URL is a variable."

  app/pokedex/[id]/page.tsx matches ALL of these:
    /pokedex/1       → id = "1"
    /pokedex/25      → id = "25"
    /pokedex/pikachu → id = "pikachu" (we support name lookup too!)

  Next.js passes the matched value as params.id to your component.

  REACT NATIVE EQUIVALENT:
  In React Navigation, you'd define a dynamic route like:
    <Stack.Screen name="Pokemon" />
    // Navigate: navigation.navigate('Pokemon', { id: 25 })
    // Read:     const { id } = route.params;

  In Next.js:
    // Folder: app/pokedex/[id]/
    // Navigate: <Link href="/pokedex/25">
    // Read:     const { id } = await params;

  Same concept — the URL segment IS the param.

  ============================================================
  generateStaticParams — PRE-RENDERING ALL POKÉMON PAGES
  ============================================================

  This is a Next.js superpower with no RN equivalent.

  By exporting generateStaticParams, we tell Next.js:
  "At build time, generate a static HTML file for each of these
  param combinations."

  Next.js will call this function at build time, get all IDs,
  and pre-render all detail pages as static HTML files.

  When a user visits /pokedex/25:
  WITHOUT generateStaticParams: server fetches PokéAPI, renders, responds
  WITH generateStaticParams: Next.js serves a pre-built HTML file instantly

  This makes ALL detail pages load near-instantly. No server
  processing, no API calls at request time — just serving a file.
  This is called SSG (Static Site Generation).

  For our Pokédex this is perfect — the data never changes, so we
  can safely pre-render everything at build time.
*/

import {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {
  getPokemonWithSpecies,
  getEvolutionChain,
  flattenEvolutionChain,
  getEnglishFlavorText,
  getLetsGoMoves,
  getAllMoves,
  capitalize,
  formatPokemonId,
  formatHeight,
  formatWeight,
  getSpriteUrl,
  formatName,
} from '@/lib/api';
import {LETS_GO_MAX_POKEMON, TOTAL_POKEMON} from '@/types/pokemon';
import type {FavoritePokemon} from '@/types/pokemon';
import TypeBadge from '@/components/TypeBadge';
import StatRadar from '@/components/StatRadar';
import StatTable from '@/components/StatTable';
import PokemonDetailClient from '@/components/PokemonDetailClient';
import TypeDefenses from '@/components/TypeDefenses';
import FavoriteButton from '@/components/FavoriteButton';

// ============================================================
// generateStaticParams
// Tells Next.js which [id] values to pre-render at build time.
// Returns an array of param objects — one per page to generate.
// ============================================================
export const generateStaticParams = async () => {
  return Array.from({length: TOTAL_POKEMON}, (_, i) => ({
    id: String(i + 1), // "1", "2", "3", ... "1025"
  }));
};

// ============================================================
// DYNAMIC METADATA
// Metadata can be dynamic too — we generate it per Pokémon.
// The browser tab will show "Pikachu #025 | Pokémon Companion"
// ============================================================
export const generateMetadata = async ({params}: {params: Promise<{id: string}>}): Promise<Metadata> => {
  const {id} = await params;
  const [pokemon] = await getPokemonWithSpecies(id);

  if (!pokemon) {
    return {title: 'Pokémon Not Found'};
  }

  return {
    title: `${capitalize(pokemon.name)} ${formatPokemonId(pokemon.id)}`,
    description: `${capitalize(pokemon.name)}'s stats, moves, and evolution chain.`,
  };
};

// ============================================================
// PAGE COMPONENT
// ============================================================
const PokemonDetailPage = async ({params}: {params: Promise<{id: string}>}) => {
  const {id} = await params;

  /*
    Fetch Pokémon and species data in parallel.
    Both are needed for the full detail view.
    getPokemonWithSpecies uses Promise.all internally.
  */
  const [pokemon, species] = await getPokemonWithSpecies(id);

  /*
    notFound(): a Next.js function that renders the nearest not-found.tsx.
    If we don't have a not-found.tsx, Next.js shows its default 404 page.

    This is cleaner than returning null or redirecting.
    In RN: you'd navigate back or show an error screen.
    On web: 404 pages are a standard convention.
  */
  if (!pokemon) notFound();

  // Fetch evolution chain if species data is available
  const evolutionChain = species?.evolution_chain?.url ? await getEvolutionChain(species.evolution_chain.url) : null;

  const evolutions = evolutionChain ? flattenEvolutionChain(evolutionChain.chain) : [];

  const flavorText = species ? getEnglishFlavorText(species.flavor_text_entries) : '';

  /*
  Fetch both move sets — the server passes both to PokemonDetailClient.
  The client component picks which to display based on the Gen 1 toggle.
  We can't read localStorage here (server-side) so we pass both and
  let the client decide.
*/
  const letsGoMoves = getLetsGoMoves(pokemon);
  const allMoves = getAllMoves(pokemon);
  const letsGoLevelUpMoves = letsGoMoves.filter((m) => m.learnMethod === 'level-up');
  const letsGoTmMoves = letsGoMoves.filter((m) => m.learnMethod === 'machine');
  const allLevelUpMoves = allMoves.filter((m) => m.learnMethod === 'level-up');
  const allTmMoves = allMoves.filter((m) => m.learnMethod === 'machine');

  // Whether this Pokémon is Gen 1 — determines if toggle is shown
  const isGen1 = pokemon.id <= LETS_GO_MAX_POKEMON;

  // Navigation: previous and next Pokémon — now spans full dex
  const prevId = pokemon.id > 1 ? pokemon.id - 1 : null;
  const nextId = pokemon.id < TOTAL_POKEMON ? pokemon.id + 1 : null;

  const primaryType = pokemon.types[0].type.name;

  /*
    Build the FavoritePokemon data shape here in the Server Component.
    This is a pure data transform — no hooks, no browser APIs — so it's
    completely safe to do on the server. We pass this to FavoriteButton
    as a prop, which is a Client Component that connects to Redux.
  */
  const favData: Omit<FavoritePokemon, 'addedAt'> = {
    id: pokemon.id,
    name: pokemon.name,
    sprite: getSpriteUrl(pokemon.id, 'artwork'),
    types: pokemon.types,
  };

  return (
    <div className="animate-fade-in mx-auto max-w-4xl px-4 py-8">
      {/* ── BACK + PREV/NEXT NAV ── */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/pokedex"
          className="text-pokemon-gray hover:text-pokemon-black flex items-center gap-1 text-sm transition-colors"
        >
          ← Back to Pokédex
        </Link>

        {/* Prev / Next Pokémon navigation */}
        <div className="flex items-center gap-2">
          {prevId && (
            <Link
              href={`/pokedex/${prevId}`}
              className="bg-pokemon-lightgray text-pokemon-black flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-gray-200"
            >
              ← {formatPokemonId(prevId)}
            </Link>
          )}
          {nextId && (
            <Link
              href={`/pokedex/${nextId}`}
              className="bg-pokemon-lightgray text-pokemon-black flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-gray-200"
            >
              {formatPokemonId(nextId)} →
            </Link>
          )}
        </div>
      </div>

      {/* ── HERO SECTION ── */}
      {/*
        Dynamic background tinted by primary type color.
        bg-type-{primaryType} at low opacity creates a subtle
        type-themed card. The type color is applied via inline style
        because it's a dynamic value (same Tailwind rule as StatBar).
      */}
      <div
        className="relative mb-6 overflow-hidden rounded-3xl p-6 md:p-10"
        style={{
          backgroundColor: `color-mix(in srgb, var(--color-type-${primaryType}) 15%, white)`,
        }}
      >
        {/*
          color-mix(): a CSS function that blends two colors.
          "15% of the type color mixed with white" = very subtle tint.
          This is a modern CSS feature (2023+) — supported in all
          current browsers. No library needed.
          In RN: you'd calculate the hex color manually or use a library.
        */}

        {/*
          FavoriteButton: positioned absolutely in the top-right corner
          of the hero section. absolute top-4 right-4 z-20 pins it there
          and keeps it above other content.
        */}
        <FavoriteButton pokemon={favData} className="absolute top-4 right-4 z-20" />
        {/* Legendary/Mythical badge */}
        {(species?.is_legendary || species?.is_mythical) && (
          <span className="bg-pokemon-black text-pokemon-white absolute top-4 left-4 rounded-full px-2 py-1 text-xs font-bold">
            {species.is_mythical ? '✨ Mythical' : '⭐ Legendary'}
          </span>
        )}
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-10">
          {/* Sprite */}
          <div className="relative flex-shrink-0">
            {/*
              Official artwork — large, high-res image.
              We use the GitHub-hosted sprites since they don't
              require authentication and are publicly available.
            */}
            <Image
              src={getSpriteUrl(pokemon.id, 'artwork')}
              width={200}
              height={200}
              alt={capitalize(pokemon.name)}
              unoptimized
              priority
              /*
                priority: tells next/image to preload this image.
                Use on above-the-fold images (visible without scrolling).
                Skips lazy loading for faster LCP (Largest Contentful Paint).
                LCP is a Core Web Vital — a metric Google uses for SEO ranking.
                In RN: no equivalent (RN doesn't have LCP/SEO concerns).
              */
              className="drop-shadow-lg"
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-pokemon-gray mb-1 text-sm font-medium">
              {formatPokemonId(pokemon.id)}
              {species?.genera.find((g) => g.language.name === 'en')?.genus
                ? ` · ${species.genera.find((g) => g.language.name === 'en')?.genus}`
                : ''}
            </p>

            <h1 className="text-pokemon-black mb-4 font-[family-name:var(--font-pixel)] text-3xl md:text-4xl">
              {capitalize(pokemon.name)}
            </h1>

            {/* Type badges */}
            <div className="mb-4 flex justify-center gap-2 md:justify-start">
              {pokemon.types.map(({type}) => (
                <TypeBadge key={type.name} typeName={type.name} size="lg" />
              ))}
            </div>

            {/* Flavor text */}
            {flavorText && (
              <p className="text-pokemon-black/80 max-w-md text-sm leading-relaxed italic">
                &ldquo;{flavorText}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ROW ── */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          {label: 'Height', value: formatHeight(pokemon.height)},
          {label: 'Weight', value: formatWeight(pokemon.weight)},
          {
            label: 'Catch Rate',
            value: species ? `${Math.round((species.capture_rate / 255) * 100)}%` : '—',
          },
        ].map(({label, value}) => (
          <div key={label} className="card text-center">
            <p className="text-pokemon-gray mb-1 text-xs">{label}</p>
            <p className="text-pokemon-black font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      {/*
        Two-column layout on desktop, stacked on mobile.
        Same grid pattern we've used throughout.
      */}
      <div className="mb-6 flex flex-col gap-6">
        {/* Base Stats — full width */}
        <div className="card">
          <h2 className="text-pokemon-black mb-4 font-semibold">Base Stats</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <div className="flex-[4]">
              <StatRadar stats={pokemon.stats} primaryType={primaryType} />
            </div>
            <div className="flex-[2]">
              <StatTable stats={pokemon.stats} primaryType={primaryType} />
            </div>
          </div>
        </div>

        <TypeDefenses pokemonTypes={pokemon.types.map(({type}) => type.name)} name={capitalize(pokemon.name)} />

        {/* Abilities + Training — side by side below */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Abilities */}
          <div className="card">
            <h2 className="text-pokemon-black mb-3 font-semibold">Abilities</h2>
            <div className="flex flex-col gap-2">
              {pokemon.abilities.map(({ability, is_hidden}) => (
                <div
                  key={ability.name}
                  className="bg-pokemon-lightgray flex items-center justify-between rounded-lg px-3 py-2"
                >
                  <span className="text-pokemon-black text-sm font-medium capitalize">{formatName(ability.name)}</span>
                  {is_hidden && (
                    <span className="text-pokemon-gray rounded-full bg-white px-2 py-0.5 text-xs">Hidden</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Training */}
          <div className="card">
            <h2 className="text-pokemon-black mb-3 font-semibold">Training</h2>
            <div className="flex flex-col gap-2 text-sm">
              {[
                {label: 'Base Exp', value: pokemon.base_experience ?? '—'},
                {label: 'Growth Rate', value: species ? formatName(species.growth_rate.name) : '—'},
                {label: 'Base Happiness', value: species?.base_happiness ?? '—'},
              ].map(({label, value}) => (
                <div
                  key={label}
                  className="border-pokemon-lightgray flex justify-between border-b py-1.5 last:border-0"
                >
                  <span className="text-pokemon-gray">{label}</span>
                  <span className="text-pokemon-black font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── EVOLUTION CHAIN + MOVES ── */}
      {/*
          PokemonDetailClient handles both sections.
          It's a Client Component so it can read localStorage for the
          Gen 1 toggle state and re-render when the user toggles it.

          We pass both move sets (Gen 1 filtered + all) so the client
          can switch between them without fetching again.

          The server has already done all the data fetching — the client
          just decides which subset to display.
      */}
      <PokemonDetailClient
        pokemonId={pokemon.id}
        evolutions={evolutions}
        letsGoLevelUpMoves={letsGoLevelUpMoves}
        letsGoTmMoves={letsGoTmMoves}
        allLevelUpMoves={allLevelUpMoves}
        allTmMoves={allTmMoves}
        isGen1={isGen1}
      />
    </div>
  );
};

export default PokemonDetailPage;
