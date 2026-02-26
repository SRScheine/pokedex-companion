"use client";

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

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { TeamMember } from "@/types/pokemon";
import { getSpriteUrl, capitalize, formatPokemonId, searchPokemon } from "@/lib/api";
import TypeBadge from "@/components/TypeBadge";

const STORAGE_KEY = "pokedex-companion-team";
const MAX_TEAM_SIZE = 6;

export default function TeamBuilder() {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{name: string; id: number; url: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Which team slot is being edited (for nicknaming)
  const [editingNickname, setEditingNickname] = useState<number | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");

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
      console.warn("Could not load team from storage:", err);
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
      console.warn("Could not save team to storage:", err);
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
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ============================================================
  // TEAM MANAGEMENT
  // ============================================================

  async function addToTeam(pokemonId: number, name: string) {
    if (team.length >= MAX_TEAM_SIZE) return;
    if (team.some((m) => m.id === pokemonId)) return; // Already on team

    // Fetch full Pokémon data for types and sprite
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`, {
      cache: "force-cache",
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
    setSearchQuery("");
    setSearchResults([]);
  }

  function removeFromTeam(pokemonId: number) {
    setTeam((prev) => prev.filter((m) => m.id !== pokemonId));
  }

  function saveNickname(pokemonId: number) {
    setTeam((prev) =>
      prev.map((m) =>
        m.id === pokemonId
          ? { ...m, nickname: nicknameInput.trim() || undefined }
          : m
      )
    );
    setEditingNickname(null);
    setNicknameInput("");
  }

  // ============================================================
  // RENDER
  // ============================================================

  // Show skeleton until localStorage has loaded
  // This prevents the hydration mismatch error
  if (!isHydrated) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>

      {/* ── TEAM SLOTS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {/*
          Render filled slots for existing team members,
          then empty slots for remaining spaces up to 6.
        */}
        {Array.from({ length: MAX_TEAM_SIZE }).map((_, index) => {
          const member = team[index];

          if (member) {
            // Filled slot
            return (
              <div
                key={member.id}
                className="card relative flex flex-col items-center text-center group"
              >
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
                  className="absolute top-2 right-2 w-6 h-6 bg-pokemon-red text-white rounded-full text-xs flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-pokemon-darkred"
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
                        if (e.key === "Enter") saveNickname(member.id);
                        if (e.key === "Escape") setEditingNickname(null);
                      }}
                      placeholder={capitalize(member.name)}
                      className="w-full text-xs text-center border-b border-pokemon-red bg-transparent outline-none pb-0.5"
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
                      setNicknameInput(member.nickname ?? "");
                    }}
                    className="text-xs font-medium text-pokemon-black hover:text-pokemon-red transition-colors capitalize"
                    title="Click to add nickname"
                  >
                    {member.nickname ?? capitalize(member.name)}
                  </button>
                )}

                {member.nickname && (
                  <p className="text-2xs text-pokemon-gray capitalize">
                    {capitalize(member.name)}
                  </p>
                )}

                <div className="flex gap-1 flex-wrap justify-center mt-1">
                  {member.types.map((type) => (
                    <TypeBadge key={type} typeName={type} size="sm" />
                  ))}
                </div>

                <p className="text-2xs text-pokemon-gray mt-1">
                  {formatPokemonId(member.id)}
                </p>
              </div>
            );
          }

          // Empty slot
          return (
            <div
              key={`empty-${index}`}
              className="border-2 border-dashed border-pokemon-lightgray rounded-2xl flex flex-col items-center justify-center h-32 text-pokemon-gray"
            >
              <span className="text-2xl mb-1 opacity-30">+</span>
              <span className="text-xs opacity-50">Empty</span>
            </div>
          );
        })}
      </div>

      {/* ── TEAM SUMMARY ── */}
      {team.length > 0 && (
        <div className="card mb-8 bg-pokemon-lightgray/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-pokemon-black">
              Team Summary
            </h2>
            <button
              onClick={() => {
                /*
                  window.confirm(): a browser-native confirmation dialog.
                  Blocks JavaScript execution until the user responds.
                  In RN: you'd use Alert.alert() — same concept.
                  On web: window.confirm() is the quick-and-dirty version.
                  For production apps you'd build a custom modal instead.
                */
                if (window.confirm("Clear your entire team?")) {
                  setTeam([]);
                }
              }}
              className="text-xs text-pokemon-gray hover:text-pokemon-red transition-colors"
            >
              Clear team
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* All types on the team */}
            {Array.from(new Set(team.flatMap((m) => m.types))).map((type) => (
              <TypeBadge key={type} typeName={type} size="sm" />
            ))}
          </div>
          <p className="text-xs text-pokemon-gray mt-2">
            {team.length}/{MAX_TEAM_SIZE} Pokémon · {Array.from(new Set(team.flatMap((m) => m.types))).length} types covered
          </p>
        </div>
      )}

      {/* ── ADD POKÉMON ── */}
      {team.length < MAX_TEAM_SIZE && (
        <div className="card">
          <h2 className="font-semibold text-pokemon-black mb-4">
            Add Pokémon
          </h2>

          {/* Search input */}
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pokemon-gray pointer-events-none">
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-pokemon-lightgray bg-white focus:outline-none focus:ring-2 focus:ring-pokemon-red text-pokemon-black placeholder:text-pokemon-gray text-sm"
            />
          </div>

          {/* Search results */}
          {isSearching && (
            <div className="flex items-center gap-2 py-4 text-pokemon-gray text-sm">
              <div className="w-4 h-4 border-2 border-pokemon-red border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {searchResults.map((result) => {
                const isOnTeam = team.some((m) => m.id === result.id);
                return (
                  <button
                    key={result.id}
                    onClick={() => !isOnTeam && addToTeam(result.id, result.name)}
                    disabled={isOnTeam}
                    /*
                      disabled: the HTML attribute for non-interactive buttons.
                      In RN: disabled prop on TouchableOpacity/Pressable.
                      Same prop name! But web has extra CSS concerns:
                      cursor-not-allowed: shows a "not allowed" cursor on hover
                      opacity-50: visually dims the disabled button
                      disabled:opacity-50 is Tailwind's disabled: variant —
                      applies styles only when the element is disabled.
                    */
                    className="flex flex-col items-center p-3 rounded-xl border border-pokemon-lightgray hover:border-pokemon-red hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-pokemon-lightgray disabled:hover:bg-transparent"
                  >
                    <Image
                      src={getSpriteUrl(result.id)}
                      width={48}
                      height={48}
                      alt={result.name}
                      unoptimized
                    />
                    <span className="text-xs font-medium capitalize mt-1 text-pokemon-black">
                      {capitalize(result.name)}
                    </span>
                    <span className="text-2xs text-pokemon-gray">
                      {formatPokemonId(result.id)}
                    </span>
                    {isOnTeam && (
                      <span className="text-2xs text-pokemon-red font-medium mt-0.5">
                        On team
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Browse link */}
          <p className="text-xs text-pokemon-gray mt-4 text-center">
            Or{" "}
            <Link href="/pokedex" className="text-pokemon-blue hover:underline">
              browse the Pokédex
            </Link>
            {" "}and add from there.
          </p>
        </div>
      )}

      {/* Full team message */}
      {team.length === MAX_TEAM_SIZE && (
        <div className="text-center py-6 text-pokemon-gray">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-medium text-pokemon-black">Team complete!</p>
          <p className="text-sm mt-1">You have a full party of 6.</p>
        </div>
      )}
    </div>
  );
}