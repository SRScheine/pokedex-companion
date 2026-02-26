import type { Config } from "tailwindcss";

/*
  tailwind.config.ts — Tailwind v4
  
  In Tailwind v3, this file was required and held your entire theme:
  colors, fonts, spacing, animations, etc.
  
  In Tailwind v4, this file is OPTIONAL. The theme now lives in
  globals.css inside the @theme block. This file only needs to
  exist if you're using plugins or need to override core config.
  
  For our project, we don't need anything here — but we keep the
  file because some tooling (TypeScript, ESLint plugins) expects it.
*/
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;