/*
  components/TypeDefenses.tsx

  Shows how effective each of the 18 attacking types is against
  this Pokémon, accounting for dual typing.

  SERVER COMPONENT — fetches type data and computes multipliers
  at render time. No client-side JS needed.

  ============================================================
  DUAL TYPE MULTIPLIER MATH
  ============================================================

  For each attacking type, we start at 1× and multiply by the
  effectiveness against EACH of the Pokémon's types in turn.

  Single type (e.g. Fire):
    Fire vs Grass = 2× → final: 2×

  Dual type (e.g. Grass/Poison):
    Fire vs Grass = 2×, Fire vs Poison = 1× → final: 2×
    Ground vs Grass = 1×, Ground vs Poison = 2× → final: 2×
    Ice vs Grass = 2×, Ice vs Poison = 1× → final: 2×
    Bug vs Grass = 0.5×, Bug vs Poison = 1× → final: 0.5×

  Only when BOTH types share the same weakness does it stack:
    e.g. Rock vs Fire/Flying = 2× × 2× = 4×
*/

import {capitalize, getTypeData} from '@/lib/api';
import {POKEMON_TYPES} from '@/types/pokemon';

const TYPE_ABBREV: Record<string, string> = {
  normal: 'Nor',
  fire: 'Fir',
  water: 'Wat',
  electric: 'Ele',
  grass: 'Gra',
  ice: 'Ice',
  fighting: 'Fig',
  poison: 'Poi',
  ground: 'Gro',
  flying: 'Fly',
  psychic: 'Psy',
  bug: 'Bug',
  rock: 'Roc',
  ghost: 'Gho',
  dragon: 'Dra',
  dark: 'Dar',
  steel: 'Ste',
  fairy: 'Fai',
};

const TYPE_COLORS: Record<string, string> = {
  normal: '#9A9A6A',
  fire: '#E8600A',
  water: '#4070E8',
  electric: '#E8B800',
  grass: '#58A830',
  ice: '#60C0C0',
  fighting: '#A01818',
  poison: '#882888',
  ground: '#C89820',
  flying: '#8868E8',
  psychic: '#F02070',
  bug: '#788A00',
  rock: '#9A7A18',
  ghost: '#4A3878',
  dragon: '#5018E8',
  dark: '#483828',
  steel: '#8A8AAA',
  fairy: '#D060A0',
};

/*
  Types that need dark text on their colored background.
  Mirrors the logic in TypeBadge — light background types
  need dark text for sufficient contrast.
*/
const DARK_TEXT_TYPES = new Set(['electric', 'ground', 'ice', 'normal']);

/*
  Cell styles by multiplier.
  4× and ¼× use stronger, more alarming colors to distinguish
  them clearly from the more common 2× and ½× cases.

  4×  → lime    — screams danger, clearly worse than 2×
  2×  → emerald — super effective
  ½×  → rose    — resistant
  ¼×  → purple  — very resistant, clearly distinct from ½×
  0×  → near-black — immune
  1×  → light gray — neutral, unifies the grid without distraction
*/
function getCellStyle(value: number): {bg: string; text: string; label: string} {
  if (value === 4) return {bg: '#65a30d', text: '#fff', label: '4'}; // lime-600
  if (value === 2) return {bg: '#059669', text: '#fff', label: '2'}; // emerald-600
  if (value === 0.5) return {bg: '#be123c', text: '#fff', label: '½'}; // rose-700
  if (value === 0.25) return {bg: '#b45309', text: '#fff', label: '¼'}; // purple-800
  if (value === 0) return {bg: '#111827', text: '#fff', label: '0'}; // gray-900
  return {bg: '#f3f4f6', text: '#9ca3af', label: ''}; // neutral
}

const getPokemonTypeStringFromArray = (types: string[]) => {
  let typeString = '';
  types.forEach((type, index) => {
    if (index !== 0) {
      typeString += '/';
    }
    typeString += capitalize(type);
  });
  return typeString;
};

