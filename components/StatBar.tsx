/*
  components/StatBar.tsx

  A horizontal bar showing a Pokémon's base stat value.
  Used on the detail page for HP, Attack, Defense, etc.

  SERVER COMPONENT — purely presentational, no interactivity.
*/

import { getStatColor } from "@/lib/api";
import { PokemonStat, STAT_NAMES } from "@/types/pokemon";

interface StatBarProps {
  stat: PokemonStat;
}

// Max possible base stat (Blissey's HP is 255 — the highest in Gen 1)
// We use this to calculate the bar's fill percentage.
const MAX_STAT = 255;

export default function StatBar({ stat }: StatBarProps) {
  const statName = STAT_NAMES[stat.stat.name] ?? stat.stat.name;
  const percentage = Math.round((stat.base_stat / MAX_STAT) * 100);
  const colorClass = getStatColor(stat.base_stat);

  return (
    <div className="flex items-center gap-3">
      {/*
        Stat name — fixed width so all bars line up.
        w-16: 64px wide, text-right aligns names to the right edge.
        This creates a clean column alignment across all stats.
        In RN: you'd set a fixed width on a Text component.
        Same concept, same approach.
      */}
      <span className="text-xs text-pokemon-gray w-16 text-right flex-shrink-0">
        {statName}
      </span>

      {/* Stat value */}
      <span className="text-xs font-bold text-pokemon-black w-7 flex-shrink-0">
        {stat.base_stat}
      </span>

      {/* Bar track */}
      {/*
        The bar is two divs: an outer track and an inner fill.
        flex-1: fills remaining horizontal space
        bg-pokemon-lightgray: the empty/background track
        overflow-hidden + rounded-full: clips the fill bar to rounded ends

        This is a common web pattern for progress/stat bars.
        In RN: you'd use a View with a nested View and calculate widths.
        Same approach — the CSS just handles the clipping more elegantly.
      */}
      <div className="flex-1 bg-pokemon-lightgray rounded-full h-2 overflow-hidden">
        {/*
          The fill bar.
          Width is set as an inline style because Tailwind can't generate
          dynamic percentage widths from runtime values.

          IMPORTANT TAILWIND RULE:
          Tailwind purges unused classes at build time. If you write
          `w-[${percentage}%]` dynamically, Tailwind won't include
          that class in the CSS bundle because it can't see the value
          at build time.

          The solution: use inline styles for truly dynamic values.
          style={{ width: `${percentage}%` }} always works because
          inline styles are applied at runtime, not build time.

          This is a common gotcha when moving from RN (where all
          styles are runtime objects) to Tailwind (which is build-time).

          transition-all duration-500: animates the bar growing in.
          Pure CSS — the browser handles the animation.
        */}
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
          /*
            role="progressbar" + aria attributes:
            Screen readers use these to announce the stat value.
            "HP: 45 out of 255"
            In RN: accessibilityRole="progressbar", accessibilityValue
            On web: role + aria-valuenow/min/max
            Same concept, slightly different attribute names.
          */
          role="progressbar"
          aria-valuenow={stat.base_stat}
          aria-valuemin={0}
          aria-valuemax={MAX_STAT}
          aria-label={`${statName}: ${stat.base_stat}`}
        />
      </div>
    </div>
  );
}