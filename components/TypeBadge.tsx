/*
  components/TypeBadge.tsx — Pokémon Type Badge
  
  A small pill-shaped badge showing a Pokémon type with its
  official color. Used throughout the app wherever types are shown.
  
  ============================================================
  SERVER COMPONENT — NO "use client" NEEDED
  ============================================================
  
  This component has:
  ✓ No useState
  ✓ No useEffect  
  ✓ No event handlers
  ✓ No browser APIs
  
  It's purely presentational — takes props, returns JSX.
  Therefore it can be a Server Component. No "use client" needed.
  
  This is an important performance consideration:
  - Server Components send only HTML to the browser
  - Client Components send HTML + JavaScript
  - For static/presentational components, always prefer Server Components
  
  In React Native, this distinction doesn't exist — all components
  run on the device and include their JavaScript.
  
  ============================================================
  REUSABLE COMPONENT PATTERN
  ============================================================
  
  This is identical to how you'd build reusable components in RN:
  - Define a Props interface
  - Accept className for style overrides (like RN's style prop)
  - Export as default
  
  The main difference: className string vs StyleSheet object.
*/

import { PokemonTypeName } from "@/types/pokemon";

// ============================================================
// TYPE → COLOR MAPPING
//
// Maps each Pokémon type to its official background color.
// These match the CSS variables we defined in globals.css @theme,
// but expressed as Tailwind classes for use in className props.
//
// We use a Record<PokemonTypeName, string> type here:
// - Record<K, V> is a TypeScript utility type for key-value objects
// - It ensures every type in PokemonTypeName has a color entry
// - TypeScript will error if we forget a type or add a typo
// ============================================================
const TYPE_COLORS: Record<PokemonTypeName, string> = {
  normal:   "bg-type-normal",
  fire:     "bg-type-fire",
  water:    "bg-type-water",
  electric: "bg-type-electric",
  grass:    "bg-type-grass",
  ice:      "bg-type-ice",
  fighting: "bg-type-fighting",
  poison:   "bg-type-poison",
  ground:   "bg-type-ground",
  flying:   "bg-type-flying",
  psychic:  "bg-type-psychic",
  bug:      "bg-type-bug",
  rock:     "bg-type-rock",
  ghost:    "bg-type-ghost",
  dragon:   "bg-type-dragon",
  dark:     "bg-type-dark",
  steel:    "bg-type-steel",
  fairy:    "bg-type-fairy",
};

// Text colors — most types use white text, but light-background
// types need dark text for contrast (accessibility).
const TYPE_TEXT_COLORS: Partial<Record<PokemonTypeName, string>> = {
  electric: "text-pokemon-black",  // Yellow background → dark text
  ground:   "text-pokemon-black",  // Light tan → dark text
  ice:      "text-pokemon-black",  // Light blue → dark text
  normal:   "text-pokemon-black",  // Gray → dark text
};

// ============================================================
// PROPS INTERFACE
// ============================================================
interface TypeBadgeProps {
  typeName: string;           // The type name from PokéAPI ("fire", "water", etc.)
  size?: "sm" | "md" | "lg"; // Controls badge size
  className?: string;         // Allow parent to add extra classes
                              // In RN: style prop for style overrides
}

// Size variants — maps size prop to Tailwind classes
const SIZE_CLASSES = {
  sm: "text-2xs px-2 py-0.5",   // 10px text, tight padding
  md: "text-xs px-3 py-1",      // 12px text, standard padding
  lg: "text-sm px-4 py-1.5",    // 14px text, generous padding
};

// ============================================================
// COMPONENT
// ============================================================
export default function TypeBadge({
  typeName,
  size = "md",
  className = "",
}: TypeBadgeProps) {
  /*
    Type safety: cast to PokemonTypeName for the color lookup.
    If the API sends an unknown type, we fall back to a gray color.
    
    `as PokemonTypeName` is a type assertion — we're telling TypeScript
    "trust me, this string is a valid type name." We add the fallback
    just in case the API surprises us.
  */
  const typeKey = typeName as PokemonTypeName;
  const bgColor = TYPE_COLORS[typeKey] ?? "bg-pokemon-gray";
  const textColor = TYPE_TEXT_COLORS[typeKey] ?? "text-white";
  const sizeClass = SIZE_CLASSES[size];

  return (
    /*
      Template literal for className:
      
      In RN:  style={[styles.badge, styles[typeName]]}
      On web: className={`base-classes ${dynamicClass}`}
      
      Backtick template literals work the same in both environments —
      this is just JavaScript. The difference is we're building
      a CSS class string instead of a style object array.
      
      `badge` class comes from our @layer components in globals.css:
        display: inline-flex
        border-radius: 9999px (pill shape)
        font-weight: 700
        text-transform: uppercase
        letter-spacing: 0.05em
        color: white (overridden by textColor below)
    */
    <span
      className={`badge ${bgColor} ${textColor} ${sizeClass} ${className}`}
    >
      {typeName}
    </span>
  );
}