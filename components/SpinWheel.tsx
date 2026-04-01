'use client';

/*
  components/SpinWheel.tsx

  The main spin wheel component.

  ============================================================
  WHY CANVAS?
  ============================================================

  The wheel is drawn on an HTML <canvas> element rather than
  with React JSX + CSS. Here's why:

  A spinning pie chart with images inside each slice is very
  hard to do with CSS. You'd need CSS clip-path tricks, SVG,
  or lots of transform math on absolutely positioned divs.

  Canvas gives us a raw 2D drawing API where we imperatively
  draw exactly what we want: arcs, images, text at angles.
  It's the right tool for this job.

  The trade-off: canvas drawing is IMPERATIVE (tell the browser
  exactly what to draw) vs React's DECLARATIVE model (describe
  what the UI should look like). We manage this with a useEffect
  that redraws the canvas whenever relevant state changes.

  In React Native: you'd use react-native-canvas, react-native-svg,
  or a library like react-native-wheel-pick. The web has the
  native Canvas API built into every browser for free.

  ============================================================
  REQUESTANIMATIONFRAME
  ============================================================

  requestAnimationFrame (rAF) is the browser's animation loop.
  It calls your function before each screen repaint (~60fps).

  It's like setInterval(fn, 16) but smarter:
  - Synced to the display's refresh rate
  - Pauses when the tab is in the background (saves battery)
  - Smoother than setInterval (no timer drift)

  In RN: Animated.timing() or reanimated handle the animation
  loop for you. On web with canvas, you drive it yourself with rAF.
*/

import {useState, useEffect, useRef, useCallback} from 'react';
import Image from 'next/image';
import WinnerModal, {WheelPokemon} from '@/components/WinnerModal';
import {capitalize, formatPokemonId} from '@/lib/api';

const MAX_SLOTS = 6;
const MIN_TO_SPIN = 2;
const SPIN_DURATION = 2500; // ms

// Ben's favorites — Bulbasaur, Charmander, Squirtle, Eevee, Jolteon, Pansage
const BENS_FAVORITES_IDS = [1, 4, 7, 133, 135, 511];

// Type → hex color for canvas slice fills
const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

// Fetch a single Pokémon and return just what the wheel needs
const fetchPokemon = async (idOrName: number | string): Promise<WheelPokemon | null> => {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`, {
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      name: data.name,
      sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`,
      primaryType: data.types[0].type.name,
    };
  } catch {
    return null;
  }
};

