'use client';

import Link from 'next/link';

export default function Error({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  return (
    <div className="animate-fade-in">
      <section className="from-pokemon-red to-pokemon-darkred bg-gradient-to-br">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h1 className="text-pokemon-yellow mb-2 font-[family-name:var(--font-pixel)] text-5xl md:text-6xl">
              Error
            </h1>
            <p className="mb-2 text-2xl font-semibold text-white/90">Something went wrong</p>
            <p className="mb-8 text-lg text-white/70">An unexpected error occurred. Try refreshing or go back home.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={reset}
                className="bg-pokemon-yellow text-pokemon-black inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors duration-200 hover:bg-yellow-300"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-6 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/30"
              >
                Back Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
