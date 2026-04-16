/*
  app/favorites/page.tsx — Favorites Page
  Route: yoursite.com/favorites

  ============================================================
  THIN SERVER COMPONENT SHELL
  ============================================================

  This page is intentionally minimal. All the interesting logic
  (reading from Redux, rendering the grid) lives in <FavoritesGrid />
  which is a Client Component.

  This is a common Next.js pattern:
  - Server Component handles: metadata, page title, static layout
  - Client Component handles: interactivity, state, store subscriptions

  The Server Component doesn't need to fetch any data here —
  the favorites data lives in Redux (client-side only). There's
  nothing for the server to fetch.
*/

import {Metadata} from 'next';
import FavoritesGrid from '@/components/FavoritesGrid';

export const metadata: Metadata = {
  title: 'Favorites',
  description: 'Your starred Pokémon — favorites saved in Redux with localStorage persistence.',
};

const FavoritesPage = () => {
  /*
    Note: this component is NOT async.
    No data to fetch on the server — favorites live in the Redux store
    (client-side only). A Server Component doesn't have to be async if
    it has no server-side work to do.

    FavoritesGrid is a Client Component that reads from Redux.
    Redux is initialized by StoreProvider with localStorage data
    before any component hydrates. FavoritesGrid renders immediately
    without suspending, so no Suspense boundary is needed.

    If we wrapped it in Suspense, the server would send a skeleton
    as the fallback, but the client would render the actual grid
    immediately (no suspension), causing a hydration mismatch.
  */
  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-pokemon-black mb-2 font-[family-name:var(--font-pixel)] text-xl md:text-2xl">Favorites</h1>
        <p className="text-pokemon-gray text-sm">
          Your starred Pokémon. Star any Pokémon from the Pokédex, detail pages, or Spin the Wheel to add them here.
        </p>
      </div>

      {/* FavoritesGrid reads from Redux and renders the grid */}
      <FavoritesGrid />
    </div>
  );
};

export default FavoritesPage;
