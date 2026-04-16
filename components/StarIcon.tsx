/*
  components/StarIcon.tsx

  A reusable SVG star icon used in FavoriteButton and Navbar.

  Sharing the same SVG across both locations means the star shape
  is consistent everywhere it appears in the app. One source of truth
  for the geometry — change it here and it updates everywhere.

  The star uses strokeLinejoin="round" and strokeLinecap="round" to
  give the points a friendlier, rounder look compared to the default
  sharp-cornered star you get from a plain polygon.

  filled: toggles between outline (false) and solid (true).
  size:   width/height in pixels (default 20).
  className: pass color and other overrides via Tailwind (e.g. "text-yellow-400").
*/

interface StarIconProps {
  filled?: boolean;
  size?: number;
  className?: string;
  onAnimationEnd?: () => void;
}

const StarIcon = ({filled = false, size = 20, className = '', onAnimationEnd}: StarIconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0.5 : 2}
    strokeLinejoin="round"
    strokeLinecap="round"
    className={className}
    onAnimationEnd={onAnimationEnd}
    aria-hidden="true"
  >
    {/*
      Standard 5-point star polygon.
      The two radii (outer ≈ 10, inner ≈ 4) give a classic star shape.
      strokeLinejoin="round" softens the sharp inner angles into
      gentle curves — much friendlier than the default miter join.
    */}
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

export default StarIcon;
