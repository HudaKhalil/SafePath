'use client';

import React from 'react';

function RouteCard({ route }) {
  const { variant, title, score, eta, distance, highlights, cta } = route;
  const isSafe = variant === 'safe';

  const color = isSafe
    ? {
        ring: 'ring-green-600/30',
        head: 'text-green-700',
        bar: 'bg-green-600',
        pill: 'bg-green-50 text-green-700',
        btn: 'bg-green-600 hover:bg-green-700',
      }
    : {
        ring: 'ring-amber-500/30',
        head: 'text-amber-700',
        bar: 'bg-amber-500',
        pill: 'bg-amber-50 text-amber-700',
        btn: 'bg-amber-500 hover:bg-amber-600',
      };

  return (
    <section className={`card ${color.ring}`}>
      <header className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
            isSafe ? 'bg-green-100' : 'bg-amber-100'
          }`}
        >
          {isSafe ? '🛡️' : '⚡'}
        </span>
        <h3 className={`font-semibold ${color.head}`}>{title}</h3>
      </header>

      <div className="mt-3">
        <p className="text-sm text-neutral-600">Safety Score</p>
        <div className="progress mt-1">
          <div
            className={`h-full rounded-[10px] ${color.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">{score}/100</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">ETA</dt>
          <dd className="font-medium">{eta}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Distance</dt>
          <dd className="font-medium">{distance}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <p className="text-sm text-neutral-600">Highlights</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {highlights.map((h, i) => (
            <span key={i} className={`chip ${color.pill}`}>
              <span className="mr-1">{h.icon}</span>
              {h.label}
            </span>
          ))}
        </div>
      </div>

      <button className={`btn-primary mt-4 w-full ${color.btn}`}>{cta}</button>
    </section>
  );
}

export default function SuggestedRoutesPage() {
  const safeRoute = {
    variant: 'safe',
    title: 'Safe Route',
    score: 92,
    eta: '18 min',
    distance: '4.2 km',
    highlights: [
      { icon: '💡', label: 'Well-lit' },
      { icon: '🚴', label: 'Bike lanes' },
      { icon: '🛡️', label: 'Low crime' },
    ],
    cta: 'View Safe Route',
  };

  const fastRoute = {
    variant: 'fast',
    title: 'Fast Route',
    score: 68,
    eta: '13 min',
    distance: '3.5 km',
    highlights: [
      { icon: '🚗', label: 'Heavy traffic' },
      { icon: '💡', label: 'Some lighting' },
      { icon: '🚴', label: 'Fewer bike lanes' },
    ],
    cta: 'View Fast Route',
  };

  return (
    <main className="mx-auto max-w-screen-sm p-4 pb-24">
     <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <button 
              onClick={() => window.history.back()}
              className="p-2 rounded-lg transition cursor-pointer"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'}
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold">Suggested Routes</h1>
          </div>

      <div className="map-card relative mb-4">
        <div className="h-44 rounded-2xl bg-gradient-to-b from-sky-50 to-emerald-50" />
        <div className="absolute left-5 top-5 flex items-center gap-2">
          <span className="chip bg-green-600 text-white">Safe Route</span>
          <span className="chip bg-amber-500 text-white">Fast Route</span>
        </div>
        <div className="absolute right-5 top-5">
          <span className="icon-btn bg-white/90">🏁</span>
        </div>
        <div className="absolute left-4 bottom-4 rounded-full bg-black/80 px-2 py-1 text-white">
          📍
        </div>
      </div>

      <RouteCard route={safeRoute} />
      <div className="mt-3">
        <RouteCard route={fastRoute} />
      </div>
    </main>
  );
}
