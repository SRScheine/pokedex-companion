/*
  app/pokedex/loading.tsx — Loading UI

  ============================================================
  NEXT.JS SPECIAL FILE: loading.tsx
  ============================================================

  This is one of Next.js's "special files" — like page.tsx and
  layout.tsx, the filename itself has meaning to the framework.

  When Next.js is fetching data for a Server Component page,
  it automatically shows this loading.tsx in the meantime.
  You don't import it or call it anywhere — Next.js handles it.

  Under the hood, Next.js wraps your page in a React <Suspense>
  boundary and uses this component as the fallback.

  ============================================================
  REACT NATIVE EQUIVALENT
  ============================================================

  In RN, you handled loading states manually:
    if (loading) return <ActivityIndicator />;
    return <ActualContent />;

  In Next.js, loading states are handled at the ROUTE level:
  - loading.tsx shows automatically while the page fetches
  - page.tsx renders when data is ready
  - No if/else needed inside the page component

  This separation keeps your page components clean — they
  never have to think about their own loading state.

  ============================================================
  SKELETON SCREENS vs SPINNERS
  ============================================================

  We're building a skeleton screen — placeholder shapes that
  mimic the layout of the real content. This is better UX than
  a spinner because:
  1. Users see the page structure immediately
  2. Perceived load time feels shorter
  3. Less jarring transition when content loads

  The shimmer animation comes from our .skeleton utility class
  defined in globals.css.
*/

// Skeleton for a single Pokémon card
function CardSkeleton() {
  return (
    /*
      animate-pulse: Tailwind's built-in pulse animation.
      Fades the element in and out repeatedly.
      Simpler alternative to our custom shimmer — good for
      block-level skeletons.

      rounded-2xl: matches the card border radius
    */
    <div className="card flex animate-pulse flex-col items-center text-center">
      {/* ID placeholder */}
      <div className="skeleton mb-2 h-3 w-8 self-start rounded" />
      {/* Sprite placeholder */}
      <div className="skeleton mb-2 h-24 w-24 rounded-full" />
      {/* Name placeholder */}
      <div className="skeleton mb-2 h-4 w-20 rounded" />
      {/* Type badge placeholders */}
      <div className="flex gap-1">
        <div className="skeleton h-5 w-12 rounded-full" />
        <div className="skeleton h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export default function PokedexLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 flex animate-pulse flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="skeleton mb-2 h-6 w-32 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
        {/* Search bar skeleton */}
        <div className="skeleton h-10 w-full rounded-full md:w-80" />
      </div>

      {/*
        Grid skeleton — same grid layout as the real page.
        We show 20 card skeletons (one full page worth).
        Array.from({ length: 20 }) creates an array of 20 items
        so we can map over it. Same trick works in RN.
      */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({length: 20}).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
