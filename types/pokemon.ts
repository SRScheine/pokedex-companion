/*
  types/pokemon.ts — TypeScript interfaces for PokéAPI
  
  ============================================================
  WHY A DEDICATED TYPES FILE?
  ============================================================
  
  PokéAPI returns complex, deeply nested JSON. Without types,
  you'd be writing `any` everywhere and losing all the benefits
  of TypeScript — autocomplete, catch errors at compile time, etc.
  
  By defining our interfaces here and importing them wherever
  needed, we get:
    - Autocomplete on API responses in every component
    - TypeScript errors if we try to access a field that doesn't exist
    - A single source of truth for data shapes
    - Self-documenting code (the types tell you what the API returns)
  
  This pattern is identical in React Native and web — no differences.
  
  ============================================================
  HOW TO READ THESE TYPES
  ============================================================
  
  PokéAPI uses a consistent pattern throughout:
  
  { name: string; url: string }
  
  This "NamedAPIResource" shape appears constantly — it's a
  reference to another resource you can fetch if you need more
  detail. For example, a Pokémon's abilities come back as:
  
  { ability: { name: "static", url: "https://pokeapi.co/api/v2/ability/9/" } }
  
  You get the name for display, and the URL if you want to
  fetch full ability details.
*/

/* ============================================================
   SHARED / PRIMITIVE TYPES
   These appear throughout the PokéAPI response shapes.
   ============================================================ */

/**
 * The most common shape in PokéAPI — a reference to another resource.
 * You get a display name and a URL to fetch full details if needed.
 */
export interface NamedAPIResource {
  name: string;
  url: string;
}

/**
 * PokéAPI returns stat/value pairs in several places.
 * base_stat: the actual number (e.g. 45 for HP)
 * effort: EV (Effort Value) yield — how many EVs this Pokémon gives when defeated
 * stat: reference to the stat definition (name: "hp", "attack", etc.)
 */
export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: NamedAPIResource;
}

/**
 * A Pokémon's type slot.
 * slot: 1 = primary type, 2 = secondary type
 * type: reference to the type (name: "fire", "flying", etc.)
 */
export interface PokemonType {
  slot: number;
  type: NamedAPIResource;
}

/**
 * An ability slot on a Pokémon.
 * ability: reference to the ability
 * is_hidden: hidden abilities are harder to obtain (Dream World, etc.)
 * slot: ability slot number (1, 2, or 3 for hidden)
 */
export interface PokemonAbility {
  ability: NamedAPIResource;
  is_hidden: boolean;
  slot: number;
}

/**
 * A move that a Pokémon can learn, plus how it learns it.
 * move: reference to the move
 * version_group_details: HOW and WHEN the Pokémon learns this move,
 *   per game version. A move might be learned at level 10 in one game
 *   and by TM in another.
 */
export interface PokemonMove {
  move: NamedAPIResource;
  version_group_details: MoveVersionGroupDetail[];
}

/**
 * Details about how a move is learned in a specific game version.
 * level_learned_at: 0 means not learned by level up
 * move_learn_method: "level-up", "machine" (TM/HM), "egg", "tutor"
 * version_group: which games this applies to (e.g. "lets-go-pikachu-lets-go-eevee")
 */
export interface MoveVersionGroupDetail {
  level_learned_at: number;
  move_learn_method: NamedAPIResource;
  version_group: NamedAPIResource;
}

/**
 * Sprite URLs for a Pokémon.
 * Most are nullable — not every Pokémon has every sprite variant.
 * We'll primarily use front_default (the standard front-facing sprite).
 *
 * other.official-artwork.front_default is the high-res artwork —
 * much nicer for detail pages.
 */
export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  back_default: string | null;
  back_shiny: string | null;
  other: {
    "official-artwork": {
      front_default: string | null;
      front_shiny: string | null;
    };
    dream_world: {
      front_default: string | null;
    };
    home: {
      front_default: string | null;
    };
  };
}

/* ============================================================
   CORE POKEMON TYPE
   The main shape returned by GET /pokemon/{id or name}
   ============================================================ */

/**
 * Full Pokémon detail — returned by https://pokeapi.co/api/v2/pokemon/{id}
 *
 * This is what you get when you fetch a specific Pokémon.
 * We don't type every single field PokéAPI returns (there are many),
 * just the ones we'll actually use in our app.
 *
 * TypeScript tip: you don't need to type every field, only the ones
 * you access. Extra fields from the API are silently ignored.
 */
