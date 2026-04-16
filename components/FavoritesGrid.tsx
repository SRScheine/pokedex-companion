'use client';

/*
  components/FavoritesGrid.tsx

  ============================================================
  WHAT THIS COMPONENT DOES
  ============================================================

  Displays all favorited Pokémon in a responsive grid.
  This is the first component that READS a full array from Redux
  and subscribes to its changes.

  When a user favorites or unfavorites a Pokémon anywhere in the
  app (Pokédex, detail page, Spin the Wheel modal), this component
  re-renders automatically because it's subscribed to the store.

  ============================================================
  "use client" — WHY?
  ============================================================

  We use useAppSelector() — reading from Redux store.
  Redux hooks must run in the browser, so this is a Client Component.

  But it renders PokemonCard, which is a Server Component.
  This is fine — Server Components work as children inside
  Client Components. PokemonCard just runs on the server,
  and its output is passed to this client component.

  ============================================================
  REACT NATIVE COMPARISON
  ============================================================

  In RN: you'd use `useSelector(selectFavorites)` and render
  a `<FlatList>` with the same cards you use elsewhere.

  On web: identical pattern — `useAppSelector` and a grid
  with the same PokemonCard component. DRY principle.

  ============================================================
  EMPTY STATE
  ============================================================

  If no Pokémon are favorited yet, show a helpful message
  with a link back to the Pokédex. This is better UX than
  a blank page — guides the user on what to do next.
*/

import Link from 'next/link';
import {useAppSelector} from '@/store/hooks';
import {selectFavorites} from '@/store/favoritesSlice';
import PokemonCard from '@/components/PokemonCard';

const FavoritesGrid = () => {
  /*
    useAppSelector(selectFavorites) reads state.favorites.pokemon —
    the full array of favorited Pokémon.

    This component SUBSCRIBES to that selector. Whenever the array
    changes (another Pokémon is added or removed, anywhere in the app),
    this component re-renders automatically.

    In RN: same pattern — useSelector subscribes and triggers re-render.
    The store manages subscriptions transparently.
  */
  const favorites = useAppSelector(selectFavorites);

  /*
    EMPTY STATE
    If no favorites, show a helpful message with a link.
  */
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-pokemon-gray mb-4 text-lg">No favorites yet!</p>
        <p className="text-pokemon-black/60 mb-6 max-w-sm text-sm">
          Star your favorite Pokémon from the Pokédex, detail pages, or Spin the Wheel to see them here.
        </p>
        <Link
          href="/pokedex"
          className="bg-pokemon-red hover:bg-pokemon-darkred rounded-lg px-6 py-3 font-medium text-white transition-colors"
        >
          Explore Pokédex
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {favorites.map((fav) => (
        <PokemonCard key={fav.id} pokemon={fav} />
      ))}
    </div>
  );
};

export default FavoritesGrid;
