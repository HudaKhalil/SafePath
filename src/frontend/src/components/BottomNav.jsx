
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, AlertTriangle, ParkingCircle, Users2 } from "lucide-react";
import { useState, useEffect } from "react";

function Item({ icon: Icon, label, href, active, isDark }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-1 px-2 py-1 text-[11px] md:text-sm leading-none transition-colors"
      aria-current={active ? "page" : undefined}
      aria-label={label}
      style={{ 
        textAlign: 'center',
        color: active ? '#06d6a0' : (isDark ? '#94a3b8' : '#64748b')
      }}
      onMouseEnter={(e) => e.currentTarget.style.color = '#06d6a0'}
      onMouseLeave={(e) => e.currentTarget.style.color = active ? '#06d6a0' : (isDark ? '#94a3b8' : '#64748b')}
    >
      <Icon className="h-6 w-6 mb-1" style={{ display: 'block', margin: '0 auto' }} />
      <span className="mt-0.5">{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  // Track dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    // treat "/routes" active also on nested paths like "/routes/123"
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-1001 backdrop-blur border-t"
      role="navigation"
      aria-label="Primary"
      style={{
        background: isDark 
          ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)' 
          : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? '#334155' : '#e2e8f0'
      }}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex px-5 md:px-8 py-2.5 md:py-3">
          <div className="flex-1 flex flex-col items-center">
            <Item icon={Home} label="Home" href="/" active={isActive("/")} isDark={isDark} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <Item icon={Map} label="Routes" href="/suggested-routes" active={isActive("/suggested-routes")} isDark={isDark} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <Item icon={AlertTriangle} label="Report" href="/report-hazards" active={isActive("/report-hazards")} isDark={isDark} />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <Item icon={Users2} label="Find Buddy" href="/findBuddy" active={isActive("/findBuddy")} isDark={isDark} />
          </div>
        </div>
      </div>
    </nav>
  );
}
