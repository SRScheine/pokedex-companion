/*
  app/pokedex/page.tsx — Pokédex List Page
  Route: yoursite.com/pokedex

  ============================================================
  FILE-BASED ROUTING RECAP
  ============================================================

  Creating this file at app/pokedex/page.tsx automatically
  creates the /pokedex route. No router config, no registration.

  The folder name IS the URL segment:
    app/pokedex/page.tsx        →  /pokedex
    app/pokedex/[id]/page.tsx   →  /pokedex/25  (next step!)
    app/team/page.tsx           →  /team

  ============================================================
  searchParams — HOW SERVER COMPONENTS READ THE URL
  ============================================================

  Next.js automatically passes searchParams as a prop to any
  page.tsx component. It contains the URL's query string as
  a plain object.

  For URL: /pokedex?search=pikachu&page=2
  searchParams = { search: 'pikachu', page: '2' }

  This is how the Server Component reads what the Client Component
  (PokedexSearch) wrote to the URL. They communicate via the URL —
  no prop drilling, no context, no state manager needed.

  In RN: you'd use route.params or a shared state solution.
  On web: the URL is the shared state between server and client.

  ============================================================
  PAGINATION PATTERN
  ============================================================

  We show 20 Pokémon per page. The page number lives in the URL:
  /pokedex?page=1  (or just /pokedex for page 1)
  /pokedex?page=2
  /pokedex?page=3  (last page — only 11 Pokémon, since 151 total)

  The Server Component reads the page param, calculates the offset,
  and fetches exactly the right Pokémon. No client-side filtering.
*/

import {Metadata} from 'next';
import {Suspense} from 'react';
import {getPokemonListWithDetails, searchPokemon} from '@/lib/api';
import {TOTAL_POKEMON} from '@/types/pokemon';
import PokemonCard from '@/components/PokemonCard';
import PokedexSearch from '@/components/PokedexSearch';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pokédex',
  description: 'Browse all Pokémon available.',
};

const PAGE_SIZE = 20;

/*
  searchParams type:
  Next.js passes searchParams as a prop — it's typed as a
  Promise in Next.js 15+. We await it to get the actual values.
  
  All values are strings (URL params are always strings),
  even numbers like page. We parse them manually.
*/
interface PokedexPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function PokedexPage({searchParams}: PokedexPageProps) {
  // Await searchParams (required in Next.js 15+)
  const params = await searchParams;
  const searchQuery = params.search ?? '';
  /*
    Parse page number from URL.
    URL params are always strings, so we parseInt.
    We clamp to minimum 1 in case someone passes ?page=0 or ?page=-1.
  */
  const currentPage = Math.max(1, parseInt(params.page ?? '1'));
  const offset = (currentPage - 1) * PAGE_SIZE;

  /*
    Conditional data fetching based on whether user is searching.

    If searching: use searchPokemon() which filters by name.
      Search results aren't paginated — we show all matches.

    If browsing: use getPokemonListWithDetails() for the current page.
      This fetches exactly PAGE_SIZE Pokémon for the current offset.

    Both are direct awaits — Server Component magic.
    No useEffect, no useState, no loading flag.
  */
  let pokemon;
  let totalCount;
  const isSearching = !!searchQuery;

