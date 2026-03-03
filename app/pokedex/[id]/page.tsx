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
  generateStaticParams — PRE-RENDERING ALL 151 PAGES
  ============================================================

  This is a Next.js superpower with no RN equivalent.

  By exporting generateStaticParams, we tell Next.js:
  "At build time, generate a static HTML file for each of these
  param combinations."

  Next.js will call this function at build time, get all 151 IDs,
  and pre-render all 151 detail pages as static HTML files.

  When a user visits /pokedex/25:
  WITHOUT generateStaticParams: server fetches PokéAPI, renders, responds
  WITH generateStaticParams: Next.js serves a pre-built HTML file instantly

  This makes ALL 151 detail pages load near-instantly. No server
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
  formatEvolutionDetails,
  getEnglishFlavorText,
  getLetsGoMoves,
  capitalize,
  formatPokemonId,
  formatHeight,
  formatWeight,
  getSpriteUrl,
  formatName,
} from '@/lib/api';
import {LETS_GO_MAX_POKEMON} from '@/types/pokemon';
import TypeBadge from '@/components/TypeBadge';
import StatBar from '@/components/StatBar';

// ============================================================
// generateStaticParams
// Tells Next.js which [id] values to pre-render at build time.
// Returns an array of param objects — one per page to generate.
// ============================================================
export async function generateStaticParams() {
  return Array.from({length: LETS_GO_MAX_POKEMON}, (_, i) => ({
    id: String(i + 1), // "1", "2", "3", ... "151"
  }));
}

// ============================================================
// DYNAMIC METADATA
// Metadata can be dynamic too — we generate it per Pokémon.
// The browser tab will show "Pikachu #025 | Pokémon Companion"
// ============================================================
export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const [pokemon] = await getPokemonWithSpecies(id);

  if (!pokemon) {
    return {title: 'Pokémon Not Found'};
  }

  return {
    title: `${capitalize(pokemon.name)} ${formatPokemonId(pokemon.id)}`,
    description: `${capitalize(pokemon.name)}'s stats, moves, and evolution chain for Pokémon Let's Go Pikachu.`,
  };
}