export interface Pokemon {
  id: number;               // National Pokédex number (1 = Bulbasaur, 25 = Pikachu)
  name: string;             // Lowercase name ("pikachu", "bulbasaur")
  base_experience: number;  // XP gained when defeating this Pokémon
  height: number;           // In decimetres (divide by 10 for metres)
  weight: number;           // In hectograms (divide by 10 for kg)
  is_default: boolean;      // False for alternate forms (mega, galar, etc.)
  order: number;            // Sort order within the National Dex
  abilities: PokemonAbility[];
  moves: PokemonMove[];
  sprites: PokemonSprites;
  stats: PokemonStat[];
  types: PokemonType[];
  species: NamedAPIResource; // Reference to species data (for evolution chain, flavor text)
}

/* ============================================================
   POKEMON LIST TYPE
   Returned by the paginated list endpoint: GET /pokemon?limit=20&offset=0
   ============================================================ */

/**
 * A single item in a paginated Pokémon list.
 * Just name and URL — you need to fetch each URL for full details.
 */
export interface PokemonListItem {
  name: string;
  url: string;
}

/**
 * The paginated list response from GET /pokemon
 * count: total number of Pokémon in the database
 * next: URL for the next page (null if on last page)
 * previous: URL for the previous page (null if on first page)
 * results: array of name+url references
 */
export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

/* ============================================================
   POKEMON SPECIES TYPE
   Returned by GET /pokemon-species/{id}
   Contains flavor text, evolution chain reference, etc.
   ============================================================ */

/**
 * Flavor text entry — the Pokédex description.
 * Each game has its own flavor text, in multiple languages.
 * We'll filter for English and for Let's Go Pikachu specifically.
 */
export interface FlavorTextEntry {
  flavor_text: string;         // The actual Pokédex description text
  language: NamedAPIResource;  // { name: "en", url: "..." }
  version: NamedAPIResource;   // { name: "lets-go-pikachu", url: "..." }
}

/**
 * Genus entry — the category name (e.g. "Mouse Pokémon" for Pikachu)
 * Shown in the Pokédex under the Pokémon's name.
 */
export interface GenusEntry {
  genus: string;
  language: NamedAPIResource;
}

/**
 * Pokémon species data — returned by GET /pokemon-species/{id}
 * Contains the "story" data about a Pokémon vs the "battle" data in Pokemon.
 */
export interface PokemonSpecies {
  id: number;
  name: string;
  base_happiness: number;     // How happy it starts at when caught
  capture_rate: number;       // 0-255, higher = easier to catch
  color: NamedAPIResource;    // General color category ("red", "blue", etc.)
  evolution_chain: {
    url: string;              // URL to fetch the evolution chain
  };
  flavor_text_entries: FlavorTextEntry[];
  genera: GenusEntry[];
  is_legendary: boolean;
  is_mythical: boolean;
  shape: NamedAPIResource;    // Body shape category
  growth_rate: NamedAPIResource;
}

/* ============================================================
   EVOLUTION CHAIN TYPES
   Returned by GET /evolution-chain/{id}
   The evolution chain is a recursive linked list structure.
   ============================================================ */

/**
 * Details about the conditions required to evolve.
 * Most fields are null unless that specific condition applies.
 */
export interface EvolutionDetail {
  trigger: NamedAPIResource;        // "level-up", "use-item", "trade", etc.
  item: NamedAPIResource | null;    // Item required (e.g. Thunder Stone)
  min_level: number | null;         // Minimum level required
  min_happiness: number | null;     // Minimum happiness required
  time_of_day: string;              // "day", "night", or "" for anytime
  held_item: NamedAPIResource | null;
  known_move: NamedAPIResource | null;
  location: NamedAPIResource | null;
}

/**
 * A single link in the evolution chain.
 * This is RECURSIVE — evolves_to is an array of ChainLinks,
 * each of which has its own evolves_to array.
 *
 * Example: Eevee → [Vaporeon, Jolteon, Flareon, ...]
 * Eevee's ChainLink.evolves_to has 8 items, one per Eeveelution.
 *
 * TypeScript handles recursive types natively — no special syntax needed.
 */
