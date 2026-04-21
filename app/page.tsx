/*
  app/page.tsx — Home Page
  Route: yoursite.com/
  
  ============================================================
  THIS IS A SERVER COMPONENT
  ============================================================
  
  No "use client" at the top = Server Component.
  
  This means:
  ✓ Can be async (await data directly)
  ✓ Data fetches happen on the server, before HTML is sent
  ✓ Zero loading spinners for the initial render
  ✗ Cannot use useState, useEffect, or browser APIs
  ✗ Cannot add onClick handlers (those go in child Client Components)
  
  ============================================================
  COMPARE TO REACT NATIVE
  ============================================================
  
  In React Native, your home screen probably looked like:
  
    export default function HomeScreen() {
      const [featured, setFeatured] = useState([]);
      const [loading, setLoading] = useState(true);
      
      useEffect(() => {
        fetchFeaturedPokemon().then(data => {
          setFeatured(data);
          setLoading(false);
        });
      }, []);
      
      if (loading) return <ActivityIndicator />;
      return <View>...</View>;
    }
  
  Here, the same thing is:
  
    export default async function HomePage() {
      const featured = await getFeaturedPokemon();
      return <main>...</main>;
    }
  
  No useState. No useEffect. No loading state needed.
  The server fetches the data, renders the HTML, sends it complete.
*/

// Note: no "use client" — this is intentionally a Server Component

/*
  app/page.tsx — Home Page
  Route: yoursite.com/

  SERVER COMPONENT — no "use client" needed.
  This function is async, fetches data on the server,
  and returns fully-rendered HTML to the browser.
  No useState, no useEffect, no loading spinner.
*/

import Link from 'next/link';
import Image from 'next/image';
import {Metadata} from 'next';
import {getSpriteUrl, getPokemonWithSpecies, getEnglishFlavorText, getPokemon} from '@/lib/api';
import {getPokemonOfTheDayIds} from '@/lib/pokemonOfTheDay';
import {PokemonTypeName} from '@/types/pokemon';
import TypeBadge from '@/components/TypeBadge';

export const metadata: Metadata = {
  title: 'Home | Pokémon Companion',
  description: 'Your Pokémon Companion — look up moves, plan your team, and master type matchups.',
};

const FEATURED_IDS = [1, 4, 7, 25, 133, 52];

const FEATURES = [
  {
    href: '/pokedex',
    emoji: '📖',
    title: 'Pokédex',
    description: 'Browse all 1025 Pokémon with full stats, moves, and evolution details.',
    color: 'bg-pokemon-red',
  },
  {
    href: '/type',
    emoji: '⚔️',
    title: 'Type Chart',
    description: 'Master matchups with a complete type effectiveness reference.',
    color: 'bg-pokemon-blue',
  },
  {
    href: '/team',
    emoji: '⭐',
    title: 'Team Builder',
    description: 'Create and save your dream team with type coverage analysis.',
    color: 'bg-pokemon-gold',
  },
  {
    href: '/favorites',
    emoji: '❤️',
    title: 'Favorites',
    description: 'Save your favorite Pokémon for quick access later.',
    color: 'bg-purple-500',
  },
  {
    href: '/spin',
    emoji: '🎡',
    title: 'Spin the Wheel',
    description: 'Discover a random Pokémon or relive classic team lineups.',
    color: 'bg-pink-500',
  },
];

