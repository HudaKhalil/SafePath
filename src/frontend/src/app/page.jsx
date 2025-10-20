
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-primary-dark text-text-primary">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-28 text-center">
          <h1 className="hero-title">Navigate</h1>
          <h2 className="hero-subtitle">Safely &amp; Smart</h2>

          <p className="max-w-3xl mx-auto text-lg md:text-xl text-text-secondary leading-relaxed">
            Discover the safest routes with real-time hazard data,
            community insights, and intelligent routing for pedestrians and cyclists.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/suggested-routes" className="btn-primary inline-flex items-center gap-2 justify-center">
              🗺️ Find Safe Routes
            </Link>
           
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
            <article className="card p-8 text-center">
              <div className="mx-auto mb-6 h-14 w-14 rounded-full flex items-center justify-center bg-accent/15">
                <span className="text-2xl">🧭</span>
              </div>
              <h3 className="text-2xl font-semibold text-primary-dark mb-2">Smart Routing</h3>
              <p className="text-slate-600">
                Safety-aware paths using live conditions, hazards, and comfortable streets.
              </p>
            </article>

            <article className="card p-8 text-center">
              <div className="mx-auto mb-6 h-14 w-14 rounded-full flex items-center justify-center bg-accent/15">
                <span className="text-2xl">📣</span>
              </div>
              <h3 className="text-2xl font-semibold text-primary-dark mb-2">Community Alerts</h3>
              <p className="text-slate-600">
                Report and view hazards like poor lighting, roadworks, or blocked lanes.
              </p>
            </article>

            <article className="card p-8 text-center">
              <div className="mx-auto mb-6 h-14 w-14 rounded-full flex items-center justify-center bg-accent/15">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-2xl font-semibold text-primary-dark mb-2">Find Buddies</h3>
              <p className="text-slate-600">
                Connect with nearby walkers and cyclists for safer, social journeys.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white text-primary-dark">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Navigate Safely?</h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Pick safest, fastest, or balanced routes—then go with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/suggested-routes" className="btn-primary inline-flex items-center gap-2 justify-center">
              🚀 Start Routing
            </Link>
            <Link href="/find-buddy" className="inline-flex items-center gap-2 justify-center px-6 py-3 rounded-lg font-semibold
              bg-primary-dark text-text-primary hover:bg-primary transition-all duration-200 shadow-lg hover:shadow-xl">
              👥 Find a Buddy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
