/*
  store/hooks.ts

  ============================================================
  WHY TYPED HOOKS?
  ============================================================

  React-Redux ships two generic hooks:
    useSelector<TState, TSelected>(selector)
    useDispatch()

  You COULD use these directly in every component:
    const count = useSelector((state: RootState) => state.favorites.pokemon.length)
    const dispatch = useDispatch<AppDispatch>()

  But you'd have to import and repeat the type annotations
  (RootState, AppDispatch) in every single component that touches
  the store. That's noise, and it means the component cares about
  the store's internal types rather than just using it.

  The idiomatic RTK solution: wrap them once here with the types
  pre-baked, then import THESE hooks everywhere instead.

  ============================================================
  REACT NATIVE COMPARISON
  ============================================================

  In React Native with Redux, the pattern is identical — this exact
  file would exist unchanged. The web-vs-native split doesn't affect
  Redux at all. This is one of Redux's strengths: the same mental
  model and code patterns work in both environments.

  ============================================================
  WHAT EACH TYPE DOES
  ============================================================

  useAppSelector
  --------------
  The full signature of the typed version is:
    <TSelected>(
      selector: (state: RootState) => TSelected,
      equalityFn?: (a: TSelected, b: TSelected) => boolean
    ) => TSelected

  TypeScript infers TSelected from your selector's return type —
  you never write it explicitly. For example:
    useAppSelector(selectFavoritesCount)   → inferred as number
    useAppSelector(selectFavorites)        → inferred as FavoritePokemon[]
    useAppSelector(selectIsFavorite(25))   → inferred as boolean

  Internally, useSelector re-runs the selector after every dispatch.
  It skips re-renders if the return value is === the previous value.
  For primitives (number, boolean, string), this is free. For objects
  and arrays, this is where createSelector's memoization matters.

  useAppDispatch
  --------------
  Returns the store's dispatch function, typed as AppDispatch.
  AppDispatch knows about all thunks and action creators from your
  slices, so TypeScript can catch typos and wrong payload types
  at compile time.

  Usage:
    const dispatch = useAppDispatch()
    dispatch(addFavorite({ id: 25, name: "pikachu", ... }))  ✓
    dispatch(addFavorite(25))  ✗  TypeScript error: number is not FavoritePokemon
*/

import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

/*
  useAppSelector — pre-typed useSelector
  Usage: const favorites = useAppSelector(selectFavorites)

  TypedUseSelectorHook<RootState> locks in the state type so you
  never need to annotate it at the call site. TypeScript infers
  the return type from your selector automatically:
    useAppSelector(selectFavoritesCount)   → number
    useAppSelector(selectFavorites)        → FavoritePokemon[]
    useAppSelector(selectIsFavorite(25))   → boolean

  Internally, useSelector re-runs the selector after every dispatch
  and skips re-renders when the return value hasn't changed (===).
  For primitives this is free. For objects/arrays, this is where
  createSelector's memoization becomes important.
*/
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/*
  useAppDispatch — pre-typed useDispatch
  Usage: const dispatch = useAppDispatch()

  Returns AppDispatch instead of plain Dispatch. AppDispatch carries
  full knowledge of your action creators' payload types, so TypeScript
  can catch wrong payloads at the call site:
    dispatch(addFavorite({ id: 25, name: "pikachu", ... }))  ✓
    dispatch(addFavorite(25))  ✗ TypeScript error: number ≠ FavoritePokemon

  NOTE: This is a function — you call it inside your component
  to get the dispatch instance. Hooks must be called inside
  components, not at module scope.
*/
export const useAppDispatch: () => AppDispatch = useDispatch;
