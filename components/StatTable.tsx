/*
  components/StatTable.tsx

  A grid showing each stat's raw value and percentile rank.
  Sits to the right of StatRadar on the detail page.

  SERVER COMPONENT — no interactivity needed.
*/

import {getStatPercentile} from '@/lib/api';
import {PokemonStat, STAT_NAMES} from '@/types/pokemon';

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

/*
  getTierColor: returns a hex color based on percentile rank.
  Tiers reward genuinely elite stats (S/A) while clearly
  flagging weaknesses (D) in red.
*/
const getTierColor = (percentile: number): string => {
  if (percentile >= 90) return '#F59E0B'; // S — gold
  if (percentile >= 75) return '#16A34A'; // A — bold green
  if (percentile >= 50) return '#4ADE80'; // B — faint green
  if (percentile >= 25) return '#9CA3AF'; // C — gray
  return '#EF4444'; // D — red
};

interface StatTableProps {
  stats: PokemonStat[];
  primaryType: string;
}

const StatTable = ({stats, primaryType}: StatTableProps) => {
  const statMap = Object.fromEntries(stats.map((s) => [s.stat.name, s.base_stat]));

  const rows = STAT_ORDER.map((key) => {
    const value = statMap[key] ?? 0;
    const percentile = getStatPercentile(key, value);
    return {key, label: STAT_NAMES[key] ?? key, value, percentile};
  });

  return (
    <div className="w-full">
      {/*
        CSS grid with 3 explicit columns.
        grid-cols-[auto_auto_auto] lets each column size to its content
        rather than splitting width equally — stat names vary in length.
        gap-x-6: generous horizontal spacing between columns.
        gap-y-2: tighter vertical spacing between rows.
      */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-2">
        {/* Column headers */}
        <span className="text-pokemon-gray border-pokemon-lightgray border-b pb-2 text-xs font-semibold tracking-wide uppercase">
          Stat
        </span>
        <span className="text-pokemon-gray border-pokemon-lightgray border-b pb-2 text-right text-xs font-semibold tracking-wide uppercase">
          Value
        </span>
        <span className="text-pokemon-gray border-pokemon-lightgray border-b pb-2 text-right text-xs font-semibold tracking-wide uppercase">
          Percentile
        </span>

        {/* Data rows */}
        {rows.map(({key, label, value, percentile}) => (
          <div key={key} className="contents">
            <span key={`${key}-label`} className="text-pokemon-black text-sm font-bold">
              {label}
            </span>
            <span key={`${key}-value`} className="text-pokemon-black text-right text-sm tabular-nums">
              {value}
            </span>
            <span
              key={`${key}-percentile`}
              className="text-right text-sm font-semibold tabular-nums"
              style={{color: getTierColor(percentile)}}
            >
              {ordinal(percentile)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatTable;
