// PATH: app/page.jsx
import Image from "next/image";
import Link from "next/link";

function Section({ className = "", ...props }) {
  return <section className={`relative ${className}`} {...props} />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-primary-dark text-text-primary">
      {/* HERO */}
      <Section className="overflow-hidden">
        {/* decorative gradient blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full blur-3xl opacity-30"
          style={{
            background:
              "radial-gradient(55% 55% at 50% 50%, rgba(6,214,160,0.6) 0%, rgba(6,214,160,0.0) 65%)",
          }}
        />

        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-28 animate-fadeIn">
          <div className="grid items-center gap-8 sm:gap-10 lg:gap-14 lg:grid-cols-12">
            {/* Artwork card */}
            <div className="lg:col-span-7 order-1">
              <div className="rounded-2xl p-[6px] sm:p-2 bg-white/90 shadow-lg ring-1 ring-white/30">
                <div className="relative h-56 sm:h-72 md:h-96 lg:h-[30rem] rounded-xl overflow-hidden bg-transparent">
                  <Image
                    src="/app-hero.png"
                    alt="SafePath — your guide to a safer journey"
                    fill
                    priority
                    className="object-contain"
                    sizes="(min-width: 1024px) 720px, (min-width: 768px) 640px, 100vw"
                  />
                </div>
              </div>
            </div>

            {/* Copy + CTAs */}
            <div className="lg:col-span-5 order-2 text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full glass-effect px-3 py-1 text-xs sm:text-sm">
                <span aria-hidden></span> Safer journeys for walkers & cyclists
              </p>

              <h1 className="mt-5 md:mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
                Find Your Safer Way
              </h1>
              <h2 className="hero-subtitle -mt-1 sm:-mt-2">
                Built for Walkers &amp; Cyclists
              </h2>

              <p className="mt-4 max-w-xl lg:max-w-none mx-auto lg:mx-0 text-base sm:text-lg md:text-xl text-text-secondary leading-relaxed">
                Discover the safest routes in any city with real-time hazard
                data, community insights, and intelligent routing for
                pedestrians and cyclists.
              </p>

              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 lg:justify-start justify-center">
                <Link
                  href="/suggested-routes"
                  className="btn-primary inline-flex items-center gap-2 justify-center"
                >
                  Go Safe
                </Link>
                <Link
                  href="/report-hazards"
                  className="btn-hazard inline-flex items-center gap-2 justify-center"
                >
                  Report Hazard
                </Link>
              </div>

              <p className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-text-secondary">
                Choose safest • fastest — switch anytime
              </p>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
