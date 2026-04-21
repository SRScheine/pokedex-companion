'use client';

/*
  components/TeamBuilder.tsx

  ============================================================
  WHY THIS IS A CLIENT COMPONENT
  ============================================================

  This component needs "use client" because it uses:
  1. useState — manages team state, search state, UI state
  2. useEffect — reads/writes localStorage, fetches Pokémon
  3. localStorage — persists team between sessions
  4. Event handlers — add/remove/nickname Pokémon

  ============================================================
  localStorage ON WEB vs REACT NATIVE
  ============================================================

  In React Native, you used AsyncStorage (or MMKV, SecureStore, etc.)
  to persist data between app sessions:

    await AsyncStorage.setItem('team', JSON.stringify(team));
    const saved = await AsyncStorage.getItem('team');

  On web, the equivalent is localStorage:

    localStorage.setItem('team', JSON.stringify(team));
    const saved = localStorage.getItem('team');

  Key differences:
  - localStorage is SYNCHRONOUS (no await needed)
  - localStorage is STRING ONLY (must JSON.stringify/parse)
  - localStorage is browser-only — can't access it in Server Components
    or during SSR (server-side rendering)
  - localStorage persists until manually cleared (unlike sessionStorage
    which clears when the tab closes)
  - Storage limit is ~5MB per origin

  ============================================================
  THE localStorage + SSR GOTCHA
  ============================================================

  This is one of the most common bugs Next.js beginners hit.

  localStorage only exists in the browser. But Next.js renders
  components on the SERVER first (even Client Components get
  a server-side "pre-render" pass for the initial HTML).

  If you write:
    const saved = localStorage.getItem('team'); // 💥 CRASHES on server

  You'll get: "localStorage is not defined"

  The fix: only access localStorage inside useEffect, which only
  runs in the browser (never on the server):

    useEffect(() => {
      const saved = localStorage.getItem('team'); // ✓ safe
    }, []);

  We handle this with an `isHydrated` state flag below.
  This pattern comes up constantly in Next.js — learn it well.
*/

import {useState, useEffect, useCallback, useRef} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {TeamMember} from '@/types/pokemon';
import {getSpriteUrl, capitalize, formatPokemonId, searchPokemon} from '@/lib/api';
import TypeBadge from '@/components/TypeBadge';

const STORAGE_KEY = 'pokedex-companion-team';
const MAX_TEAM_SIZE = 6;

