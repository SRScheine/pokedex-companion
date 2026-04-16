/*
  components/PokemonCard.tsx

  A reusable card showing a Pokémon's sprite, name, ID, and types.
  Used in the Pokédex list and anywhere else we show a grid of Pokémon.

  SERVER COMPONENT — no interactivity needed, purely presentational.
*/

import Link from 'next/link';
import Image from 'next/image';
import {Pokemon} from '@/types/pokemon';
import type {FavoritePokemon} from '@/types/pokemon';
import {capitalize, formatPokemonId, getSpriteUrl} from '@/lib/api';
import TypeBadge from '@/components/TypeBadge';
import FavoriteButton from '@/components/FavoriteButton';

interface PokemonCardProps {
  pokemon: Pick<Pokemon, 'id' | 'name' | 'types'>;
}

const PokemonCard = ({pokemon}: PokemonCardProps) => {
  /*
    Type color for the card background:
    We tint the card with the Pokémon's primary type color at low opacity.
    This is a common Pokédex UI pattern — cards feel unique per Pokémon.
  */
  const primaryType = pokemon.types[0].type.name;

  /*
    Build the FavoritePokemon data shape here in the Server Component.
    This is a pure data transform — no hooks, no browser APIs — so it's
    completely safe to do on the server.

    We pass this down to FavoriteButton as a prop. FavoriteButton is a
    Client Component ("use client") that connects to Redux on the client.

    SERVER → CLIENT PROP PASSING RULE:
    Props crossing the server/client boundary must be serializable
    (strings, numbers, plain objects, arrays — no functions, no class
    instances, no Dates). Our favData is all primitives: safe to pass.

    In RN: this concern doesn't exist — everything runs on the device.
    It's a Next.js-specific pattern for optimizing what runs on the server.
  */
  const favData: Omit<FavoritePokemon, 'addedAt'> = {
    id: pokemon.id,
    name: pokemon.name,
    sprite: getSpriteUrl(pokemon.id, 'artwork'),
    types: pokemon.types,
  };

  return (
    /*
      <Link> wrapping the entire card makes the whole card clickable.
      In RN: <Pressable onPress={() => navigation.navigate('Detail', { id })}>
      On web: <Link href={path}> — renders as <a>, whole area is tappable.

      group: enables group-hover: child styles (hover effects on children
      when the parent is hovered). Web-only CSS feature.
    */
    <Link
      href={`/pokedex/${pokemon.id}`}
      className="group card hover:shadow-card-hover relative flex flex-col items-center overflow-hidden text-center transition-all duration-200 hover:-translate-y-1"
    >
      {/*
        Decorative type-colored circle behind the sprite.
        absolute inset-0: fills the card entirely.
        opacity-10: very faint — just a subtle tint.
        rounded-full + scale-75: large circle centered in the card.
        pointer-events-none: doesn't interfere with clicks.

        This is a pure CSS decorative element — no RN equivalent needed,
        just a fun web styling trick.
      */}
      <div
        className={`absolute inset-0 bg-type-${primaryType} translate-y-4 scale-75 rounded-full opacity-10`}
        aria-hidden="true"
      />

      {/*
        FavoriteButton: a Client Component rendered inside a Server Component.
        Next.js handles the boundary automatically — the button hydrates on the
        client and connects to Redux, while the card shell stays server-rendered.

        absolute top-2 right-2 z-20: pins the button to the top-right corner of
        the card. The card's <Link> already has `relative` so this positions
        against the card boundary, not the page.
        z-20: sits above the decorative circle (z-10) and image (z-10).
      */}
      <FavoriteButton pokemon={favData} className="absolute top-2 right-2 z-20" />

      {/* Pokédex number */}
      <p className="text-pokemon-gray z-10 mb-1 self-start text-xs font-medium">{formatPokemonId(pokemon.id)}</p>

      {/*
        Pokémon sprite image.

        group-hover:scale-110: grows the sprite when the card is hovered.
        transition-transform duration-300: smooth 300ms scale animation.
        Pure CSS — no Animated.timing(), no reanimated.

        z-10: stacks above the decorative circle (which has no z-index = z-0).
        CSS stacking context: higher z-index = in front.
        Same concept as RN's zIndex, same prop name in Tailwind.
      */}
      <Image
        src={getSpriteUrl(pokemon.id, 'artwork')}
        width={96}
        height={96}
        alt={pokemon.name}
        unoptimized
        className="z-10 transition-transform duration-300 group-hover:scale-110"
      />

      {/* Name */}
      <p className="text-pokemon-black z-10 mt-2 mb-1 font-semibold capitalize">{capitalize(pokemon.name)}</p>

      {/* Type badges */}
      <div className="z-10 flex flex-wrap justify-center gap-1">
        {pokemon.types.map(({type}) => (
          <TypeBadge key={type.name} typeName={type.name} size="sm" />
        ))}
      </div>
    </Link>
  );
};

export default PokemonCard;
