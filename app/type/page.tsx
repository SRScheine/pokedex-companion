/*
  app/type/page.tsx — Pokémon Type Chart
  Route: yoursite.com/type

  ============================================================
  SERVER COMPONENT — DATA FETCHING
  ============================================================

  We fetch all 18 type definitions from PokéAPI in parallel
  using Promise.all. Each type response contains its damage
  relations — what it hits super effectively, resists, etc.

  From that we build an 18×18 matrix: for each attacking type,
  what is its effectiveness against each defending type?

  All of this happens on the server at build time. The chart
  is pure static HTML — no client-side JS needed.

  ============================================================
  THE MATRIX CALCULATION
  ============================================================

  PokéAPI gives us damage relations FROM THE PERSPECTIVE OF
  THE DEFENDING TYPE:
    double_damage_from: types that hit this type for 2x
    half_damage_from:   types that hit this type for 0.5x
    no_damage_from:     types that hit this type for 0x

  To build an attack matrix (rows = attacker, cols = defender)
  we invert this: for each defending type, mark its attackers.

  calculateTypeEffectiveness() in lib/api.ts already does this
  math — we just call it with a single type at a time.
*/

import {Metadata} from 'next';
import {getTypeData, capitalize} from '@/lib/api';
import {POKEMON_TYPES} from '@/types/pokemon';
import TypeBadge from '@/components/TypeBadge';

export const metadata: Metadata = {
  title: 'Type Chart',
  description: 'Full Pokémon type chart showing attack and defense effectiveness for all 18 types.',
};

/*
  Cell color classes by effectiveness value.
  2x  → green  — super effective, you want to see this when attacking
  0.5x → red   — not very effective, avoid this matchup
  0x  → gray   — immune, completely useless attacking into this type
  1x  → blank  — neutral, no visual noise for the common case
*/
const getCellStyle = (value: number): {bg: string; label: string} | null => {
  if (value === 2) return {bg: 'bg-emerald-600', label: '2'};
  if (value === 0.5) return {bg: 'bg-rose-700', label: '½'};
  if (value === 0) return {bg: 'bg-gray-900', label: '0'};
  return null; // neutral — render blank
};

