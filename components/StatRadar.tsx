/*
  components/StatRadar.tsx

  SVG radar chart showing a Pokémon's stats as percentile ranks.

  SERVER COMPONENT — all math is done at render time from props.
  No interactivity, no state, no client-side JS.

  ============================================================
  PERCENTILE RADAR vs RAW VALUE RADAR
  ============================================================

  A raw value radar would place each point at (value / maxPossible).
  This makes high-ceiling stats like HP look relatively weak even
  when a Pokémon has great HP, because the ceiling is very high.

  A percentile radar places each point at (percentileRank / 100).
  This answers: "compared to all other Pokémon, how good is this stat?"
  A point at 80% radius means this stat beats 80% of all Pokémon.
  Much more meaningful at a glance.

  ============================================================
  STATSBOMB-STYLE RING LABELS
  ============================================================

  Each concentric ring represents a percentile threshold (p10–p100).
  Rather than labeling rings with the percentile number, we label them
  with the ACTUAL STAT VALUE at that percentile for each specific axis.

  So on the HP axis, the p50 ring might say "65".
  On the Attack axis, that same p50 ring might say "75".

  This means you can read both "how good is this stat relatively"
  (position within the polygon) AND "what is the actual value at
  each reference point" (the ring labels) simultaneously.

  ============================================================
  CIRCULAR RINGS
  ============================================================

  Rings are SVG <circle> elements rather than <polygon>.
  This gives a clean circular radar rather than a hexagon.
  The alternating fill is achieved by drawing filled circles
  from outermost inward, same painting-over approach as before.

  ============================================================
  RADIAL LABEL ROTATION
  ============================================================

  Every label is rotated so its baseline is perpendicular to its
  spoke — i.e. it reads "outward" from the center.

  The readability rule: text must always read left-to-right as
  your eye scans horizontally. This means the final rotation
  must stay within -90° to +90° of horizontal — never upside down.

  getReadableRotation() enforces this: if the raw rotation would
  land in the 90°–270° "upside-down zone", it adds 180° to flip
  the text back into the readable range. This is the standard
  technique used by D3, Flourish, and StatsBomb for radial labels.
  It works for any number of axes at any angle — no hardcoding.
*/

import {getStatPercentile} from '@/lib/api';
import {PokemonStat, STAT_NAMES} from '@/types/pokemon';
import pokemonStatsData from '@/lib/data/pokemon-stats.json';

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
  Stat order around the radar, clockwise from top.
  Opposite stats are placed across from each other:
  HP (top) ↔ Speed (bottom)
  Attack (upper-right) ↔ Sp. Def (lower-left)
  Defense (lower-right) ↔ Sp. Atk (upper-left)
*/
const RADAR_STAT_ORDER = ['hp', 'attack', 'defense', 'speed', 'special-defense', 'special-attack'];

// 10 percentile rings: p10 through p100
const PERCENTILE_RINGS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/*
  getReadableRotation: converts a spoke angle (radians) into a
  text rotation (degrees) that always reads left-to-right.

  Step 1: offset +90° so the text baseline faces outward along
  the spoke rather than tangentially.
  Step 2: normalize into 0–360° range.
  Step 3: if the result falls in the 90°–270° upside-down zone,
  add 180° to flip it back into the readable -90° to +90° range.
  Step 4: normalize again after the potential flip.
*/
const getReadableRotation = (angleRad: number): number => {
  let deg = (angleRad * 180) / Math.PI + 90;
  deg = ((deg % 360) + 360) % 360;
  if (deg > 90 && deg < 270) deg += 180;
  return ((deg % 360) + 360) % 360;
};

interface StatRadarProps {
  stats: PokemonStat[];
  primaryType: string;
}

