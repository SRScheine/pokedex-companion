# PokéCompanion

A full-featured Pokémon reference app built with Next.js App Router, TypeScript, and Tailwind CSS. Covers the full National Pokédex (1,025 Pokémon) with detailed stat analysis, type matchup charts, team building tools, and more.

**[Live Demo →](https://pokedex-companion.vercel.app)**

---

## Features

**Pokédex**

- Browse all 1,025 Pokémon with pagination and live search suggestions
- Detail pages with official artwork, flavor text, abilities, and training data
- Percentile-based stat radar chart
- Stat table with tier-colored percentile ranks
- Type defense chart showing combined effectiveness for single and dual-type Pokémon, including 4× and ¼× stacked interactions

**Type Chart**

- Full 18×18 attack/defense matrix for all types

**Team Builder**

- Build and save a team of up to 6 Pokémon

**Spin Wheel**

- Randomized Pokémon selector built on the HTML Canvas API
- Wheel slices are drawn imperatively using the 2D canvas context — arcs, sprite images, and arc-following character-by-character text rendering
- Animation driven by `requestAnimationFrame` at ~60fps with an ease-out curve, keeping rotation state in a `useRef` to avoid 60 re-renders per second
- Winner selection uses rotation math to guarantee the pointer lands precisely on the center of the chosen slice
- Pre-loaded with a curated set of favorites; supports adding any of the 1,025 Pokémon via search or random selection
- Sprite images are preloaded as `HTMLImageElement` objects before being passed to `drawImage()` on the canvas
- "My Favorites" button to spin exclusively with your starred Pokémon (random sample of 6 if you have > 6)

**Favorites**

- Star/unstar any Pokémon from Pokédex cards, detail pages, or the Spin the Wheel winner modal
- Dedicated `/favorites` page displays all starred Pokémon in a responsive grid
- Redux Toolkit for global state management with localStorage persistence across sessions
- Favorites count badge in the navbar for quick reference

---

## Tech Stack

|            |                                                                       |
| ---------- | --------------------------------------------------------------------- |
| Framework  | [Next.js 15](https://nextjs.org) — App Router, Server Components, SSG |
| Language   | TypeScript                                                            |
| Styling    | Tailwind CSS v4                                                       |
| State      | [Redux Toolkit](https://redux-toolkit.js.org) — favorites with localStorage persistence |
| Data       | [PokéAPI](https://pokeapi.co)                                         |
| Deployment | [Vercel](https://vercel.com)                                          |

---

## Architecture Highlights

**Static Site Generation at scale** — `generateStaticParams` pre-renders all 1,025 Pokémon detail pages at build time. Every detail page is served as static HTML with zero server processing at request time.

**Server Components by default** — data fetching happens on the server wherever possible. Client Components are used only where interactivity is required (Gen 1 toggle, search input, team builder). This keeps JavaScript bundle sizes small.

**Percentile stat engine** — a build-time script (`scripts/generate-pokemon-stats.ts`) fetches all base-form Pokémon, computes p10–p100 breakpoints per stat, and writes them to a static JSON file committed to the repo. The radar chart and stat table read from this file at render time with no runtime API cost.

**Type matrix** — the 18×18 type chart and per-Pokémon type defense sections are computed server-side from PokéAPI damage relations, cached indefinitely since type data never changes between deploys.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To regenerate the percentile stat data (only needed when a new generation adds Pokémon):

```bash
npm run generate:stats
```

---

## Background

Built as a learning project to transition from React Native (4 years) to Next.js ahead of web-focused roles. The codebase is intentionally well-commented with RN-to-Next.js comparisons throughout — covering concepts like Server vs Client Components, SSG vs SSR, CSS-in-JS vs Tailwind, and file-based routing vs React Navigation.
