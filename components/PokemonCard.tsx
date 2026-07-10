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
      STRETCHED LINK PATTERN — fixes the nested interactive element problem.

      HTML does not allow a <button> inside an <a>. When we had FavoriteButton
      inside the <Link>, browsers silently moved the button outside the anchor
      in their internal representation, making it invisible to VoiceOver and
      unreachable by Tab.

      The fix: the card is now a plain <div>. Inside it we have TWO siblings:
        1. <Link>  — stretched to cover the entire card with absolute inset-0
        2. <FavoriteButton> — positioned above the link with a higher z-index

      Both are valid, independent interactive elements. Tab and VoiceOver can
      reach each one separately.

      The <div> takes over the card's visual styles (shadow, rounded corners,
      hover effects). The group class on the div still enables group-hover:
      on child elements like the sprite image.

      In RN: this issue doesn't exist because TouchableOpacity/Pressable are
      not anchor tags — you can freely nest them. On web, the <a> tag has
      strict content rules.

      group: enables group-hover: child styles (hover effects on children
      when the parent is hovered). Web-only CSS feature.
    */
    <div className="group card hover:shadow-card-hover relative flex flex-col items-center overflow-hidden text-center transition-all duration-200 hover:-translate-y-1">
      {/* Decorative type-colored circle behind the sprite */}
      <div
        className={`absolute inset-0 bg-type-${primaryType} translate-y-4 scale-75 rounded-full opacity-10`}
        aria-hidden="true"
      />

      {/*
        The link is stretched to fill the entire card via absolute inset-0.
        z-10 sits it above the decorative circle but below the FavoriteButton.
        Keyboard users Tab to this link; mouse users click anywhere on the card.

        aria-label gives VoiceOver a clean name ("View Bulbasaur") instead of
        computing it from all the nested text inside the card.
        WCAG 2.4.6 (Headings and Labels) — Level AA

              <Link> wrapping the entire card makes the whole card clickable.
      In RN: <Pressable onPress={() => navigation.navigate('Detail', { id })}>
      On web: <Link href={path}> — renders as <a>, whole area is tappable.

      WCAG 2.4.7 (Focus Visible) — Level AA
      The global :focus-visible rule in globals.css would give this a 4px
      border-radius outline, but the card is rounded-2xl (16px). We use
      focus-visible:ring-* instead — ring uses box-shadow which automatically
      follows the element's border-radius, so the ring hugs the card shape.
      focus-visible:outline-none suppresses the global outline so we don't
      get both a ring AND an outline at the same time.
      */}
      <Link
        href={`/pokedex/${pokemon.id}`}
        aria-label={`View ${capitalize(pokemon.name)}`}
        className="focus-visible:ring-pokemon-red absolute inset-0 z-10 rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      />

      {/*
        FavoriteButton is now a SIBLING of the Link, not a child.
        z-20 places it above the stretched link so it receives clicks/taps.
        e.stopPropagation() inside FavoriteButton is no longer needed for
        preventing link navigation (they're siblings now), but it's harmless.
      */}
      <FavoriteButton pokemon={favData} className="absolute top-2 right-2 z-20" />

      {/* Pokédex number */}
      <p className="text-pokemon-gray z-10 mb-1 self-start text-xs font-medium">{formatPokemonId(pokemon.id)}</p>

      {/* Sprite — group-hover:scale-110 still works because group is on the parent div */}
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
    </div>
  );
};

export default PokemonCard;
