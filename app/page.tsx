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

import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { capitalize, formatPokemonId, getSpriteUrl } from "@/lib/api";
import { Pokemon } from "@/types/pokemon";
import TypeBadge from "@/components/TypeBadge";

export const metadata: Metadata = {
  title: "Home",
  description: "Your Pokémon Let's Go Pikachu companion.",
};

const FEATURED_IDS = [1, 4, 7, 25, 133, 52];

const QUICK_LINKS = [
  {
    href: "/pokedex",
    emoji: "📖",
    title: "Pokédex",
    description: "Look up any of the 151 original Pokémon. Stats, moves, evolutions and more.",
    color: "bg-pokemon-red",
  },
  {
    href: "/type-chart",
    emoji: "⚔️",
    title: "Type Chart",
    description: "Check type matchups mid-battle. Know your weaknesses before they do.",
    color: "bg-pokemon-blue",
  },
  {
    href: "/team",
    emoji: "⭐",
    title: "My Team",
    description: "Build and save your dream team. Plan your party before catching.",
    color: "bg-pokemon-gold",
  },
];

export default async function HomePage() {
  /*
    Direct await in a Server Component.
    In React Native you needed useEffect + useState for this.
    Here: one line, runs on the server, user gets data immediately.
  */
  const featuredPokemon = await Promise.all(
    FEATURED_IDS.map(async (id) => {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, {
        cache: "force-cache",
      });
      return res.json() as Promise<Pokemon>;
    })
  );

  return (
    <div className="animate-fade-in">

      {/* ── HERO ── */}
      {/*
        bg-gradient-to-br: CSS gradient, bottom-right direction.
        In RN you need expo-linear-gradient. On web it's pure CSS.
      */}
      <section className="bg-gradient-to-br from-pokemon-red to-pokemon-darkred text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
          {/*
            flex-col on mobile, flex-row on desktop.
            In RN: you'd check Dimensions and set flexDirection conditionally.
            On web: one Tailwind class handles both.
          */}
          <div className="flex flex-col md:flex-row items-center gap-8">

            {/* Left: text */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-[family-name:var(--font-pixel)] text-pokemon-yellow text-2xl md:text-3xl leading-relaxed mb-4">
                PokéCompanion
              </h1>
              <p className="text-white/90 text-lg md:text-xl mb-2">
                Your Let&apos;s Go Pikachu field guide.
              </p>
              <p className="text-white/70 text-base mb-8">
                Look up Pokémon, plan your team, and master type matchups —
                all while playing with your little trainer.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                {/*
                  <Link> = internal navigation (like navigation.navigate())
                  <a>    = external links (other websites)
                  Always use <Link> for routes within your own app.
                */}
                <Link
                  href="/pokedex"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-pokemon-yellow text-pokemon-black font-bold hover:bg-yellow-300 transition-colors duration-200 text-sm"
                >
                  Open Pokédex →
                </Link>
                <Link
                  href="/type-chart"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 text-white font-bold hover:bg-white/30 transition-colors duration-200 text-sm border border-white/30"
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
            <div className="hidden md:block flex-shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {featuredPokemon.map((pokemon) => (
                  <Link
                    key={pokemon.id}
                    href={`/pokedex/${pokemon.id}`}
                    className="bg-white/10 hover:bg-white/20 rounded-xl p-3 transition-colors duration-200 text-center"
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
                    <p className="text-white/80 text-xs mt-1 capitalize">
                      {pokemon.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── QUICK LINKS ── */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="font-[family-name:var(--font-pixel)] text-pokemon-black text-lg mb-6 text-center md:text-left">
          Where to?
        </h2>
        {/*
          grid grid-cols-1 md:grid-cols-3:
          Single column on mobile, three columns on desktop.
          The most common responsive card grid pattern on the web.
        */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_LINKS.map((link) => (
            /*
              `group` enables child elements to react to the parent's
              hover state using group-hover: prefix classes.
              In RN you'd need to pass hover state down as a prop.
              On web, CSS handles it natively.
            */
            <Link
              key={link.href}
              href={link.href}
              className="group card hover:shadow-card-hover transition-all duration-200"
            >
              <div className="transform group-hover:-translate-y-1 transition-transform duration-200">
                <div className={`w-12 h-12 ${link.color} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  {link.emoji}
                </div>
                <h3 className="text-pokemon-black font-semibold text-lg mb-2">
                  {link.title}
                </h3>
                <p className="text-pokemon-gray text-sm leading-relaxed">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HORIZONTAL SCROLL STRIP — mobile only ── */}
      {/*
        md:hidden: only visible on mobile screens.
        overflow-x-auto + flex = horizontal ScrollView equivalent.
        flex-shrink-0 on each item prevents squishing — without it
        items compress instead of creating a scrollable overflow.
        In RN: <ScrollView horizontal> handles all of this automatically.
      */}
      <section className="md:hidden py-6 bg-white border-t border-pokemon-lightgray">
        <div className="px-4 mb-4">
          <h2 className="font-[family-name:var(--font-pixel)] text-pokemon-black text-sm">
            Quick Look
          </h2>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 pb-2">
            {featuredPokemon.map((pokemon) => (
              <Link
                key={pokemon.id}
                href={`/pokedex/${pokemon.id}`}
                className="flex-shrink-0 bg-pokemon-lightgray rounded-xl p-3 text-center w-24 hover:bg-gray-200 transition-colors"
              >
                <Image
                  src={getSpriteUrl(pokemon.id)}
                  width={56}
                  height={56}
                  alt={pokemon.name}
                  unoptimized
                  className="mx-auto"
                />
                <p className="text-pokemon-black text-xs mt-1 capitalize font-medium">
                  {pokemon.name}
                </p>
                <p className="text-pokemon-gray text-xs">
                  {formatPokemonId(pokemon.id)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STARTER CARDS ── */}
      <section className="max-w-6xl mx-auto px-4 py-10 border-t border-pokemon-lightgray">
        <h2 className="font-[family-name:var(--font-pixel)] text-pokemon-black text-lg mb-6 text-center md:text-left">
          Starter Guide
        </h2>
        {/*
          Three breakpoints in one line:
          2 cols mobile → 3 cols tablet → 6 cols desktop.
          In RN this would require Dimensions checks or a library.
        */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {featuredPokemon.map((pokemon) => (
            <Link
              key={pokemon.id}
              href={`/pokedex/${pokemon.id}`}
              className="card text-center hover:shadow-card-hover transition-shadow duration-200"
            >
              <Image
                src={getSpriteUrl(pokemon.id, "artwork")}
                width={96}
                height={96}
                alt={pokemon.name}
                unoptimized
                className="mx-auto mb-2"
              />
              <p className="text-xs text-pokemon-gray mb-1">
                {formatPokemonId(pokemon.id)}
              </p>
              <p className="font-semibold capitalize text-pokemon-black mb-2">
                {capitalize(pokemon.name)}
              </p>
              <div className="flex flex-wrap justify-center gap-1">
                {pokemon.types.map(({ type }) => (
                  <TypeBadge key={type.name} typeName={type.name} size="sm" />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TIP BANNER ── */}
      <section className="bg-pokemon-blue text-white py-8 mt-4">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-white/70 text-sm uppercase tracking-widest mb-2 font-medium">
            Let&apos;s Go Tip
          </p>
          <p className="text-lg font-medium max-w-2xl mx-auto">
            💡 In Let&apos;s Go, you can lure Pokémon with Berries before throwing.
            A Razz Berry raises your catch rate — great for rare Pokémon!
          </p>
        </div>
      </section>

    </div>
  );
}