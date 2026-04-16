'use client';

/*
  components/WinnerModal.tsx

  ============================================================
  WHY "use client"
  ============================================================
  This component uses:
  - useEffect (lock body scroll, keyboard listener)
  - onClick event handlers
  - window and document APIs (browser-only)
  All of these require "use client".
*/

import {useEffect} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {PokemonType} from '@/types/pokemon';
import FavoriteButton from '@/components/FavoriteButton';

export interface WheelPokemon {
  id: number;
  name: string;
  sprite: string;
  types: PokemonType[];
}

interface WinnerModalProps {
  winner: WheelPokemon;
  onClose: () => void;
  onSpinAgain: () => void;
}

/*
  TYPE_GRADIENTS maps each Pokémon type to a Tailwind gradient class.

  We use arbitrary value syntax: from-[#F08030]
  Square brackets in Tailwind let you use any CSS value that isn't
  in your theme. This is the escape hatch for one-off values.
  In RN: you'd just use the hex string directly in a style object.
  On web: Tailwind needs to know the class at build time, so we
  write the full class string (not a dynamic template literal).
*/
const TYPE_GRADIENTS: Record<string, string> = {
  normal: 'from-[#A8A878] to-[#6a6a4a]',
  fire: 'from-[#F08030] to-[#a84000]',
  water: 'from-[#6890F0] to-[#2040b0]',
  electric: 'from-[#F8D030] to-[#b09000]',
  grass: 'from-[#78C850] to-[#387810]',
  ice: 'from-[#98D8D8] to-[#409898]',
  fighting: 'from-[#C03028] to-[#700808]',
  poison: 'from-[#A040A0] to-[#501060]',
  ground: 'from-[#E0C068] to-[#906820]',
  flying: 'from-[#A890F0] to-[#5030b0]',
  psychic: 'from-[#F85888] to-[#a80838]',
  bug: 'from-[#A8B820] to-[#587000]',
  rock: 'from-[#B8A038] to-[#685800]',
  ghost: 'from-[#705898] to-[#301850]',
  dragon: 'from-[#7038F8] to-[#2800a8]',
  dark: 'from-[#705848] to-[#281808]',
  steel: 'from-[#B8B8D0] to-[#686880]',
  fairy: 'from-[#EE99AC] to-[#a84060]',
};

/*
  ConfettiParticle — a single falling confetti dot/square.

  This is a purely CSS animation — no Animated.Value, no
  react-native-reanimated. The browser handles it natively.

  Each particle gets randomized: position, color, size,
  delay, and duration — all calculated from the index so
  they're deterministic (same result every render).
*/
const ConfettiParticle = ({index}: {index: number}) => {
  const colors = ['#FF1111', '#FFDE00', '#3B4CCA', '#78C850', '#F08030', '#F85888'];
  const color = colors[index % colors.length];

  const left = `${(index * 37 + 5) % 100}%`;

  /*
    Tighter delay range (0–0.5s vs the old 0–1.2s) so all particles
    burst within half a second rather than trickling in over a full second.
    Shorter durations (0.9–1.4s) make the fall feel snappier.
  */
  const delay = `${(index * 0.05) % 0.5}s`;
  const duration = `${0.9 + (index % 6) * 0.1}s`;

  /*
    Three flight paths assigned by index:
      confettiFallLeft  — drifts left as it falls
      confettiFallRight — drifts right as it falls
      confettiFallStraight — slight wobble, mostly vertical

    The horizontal drift is what makes confetti feel like it's
    flying rather than just raining straight down.
  */
  const animations = ['confettiFallLeft', 'confettiFallRight', 'confettiFallStraight'];
  const animName = animations[index % 3];

  // Width of each particle
  const width = [12, 8, 10, 6, 9, 7][index % 6];
  // Every third particle is a tall rectangle (paper strip) for variety
  const height = index % 3 === 0 ? Math.round(width * 2.5) : width;
  // Mix of circles, squares, and strips
  const borderRadius = index % 3 === 1 ? '50%' : '2px';

  return (
    <div
      className="pointer-events-none absolute top-0"
      style={{
        left,
        width,
        height,
        backgroundColor: color,
        borderRadius,
        animation: `${animName} ${duration} ${delay} ease-in both`,
      }}
    />
  );
};