const TeamBuilder = () => {
  // Current team — array of up to 6 TeamMember objects
  const [team, setTeam] = useState<TeamMember[]>([]);

  /*
    isHydrated: tracks whether we've loaded from localStorage yet.

    Why do we need this?
    On the server-side pre-render, team starts as [].
    After hydration, team is populated from localStorage.
    If we render team-dependent UI before hydration, React will
    throw a "hydration mismatch" error because server HTML (empty
    team) doesn't match client HTML (saved team).

    Solution: don't render team-dependent UI until after hydration.
    Show a skeleton instead.

    This is a web-specific concept — RN doesn't have SSR hydration.
  */
  const [isHydrated, setIsHydrated] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string; id: number; url: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Which team slot is being edited (for nicknaming)
  const [editingNickname, setEditingNickname] = useState<number | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');

  // Clear team confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Adding to team state (for loading indicator)
  const [isAdding, setIsAdding] = useState(false);

  // Ref to search input for focusing when clicking empty slots
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // LOAD FROM localStorage ON MOUNT
  //
  // This useEffect runs ONCE after the component mounts in the browser.
  // "After mount" = after hydration = safe to access localStorage.
  //
  // In RN: you'd call AsyncStorage.getItem() in a useEffect too —
  // same pattern, different API.
  // ============================================================
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TeamMember[];
        setTeam(parsed);
      }
    } catch (err) {
      // localStorage can throw if storage is full or in private mode
      console.warn('Could not load team from storage:', err);
    } finally {
      // Always mark as hydrated, even if load failed
      setIsHydrated(true);
    }
  }, []); // Empty dependency array = run once on mount

  // ============================================================
  // SAVE TO localStorage WHENEVER TEAM CHANGES
  //
  // useEffect with [team] dependency runs every time `team` changes.
  // We skip saving before hydration (would overwrite saved data with []).
  //
  // In RN: AsyncStorage.setItem() in a useEffect([team]) — identical pattern.
  // ============================================================
  useEffect(() => {
    if (!isHydrated) return; // Don't save the empty initial state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
    } catch (err) {
      console.warn('Could not save team to storage:', err);
    }
  }, [team, isHydrated]);

  // ============================================================
  // SEARCH
  //
  // useCallback: memoizes the function so it's not recreated
  // on every render. Same as useCallback in React Native.
  // ============================================================
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPokemon(query);
      setSearchResults(results.slice(0, 8)); // Limit to 8 results
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ============================================================
  // TEAM MANAGEMENT
  // ============================================================

  const addToTeam = async (pokemonId: number, name: string) => {
    if (team.length >= MAX_TEAM_SIZE) return;
    if (team.some((m) => m.id === pokemonId)) return; // Already on team

    setIsAdding(true);
    try {
      // Fetch full Pokémon data for types and sprite
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`, {
        cache: 'force-cache',
      });
      const data = await res.json();

      const newMember: TeamMember = {
        id: pokemonId,
        name,
        sprite: getSpriteUrl(pokemonId),
        types: data.types.map((t: any) => t.type.name),
        addedAt: Date.now(),
      };

      /*
        Functional state update: (prev) => [...prev, newMember]
        Always use the functional form when new state depends on old state.
        Same rule in RN and web — this avoids stale closure issues.
      */
      setTeam((prev) => [...prev, newMember]);
      setSearchQuery('');
      setSearchResults([]);
    } finally {
      setIsAdding(false);
    }
  };

  const removeFromTeam = (pokemonId: number) => {
    setTeam((prev) => prev.filter((m) => m.id !== pokemonId));
  };

  const saveNickname = (pokemonId: number) => {
    setTeam((prev) => prev.map((m) => (m.id === pokemonId ? {...m, nickname: nicknameInput.trim() || undefined} : m)));
    setEditingNickname(null);
    setNicknameInput('');
  };

  // ============================================================
  // RENDER
  // ============================================================

  // Show skeleton until localStorage has loaded
  // This prevents the hydration mismatch error
  if (!isHydrated) {
    return (
      <div className="animate-pulse">
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── TEAM SLOTS ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {/*
          Render filled slots for existing team members,
          then empty slots for remaining spaces up to 6.
        */}
        {Array.from({length: MAX_TEAM_SIZE}).map((_, index) => {
          const member = team[index];

          if (member) {
            // Filled slot
            return (
              <div key={member.id} className="card group relative flex flex-col items-center text-center">
                {/* Remove button */}
                {/*
                  Positioned absolutely in the top-right corner.
                  opacity-0 group-hover:opacity-100: hidden until card is hovered.
                  This is the CSS `group` pattern again.

                  On mobile (no hover), we show it always:
                  sm:opacity-0 sm:group-hover:opacity-100 means:
                  - Always visible on mobile (no sm: prefix = mobile first)
                  - Hidden on sm+ until hover
                */}
                <button
                  onClick={() => removeFromTeam(member.id)}
                  className="bg-pokemon-red hover:bg-pokemon-darkred absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Remove ${member.nickname ?? member.name} from team`}
                >
                  ✕
                </button>

                <Image
                  src={member.sprite ?? getSpriteUrl(member.id)}
                  width={64}
                  height={64}
                  alt={member.name}
                  unoptimized
                  className="mb-1"
                />

                {/* Nickname editing */}
                {editingNickname === member.id ? (
                  /*
                    Inline nickname editor.
                    onBlur: fires when the input loses focus.
                    Web-only event — no direct RN equivalent
                    (RN uses onEndEditing or onBlur on TextInput).
                    We save on blur for a smooth UX.
                  */
                  <div className="w-full">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      onBlur={() => saveNickname(member.id)}
                      onKeyDown={(e) => {
                        /*
                          onKeyDown: fires on any key press.
                          We listen for Enter to save.
                          In RN: onSubmitEditing on TextInput.
                          On web: onKeyDown checking e.key.
                        */
                        if (e.key === 'Enter') saveNickname(member.id);
                        if (e.key === 'Escape') setEditingNickname(null);
                      }}
                      placeholder={capitalize(member.name)}
                      className="border-pokemon-red w-full border-b bg-transparent pb-0.5 text-center text-xs outline-none"
                      autoFocus
                      /*
                        autoFocus: focuses the input when it mounts.
                        In RN: autoFocus prop on TextInput — same name!
                      */
                      maxLength={12}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingNickname(member.id);
                      setNicknameInput(member.nickname ?? '');
                    }}
                    className="text-pokemon-black hover:text-pokemon-red flex items-center gap-1 text-xs font-medium capitalize transition-colors group/nickname"
                    title="Click to add nickname"
                  >
                    {member.nickname ?? capitalize(member.name)}
                    <span className="text-pokemon-gray group-hover/nickname:text-pokemon-red text-2xs transition-colors">✏</span>
                  </button>
                )}

                {member.nickname && <p className="text-2xs text-pokemon-gray capitalize">{capitalize(member.name)}</p>}

                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {member.types.map((type) => (
                    <TypeBadge key={type} typeName={type} size="sm" />
                  ))}
                </div>

                <p className="text-2xs text-pokemon-gray mt-1">{formatPokemonId(member.id)}</p>
              </div>
            );
          }

          // Empty slot
          return (
            <button
              key={`empty-${index}`}
              onClick={() => searchInputRef.current?.focus()}
              className="border-pokemon-lightgray bg-pokemon-lightgray/30 text-pokemon-gray hover:border-pokemon-lightgray/80 card border-2 border-dashed flex flex-col items-center justify-center transition-colors hover:bg-pokemon-lightgray/50 cursor-pointer"
            >
              <span className="mb-1 text-2xl opacity-30">+</span>
              <span className="text-xs opacity-50">Empty</span>
            </button>
          );
        })}
      </div>

      {/* ── TEAM SUMMARY ── */}
      {team.length > 0 && (
        <div className="card bg-pokemon-lightgray/50 mb-8">
          <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-pokemon-black font-semibold">Team Summary</h2>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-pokemon-gray hover:text-pokemon-red text-xs transition-colors"
              >
                Clear team
              </button>
            ) : (
              <div className="flex gap-2">
                <span className="text-pokemon-black text-xs">Clear team?</span>
                <button
                  onClick={() => {
                    setTeam([]);
                    setShowClearConfirm(false);
                  }}
                  className="text-pokemon-red hover:text-pokemon-darkred text-xs font-semibold transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-pokemon-gray hover:text-pokemon-black text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* All types on the team */}
            {Array.from(new Set(team.flatMap((m) => m.types))).map((type) => (
              <TypeBadge key={type} typeName={type} size="sm" />
            ))}
          </div>
          <p className="text-pokemon-gray mt-2 text-xs">
            {team.length}/{MAX_TEAM_SIZE} Pokémon · {Array.from(new Set(team.flatMap((m) => m.types))).length} types
            covered
          </p>
        </div>
      )}

      {/* ── ADD POKÉMON ── */}
      {team.length < MAX_TEAM_SIZE && (
        <div className="card">
          <h2 className="text-pokemon-black mb-4 font-semibold">Add Pokémon</h2>

          {/* Search input */}
          <div className="relative mb-4">
            <span className="text-pokemon-gray pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">🔍</span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name..."
              className="border-pokemon-lightgray focus:ring-pokemon-red text-pokemon-black placeholder:text-pokemon-gray w-full rounded-full border bg-white py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          {/* Search results */}
          {isSearching && (
            <div className="text-pokemon-gray flex items-center gap-2 py-4 text-sm">
              <div className="border-pokemon-red h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              Searching...
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {searchResults.map((result) => {
                const isOnTeam = team.some((m) => m.id === result.id);
                return (
                  <button
                    key={result.id}
                    onClick={() => !isOnTeam && !isAdding && addToTeam(result.id, result.name)}
                    disabled={isOnTeam || isAdding}
                    /*
                      disabled: the HTML attribute for non-interactive buttons.
                      In RN: disabled prop on TouchableOpacity/Pressable.
                      Same prop name! But web has extra CSS concerns:
                      cursor-not-allowed: shows a "not allowed" cursor on hover
                      opacity-50: visually dims the disabled button
                      disabled:opacity-50 is Tailwind's disabled: variant —
                      applies styles only when the element is disabled.
                    */
                    className="border-pokemon-lightgray hover:border-pokemon-red disabled:hover:border-pokemon-lightgray flex flex-col items-center rounded-xl border p-3 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Image src={getSpriteUrl(result.id)} width={48} height={48} alt={result.name} unoptimized />
                    <span className="text-pokemon-black mt-1 text-xs font-medium capitalize">
                      {capitalize(result.name)}
                    </span>
                    <span className="text-2xs text-pokemon-gray">{formatPokemonId(result.id)}</span>
                    {isOnTeam && <span className="text-2xs text-pokemon-red mt-0.5 font-medium">On team</span>}
                    {isAdding && <span className="text-2xs text-pokemon-yellow mt-0.5 font-medium">Adding…</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Browse link */}
          <p className="text-pokemon-gray mt-4 text-center text-xs">
            Or{' '}
            <Link href="/pokedex" className="text-pokemon-blue hover:underline">
              find a Pokémon in the Pokédex
            </Link>
            .
          </p>
        </div>
      )}

      {/* Full team message */}
      {team.length === MAX_TEAM_SIZE && (
        <div className="text-pokemon-gray py-6 text-center">
          <p className="mb-2 text-2xl">🎉</p>
          <p className="text-pokemon-black font-medium">Team complete!</p>
          <p className="mt-1 text-sm">You have a full party of 6.</p>
          <Link
            href="/type"
            className="text-pokemon-blue hover:text-pokemon-red mt-3 inline-block text-xs font-semibold transition-colors"
          >
            Check type coverage →
          </Link>
        </div>
      )}
    </div>
  );
};

export default TeamBuilder;
