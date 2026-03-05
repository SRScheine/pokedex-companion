'use client';

/*
  components/PokemonDetailClient.tsx

  Client Component that renders the Evolution Chain and Moves sections
  with a shared Gen 1 Only toggle controlling both.

  WHY THIS IS A CLIENT COMPONENT:
  The Gen 1 toggle reads from and writes to localStorage, which only
  exists in the browser. The toggle state also needs to trigger
  re-renders when changed. Both of these require "use client".

  The parent page (Server Component) fetches ALL the data and passes
  it down as props — both the Gen 1 filtered sets and the full sets.
  This component just picks which to display based on toggle state.
  No additional fetching happens here.

  This is the recommended Next.js pattern:
    Server Component: fetch everything, pass as props
    Client Component: receive data, handle interactivity
*/

import Image from 'next/image';
import Link from 'next/link';
import Gen1Toggle, {useGen1Only} from '@/components/Gen1Toggle';
import {LETS_GO_MAX_POKEMON} from '@/types/pokemon';
import {formatPokemonId, capitalize, getSpriteUrl, formatEvolutionDetails, formatName} from '@/lib/api';
import type {FlatEvolution} from '@/lib/api';

type MoveEntry = {name: string; url: string; learnMethod: string; level: number};

interface Props {
  pokemonId: number;
  evolutions: FlatEvolution[];
  letsGoLevelUpMoves: MoveEntry[];
  letsGoTmMoves: MoveEntry[];
  allLevelUpMoves: MoveEntry[];
  allTmMoves: MoveEntry[];
  isGen1: boolean;
}

export default function PokemonDetailClient({
  pokemonId,
  evolutions,
  letsGoLevelUpMoves,
  letsGoTmMoves,
  allLevelUpMoves,
  allTmMoves,
  isGen1,
}: Props) {
  /*
    useGen1Only: reads localStorage, provides toggle state + function.
    One hook instance here controls BOTH the evolution and moves sections
    — they share the same gen1Only boolean so toggling one toggles both.
  */
  const {gen1Only, toggle, hydrated} = useGen1Only();

  /*
    filterActive: true only when this IS a Gen 1 Pokémon AND the toggle is on.
    Non-Gen 1 Pokémon always show full data regardless of toggle state —
    the toggle is hidden entirely for them (handled in parent via isGen1 prop).
  */
  const filterActive = isGen1 && gen1Only;

  // Pick the right data set based on filter state
  const levelUpMoves = filterActive ? letsGoLevelUpMoves : allLevelUpMoves;
  const tmMoves = filterActive ? letsGoTmMoves : allTmMoves;

  // Filter evolutions to Gen 1 only (IDs 1-151) when toggle is active
  const visibleEvolutions = filterActive
    ? evolutions.filter((evo) => {
        const evoId = parseInt(evo.url.split('/').filter(Boolean).pop() ?? '0');
        return evoId <= LETS_GO_MAX_POKEMON;
      })
    : evolutions;

  /*
    Hydration guard: return null until localStorage has been read.
    Without this, the server renders with gen1Only=true (the default),
    the client hydrates, reads localStorage (maybe false), and React
    throws a hydration mismatch error because the HTML doesn't match.

    Returning null on first render means: "don't render until we know
    what localStorage says." The Suspense fallback in the parent shows
    a skeleton during this brief window.

    In RN: no SSR, so hydration mismatches don't exist.
    On web: any component reading localStorage needs this guard.
  */
  if (!hydrated) return null;

  return (
    <>
      {/* ── EVOLUTION CHAIN ── */}
      {visibleEvolutions.length > 1 && (
        <div className="card mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-pokemon-black font-semibold">Evolution Chain</h2>
            {/*
              Toggle only shown for Gen 1 Pokémon.
              Non-Gen 1 always shows full chain — no toggle needed.
            */}
            {isGen1 && <Gen1Toggle gen1Only={gen1Only} onToggle={toggle} />}
          </div>

          <div className="scrollbar-hide overflow-x-auto">
            <div className="mx-auto flex min-w-max items-center justify-start gap-2 pb-2 md:justify-center">
              {visibleEvolutions.map((evo, index) => {
                const evoId = parseInt(evo.url.split('/').filter(Boolean).pop() ?? '0');
                const isCurrentPokemon = evoId === pokemonId;
                const evoLabel = index > 0 ? formatEvolutionDetails(visibleEvolutions[index].details) : '';

                return (
                  <div key={evo.name} className="flex items-center gap-2">
                    {index > 0 && (
                      <div className="text-pokemon-gray flex flex-col items-center justify-center self-center px-1">
                        <span className="text-lg leading-none">→</span>
                        {evoLabel && (
                          <span className="text-pokemon-gray max-w-[3.5rem] text-center text-xs break-normal whitespace-normal">
                            {evoLabel}
                          </span>
                        )}
                      </div>
                    )}
                    <Link
                      href={`/pokedex/${evoId}`}
                      className={`flex flex-col items-center rounded-xl border-2 p-3 transition-colors ${
                        isCurrentPokemon
                          ? 'border-pokemon-red bg-pokemon-lightgray'
                          : 'hover:bg-pokemon-lightgray border-transparent'
                      }`}
                    >
                      <Image src={getSpriteUrl(evoId)} width={64} height={64} alt={evo.name} unoptimized />
                      <span className="text-pokemon-black mt-1 text-xs font-medium capitalize">
                        {capitalize(evo.name)}
                      </span>
                      <span className="text-2xs text-pokemon-gray">{formatPokemonId(evoId)}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MOVES ── */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-pokemon-black font-semibold">Available Moves</h2>
          {/*
            Same toggle instance — gen1Only is shared state from the
            single useGen1Only() call at the top. Toggling either
            button updates both sections simultaneously.
          */}
          {isGen1 && <Gen1Toggle gen1Only={gen1Only} onToggle={toggle} />}
        </div>

        {levelUpMoves.length === 0 && tmMoves.length === 0 ? (
          <p className="text-pokemon-gray text-sm">No move data available.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {levelUpMoves.length > 0 && (
              <div>
                <h3 className="text-pokemon-gray mb-3 text-sm font-medium tracking-wide uppercase">By Level Up</h3>
                <div className="scrollbar-hide overflow-x-auto">
                  <table className="w-full min-w-[300px] text-sm">
                    <thead>
                      <tr className="border-pokemon-lightgray border-b">
                        <th className="text-pokemon-gray w-12 py-2 text-left font-medium">Lv.</th>
                        <th className="text-pokemon-gray py-2 text-left font-medium">Move</th>
                      </tr>
                    </thead>
                    <tbody>
                      {levelUpMoves.map((move) => (
                        <tr
                          key={move.name}
                          className="border-pokemon-lightgray/50 hover:bg-pokemon-lightgray/50 border-b transition-colors last:border-0"
                        >
                          <td className="text-pokemon-gray py-2 font-mono">{move.level === 0 ? '—' : move.level}</td>
                          <td className="text-pokemon-black py-2 font-medium capitalize">{formatName(move.name)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tmMoves.length > 0 && (
              <div>
                <h3 className="text-pokemon-gray mb-3 text-sm font-medium tracking-wide uppercase">By TM</h3>
                <div className="flex flex-wrap gap-2">
                  {tmMoves.map((move) => (
                    <span
                      key={move.name}
                      className="bg-pokemon-lightgray text-pokemon-black rounded-full px-3 py-1 text-xs font-medium capitalize"
                    >
                      {formatName(move.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