const WinnerModal = ({winner, onClose, onSpinAgain}: WinnerModalProps) => {
  const primaryTypeName = winner.types[0]?.type.name ?? 'normal';
  const gradientClass = TYPE_GRADIENTS[primaryTypeName] ?? 'from-pokemon-red to-pokemon-darkred';
  const displayName = winner.name.charAt(0).toUpperCase() + winner.name.slice(1);
  const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${winner.id}.png`;

  /*
    LOCK BODY SCROLL WHILE MODAL IS OPEN

    In React Native, modals automatically prevent scrolling
    of content behind them. The OS handles this.

    On web, you have to do it manually. When a modal opens,
    the page behind it can still scroll, which looks broken.

    document.body.style.overflow = "hidden" prevents the
    entire page from scrolling while the modal is visible.

    The cleanup function (return) restores scrolling when
    the component unmounts (modal closes). This is the
    standard useEffect cleanup pattern — same in RN and web.
  */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  /*
    CLOSE ON ESCAPE KEY

    Web convention: pressing Escape closes modals/dialogs.
    Screen reader users and keyboard-only users expect this.

    In RN: the Android hardware back button is handled by
    React Navigation's modal system automatically.
    On web: you wire up keyboard events manually.

    window.addEventListener: attaches a listener to the
    browser window object (the global event target).
    The cleanup removes it to prevent memory leaks —
    same cleanup pattern as removing an RN event listener.
  */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /*
      fixed inset-0:
        position: fixed — stays in place even while scrolling
        inset-0 = top:0, right:0, bottom:0, left:0 — covers everything
        Together: a full-viewport overlay that doesn't scroll away.

      In RN: <Modal visible> handles this automatically.
      On web: you build it with CSS positioning.

      z-50: z-index 50 — above all other page content.
      In RN: Modal always renders on top. On web, you manage z-index.

      flex items-center justify-center:
        Centers the modal card both horizontally AND vertically.
        In RN: you'd use justifyContent + alignItems on a View.
        Same flexbox properties, same values — just Tailwind syntax.

      p-4: 16px padding so the modal doesn't touch screen edges on mobile.
    */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Confetti layer */}
      {/*
        absolute inset-0: fills the entire fixed overlay.
        overflow-hidden: clips confetti particles that go off-screen.
        pointer-events-none: clicks pass through to elements below.
      */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {Array.from({length: 64}).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/*
        BACKDROP
        A semi-transparent black layer behind the modal card.
        Clicking it closes the modal — common web/mobile UX pattern.

        absolute inset-0: fills the overlay div.
        bg-black/70: black at 70% opacity.
          The /70 syntax is Tailwind's opacity modifier.
          bg-black/70 = backgroundColor: rgba(0,0,0,0.7)
          In RN: backgroundColor: 'rgba(0,0,0,0.7)'
          Same result, different syntax.

        backdrop-blur-sm: applies a CSS blur filter to everything
          BEHIND this element. Makes the page content look frosted.
          backdrop-filter: blur() — a CSS property.
          In RN: you'd need @react-native-community/blur or similar.
          On web: one CSS property handles it natively.
      */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/*
        MODAL CARD CONTAINER
        relative z-10: stacks above the absolute backdrop.
        w-full max-w-sm: full width up to 384px max.
          max-w-sm is a "max-width" constraint — the modal won't
          grow wider than 384px even on large screens.
          In RN: you'd use maxWidth in a StyleSheet.
        mx-auto: centers horizontally (margin: 0 auto).
      */}
      <div className="relative z-20 mx-auto w-full max-w-sm">
        {/*
          ★ FAVORITE BUTTON
          Positioned absolutely in the top-left corner

          FavoriteButton props:
          - pokemon: winner (has id, name, sprite, primaryType)
          - className: positioning + z-index

          WheelPokemon and Omit<FavoritePokemon, 'addedAt'> have
          identical shapes, so winner passes through directly.

          Like the close button, FavoriteButton handles
          e.stopPropagation() internally to prevent triggering
          the card's <Link> navigation.
        */}
        <FavoriteButton pokemon={winner} className="absolute top-2 left-2 z-20" />

        {/*
          ✕ CLOSE BUTTON
          Positioned absolutely in the top-right corner,
          slightly outside the card (-top-4 -right-4).

          absolute -top-4 -right-4:
            negative values move the element OUTSIDE its container.
            -top-4 = top: -16px (above the card edge)
            -right-4 = right: -16px (outside the right edge)
            This "floating button" effect is a common modal pattern.
            In RN: you'd use a negative margin or calculate position.

          z-20: above the card content (z-10) so it's always tappable.

          w-10 h-10: 40px × 40px — big enough for a touch target.
            Apple's HIG recommends minimum 44pt touch targets.
            Google's Material Design recommends 48dp.
            We're close enough at 40px.

          rounded-full: perfect circle (border-radius: 9999px)

          e.stopPropagation(): CRITICAL.
          The card below is a <Link>. Without stopPropagation,
          clicking ✕ would bubble UP through the DOM to the Link
          and trigger navigation to the Pokémon page.
          stopPropagation() stops the event here — it doesn't
          travel further up the DOM tree.
          In RN: same method, same use case — e.stopPropagation()
        */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-pokemon-black hover:bg-pokemon-lightgray absolute -top-4 -right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold shadow-xl transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/*
          THE MAIN CARD — wrapped in <Link>

          This is the "tap anywhere to navigate" interaction.
          The ENTIRE card is a link to the Pokémon detail page.
          Your son discovers this naturally — tap the big
          Pokémon picture and you go to its page.

          <Link href="..."> renders as an <a> tag in HTML.
          Clicking it does client-side navigation (no full reload).
          In RN: <Pressable onPress={() => navigation.navigate(...)}
          On web: <Link href="..."> — the href IS the destination.

          className="block": makes the <a> tag a block element.
          By default, <a> tags are inline (like <Text> in RN).
          block makes it fill its container width, so the whole
          card area is tappable, not just the text inside.
        */}
        <Link href={`/pokedex/${winner.id}`} className="block">
          {/*
            bg-gradient-to-br: CSS gradient, bottom-right direction.
              to-br = to bottom right (diagonal)
              from-[color] to-[color] define the gradient stops.
            In RN: expo-linear-gradient or react-native-linear-gradient.
            On web: pure CSS, no library needed.

            rounded-3xl: border-radius: 1.5rem (24px) — very rounded.
            overflow-hidden: clips child elements to the rounded corners.
              Without this, the Image would peek out of the corners.
              In RN: overflow: 'hidden' — same prop, same effect.

            shadow-2xl: large drop shadow for depth.
              Equivalent to multiple shadow* props in RN StyleSheet.
              On web: one class handles all shadow dimensions.

            cursor-pointer: shows a hand cursor on hover.
              Web-only concept — mice have cursors, touchscreens don't.
              In RN: no cursor concept exists.
          */}
          <div className={`bg-gradient-to-br ${gradientClass} cursor-pointer overflow-hidden rounded-3xl shadow-2xl`}>
            {/* "THE WHEEL CHOSE..." header text */}
            <div className="px-4 pt-8 pb-2 text-center">
              <p className="mb-2 font-[family-name:var(--font-pixel)] text-[10px] tracking-[0.2em] text-white/70">
                {/*
                  text-white/70: white at 70% opacity.
                  Same /opacity modifier we used on the backdrop.
                  In RN: color: 'rgba(255,255,255,0.7)'

                  text-[10px]: arbitrary font size via square brackets.
                  Tailwind's built-in sizes go from text-xs (12px) down.
                  For 10px specifically we use an arbitrary value.

                  tracking-[0.2em]: letter-spacing: 0.2em.
                  Another arbitrary value for tight control.
                  In RN: letterSpacing: ... (in points, not em)
                */}
                THE WHEEL CHOSE...
              </p>
              <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-white drop-shadow-lg">
                {/*
                  drop-shadow-lg: a CSS filter drop-shadow.
                  Different from box-shadow (shadow-lg):
                  - box-shadow: shadow around the element's box/rectangle
                  - drop-shadow filter: shadow that follows the shape,
                    including transparent areas (great for PNG images and text)
                  In RN: textShadow* props for text, shadow* for views.
                */}
                {displayName}
              </h2>
            </div>

            {/* Pokémon artwork */}
            <div className="relative flex items-center justify-center py-6">
              {/*
                Decorative glow circle behind the sprite.
                absolute: positioned relative to the parent div.
                w-44 h-44: 176px circle.
                bg-white/20: white at 20% opacity — very subtle.
                rounded-full: circle shape.
                blur-2xl: CSS blur filter, creates a soft glow effect.
                  In RN: you'd use a shadow or a blurred View (complex).
                  On web: filter: blur() is one CSS property.
              */}
              <div className="absolute h-44 w-44 rounded-full bg-white/20 blur-2xl" />

              {/*
                  relative z-10: stacks the image above the blur circle.
                  Without z-10, the image would be behind the blur div
                  because it comes later in the DOM.
                  (Actually both are in a flex container so z-index
                  matters here since they're both positioned.)

                  drop-shadow-2xl: intense drop shadow following the
                  Pokémon sprite shape (not a rectangle). The official
                  artwork PNGs have transparent backgrounds so
                  drop-shadow traces the actual Pokémon silhouette.

                  style animation: winnerFloat is defined in the
                  <style> tag at the bottom. It makes the Pokémon
                  gently float up and down — a simple keyframe animation.
                  alternate: plays forward then backward (ping-pong).
                  In RN: Animated.loop(Animated.sequence([...]))
                  On web: CSS keyframes with animation-direction: alternate
                */}
              <Image
                src={artworkUrl}
                width={180}
                height={180}
                alt={winner.name}
                unoptimized
                className="relative z-10 drop-shadow-2xl"
                style={{animation: 'winnerFloat 1.2s ease-in-out infinite alternate'}}
              />
            </div>

            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-white/60">Tap to learn more →</p>
            </div>
          </div>
        </Link>

        {/* SPIN AGAIN button */}
        {/*
          w-full: full width of the container (max-w-sm = 384px).
          mt-4: margin-top 16px — space between card and button.

          active:scale-95: shrinks the button to 95% when pressed.
            CSS :active pseudo-class fires while element is pressed.
            In RN: you get this free with Pressable's pressed state
            or with react-native-reanimated.
            On web: active: Tailwind variant handles it with one class.

          e.stopPropagation() again: same reason as the ✕ button.
          The Link above would fire without this.
        */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSpinAgain();
          }}
          className="bg-pokemon-yellow text-pokemon-black mt-4 w-full rounded-2xl py-4 font-[family-name:var(--font-pixel)] text-sm shadow-lg transition-all duration-150 hover:bg-yellow-300 active:scale-95"
        >
          SPIN AGAIN!
        </button>
      </div>

      {/*
        KEYFRAME ANIMATIONS
        Injected as a raw <style> tag in JSX.

        Why not put these in globals.css?
        You could. But colocating animations with the component
        that uses them is a valid pattern — the animation is
        meaningless outside this component.

        The <style> tag injects CSS into the document <head>.
        Next.js deduplicates these so they're only injected once
        even if the component renders multiple times.

        In RN: you'd define these with Animated API or reanimated.
        On web: @keyframes in CSS, referenced by name in animation:.

        confettiFall: falls from top (-20px) to off-screen (100vh),
          rotating 720° (two full spins) and fading out.
          100vh = 100% of viewport height.

        winnerFloat: gently moves up 14px and scales to 106%.
          Used with animation-direction: alternate (from/to ping-pong).
      */}
      <style>{`
        @keyframes confettiFallLeft {
          0%   { transform: translateY(-60px) translateX(0)      rotate(0deg);    opacity: 1; }
          100% { transform: translateY(105vh) translateX(-160px)  rotate(-800deg); opacity: 0; }
        }
        @keyframes confettiFallRight {
          0%   { transform: translateY(-60px) translateX(0)     rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh) translateX(160px)  rotate(800deg); opacity: 0; }
        }
        @keyframes confettiFallStraight {
          0%   { transform: translateY(-60px) translateX(0)    rotate(0deg);   opacity: 1; }
          45%  { transform: translateY(45vh)  translateX(25px)  rotate(400deg); opacity: 1; }
          100% { transform: translateY(105vh) translateX(-15px) rotate(780deg); opacity: 0; }
        }
        @keyframes winnerFloat {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-14px) scale(1.06); }
        }
      `}</style>
    </div>
  );
};

export default WinnerModal;
