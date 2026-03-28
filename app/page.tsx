import { GlobalExpansion } from "@/components/GlobalExpansion";
import { Onboarding } from "@/components/Onboarding";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <header className="relative overflow-hidden border-b border-heritage-walnut/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 40%, var(--accent) 0%, transparent 45%),
              radial-gradient(circle at 80% 60%, var(--foreground) 0%, transparent 40%)`,
          }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16 sm:px-8 sm:py-24 md:py-28">
          <p className="font-serif text-sm tracking-[0.2em] uppercase text-heritage-walnut/60">
            Raah · راہ
          </p>
          <h1 className="font-serif text-4xl leading-[1.1] text-heritage-walnut sm:text-5xl md:text-6xl max-w-3xl">
            The path from maker to market — with dignity.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-heritage-walnut/80 sm:text-xl">
            Kashmir Node Zero welcomes artisans who weave, carve, and shape
            heritage. Begin a few gentle steps to introduce your craft to the
            world.
          </p>
          <div className="flex h-px w-24 bg-heritage-gold" aria-hidden />
          <div>
            <a
              href="#onboarding"
              className="inline-flex min-h-14 min-w-[12rem] items-center justify-center rounded-xl bg-heritage-walnut px-8 text-base font-medium text-heritage-cream transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-heritage-gold focus-visible:ring-offset-2 focus-visible:ring-offset-heritage-cream"
            >
              Begin your path
            </a>
          </div>
        </div>
      </header>

      <main
        id="onboarding"
        className="flex-1 bg-gradient-to-b from-background to-heritage-cream"
      >
        <Onboarding />
      </main>

      <GlobalExpansion />

      <footer className="border-t border-heritage-walnut/10 py-8 text-center text-sm text-heritage-walnut/50">
        Raah — trust and discovery for craft economies.
      </footer>
    </div>
  );
}
