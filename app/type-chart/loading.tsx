/*
  app/type-chart/loading.tsx
  Shown automatically by Next.js while the type chart page fetches.
*/

export default function TypeChartLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="skeleton mb-2 h-6 w-36 rounded" />
        <div className="skeleton h-4 w-80 rounded" />
      </div>

      {/* Legend skeleton */}
      <div className="card mb-6">
        <div className="skeleton mb-3 h-3 w-32 rounded" />
        <div className="flex flex-wrap gap-2">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="skeleton h-7 w-28 rounded-full" />
          ))}
        </div>
      </div>

      {/* Type cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({length: 18}).map((_, i) => (
          <div key={i} className="card">
            <div className="mb-4 flex items-center justify-between">
              <div className="skeleton h-7 w-20 rounded-full" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
            <div className="mb-3">
              <div className="skeleton mb-2 h-3 w-16 rounded" />
              <div className="flex flex-wrap gap-1">
                {Array.from({length: 3}).map((_, j) => (
                  <div key={j} className="skeleton h-5 w-14 rounded-full" />
                ))}
              </div>
            </div>
            <div>
              <div className="skeleton mb-2 h-3 w-16 rounded" />
              <div className="flex flex-wrap gap-1">
                {Array.from({length: 2}).map((_, j) => (
                  <div key={j} className="skeleton h-5 w-14 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