const HomePage = async () => {
  /*
    Direct await in a Server Component.
    In React Native you needed useEffect + useState for this.
    Here: one line, runs on the server, user gets data immediately.
  */
  const pokemonOfTheDayIds = getPokemonOfTheDayIds();

  const [featuredPokemon, pokemonOfTheDay] = await Promise.all([
    Promise.all(FEATURED_IDS.map((id) => getPokemon(id))),
    Promise.all(pokemonOfTheDayIds.map((id) => getPokemonWithSpecies(id))),
  ]);

  return (
    <div className="animate-fade-in">
      {/* ── HERO ── */}
      {/*
        bg-gradient-to-br: CSS gradient, bottom-right direction.
        In RN you need expo-linear-gradient. On web it's pure CSS.
      */}
      <section className="from-pokemon-red to-pokemon-darkred bg-gradient-to-br text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          {/*
            flex-col on mobile, flex-row on desktop.
            In RN: you'd check Dimensions and set flexDirection conditionally.
            On web: one Tailwind class handles both.
          */}
          <div className="flex flex-col items-center gap-8 md:flex-row">
            {/* Left: text */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-pokemon-yellow mb-4 font-[family-name:var(--font-pixel)] text-2xl leading-relaxed md:text-3xl">
                PokéCompanion
              </h1>
              <p className="mb-2 text-lg text-white/90 md:text-xl">Your Pokémon companion for any adventure.</p>
              <p className="mb-8 text-base text-white/70">
                Look up Pokémon, plan your team, and master type matchups — all in one place!
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3 md:justify-start">
                {/*
                  <Link> = internal navigation (like navigation.navigate())
                  <a>    = external links (other websites)
                  Always use <Link> for routes within your own app.
                */}
                <Link
                  href="/pokedex"
                  className="bg-pokemon-yellow inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold !text-black transition-colors duration-200 hover:bg-yellow-300"
                >
                  Open Pokédex →
                </Link>
                <Link
                  href="/type"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-6 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/30"
                >
                  ⚔️ Type Chart
                </Link>
              </div>
            </div>

            {/* Right: sprite grid — desktop only */}
            {/*
              hidden md:block: invisible on mobile, visible on desktop.
              CSS Grid is web-only — RN only has Flexbox.
              grid-cols-3 = 3 equal columns.
            */}
            <div className="hidden flex-shrink-0 md:block">
              <div className="grid grid-cols-3 gap-2">
                {featuredPokemon.map(
                  (pokemon) =>
                    pokemon && (
                      <Link
                        key={pokemon.id}
                        href={`/pokedex/${pokemon.id}`}
                        className="rounded-xl bg-white/10 p-3 text-center transition-colors duration-200 hover:bg-white/20"
                      >
                        {/*
                      next/image <Image>:
                      In RN: <Image source={{ uri: url }} style={{ width, height }} />
                      On web: <Image src={url} width={n} height={n} alt="..." />
                      alt is REQUIRED on web for accessibility. width+height
                      prevent layout shift while the image loads.
                    */}
                        <Image
                          src={getSpriteUrl(pokemon.id)}
                          width={64}
                          height={64}
                          alt={pokemon.name}
                          unoptimized
                          className="mx-auto"
                        />
                        <p className="mt-1 text-xs text-white/80 capitalize">{pokemon.name}</p>
                      </Link>
                    )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUICK LINKS ── */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-pokemon-black mb-6 text-center font-[family-name:var(--font-pixel)] text-lg md:text-left">
          Where to?
        </h2>
        {/*
          grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3:
          Single column on mobile, two columns on tablet, three on desktop.
          The most common responsive card grid pattern on the web.
        */}
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            /*
              `group` enables child elements to react to the parent's
              hover state using group-hover: prefix classes.
              In RN you'd need to pass hover state down as a prop.
              On web, CSS handles it natively.
            */
            <Link
              key={feature.href}
              href={feature.href}
              className="group card hover:shadow-card-hover transition-all duration-200"
            >
              <div className="transform transition-transform duration-200 group-hover:-translate-y-1">
                <div
                  className={`h-12 w-12 ${feature.color} mb-4 flex items-center justify-center rounded-xl text-2xl transition-transform duration-200 group-hover:scale-110`}
                >
                  {feature.emoji}
                </div>
                <h3 className="text-pokemon-black mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-pokemon-gray text-sm leading-relaxed">{feature.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── POKÉMON OF THE DAY (3 CARDS) ── */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-pokemon-black mb-6 font-[family-name:var(--font-pixel)] text-lg">Featured Pokémon</h2>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pokemonOfTheDay.map(([pokemon, species]) => {
            if (!pokemon) return null;
            const primaryType = pokemon.types[0]?.type.name;
            const genus = species?.genera?.find(
              (g: {language: {name: string}; genus: string}) => g.language.name === 'en'
            )?.genus;

            return (
              <Link
                key={pokemon.id}
                href={`/pokedex/${pokemon.id}`}
                className="group card hover:shadow-card-hover flex h-88 flex-col items-center overflow-hidden px-4 pt-6 text-center transition-all duration-200 hover:-translate-y-1"
              >
                {/* Sprite with type-colored ring */}
                <div className="relative mb-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                  <div className={`absolute inset-0 bg-type-${primaryType} -m-4 rounded-full opacity-20`} />
                  <Image
                    src={getSpriteUrl(pokemon.id)}
                    width={100}
                    height={100}
                    alt={pokemon.name}
                    unoptimized
                    className="relative z-10"
                  />
                </div>

                {/* Info section */}
                <h3 className="text-pokemon-black mb-1 flex-shrink-0 font-[family-name:var(--font-pixel)] text-base capitalize">
                  {pokemon.name}
                </h3>
                {genus && <p className="text-pokemon-gray mb-3 flex-shrink-0 text-xs">{genus}</p>}

                {/* Badges + ID grouped below genus */}
                <div className="mt-1 flex w-full flex-shrink-0 flex-col items-center gap-1">
                  <div className="flex flex-wrap justify-center gap-1">
                    {pokemon.types.map((typeObj: {type: {name: string}}) => (
                      <TypeBadge key={typeObj.type.name} typeName={typeObj.type.name as PokemonTypeName} />
                    ))}
                  </div>
                  <p className="text-pokemon-gray text-xs">#{pokemon.id.toString().padStart(4, '0')}</p>
                </div>

                {/* Flavor text - centered vertically, taking remaining space */}
                {species?.flavor_text_entries && (
                  <div className="mt-2 flex flex-1 items-center justify-center overflow-hidden">
                    <p className="text-pokemon-gray line-clamp-5 text-xs leading-relaxed">
                      {getEnglishFlavorText(species.flavor_text_entries)}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
