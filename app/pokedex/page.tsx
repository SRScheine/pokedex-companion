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

import { Metadata } from "next";
import { Suspense } from "react";
import { getPokemonListWithDetails, searchPokemon } from "@/lib/api";
import { LETS_GO_MAX_POKEMON } from "@/types/pokemon";
import PokemonCard from "@/components/PokemonCard";
import PokedexSearch from "@/components/PokedexSearch";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pokédex",
  description: "Browse all 151 original Pokémon available in Let's Go Pikachu.",
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

export default async function PokedexPage({ searchParams }: PokedexPageProps) {
  // Await searchParams (required in Next.js 15+)
  const params = await searchParams;
  const searchQuery = params.search ?? "";
  /*
    Parse page number from URL.
    URL params are always strings, so we parseInt.
    We clamp to minimum 1 in case someone passes ?page=0 or ?page=-1.
  */
  const currentPage = Math.max(1, parseInt(params.page ?? "1"));
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
    // Search: filter all 151 by name, then fetch details for matches
    const searchResults = await searchPokemon(searchQuery);
    pokemon = await Promise.all(
      searchResults.map(async (result) => {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${result.id}`, {
          cache: "force-cache",
        });
        return res.json();
      })
    );
    totalCount = pokemon.length;
  } else {
    // Browse: paginated fetch
    pokemon = await getPokemonListWithDetails(PAGE_SIZE, offset);
    totalCount = LETS_GO_MAX_POKEMON;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-pixel)] text-pokemon-black text-xl md:text-2xl">
            Pokédex
          </h1>
          <p className="text-pokemon-gray text-sm mt-1">
            {isSearching
              ? `${totalCount} result${totalCount !== 1 ? "s" : ""} for "${searchQuery}"`
              : `Gen 1 — ${LETS_GO_MAX_POKEMON} Pokémon`
            }
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
        <Suspense fallback={<div className="h-10 w-full md:w-80 skeleton rounded-full" />}>
          <PokedexSearch />
        </Suspense>
      </div>

      {/* ── POKEMON GRID ── */}
      {pokemon.length === 0 ? (
        // Empty state
        <div className="text-center py-20">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-pokemon-black font-semibold text-lg mb-2">
            No Pokémon found
          </p>
          <p className="text-pokemon-gray text-sm mb-6">
            No results for &quot;{searchQuery}&quot;. Try a different name.
          </p>
          <Link
            href="/pokedex"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-pokemon-red text-white rounded-full font-medium hover:bg-pokemon-darkred transition-colors text-sm"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
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
        <div className="flex items-center justify-center gap-2 mt-4">

          {/* Previous button */}
          {currentPage > 1 ? (
            <Link
              href={`/pokedex?page=${currentPage - 1}`}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-pokemon-lightgray text-pokemon-black text-sm font-medium hover:bg-pokemon-lightgray transition-colors"
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
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-pokemon-lightgray text-pokemon-gray text-sm font-medium cursor-not-allowed"
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
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Always show first and last page
                if (page === 1 || page === totalPages) return true;
                // Show pages within 1 of current page
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .reduce((acc: (number | "...")[], page, idx, arr) => {
                // Insert "..." between non-consecutive pages
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                  acc.push("...");
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-pokemon-gray text-sm">
                    ...
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={`/pokedex?page=${item}`}
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      item === currentPage
                        ? "bg-pokemon-red text-white"          // Active page
                        : "bg-white border border-pokemon-lightgray text-pokemon-black hover:bg-pokemon-lightgray"
                    }`}
                    aria-current={item === currentPage ? "page" : undefined}
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
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-pokemon-lightgray text-pokemon-black text-sm font-medium hover:bg-pokemon-lightgray transition-colors"
            >
              Next →
            </Link>
          ) : (
            <div
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-pokemon-lightgray text-pokemon-gray text-sm font-medium cursor-not-allowed"
              aria-disabled="true"
            >
              Next →
            </div>
          )}
        </div>
      )}

      {/* Page count info */}
      {!isSearching && (
        <p className="text-center text-pokemon-gray text-xs mt-4">
          Page {currentPage} of {totalPages} · {LETS_GO_MAX_POKEMON} Pokémon total
        </p>
      )}
    </div>
  );
}