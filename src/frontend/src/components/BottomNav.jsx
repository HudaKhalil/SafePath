
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, AlertTriangle, ParkingCircle, Users2 } from "lucide-react";

function Item({ icon: Icon, label, href, active }) {
  return (
    <Link
      href={href}
      className={[
        "flex flex-col items-center justify-center gap-1 px-2 py-1",
        "text-[11px] md:text-sm leading-none",
        active ? "text-sp-title" : "text-slate-500 hover:text-sp-title/80",
        "transition-colors"
      ].join(" ")}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <Icon className="h-5 w-5 md:h-6 md:w-6" />
      <span className="mt-0.5">{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    // treat "/routes" active also on nested paths like "/routes/123"
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className={[
        "fixed bottom-0 left-0 right-0 z-[1001]",
        "bg-white/95 backdrop-blur border-t border-slate-200"
      ].join(" ")}
      role="navigation"
      aria-label="Primary"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="px-5 md:px-8 py-2.5 md:py-3 grid grid-cols-5 place-items-center">
          <Item icon={Home} label="Home" href="/" active={isActive("/")} />
          <Item icon={Map} label="Routes" href="/suggested-routes" active={isActive("/suggested-routes")} />
          <Item icon={AlertTriangle} label="Report" href="/report-hazards" active={isActive("/report-hazards")} />
        
          <Item icon={Users2} label="Find Buddy" href="/findBuddy" active={isActive("/findbuddy")} />
        </div>
      </div>
    </nav>
  );
}
