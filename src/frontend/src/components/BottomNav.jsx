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

export default function BottomNav() {
  const pathname = usePathname(); 

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-sm">
      <div className="flex justify-around py-3">
        <NavItem href="/" icon={Home} label="Home" isActive={pathname === "/"} />
        <NavItem href="/routes" icon={Map} label="Routes" isActive={pathname === "/routes"} />
        <NavItem href="/bike" icon={Bike} label="Bike" isActive={pathname === "/bike"} />
        <NavItem href="/buddies" icon={Users} label="Buddies" isActive={pathname === "/buddies"} />
      </div>
    </nav>
  );
}