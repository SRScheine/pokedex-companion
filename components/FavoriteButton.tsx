"use client";

/*
  components/FavoriteButton.tsx

  ============================================================
  WHAT THIS COMPONENT DOES
  ============================================================

  A star button that toggles a Pokémon's favorited state.
  Renders ★ (filled) when favorited, ☆ (outline) when not.

  This is the first component in the app that reads from AND
  writes to the Redux store. Everything up to this point was
  infrastructure. This is where the payoff happens.

  ============================================================
  PROPS DESIGN — Omit<FavoritePokemon, 'addedAt'>
  ============================================================

  The button accepts everything needed to build a FavoritePokemon,
  EXCEPT addedAt. Why?

  addedAt: Date.now() is a SIDE EFFECT — it returns a different
  value every time it's called. Reducers must be pure functions
  (same input → same output always), so we can't put Date.now()
  there. And we don't want the parent component to have to think
  about it either.

  Solution: this component stamps addedAt right before dispatching.
  It's the last point before the action enters the store — the
  right place for a one-time, component-level side effect.

  ============================================================
  e.preventDefault() + e.stopPropagation()
  ============================================================

  FavoriteButton is rendered INSIDE a <Link> component on PokemonCard.
  Without these two calls:
    - e.preventDefault(): the click would navigate to the Pokémon's
      detail page (the Link's href). We want the button to work
      without navigation.
    - e.stopPropagation(): the click event would bubble up to the
      parent <Link>, triggering navigation AFTER our handler runs.
      stopPropagation() stops the event from reaching the parent.

  In React Native, you handle this with:
    <Pressable onPress={(e) => e.stopPropagation()}>  ← rarely needed
  On the web, event bubbling is the default and is something you
  actively manage, especially inside interactive containers like <Link>.

  ============================================================
  useAppSelector vs useSelector
  ============================================================

  We import from store/hooks — never from react-redux directly.
  store/hooks exports pre-typed versions (RootState baked in)
  so we get full TypeScript inference without importing RootState
  here. This keeps components decoupled from the store's shape.

  In RN: if you used connect() or useSelector directly, you'd
  import the types in every component. The typed hook wrapper
  pattern is the RTK-recommended solution for both web and native.
*/

import {useState} from 'react';
import {useAppSelector, useAppDispatch} from '@/store/hooks';
import {selectIsFavorite, addFavorite, removeFavorite} from '@/store/favoritesSlice';
import type {FavoritePokemon} from '@/types/pokemon';
import StarIcon from '@/components/StarIcon';

interface FavoriteButtonProps {
  /*
    Everything to build a FavoritePokemon, except addedAt.
    This component stamps addedAt: Date.now() right before dispatch.
  */
  pokemon: Omit<FavoritePokemon, "addedAt">;
  /*
    className: optional Tailwind classes from the parent.
    Lets callers control positioning (e.g., "absolute top-2 right-2 z-20").
    The button's own visual styles are defined here; layout is the parent's job.
  */
  className?: string;
}

const FavoriteButton = ({ pokemon, className = "" }: FavoriteButtonProps) => {
  /*
    selectIsFavorite is a selector FACTORY — a function that returns
    a selector function. We call it with the Pokémon's id to create
    a selector that reads state.favorites.pokemon.some(p => p.id === id).

    useAppSelector runs that selector and subscribes this component
    to changes. If isFavorite changes (another dispatch adds/removes
    this Pokémon), this component re-renders automatically.

    In RN with Redux: identical — useSelector(selectIsFavorite(id))
    The selector factory pattern is framework-agnostic.
  */
  const isFavorite = useAppSelector(selectIsFavorite(pokemon.id));

  /*
    useAppDispatch returns the store's dispatch function.
    We call it to send actions to the store.

    In RN: const dispatch = useDispatch() — same thing, less typed.
  */
  const dispatch = useAppDispatch();

  /*
    isAnimating: drives the star-pop animation.
    We only animate when ADDING a favorite (not removing) — the pop
    feels celebratory, which matches adding but not removing.
    It resets via onAnimationEnd so it can fire again next time.
  */
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    /*
      Prevent navigation when this button is inside a <Link>.
      Without this, clicking the star on a PokemonCard would
      both toggle the favorite AND navigate to the detail page.
    */
    e.preventDefault();
    e.stopPropagation();

    if (isFavorite) {
      /*
        removeFavorite takes just the id — no need to pass the
        full Pokémon object when you only need to remove it.
        The reducer filters by id: state.pokemon.filter(p => p.id !== id)
      */
      dispatch(removeFavorite(pokemon.id));
    } else {
      /*
        addFavorite takes the full FavoritePokemon object.
        We stamp addedAt here — right before the action is dispatched.
        Date.now() is a side effect; this component is the right place for it.
        The reducer stays pure: same action always produces same state.
      */
      dispatch(addFavorite({...pokemon, addedAt: Date.now()}));
      setIsAnimating(true);
    }
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={isFavorite ? `Remove ${pokemon.name} from favorites` : `Add ${pokemon.name} to favorites`}
      /*
        bg-white/80 shadow-sm: semi-transparent white backdrop bubble.
        Creates contrast against any background — white cards, colored
        type hero sections, and the dark modal gradient all look good.

        transition-transform hover:scale-110: subtle grow on hover so
        the button feels responsive before the click.
      */
      className={`
        flex cursor-pointer items-center justify-center
        rounded-full p-1.5
        bg-white/80 shadow-sm
        transition-transform duration-150 hover:scale-110
        ${isFavorite ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}
        ${className}
      `}
    >
      {/*
        StarIcon: the shared SVG star from components/StarIcon.tsx.
        animate-star-pop fires once when isAnimating is true, then
        onAnimationEnd resets the flag so it can fire again next time.
      */}
      <StarIcon
        filled={isFavorite}
        size={18}
        className={isAnimating ? 'animate-star-pop' : ''}
        onAnimationEnd={() => setIsAnimating(false)}
      />
    </button>
  );
};

export default FavoriteButton;
