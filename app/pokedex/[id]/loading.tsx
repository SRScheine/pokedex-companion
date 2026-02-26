/*
  app/pokedex/[id]/loading.tsx

  Skeleton loading UI for the Pokémon detail page.
  Next.js shows this automatically while the page fetches data.
  Same pattern as app/pokedex/loading.tsx — just a different shape.
*/

export default function PokemonDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">

      {/* Back link skeleton */}
      <div className="skeleton h-4 w-24 rounded mb-6" />

      {/* Hero section */}
      <div className="bg-pokemon-lightgray rounded-3xl p-8 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Sprite */}
          <div className="skeleton w-48 h-48 rounded-full flex-shrink-0" />
          {/* Info */}
          <div className="flex-1 w-full">
            <div className="skeleton h-4 w-16 rounded mb-3" />
            <div className="skeleton h-8 w-48 rounded mb-4" />
            <div className="flex gap-2 mb-6">
              <div className="skeleton h-7 w-16 rounded-full" />
              <div className="skeleton h-7 w-16 rounded-full" />
            </div>
            <div className="skeleton h-16 w-full rounded" />
          </div>
        </div>
      </div>

      {/* Stats + info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="skeleton h-5 w-24 rounded mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-3 w-8 rounded" />
              <div className="skeleton h-2 flex-1 rounded-full" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="skeleton h-5 w-24 rounded mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-full rounded mb-2" />
          ))}
        </div>
      </div>
    </div>
  );
}