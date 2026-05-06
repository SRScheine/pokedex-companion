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

import {useState, useEffect} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import TypeBadge from '@/components/TypeBadge';
import GameSelector from '@/components/GameSelector';
import type {MoveEntry, PokemonMove} from '@/types/pokemon';
import {
  formatPokemonId,
  capitalize,
  getSpriteUrl,
  formatEvolutionDetails,
  formatName,
  getMovesForVersionGroup,
} from '@/lib/api';
import type {FlatEvolution} from '@/lib/api';

interface Props {
  pokemonId: number;
  evolutions: FlatEvolution[];
  rawMoves: PokemonMove[];
}

const CATEGORY_LABELS: Record<string, string> = {
  physical: 'Physical',
  special: 'Special',
  status: 'Status',
};

const CategoryBadge = ({category}: {category: string}) => {
  const label = CATEGORY_LABELS[category];
  if (!label) {
    return <span className="text-pokemon-gray capitalize">{category}</span>;
  }
  return (
    <div className="relative h-6 w-6">
      <Image
        src={`/move-${category}.png`}
        alt={label}
        fill
        title={label}
        className="cursor-help object-contain"
        unoptimized
      />
    </div>
  );
};

type SortHeaderProps = {
  column: string;
  label: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
};

const SortHeader = ({column, label, sortColumn, sortDirection, onSort}: SortHeaderProps) => {
  // Check if this column is the currently sorted one
  const isActive = sortColumn === column;

  const labelPadding =
    column === 'type' ? 'px-2' : column === 'power' ? 'px-1 md:px-6' : column === 'accuracy' ? 'px-1 md:px-5' : 'px-1';

  return (
    <th
      onClick={() => onSort(column)}
      className={`text-pokemon-gray hover:text-pokemon-black cursor-pointer ${labelPadding} py-1 text-left text-xs font-medium select-none ${
        isActive ? 'text-pokemon-black' : ''
      }`}
    >
      <div className="flex items-center gap-0.5">
        <span>{label}</span>
        <div
          className="flex flex-col items-center gap-px leading-none"
          style={{height: '8px', fontSize: '7px', marginTop: '-6px'}}
        >
          {isActive ? (
            // Active column: show only the arrow pointing in the current sort direction
            <span style={{lineHeight: '1', display: 'flex', alignItems: 'center'}}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          ) : (
            // Inactive column: show both arrows stacked (up and down) with minimal gap
            <>
              <span style={{lineHeight: '1', display: 'block'}}>▲</span>
              <span style={{lineHeight: '1', display: 'block'}}>▼</span>
            </>
          )}
        </div>
      </div>
    </th>
  );
};

