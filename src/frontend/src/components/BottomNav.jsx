
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation"; 
import { Home, Map, Bike, Users } from "lucide-react";

function NavItem({ href, icon: Icon, label, isActive }) { 
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center transition-colors ${
        isActive 
          ? "text-emerald-600" 
          : "text-slate-500 hover:text-green-700" 
      }`}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span className="text-xs">{label}</span>
    </Link>
  );
}

// src/components/BottomNav.jsx
"use client";
import { Home, Map, AlertTriangle, ParkingCircle, Users2 } from "lucide-react";

const Item = ({ icon: Icon, label, active }) => (
  <button
    className={[
      "flex flex-col items-center justify-center gap-1 px-2 py-1",
      "text-[11px] md:text-sm leading-none",
      active ? "text-sp-title" : "text-slate-500 hover:text-sp-title/80",
      "transition-colors"
    ].join(" ")}
    aria-current={active ? "page" : undefined}
  >
    <Icon className="h-5 w-5 md:h-6 md:w-6" />
    <span className="mt-0.5">{label}</span>
  </button>
);


export default function BottomNav() {
  const pathname = usePathname(); 

  return (

    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-sm">
      <div className="flex justify-around py-3">
        <NavItem href="/" icon={Home} label="Home" isActive={pathname === "/"} />
        <NavItem href="/routes" icon={Map} label="Routes" isActive={pathname === "/routes"} />
        <NavItem href="/bike" icon={Bike} label="Bike" isActive={pathname === "/bike"} />
        <NavItem href="/buddies" icon={Users} label="Buddies" isActive={pathname === "/buddies"} />

    <nav
      className={[
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white/95 backdrop-blur border-t border-slate-200"
      ].join(" ")}
      role="navigation"
      aria-label="Primary"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="px-5 md:px-8 py-2.5 md:py-3 grid grid-cols-5 place-items-center">
          <Item icon={Home} label="Home" active />
          <Item icon={Map} label="Routes" />
          <Item icon={AlertTriangle} label="Report" />
          <Item icon={ParkingCircle} label="Bike Park" />
          <Item icon={Users2} label="Find Buddy" />
        </div>

      </div>
    </nav>
  );
}