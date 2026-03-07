'use client';

/*
  components/Navbar.tsx — The Navigation Bar
  
  ============================================================
  "use client" — WHAT DOES THIS DO?
  ============================================================
  
  This directive at the TOP of the file (must be line 1, before
  any imports) tells Next.js: "this component runs in the browser,
  not on the server."
  
  We need it here because:
  1. We use useState (tracks whether the mobile menu is open)
  2. We use event handlers (onClick for the hamburger button)
  3. We check the current URL (usePathname hook) to highlight
     the active nav link — this requires knowing what's in the browser
  
  All three of those require a browser to exist. Server components
  run before the browser is involved, so they can't do any of this.
  
  RULE OF THUMB:
  Ask yourself: "Does this component need to know what the user
  is doing RIGHT NOW?" If yes → "use client".
  
  ============================================================
  REACT NATIVE EQUIVALENT
  ============================================================
  
  In RN, the closest equivalent to this Navbar is a custom header
  component or a Tab Navigator. The key differences:
  
  RN navigation:  defined in a navigator, rendered by React Navigation
  Web navigation: just a regular component with <Link> tags. No
                  special navigator system needed. The URL IS the state.
  
  ============================================================
  MOBILE-FIRST APPROACH
  ============================================================
  
  Since our users will often be on their phones while playing,
  we design for mobile FIRST and layer on desktop styles.
  
  Tailwind's responsive prefixes work like this:
    (no prefix)  → applies at ALL screen sizes (mobile first)
    md:          → applies at 768px and wider
    lg:          → applies at 1024px and wider
  
  So `hidden md:flex` means:
    → hidden on mobile
    → flex on medium screens and up
  
  This is the OPPOSITE of how many RN devs think (starting
  from desktop and adding mobile breakpoints). Tailwind is
  mobile-first by convention.
*/

import {useState} from 'react';
// next/link: the web equivalent of React Navigation's <Link> or
// navigation.navigate(). It renders an <a> tag but intercepts clicks
// to do client-side navigation (no full page reload).
import Link from 'next/link';
// usePathname: returns the current URL path ("/pokedex", "/team", etc.)
// This is like useRoute() or useNavigationState() in React Navigation —
// useful for knowing which screen/page is currently active.
import {usePathname} from 'next/navigation';
// next/image: an optimized <img> replacement. Handles lazy loading,
// responsive sizing, and format conversion automatically.
// In RN you used <Image source={require('./asset.png')} />.
// On web, next/image is the equivalent for best practices.
import Image from 'next/image';

// ============================================================
// TYPES
// Defining the shape of a nav link. TypeScript interfaces work
// the same here as they do in React Native — no difference.
// ============================================================
interface NavLink {
  href: string;
  label: string;
  emoji: string; // Fun visual indicator instead of icons
}

// Our navigation structure. These href values map directly to
// folder names in the app/ directory (file-based routing).
const NAV_LINKS: NavLink[] = [
  {href: '/pokedex', label: 'Pokédex', emoji: '📖'},
  {href: '/type', label: 'Type Chart', emoji: '⚔️'},
  {href: '/team', label: 'My Team', emoji: '⭐'},
  {href: '/spin', label: 'Spin!', emoji: '🎡'},
];

