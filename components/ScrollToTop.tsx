'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

/*
  ScrollToTop: Client Component that scrolls to the top of the page
  whenever the route changes.

  This fixes the issue where navigating between pages sometimes doesn't
  scroll to top, leaving the user mid-page on the new route.

  How it works:
  - usePathname() returns the current route (e.g., "/pokedex" or "/team")
  - useEffect listens for changes to pathname
  - window.scrollTo(0, 0) forces scroll to top when route changes
*/

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null; // This component renders nothing, just handles scroll side-effect
}
