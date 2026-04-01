'use client';

/*
  components/Gen1Toggle.tsx

  A reusable toggle button + localStorage hook for the Gen 1 filter.

  Split into two exports:
  - useGen1Only(): the hook that manages state + localStorage
  - Gen1Toggle: the visual button component

  Separating them lets PokemonDetailClient use the hook for logic
  while rendering the button in two places (evolution + moves headers)
  both synced to the same state.
*/

import {useState, useEffect} from 'react';

const STORAGE_KEY = 'pokedex-gen1-only';

/*
  useGen1Only — custom hook for the toggle state.

  Reads initial value from localStorage, writes back on every change.
  Uses the hydration guard pattern (isHydrated) to prevent SSR mismatch.

  In RN: AsyncStorage.getItem() — same idea, but async.
  On web: localStorage.getItem() is synchronous, but we still
  must access it inside useEffect because localStorage doesn't
  exist on the server during SSR.
*/
export const useGen1Only = () => {
  const [gen1Only, setGen1Only] = useState(true); // default: Gen 1 on
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Safe to access localStorage now — we're in the browser
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setGen1Only(JSON.parse(saved));
    setHydrated(true);
  }, []);

  const toggle = () => {
    setGen1Only((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return {gen1Only, toggle, hydrated};
};

interface Gen1ToggleProps {
  gen1Only: boolean;
  onToggle: () => void;
}

const Gen1Toggle = ({gen1Only, onToggle}: Gen1ToggleProps) => {
  return (
    <button
      onClick={onToggle}
      /*
        Conditional className based on toggle state.
        Active (Gen 1 on): red pill — visually "on"
        Inactive (all Pokémon): outlined pill — visually "off"

        transition-colors: smoothly animates the color change
        when toggling. Duration defaults to 150ms in Tailwind.
        In RN: you'd use Animated.timing() or reanimated for this.
        On web: one CSS class handles it.
      */
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        gen1Only
          ? 'border-pokemon-red bg-pokemon-red text-white'
          : 'border-pokemon-lightgray text-pokemon-gray hover:border-pokemon-red hover:text-pokemon-red bg-white'
      }`}
    >
      <span>{gen1Only ? '●' : '○'}</span>
      Gen 1 Only
    </button>
  );
};

export default Gen1Toggle;
