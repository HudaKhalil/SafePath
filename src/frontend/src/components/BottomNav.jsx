
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
        active ? "text-[#06d6a0]" : "text-slate-500 hover:text-[#06d6a0]",
        "transition-colors"
      ].join(" ")}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      style={{ textAlign: 'center' }}
    >
      <Icon className="h-6 w-6 mb-1" style={{ display: 'block', margin: '0 auto' }} />
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-1001 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur border-t border-slate-200 dark:border-white/20"
      role="navigation"
      aria-label="Primary"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex px-5 md:px-8 py-2.5 md:py-3">
          <div className="flex-1 flex flex-col items-center">
            <Item icon={Home} label="Home" href="/" active={isActive("/")} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <Item icon={Map} label="Routes" href="/suggested-routes" active={isActive("/suggested-routes")} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <Item icon={AlertTriangle} label="Report" href="/report-hazards" active={isActive("/report-hazards")} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <Item icon={Users2} label="Find Buddy" href="/findBuddy" active={isActive("/findBuddy")} />
          </div>
        </div>
      </div>
    </nav>
  );
}
