/*
  app/spin/page.tsx — Spin the Wheel page
  Route: yoursite.com/spin

  ============================================================
  THIN SERVER COMPONENT SHELL
  ============================================================

  This page is intentionally minimal — a Server Component that
  just provides the title/metadata and renders the Client Component.

  All the interesting logic is in <SpinWheel /> which is a Client
  Component. There's no server-side data to fetch here — all state
  lives in the browser (Pokémon fetched client-side on demand).

  This is the cleanest version of the Server/Client split:
    Server Component:  metadata, page title, static layout shell
    Client Component:  everything interactive
*/

import {Metadata} from 'next';
import {Suspense} from 'react';
import SpinWheel from '@/components/SpinWheel';

export const metadata: Metadata = {
  title: 'Spin the Wheel',
  description: 'Spin the wheel to pick a Pokémon!',
};

export default function SpinPage() {
  /*
    Not async — no server data to fetch.
    A Server Component doesn't need to be async unless it awaits
    something. This one is just a layout wrapper.
  */
  return (
    <div className="animate-fade-in mx-auto max-w-2xl px-4 py-8">
      {/*
        max-w-2xl: constrains width to 672px on large screens.
        Narrower than most pages (max-w-6xl) because a wheel
        looks better centered with some breathing room on sides.

        mx-auto: centers the container horizontally.
        Same as marginHorizontal: 'auto' — except in RN that
        doesn't work! RN doesn't support auto margins.
        On web, mx-auto is the standard centering technique.
      */}

      <div className="mb-8 text-center">
        <h1 className="text-pokemon-black mb-2 font-[family-name:var(--font-pixel)] text-xl md:text-2xl">
          Spin the Wheel!
        </h1>
        <p className="text-pokemon-gray pt-1 text-sm">Which Pokémon will choose you?</p>
      </div>

      {/*
        <Suspense> wraps SpinWheel because it's a Client Component
        that does async work on mount (fetching Ben's favorites).

        The fallback shows a skeleton wheel while the component
        initializes. Without Suspense, there'd be a flash of
        unstyled content before the wheel appears.

        rounded-full on the skeleton matches the canvas shape.
      */}
      <Suspense
        fallback={
          <div className="flex justify-center">
            <div className="skeleton h-80 w-80 rounded-full" />
          </div>
        }
      >
        <SpinWheel />
      </Suspense>
    </div>
  );
}
