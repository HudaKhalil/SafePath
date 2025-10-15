'use client';

import { useState, useRef } from 'react';

type HazardType =
  | 'Pothole'
  | 'Poor lighting'
  | 'Roadworks'
  | 'Dangerous Area'
  | 'Debris'
  | 'Traffic issue';

const HAZARDS: HazardType[] = [
  'Pothole',
  'Poor lighting',
  'Roadworks',
  'Dangerous Area',
  'Debris',
  'Traffic issue',
];

export default function ReportHazardPage() {
  const [address, setAddress] = useState('xyz street, Dublin, Ireland');
  const [hazard, setHazard] = useState<HazardType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setError('File must be ≤ 5MB.');
      e.target.value = '';
      setFile(null);
      return;
    }
    setFile(f);
  }

  function useCurrentLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // In real app, call your backend to reverse-geocode lat/lng to a street address.
        setAddress(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
      },
      () => setError('Unable to fetch current location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hazard) {
      setError('Please choose a hazard type.');
      return;
    }

    // Build form payload
    const payload = new FormData();
    payload.append('address', address);
    payload.append('hazard', hazard);
    if (file) payload.append('photo', file);

    // TODO: POST to your backend endpoint, e.g. /api/hazards
    // await fetch('/api/hazards', { method: 'POST', body: payload });

    console.log('Submitted hazard report', { address, hazard, file });
    alert('Hazard report submitted (demo). Wire to backend next.');
  }

  return (
    <main className="mx-auto max-w-screen-sm p-4 pb-24">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => history.back()}
          aria-label="Back"
          className="icon-btn"
        >
          ←
        </button>
        <h1 className="text-lg font-semibold">Report hazard</h1>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Address card */}
        <section className="card">
          <div className="flex items-start gap-3">
            <div className="icon-badge bg-red-50 text-red-600">📍</div>
            <div className="flex-1">
              <p className="font-semibold">{address.split(',')[0]}</p>
              <p className="text-sm text-neutral-600">
                {address.split(',').slice(1).join(', ') || 'Ireland'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="btn-outlined-red mt-4 w-full"
          >
            Use current location
          </button>
        </section>

        {/* Hazard type grid */}
        <section className="card">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-red-500">🔔</span>
            <h2 className="font-medium">What type of hazard is it?</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {HAZARDS.map((h) => {
              const selected = hazard === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHazard(h)}
                  className={`hazard-tile ${selected ? 'tile-selected' : ''}`}
                  aria-pressed={selected}
                >
                  <span className="text-2xl mb-1">
                    {
                      {
                        'Pothole': '🕳️',
                        'Poor lighting': '💡',
                        'Roadworks': '🚧',
                        'Dangerous Area': '⚠️',
                        'Debris': '🧹',
                        'Traffic issue': '🚦',
                      }[h]
                    }
                  </span>
                  <span className="font-medium">{h}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Photo upload */}
        <section className="card">
          <div className="mb-2 flex items-center gap-2">
            <span>📷</span>
            <h2 className="font-medium">Add photos</h2>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            hidden
          />

          <div
            role="button"
            tabIndex={0}
            onClick={pickFile}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pickFile()}
            className={`upload-zone ${file ? 'has-file' : ''}`}
          >
            {!file ? (
              <div className="text-center">
                <div className="mb-2 text-2xl">📸</div>
                <p className="font-semibold">Upload photo</p>
                <p className="text-sm text-neutral-600">Up to 5MB</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-neutral-600">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button type="submit" className="btn-solid-red">
            Submit hazard report
          </button>
          <button
            type="button"
            onClick={() => history.back()}
            className="btn-ghost-red"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
