'use client';

/*
  components/StoreProvider.tsx

  ============================================================
  WHAT IS THIS FILE?
  ============================================================

  React-Redux requires a <Provider> component at the top of your
  component tree. It puts the Redux store into React context so
  any component below it can call useAppSelector / useAppDispatch.

  In a plain React app (CRA, Vite, Expo), you'd just drop a
  module-level store singleton directly into Provider:

    // ✓ Fine for Expo / CRA — each app instance is its own process
    const store = configureStore({ ... })
    <Provider store={store}>...</Provider>

  In Next.js App Router, we can't do that. Here's why, and what
  we do instead.

  ============================================================
  WHY NOT A MODULE-LEVEL SINGLETON IN NEXT.JS?
  ============================================================

  Next.js runs Server Components on the SERVER. Node.js modules
  are singletons per server process — they're created once and
  shared across ALL requests, from ALL users.

  If you did:
    // store/index.ts — BAD for Next.js:
    export const store = configureStore({ ... })

  ...then User A's request and User B's request would share the
  same Redux store. User A's favorites would bleed into User B's
  response — a real security problem in a multi-user app.

  In React Native, this concern doesn't apply. Each device runs
  its own isolated JS engine. There's no shared process.

  ============================================================
  THE SOLUTION: makeStore() + useRef
  ============================================================

  We exported makeStore() from store/index.ts — a FACTORY that
  creates a fresh store each time it's called.

  But we can't just call makeStore() directly inside the render:
    // This would create a new store on EVERY render — bad!
    <Provider store={makeStore()}>

  We need to call it ONCE and hold the result. That's what
  useRef is for:

    const storeRef = useRef<AppStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = makeStore()  // runs once, on first mount
    }

  useRef vs useState for this purpose:
    - useState: updating it triggers a re-render. We never want to
      swap the store — doing so would reset all state.
    - useRef: mutable box, changing it does NOT trigger a re-render.
      Perfect for storing a value that should live as long as the
      component but never change.

  In React Native: you'd use the same pattern if you needed a
  persistent, non-reactive reference. useRef works identically.

  ============================================================
  "use client" — BUT SERVER COMPONENTS ARE STILL FAST
  ============================================================

  This file has "use client" at the top, which means it runs in
  the browser. But it wraps {children} — which CAN still be
  Server Components.

  How? Next.js evaluates Server Components on the server FIRST,
  turns their output into static HTML/RSC payload, and passes
  THAT as the children prop to StoreProvider. The server work
  happens regardless of this component being a client component.

  The rule: "use client" marks a BOUNDARY. Below the boundary,
  components default to client. But children PASSED IN via props
  (like {children} here) are evaluated outside this boundary —
  they can still be server components.

  Analogy from RN: imagine a Context.Provider wrapping your
  whole app. The Provider itself runs on the device. But the
  components it wraps can still do their own data fetching,
  SSR concerns aside.
*/

import {useRef} from 'react';
import {Provider} from 'react-redux';
import {makeStore} from '@/store';
import type {AppStore} from '@/store';

interface StoreProviderProps {
  children: React.ReactNode;
}

const StoreProvider = ({children}: StoreProviderProps) => {
  /*
    useRef<AppStore | null>(null)

    On first render: storeRef.current is null, so we call makeStore().
    makeStore() reads localStorage synchronously and pre-populates the
    store — the store is fully hydrated before the first render paints.

    On every subsequent render: storeRef.current is already set, so
    we skip the if block. The same store instance is reused forever.

    In RN: useRef behaves identically. The pattern would be the same
    if you ever needed SSR-safe store initialization.
  */
  /*
    useRef pattern: official RTK recommendation for Next.js App Router.
    See: https://redux.js.org/usage/nextjs

    === null (not !ref.current): required by the react-hooks/refs ESLint
    rule in React 19, which wants an explicit null check when lazily
    initializing a ref during render.
  */
  const storeRef = useRef<AppStore | null>(null);

  // eslint-disable-next-line react-hooks/refs
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  /*
    <Provider store={...}>

    This is react-redux's Provider component. It puts the store
    into React context. Any component below this in the tree can
    now call useAppSelector() or useAppDispatch() and get access
    to the store.

    Compare to React Native patterns you've likely used:
      <NavigationContainer> puts navigation state in context
      <ThemeProvider>        puts theme in context
      <Provider store={...}> puts Redux store in context

    Same concept, different library.
  */
  // eslint-disable-next-line react-hooks/refs
  return <Provider store={storeRef.current}>{children}</Provider>;
};

export default StoreProvider;