const TypePage = async () => {
  /*
    Fetch all 18 type definitions in parallel.
    Each contains full damage_relations so we can compute
    the complete attack matrix in one pass.

    These are cached indefinitely (force-cache) since type
    data never changes between app deploys.
  */
  const typeDataList = await Promise.all(POKEMON_TYPES.map((type) => getTypeData(type)));

  /*
    Build the attack matrix.
    matrix[attackingType][defendingType] = effectiveness multiplier

    For each defending type, we read its damage_relations and
    record the multiplier for every attacking type.
    Unset entries default to 1 (neutral).
  */
  const matrix: Record<string, Record<string, number>> = {};

  // Initialize all entries to 1 (neutral)
  for (const attackType of POKEMON_TYPES) {
    matrix[attackType] = {};
    for (const defendType of POKEMON_TYPES) {
      matrix[attackType][defendType] = 1;
    }
  }

  // Fill in non-neutral values from each type's damage_relations
  for (const typeData of typeDataList) {
    const defendType = typeData.name;
    const {damage_relations} = typeData;

    damage_relations.double_damage_from.forEach(({name}) => {
      if (matrix[name]) matrix[name][defendType] = 2;
    });
    damage_relations.half_damage_from.forEach(({name}) => {
      if (matrix[name]) matrix[name][defendType] = 0.5;
    });
    damage_relations.no_damage_from.forEach(({name}) => {
      if (matrix[name]) matrix[name][defendType] = 0;
    });
  }

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-8">
      {/* ── HEADER ── */}
      <div className="mb-8">
        <h1 className="text-pokemon-black mb-2 font-[family-name:var(--font-pixel)] text-xl md:text-2xl">Type Chart</h1>
        <p className="text-pokemon-gray text-sm">How each type performs in attack and defense across all 18 types.</p>
      </div>

      {/* ── EXPLANATION ── */}
      <div className="card text-pokemon-black/80 mb-8 flex flex-col gap-4 text-sm leading-relaxed">
        <p>
          Every Pokémon and every move has a type. In battle, the type of the move you use is matched against the type
          (or types) of the defending Pokémon to determine how much damage is dealt.
        </p>
        <p>
          A <strong>super effective</strong> hit deals <strong>2× damage</strong>. If the defender has two types that
          are both weak to the attack, damage becomes <strong>4×</strong>. Conversely, a{' '}
          <strong>not very effective</strong> hit deals <strong>½× damage</strong>, and two resistances stack to{' '}
          <strong>¼×</strong>. An <strong>immune</strong> type takes <strong>no damage at all</strong>.
        </p>
        <p>
          You also gain <strong>STAB</strong> (Same Type Attack Bonus) when a Pokémon uses a move that matches one of
          its own types — a free <strong>1.5×</strong> boost on top of any type matchup. A Water-type Pokémon using a
          Water move against a Ground/Rock Pokémon deals <strong>6× damage</strong> (2 × 2 × 1.5).
        </p>

        {/* Chart key */}
        <div className="border-pokemon-lightgray flex flex-wrap items-center gap-4 border-t pt-4">
          <span className="text-pokemon-gray text-xs font-medium tracking-wide uppercase">Key:</span>
          {[
            {bg: 'bg-emerald-600', label: '2', desc: 'Super effective (2×)'},
            {bg: 'bg-rose-700', label: '½', desc: 'Not very effective (½×)'},
            {bg: 'bg-gray-900', label: '0', desc: 'No effect (0×)'},
          ].map(({bg, label, desc}) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`${bg} flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white`}>
                {label}
              </span>
              <span className="text-pokemon-gray text-xs">{desc}</span>
            </div>
          ))}
          <span className="text-pokemon-gray text-xs">Blank = neutral (1×)</span>
        </div>
      </div>

      {/* ── TYPE CHART TABLE ── */}
      {/*
        overflow-x-auto: horizontal scroll on mobile.
        The table is 18 columns wide — it cannot reasonably fit on
        a phone screen without scrolling. This is the standard
        pattern for wide data tables on the web.
        In RN: you'd use a horizontal ScrollView.
        On web: overflow-x-auto on a wrapper div.

        The first column (attacking type name) is sticky so it
        stays visible as you scroll right — you always know which
        row you're reading.
      */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {/*
                Corner cell — labels both axes at once.
                "ATK ↓ DEF →" tells you: rows are the attacking type,
                columns are the defending type.
              */}
              <th className="bg-pokemon-lightgray text-pokemon-gray sticky left-0 z-20 min-w-[70px] border-r border-b border-gray-200 px-2 py-2 text-xs font-semibold">
                <div className="flex flex-col items-start gap-0.5">
                  <span>DEF →</span>
                  <span>ATK ↓</span>
                </div>
              </th>

              {/* Defending type column headers — abbreviated */}
              {POKEMON_TYPES.map((type) => (
                <th
                  key={type}
                  className="border-b border-gray-200 px-1 py-2 text-center font-semibold"
                  title={capitalize(type)}
                >
                  <TypeBadge typeName={type} size="sm" useAbbrev />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {POKEMON_TYPES.map((attackType, rowIdx) => (
              <tr
                key={attackType}
                /*
                  Alternating row background for readability.
                  With 18 rows it's easy to lose track of which
                  row you're on as your eye moves right.
                  even: → slight gray tint
                  odd:  → white
                */
                className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {/* Attacking type row header — sticky left */}
                <td
                  className="sticky left-0 z-10 border-r border-gray-200 px-3 py-1.5 font-semibold"
                  style={{
                    backgroundColor: rowIdx % 2 === 0 ? 'white' : 'rgb(249 250 251)',
                  }}
                >
                  <TypeBadge typeName={attackType} size="sm" useAbbrev={true} />
                </td>

                {/* Effectiveness cells */}
                {POKEMON_TYPES.map((defendType) => {
                  const value = matrix[attackType][defendType];
                  const cell = getCellStyle(value);

                  return (
                    <td
                      key={defendType}
                      className="border-gray-100 p-0.5 text-center"
                      title={`${capitalize(attackType)} → ${capitalize(defendType)}: ${value}×`}
                    >
                      {cell ? (
                        /*
                          Colored cell for non-neutral interactions.
                          The color immediately communicates good/bad/immune
                          without needing to read the number.
                          The number is still shown for precision.
                        */
                        <span
                          className={`${cell.bg} mx-auto flex h-7 w-7 items-center justify-center rounded font-bold text-white`}
                        >
                          {cell.label}
                        </span>
                      ) : (
                        // Neutral — blank cell, no visual noise
                        <span className="mx-auto flex h-7 w-7 items-center justify-center text-gray-200">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER NOTE ── */}
      <p className="text-pokemon-gray mt-4 pt-4 text-center text-xs">
        Chart reflects Generation 6+ type interactions (X/Y onwards), including the Fairy type added in Gen 6.
      </p>
    </div>
  );
};

export default TypePage;
