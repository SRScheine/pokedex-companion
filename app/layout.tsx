/*
  app/layout.tsx — The Root Layout
  
  ============================================================
  WHAT IS THIS FILE?
  ============================================================
  
  In React Native, you had an App.tsx (or App.js) that was the
  root of your component tree. Everything rendered inside it.
  You'd put your navigation container, global providers, and
  any chrome (like a status bar) there.
  
  layout.tsx is the exact same concept for Next.js.
  
  Every page in the app renders as {children} inside this file.
  It wraps 100% of your routes. You can (and will) also create
  nested layouts for subsections of the app, but this root one
  applies everywhere.
  
  ============================================================
  WHY IS THIS A SERVER COMPONENT?
  ============================================================
  
  Notice there is NO "use client" at the top of this file.
  That means this is a Server Component — it runs on the server,
  not in the browser.
  
  Layouts are almost always server components. They don't need
  interactivity — they just define structure. The <Navbar />
  inside it will be a client component (because it needs useState
  for the mobile menu), but the layout shell itself stays on the server.
  
  This is a key Next.js pattern: keep the outer shells as server
  components, push "use client" down to the smallest interactive
  leaf components possible.
  
  ============================================================
  THE HTML SHELL
  ============================================================
  
  In React Native, you never write HTML. The framework handles
  the native shell for you.
  
  On the web, EVERY page is ultimately an HTML document with
  <html>, <head>, and <body> tags. Next.js requires you to
  return these from your root layout. This is the ONE place
  in the app where you'll write raw HTML boilerplate.
  
  Everything else will feel much more like React Native.
*/