const StatRadar = ({stats, primaryType}: StatRadarProps) => {
  const size = 550;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 230;
  const color = TYPE_COLORS[primaryType] ?? '#9A9A6A';
  const numAxes = RADAR_STAT_ORDER.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Build stat lookup map: { hp: 45, attack: 49, ... }
  const statMap = Object.fromEntries(stats.map((s) => [s.stat.name, s.base_stat]));

  /*
    For each axis, compute:
    - The outer tip point (at radius, for drawing grid)
    - The stat's percentile (0–100)
    - The actual polygon point (at percentile% of radius)
    - The readable rotation angle for labels on this axis
  */
  const axes = RADAR_STAT_ORDER.map((statKey, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const value = statMap[statKey] ?? 0;
    const percentile = getStatPercentile(statKey, value);
    const r = radius * (percentile / 100);

    return {
      statKey,
      angle,
      value,
      percentile,
      // Polygon point — where this stat sits on its axis
      px: cx + r * Math.cos(angle),
      py: cy + r * Math.sin(angle),
      // Outer tip — used for grid lines and label positioning
      tipX: cx + radius * Math.cos(angle),
      tipY: cy + radius * Math.sin(angle),
      label: STAT_NAMES[statKey] ?? statKey,
      // Pre-computed readable rotation for all labels on this axis
      rotateDeg: getReadableRotation(angle),
    };
  });

  // SVG polygon points string for the stat shape
  const polygonPoints = axes.map((a) => `${a.px.toFixed(2)},${a.py.toFixed(2)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full" aria-label="Percentile stat radar chart">
      {/* ── PERCENTILE RINGS + ALTERNATING SHADING + LABELS ── */}
      {/*
        We draw rings from outermost inward so that inner rings
        paint over outer ones, giving us the alternating light/dark
        slices between rings. Even-indexed rings (p100, p80, p60...)
        get a light grey fill; odd-indexed get white.
        Drawing order: p100 first (largest), p10 last (smallest).

        Rings are <circle> elements now — radius scales linearly
        with the percentile fraction of the outer radius.
      */}
      {[...PERCENTILE_RINGS].reverse().map((p, reversedIndex) => {
        const ringRadius = radius * (p / 100);
        /*
          reversedIndex 0 = p100 (outermost)
          reversedIndex 1 = p90
          reversedIndex 2 = p80
          ...
          Even reversedIndex = outermost of a pair → light grey fill
          Odd reversedIndex = inner of a pair → white fill
          This creates alternating bands between the rings.
        */
        const fillColor = reversedIndex % 2 === 0 ? '#f3f4f6' : '#ffffff';
        // Only label every other ring (p20, p40, p60, p80, p100)
        // to avoid crowding. The in-between rings are still drawn
        // for visual reference but unlabeled.
        const showLabels = p % 20 === 0;

        return (
          <g key={p}>
            <circle
              cx={cx}
              cy={cy}
              r={ringRadius}
              fill={fillColor}
              stroke="#e5e7eb"
              strokeWidth="0.8"
              strokeOpacity="0.6"
            />

            {/*
              Ring value labels — one per axis at this ring's radius.
              Each label uses the same rotateDeg as the axis label so
              all text on a given spoke reads in the same direction.

              This is the StatsBomb pattern: labels are calibrated
              independently per axis so the p50 ring on the HP axis
              shows the HP value at the 50th percentile, which differs
              from the p50 value on the Attack axis.
            */}
            {showLabels &&
              axes.map((axis) => {
                const bps =
                  pokemonStatsData.percentileBreakpoints[
                    axis.statKey as keyof typeof pokemonStatsData.percentileBreakpoints
                  ];
                if (!bps) return null;
                const statValueAtRing = bps[`p${p}` as keyof typeof bps];

                // Point along this spoke at this ring's radius
                const lx = cx + ringRadius * Math.cos(axis.angle);
                const ly = cy + ringRadius * Math.sin(axis.angle);

                return (
                  <text
                    key={axis.statKey}
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#9ca3af"
                    fontWeight="400"
                    transform={`rotate(${axis.rotateDeg.toFixed(1)}, ${lx.toFixed(1)}, ${ly.toFixed(1)})`}
                  >
                    {statValueAtRing}
                  </text>
                );
              })}
          </g>
        );
      })}

      {/* ── STAT POLYGON ── */}
      <polygon points={polygonPoints} fill={color} fillOpacity="0.40" stroke="none" />

      {/* ── AXIS LABELS ── */}
      {/*
        Stat name labels just beyond the outer ring.
        Each label uses rotateDeg pre-computed in the axes array
        so all labels consistently read left-to-right.

        labelRadius: far enough beyond the outer ring that labels
        don't overlap the outermost ring value labels.

        textAnchor="middle" + dominantBaseline="middle": centers
        the text on its (x, y) point before rotation is applied.
        In RN: textAlign="center" on a Text component.
        In SVG: these two attributes together achieve the same thing.
      */}
      {axes.map((axis, i) => {
        const labelRadius = radius + 36;
        const lx = cx + labelRadius * Math.cos(axis.angle);
        const ly = cy + labelRadius * Math.sin(axis.angle);

        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fontWeight="800"
            fill="#111827"
            transform={`rotate(${axis.rotateDeg.toFixed(1)}, ${lx.toFixed(1)}, ${ly.toFixed(1)})`}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
};

export default StatRadar;
