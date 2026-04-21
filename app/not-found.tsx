import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="animate-fade-in">
      <section className="from-pokemon-red to-pokemon-darkred bg-gradient-to-br">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h1 className="text-pokemon-yellow mb-2 font-[family-name:var(--font-pixel)] text-5xl md:text-6xl">404</h1>
            <p className="mb-2 text-2xl font-semibold text-white/90">Page Not Found</p>
            <p className="mb-8 text-lg text-white/70">This page doesn't exist.</p>
            <Link
              href="/"
              className="bg-pokemon-yellow text-pokemon-black my-2 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors duration-200 hover:bg-yellow-300"
            >
              Back Home →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