/*
  drawWheel — the canvas drawing function.

  Called on every animation frame during spin, and whenever
  the pokemon list or sprites change.

  Parameters:
  - canvas: the DOM canvas element
  - pokemon: current list of Pokémon on the wheel
  - rotation: current rotation angle in radians
  - sprites: preloaded HTMLImageElement objects, keyed by Pokémon ID
*/
const drawWheel = (
  canvas: HTMLCanvasElement,
  pokemon: WheelPokemon[],
  rotation: number,
  sprites: Record<number, HTMLImageElement>
) => {
  /*
    getContext("2d"): gets the 2D drawing context — the object with
    all the drawing methods (arc, fillText, drawImage, etc).
    Think of it as the "paintbrush" for the canvas element.
    There's no React equivalent — this is a direct browser API.
  */
  const ctx = canvas.getContext('2d');
  if (!ctx || pokemon.length === 0) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 8; // 8px padding so the wheel doesn't touch the edge

  // Every slice gets an equal share of the full circle (2π radians = 360°)
  const sliceAngle = (2 * Math.PI) / pokemon.length;

  /*
    clearRect: wipes the canvas clean before redrawing.
    This is called on every animation frame (~60fps during spin).
    Without it, each frame would draw ON TOP of the previous frame
    and you'd get a smeared mess.

    In RN: React's reconciler figures out what changed and updates
    only those parts. Canvas has no reconciler — you manually clear
    and redraw everything from scratch on every frame.
  */
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  pokemon.forEach((p, i) => {
    /*
      THE -π/2 OFFSET — the most important line in this function.

      Canvas angles work like a clock where 3 o'clock = 0 radians,
      and angles increase CLOCKWISE:
        0       = 3 o'clock  (right)
        π/2     = 6 o'clock  (bottom)
        π       = 9 o'clock  (left)
        3π/2    = 12 o'clock (top)
        -π/2    = 12 o'clock (top) — same as 3π/2, just negative

      By subtracting π/2 from every angle, we shift the entire
      wheel so that slice 0 starts at 12 o'clock instead of 3 o'clock.
      This makes the spin math intuitive: rotation=0 means slice 0
      is at the top, under the pointer. No more offset confusion.

      In RN: coordinate systems are top-left origin, Y increases downward.
      Canvas is the same — the -π/2 offset is purely about where
      "angle zero" is on a circle in canvas's coordinate system.
    */
    const startAngle = rotation + i * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2; // center of this slice

    /*
      Drawing a pie slice:
      1. beginPath() — start a new shape (like lifting a pen off paper)
      2. moveTo(cx, cy) — move to the center of the wheel
      3. arc() — draw a curved line from startAngle to endAngle
      4. closePath() — draw a straight line back to (cx, cy)
      5. fill() — fill the enclosed shape with color
      6. stroke() — draw the border

      arc(x, y, radius, startAngle, endAngle):
        x, y: center of the circle
        radius: how big
        startAngle/endAngle: in radians, clockwise from 3 o'clock
                             (offset above shifts this to 12 o'clock)
    */
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = TYPE_COLORS[p.primaryType] ?? '#A8A878';
    ctx.fill();

    // White dividing line between slices
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw the Pokémon sprite inside the slice
    const img = sprites[p.id];
    if (img) {
      /*
    Size the sprite relative to the arc width of its slice.
    placementRadius * sliceAngle gives the arc length of the slice
    at the sprite's distance from center — i.e. how wide the slice
    is at that point. We size the sprite to 85% of that width.
    Math.min caps it on wheels with very few slices (2-3 Pokémon)
    so sprites don't overflow into adjacent slices.
    In RN: you'd calculate this the same way — just geometry.
  */
      const placementRadius = radius * 0.58;
      const arcWidthAtPlacement = placementRadius * sliceAngle;
      const spriteSize = Math.min(arcWidthAtPlacement * 1.2, radius * 0.78, 84);

      const sx = cx + placementRadius * Math.cos(midAngle) - spriteSize / 2;
      const sy = cy + placementRadius * Math.sin(midAngle) - spriteSize / 2;

      ctx.save();
      ctx.translate(sx + spriteSize / 2, sy + spriteSize / 2);
      ctx.drawImage(img, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.restore();
    }

    /*
  ARC TEXT — name runs along the outer edge of the slice.

  Canvas has no native "text on a path" API (unlike SVG).
  We simulate it by drawing each character individually,
  rotating the context slightly between each one so they
  follow the curve of the arc.

  Steps:
  1. Measure total pixel width of the full name string
  2. Convert that to radians (angularWidth = pixelWidth / radius)
  3. Start half that angle before midAngle so the name is centered
  4. Draw each character, advancing along the arc by its own width

  textBaseline "top": characters hang downward from the arc line
  so their tops sit on the curve — like text printed on the rim.

  In RN: you'd need react-native-svg's <TextPath> for this effect.
  On web canvas: manual character-by-character rotation is the
  standard technique.
*/
    const name = capitalize(p.name);
    const textRadius = radius * 0.88;
    const fontSize = Math.max(11, Math.min(16, radius * 0.085));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 3;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    // Measure total angular width the full name will occupy
    let totalTextWidth = 0;
    for (const char of name) {
      totalTextWidth += ctx.measureText(char).width;
    }
    const totalAngle = totalTextWidth / textRadius;

    // Start before midAngle by half the total width → centers the name
    let charAngle = midAngle - totalAngle / 2;

    for (const char of name) {
      const charWidth = ctx.measureText(char).width;
      const charAngularWidth = charWidth / textRadius;

      ctx.save();
      ctx.translate(cx, cy);
      /*
    Rotate to the character's position along the arc, then add π/2.
    Without +π/2, the character would be rotated 90° sideways
    (pointing toward the center instead of standing upright).
    The +π/2 corrects its orientation so it reads normally
    from the outside of the wheel inward.
  */
      ctx.rotate(charAngle + charAngularWidth / 2 + Math.PI / 2);
      ctx.fillText(char, 0, -textRadius);
      ctx.restore();

      charAngle += charAngularWidth;
    }

    // Reset canvas state — always clean up after custom text rendering
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
  });

  /*
    Center circle — drawn AFTER the slices so it sits on top.
    Covers the messy point where all slice edges meet at center.
    Canvas draws in order — later calls paint over earlier ones.
    In RN: z-index or component order determines layering.
    On web with canvas: draw order IS the z-order.
  */
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 2;
  ctx.stroke();

  /*
    Pointer triangle — drawn LAST so it's always on top of everything.
    Fixed at the top of the canvas (y=0), pointing down toward the wheel.
    This is the indicator that shows which slice wins when the wheel stops.

    The triangle vertices:
      Top-left:  (cx - pw/2, 0)  — top edge of canvas
      Top-right: (cx + pw/2, 0)  — top edge of canvas
      Tip:       (cx, ph)        — pointing down into the wheel

    It never rotates — it's drawn in absolute canvas coordinates,
    not inside a save/restore rotation block. The wheel spins under it.
  */
  const pw = 16;
  const ph = 28;
  ctx.beginPath();
  ctx.moveTo(cx - pw / 2, 0);
  ctx.lineTo(cx + pw / 2, 0);
  ctx.lineTo(cx, ph);
  ctx.closePath();
  ctx.fillStyle = '#FF1111';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.fill();
  /*
    Reset shadowBlur to 0 after the pointer.
    If we don't reset it, every subsequent draw call in this
    frame would also have a shadow — including the next clearRect.
    Always clean up canvas state you don't want to persist.
  */
  ctx.shadowBlur = 0;
};

const SpinWheel = () => {
  // The Pokémon currently on the wheel
  const [pokemon, setPokemon] = useState<WheelPokemon[]>([]);

  /*
    sprites: preloaded HTMLImageElement objects for canvas drawing.
    Canvas's drawImage() needs an actual HTMLImageElement, not a URL.
    We load each sprite image once and cache it here.

    Record<number, HTMLImageElement>: TypeScript for a plain object
    with number keys and HTMLImageElement values.
    { 25: <img>, 1: <img>, ... }
  */
  const [sprites, setSprites] = useState<Record<number, HTMLImageElement>>({});

  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelPokemon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{id: number; name: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  /*
    useRef for values that should NOT trigger re-renders when changed.

    canvasRef: reference to the actual DOM canvas element.
      In RN: ref on a View gives you the native component instance.
      On web: ref on a DOM element gives you the HTMLElement.
      We use it to call canvas.getContext("2d") for drawing.

    rotationRef: stores the current wheel rotation.
      Why useRef instead of useState?
      During the animation loop (requestAnimationFrame), we update
      rotation on every frame (~60fps). If we used useState, that
      would trigger 60 React re-renders per second — terrible for
      performance. useRef lets us update a value without re-rendering.
      We only use state for values that should update the UI when changed.

    animFrameRef: stores the rAF handle so we can cancel it on unmount.
      Same pattern as storing a timer ID to clear it later.
  */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  // Load a sprite image for canvas drawing
  const loadSprite = (p: WheelPokemon) => {
    /*
      new window.Image(): creates an HTMLImageElement.
      We use window.Image explicitly (not just Image) to avoid
      confusion with Next.js's <Image> component which is imported above.
      Setting .src starts the browser loading the image.
      .onload fires when the image is ready to draw on canvas.
    */
    const img = new window.Image();
    img.src = p.sprite;
    img.onload = () => {
      /*
        Functional state update: always use (prev) => {...prev, ...}
        when adding to an object in state, same as in React Native.
        This prevents stale closure issues if multiple sprites load
        at the same time.
      */
      setSprites((prev) => ({...prev, [p.id]: img}));
    };
  };

  // Load Ben's favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoadingFavorites(true);
      const results = await Promise.all(BENS_FAVORITES_IDS.map(fetchPokemon));
      const valid = results.filter(Boolean) as WheelPokemon[];
      setPokemon(valid);
      valid.forEach(loadSprite);
      setIsLoadingFavorites(false);
    };
    loadFavorites();
  }, []); // Empty array = run once on mount, same as RN

  /*
    Redraw the canvas whenever pokemon list or sprites change.
    This is the "declarative → imperative" bridge:
    React state changes → useEffect → manual canvas redraw.

    In RN: React re-renders the component tree automatically.
    With canvas: we have to manually trigger redraws.
  */
  useEffect(() => {
    if (canvasRef.current && pokemon.length > 0) {
      drawWheel(canvasRef.current, pokemon, rotationRef.current, sprites);
    }
  }, [pokemon, sprites]);

  // Reset wheel to Ben's favorites
  const loadBensFavorites = async () => {
    setIsLoadingFavorites(true);
    const results = await Promise.all(BENS_FAVORITES_IDS.map(fetchPokemon));
    const valid = results.filter(Boolean) as WheelPokemon[];
    setPokemon(valid);
    valid.forEach(loadSprite);
    setIsLoadingFavorites(false);
  };

  // Add a random Pokémon from the full national dex (1-1025)
  const addRandom = async () => {
    setIsLoadingRandom(true);
    const ids = new Set<number>();
    while (ids.size < MAX_SLOTS) {
      ids.add(Math.floor(Math.random() * 1025) + 1);
    }
    const results = await Promise.all([...ids].map(fetchPokemon));
    const valid = results.filter(Boolean) as WheelPokemon[];
    setPokemon(valid);
    valid.forEach(loadSprite);
    setIsLoadingRandom(false);
  };

  /*
    useCallback memoizes the search function.
    Without useCallback, handleSearch would be a new function
    reference on every render, which is wasteful.
    Same concept in RN — useCallback works identically.
  */
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Fetch all 1025 Pokémon names and filter client-side
      // PokéAPI doesn't have a server-side search endpoint
      const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
      const data = await res.json();
      const lower = query.toLowerCase().trim();
      const matches = data.results
        .filter((p: {name: string}) => p.name.includes(lower))
        .slice(0, 6)
        .map((p: {name: string; url: string}) => ({
          name: p.name,
          id: parseInt(p.url.split('/').filter(Boolean).pop() ?? '0'),
        }));
      setSearchResults(matches);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const addFromSearch = async (id: number) => {
    if (pokemon.length >= MAX_SLOTS) return;
    if (pokemon.some((p) => p.id === id)) return;
    const p = await fetchPokemon(id);
    if (!p) return;
    setPokemon((prev) => [...prev, p]);
    loadSprite(p);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removePokemon = (id: number) => {
    setPokemon((prev) => prev.filter((p) => p.id !== id));
  };

  // THE SPIN FUNCTION
  const spin = () => {
    if (isSpinning || pokemon.length < MIN_TO_SPIN) return;

    const sliceAngle = (2 * Math.PI) / pokemon.length;

    /*
    Pick a random winner index.
    
    With our -π/2 offset in drawWheel, the wheel looks like this at rotation=0:
      - Slice 0 occupies angles: -π/2 to -π/2 + sliceAngle  (straddles 12 o'clock)
      - The pointer is at exactly 12 o'clock = the START of slice 0
    
    So the winner is whichever slice is at the top when the wheel stops.
    The top of the wheel = rotation 0 in our coordinate system.
    
    To land slice [winnerIndex] at the top, we need:
      rotation + winnerIndex * sliceAngle = 0  (mod 2π)
      rotation = -winnerIndex * sliceAngle     (mod 2π)
    
    We also want the slice CENTER under the pointer, not the edge, so:
      rotation = -(winnerIndex * sliceAngle + sliceAngle / 2)
    
    Then add full spins for the animation effect.
  */
    const winnerIndex = Math.floor(Math.random() * pokemon.length);

    // Current rotation normalized to 0..2π
    const currentNorm = ((rotationRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Target: center of winning slice sits at the top (rotation = 0 point)
    const targetNorm = 2 * Math.PI - (winnerIndex * sliceAngle + sliceAngle / 2);

    // How far forward to rotate to reach the target
    let delta = (targetNorm - currentNorm + 2 * Math.PI) % (2 * Math.PI);
    if (delta < 0.1) delta += 2 * Math.PI; // ensure at least a small forward spin

    // Add full rotations for the dramatic spin effect
    const fullSpins = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
    const totalRotation = fullSpins + delta;

    const startRotation = rotationRef.current;
    const startTime = performance.now();

    setIsSpinning(true);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentRotation = startRotation + totalRotation * eased;

      rotationRef.current = currentRotation;

      if (canvasRef.current) {
        drawWheel(canvasRef.current, pokemon, currentRotation, sprites);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setWinner(pokemon[winnerIndex]);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // Cancel any in-progress animation when component unmounts
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const canSpin = pokemon.length >= MIN_TO_SPIN && !isSpinning;
  const isFull = pokemon.length >= MAX_SLOTS;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Action buttons */}
      {/*
        flex-wrap: allows buttons to wrap to a second line on very
        small screens. Without flex-wrap, they'd overflow horizontally.
        In RN: flexWrap: 'wrap' — same prop, same value.
      */}
      <div className="flex w-full flex-wrap justify-center gap-2">
        <button
          onClick={loadBensFavorites}
          disabled={isLoadingFavorites || isSpinning || isLoadingRandom}
          className="bg-pokemon-yellow text-pokemon-black flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-md transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingFavorites ? 'Loading...' : "⭐ Ben's Favorites"}
        </button>
        <button
          onClick={addRandom}
          disabled={isLoadingRandom || isSpinning}
          className="bg-pokemon-blue flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingRandom ? 'Adding...' : '🎲 Random'}
        </button>
      </div>

      {/* Canvas wheel */}
      {/*
        relative: establishes a positioning context for the
        empty-state overlay div inside.
        In RN: any View is a positioning context for absolute children.
        On web: you need position: relative explicitly.
      */}
      <div className="relative">
        {/*
          <canvas> is an HTML element that gives you a 2D drawing surface.
          width/height are the canvas's internal resolution in pixels.
          These are NOT CSS dimensions — they're the drawing buffer size.

          style={{ touchAction: "none" }}: prevents the browser from
          intercepting touch events for scrolling/zooming on the canvas.
          Without this, touching the canvas on mobile might scroll the
          page instead of registering as a canvas touch.
          In RN: this is handled automatically by gesture responders.
          On web: you explicitly opt out of browser touch handling.
        */}
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="rounded-full shadow-2xl"
          style={{touchAction: 'none'}}
        />

        {/* Empty state — shown before any Pokémon are loaded */}
        {pokemon.length === 0 && !isLoadingFavorites && (
          /*
            absolute inset-0: covers the entire canvas.
            flex items-center justify-center: centers the message.
            rounded-full: matches the canvas's rounded corners.
          */
          <div className="bg-pokemon-lightgray absolute inset-0 flex items-center justify-center rounded-full">
            <p className="text-pokemon-gray px-8 text-center text-sm">Add some Pokémon to spin!</p>
          </div>
        )}
      </div>

      {/* SPIN button */}
      <button
        onClick={spin}
        disabled={!canSpin}
        /*
          Template literal for conditional className.
          canSpin determines which set of classes to apply.

          In RN: style={[styles.button, !canSpin && styles.disabled]}
          On web: className={`base ${condition ? 'active' : 'inactive'}`}

          For more complex cases, the `clsx` or `cn` utility is cleaner.
        */
        className={`rounded-full px-12 py-4 font-[family-name:var(--font-pixel)] text-lg shadow-xl transition-all duration-150 active:scale-95 ${
          canSpin
            ? 'bg-pokemon-red hover:bg-pokemon-darkred text-white'
            : 'bg-pokemon-lightgray text-pokemon-gray cursor-not-allowed'
        } `}
      >
        {/*
          Dynamic button label based on state.
          Shows different text for: spinning, not enough Pokémon, ready.
        */}
        {isSpinning
          ? 'SPINNING...'
          : pokemon.length < MIN_TO_SPIN
            ? `NEED ${MIN_TO_SPIN - pokemon.length} MORE`
            : 'SPIN!'}
      </button>

      {/* Current Pokémon chips */}
      {pokemon.length > 0 && (
        <div className="w-full">
          <div className="mb-2 flex items-center justify-center gap-3">
            <p className="text-pokemon-gray text-xs font-medium tracking-wide uppercase">
              On the wheel ({pokemon.length}/{MAX_SLOTS})
            </p>
            <button
              onClick={() => setPokemon([])}
              disabled={isSpinning}
              className="text-pokemon-gray border-pokemon-lightgray hover:border-pokemon-red hover:text-pokemon-red rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed"
            >
              Clear all
            </button>
          </div>
          {/*
            flex-wrap justify-center: pill chips wrap to multiple
            lines and stay centered. On mobile with 6 chips this
            might be 2-3 rows — flex-wrap handles it gracefully.
            In RN: flexWrap: 'wrap' + justifyContent: 'center'
          */}
          <div className="flex flex-wrap justify-center gap-2">
            {pokemon.map((p) => (
              <div
                key={p.id}
                /*
                  Pill chip: rounded-full with padding on right,
                  less padding on left to accommodate the sprite image.
                  pl-1 pr-3: asymmetric horizontal padding.
                  In RN: paddingLeft/paddingRight with different values.
                */
                className="border-pokemon-lightgray flex items-center gap-1.5 rounded-full border bg-white py-1 pr-3 pl-1 shadow-sm"
              >
                <Image src={p.sprite} width={28} height={28} alt={p.name} unoptimized />
                <span className="text-pokemon-black text-xs font-medium capitalize">{capitalize(p.name)}</span>
                <button
                  onClick={() => removePokemon(p.id)}
                  disabled={isSpinning}
                  className="text-pokemon-gray hover:text-pokemon-red ml-0.5 text-xs transition-colors disabled:cursor-not-allowed"
                  aria-label={`Remove ${p.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search to add Pokémon */}
      {!isFull && (
        <div className="w-full max-w-md">
          <div className="relative">
            <span className="text-pokemon-gray pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search any Pokémon to add..."
              disabled={isSpinning}
              className="border-pokemon-lightgray focus:ring-pokemon-red text-pokemon-black placeholder:text-pokemon-gray w-full rounded-full border bg-white py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
            />
          </div>

          {isSearching && (
            <div className="text-pokemon-gray flex items-center gap-2 px-2 py-3 text-sm">
              {/*
                CSS spinner: a div styled as a circle with a transparent
                quarter and animated rotation.

                w-4 h-4: 16px circle
                border-2: 2px border all around
                border-pokemon-red: red border
                border-t-transparent: top border transparent = the "gap"
                rounded-full: circle shape
                animate-spin: Tailwind's built-in spin animation
                  (rotate 360° continuously)

                In RN: <ActivityIndicator color="#FF1111" />
                On web: this CSS trick is the common lightweight alternative
                to importing a spinner component or animation library.
              */}
              <div className="border-pokemon-red h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
              Searching...
            </div>
          )}

          {searchResults.length > 0 && (
            /*
              Search results dropdown.
              overflow-hidden on the container clips children to
              the rounded corners (same as the card pattern elsewhere).
            */
            <div className="border-pokemon-lightgray mt-2 overflow-hidden rounded-2xl border bg-white shadow-lg">
              {searchResults.map((result) => {
                const onWheel = pokemon.some((p) => p.id === result.id);
                return (
                  <button
                    key={result.id}
                    onClick={() => !onWheel && addFromSearch(result.id)}
                    disabled={onWheel || isFull}
                    /*
                      border-b last:border-0:
                      Add a bottom border to every row EXCEPT the last one.
                      last: is a Tailwind pseudo-class variant that applies
                      styles to the last child element.
                      In RN: you'd check index === arr.length - 1 in the map.
                      On web: CSS handles it without any JS logic.
                    */
                    className="hover:bg-pokemon-lightgray border-pokemon-lightgray flex w-full items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-0 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Image
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${result.id}.png`}
                      width={32}
                      height={32}
                      alt={result.name}
                      unoptimized
                    />
                    <span className="text-pokemon-black flex-1 text-sm font-medium capitalize">
                      {capitalize(result.name)}
                    </span>
                    <span className="text-pokemon-gray text-xs">{formatPokemonId(result.id)}</span>
                    {onWheel && <span className="text-pokemon-red text-xs font-medium">On wheel</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isFull && (
        <p className="text-pokemon-gray text-center text-xs">Wheel is full! Remove a Pokémon to add another.</p>
      )}

      {/* Winner modal — rendered when winner state is set */}
      {winner && <WinnerModal winner={winner} onClose={() => setWinner(null)} onSpinAgain={() => setWinner(null)} />}
    </div>
  );
};

export default SpinWheel;