// ============================================================
// COMPONENT
// ============================================================
export default function Navbar() {
  /*
    useState: works EXACTLY the same as in React Native.
    No difference whatsoever. useState, useEffect, useCallback,
    useMemo — all standard React hooks work identically on web.
    
    The only difference: you can only use them in Client Components
    (files with "use client" at the top). In RN, there's no such
    restriction because everything is a "client" component.
  */
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /*
    usePathname(): returns the current URL path.
    We'll use this to add an "active" style to the current nav link.
    
    RN equivalent:
      const route = useRoute(); // or useNavigationState
      const isActive = route.name === 'Pokedex';
  */
  const pathname = usePathname();

  return (
    /*
      <header> is the semantic HTML element for the top-of-page
      app bar. Think of it as your <View> for the header area,
      but with semantic meaning for browsers and screen readers.
      
      fixed top-0 left-0 right-0
        → Fixes the navbar to the top of the viewport, always visible
          while scrolling. In RN this is automatic with Stack.Navigator
          headers. On web you have to do it explicitly with CSS.
        → left-0 right-0: stretch edge to edge (equivalent to width:100%)
      
      z-50
        → z-index: 50. Keeps the navbar above all page content.
          Same concept as RN's zIndex, same prop name in Tailwind.
      
      bg-pokemon-red
        → Our brand red background from tailwind.config.ts
      
      shadow-md
        → A medium drop shadow — gives the navbar visual separation
          from the page content below it.
          In RN: shadowColor, shadowOffset, shadowOpacity, shadowRadius
          On web: one `box-shadow` value handles all of that.
    */
    <header className="bg-pokemon-red fixed top-0 right-0 left-0 z-50 shadow-md">
      {/*
        max-w-6xl mx-auto px-4
          → max-w-6xl: caps the content width at 1152px on wide screens
          → mx-auto: centers it horizontally (margin: 0 auto)
          → px-4: horizontal padding of 1rem (16px) on both sides
        
        This "max-width container with auto margins" pattern is the
        standard way to center content on the web. You'll see it
        everywhere. In RN you don't need this because the screen
        has a fixed width.
        
        h-16: height 64px — matches our --nav-height CSS variable
        
        flex items-center justify-between
          → Flexbox: SAME as React Native! Web CSS flexbox and RN's
            flexbox are nearly identical. Main differences:
            - Web default flex-direction is 'row' (RN default is 'column')
            - Web needs `display: flex` first; RN Views are flex by default
            - Tailwind's `flex` class handles the `display: flex` part
      */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* ── LOGO ── */}
        {/*
          <Link href="/"> is the web equivalent of:
            <Pressable onPress={() => navigation.navigate('Home')}>
          
          It renders as an <a> tag in HTML but uses client-side
          navigation — no full page reload.
          
          className="flex items-center gap-2"
            → gap-2: adds spacing BETWEEN flex children (8px)
            → In RN you'd use a margin on individual children,
              or columnGap/rowGap on the container View.
              Web CSS `gap` works the same way and is cleaner.
        */}
        <Link href="/" className="flex items-center gap-2">
          {/*
            next/image <Image> component:
            
            In RN: <Image source={require('./pokeball.png')} style={{width:32, height:32}} />
            On web: <Image src="/pokeball.png" width={32} height={32} alt="..." />
            
            Key differences:
            - src is a string path (not require())
            - width and height are REQUIRED (for layout stability — prevents
              page jumping as images load, called Cumulative Layout Shift)
            - alt is REQUIRED for accessibility (screen readers read this aloud)
            
            Files in the /public folder are served at the root URL:
            /public/pokeball.png → accessible at /pokeball.png
            We'll add this image to /public later.
          */}
          <Image
            src="/pokeball.png"
            width={32}
            height={32}
            alt="Pokéball logo"
            className="animate-spin-slow" // Too distracting?
          />
          {/*
            font-[family-name:var(--font-pixel)]
              → Uses our pixel font CSS variable for the logo text
              → Square bracket notation in Tailwind lets you use
                arbitrary CSS values that aren't in your config

            text-pokemon-yellow: our bright yellow brand color
            text-xs: slightly smaller text on mobile so it fits
            sm:text-sm: restore the regular small size at 640px+
            block: visible on all screen sizes (was previously hidden on mobile)
          */}
          <span className="text-pokemon-yellow block font-[family-name:var(--font-pixel)] text-xs sm:text-sm">
            PokéCompanion
          </span>
        </Link>

        {/* ── DESKTOP NAV LINKS ── */}
        {/*
          hidden md:flex
            → On mobile (< 768px): hidden (display: none)
            → On desktop (≥ 768px): flex
          
          This is the mobile-first responsive pattern.
          On mobile, we show a hamburger menu instead (below).
          
          items-center gap-1: flex row with small gaps between links
        */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            /*
              Active link detection:
              pathname is the current URL path (e.g., "/pokedex")
              We check if the current path starts with the link's href
              so that sub-pages (like /pokedex/25) also highlight
              the Pokédex link.
              
              This is like checking route.name in React Navigation.
            */
            const isActive = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                /*
                  Conditional className based on isActive.
                  
                  In RN: style={[styles.link, isActive && styles.activeLink]}
                  On web: className={`base-classes ${isActive ? 'active-classes' : 'inactive-classes'}`}
                  
                  Both approaches work. A common pattern is template literals
                  for simple cases, or the `clsx` / `cn` utility for complex ones.
                  We'll install clsx later for cleaner conditional classes.
                */
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive ? 'bg-pokemon-darkred text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                } `}
              >
                <span>{link.emoji}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── MOBILE HAMBURGER BUTTON ── */}
        {/*
          md:hidden: visible on mobile, hidden on desktop.
          (Opposite of the nav above — they trade places at md breakpoint)
          
          <button>: the semantic HTML element for clickable actions.
          In RN you'd use <TouchableOpacity> or <Pressable>.
          
          IMPORTANT: Use <button> for actions, <a>/<Link> for navigation.
          Mixing them up is a common web accessibility mistake.
          
          aria-label: screen reader text for the button.
          Since there's no visible text (just an icon), we need this
          so screen reader users know what the button does.
          In RN: accessibilityLabel
          
          aria-expanded: tells screen readers if the menu is open.
          In RN: accessibilityState={{ expanded: isMobileMenuOpen }}
        */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex flex-col gap-1.5 p-2 text-white md:hidden"
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          {/*
            Animated hamburger icon — three lines that visually
            transform when the menu opens.
            
            Each line is a <span> styled as a thin horizontal bar.
            We use CSS transitions to animate them.
            
            transition-all: animate all changing CSS properties
            duration-300: 300ms animation
            origin-center: transform from the center point
            
            When open:
            - First line: rotates 45° and moves down (forms top of X)
            - Middle line: fades out (opacity-0)  
            - Last line: rotates -45° and moves up (forms bottom of X)
            
            In RN you'd use Animated.Value or react-native-reanimated.
            On web, pure CSS handles this with no JS overhead.
          */}
          <span
            className={`block h-0.5 w-6 bg-white transition-all duration-300 ${
              isMobileMenuOpen ? 'translate-y-2 rotate-45' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-0.5 w-6 bg-white transition-all duration-300 ${
              isMobileMenuOpen ? '-translate-y-2 -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* ── MOBILE DROPDOWN MENU ── */}
      {/*
        This slides down from the navbar when the hamburger is pressed.
        
        md:hidden: only show on mobile (desktop has inline nav above)
        
        overflow-hidden: clips the content so it's invisible when
        the menu is closed (height is 0).
        
        transition-all duration-300: smooth height animation.
        
        ${isMobileMenuOpen ? "max-h-64" : "max-h-0"}
          → We animate max-height instead of height because CSS can't
            animate height: auto. This is a classic web CSS trick.
            max-h-0: clips content to invisible
            max-h-64: allows up to 256px of height to show
          → In RN you'd use Animated.timing() on a height value,
            or react-native-reanimated's useAnimatedStyle.
            CSS handles this natively on web with no JS.
        
        bg-pokemon-darkred: slightly darker red to distinguish
        the dropdown from the main bar.
      */}
      <div
        className={`bg-pokemon-darkred overflow-hidden transition-all duration-300 md:hidden ${isMobileMenuOpen ? 'max-h-64' : 'max-h-0'} `}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                /*
                  Close the menu when a link is tapped.
                  In RN you'd call navigation.navigate() which
                  automatically closes a drawer or modal.
                  Here, we manually update state.
                */
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors duration-150 ${
                  isActive ? 'bg-black/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                } `}
              >
                <span className="text-xl">{link.emoji}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