interface TypeDefensesProps {
  name: string;
  pokemonTypes: string[]; // e.g. ['grass', 'poison']
}

export default async function TypeDefenses({name, pokemonTypes}: TypeDefensesProps) {
  /*
    Fetch damage relations for each of this Pokémon's types.
    For a single-type Pokémon this is 1 fetch.
    For a dual-type Pokémon this is 2 fetches, in parallel.
    These are cached indefinitely — type data never changes.
  */
  const typeDataList = await Promise.all(pokemonTypes.map((type) => getTypeData(type)));

  /*
    Build a multiplier map for all 18 attacking types.
    Start every attacking type at 1× then multiply through
    each of the Pokémon's types' damage relations.
  */
  const multipliers: Record<string, number> = {};
  for (const attackType of POKEMON_TYPES) {
    multipliers[attackType] = 1;
  }

  for (const typeData of typeDataList) {
    const {damage_relations} = typeData;

    damage_relations.double_damage_from.forEach(({name}) => {
      if (multipliers[name] !== undefined) multipliers[name] *= 2;
    });
    damage_relations.half_damage_from.forEach(({name}) => {
      if (multipliers[name] !== undefined) multipliers[name] *= 0.5;
    });
    damage_relations.no_damage_from.forEach(({name}) => {
      if (multipliers[name] !== undefined) multipliers[name] *= 0;
    });
  }

  // Split into two rows of 9 like pokemondb
  const firstRow = POKEMON_TYPES.slice(0, 9);
  const secondRow = POKEMON_TYPES.slice(9);

  /*
    Shared table renders one row of 9 types.
    table-fixed + w-[11.11%] on every cell enforces equal column widths
    regardless of the text content inside each cell.
  */
  const renderRow = (types: string[]) => (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr>
          {types.map((type) => (
            <th
              key={type}
              className="border border-white text-center font-bold uppercase"
              style={{
                width: `${100 / 9}%`,
                backgroundColor: TYPE_COLORS[type],
                color: DARK_TEXT_TYPES.has(type) ? '#1f2937' : '#ffffff',
                /*
                  font-size uses clamp() — a CSS function that picks a value
                  between a min and max based on a preferred viewport-relative size.
                  clamp(min, preferred, max)
                  This means: never smaller than 8px, ideally 1.3vw, never larger than 11px.
                  On narrow screens it shrinks gracefully rather than overflowing.
                  In RN: you'd use Dimensions.get('window').width to compute dynamically.
                */
                fontSize: 'clamp(8px, 1.3vw, 11px)',
                padding: '3px 1px',
                letterSpacing: '0.03em',
              }}
            >
              {TYPE_ABBREV[type]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {types.map((type) => {
            const value = multipliers[type];
            const cell = getCellStyle(value);
            return (
              <td
                key={type}
                className="border border-white text-center font-bold"
                style={{
                  width: `${100 / 9}%`,
                  backgroundColor: cell.bg,
                  color: cell.text,
                  fontSize: 'clamp(8px, 1.3vw, 11px)',
                  padding: '1px',
                  height: 'clamp(20px, 2.8vw, 28px)',
                }}
                title={`${capitalize(type)} -> ${getPokemonTypeStringFromArray(pokemonTypes)} : ${value}×`}
              >
                {cell.label}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="card">
      <h2 className="text-pokemon-black mb-4 font-semibold">Type Defenses</h2>
      <p className="text-pokemon-gray mb-4 pb-1 text-xs">
        The effectiveness of each type on
        <span className="font-bold capitalize">{` ${name} `}</span>
        <span>{`(${getPokemonTypeStringFromArray(pokemonTypes)}).`}</span>
      </p>

      {/* No overflow-x-auto — clamp() handles narrow screens by scaling text */}
      <div className="flex flex-col gap-1 overflow-hidden">
        {renderRow(firstRow)}
        {renderRow(secondRow)}
      </div>
    </div>
  );
}
