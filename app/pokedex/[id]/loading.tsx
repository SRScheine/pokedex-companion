/*
  app/pokedex/[id]/loading.tsx

  Skeleton loading UI for the Pokémon detail page.
  Next.js shows this automatically while the page fetches data.
  Same pattern as app/pokedex/loading.tsx — just a different shape.
*/

const PokemonDetailLoading = () => {
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

      {/* Quick stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {Array.from({length: 3}).map((_, i) => (
          <div key={i} className="card text-center">
            <div className="skeleton mb-2 h-3 w-16 rounded mx-auto" />
            <div className="skeleton h-4 w-12 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Base stats + Type defenses + Abilities */}
      <div className="mb-6 flex flex-col gap-6">
        {/* Base Stats card */}
        <div className="card">
          <div className="skeleton mb-4 h-5 w-24 rounded" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            {/* StatRadar placeholder (circle) */}
            <div className="flex-[4]">
              <div className="skeleton h-48 w-48 rounded-full mx-auto" />
            </div>
            {/* StatTable placeholder (list) */}
            <div className="flex-[2]">
              {Array.from({length: 6}).map((_, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <div className="skeleton h-3 w-12 rounded" />
                  <div className="skeleton h-3 flex-1 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Type defenses placeholder */}
        <div className="card">
          <div className="skeleton mb-4 h-5 w-32 rounded" />
          <div className="skeleton h-40 w-full rounded" />
        </div>

        {/* Abilities + Training grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="card">
            <div className="skeleton mb-3 h-5 w-20 rounded" />
            {Array.from({length: 3}).map((_, i) => (
              <div key={i} className="skeleton mb-2 h-8 w-full rounded" />
            ))}
          </div>
          <div className="card">
            <div className="skeleton mb-3 h-5 w-20 rounded" />
            {Array.from({length: 3}).map((_, i) => (
              <div key={i} className="skeleton mb-2 h-8 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonDetailLoading;
