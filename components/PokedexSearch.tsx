"use client";

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

import { useState } from "react";
// useRouter: programmatic navigation — like navigation.navigate() in RN
// but for updating the URL.
import { useRouter, useSearchParams } from "next/navigation";

export default function PokedexSearch() {
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
  const [query, setQuery] = useState(
    searchParams.get("search") ?? ""
  );

  function handleSearch(e: React.FormEvent) {
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

    /*
      URLSearchParams: a browser API for building query strings.
      Much cleaner than manual string concatenation.

      new URLSearchParams(searchParams): copies existing params
      so we don't accidentally wipe out other params (like page number).
    */
    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }

    // Always reset to page 1 when searching
    params.delete("page");

    /*
      router.push(): navigates to a new URL.
      This triggers the Server Component parent to re-render
      with the new search params.

      In RN: navigation.navigate('Pokedex', { search: query })
      On web: router.push('/pokedex?search=pikachu')

      The URL IS the navigation param on web.
    */
    router.push(`/pokedex?${params.toString()}`);
  }

  function handleClear() {
    setQuery("");
    router.push("/pokedex");
  }

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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-pokemon-gray pointer-events-none"
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Pokémon..."
          className="w-full pl-10 pr-10 py-2.5 rounded-full border border-pokemon-lightgray bg-white focus:outline-none focus:ring-2 focus:ring-pokemon-red text-pokemon-black placeholder:text-pokemon-gray text-sm"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-pokemon-gray hover:text-pokemon-black transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}