// ============================================================
// PAGE COMPONENT
// ============================================================
export default async function PokemonDetailPage({params}: {params: Promise<{id: string}>}) {
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

  const letsGoMoves = getLetsGoMoves(pokemon);
  const levelUpMoves = letsGoMoves.filter((m) => m.learnMethod === 'level-up');
  const tmMoves = letsGoMoves.filter((m) => m.learnMethod === 'machine');

  // Navigation: previous and next Pokémon
  const prevId = pokemon.id > 1 ? pokemon.id - 1 : null;
  const nextId = pokemon.id < LETS_GO_MAX_POKEMON ? pokemon.id + 1 : null;

  const primaryType = pokemon.types[0].type.name;

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

            {/* Legendary/Mythical badge */}
            {(species?.is_legendary || species?.is_mythical) && (
              <span className="bg-pokemon-yellow text-pokemon-black absolute top-0 right-0 rounded-full px-2 py-1 text-xs font-bold">
                {species.is_mythical ? '✨ Mythical' : '⭐ Legendary'}
              </span>
            )}
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
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Base Stats */}
        <div className="card">
          <h2 className="text-pokemon-black mb-4 font-semibold">Base Stats</h2>
          <div className="flex flex-col gap-3">
            {pokemon.stats.map((stat) => (
              <StatBar key={stat.stat.name} stat={stat} />
            ))}
          </div>
          {/* Total */}
          <div className="border-pokemon-lightgray mt-4 flex items-center gap-3 border-t pt-4">
            <span className="text-pokemon-gray w-16 flex-shrink-0 text-right text-xs">Total</span>
            <span className="text-pokemon-black text-sm font-bold">
              {pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)}
            </span>
          </div>
        </div>

        {/* Abilities + Details */}
        <div className="flex flex-col gap-4">
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

          {/* Training info */}
          <div className="card">
            <h2 className="text-pokemon-black mb-3 font-semibold">Training</h2>
            <div className="flex flex-col gap-2 text-sm">
              {[
                {
                  label: 'Base Exp',
                  value: pokemon.base_experience ?? '—',
                },
                {
                  label: 'Growth Rate',
                  value: species ? formatName(species.growth_rate.name) : '—',
                },
                {
                  label: 'Base Happiness',
                  value: species?.base_happiness ?? '—',
                },
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

      {/* ── EVOLUTION CHAIN ── */}
      {evolutions.length > 1 && (
        <div className="card mb-6">
          <h2 className="text-pokemon-black mb-4 font-semibold">Evolution Chain</h2>
          {/*
            overflow-x-auto: horizontal scroll on mobile if the chain is wide.
            scrollbar-hide: hide the scrollbar visually.
            This is our horizontal ScrollView pattern again.
          */}
          <div className="scrollbar-hide overflow-x-auto">
            <div className="mx-auto flex min-w-max items-center justify-start gap-2 pb-2 md:justify-center">
              {evolutions.map((evo, index) => {
                // Extract ID from the species URL
                const evoId = parseInt(evo.url.split('/').filter(Boolean).pop() ?? '0');
                const isCurrentPokemon = evoId === pokemon.id;

                // determine the label shown beneath the arrow
                const evoLabel = index > 0 ? formatEvolutionDetails(evolutions[index].details) : '';

                return (
                  <div key={evo.name} className="flex items-center gap-2">
                    {/* Arrow between evolutions */}
                    {index > 0 && (
                      <div className="text-pokemon-gray flex flex-col items-center justify-center self-center px-1">
                        <span className="text-lg leading-none">→</span>
                        {evoLabel && (
                          <span className="text-pokemon-gray max-w-[3.5rem] text-center text-xs break-normal whitespace-normal">
                            {evoLabel}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Evolution card */}
                    <Link
                      href={`/pokedex/${evoId}`}
                      className={`flex flex-col items-center rounded-xl border-2 p-3 transition-colors ${
                        isCurrentPokemon
                          ? 'bg-pokemon-lightgray border-pokemon-red'
                          : 'hover:bg-pokemon-lightgray border-transparent'
                      }`}
                    >
                      <Image src={getSpriteUrl(evoId)} width={64} height={64} alt={evo.name} unoptimized />
                      <span className="text-pokemon-black mt-1 text-xs font-medium capitalize">
                        {capitalize(evo.name)}
                      </span>
                      <span className="text-2xs text-pokemon-gray">{formatPokemonId(evoId)}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MOVES ── */}
      <div className="card">
        <h2 className="text-pokemon-black mb-4 font-semibold">Moves in Let&apos;s Go Pikachu</h2>

        {letsGoMoves.length === 0 ? (
          <p className="text-pokemon-gray text-sm">No move data available.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Level-up moves */}
            {levelUpMoves.length > 0 && (
              <div>
                <h3 className="text-pokemon-gray mb-3 text-sm font-medium tracking-wide uppercase">By Level Up</h3>
                {/*
                  overflow-x-auto for the moves table on mobile.
                  Tables have a fixed minimum width so they need
                  to scroll horizontally on small screens rather
                  than wrapping columns awkwardly.
                */}
                <div className="scrollbar-hide overflow-x-auto">
                  <table className="w-full min-w-[300px] text-sm">
                    {/*
                      <table>, <thead>, <tbody>, <tr>, <th>, <td>:
                      HTML table elements. In RN you'd build a table
                      layout manually with Views and flexbox.
                      On web, semantic table elements handle alignment
                      and accessibility automatically.
                    */}
                    <thead>
                      <tr className="border-pokemon-lightgray border-b">
                        <th className="text-pokemon-gray w-12 py-2 text-left font-medium">Lv.</th>
                        <th className="text-pokemon-gray py-2 text-left font-medium">Move</th>
                      </tr>
                    </thead>
                    <tbody>
                      {levelUpMoves.map((move) => (
                        <tr
                          key={move.name}
                          className="border-pokemon-lightgray/50 hover:bg-pokemon-lightgray/50 border-b transition-colors last:border-0"
                        >
                          <td className="text-pokemon-gray py-2 font-mono">{move.level === 0 ? '—' : move.level}</td>
                          <td className="text-pokemon-black py-2 font-medium capitalize">{formatName(move.name)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TM moves */}
            {tmMoves.length > 0 && (
              <div>
                <h3 className="text-pokemon-gray mb-3 text-sm font-medium tracking-wide uppercase">By TM</h3>
                {/*
                  flex-wrap: moves wrap onto new lines when the container
                  is too narrow. Like flexWrap: 'wrap' in RN.
                */}
                <div className="flex flex-wrap gap-2">
                  {tmMoves.map((move) => (
                    <span
                      key={move.name}
                      className="bg-pokemon-lightgray text-pokemon-black rounded-full px-3 py-1 text-xs font-medium capitalize"
                    >
                      {formatName(move.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
