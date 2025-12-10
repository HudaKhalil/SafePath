"use client";
import dynamic from "next/dynamic";

const InteractiveMap = dynamic(() => import("./InteractiveMap"), { ssr: false });

export default function MapViewCard({ center, routes, selectedRoute, onLocationSelect }) {
  return (
    <div className="rounded-3xl overflow-hidden shadow-soft h-60 md:h-[480px]">
      <InteractiveMap
        center={center}
        routes={routes}
        selectedRoute={selectedRoute}
        onLocationSelect={onLocationSelect}
      />
    </div>
  );
}
