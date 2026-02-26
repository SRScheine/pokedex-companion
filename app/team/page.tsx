/*
  app/team/page.tsx — Team Builder Page
  Route: yoursite.com/team

  ============================================================
  THIN SERVER COMPONENT SHELL
  ============================================================

  This page is intentionally minimal. All the interesting logic
  lives in <TeamBuilder /> which is a Client Component.

  This is a common Next.js pattern:
  - Server Component handles: metadata, page title, static layout
  - Client Component handles: interactivity, state, localStorage

  The Server Component doesn't need to fetch any data here —
  the team data lives in localStorage (client-side only).
  There's nothing for the server to fetch.

  This is fine! Not every page needs server-side data fetching.
  The pattern to remember:
    Data from an API → fetch in Server Component
    Data from the browser (localStorage, etc.) → read in Client Component
*/

import { Metadata } from "next";
import { Suspense } from "react";
import TeamBuilder from "@/components/Teambuilder";

export const metadata: Metadata = {
  title: "My Team",
  description: "Build and save your Pokémon Let's Go team.",
};

// Skeleton shown while TeamBuilder hydrates
// Keeps the page layout stable during the localStorage load
function TeamSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-24 rounded-2xl mb-8" />
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  );
}

export default function TeamPage() {
  /*
    Note: this component is NOT async.
    No data to fetch on the server — team lives in the browser.
    A Server Component doesn't have to be async if it has no
    server-side work to do. async is only needed for await.
  */
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-pixel)] text-pokemon-black text-xl md:text-2xl mb-2">
          My Team
        </h1>
        <p className="text-pokemon-gray text-sm">
          Build your party for Let&apos;s Go Pikachu. Your team is saved
          in your browser automatically.
        </p>
      </div>

      {/*
        Suspense wraps TeamBuilder because it's a Client Component
        that has an async initialization phase (loading from localStorage).

        The fallback renders on the server and during the brief moment
        before TeamBuilder hydrates and reads localStorage.

        Without Suspense here, you might see a flash of empty slots
        before the saved team loads. The skeleton prevents that.
      */}
      <Suspense fallback={<TeamSkeleton />}>
        <TeamBuilder />
      </Suspense>

    </div>
  );
}