/*
  store/index.ts

  ============================================================
  TWO JOBS IN THIS FILE
  ============================================================

  1. Assemble the Redux store with configureStore()
  2. Set up the localStorage sync middleware with createListenerMiddleware()

  ============================================================
  configureStore vs. the old createStore
  ============================================================

  In old Redux you wrote this boilerplate by hand:

    import { createStore, combineReducers, applyMiddleware, compose } from 'redux'
    import thunk from 'redux-thunk'
    import { composeWithDevTools } from 'redux-devtools-extension'

    const rootReducer = combineReducers({ favorites: favoritesReducer })
    const store = createStore(rootReducer, composeWithDevTools(applyMiddleware(thunk)))

  RTK's configureStore() does all of that automatically:
    - combineReducers: handled by the `reducer` object
    - redux-thunk: included by default
    - Immer: included by default (powers the slice reducers)
    - Redux DevTools Extension: wired up by default in development
    - Serializable state check: warns you if you put non-serializable
      values (like class instances or functions) in the store

  ============================================================
  makeStore FACTORY vs. a MODULE-LEVEL SINGLETON
  ============================================================

  You might expect to see:

    // Simple but wrong for Next.js:
    export const store = configureStore({ ... })

  We export a makeStore FUNCTION instead. Here's why:

  Next.js runs Server Components on the server. If the store were a
  module-level singleton, it would be shared across all server renders.
  In a multi-user app, User A's favorites could bleed into User B's
  response — a real security problem.

  The makeStore factory creates a FRESH store instance each time it's
  called. StoreProvider (components/StoreProvider.tsx) calls makeStore()
  once and holds the result in a useRef, so you still get a single store
  per browser session. Best of both worlds.

  In React Native, this concern doesn't exist — each app instance is
  isolated on a device. It's a server-specific problem.

  ============================================================
  localStorage SYNC WITH createListenerMiddleware
  ============================================================

  Middleware is code that runs between an action being dispatched and
  the reducer responding to it. It's the right place for side effects
  like logging, analytics, and — in our case — persistence.

  createListenerMiddleware is the modern RTK pattern for responding to
  actions asynchronously. It replaces older patterns like redux-saga and
  redux-observable for most common use cases.

  Our listener watches for any change to the favorites array and writes
  it to localStorage. Any component can dispatch addFavorite() or
  removeFavorite() and persistence happens automatically — nothing else
  needs to remember to call localStorage.setItem().

  Compare to the existing TeamBuilder component, which has to manually
  call localStorage.setItem() inside its own useEffect. With Redux
  middleware, that responsibility moves to one central place.
*/

import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import favoritesReducer from "./favoritesSlice";
import type { FavoritePokemon } from "@/types/pokemon";

const STORAGE_KEY = "pokedex-companion-favorites";

/*
  A minimal local type for use inside the listener.

  The listener is created before RootState is derived from makeStore()
  below, so we can't use RootState here directly. We define a narrow
  type that describes just the slice shape we need — this is safe
  because TypeScript type assertions are checked at the call site.

  Once makeStore() runs and RootState is exported, all components
  that use useAppSelector get the full, accurate type automatically.
*/
type ListenerState = { favorites: { pokemon: FavoritePokemon[] } };

/* ============================================================
   LISTENER MIDDLEWARE — localStorage sync
   ============================================================ */

/*
  createListenerMiddleware() creates a middleware instance that can
  watch for specific actions or state changes and run side effects.

  Think of it as: "whenever X happens in the store, do Y."
*/
const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  /*
    predicate: a function called after EVERY action to decide whether
    to run this listener's effect.

    We compare the favorites array by reference (===). Immer guarantees
    that if the reducer mutated the array, it produces a NEW array
    reference. If nothing changed, the reference is the same.

    This means we only write to localStorage when the favorites actually
    changed — not on every single action dispatched to the store.
  */
  predicate: (_action, currentState, previousState) => {
    const curr = currentState as ListenerState;
    const prev = previousState as ListenerState;
    return curr.favorites.pokemon !== prev.favorites.pokemon;
  },

  /*
    effect: the side effect to run when the predicate returns true.
    Receives the action and a listenerApi with getState(), dispatch(), etc.
  */
  effect: (_action, listenerApi) => {
    const state = listenerApi.getState() as ListenerState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favorites.pokemon));
    } catch {
      // localStorage can throw in private browsing or when storage is full.
      // Silently ignore — favorites still work in memory, just won't persist.
    }
  },
});

/* ============================================================
   makeStore FACTORY
   ============================================================ */

export function makeStore() {
  /*
    Read localStorage synchronously to pre-populate the store.
    This runs when StoreProvider mounts on the client, so localStorage
    is always available here.

    typeof window check: defensive guard against server-side execution.
    StoreProvider is "use client" so this shouldn't run on the server,
    but guarding browser APIs is good practice — it makes the code
    safe to import in any context.
  */
  let preloadedFavorites: FavoritePokemon[] = [];

  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        /*
          Migration guard: filter out stale entries from before the
          types refactor. Old entries had `primaryType: string` instead
          of `types: PokemonType[]`. Any entry without a valid types
          array is discarded rather than crashing at render time.
        */
        const raw = JSON.parse(saved) as Array<Record<string, unknown>>;
        preloadedFavorites = raw.filter(
          (item) => Array.isArray(item.types) && (item.types as unknown[]).length > 0
        ) as unknown as FavoritePokemon[];
      }
    } catch {
      // Malformed JSON or localStorage unavailable — start with empty array.
    }
  }

  return configureStore({
    /*
      reducer: an object that maps slice names to their reducers.
      configureStore calls combineReducers() on this automatically.

      The key ("favorites") becomes the slice's key in the root state:
        state.favorites.pokemon  ← state["favorites"]["pokemon"]

      Add more slices here as the app grows:
        reducer: {
          favorites: favoritesReducer,
          settings: settingsReducer,
          ...
        }
    */
    reducer: {
      favorites: favoritesReducer,
    },

    /*
      preloadedState: initial state values that override each slice's
      own initialState. Here we seed the favorites array from localStorage
      so the store has the right data before the first render.
    */
    preloadedState: {
      favorites: { pokemon: preloadedFavorites },
    },

    /*
      middleware: RTK sets up a sensible default middleware stack
      (thunk + serializable check). We prepend our listener middleware
      so it runs before the defaults — important for correct ordering.

      prepend() vs. concat(): prepend adds to the front of the stack
      (runs first), concat adds to the end (runs last).
    */
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });
}

/* ============================================================
   TYPE EXPORTS
   ============================================================

  These derived types are the key to type-safe Redux with TypeScript.

  RootState: the shape of the entire store state.
    Derived from the store's getState return type so it always
    stays in sync — if you add a new slice, RootState updates
    automatically.

  AppDispatch: the type of the store's dispatch function.
    Using this type (instead of plain Dispatch) ensures TypeScript
    knows about async thunks and other dispatch enhancements.

  Both are used in store/hooks.ts to type useAppSelector and
  useAppDispatch, so every component gets full inference.
*/
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
