"use client";
import { useMemo, useState } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import MapViewCard from "@/components/MapViewCard";
import RouteButtons from "@/components/RouteButtons";
import AdCard from "@/components/AdCard";
import BottomNav from "@/components/BottomNav";
import SidebarRail from "@/components/SidebarRail";

export default function HomePage() {
  const [destination, setDestination] = useState(null);

  // Dublin center
  const center = [53.3498, -6.2603];

  // Demo routes: arrays of [lng, lat]
  const routes = useMemo(
    () => [
      {
        id: "safe-1",
        safety_score: 82,
        distance: 3200,
        duration: 900,
        coordinates: [
          [-6.2675, 53.3463],
          [-6.2652, 53.3476],
          [-6.2622, 53.3489],
          [-6.2603, 53.3498],
        ],
        risk_areas: [{ risk_type: "Low lighting" }, { risk_type: "Traffic", severity: "Low" }],
      },
      {
        id: "fast-1",
        safety_score: 62,
        distance: 2900,
        duration: 780,
        coordinates: [
          [-6.276, 53.345],
          [-6.27, 53.346],
          [-6.265, 53.347],
          [-6.26, 53.349],
        ],
        risk_areas: [{ risk_type: "High traffic", severity: "Medium" }],
      },
    ],
    []
  );

  const selectedRoute = routes[0];

  const handleLocationSelect = (value /* "lat, lng" string */, type) => {
    setDestination(value);
    // later: update the "To" input in SearchBar
    console.log("Selected on map:", { value, type });
  };

  return (
    <main>
      <div className="mx-auto max-w-7xl px-5 md:px-8 pt-6 pb-32">
        <Header />
        <p className="mt-4 text-lg text-sp-inkMuted">
          Hi, <span className="font-medium">Sarah</span> 👋 Ready for a safer ride today?
        </p>

        <div className="mt-5 grid gap-6 md:gap-8 md:grid-cols-2 items-start">
          <section className="order-2 md:order-1">
            <SearchBar />
            <div className="mt-6">
              <RouteButtons />
            </div>
            <div className="mt-6">
              <AdCard />
            </div>
          </section>

          <aside className="order-1 md:order-2">
            <MapViewCard
              center={center}
              routes={routes}
              selectedRoute={selectedRoute}
              onLocationSelect={handleLocationSelect}
            />
          </aside>
        </div>

        {destination && (
          <p className="mt-4 text-sm text-slate-600">
            Destination set from map: <span className="font-medium">{destination}</span>
          </p>
        )}
      </div>
      {/* desktop rail */}
      <SidebarRail />

      {/* mobile bottom nav */}
      <div className="block md:hidden">
      <BottomNav />
      </div>
    </main>
  );
}
