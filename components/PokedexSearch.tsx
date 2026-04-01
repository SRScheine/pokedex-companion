'use client';

/*
  components/PokedexSearch.tsx

  The search bar for the Pokédex page.

  ============================================================
  WHY THIS IS A CLIENT COMPONENT
  ============================================================

  This component needs "use client" because:
  1. It uses useState (tracks the search input value)
  2. It uses useRouter and useSearchParams (reads/writes the URL)
  3. It responds to user input events (onChange, onSubmit)

  The PARENT page (pokedex/page.tsx) is a Server Component.
  This is the recommended Next.js pattern:

    Server Component (page) — fetches data, renders list
      └── Client Component (search bar) — handles user input

  Keep Server Components as the outer shell.
  Push "use client" down to the smallest interactive piece.

  ============================================================
  URL SEARCH PARAMS — THE WEB'S WAY TO SHARE STATE
  ============================================================

  In React Native, if you wanted a search screen to filter a list,
  you'd probably use:
  - useState in a parent component
  - Context
  - A state manager like Redux/Zustand
  - Navigation params passed between screens

  On the web, there's a better primitive: THE URL.

  Instead of storing search state in React state, we put it in
  the URL: /pokedex?search=pikachu&page=2

  Why this is better:
  ✓ Shareable — send someone the URL, they see the same results
  ✓ Bookmarkable — save a search for later
  ✓ Browser back/forward works correctly
  ✓ The Server Component can read it and fetch the right data
  ✓ Refresh preserves the state

  This is a fundamental web pattern that has no direct RN equivalent.
  It's worth internalizing — interviewers love this topic.

  ============================================================
  HOW IT WORKS
  ============================================================

  1. User types in search box → onChange updates local useState
  2. User submits (Enter or button) → we update the URL with router.push
  3. URL change triggers the Server Component parent to re-render
  4. Server Component reads the new search param, fetches matching data
  5. New results render

  The search query lives in the URL, not in React state.
  React state just tracks the input field's current value.
*/

import {useState, useCallback} from 'react';
import Image from 'next/image';
// useRouter: programmatic navigation — like navigation.navigate() in RN
// but for updating the URL.
import {useRouter, useSearchParams} from 'next/navigation';

