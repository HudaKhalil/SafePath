
export async function geocodeDestination(query) {
  if (!query || !query.trim()) throw new Error("Please enter a destination.");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error("Destination lookup failed.");
  const data = await res.json();
  if (!data?.length) throw new Error("Destination not found.");
  const { lat, lon } = data[0];
  return [parseFloat(lon), parseFloat(lat)]; // [lng, lat]
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        resolve([longitude, latitude]); // [lng, lat]
      },
      (err) => reject(new Error(err.message || "Could not get your location.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// OSRM public demo server – fine for dev; replace with your own in prod.
export async function fetchFastestRoute(originLngLat, destLngLat, profile = "cycling") {
  const [olng, olat] = originLngLat;
  const [dlng, dlat] = destLngLat;

  // profiles: walking, cycling
  const mode = profile === "walking" ? "foot" : profile; // keep "cycling" default
  const url = new URL(`https://router.project-osrm.org/route/v1/${mode}/${olng},${olat};${dlng},${dlat}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("annotations", "false");

  const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Routing request failed.");
  const data = await res.json();
  if (!data?.routes?.length) throw new Error("No route found.");
  const r = data.routes[0];

  return {
    id: "fast-OSRM",
    safety_score: null,             // we’re doing fastest only (no safety yet)
    distance: r.distance,           // meters
    duration: r.duration,           // seconds
    coordinates: r.geometry.coordinates, // [lng, lat] pairs
    risk_areas: [],                 // none for now
  };
}