  if (isSearching) {
    const searchResults = await searchPokemon(searchQuery);
    pokemon = await Promise.all(
      searchResults.map(async (result) => {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${result.id}`, {
          cache: 'force-cache',
        });
        return res.json();
      })
    );
    totalCount = pokemon.length;
  } else {
    /*
      Clamp the limit on the last page so we never fetch beyond
      TOTAL_POKEMON. Without this, the last page would spill into
      special/alternate-form Pokémon that exist in PokéAPI beyond
      the national dex (e.g. partner pikachu, gigantamax forms).
  
      Example: PAGE_SIZE=100, TOTAL_POKEMON=1025, offset=1000
      Without clamp: fetches 100 → gets IDs 1001-1100 (spills over)
      With clamp:    fetches 25  → gets IDs 1001-1025 (correct)
    */
    const clampedLimit = Math.min(PAGE_SIZE, TOTAL_POKEMON - offset);
    pokemon = await getPokemonListWithDetails(clampedLimit, offset);
    totalCount = TOTAL_POKEMON;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-8">
      {/* ── HEADER ── */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-pokemon-black font-[family-name:var(--font-pixel)] text-xl md:text-2xl">Pokédex</h1>
          <p className="text-pokemon-gray mt-1 text-sm">
            {isSearching
              ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${totalCount} Pokémon`}
          </p>
        </div>

        {/*
          Suspense boundary around the search component.

          PokedexSearch uses useSearchParams() internally.
          Next.js requires that any component using useSearchParams()
          be wrapped in <Suspense> — otherwise it opts the entire
          page out of static rendering.

          This is a Next.js-specific requirement. The Suspense
          boundary tells Next.js: "this part can render later,
          don't block the whole page on it."

          The fallback shows while the Client Component hydrates.
          Hydration: the process of attaching React event handlers
          to server-rendered HTML. Web-only concept — in RN all
          components are "live" immediately.
        */}
        <Suspense fallback={<div className="skeleton h-10 w-full rounded-full md:w-80" />}>
          <PokedexSearch />
        </Suspense>
      </div>

      {/* ── POKEMON GRID ── */}
      {pokemon.length === 0 ? (
        // Empty state
        <div className="py-20 text-center">
          <p className="mb-4 text-5xl">😕</p>
          <p className="text-pokemon-black mb-2 text-lg font-semibold">No Pokémon found</p>
          <p className="text-pokemon-gray mb-6 text-sm">
            No results for &quot;{searchQuery}&quot;. Try a different name.
          </p>
          <Link
            href="/pokedex"
            className="bg-pokemon-red hover:bg-pokemon-darkred inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Clear search
          </Link>
        </div>
      ) : (
        /*
          Responsive grid — 5 breakpoints:
          2 cols (mobile) → 3 cols (sm) → 4 cols (md) → 5 cols (lg)

          sm: = 640px+
          md: = 768px+
          lg: = 1024px+

          This gives us a dense, app-like grid on desktop
          while staying usable on small phone screens.
        */
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {pokemon.map((p: any) => (
            <PokemonCard key={p.id} pokemon={p} />
          ))}
        </div>
      )}

      {/* ── PAGINATION ── */}
      {/*
        Only show pagination when browsing (not searching).
        Search shows all results at once.

        Pagination on the web uses URL params — each page number
        is a link to /pokedex?page=N. This means:
        - Back/forward browser buttons work correctly
        - You can link someone to page 3 directly
        - No state needed — the URL IS the page state

        In RN: you'd use FlatList's onEndReached for infinite scroll,
        or manage page state with useState and manually load more.
        URL-based pagination is a web-specific pattern.
      */}
      {!isSearching && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {/* Previous button */}
          {currentPage > 1 ? (
            <Link
              href={`/pokedex?page=${currentPage - 1}`}
              className="border-pokemon-lightgray text-pokemon-black hover:bg-pokemon-lightgray flex items-center gap-1 rounded-full border bg-white px-4 py-2 text-sm font-medium transition-colors"
            >
              ← Prev
            </Link>
          ) : (
            /*
              Disabled state: no Link, just a styled div.
              On web, disabled buttons should NOT be <button disabled>
              in all cases — for links, simply not rendering the link
              is cleaner than a disabled anchor tag.
              aria-disabled for accessibility.
            */
            <div
              className="bg-pokemon-lightgray text-pokemon-gray flex cursor-not-allowed items-center gap-1 rounded-full px-4 py-2 text-sm font-medium"
              aria-disabled="true"
            >
              ← Prev
            </div>
          )}

          {/* Page number buttons */}
          {/*
            We show a window of page numbers around the current page.
            For 8 total pages and current=5, we'd show: 1 ... 3 4 5 6 7 ... 8
            This is a common pagination UX pattern.
          */}
          <div className="flex items-center gap-1">
            {Array.from({length: totalPages}, (_, i) => i + 1)
              .filter((page) => {
                // Always show first and last page
                if (page === 1 || page === totalPages) return true;
                // Show pages within 1 of current page
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .reduce((acc: (number | '...')[], page, idx, arr) => {
                // Insert "..." between non-consecutive pages
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                  acc.push('...');
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="text-pokemon-gray px-2 text-sm">
                    ...
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={`/pokedex?page=${item}`}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      item === currentPage
                        ? 'bg-pokemon-red text-white' // Active page
                        : 'border-pokemon-lightgray text-pokemon-black hover:bg-pokemon-lightgray border bg-white'
                    }`}
                    aria-current={item === currentPage ? 'page' : undefined}
                  >
                    {item}
                  </Link>
                )
              )}
          </div>

          {/* Next button */}
          {currentPage < totalPages ? (
            <Link
              href={`/pokedex?page=${currentPage + 1}`}
              className="border-pokemon-lightgray text-pokemon-black hover:bg-pokemon-lightgray flex items-center gap-1 rounded-full border bg-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Next →
            </Link>
          ) : (
            <div
              className="bg-pokemon-lightgray text-pokemon-gray flex cursor-not-allowed items-center gap-1 rounded-full px-4 py-2 text-sm font-medium"
              aria-disabled="true"
            >
              Next →
            </div>
          )}
        </div>
      )}

      {/* Page count info */}
      {!isSearching && (
        <p className="text-pokemon-gray mt-4 text-center text-xs">
          Page {currentPage} of {totalPages} · {totalCount} Pokémon total
        </p>
      )}
    </div>
  );
}