const PokedexSearch = () => {
  const router = useRouter();

  /*
    useSearchParams(): reads the current URL's query string.
    e.g. for URL /pokedex?search=pikachu, searchParams.get('search') = 'pikachu'

    This is a Client Component hook — only works with "use client".
    The Server Component parent can read searchParams too, but via
    props (passed by Next.js automatically). We'll see that in page.tsx.
  */
  const searchParams = useSearchParams();

  /*
    Initialize local state from the URL.
    If the user lands on /pokedex?search=pikachu, the input
    should start pre-filled with "pikachu".

    This syncs the UI with the URL on first render.
  */
  const [query, setQuery] = useState(searchParams.get('search') ?? '');
  const [suggestions, setSuggestions] = useState<Array<{id: number; name: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    /*
      e.preventDefault():
      HTML forms submit by default — they do a full page reload
      and append form data to the URL in a browser-native way.
      We don't want that; we want to control the URL ourselves.
      preventDefault() stops the native form behavior.

      In RN: forms don't exist, so you never need this.
      On web: you'll call this constantly on form submissions.
    */
    e.preventDefault();
    setSuggestions([]);

    /*
      URLSearchParams: a browser API for building query strings.
      Much cleaner than manual string concatenation.

      new URLSearchParams(searchParams): copies existing params
      so we don't accidentally wipe out other params (like page number).
    */
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set('search', query.trim());
    } else {
      params.delete('search');
    }

    // Always reset to page 1 when searching
    params.delete('page');

    /*
      router.push(): navigates to a new URL.
      This triggers the Server Component parent to re-render
      with the new search params.

      In RN: navigation.navigate('Pokedex', { search: query })
      On web: router.push('/pokedex?search=pikachu')

      The URL IS the navigation param on web.
    */
    router.push(`/pokedex?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    router.push('/pokedex');
  };

  /*
  fetchSuggestions: fetches live search results as the user types.
  useCallback memoizes this function so it doesn't get recreated
  on every render — same pattern as in SpinWheel's search.

  This runs client-side: fetches all 1025 names, filters in memory.
  The response is cached by Next.js after the first call so
  subsequent keystrokes are instant.
*/
  const fetchSuggestions = useCallback(async (value: string) => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
      const data = await res.json();
      const lower = value.toLowerCase().trim();
      const matches = data.results
        .filter((p: {name: string}) => p.name.includes(lower))
        .slice(0, 8)
        .map((p: {name: string; url: string}) => ({
          name: p.name,
          id: parseInt(p.url.split('/').filter(Boolean).pop() ?? '0'),
        }));
      setSuggestions(matches);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return (
    /*
      <form> with onSubmit:
      Using a form element (rather than just a div with onClick)
      enables keyboard submission via Enter key automatically.
      This is correct semantic HTML and better accessibility.

      In RN: you'd manually handle the TextInput's onSubmitEditing.
      On web: wrapping inputs in <form> gives you Enter-to-submit for free.
    */
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <div className="relative">
        {/* Search icon — decorative, positioned absolutely inside the input */}
        <span
          className="text-pokemon-gray pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          aria-hidden="true"
        >
          🔍
        </span>

        {/*
          <input> — the web equivalent of RN's <TextInput>.

          Key differences from TextInput:
          - type="search": tells browser this is a search input
            (shows clear button on some browsers, enables search semantics)
          - placeholder: same as RN
          - value + onChange: same controlled input pattern as RN
          - className instead of style
          - No keyboardType prop — the browser infers from type=""

          Tailwind input classes:
          w-full: fills available width
          pl-10 pr-10: padding-left/right to avoid text under icons
          py-2.5: vertical padding
          rounded-full: pill shape
          border border-pokemon-lightgray: subtle border
          focus:outline-none focus:ring-2 focus:ring-pokemon-red:
            On web, focused inputs get a browser default focus ring.
            We remove it (outline-none) and replace with our own
            styled ring (ring-2). This is important for accessibility
            — never remove focus styles without replacing them.
            In RN: focus styles are handled by the native OS.
        */}
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            fetchSuggestions(e.target.value);
          }}
          placeholder="Search Pokémon..."
          className="border-pokemon-lightgray focus:ring-pokemon-red text-pokemon-black placeholder:text-pokemon-gray w-full rounded-full border bg-white py-2.5 pr-10 pl-10 text-sm focus:ring-2 focus:outline-none"
          /*
            aria-label: screen reader label for the input.
            In RN: accessibilityLabel
            On web: aria-label
            Same concept, different prop name.
          */
          aria-label="Search Pokémon by name"
        />

        {/* Clear button — only shown when there's a query */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-pokemon-gray hover:text-pokemon-black absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      {/* Live suggestions dropdown */}
      {/*
          absolute top-full: positions the dropdown directly below the input.
          top-full = top edge sits at the bottom edge of the parent.
          left-0 right-0: stretches to match the input width exactly.
          z-50: above all other page content.

          In RN: you'd use a Modal or absolute View positioned manually.
          On web: absolute + top-full is the standard dropdown pattern.
      */}
      {suggestions.length > 0 && (
        <div className="border-pokemon-lightgray absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-2xl border bg-white shadow-lg">
          {isSearching && (
            <div className="text-pokemon-gray flex items-center gap-2 px-4 py-3 text-sm">
              {/*
                  CSS spinner — same pattern as SpinWheel.
                  border-t-transparent creates the "gap" in the circle.
                  animate-spin: Tailwind's built-in continuous rotation.
                  In RN: <ActivityIndicator />
              */}
              <div className="border-pokemon-red h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              Searching...
            </div>
          )}
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                /*
                  On suggestion click: update the input, clear the dropdown,
                  and navigate to the search results page for that name.
                  Using router.push keeps this client-side (no full reload).
                */
                setQuery(s.name);
                setSuggestions([]);
                router.push(`/pokedex?search=${s.name}`);
              }}
              className="border-pokemon-lightgray hover:bg-pokemon-lightgray flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-0"
            >
              <Image
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.id}.png`}
                width={32}
                height={32}
                alt={s.name}
                unoptimized
              />
              {/*
                  flex-1: makes the name column take all remaining space,
                  pushing the ID number to the right edge.
                  In RN: flex: 1 on a View — same concept.
              */}
              <span className="text-pokemon-black flex-1 text-sm font-medium capitalize">
                {s.name
                  .split('-')
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </span>
              <span className="text-pokemon-gray text-xs">#{String(s.id).padStart(3, '0')}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

export default PokedexSearch;