const PokemonDetailClient = ({pokemonId, evolutions, rawMoves}: Props) => {
  const [versionGroup, setVersionGroup] = useState<string>('lets-go-pikachu-lets-go-eevee');
  const [activeMoveTab, setActiveMoveTab] = useState<'level-up' | 'tm'>('level-up');
  const [sortColumn, setSortColumn] = useState<string>('level');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [levelUpMoves, setLevelUpMoves] = useState<MoveEntry[]>([]);
  const [machineMoves, setMachineMoves] = useState<MoveEntry[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(false);

  // Fetch and enrich moves when versionGroup changes
  useEffect(() => {
    const fetchMoves = async () => {
      setLoadingMoves(true);
      const startTime = Date.now();

      const {levelUpMoves: levelUp, machineMoves: machine} = await getMovesForVersionGroup(rawMoves, versionGroup);

      const elapsed = Date.now() - startTime;
      // Force loading to take half second for better UX
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 500 - elapsed)));

      setLevelUpMoves(levelUp);
      setMachineMoves(machine);
      setLoadingMoves(false);
    };

    fetchMoves();
  }, [versionGroup, rawMoves]);

  // Handle column header clicks for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // If clicking the same column, toggle between ascending and descending
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new column, switch to that column and start with ascending order
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortMoves = (moves: MoveEntry[]) => {
    // Create a shallow copy of the array so we don't mutate the original
    const sorted = [...moves];

    // Use the browser's built-in array.sort() method with a compare function
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      // Extract the value from each move based on which column we're sorting by
      if (sortColumn === 'level') {
        aVal = a.level || 0;
        bVal = b.level || 0;
      } else if (sortColumn === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortColumn === 'type') {
        aVal = a.type;
        bVal = b.type;
      } else if (sortColumn === 'category') {
        aVal = a.damageClass;
        bVal = b.damageClass;
      } else if (sortColumn === 'power') {
        aVal = a.power || 0;
        bVal = b.power || 0;
      } else if (sortColumn === 'accuracy') {
        aVal = a.accuracy || 0;
        bVal = b.accuracy || 0;
      } else if (sortColumn === 'tmNumber') {
        aVal = a.tmNumber ?? 999;
        bVal = b.tmNumber ?? 999;
      }

      // For string comparisons (name, type, category), use localeCompare
      // which handles alphabetical sorting correctly
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        // If ascending: a < b returns negative (a comes first)
        // If descending: reverse the comparison so b comes first
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // For numeric comparisons (level, power, accuracy), subtract values
      // If ascending: a - b (smaller numbers first)
      // If descending: b - a (larger numbers first)
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return sorted;
  };

  return (
    <>
      {/* ── EVOLUTION CHAIN ── */}
      {evolutions.length > 1 && (
        <div className="card mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-pokemon-black font-semibold">Evolution Chain</h2>
          </div>

          <div className="scrollbar-hide overflow-x-auto">
            <div className="mx-auto flex min-w-max items-center justify-start gap-2 pb-2 md:justify-center">
              {evolutions.map((evo, index) => {
                const evoId = parseInt(evo.url.split('/').filter(Boolean).pop() ?? '0');
                const isCurrentPokemon = evoId === pokemonId;
                const evoLabel = index > 0 ? formatEvolutionDetails(evolutions[index].details) : '';

                return (
                  <div key={evo.name} className="flex items-center gap-2">
                    {index > 0 && (
                      <div className="text-pokemon-gray flex flex-col items-center justify-center self-center px-1">
                        <span className="text-lg leading-none">→</span>
                        {evoLabel && (
                          <span className="text-pokemon-gray max-w-14 text-center text-xs break-normal whitespace-normal">
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
        </div>
        <GameSelector onGameChange={setVersionGroup} />

        {/* First load — no stale content yet */}
        {loadingMoves && levelUpMoves.length === 0 && machineMoves.length === 0 && (
          <div className="flex min-h-50 items-center justify-center gap-3">
            <div className="border-pokemon-red h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-pokemon-gray text-sm">Loading moves...</p>
          </div>
        )}

        {/* Empty state — finished loading, no moves for this game */}
        {!loadingMoves && levelUpMoves.length === 0 && machineMoves.length === 0 && (
          <p className="text-pokemon-gray text-sm">No move data available for this game.</p>
        )}

        {/* Content — shown whenever we have moves (stale or fresh) */}
        {(levelUpMoves.length > 0 || machineMoves.length > 0) && (
          <div className="relative">
            {/* Overlay spinner while reloading for a new game */}
            {loadingMoves && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-lg bg-white/80">
                <div className="border-pokemon-red h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                <p className="text-pokemon-gray text-sm">Loading...</p>
              </div>
            )}

            {/* Tab buttons - notebook style */}
            <div className="border-pokemon-lightgray mb-2 flex gap-1 border-b">
              {levelUpMoves.length > 0 && (
                <button
                  onClick={() => {
                    setActiveMoveTab('level-up');
                    setSortColumn('level');
                    setSortDirection('asc');
                  }}
                  className={`ml-2 rounded-t-lg px-4 py-2 font-medium transition-colors ${
                    activeMoveTab === 'level-up'
                      ? 'border-pokemon-lightgray text-pokemon-black border-t border-r border-l bg-white'
                      : 'bg-pokemon-lightgray text-pokemon-gray hover:bg-gray-300'
                  }`}
                >
                  By Level Up
                </button>
              )}
              {machineMoves.length > 0 && (
                <button
                  onClick={() => {
                    setActiveMoveTab('tm');
                    setSortColumn('tmNumber');
                    setSortDirection('asc');
                  }}
                  className={`rounded-t-lg px-4 py-2 font-medium transition-colors ${
                    activeMoveTab === 'tm'
                      ? 'border-pokemon-lightgray text-pokemon-black border-t border-r border-l bg-white'
                      : 'bg-pokemon-lightgray text-pokemon-gray hover:bg-gray-300'
                  }`}
                >
                  By TM
                </button>
              )}
            </div>

            {/* Level Up tab */}
            {activeMoveTab === 'level-up' && levelUpMoves.length > 0 && (
              <div className="scrollbar-hide overflow-x-auto">
                <table className="w-full text-sm md:table-fixed">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-30" />
                    <col className="w-20" />
                    <col className="w-5" />
                    <col className="w-5" />
                    <col className="w-5" />
                  </colgroup>
                  <thead>
                    <tr className="border-pokemon-lightgray border-b">
                      <SortHeader
                        column="level"
                        label="Lv."
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        column="name"
                        label="Move"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        column="type"
                        label="Type"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="text-pokemon-gray px-1 py-1 text-center text-xs font-medium">Cat.</th>
                      <SortHeader
                        column="power"
                        label="Pwr."
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        column="accuracy"
                        label="Acc."
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {sortMoves(levelUpMoves).map((move) => (
                      <tr
                        key={move.name}
                        className="border-pokemon-lightgray/50 hover:bg-pokemon-lightgray/50 border-b transition-colors last:border-0"
                      >
                        <td className="text-pokemon-gray px-1 py-1 font-mono text-xs">
                          {move.level === 0 ? '—' : move.level}
                        </td>
                        <td className="text-pokemon-black px-1 py-1 text-xs font-medium capitalize">
                          {formatName(move.name)}
                        </td>
                        <td className="px-1 py-1">
                          <TypeBadge typeName={move.type} size="sm" />
                        </td>
                        <td className="flex justify-center px-1 py-1">
                          <CategoryBadge category={move.damageClass} />
                        </td>
                        <td className="text-pokemon-gray px-1 py-1 text-right font-mono text-xs">
                          {move.power ?? '—'}
                        </td>
                        <td className="text-pokemon-gray px-1 py-1 text-right font-mono text-xs">
                          {move.accuracy != null ? `${move.accuracy}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TM tab */}
            {activeMoveTab === 'tm' && machineMoves.length > 0 && (
              <div className="scrollbar-hide overflow-x-auto">
                <table className="w-full text-sm md:table-fixed">
                  <colgroup>
                    <col className="w-10" />
                    <col className="w-30" />
                    <col className="w-20" />
                    <col className="w-5" />
                    <col className="w-5" />
                    <col className="w-5" />
                  </colgroup>
                  <thead>
                    <tr className="border-pokemon-lightgray border-b">
                      <SortHeader
                        column="tmNumber"
                        label="TM"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        column="name"
                        label="Move"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        column="type"
                        label="Type"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <th className="text-pokemon-gray px-1 py-1 text-center text-xs font-medium">Cat.</th>
                      <SortHeader
                        column="power"
                        label="Pwr."
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortHeader
                        column="accuracy"
                        label="Acc."
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {sortMoves(machineMoves).map((move) => (
                      <tr
                        key={move.name}
                        className="border-pokemon-lightgray/50 hover:bg-pokemon-lightgray/50 border-b transition-colors last:border-0"
                      >
                        <td className="text-pokemon-gray px-1 py-1 font-mono text-xs">
                          {move.tmNumber ? String(move.tmNumber).padStart(2, '0') : '—'}
                        </td>
                        <td className="text-pokemon-black px-1 py-1 text-xs font-medium capitalize">
                          {formatName(move.name)}
                        </td>
                        <td className="px-1 py-1">
                          <TypeBadge typeName={move.type} size="sm" />
                        </td>
                        <td className="flex justify-center px-1 py-1">
                          <CategoryBadge category={move.damageClass} />
                        </td>
                        <td className="text-pokemon-gray px-1 py-1 text-right font-mono text-xs">
                          {move.power ?? '—'}
                        </td>
                        <td className="text-pokemon-gray px-1 py-1 text-right font-mono text-xs">
                          {move.accuracy != null ? `${move.accuracy}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default PokemonDetailClient;