export interface ChainLink {
  species: NamedAPIResource;
  evolution_details: EvolutionDetail[];
  evolves_to: ChainLink[];  // Recursive!
  is_baby: boolean;
}

/**
 * The full evolution chain response.
 */
export interface EvolutionChain {
  id: number;
  chain: ChainLink;  // The root of the chain (always the base form)
}

/* ============================================================
   TYPE EFFECTIVENESS TYPES
   Returned by GET /type/{name}
   Used for the type chart page.
   ============================================================ */

/**
 * Damage relations for a type.
 * Each array contains types that this type deals/receives that damage multiplier to/from.
 *
 * Example for Fire type:
 *   double_damage_to: [grass, ice, bug, steel]  → Fire hits these for 2x
 *   half_damage_to: [fire, water, rock, dragon]  → Fire hits these for 0.5x
 *   no_damage_to: []                             → Fire hits these for 0x
 *   double_damage_from: [water, ground, rock]    → Fire takes 2x from these
 */
export interface TypeDamageRelations {
  double_damage_from: NamedAPIResource[];
  double_damage_to: NamedAPIResource[];
  half_damage_from: NamedAPIResource[];
  half_damage_to: NamedAPIResource[];
  no_damage_from: NamedAPIResource[];
  no_damage_to: NamedAPIResource[];
}

/**
 * Full type data — returned by GET /type/{name}
 */
export interface PokemonTypeData {
  id: number;
  name: string;
  damage_relations: TypeDamageRelations;
  pokemon: Array<{
    pokemon: NamedAPIResource;
    slot: number;
  }>;
}

/* ============================================================
   MOVE TYPES
   Returned by GET /move/{id or name}
   ============================================================ */

/**
 * Flavor text for a move (the description shown in-game)
 */
export interface MoveFlavorText {
  flavor_text: string;
  language: NamedAPIResource;
  version_group: NamedAPIResource;
}

/**
 * Full move data — returned by GET /move/{id}
 */
export interface Move {
  id: number;
  name: string;
  accuracy: number | null;   // null for moves that always hit
  pp: number;                // Power Points — how many times it can be used
  power: number | null;      // null for status moves
  priority: number;          // -7 to +7, higher = goes first
  damage_class: NamedAPIResource;  // "physical", "special", "status"
  type: NamedAPIResource;
  effect_chance: number | null;    // % chance of secondary effect
  flavor_text_entries: MoveFlavorText[];
  target: NamedAPIResource;        // Who the move targets
}

/* ============================================================
   APP-SPECIFIC TYPES
   Not from PokéAPI — these are our own app state types.
   ============================================================ */

/**
 * A Pokémon on the user's team.
 * We store minimal data in localStorage and fetch details as needed.
 */
export interface TeamMember {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];           // Array of type names ["fire", "flying"]
  addedAt: number;           // timestamp — Date.now()
  nickname?: string;         // Optional nickname the user can set
}

/**
 * Stat name display mapping.
 * PokéAPI uses abbreviations; we want readable names.
 */
export const STAT_NAMES: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

/**
 * The 18 Pokémon types as a const array.
 * Useful for iteration (type chart, filter dropdowns, etc.)
 * `as const` makes this a readonly tuple with literal types
 * instead of just string[].
 */
export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

/**
 * A union type of all valid type name strings.
 * Derived from POKEMON_TYPES so they stay in sync automatically.
 *
 * TypeScript trick: `typeof POKEMON_TYPES[number]` extracts the
 * type of array elements, giving us:
 * "normal" | "fire" | "water" | "electric" | ... | "fairy"
 *
 * Now TypeScript will error if you pass "fyre" instead of "fire".
 */
export type PokemonTypeName = typeof POKEMON_TYPES[number];

/**
 * Let's Go Pikachu version group identifier used in PokéAPI.
 * We'll filter moves and flavor text to this version.
 */
export const LETS_GO_VERSION_GROUP = "lets-go-pikachu-lets-go-eevee";
export const LETS_GO_VERSION = "lets-go-pikachu";

/**
 * The 151 original Pokémon are in Let's Go Pikachu.
 * We'll use this to limit our Pokédex to the relevant range.
 * (Plus Meltan #808 and Melmetal #809, but we'll keep it simple)
 */
export const LETS_GO_MAX_POKEMON = 151;