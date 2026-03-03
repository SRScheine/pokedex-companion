/*
  app/pokedex/[id]/loading.tsx

  Skeleton loading UI for the Pokémon detail page.
  Next.js shows this automatically while the page fetches data.
  Same pattern as app/pokedex/loading.tsx — just a different shape.
*/

export default function PokemonDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8">
      {/* Back link skeleton */}
      <div className="skeleton mb-6 h-4 w-24 rounded" />

      {/* Hero section */}
      <div className="bg-pokemon-lightgray mb-6 rounded-3xl p-8">
        <div className="flex flex-col items-center gap-8 md:flex-row">
          {/* Sprite */}
          <div className="skeleton h-48 w-48 flex-shrink-0 rounded-full" />
          {/* Info */}
          <div className="w-full flex-1">
            <div className="skeleton mb-3 h-4 w-16 rounded" />
            <div className="skeleton mb-4 h-8 w-48 rounded" />
            <div className="mb-6 flex gap-2">
              <div className="skeleton h-7 w-16 rounded-full" />
              <div className="skeleton h-7 w-16 rounded-full" />
            </div>
            <div className="skeleton h-16 w-full rounded" />
          </div>
        </div>
      </div>

      {/* Stats + info grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="card">
          <div className="skeleton mb-4 h-5 w-24 rounded" />
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="mb-3 flex items-center gap-3">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-3 w-8 rounded" />
              <div className="skeleton h-2 flex-1 rounded-full" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="skeleton mb-4 h-5 w-24 rounded" />
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="skeleton mb-2 h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
