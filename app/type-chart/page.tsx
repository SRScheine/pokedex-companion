/*
  app/type-chart/page.tsx — Type Matchup Reference
  Route: yoursite.com/type-chart

  ============================================================
  PURE SERVER COMPONENT
  ============================================================

  This entire page is a Server Component. No "use client" anywhere.
  No useState, no useEffect, no interactivity needed.

  We fetch all 18 type damage relations at build time and render
  a static reference chart. Perfect use case for SSG.

  This is a pattern worth noting for interviews:
  "I identify which parts of a page need interactivity and push
  'use client' down to only those components. Pages that are
  pure reference UIs stay as Server Components."
*/

import {Metadata} from 'next';
import {POKEMON_TYPES} from '@/types/pokemon';
import {getTypeData} from '@/lib/api';
import TypeBadge from '@/components/TypeBadge';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Type Chart',
  description: "Pokémon type matchup reference for Let's Go Pikachu. Know your weaknesses instantly.",
};

/*
  Multiplier display config.
  Maps a damage multiplier to its display label and color.
*/
const MULTIPLIER_DISPLAY: Record<number, {label: string; className: string}> = {
  4: {label: '4×', className: 'bg-red-500 text-white font-bold'},
  2: {label: '2×', className: 'bg-red-400 text-white font-bold'},
  1: {label: '1×', className: 'bg-pokemon-lightgray text-pokemon-gray'},
  0.5: {label: '½×', className: 'bg-green-400 text-white font-bold'},
  0.25: {label: '¼×', className: 'bg-green-500 text-white font-bold'},
  0: {label: '0×', className: 'bg-pokemon-black text-white font-bold'},
};

export default async function TypeChartPage() {
  /*
    Fetch all 18 type damage relations in parallel.
    This runs at build time with generateStaticParams (below),
    so the page is pre-rendered — zero API calls at request time.

    Promise.all with 18 fetches — all run simultaneously.
    With force-cache, these are only ever fetched once total.
  */
  const allTypeData = await Promise.all(POKEMON_TYPES.map((type) => getTypeData(type)));

  // Build a lookup map: typeName → typeData
  const typeDataMap = Object.fromEntries(allTypeData.map((data) => [data.name, data]));

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-8">
      {/* ── HEADER ── */}
      <div className="mb-8">
        <h1 className="text-pokemon-black mb-2 font-[family-name:var(--font-pixel)] text-xl md:text-2xl">Type Chart</h1>
        <p className="text-pokemon-gray text-sm">
          Tap a type to see what it&apos;s weak to, resistant to, and immune to. Perfect for planning your next battle.
        </p>
      </div>

      {/* ── LEGEND ── */}
      <div className="card mb-6">
        <p className="text-pokemon-gray mb-3 text-xs font-medium tracking-wide uppercase">Damage Received</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MULTIPLIER_DISPLAY).map(([mult, {label, className}]) => (
            <span key={mult} className={`${className} rounded-full px-3 py-1 text-sm`}>
              {label}{' '}
              {mult === '4'
                ? 'Super effective ×2'
                : mult === '2'
                  ? 'Super effective'
                  : mult === '1'
                    ? 'Normal'
                    : mult === '0.5'
                      ? 'Not very effective'
                      : mult === '0.25'
                        ? 'Not very effective ×2'
                        : 'No effect'}
            </span>
          ))}
        </div>
      </div>

      {/* ── TYPE CARDS ── */}
      {/*
        One card per type. Each card shows:
        - The type name/badge
        - What it's weak to (2×, 4×)
        - What it resists (½×, ¼×)
        - What it's immune to (0×)
        - Combined effectiveness if defending as a dual type

        grid-cols-1 sm:grid-cols-2 lg:grid-cols-3:
        Mobile: 1 column (full width, easy to read on phone)
        Tablet: 2 columns
        Desktop: 3 columns
      */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POKEMON_TYPES.map((typeName) => {
          const typeData = typeDataMap[typeName];
          if (!typeData) return null;

          const {damage_relations} = typeData;

          return (
            <div key={typeName} className="card">
              {/* Type header */}
              <div className="mb-4 flex items-center justify-between">
                <TypeBadge typeName={typeName} size="lg" />
                <Link href={`/pokedex?search=${typeName}`} className="text-pokemon-blue text-xs hover:underline">
                  View Pokémon →
                </Link>
              </div>

              {/* Weaknesses — takes 2× damage from these */}
              {damage_relations.double_damage_from.length > 0 && (
                <div className="mb-3">
                  <p className="text-2xs text-pokemon-gray mb-1.5 font-medium tracking-wide uppercase">Weak to (2×)</p>
                  <div className="flex flex-wrap gap-1">
                    {damage_relations.double_damage_from.map(({name}) => (
                      <TypeBadge key={name} typeName={name} size="sm" />
                    ))}
                  </div>
                </div>
              )}

              {/* Resistances — takes ½× damage from these */}
              {damage_relations.half_damage_from.length > 0 && (
                <div className="mb-3">
                  <p className="text-2xs text-pokemon-gray mb-1.5 font-medium tracking-wide uppercase">Resists (½×)</p>
                  <div className="flex flex-wrap gap-1">
                    {damage_relations.half_damage_from.map(({name}) => (
                      <TypeBadge key={name} typeName={name} size="sm" />
                    ))}
                  </div>
                </div>
              )}

              {/* Immunities — takes 0× damage from these */}
              {damage_relations.no_damage_from.length > 0 && (
                <div>
                  <p className="text-2xs text-pokemon-gray mb-1.5 font-medium tracking-wide uppercase">
                    Immune to (0×)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {damage_relations.no_damage_from.map(({name}) => (
                      <TypeBadge key={name} typeName={name} size="sm" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DUAL TYPE CALCULATOR ── */}
      {/*
        This section links to combined type lookups on the Pokédex.
        A truly interactive calculator would be a Client Component —
        we'll keep this page simple and note that as a future enhancement.
      */}
      <div className="card bg-pokemon-blue/5 border-pokemon-blue/20 border">
        <h2 className="text-pokemon-black mb-2 font-semibold">💡 Dual Type Tip</h2>
        <p className="text-pokemon-gray text-sm leading-relaxed">
          When a Pokémon has two types, multiply the effectiveness together. A Water/Ground type takes 1× from Fire
          (Water resists 2× → ½×, Ground is neutral → 1×) but 4× from Grass (both Water and Ground are weak to Grass →
          2× × 2× = 4×). Check individual Pokémon pages for their combined type matchups.
        </p>
      </div>
    </div>
  );
}
