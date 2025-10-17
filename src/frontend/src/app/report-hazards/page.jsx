'use client';

import React, { useState, useRef } from 'react';

export default function ReportHazardPage() {
  const [address, setAddress] = useState('xyz street, Dublin, Ireland');
  const [hazard, setHazard] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const MAX_SIZE = 5 * 1024 * 1024;

  const hazards = [
    'Pothole',
    'Poor lighting',
    'Roadworks',
    'Dangerous Area',
    'Flooding',
    'Traffic issue',
  ];

  const pickFile = () => inputRef.current?.click();

  const onFileChange = (e) => {
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
  };

  const useCurrentLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setAddress(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
      },
      () => setError('Unable to fetch location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = (e) => {
    e.preventDefault();
    setError(null);

    if (!hazard) {
      setError('Please choose a hazard type.');
      return;
    }

    const payload = new FormData();
    payload.append('address', address);
    payload.append('hazard', hazard);
    if (file) payload.append('photo', file);

    console.log('Submitted hazard report', { address, hazard, file });
    alert('Hazard report submitted (demo).');
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
            <h1 className="text-xl sm:text-2xl font-bold">Report Hazard</h1>
          </div>

      <form onSubmit={submit} className="space-y-4">
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

        <section className="card">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-red-500">🔔</span>
            <h2 className="font-medium">What type of hazard is it?</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {hazards.map((h) => {
              const selected = hazard === h;
              const icons = {
                Pothole: '🕳️',
                'Poor lighting': '💡',
                Roadworks: '🚧',
                'Dangerous Area': '⚠️',
                Flooding: '🌧️',
                'Traffic issue': '🚦',
              };
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHazard(h)}
                  className={`hazard-tile ${selected ? 'tile-selected' : ''}`}
                >
                  <span className="text-2xl mb-1">{icons[h]}</span>
                  <span className="font-medium">{h}</span>
                </button>
              );
            })}
          </div>
        </section>

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

        {error && <p className="text-sm text-red-600">{error}</p>}

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