import type { Metadata } from "next";
// next/font: Next.js has a built-in font system that downloads Google Fonts
// at BUILD TIME and serves them from your own domain. This is better for
// performance and privacy than loading fonts from Google's servers at runtime.
// In RN, you'd use expo-font or embed font files in your assets folder.
import { Press_Start_2P, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

// ============================================================
// FONT CONFIGURATION
// 
// Press_Start_2P: the classic pixelated Pokémon-style font.
//   We'll use it for headings and the logo.
// Inter: clean, readable sans-serif for body text and UI.
//   A popular choice for dashboards and apps.
//
// The `variable` property creates a CSS custom property (--font-pixel,
// --font-body) that we apply to the <html> tag below. Tailwind then
// picks these up via tailwind.config.ts.
//
// subsets: tells Next.js to only download the character sets we need.
// 'latin' covers English and most Western European languages.
// This keeps the font file small — important for mobile performance.
// ============================================================
const pixelFont = Press_Start_2P({
  weight: "400", // Press Start 2P only comes in one weight
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap", // Show fallback font while loading, then swap. Better UX than invisible text.
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// ============================================================
// METADATA
//
// This is a Next.js concept with no direct RN equivalent.
// Web pages have <head> metadata: title, description, favicon,
// Open Graph tags (for link previews in iMessage/Slack/etc.).
//
// In Next.js App Router, you export a `metadata` object from
// any page.tsx or layout.tsx and Next.js automatically injects
// the right <meta> tags into the HTML <head>.
//
// You never write <title> or <meta> tags manually.
// ============================================================
export const metadata: Metadata = {
  title: {
    // Template: page-specific titles will replace %s
    // e.g., the Pokédex page will show "Pokédex | Pokémon Companion"
    template: "%s | Pokémon Companion",
    // Default: shown when a page doesn't set its own title
    default: "Pokémon Companion",
  },
  description:
    "Your pocket companion for Pokémon Let's Go Pikachu. Look up Pokémon, plan your team, and master type matchups.",
  // Icons: the favicon (the little icon in browser tabs)
  icons: {
    icon: "/favicon.ico",
  },
};

// ============================================================
// THE ROOT LAYOUT COMPONENT
//
// Props:
//   children: ReactNode — this is every page that renders inside
//   this layout. Next.js passes the current page here automatically.
//   You never call this component manually — Next.js does it for you.
//
// Compare to React Native:
//   export default function App() {
//     return (
//       <NavigationContainer>
//         <Stack.Navigator>
//           ...screens...
//         </Stack.Navigator>
//       </NavigationContainer>
//     );
//   }
//
// Here we return the HTML shell + our Navbar + whatever page is active.
// ============================================================
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
      <html> and <body> tags:
      
      You MUST return these from the root layout. This is the only
      place in your entire app where you'll write these tags.
      Next.js uses them to build the full HTML document.
      
      lang="en": accessibility + SEO best practice. Screen readers
      use this to know what language to use.
      
      The font variables (pixelFont.variable, bodyFont.variable) add
      CSS custom properties (--font-pixel, --font-body) to the <html>
      element so they're available everywhere via CSS/Tailwind.
      
      MOBILE WEB NOTE:
      The `suppressHydrationWarning` on <html> suppresses a React
      warning that fires when browser extensions (like dark mode tools)
      modify the DOM before React hydrates. A common web-only gotcha.
    */
    <html
      lang="en"
      className={`${pixelFont.variable} ${bodyFont.variable}`}
      suppressHydrationWarning
    >
      <body
        /*
          className breakdown:
          
          font-[family-name:var(--font-body)]
            → Use our Inter font variable as the default body font.
            → This is how you use CSS variable fonts with Tailwind.
          
          bg-pokemon-white
            → Our custom off-white background from tailwind.config.ts
          
          text-pokemon-black
            → Default text color for the whole app
          
          min-h-dvh
            → Minimum height = full viewport height (dvh = dynamic
              viewport height, accounts for mobile browser chrome)
            → In RN, your root view always fills the screen. On web,
              you have to ask for it.
          
          flex flex-col
            → Make the body a flex column so the footer (if we add one)
              can be pushed to the bottom with `mt-auto`.
            → In RN, you'd use flex:1 on a View. Same idea, same CSS.
        */
        className="font-[family-name:var(--font-body)] bg-pokemon-white text-pokemon-black min-h-dvh flex flex-col"
      >
        {/*
          NAVBAR
          
          This renders on every page — same as having a persistent
          header in a React Native app (common with Stack.Navigator's
          header or a custom one).
          
          We'll build this component in the next step. It will be a
          CLIENT component (uses useState for mobile menu toggle).
        */}
        <Navbar />

        {/*
          MAIN CONTENT AREA
          
          <main> is a semantic HTML element — it tells browsers,
          search engines, and screen readers "this is the primary
          content of the page."
          
          In React Native, you'd use <View>. On the web, you have
          semantic elements for different purposes:
            <header>  → top of page / app bar
            <nav>     → navigation links
            <main>    → primary content (use once per page)
            <section> → a thematic grouping
            <article> → self-contained content
            <aside>   → sidebar / supplementary content
            <footer>  → bottom of page
          
          You can use <div> for everything and it works fine, but
          semantic elements are better for accessibility and SEO.
          Think of them as <View> with built-in meaning.
          
          pt-[var(--nav-height)]: adds padding-top equal to our navbar
          height so content isn't hidden behind the fixed navbar.
          This is a CSS variable reference in Tailwind — square bracket
          notation lets you use arbitrary values: `pt-[64px]` works too.
          
          flex-1: makes this area grow to fill remaining vertical space.
          Same as flex:1 in React Native StyleSheet!
        */}
        <main className="flex-1 pt-[var(--nav-height)]">
          {children}
        </main>

        {/*
          FOOTER — simple for now
          
          <footer> is another semantic HTML element.
          In RN you'd render this inside a ScrollView or at the bottom
          of a screen. On web it just sits at the bottom of the document.
        */}
        <footer className="border-t border-pokemon-lightgray py-6 mt-8">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-pokemon-gray">
            <p>
              Pokémon Companion — Built with{" "}
              {/* 
                ❤️ Next.js note: text nodes with special characters
                should be wrapped or escaped. The curly brace syntax
                is how you embed expressions in JSX — same as RN.
              */}
              Next.js & PokéAPI
            </p>
            <p className="mt-1 text-xs">
              Data from{" "}
              {/*
                <a> tag: the web equivalent of React Native's
                <Pressable onPress={() => Linking.openURL(url)}>
                
                target="_blank": opens in a new tab
                rel="noopener noreferrer": security best practice
                  when opening external links in a new tab.
                  "noopener" prevents the new tab from accessing
                  your page via window.opener.
                  "noreferrer" hides the referrer header.
                  Always use both together for external _blank links.
              */}
              <a
                href="https://pokeapi.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pokemon-blue hover:underline"
              >
                PokéAPI
              </a>
              {" "}— Not affiliated with Nintendo or The Pokémon Company.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}